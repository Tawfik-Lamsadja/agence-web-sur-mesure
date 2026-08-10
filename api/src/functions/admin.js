'use strict';

const { app } = require('@azure/functions');
const { carte, commandes, empaquette, depaquette, estAbsent } = require('../shared/storage');
const { json, erreur, corpsJson, ipClient } = require('../shared/http');
const { texte, entier } = require('../shared/valide');
const menu = require('../shared/menu');
const quota = require('../shared/quota');
const admin = require('../shared/admin');
const qr = require('../shared/qr');
const S = require('../shared/service');

const TENTATIVES_HORAIRE = 10;

const NOM_MAX = 80;
const DESC_MAX = 200;
const PRIX_MIN = 50;      /* 0,50 € */
const PRIX_MAX = 50000;   /* 500 € */
const PLATS_MAX = 40;     /* par catégorie */

/* ===================================================================
   Ouverture de session
   =================================================================== */
app.http('adminSession', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'admin/session',
  handler: async (request, contexte) => {
    if (!admin.configure()) {
      return erreur(503, 'admin_non_configure',
        "Le back-office n'est pas configuré sur ce serveur : il manque ADMIN_PASSWORD.");
    }

    const corps = await corpsJson(request);
    if (!corps) return erreur(400, 'corps_invalide', 'Corps de requête JSON attendu.');

    /* Le plafond porte sur la tentative, pas sur la réussite : sans lui, le
       mot de passe se trouve par force brute. */
    if (!(await quota.verifie(ipClient(request), 'admin', TENTATIVES_HORAIRE, contexte))) {
      return erreur(429, 'trop_de_tentatives',
        'Trop de tentatives depuis cette connexion. Réessayez dans une heure.');
    }

    if (!admin.motDePasseValide(corps.motDePasse)) {
      contexte.warn(`Mot de passe du back-office refusé (${ipClient(request)}).`);
      return erreur(401, 'mot_de_passe_invalide', 'Mot de passe incorrect.');
    }

    return json(200, {
      jeton: admin.emetJeton(),
      valableMs: admin.DUREE_JETON_MS
    });
  }
});

/* ===================================================================
   La carte, telle qu'on l'édite

   Ce n'est pas la même vue que /api/menu : celle-ci porte les identifiants
   de catégorie et l'ordre, dont l'éditeur a besoin, et ne passe pas par le
   cache — le restaurateur doit voir l'état réel après son enregistrement.
   =================================================================== */
