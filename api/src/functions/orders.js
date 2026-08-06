'use strict';

const { app } = require('@azure/functions');
const { commandes } = require('../shared/cosmos');
const { json, erreur, corpsJson, ipClient } = require('../shared/http');
const { coordonnees, entier } = require('../shared/valide');
const { envoie, gabarit } = require('../shared/email');
const menu = require('../shared/menu');
const quota = require('../shared/quota');
const S = require('../shared/service');

const PLAFOND_HORAIRE = 8;
const ARTICLES_MAX = 40;
const DELAI_MIN_MS = 25 * 60000;

function euros(cents) {
  return new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

app.http('orders', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'orders',
  handler: async (request, contexte) => {
    const corps = await corpsJson(request);
    if (!corps) return erreur(400, 'corps_invalide', 'Corps de requête JSON attendu.');

    if (!Array.isArray(corps.articles) || corps.articles.length === 0) {
      return erreur(400, 'panier_vide', 'Le panier est vide.');
    }

    const retrait = new Date(corps.retrait);
    if (Number.isNaN(retrait.getTime())) {
      return erreur(400, 'retrait_invalide', 'Heure de retrait illisible.');
    }
    if (retrait.getTime() < Date.now() + DELAI_MIN_MS) {
      return erreur(409, 'retrait_trop_tot', 'Comptez au moins trente minutes de préparation.');
    }
    if (!S.retraitOuvert(retrait)) {
      return erreur(409, 'retrait_ferme', 'Le comptoir est fermé à cette heure-là.');
    }

    const champs = coordonnees(corps);
    if (champs.erreurs) return json(400, { erreur: 'champs_invalides', champs: champs.erreurs });
    const { nom, tel, mail, note } = champs.valeurs;

    /* Les prix sont relus depuis la carte : ceux envoyés par le navigateur
       ne sont jamais pris en compte. */
    let index;
    try {
      index = await menu.parId();
    } catch (e) {
      contexte.error(`Lecture de la carte impossible : ${e.message}`);
      return erreur(503, 'indisponible', 'La carte est momentanément inaccessible.');
    }

    const lignes = [];
    let total = 0;
    let pieces = 0;

    for (const brut of corps.articles) {
      const plat = index.get(brut && brut.id);
      if (!plat) return erreur(400, 'plat_inconnu', 'Un article du panier n’existe plus à la carte.');
      if (!plat.emporter) return erreur(409, 'plat_sur_place', `${plat.nom} est servi en salle uniquement.`);

      const qte = entier(brut.qte);
      if (qte === null || qte < 1 || qte > ARTICLES_MAX) {
        return erreur(400, 'quantite_invalide', 'Quantité invalide.');
      }

      pieces += qte;
      total += plat.prix * qte;
      lignes.push({ id: plat.id, nom: plat.nom, prixUnitaire: plat.prix, qte, sousTotal: plat.prix * qte });
    }

    if (pieces > ARTICLES_MAX) {
      return erreur(400, 'panier_trop_grand', `Pas plus de ${ARTICLES_MAX} articles par commande.`);
    }

    if (!(await quota.verifie(ipClient(request), 'commande', PLAFOND_HORAIRE, contexte))) {
      return erreur(429, 'trop_de_demandes', 'Trop de commandes depuis cette connexion. Réessayez plus tard.');
    }

    const reference = S.reference('EM');
    const jourRetrait = S.jourISO(retrait);

    try {
      await commandes().items.create({
        id: reference,
        jourRetrait,
        retrait: retrait.toISOString(),
        articles: lignes,
        totalCents: total,
        pieces,
        nom, tel, mail, note,
        reference,
        statut: 'enregistree',
        creeLe: new Date().toISOString()
      });
    } catch (e) {
      contexte.error(`Écriture de la commande impossible : ${e.message}`);
      return erreur(503, 'indisponible', 'La commande n’a pas pu être enregistrée. Réessayez.');
    }

    const quand = retrait.toLocaleString('fr-BE', {
      weekday: 'long', day: 'numeric', month: 'long',
      hour: '2-digit', minute: '2-digit', timeZone: S.FUSEAU
    });
    const intro = `Votre commande est enregistrée, ${nom}.`;
    const pied = 'Présentez ce numéro au comptoir, rue de Flandre 68. Le paiement se fait sur place.';
    const detail = lignes.map((l) => [`${l.qte} × ${l.nom}`, euros(l.sousTotal)]);

    const envoye = await envoie({
      destinataire: mail,
      nom,
      sujet: `Commande à emporter · ${reference}`,
      html: gabarit('Commande enregistrée', intro, detail.concat([['Total', euros(total)], ['Retrait', quand]]), reference, pied),
      texte: `${intro}\n\n${lignes.map((l) => `${l.qte} × ${l.nom} — ${euros(l.sousTotal)}`).join('\n')}\n\nTotal : ${euros(total)}\nRetrait : ${quand}\nRéférence : ${reference}\n\n${pied}\n\nSite de démonstration : Ô'resto n'existe pas, aucune commande ne sera préparée.`
    }, contexte);

    return json(201, {
      reference,
      articles: lignes,
      totalCents: total,
      pieces,
      retrait: retrait.toISOString(),
      emailEnvoye: envoye
    });
  }
});
