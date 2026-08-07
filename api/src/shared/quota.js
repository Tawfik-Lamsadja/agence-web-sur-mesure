'use strict';

const { randomUUID } = require('node:crypto');
const { quotas, assainit } = require('./storage');

const FENETRE_S = 3600;

/* Les points d'entrée publics déclenchent un envoi d'e-mail vers une adresse
   fournie par l'appelant : sans plafond, ils serviraient à spammer des tiers.

   Table Storage n'expire rien tout seul : chaque entrée porte donc sa date de
   péremption, les périmées ne sont pas comptées et sont effacées au passage. */
async function verifie(ip, action, plafond, contexte) {
  const cle = assainit(`${action}|${ip}`);
  const maintenant = Date.now();

  try {
    const t = quotas();
    let vivantes = 0;
    const perimees = [];

    const entites = t.listEntities({
      queryOptions: {
        filter: `PartitionKey eq '${cle.replace(/'/g, "''")}'`,
        select: ['RowKey', 'expireLe']
      }
    });

    for await (const e of entites) {
      if (Number(e.expireLe) > maintenant) vivantes++;
      else perimees.push(e.rowKey);
    }

    /* Le ménage ne doit jamais faire échouer la demande en cours. */
    for (const rowKey of perimees.slice(0, 20)) {
      try { await t.deleteEntity(cle, rowKey); } catch { /* déjà partie */ }
    }

    if (vivantes >= plafond) return false;

    await t.createEntity({
      partitionKey: cle,
      rowKey: randomUUID(),
      expireLe: maintenant + FENETRE_S * 1000,
      creeLe: new Date(maintenant).toISOString()
    });
    return true;
  } catch (e) {
    /* Un quota indisponible ne doit pas rendre la réservation impossible. */
    contexte.warn(`Quota indisponible pour ${action} : ${e.message}`);
    return true;
  }
}

module.exports = { verifie, FENETRE_S };
