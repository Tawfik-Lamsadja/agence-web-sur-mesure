'use strict';

/* Crée la base, les conteneurs et charge la carte de départ.
   Relançable sans risque : les conteneurs existants sont réutilisés et la
   carte est remplacée par un upsert.

   Usage : npm run seed   (depuis api/) */

const fs = require('node:fs');
const path = require('node:path');
const { CosmosClient } = require('@azure/cosmos');

/* Pratique en local : reprendre les réglages de local.settings.json. */
const reglages = path.join(__dirname, '..', 'local.settings.json');
if (fs.existsSync(reglages)) {
  const { Values } = JSON.parse(fs.readFileSync(reglages, 'utf8'));
  for (const [k, v] of Object.entries(Values || {})) {
    if (!process.env[k]) process.env[k] = v;
  }
}

const carteInitiale = require('../src/shared/carte-initiale');

const NOM_BASE = process.env.COSMOS_DATABASE || 'oresto';
const DEBIT_PARTAGE = 1000; /* couvert intégralement par le palier gratuit */

const CONTENEURS = [
  { id: 'reservations', cle: '/date' },
  { id: 'commandes', cle: '/jourRetrait' },
  { id: 'carte', cle: '/id' },
  { id: 'quotas', cle: '/cle', ttl: 3600 }
];

function client() {
  const conn = process.env.COSMOS_CONNECTION_STRING;
  if (conn) return new CosmosClient(conn);
  const endpoint = process.env.COSMOS_ENDPOINT;
  const key = process.env.COSMOS_KEY;
  if (!endpoint || !key) {
    console.error('Renseignez COSMOS_CONNECTION_STRING, ou COSMOS_ENDPOINT et COSMOS_KEY.');
    process.exit(1);
  }
  return new CosmosClient({ endpoint, key });
}

async function main() {
  const c = client();

  const { database } = await c.databases.createIfNotExists({
    id: NOM_BASE,
    throughput: DEBIT_PARTAGE
  });
  console.log(`Base « ${NOM_BASE} » prête (${DEBIT_PARTAGE} RU/s partagés).`);

  for (const def of CONTENEURS) {
    const corps = { id: def.id, partitionKey: { paths: [def.cle] } };
    if (def.ttl) { corps.defaultTtl = def.ttl; }
    await database.containers.createIfNotExists(corps);
    console.log(`  conteneur « ${def.id} » (${def.cle}${def.ttl ? `, TTL ${def.ttl}s` : ''})`);
  }

  const carte = database.container('carte');
  for (const categorie of carteInitiale) {
    await carte.items.upsert(categorie);
  }
  const plats = carteInitiale.reduce((n, c2) => n + c2.items.length, 0);
  console.log(`Carte chargée : ${carteInitiale.length} catégories, ${plats} plats.`);
}

main().catch((e) => {
  console.error(`Échec du seed : ${e.message}`);
  process.exit(1);
});
