'use strict';

const { carte, depaquette } = require('./storage');

const PARTITION = 'carte';

let cache = null;
let cacheJusqua = 0;
const DUREE_CACHE_MS = 60000;

async function categories() {
  if (cache && Date.now() < cacheJusqua) return cache;

  const lues = [];
  const entites = carte().listEntities({
    queryOptions: { filter: `PartitionKey eq '${PARTITION}'` }
  });

  for await (const e of entites) {
    lues.push({
      id: e.rowKey,
      nom: e.nom,
      col: e.col,
      note: e.note || '',
      ordre: typeof e.ordre === 'number' ? e.ordre : 0,
      items: depaquette(e.items).map((i) => ({
        id: i.id,
        nom: i.nom,
        desc: i.desc || '',
        prix: i.prix,
        emporter: i.emporter !== false
      }))
    });
  }

  /* Table Storage rend les lignes triées par clé, pas par ordre d'affichage. */
  lues.sort((a, b) => a.ordre - b.ordre);

  cache = lues.map(({ ordre, ...reste }) => reste);
  cacheJusqua = Date.now() + DUREE_CACHE_MS;
  return cache;
}

/* Index par identifiant de plat : sert à retarifer une commande côté serveur,
   les prix envoyés par le navigateur n'étant jamais dignes de confiance. */
async function parId() {
  const index = new Map();
  for (const c of await categories()) {
    for (const i of c.items) index.set(i.id, i);
  }
  return index;
}

module.exports = { categories, parId, PARTITION };
