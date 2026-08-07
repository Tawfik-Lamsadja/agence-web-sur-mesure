'use strict';

const { app } = require('@azure/functions');
const { json, erreur, ipClient } = require('../shared/http');
const { RE_MAIL, texte } = require('../shared/valide');
const quota = require('../shared/quota');
const fidelite = require('../shared/fidelite');

/* Le point d'entrée dit si une adresse a déjà visité la maison : sans plafond,
   il servirait à tester des adresses en masse. */
const PLAFOND_HORAIRE = 30;

app.http('fidelite', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'fidelite',
  handler: async (request, contexte) => {
    const mail = texte(request.query.get('mail'), 120);
    if (!RE_MAIL.test(mail)) {
      return erreur(400, 'mail_invalide', 'Adresse e-mail invalide.');
    }

    if (!(await quota.verifie(ipClient(request), 'fidelite', PLAFOND_HORAIRE, contexte))) {
      return erreur(429, 'trop_de_demandes', 'Trop de consultations depuis cette connexion. Réessayez plus tard.');
    }

    try {
      return json(200, await fidelite.etat(mail));
    } catch (e) {
      contexte.error(`Lecture de la fidélité impossible : ${e.message}`);
      return erreur(503, 'indisponible', 'Le compteur de fidélité est momentanément inaccessible.');
    }
  }
});