app.http('adminCarte', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'admin/carte',
  handler: async (request, contexte) => {
    const refuse = admin.refus(request);
    if (refuse) return refuse;

    try {
      const categories = [];
      const entites = carte().listEntities({
        queryOptions: { filter: `PartitionKey eq '${menu.PARTITION}'` }
      });

      for await (const e of entites) {
        categories.push({
          id: e.rowKey,
          nom: e.nom,
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

      categories.sort((a, b) => a.ordre - b.ordre);
      return json(200, { categories });
    } catch (e) {
      contexte.error(`Lecture de la carte impossible : ${e.message}`);
      return erreur(503, 'indisponible', 'La carte est momentanément inaccessible.');
    }
  }
});

/* ===================================================================
   Écriture d'un plat

   Une catégorie est une seule entité, ses plats vivant sérialisés dans une
   colonne. Modifier un plat, c'est donc relire la catégorie, la muter et la
   réécrire — sous condition d'etag, pour qu'un second éditeur ne recouvre
   pas en silence le travail du premier.
   =================================================================== */

function slug(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
}

/* Identifiant lisible, dérivé du nom, unique dans sa catégorie. */
function forgeId(categorieId, nom, pris) {
  const base = `${slug(categorieId).slice(0, 2)}-${slug(nom).slice(0, 3) || 'plat'}`;
  if (!pris.has(base)) return base;
  for (let n = 2; n < 100; n++) {
    if (!pris.has(`${base}${n}`)) return `${base}${n}`;
  }
  return `${base}-${Date.now().toString(36).slice(-4)}`;
}

function litPlat(corps) {
  const nom = texte(corps.nom, NOM_MAX);
  const desc = texte(corps.desc, DESC_MAX);
  const prix = entier(corps.prix);

  const erreurs = {};
  if (nom.length < 2) erreurs.nom = 'Indiquez un nom de plat.';
  if (prix === null || prix < PRIX_MIN || prix > PRIX_MAX) {
    erreurs.prix = 'Prix entre 0,50 € et 500 €.';
  }
  if (Object.keys(erreurs).length) return { erreurs };

  return { valeurs: { nom, desc, prix, emporter: corps.emporter !== false } };
}

async function litCategorie(id) {
  try {
    return await carte().getEntity(menu.PARTITION, id);
  } catch (e) {
    if (estAbsent(e)) return null;
    throw e;
  }
}

/* Réécrit les plats d'une catégorie sous condition d'etag. */
async function ecritItems(entite, items) {
  await carte().updateEntity(
    { partitionKey: menu.PARTITION, rowKey: entite.rowKey, items: empaquette(items) },
    'Merge',
    { etag: entite.etag }
  );
  menu.videCache();
}

function conflitEcriture(e) {
  return !!e && (e.statusCode === 412 || e.code === 'UpdateConditionNotSatisfied');
}

/* ===================================================================
   Les commandes à table

   Le comptoir a besoin de deux choses : voir arriver ce qui est commandé, et
   pouvoir dire que c'est servi. La lecture porte sur une seule partition, celle
   du jour en salle : aucun balayage, et les commandes à emporter n'y sont pas.
   =================================================================== */
app.http('adminCommandes', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'admin/commandes',
  handler: async (request, contexte) => {
    const refuse = admin.refus(request);
    if (refuse) return refuse;

    const jour = texte(request.query.get('jour'), 10) || S.jourISO(new Date());
    if (!S.dateValide(jour)) return erreur(400, 'jour_invalide', 'Jour attendu au format AAAA-MM-JJ.');

    try {
      const liste = [];
      const entites = commandes().listEntities({
        queryOptions: { filter: `PartitionKey eq 'salle-${jour}'` }
      });

      for await (const e of entites) {
        liste.push({
          reference: e.rowKey,
          tableId: e.tableId,
          tableNom: e.tableNom,
          articles: depaquette(e.articles),
          totalCents: e.totalCents,
          pieces: e.pieces,
          note: e.note || '',
          statut: e.statut || 'enregistree',
          creeLe: e.creeLe
        });
      }

      /* La plus ancienne d'abord : c'est l'ordre dans lequel on sert. */
      liste.sort((a, b) => String(a.creeLe).localeCompare(String(b.creeLe)));

      return json(200, {
        jour,
        commandes: liste,
        enAttente: liste.filter((c) => c.statut === 'enregistree').length
      });
    } catch (e) {
      contexte.error(`Lecture des commandes impossible : ${e.message}`);
      return erreur(503, 'indisponible', 'Les commandes sont momentanément inaccessibles.');
    }
  }
});

app.http('adminCommandeServie', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'admin/commande/servie',
  handler: async (request, contexte) => {
    const refuse = admin.refus(request);
    if (refuse) return refuse;

    const corps = await corpsJson(request);
    if (!corps) return erreur(400, 'corps_invalide', 'Corps de requête JSON attendu.');

    const jour = texte(corps.jour, 10);
    const reference = texte(corps.reference, 40);
    if (!S.dateValide(jour) || !reference) {
      return erreur(400, 'parametres_manquants', 'Jour et référence attendus.');
    }

    try {
      await commandes().updateEntity(
        { partitionKey: `salle-${jour}`, rowKey: reference, statut: 'servie', servieLe: new Date().toISOString() },
        'Merge'
      );
      return json(200, { reference, statut: 'servie' });
    } catch (e) {
      if (estAbsent(e)) return erreur(404, 'commande_inconnue', 'Cette commande n’existe plus.');
      contexte.error(`Marquage impossible : ${e.message}`);
      return erreur(503, 'indisponible', 'La commande n’a pas pu être mise à jour.');
    }
  }
});

