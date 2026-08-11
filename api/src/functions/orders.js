'use strict';

const { app } = require('@azure/functions');
const { commandes, empaquette } = require('../shared/storage');
const { json, erreur, corpsJson, ipClient } = require('../shared/http');
const { coordonnees, entier, texte } = require('../shared/valide');
const { envoie, gabarit } = require('../shared/email');
const menu = require('../shared/menu');
const quota = require('../shared/quota');
const fidelite = require('../shared/fidelite');
const qr = require('../shared/qr');
const S = require('../shared/service');

const PLAFOND_HORAIRE = 8;
/* Le plafond de la salle porte sur la table, pas sur l'IP : au restaurant,
   tout le monde passe par le même réseau, et compter par IP bloquerait les
   tables suivantes dès la première commande. */
const PLAFOND_TABLE = 30;
const ARTICLES_MAX = 40;
const DELAI_MIN_MS = 25 * 60000;

function euros(cents) {
  return new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

/* Relit le panier depuis la carte en base. Les prix envoyés par le navigateur
   ne sont jamais pris en compte.

   `emporterExige` : un plat que la maison ne laisse pas sortir se commande
   parfaitement à table. La règle ne vaut donc que pour l'emporter. */
async function releve(articles, emporterExige) {
  const index = await menu.parId();
  const lignes = [];
  let total = 0;
  let pieces = 0;

  for (const brut of articles) {
    const plat = index.get(brut && brut.id);
    if (!plat) return { echec: erreur(400, 'plat_inconnu', 'Un article du panier n’existe plus à la carte.') };
    if (emporterExige && !plat.emporter) {
      return { echec: erreur(409, 'plat_sur_place', `${plat.nom} est servi en salle uniquement.`) };
    }

    const qte = entier(brut.qte);
    if (qte === null || qte < 1 || qte > ARTICLES_MAX) {
      return { echec: erreur(400, 'quantite_invalide', 'Quantité invalide.') };
    }

    pieces += qte;
    total += plat.prix * qte;
    lignes.push({ id: plat.id, nom: plat.nom, prixUnitaire: plat.prix, qte, sousTotal: plat.prix * qte });
  }

  if (pieces > ARTICLES_MAX) {
    return { echec: erreur(400, 'panier_trop_grand', `Pas plus de ${ARTICLES_MAX} articles par commande.`) };
  }
  return { lignes, total, pieces };
}

app.http('orders', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'orders',
  handler: async (request, contexte) => {
    const corps = await corpsJson(request);
    if (!corps) return erreur(400, 'corps_invalide', 'Corps de requête JSON attendu.');

    if (!Array.isArray(corps.articles) || corps.articles.length === 0) {
      return erreur(400, 'panier_vide', 'Le panier est vide.');
    }

    /* La présence d'une table fait basculer tout le parcours : on mange ici,
       tout de suite, sans heure de retrait ni coordonnées. */
    const surPlace = typeof corps.tableId === 'string' && corps.tableId.length > 0;

    return surPlace
      ? commandeSalle(corps, request, contexte)
      : commandeEmporter(corps, request, contexte);
  }
});

/* ===================================================================
   Commande à table
   =================================================================== */
async function commandeSalle(corps, request, contexte) {
  if (!qr.configure()) {
    return erreur(503, 'qr_non_configure',
      "La commande à table n'est pas configurée sur ce serveur : il manque QR_SECRET.");
  }

  const tableId = texte(corps.tableId, 20);
  const table = S.tableParId(tableId);
  if (!table) return erreur(404, 'table_inconnue', 'Cette table n’existe pas.');

  /* Sans signature valable, l'URL a été forgée : le code QR n'a pas été vu. */
  if (!qr.cleValide(tableId, corps.cle)) {
    return erreur(403, 'code_invalide',
      'Ce lien de table n’est pas valable. Scannez le code posé sur la table.');
  }

  /* La salle sert aux mêmes heures que le comptoir. */
  const maintenant = new Date();
  if (!S.retraitOuvert(maintenant)) {
    return erreur(409, 'salle_fermee', 'Le service est fermé pour le moment.');
  }

  const releve_ = await releveOuPanne(corps.articles, false, contexte);
  if (releve_.reponse) return releve_.reponse;
  const { lignes, total, pieces } = releve_;

  if (!(await quota.verifie(`table-${tableId}`, 'commande-salle', PLAFOND_TABLE, contexte))) {
    return erreur(429, 'trop_de_demandes', 'Trop de commandes pour cette table. Appelez le comptoir.');
  }

  const reference = S.reference('SA');
  const jour = S.jourISO(maintenant);
  const note = texte(corps.note, 400);

  try {
    await commandes().createEntity({
      /* Partition dédiée : la vue du comptoir lit une seule partition, sans
         balayer les commandes à emporter du jour. */
      partitionKey: `salle-${jour}`,
      rowKey: reference,
      service: 'salle',
      jour,
      tableId,
      tableNom: table.nom,
      articles: empaquette(lignes),
      totalCents: total,
      pieces,
      note,
      reference,
      statut: 'enregistree',
      creeLe: maintenant.toISOString()
    });
  } catch (e) {
    contexte.error(`Écriture de la commande à table impossible : ${e.message}`);
    return erreur(503, 'indisponible', 'La commande n’a pas pu être enregistrée. Réessayez.');
  }

  return json(201, {
    reference,
    service: 'salle',
    tableId,
    tableNom: table.nom,
    articles: lignes,
    totalCents: total,
    pieces,
    /* De quoi suivre la commande sans compte ni session : le jeton porte le
       jour, la référence et la signature qui les lie. */
    suivi: qr.jetonSuivi(jour, reference)
  });
}

