'use strict';

const crypto = require('node:crypto');
const { erreur } = require('./http');

/* Deux accès, deux portées, une seule mécanique.

   Le back-office ouvre tout : la carte, les codes QR, la file des commandes.
   L'écran de cuisine n'ouvre que la file. Le jeton porte donc sa portée en
   clair, et chaque point d'entrée dit lesquelles il accepte.

   La clé de signature n'est pas le mot de passe saisi, mais une clé dérivée :

     admin    : ADMIN_PASSWORD
     cuisine  : KITCHEN_PASSWORD + « | » + ADMIN_PASSWORD

   Ce détail est ce qui permet au code de cuisine d'être court, un simple
   code à quatre chiffres si on veut, sans affaiblir les jetons. Signer un
   jeton avec un secret de dix mille valeurs possibles reviendrait à le
   donner : quiconque intercepterait un seul jeton retrouverait le code hors
   ligne en quelques secondes, puis en forgerait autant qu'il voudrait. En
   mêlant le secret long, la clé reste hors de portée, et changer l'un ou
   l'autre des deux mots de passe révoque les sessions.

   Le jeton ne contient rien d'autre que sa portée et sa date de péremption.
   Il n'ouvre que ce que le mot de passe ouvrait déjà. */

const PORTEES = ['admin', 'cuisine'];

const DUREES_MS = {
  /* Une journée de bureau. */
  admin: 8 * 3600 * 1000,
  /* Un service entier, coupures comprises : une tablette qui se met en veille
     ne doit pas obliger à ressaisir le code en plein coup de feu. */
  cuisine: 12 * 3600 * 1000
};

function configure(portee = 'admin') {
  /* ADMIN_PASSWORD entre dans les deux clés : sans lui, rien ne signe. */
  if (!process.env.ADMIN_PASSWORD) return false;
  if (portee === 'cuisine') {
    return typeof process.env.KITCHEN_PASSWORD === 'string' && process.env.KITCHEN_PASSWORD.length > 0;
  }
  return true;
}

function cleSignature(portee) {
  const admin = process.env.ADMIN_PASSWORD;
  if (!admin) throw new Error('ADMIN_PASSWORD absent');
  if (portee !== 'cuisine') return admin;

  const cuisine = process.env.KITCHEN_PASSWORD;
  if (!cuisine) throw new Error('KITCHEN_PASSWORD absent');
  return `${cuisine}|${admin}`;
}

/* Comparaison à temps constant. Une comparaison ordinaire s'arrête au premier
   caractère qui diffère : le temps de réponse laisse alors deviner le secret
   caractère par caractère. */
function memeChaine(a, b) {
  const ba = Buffer.from(String(a), 'utf8');
  const bb = Buffer.from(String(b), 'utf8');
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function motDePasseValide(fourni) {
  if (typeof fourni !== 'string' || fourni.length === 0) return false;
  return memeChaine(fourni, process.env.ADMIN_PASSWORD);
}

function codeCuisineValide(fourni) {
  if (typeof fourni !== 'string' || fourni.length === 0) return false;
  if (!configure('cuisine')) return false;
  return memeChaine(fourni, process.env.KITCHEN_PASSWORD);
}

function signe(portee, charge) {
  return crypto.createHmac('sha256', cleSignature(portee))
    .update(`${portee}.${charge}`)
    .digest('base64url');
}

function emetJeton(portee = 'admin') {
  if (PORTEES.indexOf(portee) === -1) throw new Error(`Portée inconnue : ${portee}`);
  const charge = String(Date.now() + DUREES_MS[portee]);
  return `${portee}.${charge}.${signe(portee, charge)}`;
}

/* Renvoie la portée du jeton s'il tient debout et qu'elle est acceptée, null
   sinon. Le format hérité, sans portée, n'est plus reconnu : une session
   ouverte avant cette version demande simplement à se rouvrir. */
function litJeton(jeton, porteesAcceptees) {
  if (typeof jeton !== 'string') return null;

  const parts = jeton.split('.');
  if (parts.length !== 3) return null;

  const [portee, charge, signature] = parts;
  if (PORTEES.indexOf(portee) === -1) return null;
  if (porteesAcceptees.indexOf(portee) === -1) return null;
  if (!/^\d{1,15}$/.test(charge)) return null;
  if (!configure(portee)) return null;
  if (!memeChaine(signature, signe(portee, charge))) return null;
  if (Number(charge) <= Date.now()) return null;

  return portee;
}

/* Renvoie null quand l'appel est autorisé, sinon la réponse à retourner tel
   quel. Chaque point d'entrée protégé commence par cette ligne, en disant
   quelles portées il accepte.

   La hiérarchie est à sens unique : « admin » figure dans les portées de la
   cuisine, jamais l'inverse. Le gérant voit la file sans connaître le second
   code ; le code de cuisine n'ouvre pas la carte. */
function refus(request, porteesAcceptees = ['admin']) {
  if (!configure('admin')) {
    return erreur(503, 'admin_non_configure',
      "Le back-office n'est pas configuré sur ce serveur : il manque ADMIN_PASSWORD.");
  }
  if (porteesAcceptees.indexOf('cuisine') !== -1 && !configure('cuisine')
      && porteesAcceptees.length === 1) {
    return erreur(503, 'cuisine_non_configuree',
      "L'écran de cuisine n'est pas configuré sur ce serveur : il manque KITCHEN_PASSWORD.");
  }
  if (!litJeton(request.headers.get('x-admin-jeton'), porteesAcceptees)) {
    return erreur(401, 'non_autorise', 'Session expirée ou absente. Reconnectez-vous.');
  }
  return null;
}

module.exports = {
  configure, motDePasseValide, codeCuisineValide,
  emetJeton, litJeton, refus, memeChaine,
  PORTEES, DUREES_MS
};
