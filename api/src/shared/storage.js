'use strict';

const { TableClient, TableServiceClient } = require('@azure/data-tables');

const TABLES = {
  reservations: 'reservations',
  commandes: 'commandes',
  carte: 'carte',
  quotas: 'quotas'
};

/* Table Storage ne connaît que des propriétés plates : les listes voyagent
   sérialisées en JSON dans une colonne de texte. */
function empaquette(valeur) {
  return JSON.stringify(valeur || []);
}

function depaquette(brut) {
  if (!brut) return [];
  try {
    const v = JSON.parse(brut);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function connexion() {
  const c = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!c) {
    throw new Error('Stockage non configuré : renseignez AZURE_STORAGE_CONNECTION_STRING.');
  }
  return c;
}

const clients = new Map();

function table(nom) {
  if (!clients.has(nom)) {
    clients.set(nom, TableClient.fromConnectionString(connexion(), nom, {
      allowInsecureConnection: true /* autorise Azurite en local */
    }));
  }
  return clients.get(nom);
}

function service() {
  return TableServiceClient.fromConnectionString(connexion(), { allowInsecureConnection: true });
}

/* Une entité déjà présente fait répondre 409 : c'est la primitive qui empêche
   de vendre deux fois la même place. */
function estConflit(e) {
  return !!e && (e.statusCode === 409 || e.code === 'EntityAlreadyExists');
}

function estAbsent(e) {
  return !!e && (e.statusCode === 404 || e.code === 'ResourceNotFound' || e.code === 'TableNotFound');
}

/* Les clés de partition et de ligne interdisent / \ # ? ainsi que les
   caractères de contrôle. */
const INTERDITS = /[/\\#?\x00-\x1F\x7F-\x9F]/g;

function assainit(s) {
  return String(s).replace(INTERDITS, '-');
}

/* La clé de ligne d'une réservation porte le créneau et la table : combinée à
   la date en clé de partition, elle rend le triplet unique. */
function cleReservation(creneau, tableId) {
  return assainit(String(creneau).replace(':', '')) + '_' + assainit(tableId);
}

const reservations = () => table(TABLES.reservations);
const commandes = () => table(TABLES.commandes);
const carte = () => table(TABLES.carte);
const quotas = () => table(TABLES.quotas);

module.exports = {
  TABLES, table, service,
  reservations, commandes, carte, quotas,
  estConflit, estAbsent, cleReservation, assainit,
  empaquette, depaquette
};