/* ===================================================================
   Commande à emporter
   =================================================================== */
async function commandeEmporter(corps, request, contexte) {
  const retrait = new Date(corps.retrait);
  if (Number.isNaN(retrait.getTime())) {
    return erreur(400, 'retrait_invalide', 'Heure de retrait illisible.');
  }
  if (retrait.getTime() < Date.now() + DELAI_MIN_MS) {
    return erreur(409, 'retrait_trop_tot', 'Comptez au moins trente minutes de préparation.');
  }
  if (!S.retraitOuvert(retrait)) {
    return erreur(409, 'retrait_ferme', 'Le comptoir est fermé à cette heure-là.');
  }

  const champs = coordonnees(corps);
  if (champs.erreurs) return json(400, { erreur: 'champs_invalides', champs: champs.erreurs });
  const { nom, tel, mail, note } = champs.valeurs;

  const releve_ = await releveOuPanne(corps.articles, true, contexte);
  if (releve_.reponse) return releve_.reponse;
  const { lignes, total, pieces } = releve_;

  if (!(await quota.verifie(ipClient(request), 'commande', PLAFOND_HORAIRE, contexte))) {
    return erreur(429, 'trop_de_demandes', 'Trop de commandes depuis cette connexion. Réessayez plus tard.');
  }

  const reference = S.reference('EM');
  const jourRetrait = S.jourISO(retrait);

  try {
    await commandes().createEntity({
      partitionKey: jourRetrait,
      rowKey: reference,
      service: 'emporter',
      jourRetrait,
      retrait: retrait.toISOString(),
      /* Une entité ne porte que des propriétés plates : le détail est sérialisé. */
      articles: empaquette(lignes),
      totalCents: total,
      pieces,
      nom, tel, mail, note,
      reference,
      statut: 'enregistree',
      creeLe: new Date().toISOString()
    });
  } catch (e) {
    contexte.error(`Écriture de la commande impossible : ${e.message}`);
    return erreur(503, 'indisponible', 'La commande n’a pas pu être enregistrée. Réessayez.');
  }

  /* Comme pour les réservations : la visite est comptée à l'enregistrement,
     faute d'un pointage au retrait. */
  const compteur = await fidelite.enregistreVisite(mail, 'commande', contexte);

  const quand = retrait.toLocaleString('fr-BE', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit', timeZone: S.FUSEAU
  });
  const intro = `Votre commande est enregistrée, ${nom}.`;
  const pied = 'Présentez ce numéro au comptoir, rue de Flandre 68. Le paiement se fait sur place.';
  const detail = lignes.map((l) => [`${l.qte} × ${l.nom}`, euros(l.sousTotal)]);

  const envoye = await envoie({
    destinataire: mail,
    nom,
    sujet: `Commande à emporter · ${reference}`,
    html: gabarit('Commande enregistrée', intro, detail.concat([['Total', euros(total)], ['Retrait', quand], ['Fidélité', fidelite.mention(compteur)]]), reference, pied),
    texte: `${intro}\n\n${lignes.map((l) => `${l.qte} × ${l.nom} — ${euros(l.sousTotal)}`).join('\n')}\n\nTotal : ${euros(total)}\nRetrait : ${quand}\nRéférence : ${reference}\n\n${pied}\n\nSite de démonstration : Ô'resto n'existe pas, aucune commande ne sera préparée.`
  }, contexte);

  return json(201, {
    reference,
    service: 'emporter',
    articles: lignes,
    totalCents: total,
    pieces,
    retrait: retrait.toISOString(),
    fidelite: compteur,
    emailEnvoye: envoye
  });
}

/* La carte peut être inaccessible : la panne doit se dire une seule fois. */
async function releveOuPanne(articles, emporterExige, contexte) {
  try {
    const r = await releve(articles, emporterExige);
    if (r.echec) return { reponse: r.echec };
    return r;
  } catch (e) {
    contexte.error(`Lecture de la carte impossible : ${e.message}`);
    return { reponse: erreur(503, 'indisponible', 'La carte est momentanément inaccessible.') };
  }
}
