'use strict';

const RE_MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RE_TEL = /^\+?[0-9 ().-]{9,20}$/;

function texte(v, max) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

/* Coordonnées communes à la réservation et à la commande.
   Renvoie { valeurs } ou { erreurs } — jamais les deux. */
function coordonnees(corps) {
  const nom = texte(corps.nom, 80);
  const tel = texte(corps.tel, 20);
  const mail = texte(corps.mail, 120);
  const note = texte(corps.note, 400);

  const erreurs = {};
  if (nom.length < 2) erreurs.nom = 'Indiquez votre nom.';
  if (!RE_TEL.test(tel)) erreurs.tel = 'Numéro incomplet. Exemple : +32 470 00 00 00';
  if (!RE_MAIL.test(mail)) erreurs.mail = 'Adresse e-mail invalide.';

  if (Object.keys(erreurs).length) return { erreurs };
  return { valeurs: { nom, tel, mail, note } };
}

function entier(v) {
  return Number.isInteger(v) ? v : null;
}

module.exports = { coordonnees, texte, entier, RE_MAIL, RE_TEL };
