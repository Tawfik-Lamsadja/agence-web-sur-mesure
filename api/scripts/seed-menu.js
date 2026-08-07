'use strict';

/* Crée les tables et charge la carte de départ.
   Relançable sans risque : les tables existantes sont réutilisées et la carte
   est remplacée par un upsert.

   Usage : npm run seed   (depuis api/) */

const fs = require('node:fs');
const path = require('node:path');

/* Pratique en local : reprendre les réglages de local.settings.json. */
const reglages = path.join(__dirname, '..', 'local.settings.json');
if (fs.existsSync(reglages)) {
  const { Values } = JSON.parse(fs.readFileSync(reglages, 'utf8'));
  for (const [k, v] of Object.entries(Values || {})) {
    if (!process.env[k]) process.env[k] = v;
  }
}

if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
  console.error('Renseignez AZURE_STORAGE_CONNECTION_STRING.');
  process.exit(1);
}

const { TABLES, service, carte, empaquette } = require('../src/shared/storage');
const { PARTITION } = require('../src/shared/menu');
const carteInitiale = require('../src/shared/carte-initiale');

async function main() {
  const svc = service();

  for (const nom of Object.values(TABLES)) {
    try {
      await svc.createTable(nom);
      console.log(`  table « ${nom} » créée`);
    } catch (e) {
      if (e.statusCode === 409 || e.code === 'TableAlreadyExists') {
        console.log(`  table « ${nom} » déjà présente`);
      } else {
        throw e;
      }
    }
  }

  const t = carte();
  for (const categorie of carteInitiale) {
    await t.upsertEntity({
      partitionKey: PARTITION,
      rowKey: categorie.id,
      nom: categorie.nom,
      col: categorie.col,
      note: categorie.note || '',
      ordre: categorie.ordre,
      items: empaquette(categorie.items)
    }, 'Replace');
  }

  const plats = carteInitiale.reduce((n, c) => n + c.items.length, 0);
  console.log(`Carte chargée : ${carteInitiale.length} catégories, ${plats} plats.`);
}

main().catch((e) => {
  console.error(`Échec du seed : ${e.message}`);
  process.exit(1);
});
