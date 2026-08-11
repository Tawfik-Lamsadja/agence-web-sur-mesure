'use strict';

const { app } = require('@azure/functions');
const { commandes, depaquette, estAbsent } = require('../shared/storage');
const { json, erreur } = require('../shared/http');
const { texte } = require('../shared/valide');
const qr = require('../shared/qr');

/* Le suivi d'une commande à table, lu par le client assis.

   Pas de compte, pas de session : le jeton signé qu'il porte dans son adresse
   tient lieu de droit d'accès, et ne donne accès qu'à cette commande-là.

   La réponse ne dit que ce que le client a lui-même commandé. Elle ne porte
   aucune coordonnée, une commande à table n'en ayant pas. */
app.http('suivi', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'suivi',
  handler: async (request, contexte) => {
    if (!qr.configure()) {
      return erreur(503, 'qr_non_configure',
        "Le suivi de commande n'est pas configuré sur ce serveur.");
    }

    const lu = qr.litJetonSuivi(texte(request.query.get('s'), 80));
    if (!lu) {
      return erreur(403, 'suivi_invalide', 'Ce lien de suivi n’est pas valable.');
    }

    try {
      const e = await commandes().getEntity(`salle-${lu.jour}`, lu.reference);
      return json(200, {
        reference: e.rowKey,
        tableNom: e.tableNom,
        statut: e.statut || 'enregistree',
        articles: depaquette(e.articles),
        pieces: e.pieces,
        totalCents: e.totalCents,
        note: e.note || '',
        creeLe: e.creeLe,
        prepareeLe: e.prepareeLe || null,
        servieLe: e.servieLe || null
      });
    } catch (err) {
      if (estAbsent(err)) {
        return erreur(404, 'commande_inconnue', 'Cette commande n’existe plus.');
      }
      contexte.error(`Lecture du suivi impossible : ${err.message}`);
      return erreur(503, 'indisponible', 'Le suivi est momentanément inaccessible.');
    }
  }
});
