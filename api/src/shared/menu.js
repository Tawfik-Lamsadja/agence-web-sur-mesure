'use strict';

const { carte } = require('./cosmos');

let cache = null;
let cacheJusqua = 0;
const DUREE_CACHE_MS = 60000;

async function categories() {
  if (cache && Date.now() < cacheJusqua) return cache;

  const { resources } = await carte().items
    .query('SELECT * FROM c ORDER BY c.ordre')
    .fetchAll();

  cache = resources.map((c) => ({
    id: c.id,
    nom: c.nom,
    col: c.col,
    note: c.note || '',
    items: (c.items || []).map((i) => ({
      id: i.id,
      nom: i.nom,
      desc: i.desc || '',
      prix: i.prix,
      emporter: i.emporter !== false
    }))
  }));
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

module.exports = { categories, parId };
