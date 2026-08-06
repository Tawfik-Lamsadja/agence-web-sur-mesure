'use strict';

const URL_BREVO = 'https://api.brevo.com/v3/smtp/email';

function echappe(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function gabarit(titre, intro, lignes, reference, pied) {
  const cellules = lignes
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:6px 16px 6px 0;color:#8a8178">${echappe(k)}</td><td style="padding:6px 0"><strong>${echappe(v)}</strong></td></tr>`)
    .join('');

  return `<!doctype html><html lang="fr"><body style="margin:0;background:#12100e;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;color:#efe9e1">
<div style="max-width:520px;margin:0 auto;background:#1b1815;border:1px solid #2f2a25;padding:32px">
<p style="margin:0 0 4px;letter-spacing:.28em;text-transform:uppercase;font-size:11px;color:#b99a5e">Ô'resto</p>
<h1 style="margin:0 0 20px;font-size:24px;font-weight:400">${echappe(titre)}</h1>
<p style="margin:0 0 20px;line-height:1.6;color:#cfc6ba">${echappe(intro)}</p>
<table style="border-collapse:collapse;font-size:15px;margin:0 0 24px">${cellules}</table>
<p style="margin:0 0 24px;padding:14px 16px;background:#12100e;border-left:2px solid #b99a5e;font-size:20px;letter-spacing:.1em">${echappe(reference)}</p>
<p style="margin:0 0 20px;line-height:1.6;font-size:14px;color:#8a8178">${echappe(pied)}</p>
<p style="margin:0;padding-top:20px;border-top:1px solid #2f2a25;font-size:12px;line-height:1.6;color:#7a716a">
Ce message provient d'un <strong>site de démonstration</strong>. Ô'resto n'existe pas :
l'adresse, le téléphone et cette réservation sont fictifs, aucun repas ne vous attend
et aucun paiement ne sera prélevé.</p>
</div></body></html>`;
}

async function envoie({ destinataire, nom, sujet, html, texte }, contexte) {
  const cle = process.env.BREVO_API_KEY;
  const expediteur = process.env.BREVO_SENDER_EMAIL;
  if (!cle || !expediteur) {
    contexte.warn('Brevo non configuré : e-mail non envoyé.');
    return false;
  }

  try {
    const reponse = await fetch(URL_BREVO, {
      method: 'POST',
      headers: { 'api-key': cle, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { email: expediteur, name: process.env.BREVO_SENDER_NAME || "Ô'resto (démonstration)" },
        to: [{ email: destinataire, name: nom }],
        subject: sujet,
        htmlContent: html,
        textContent: texte
      })
    });

    if (!reponse.ok) {
      contexte.error(`Brevo a refusé l'envoi (${reponse.status}) : ${await reponse.text()}`);
      return false;
    }
    return true;
  } catch (e) {
    contexte.error(`Envoi Brevo impossible : ${e.message}`);
    return false;
  }
}

module.exports = { envoie, gabarit, echappe };
