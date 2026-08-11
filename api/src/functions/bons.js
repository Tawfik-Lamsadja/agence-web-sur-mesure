'use strict';

const { randomInt } = require('node:crypto');
const { app } = require('@azure/functions');
const { bons, estConflit } = require('../shared/storage');
const { json, erreur, corpsJson, ipClient } = require('../shared/http');
const { coordonnees, entier } = require('../shared/valide');
const { envoie, noteEnvoi, gabarit } = require('../shared/email');
const quota = require('../shared/quota');

const PLAFOND_HORAIRE = 5;
const PARTITION = 'bon';

/* Montants proposés en un clic, et bornes du montant libre. */
const MONTANTS = [2500, 5000, 10000];
const MONTANT_MIN = 1000;
const MONTANT_MAX = 50000;

/* Le bon reste utilisable un an : la date part dans l'e-mail, c'est la seule
   information qui empêche le porteur de se présenter cinq ans plus tard. */
const VALIDITE_MOIS = 12;

/* Alphabet sans O/0 ni I/1/L : le code est lu à voix haute au comptoir. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const TENTATIVES = 5;

function euros(cents) {
  return new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

function bloc(n) {
  let s = '';
  for (let i = 0; i < n; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

function codeCadeau() {
  return `BC-${bloc(4)}-${bloc(4)}`;
}

/* Le montant vient soit des trois boutons, soit du champ libre : les deux
   passent par la même validation, celle du navigateur ne compte pas. */
function montantValide(brut) {
  const cents = entier(brut);
  if (cents === null) return null;
  if (MONTANTS.includes(cents)) return cents;
  if (cents < MONTANT_MIN || cents > MONTANT_MAX) return null;
  /* Un bon se libelle à l'euro rond. */
  if (cents % 100 !== 0) return null;
  return cents;
}

app.http('bons', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'bons',
  handler: async (request, contexte) => {
    const corps = await corpsJson(request);
    if (!corps) return erreur(400, 'corps_invalide', 'Corps de requête JSON attendu.');

    const montantCents = montantValide(corps.montantCents);
    if (montantCents === null) {
      return erreur(400, 'montant_invalide',
        `Montant libre entre ${euros(MONTANT_MIN)} et ${euros(MONTANT_MAX)}, par euro entier.`);
    }

    const champs = coordonnees(corps);
    if (champs.erreurs) return json(400, { erreur: 'champs_invalides', champs: champs.erreurs });
    const { nom, tel, mail, note } = champs.valeurs;

    if (!(await quota.verifie(ipClient(request), 'bon', PLAFOND_HORAIRE, contexte))) {
      return erreur(429, 'trop_de_demandes', 'Trop de bons demandés depuis cette connexion. Réessayez plus tard.');
    }

    const expire = new Date();
    expire.setMonth(expire.getMonth() + VALIDITE_MOIS);

    /* Le code est la clé de ligne : une collision fait échouer l'insertion au
       lieu d'écraser un bon déjà vendu. On retire alors un autre code. */
    let code = null;
    for (let essai = 0; essai < TENTATIVES && code === null; essai++) {
      const candidat = codeCadeau();
      try {
        await bons().createEntity({
          partitionKey: PARTITION,
          rowKey: candidat,
          code: candidat,
          montantCents,
          nom, tel, mail, note,
          statut: 'valide',
          /* Usage unique : le jour où il est honoré, ce champ se remplit et le
             statut passe à « utilise ». Aucun parcours public ne le fait. */
          utiliseLe: '',
          valableJusquau: expire.toISOString(),
          creeLe: new Date().toISOString()
        });
        code = candidat;
      } catch (e) {
        if (estConflit(e)) continue;
        contexte.error(`Écriture du bon impossible : ${e.message}`);
        return erreur(503, 'indisponible', 'Le bon n’a pas pu être enregistré. Réessayez.');
      }
    }

    if (code === null) {
      contexte.error('Génération du code cadeau impossible : trop de collisions.');
      return erreur(503, 'indisponible', 'Le bon n’a pas pu être enregistré. Réessayez.');
    }

    const jusquau = expire.toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' });
    const intro = `Votre bon cadeau est prêt, ${nom}.`;
    const pied = `Ce bon est valable une fois, jusqu’au ${jusquau}, sur place comme à emporter. Il suffit d’annoncer le code au comptoir.`;
    const lignes = [
      ['Montant', euros(montantCents)],
      ['Valable jusqu’au', jusquau],
      ['Au nom de', nom],
      ['Message', note]
    ];

    const envoi = await envoie({
      destinataire: mail,
      nom,
      sujet: `Bon cadeau · ${code}`,
      html: gabarit('Bon cadeau', intro, lignes, code, pied),
      texte: `${intro}\n\nMontant : ${euros(montantCents)}\nValable jusqu’au ${jusquau}\nCode : ${code}\n\n${pied}\n\nSite de démonstration : Ô'resto n'existe pas, ce bon n'a aucune valeur et aucun paiement n'a été prélevé.`
    }, contexte);
    await noteEnvoi(bons(), PARTITION, code, envoi, contexte);

    return json(201, {
      code,
      montantCents,
      valableJusquau: expire.toISOString(),
      emailEnvoye: envoi.envoye
    });
  }
});

module.exports = { MONTANTS, MONTANT_MIN, MONTANT_MAX, montantValide, codeCadeau };
