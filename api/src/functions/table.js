'use strict';

const { app } = require('@azure/functions');
const { json, erreur } = require('../shared/http');
const { texte } = require('../shared/valide');
const qr = require('../shared/qr');
const S = require('../shared/service');

/* Le client vient de scanner un code : la page a besoin du nom de la table
   pour le lui dire avant qu'il commande, et il vaut mieux qu'un lien forgé se
   dise tout de suite plutôt qu'au moment d'envoyer le panier.

   La signature est vérifiée ici comme elle le sera à la commande : cette
   route ne fait gagner qu'un aller-retour, elle n'accorde aucune confiance. */
app.http('table', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'table',
  handler: async (request) => {
    if (!qr.configure()) {
      return erreur(503, 'qr_non_configure',
        "La commande à table n'est pas configurée sur ce serveur.");
    }

    const id = texte(request.query.get('id'), 20);
    const cle = texte(request.query.get('cle'), 40);

    const table = S.tableParId(id);
    if (!table || !qr.cleValide(id, cle)) {
      return erreur(403, 'code_invalide',
        'Ce lien de table n’est pas valable. Scannez le code posé sur la table.');
    }

    return json(200, { id: table.id, nom: table.nom, cap: table.cap });
  }
});
