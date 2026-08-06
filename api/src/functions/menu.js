'use strict';

const { app } = require('@azure/functions');
const { categories } = require('../shared/menu');
const { json, erreur } = require('../shared/http');

app.http('menu', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'menu',
  handler: async (request, contexte) => {
    try {
      return json(200, { categories: await categories() });
    } catch (e) {
      contexte.error(`Lecture de la carte impossible : ${e.message}`);
      return erreur(503, 'carte_indisponible', 'La carte est momentanément indisponible.');
    }
  }
});
