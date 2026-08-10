/* =========================================================================
   Ô'resto · planche de codes QR des tables

   Le serveur seul connaît QR_SECRET : c'est lui qui compose les liens signés.
   Cette page ne fait que les dessiner, et exige donc une session de
   back-office ouverte, comme le reste de l'administration.

   La bibliothèque de tracé est vendorisée dans js/vendor : aucune requête
   vers un tiers au moment où le restaurateur imprime.
   ========================================================================= */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };

  var CLE_JETON = 'oresto-admin-jeton';
  var elPlanche = $('#qr-planche');
  var elErreur = $('#qr-erreur');

  function dit(message) {
    elErreur.textContent = message || '';
    elErreur.hidden = !message;
  }

  function versAdmin(message) {
    dit(message + ' Redirection vers le back-office…');
    setTimeout(function () { location.href = 'admin.html'; }, 1600);
  }

  /* L'adresse encodée dans le code : celle du site, avec la table et sa
     signature. Elle est composée depuis l'origine réellement servie, pour que
     la planche imprimée depuis la préproduction ne pointe pas vers elle. */
  function lien(table) {
    return location.origin + '/?table=' + encodeURIComponent(table.id) +
      '&cle=' + encodeURIComponent(table.cle);
  }

  function dessineCode(hote, url) {
    /* Correction d'erreur « M » : un code posé sur une table prend des taches
       et des reflets, il faut qu'il survive à un quart de dégâts. */
    var code = qrcode(0, 'M');
    code.addData(url);
    code.make();
    hote.innerHTML = code.createImgTag(6, 0);
    var img = hote.querySelector('img');
    if (img) img.alt = '';
  }

  function dessine(tables) {
    elPlanche.textContent = '';

    tables.forEach(function (t) {
      var url = lien(t);

      var carte = document.createElement('article');
      carte.className = 'qr-carte';

      var code = document.createElement('div');
      code.className = 'qr-carte__code';
      dessineCode(code, url);
      carte.appendChild(code);

      var nom = document.createElement('p');
      nom.className = 'qr-carte__nom';
      nom.textContent = t.nom;
      carte.appendChild(nom);

      var cap = document.createElement('p');
      cap.className = 'qr-carte__cap';
      cap.textContent = t.cap + (t.cap > 1 ? ' couverts' : ' couvert');
      carte.appendChild(cap);

      var mot = document.createElement('p');
      mot.className = 'qr-carte__mot';
      mot.textContent = 'Scannez pour commander depuis votre place.';
      carte.appendChild(mot);

      var adresse = document.createElement('p');
      adresse.className = 'qr-carte__url';
      adresse.textContent = url;
      carte.appendChild(adresse);

      elPlanche.appendChild(carte);
    });
  }

  function charge() {
    var jeton = sessionStorage.getItem(CLE_JETON) || '';
    if (!jeton) { versAdmin('Session fermée.'); return; }

    fetch('/api/gestion/qr', { headers: { 'x-admin-jeton': jeton } })
      .then(function (r) {
        return r.text().then(function (brut) {
          var data = {};
          try { data = brut ? JSON.parse(brut) : {}; } catch (e) { /* réponse non JSON */ }
          if (r.status === 401) {
            sessionStorage.removeItem(CLE_JETON);
            versAdmin('Session expirée.');
            throw new Error('session');
          }
          if (!r.ok) throw new Error(data.message || 'Service indisponible.');
          return data;
        });
      })
      .then(function (data) { dessine(data.tables || []); })
      .catch(function (e) { if (e.message !== 'session') dit(e.message); });
  }

  $('#qr-imprimer').addEventListener('click', function () { window.print(); });

  charge();
})();
