'use strict';

const { app } = require('@azure/functions');
const { reservations, cleReservation, estConflit } = require('../shared/storage');
const { json, erreur, corpsJson, ipClient } = require('../shared/http');
const { coordonnees, entier } = require('../shared/valide');
const { envoie, gabarit } = require('../shared/email');
const quota = require('../shared/quota');
const S = require('../shared/service');

const PLAFOND_HORAIRE = 8;

function jourLong(iso) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('fr-BE', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC'
  });
}

function euros(cents) {
  return new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

app.http('reservations', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'reservations',
  handler: async (request, contexte) => {
    const corps = await corpsJson(request);
    if (!corps) return erreur(400, 'corps_invalide', 'Corps de requête JSON attendu.');

    const { date, creneau, tableId } = corps;
    const convives = entier(corps.convives);

    if (!S.dateValide(date)) return erreur(400, 'date_invalide', 'Date attendue au format AAAA-MM-JJ.');
    if (!S.dansHorizon(date)) return erreur(400, 'hors_horizon', 'Cette date n’est pas ouverte à la réservation.');
    if (S.estFerme(date)) return erreur(409, 'jour_ferme', 'La salle est fermée le dimanche et le lundi.');
    if (!S.CRENEAUX.includes(creneau)) return erreur(400, 'creneau_invalide', 'Ce créneau n’existe pas.');
    if (S.creneauPasse(date, creneau)) return erreur(409, 'creneau_passe', 'Ce créneau est déjà passé.');
    if (convives === null || convives < 1 || convives > S.CONVIVES_MAX) {
      return erreur(400, 'convives_invalide', `Entre 1 et ${S.CONVIVES_MAX} convives.`);
    }

    const table = S.tableParId(tableId);
    if (!table) return erreur(400, 'table_invalide', 'Cette place n’existe pas.');
    if (table.cap < convives) {
      return erreur(409, 'table_trop_petite', `${table.nom} n’accueille que ${table.cap} couverts.`);
    }

    const champs = coordonnees(corps);
    if (champs.erreurs) return json(400, { erreur: 'champs_invalides', champs: champs.erreurs });
    const { nom, tel, mail, note } = champs.valeurs;

    if (!(await quota.verifie(ipClient(request), 'reservation', PLAFOND_HORAIRE, contexte))) {
      return erreur(429, 'trop_de_demandes', 'Trop de réservations depuis cette connexion. Réessayez plus tard.');
    }

    const acompte = S.ACOMPTE_CENTS * convives;
    const reference = S.reference('OR');

    /* La date fait la clé de partition, le couple créneau/table la clé de ligne :
       l'insertion est rejetée d'office si le triplet existe déjà. Deux clics
       simultanés ne peuvent donc pas vendre la même place deux fois. */
    const entite = {
      partitionKey: date,
      rowKey: cleReservation(creneau, tableId),
      date, creneau, tableId, convives,
      nom, tel, mail, note,
      reference,
      acompteCents: acompte,
      statut: 'confirmee',
      creeLe: new Date().toISOString()
    };

    try {
      await reservations().createEntity(entite);
    } catch (e) {
      if (estConflit(e)) {
        return erreur(409, 'place_prise', 'Cette place vient d’être réservée. Choisissez-en une autre.');
      }
      contexte.error(`Écriture de la réservation impossible : ${e.message}`);
      return erreur(503, 'indisponible', 'La réservation n’a pas pu être enregistrée. Réessayez.');
    }

    const quand = `${jourLong(date)} à ${creneau.replace(':', 'h')}`;
    const intro = `Votre table est retenue, ${nom}.`;
    const pied = `Un acompte de ${euros(acompte)} serait normalement demandé, puis déduit de l’addition. Pour annuler, appelez le +32 2 512 04 77 au plus tard vingt-quatre heures avant.`;
    const lignes = [
      ['Date', quand],
      ['Convives', `${convives} ${convives > 1 ? 'personnes' : 'personne'}`],
      ['Place', table.nom],
      ['Au nom de', nom],
      ['Note', note]
    ];

    const envoye = await envoie({
      destinataire: mail,
      nom,
      sujet: `Réservation confirmée · ${reference}`,
      html: gabarit('Réservation confirmée', intro, lignes, reference, pied),
      texte: `${intro}\n\n${quand}\n${convives} couverts · ${table.nom}\nRéférence : ${reference}\n\n${pied}\n\nSite de démonstration : Ô'resto n'existe pas, aucun repas ne vous attend.`
    }, contexte);

    return json(201, {
      reference,
      date, creneau, tableId,
      tableNom: table.nom,
      convives,
      acompteCents: acompte,
      emailEnvoye: envoye
    });
  }
});
