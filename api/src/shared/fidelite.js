'use strict';

const { fidelite, cleMail, estAbsent, estConflit } = require('./storage');

/* Une visite honorée par réservation ou par commande. Le compteur est porté par
   l'adresse e-mail : c'est la seule donnée que le client fournit dans les deux
   parcours, et le site n'a pas de comptes. */
const PARTITION = 'client';

/* Dix visites donnent droit au dessert. */
const PALIER = 10;
const RECOMPENSE = 'Un dessert offert';

/* Table Storage n'a pas d'incrément atomique : la lecture-modification-écriture
   est protégée par l'etag, et rejouée si quelqu'un est passé entre-temps. */
const TENTATIVES = 4;

function etatDepuis(visites) {
  const v = Math.max(0, visites | 0);
  const gagnees = Math.floor(v / PALIER);
  const dansCycle = v % PALIER;
  return {
    visites: v,
    palier: PALIER,
    recompense: RECOMPENSE,
    /* Position dans le cycle en cours : c'est ce que dessine le compteur. */
    dansCycle,
    restantes: v === 0 ? PALIER : (dansCycle === 0 ? 0 : PALIER - dansCycle),
    recompensesGagnees: gagnees,
    /* Vraie au moment précis où la dixième visite vient d'être comptée. */
    recompenseAtteinte: v > 0 && dansCycle === 0
  };
}

async function lit(mail) {
  try {
    const e = await fidelite().getEntity(PARTITION, cleMail(mail));
    return e;
  } catch (e) {
    if (estAbsent(e)) return null;
    throw e;
  }
}

/* Renvoie l'état sans rien écrire. Une table absente vaut « aucune visite ». */
async function etat(mail) {
  const e = await lit(mail);
  return etatDepuis(e ? Number(e.visites) : 0);
}

/* Compte une visite. Ne lève jamais : un compteur de fidélité indisponible ne
   doit pas faire échouer la réservation ou la commande qui vient d'aboutir. */
async function enregistreVisite(mail, origine, contexte) {
  const cle = cleMail(mail);
  const t = fidelite();

  for (let essai = 0; essai < TENTATIVES; essai++) {
    try {
      const existante = await lit(mail);

      if (!existante) {
        try {
          await t.createEntity({
            partitionKey: PARTITION,
            rowKey: cle,
            mail: String(mail).trim().toLowerCase(),
            visites: 1,
            derniereOrigine: origine,
            derniereVisite: new Date().toISOString(),
            creeLe: new Date().toISOString()
          });
          return etatDepuis(1);
        } catch (e) {
          /* Créée en parallèle : on rejoue pour incrémenter celle qui a gagné. */
          if (estConflit(e)) continue;
          throw e;
        }
      }

      const visites = Number(existante.visites || 0) + 1;
      await t.updateEntity({
        partitionKey: PARTITION,
        rowKey: cle,
        visites,
        derniereOrigine: origine,
        derniereVisite: new Date().toISOString()
      }, 'Merge', { etag: existante.etag });

      return etatDepuis(visites);
    } catch (e) {
      /* 412 : l'entité a bougé entre la lecture et l'écriture, on rejoue. */
      if (e && e.statusCode === 412) continue;
      contexte.warn(`Fidélité non mise à jour (${origine}) : ${e.message}`);
      return null;
    }
  }

  contexte.warn(`Fidélité non mise à jour (${origine}) : trop de collisions.`);
  return null;
}

/* Ligne de compteur pour l'e-mail de confirmation. Renvoie null quand la
   fidélité n'a pas pu être mise à jour : mieux vaut ne rien afficher qu'un
   chiffre faux. */
function mention(compteur) {
  if (!compteur) return null;
  if (compteur.recompenseAtteinte) {
    return `${compteur.visites}ᵉ visite · ${RECOMPENSE.toLowerCase()} à votre prochaine venue`;
  }
  const reste = compteur.restantes;
  return `${compteur.visites} ${compteur.visites > 1 ? 'visites' : 'visite'} · encore ${reste} avant ${RECOMPENSE.toLowerCase()}`;
}

module.exports = { etat, enregistreVisite, etatDepuis, mention, PALIER, RECOMPENSE, PARTITION };
