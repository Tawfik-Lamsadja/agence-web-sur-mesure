'use strict';

const { CosmosClient } = require('@azure/cosmos');

const NOM_BASE = process.env.COSMOS_DATABASE || 'oresto';

let client = null;

function getClient() {
  if (client) return client;
  const conn = process.env.COSMOS_CONNECTION_STRING;
  if (conn) {
    client = new CosmosClient(conn);
    return client;
  }
  const endpoint = process.env.COSMOS_ENDPOINT;
  const key = process.env.COSMOS_KEY;
  if (!endpoint || !key) {
    throw new Error('Cosmos non configuré : renseignez COSMOS_CONNECTION_STRING, ou COSMOS_ENDPOINT et COSMOS_KEY.');
  }
  client = new CosmosClient({ endpoint, key });
  return client;
}

function conteneur(nom) {
  return getClient().database(NOM_BASE).container(nom);
}

const reservations = () => conteneur('reservations');
const commandes = () => conteneur('commandes');
const carte = () => conteneur('carte');
const quotas = () => conteneur('quotas');

module.exports = { NOM_BASE, getClient, conteneur, reservations, commandes, carte, quotas };
