'use strict';

const { app } = require('@azure/functions');
const { reservations } = require('../shared/storage');
const { json, erreur } = require('../shared/http');
const S = require('../shared/service');

app.http('availability', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'availability',
  handler: async (request, contexte) => {
    const date = request.query.get('date') || '';

    if (!S.dateValide(date)) {
      return erreur(400, 'date_invalide', 'Date attendue au format AAAA-MM-JJ.');
    }
    if (!S.dansHorizon(date)) {
      return erreur(400, 'hors_horizon', `Les réservations s'ouvrent jusqu'à ${S.HORIZON_JOURS} jours à l'avance.`);
    }

    const tables = S.TABLES.map((t) => ({ id: t.id, nom: t.nom, cap: t.cap, x: t.x, y: t.y, w: t.w, h: t.h }));

    if (S.estFerme(date)) {
      return json(200, {
        date, ferme: true, tables,
        creneaux: [],
        acompteParPersonne: S.ACOMPTE_CENTS,
        convivesMax: S.CONVIVES_MAX
      });
    }

    /* Toutes les réservations d'un jour tiennent dans une seule partition :
       la lecture ne balaie jamais la table entière. */
    const prises = [];
    try {
      const entites = reservations().listEntities({
        queryOptions: {
          filter: `PartitionKey eq '${date}' and statut eq 'confirmee'`,
          select: ['creneau', 'tableId']
        }
      });
      for await (const e of entites) prises.push({ creneau: e.creneau, tableId: e.tableId });
    } catch (e) {
      contexte.error(`Lecture des disponibilités impossible : ${e.message}`);
      return erreur(503, 'indisponible', 'Les disponibilités sont momentanément inaccessibles.');
    }

    const occupees = new Map();
    for (const r of prises) {
      if (!occupees.has(r.creneau)) occupees.set(r.creneau, []);
      occupees.get(r.creneau).push(r.tableId);
    }

    const creneaux = S.CRENEAUX.map((h) => {
      const prisesIci = occupees.get(h) || [];
      return {
        heure: h,
        service: S.CRENEAUX_MIDI.includes(h) ? 'midi' : 'soir',
        passe: S.creneauPasse(date, h),
        tablesPrises: prisesIci,
        complet: prisesIci.length >= S.TABLES.length
      };
    });

    return json(200, {
      date, ferme: false, tables, creneaux,
      acompteParPersonne: S.ACOMPTE_CENTS,
      convivesMax: S.CONVIVES_MAX
    });
  }
});
