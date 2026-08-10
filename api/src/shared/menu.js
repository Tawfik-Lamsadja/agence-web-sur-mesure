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

/* Le back-office écrit dans la carte : sans cela, sa modification resterait
   invisible jusqu'à une minute. L'oubli n'est pas grave, il est seulement
   lent — et l'instance qui a écrit n'est pas forcément la seule en vie, donc
   une autre peut encore servir l'ancienne carte le temps de son cache. */
function videCache() {
  cache = null;
  cacheJusqua = 0;
}

module.exports = { categories, parId, videCache, PARTITION };
