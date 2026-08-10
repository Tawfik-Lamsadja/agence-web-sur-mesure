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

module.exports = { configure, cleTable, cleValide, LONGUEUR_CLE };