/* ===================================================================
   Les codes QR des tables

   Le serveur seul connaît QR_SECRET : c'est donc lui qui compose les liens.
   La page d'impression ne fait que les dessiner.
   =================================================================== */
app.http('adminQr', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'admin/qr',
  handler: async (request) => {
    const refuse = admin.refus(request);
    if (refuse) return refuse;

    if (!qr.configure()) {
      return erreur(503, 'qr_non_configure',
        "La commande à table n'est pas configurée sur ce serveur : il manque QR_SECRET.");
    }

    return json(200, {
      tables: S.TABLES.map((t) => ({
        id: t.id,
        nom: t.nom,
        cap: t.cap,
        cle: qr.cleTable(t.id)
      }))
    });
  }
});

app.http('adminPlat', {
  methods: ['POST', 'DELETE'],
  authLevel: 'anonymous',
  route: 'admin/plat',
  handler: async (request, contexte) => {
    const refuse = admin.refus(request);
    if (refuse) return refuse;

    /* ---------- suppression ---------- */
    if (request.method === 'DELETE') {
      const categorieId = texte(request.query.get('categorie'), 60);
      const platId = texte(request.query.get('plat'), 60);
      if (!categorieId || !platId) {
        return erreur(400, 'parametres_manquants', 'Catégorie et plat attendus.');
      }

      try {
        const entite = await litCategorie(categorieId);
        if (!entite) return erreur(404, 'categorie_inconnue', 'Cette catégorie n’existe plus.');

        const items = depaquette(entite.items);
        const reste = items.filter((i) => i.id !== platId);
        if (reste.length === items.length) {
          return erreur(404, 'plat_inconnu', 'Ce plat n’est plus à la carte.');
        }

        await ecritItems(entite, reste);
        return json(200, { supprime: platId, restants: reste.length });
      } catch (e) {
        if (conflitEcriture(e)) {
          return erreur(409, 'carte_modifiee',
            'La carte a changé entre-temps. Rechargez la page avant de recommencer.');
        }
        contexte.error(`Suppression impossible : ${e.message}`);
        return erreur(503, 'indisponible', 'La carte n’a pas pu être modifiée. Réessayez.');
      }
    }

    /* ---------- création et modification ---------- */
    const corps = await corpsJson(request);
    if (!corps) return erreur(400, 'corps_invalide', 'Corps de requête JSON attendu.');

    const categorieId = texte(corps.categorieId, 60);
    if (!categorieId) return erreur(400, 'categorie_manquante', 'Catégorie attendue.');

    const champs = litPlat(corps);
    if (champs.erreurs) return json(400, { erreur: 'champs_invalides', champs: champs.erreurs });

    try {
      const entite = await litCategorie(categorieId);
      if (!entite) return erreur(404, 'categorie_inconnue', 'Cette catégorie n’existe plus.');

      const items = depaquette(entite.items);
      const platId = texte(corps.id, 60);

      if (platId) {
        const i = items.findIndex((x) => x.id === platId);
        if (i === -1) return erreur(404, 'plat_inconnu', 'Ce plat n’est plus à la carte.');
        items[i] = { id: platId, ...champs.valeurs };
      } else {
        if (items.length >= PLATS_MAX) {
          return erreur(409, 'categorie_pleine', `Pas plus de ${PLATS_MAX} plats par catégorie.`);
        }
        const pris = new Set(items.map((x) => x.id));
        items.push({ id: forgeId(categorieId, champs.valeurs.nom, pris), ...champs.valeurs });
      }

      await ecritItems(entite, items);
      return json(platId ? 200 : 201, {
        categorieId,
        plat: platId ? items.find((x) => x.id === platId) : items[items.length - 1]
      });
    } catch (e) {
      if (conflitEcriture(e)) {
        return erreur(409, 'carte_modifiee',
          'La carte a changé entre-temps. Rechargez la page avant de recommencer.');
      }
      contexte.error(`Écriture du plat impossible : ${e.message}`);
      return erreur(503, 'indisponible', 'La carte n’a pas pu être modifiée. Réessayez.');
    }
  }
});
