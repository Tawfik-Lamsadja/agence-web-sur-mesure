'use strict';

const { app } = require('@azure/functions');
const { privatisations, estConflit } = require('../shared/storage');
const { json, erreur, corpsJson, ipClient } = require('../shared/http');
const { coordonnees, entier, texte } = require('../shared/valide');
const { envoie, noteEnvoi, gabarit } = require('../shared/email');
const quota = require('../shared/quota');
const S = require('../shared/service');

const PLAFOND_HORAIRE = 4;

/* En dessous de huit couverts, une réservation ordinaire suffit ; au-delà de
   vingt-deux, la salle ne suit plus : c'est sa capacité totale. */
const CONVIVES_MIN = 8;
const CONVIVES_MAX = 22;

/* Une privatisation se prépare de loin : l'horizon de soixante jours des
   réservations classiques serait trop court. */
const HORIZON_JOURS = 365;

const TYPES = new Map([
  ['anniversaire', 'Anniversaire'],
  ['affaires', 'Repas d’affaires'],
  ['mariage', 'Mariage'],
  ['seminaire', 'Séminaire'],
  ['autre', 'Autre']
]);

function jourLong(iso) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('fr-BE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
  });
}

function dansHorizon(iso, maintenant = new Date()) {
  if (iso < S.jourISO(maintenant)) return false;
  return iso <= S.jourISO(new Date(maintenant.getTime() + HORIZON_JOURS * 864e5));
}

app.http('privatisations', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'privatisations',
  handler: async (request, contexte) => {
    const corps = await corpsJson(request);
    if (!corps) return erreur(400, 'corps_invalide', 'Corps de requête JSON attendu.');

    const date = texte(corps.date, 10);
    if (!S.dateValide(date)) return erreur(400, 'date_invalide', 'Date attendue au format AAAA-MM-JJ.');
    if (!dansHorizon(date)) {
      return erreur(400, 'hors_horizon', 'Indiquez une date à venir, dans les douze prochains mois.');
    }
    /* Le dimanche et le lundi restent ouverts à la privatisation : la salle est
       justement libre ces jours-là. */

    const convives = entier(corps.convives);
    if (convives === null || convives < CONVIVES_MIN || convives > CONVIVES_MAX) {
      return erreur(400, 'convives_invalide',
        `Entre ${CONVIVES_MIN} et ${CONVIVES_MAX} convives. En dessous, une réservation ordinaire suffit.`);
    }

    const type = texte(corps.type, 20);
    if (!TYPES.has(type)) return erreur(400, 'type_invalide', 'Type d’événement inconnu.');

    const champs = coordonnees(corps);
    if (champs.erreurs) return json(400, { erreur: 'champs_invalides', champs: champs.erreurs });
    const { nom, tel, mail, note } = champs.valeurs;

    if (!(await quota.verifie(ipClient(request), 'privatisation', PLAFOND_HORAIRE, contexte))) {
      return erreur(429, 'trop_de_demandes', 'Trop de demandes depuis cette connexion. Réessayez plus tard.');
    }

    const reference = S.reference('PV');

    try {
      await privatisations().createEntity({
        partitionKey: date,
        rowKey: reference,
        date, convives, type,
        typeLibelle: TYPES.get(type),
        nom, tel, mail, note,
        reference,
        /* Une demande, pas une confirmation : la disponibilité se tranche à la
           main, il n'y a aucun calendrier de privatisation. */
        statut: 'a_traiter',
        creeLe: new Date().toISOString()
      });
    } catch (e) {
      if (estConflit(e)) {
        return erreur(409, 'doublon', 'Cette demande vient d’être enregistrée.');
      }
      contexte.error(`Écriture de la demande de privatisation impossible : ${e.message}`);
      return erreur(503, 'indisponible', 'La demande n’a pas pu être enregistrée. Réessayez.');
    }

    const quand = jourLong(date);
    const intro = `Nous avons bien reçu votre demande, ${nom}.`;
    const pied = 'Cette demande ne vaut pas confirmation : la salle n’est pas encore bloquée. Nous vous recontactons sous quarante-huit heures pour vous dire si la date est libre et vous proposer un menu.';
    const lignes = [
      ['Date souhaitée', quand],
      ['Convives', `${convives} personnes`],
      ['Événement', TYPES.get(type)],
      ['Au nom de', nom],
      ['Téléphone', tel],
      ['Message', note]
    ];

    const envoi = await envoie({
      destinataire: mail,
      nom,
      sujet: `Demande de privatisation · ${reference}`,
      html: gabarit('Demande reçue', intro, lignes, reference, pied),
      texte: `${intro}\n\n${quand}\n${convives} personnes · ${TYPES.get(type)}\nRéférence : ${reference}\n\n${pied}\n\nSite de démonstration : Ô'resto n'existe pas, personne ne vous recontactera.`
    }, contexte);
    await noteEnvoi(privatisations(), date, reference, envoi, contexte);

    return json(201, {
      reference,
      date, convives, type,
      typeLibelle: TYPES.get(type),
      emailEnvoye: envoi.envoye
    });
  }
});

module.exports = { TYPES, CONVIVES_MIN, CONVIVES_MAX, HORIZON_JOURS };
