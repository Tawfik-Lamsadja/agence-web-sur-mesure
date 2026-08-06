'use strict';

const { randomUUID } = require('node:crypto');
const { quotas } = require('./cosmos');

const FENETRE_S = 3600;

/* Les points d'entrée publics déclenchent un envoi d'e-mail vers une adresse
   fournie par l'appelant : sans plafond, ils serviraient à spammer des tiers.
   Les documents portent un TTL, la fenêtre se vide donc d'elle-même. */
async function verifie(ip, action, plafond, contexte) {
  const cle = `${action}|${ip}`;
  try {
    const c = quotas();
    const { resources } = await c.items
      .query({
        query: 'SELECT VALUE COUNT(1) FROM q WHERE q.cle = @cle',
        parameters: [{ name: '@cle', value: cle }]
      }, { partitionKey: cle })
      .fetchAll();

    const utilises = resources[0] || 0;
    if (utilises >= plafond) return false;

    await c.items.create({ id: randomUUID(), cle, ttl: FENETRE_S, creeLe: new Date().toISOString() });
    return true;
  } catch (e) {
    /* Un quota indisponible ne doit pas rendre la réservation impossible. */
    contexte.warn(`Quota indisponible pour ${action} : ${e.message}`);
    return true;
  }
}

module.exports = { verifie, FENETRE_S };
