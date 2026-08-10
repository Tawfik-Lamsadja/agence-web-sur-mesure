'use strict';

const crypto = require('node:crypto');
const { erreur } = require('./http');

/* Le back-office tient sur un seul secret, ADMIN_PASSWORD, qui sert à deux
   choses : vérifier le mot de passe saisi, et signer le jeton de session. Le
   faire changer révoque donc toutes les sessions ouvertes, sans registre à
   tenir ni table à purger.

   Le jeton ne contient rien d'autre que sa date de péremption, en clair, plus
   la signature qui interdit de la déplacer. Il n'y a rien à voler dedans : il
   n'ouvre que ce que le mot de passe ouvrait déjà. */

const DUREE_JETON_MS = 8 * 3600 * 1000;

function configure() {
  return typeof process.env.ADMIN_PASSWORD === 'string' && process.env.ADMIN_PASSWORD.length > 0;
}

function secret() {
  if (!configure()) throw new Error('ADMIN_PASSWORD absent');
  return process.env.ADMIN_PASSWORD;
}

/* Comparaison à temps constant. Une comparaison ordinaire s'arrête au premier
   caractère qui diffère : le temps de réponse laisse alors deviner le mot de
   passe caractère par caractère. */
function memeChaine(a, b) {
  const ba = Buffer.from(String(a), 'utf8');
  const bb = Buffer.from(String(b), 'utf8');
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function motDePasseValide(fourni) {
  if (typeof fourni !== 'string' || fourni.length === 0) return false;
  return memeChaine(fourni, secret());
}

function signe(charge) {
  return crypto.createHmac('sha256', secret()).update(charge).digest('base64url');
}

function emetJeton() {
  const charge = String(Date.now() + DUREE_JETON_MS);
  return `${charge}.${signe(charge)}`;
}

function jetonValide(jeton) {
  if (typeof jeton !== 'string') return false;
  const sep = jeton.indexOf('.');
  if (sep < 1) return false;

  const charge = jeton.slice(0, sep);
  const signature = jeton.slice(sep + 1);
  if (!/^\d{1,15}$/.test(charge)) return false;
  if (!memeChaine(signature, signe(charge))) return false;

  return Number(charge) > Date.now();
}

/* Renvoie null quand l'appel est autorisé, sinon la réponse à retourner tel
   quel. Chaque point d'entrée du back-office commence par cette ligne. */
function refus(request) {
  if (!configure()) {
    return erreur(503, 'admin_non_configure',
      "Le back-office n'est pas configuré sur ce serveur : il manque ADMIN_PASSWORD.");
  }
  if (!jetonValide(request.headers.get('x-admin-jeton'))) {
    return erreur(401, 'non_autorise', 'Session expirée ou absente. Reconnectez-vous.');
  }
  return null;
}

module.exports = {
  configure, motDePasseValide, emetJeton, jetonValide, refus, signe, memeChaine,
  DUREE_JETON_MS
};
