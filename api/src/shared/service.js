'use strict';

const TABLES = [
  { id: 'c1', nom: 'Comptoir, 1 et 2', cap: 2, x: 8, y: 15, w: 23, h: 15 },
  { id: 'c2', nom: 'Comptoir, 3 à 5', cap: 3, x: 33, y: 15, w: 27, h: 15 },
  { id: 'c3', nom: 'Comptoir, 6 à 8', cap: 3, x: 62, y: 15, w: 27, h: 15 },
  { id: 't1', nom: 'Table 1, fenêtre', cap: 4, x: 10, y: 50, w: 24, h: 26 },
  { id: 't2', nom: 'Table 2, salle', cap: 4, x: 39, y: 55, w: 24, h: 26 },
  { id: 't3', nom: 'Table 3, fond', cap: 6, x: 68, y: 48, w: 26, h: 32 }
];

const CRENEAUX_MIDI = ['12:00', '12:30', '13:00', '13:30'];
const CRENEAUX_SOIR = ['18:30', '19:00', '19:30', '20:00', '20:30'];
const CRENEAUX = CRENEAUX_MIDI.concat(CRENEAUX_SOIR);

const ACOMPTE_CENTS = 1000;
const CONVIVES_MAX = 6;
const HORIZON_JOURS = 60;

/* Le service tourne à Bruxelles : les dates métier sont calées sur ce fuseau,
   pas sur celui du serveur ni sur celui du visiteur. */
const FUSEAU = 'Europe/Brussels';

function partsBruxelles(date) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSEAU,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false
  });
  const out = {};
  for (const p of fmt.formatToParts(date)) out[p.type] = p.value;
  return out;
}

function jourISO(date) {
  const p = partsBruxelles(date);
  return `${p.year}-${p.month}-${p.day}`;
}

function minutesBruxelles(date) {
  const p = partsBruxelles(date);
  return Number(p.hour) * 60 + Number(p.minute);
}

/* Dimanche et lundi, la salle est fermée. */
function estFerme(iso) {
  const jour = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return jour === 0 || jour === 1;
}

function dateValide(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  return jourISO(d) === iso;
}

function dansHorizon(iso, maintenant = new Date()) {
  const aujourdhui = jourISO(maintenant);
  if (iso < aujourdhui) return false;
  const limite = new Date(maintenant.getTime() + HORIZON_JOURS * 864e5);
  return iso <= jourISO(limite);
}

function tableParId(id) {
  return TABLES.find((t) => t.id === id) || null;
}

/* Un créneau déjà passé ne se réserve plus le jour même. */
function creneauPasse(iso, creneau, maintenant = new Date()) {
  if (iso !== jourISO(maintenant)) return false;
  const [h, m] = creneau.split(':').map(Number);
  return h * 60 + m <= minutesBruxelles(maintenant);
}

/* Services de retrait : 12h00–14h15 et 18h30–22h15. */
function retraitOuvert(date) {
  const iso = jourISO(date);
  if (estFerme(iso)) return false;
  const m = minutesBruxelles(date);
  return (m >= 720 && m <= 855) || (m >= 1110 && m <= 1335);
}

function reference(prefixe, aleatoire = Math.random()) {
  const base = (Date.now() % 1679616).toString(36) + Math.floor(aleatoire * 36).toString(36);
  return `${prefixe}-${base.toUpperCase().slice(-5)}`;
}

module.exports = {
  TABLES, CRENEAUX, CRENEAUX_MIDI, CRENEAUX_SOIR,
  ACOMPTE_CENTS, CONVIVES_MAX, HORIZON_JOURS, FUSEAU,
  jourISO, minutesBruxelles, estFerme, dateValide, dansHorizon,
  tableParId, creneauPasse, retraitOuvert, reference
};
