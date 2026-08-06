'use strict';

function json(status, corps) {
  return {
    status,
    jsonBody: corps,
    headers: { 'Cache-Control': 'no-store' }
  };
}

function erreur(status, code, message) {
  return json(status, { erreur: code, message });
}

/* Derrière Azure Static Web Apps, l'IP réelle arrive dans x-forwarded-for. */
function ipClient(request) {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim().replace(/:\d+$/, '');
  return request.headers.get('x-azure-clientip') || 'inconnue';
}

async function corpsJson(request) {
  try {
    const brut = await request.text();
    if (!brut) return null;
    const v = JSON.parse(brut);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

module.exports = { json, erreur, ipClient, corpsJson };
