'use strict';

const crypto = require('node:crypto');
const { memeChaine } = require('./admin');

/* Un code QR posé sur une table n'est pas un secret : il est photographiable
   par n'importe qui, et son URL se devine de toute façon. Ce qui doit être
   difficile, c'est de fabriquer une URL valable sans avoir vu de code.

   Chaque table porte donc une signature courte, calculée à partir de son
   identifiant et de QR_SECRET. Le serveur la recalcule et refuse ce qui ne
   correspond pas. Les codes imprimés restent valables tant que le secret ne
   change pas ; le changer les périme tous d'un coup, ce qui est exactement le
   geste utile si une planche de codes fuite. */

const LONGUEUR_CLE = 12; /* 12 caractères base64url, soit 72 bits */

function configure() {
  return typeof process.env.QR_SECRET === 'string' && process.env.QR_SECRET.length > 0;
}

function secret() {
  if (!configure()) throw new Error('QR_SECRET absent');
  return process.env.QR_SECRET;
}

function cleTable(tableId) {
  return crypto.createHmac('sha256', secret())
    .update(`table:${tableId}`)
    .digest('base64url')
    .slice(0, LONGUEUR_CLE);
}

function cleValide(tableId, fournie) {
  if (typeof fournie !== 'string' || fournie.length !== LONGUEUR_CLE) return false;
  return memeChaine(fournie, cleTable(tableId));
}

/* ===================================================================
   Le jeton de suivi

   Même raisonnement que pour les tables : la référence d'une commande est
   courte, donc devinable, et sans signature n'importe qui pourrait suivre —
   voire simplement énumérer — les commandes des autres tables.

   Le jeton porte le jour, la référence et la signature qui les lie. Le jour
   en fait partie parce qu'il est la clé de partition : sans lui, il faudrait
   chercher la commande, avec lui on va la lire directement.
   =================================================================== */

const RE_JOUR = /^\d{4}-\d{2}-\d{2}$/;
const RE_REFERENCE = /^[A-Z]{2}-[A-Z0-9]{1,10}$/;

function cleSuivi(jour, reference) {
  return crypto.createHmac('sha256', secret())
    .update(`suivi:${jour}:${reference}`)
    .digest('base64url')
    .slice(0, LONGUEUR_CLE);
}

function jetonSuivi(jour, reference) {
  return `${jour}.${reference}.${cleSuivi(jour, reference)}`;
}

/* Renvoie { jour, reference } si le jeton tient debout, null sinon. */
function litJetonSuivi(jeton) {
  if (typeof jeton !== 'string') return null;

  const parts = jeton.split('.');
  if (parts.length !== 3) return null;

  const [jour, reference, cle] = parts;
  if (!RE_JOUR.test(jour)) return null;
  if (!RE_REFERENCE.test(reference)) return null;
  if (cle.length !== LONGUEUR_CLE) return null;
  if (!memeChaine(cle, cleSuivi(jour, reference))) return null;

  return { jour, reference };
}

module.exports = {
  configure, cleTable, cleValide, LONGUEUR_CLE,
  cleSuivi, jetonSuivi, litJetonSuivi
};
