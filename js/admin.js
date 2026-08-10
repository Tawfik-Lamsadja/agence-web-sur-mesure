/* =========================================================================
   Ô'resto · back-office de la carte

   Le mot de passe n'est jamais jugé ici : il part au serveur, qui répond par
   un jeton signé. Ce script ne fait que le porter en en-tête et retomber sur
   la porte dès qu'un appel répond 401. Rien de ce qui est écrit dans cette
   page ne décide de l'accès.

   Le jeton vit en sessionStorage : il disparaît avec l'onglet.
   ========================================================================= */
(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var CLE_JETON = 'oresto-admin-jeton';
  var PANNE = 'Le service est momentanément indisponible. Réessayez dans un instant.';

  var euro = new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' });

  var elPorte    = $('#adm-porte');
  var elAtelier  = $('#adm-atelier');
  var elNav      = $('#adm-nav');
  var elForm     = $('#adm-form');
  var elMdp      = $('#adm-mdp');
  var elEntrer   = $('#adm-entrer');
  var elErrPorte = $('#adm-porte-erreur');
  var elErreur   = $('#adm-erreur');
  var elFlash    = $('#adm-flash');
  var elCats     = $('#adm-cats');
  var elCompte   = $('#adm-compte');

  var CARTE = [];

  /* ===================================================================
     Accès au serveur
     =================================================================== */
  function jeton() { return sessionStorage.getItem(CLE_JETON) || ''; }

  function requete(methode, chemin, corps) {
    var opts = { method: methode, headers: { 'x-admin-jeton': jeton() } };
    if (corps) {
      opts.headers['content-type'] = 'application/json';
      opts.body = JSON.stringify(corps);
    }
    return fetch('/api/' + chemin, opts).then(function (r) {
      return r.text().then(function (brut) {
        var data = {};
        try { data = brut ? JSON.parse(brut) : {}; } catch (e) { /* réponse non JSON */ }
        if (!r.ok) {
          var err = new Error(data.message || PANNE);
          err.code = data.erreur;
          err.champs = data.champs;
          err.statut = r.status;
          throw err;
        }
        return data;
      });
    });
  }

  /* Une session périmée ramène à la porte plutôt que d'empiler les erreurs. */
  function gere(e) {
    if (e.statut === 401) {
      sessionStorage.removeItem(CLE_JETON);
      montrePorte('Session expirée. Entrez à nouveau le mot de passe.');
      return true;
    }
    return false;
  }

  function dit(el, message) {
    if (!el) return;
    el.textContent = message || '';
    el.hidden = !message;
  }

  var minuterieFlash = null;
  function flash(message) {
    dit(elFlash, message);
    if (minuterieFlash) clearTimeout(minuterieFlash);
    if (message) minuterieFlash = setTimeout(function () { dit(elFlash, ''); }, 4000);
  }

  /* ===================================================================
     Les deux écrans
     =================================================================== */
  function montrePorte(message) {
    elPorte.hidden = false;
    elAtelier.hidden = true;
    elNav.hidden = true;
    dit(elErrPorte, message);
    elMdp.value = '';
    setTimeout(function () { elMdp.focus(); }, 40);
  }

  function montreAtelier() {
    elPorte.hidden = true;
    elAtelier.hidden = false;
    elNav.hidden = false;
    dit(elErrPorte, '');
  }

  /* ===================================================================
     La carte
     =================================================================== */
  function chargeCarte() {
    return requete('GET', 'admin/carte').then(function (data) {
      CARTE = data.categories || [];
      dessine();
      montreAtelier();
    });
  }

  function champ(etiquette, type, valeur, attrs) {
    var d = document.createElement('div');
    d.className = 'field';

    var id = 'c' + Math.random().toString(36).slice(2, 9);
    var l = document.createElement('label');
    l.setAttribute('for', id);
    l.textContent = etiquette;

    var i = document.createElement('input');
    i.type = type;
    i.id = id;
    i.value = valeur;
    Object.keys(attrs || {}).forEach(function (k) { i.setAttribute(k, attrs[k]); });

    var err = document.createElement('p');
    err.className = 'field__err';
    err.hidden = true;

    d.appendChild(l);
    d.appendChild(i);
    d.appendChild(err);
    return { bloc: d, input: i, erreur: err };
  }

  /* Une ligne de plat. `plat` absent : c'est la ligne d'ajout. */
  function ligne(categorie, plat) {
    var neuf = !plat;
    var ligne = document.createElement('div');
    ligne.className = 'adm-plat' + (neuf ? ' adm-plat--neuf' : '');

    var nom = champ('Nom', 'text', neuf ? '' : plat.nom, { maxlength: 80, placeholder: neuf ? 'Nouveau plat' : '' });
    var desc = champ('Description', 'text', neuf ? '' : plat.desc, { maxlength: 200, placeholder: 'Facultative' });
    var prix = champ('Prix', 'number', neuf ? '' : (plat.prix / 100).toFixed(2),
      { step: '0.10', min: '0.50', max: '500', inputmode: 'decimal' });

    var emp = document.createElement('label');
    emp.className = 'adm-plat__emporter';
    var caseEmp = document.createElement('input');
    caseEmp.type = 'checkbox';
    caseEmp.checked = neuf ? true : plat.emporter !== false;
    emp.appendChild(caseEmp);
    emp.appendChild(document.createTextNode('À emporter'));

    var actions = document.createElement('div');
    actions.className = 'adm-plat__actions';

    if (!neuf) {
      var ref = document.createElement('p');
      ref.className = 'adm-plat__id';
      ref.textContent = plat.id + ' · ' + euro.format(plat.prix / 100);
      actions.appendChild(ref);
    }
    actions.appendChild(emp);

    var valider = document.createElement('button');
    valider.type = 'button';
    valider.className = 'btn ' + (neuf ? 'btn--outline' : 'btn--solid');
    valider.textContent = neuf ? 'Ajouter' : 'Enregistrer';
    actions.appendChild(valider);

    if (!neuf) {
      var suppr = document.createElement('button');
      suppr.type = 'button';
      suppr.className = 'btn btn--ghost';
      suppr.textContent = 'Supprimer';
      suppr.addEventListener('click', function () { supprime(categorie, plat, ligne, suppr); });
      actions.appendChild(suppr);
    }

    ligne.appendChild(nom.bloc);
    ligne.appendChild(desc.bloc);
    ligne.appendChild(prix.bloc);
    ligne.appendChild(actions);

    /* Le trait vermillon signale une ligne touchée mais pas encore envoyée. */
    function touche() { if (!neuf) ligne.classList.add('est-modifie'); }
    [nom.input, desc.input, prix.input, caseEmp].forEach(function (el) {
      el.addEventListener('input', touche);
      el.addEventListener('change', touche);
    });

    valider.addEventListener('click', function () {
      dit(nom.erreur, '');
      dit(prix.erreur, '');

      /* Les euros saisis deviennent des centimes : le serveur ne raisonne
         qu'en entiers, et 19,99 en flottant ne vaut pas 1999. */
      var euros = Number(String(prix.input.value).replace(',', '.'));
      var cents = Math.round(euros * 100);

      var corps = {
        categorieId: categorie.id,
        nom: nom.input.value,
        desc: desc.input.value,
        prix: Number.isFinite(cents) ? cents : null,
        emporter: caseEmp.checked
      };
      if (!neuf) corps.id = plat.id;

      valider.disabled = true;
      valider.textContent = 'Envoi…';
      dit(elErreur, '');

      requete('POST', 'admin/plat', corps).then(function () {
        flash(neuf ? 'Plat ajouté à ' + categorie.nom + '.' : '« ' + corps.nom +' » enregistré.');
        return chargeCarte();
      }, function (e) {
        valider.disabled = false;
        valider.textContent = neuf ? 'Ajouter' : 'Enregistrer';
        if (gere(e)) return;
        if (e.champs) {
          dit(nom.erreur, e.champs.nom || '');
          dit(prix.erreur, e.champs.prix || '');
        }
        dit(elErreur, e.message);
      });
    });

    return ligne;
  }

  function supprime(categorie, plat, ligne, bouton) {
    if (!window.confirm('Retirer « ' + plat.nom + ' » de la carte ?')) return;

    bouton.disabled = true;
    bouton.textContent = 'Suppression…';
    dit(elErreur, '');

    requete('DELETE', 'admin/plat?categorie=' + encodeURIComponent(categorie.id) +
      '&plat=' + encodeURIComponent(plat.id)).then(function () {
      flash('« ' + plat.nom + ' » retiré de la carte.');
      return chargeCarte();
    }, function (e) {
      bouton.disabled = false;
      bouton.textContent = 'Supprimer';
      if (gere(e)) return;
      dit(elErreur, e.message);
    });
  }

  function dessine() {
    elCats.textContent = '';
    var plats = 0;

    CARTE.forEach(function (c) {
      plats += c.items.length;

      var bloc = document.createElement('section');
      bloc.className = 'adm-cat';

      var tete = document.createElement('header');
      tete.className = 'adm-cat__head';

      var h = document.createElement('h2');
      h.className = 'adm-cat__nom';
      h.textContent = c.nom;
      tete.appendChild(h);

      if (c.note) {
        var n = document.createElement('p');
        n.className = 'adm-cat__note';
        n.textContent = c.note;
        tete.appendChild(n);
      }

      var cpt = document.createElement('p');
      cpt.className = 'adm-cat__compte';
      cpt.textContent = c.items.length + (c.items.length > 1 ? ' plats' : ' plat');
      tete.appendChild(cpt);

      bloc.appendChild(tete);
      c.items.forEach(function (plat) { bloc.appendChild(ligne(c, plat)); });

      var ajout = document.createElement('div');
      ajout.className = 'adm-cat__ajout';
      ajout.appendChild(ligne(c, null));
      bloc.appendChild(ajout);

      elCats.appendChild(bloc);
    });

    elCompte.textContent = CARTE.length + ' catégories, ' + plats + ' plats. ' +
      'Toute modification est visible sur le site dans la minute.';
  }

  /* ===================================================================
     Démarrage
     =================================================================== */
  elForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var mdp = elMdp.value;
    if (!mdp) { dit(elErrPorte, 'Entrez le mot de passe.'); return; }

    elEntrer.disabled = true;
    elEntrer.textContent = 'Vérification…';
    dit(elErrPorte, '');

    fetch('/api/admin/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ motDePasse: mdp })
    }).then(function (r) {
      return r.text().then(function (brut) {
        var data = {};
        try { data = brut ? JSON.parse(brut) : {}; } catch (x) { /* réponse non JSON */ }
        if (!r.ok) throw new Error(data.message || PANNE);
        return data;
      });
    }).then(function (data) {
      sessionStorage.setItem(CLE_JETON, data.jeton);
      elEntrer.disabled = false;
      elEntrer.textContent = 'Entrer';
      return chargeCarte();
    }).catch(function (err) {
      elEntrer.disabled = false;
      elEntrer.textContent = 'Entrer';
      sessionStorage.removeItem(CLE_JETON);
      dit(elErrPorte, err.message);
    });
  });

  $('#adm-sortir').addEventListener('click', function () {
    sessionStorage.removeItem(CLE_JETON);
    montrePorte('Session fermée.');
  });

  /* Onglet rouvert avec un jeton encore valable : on saute la porte. Le
     serveur reste seul juge, un jeton périmé nous y ramène aussitôt. */
  if (jeton()) {
    chargeCarte().catch(function (e) {
      if (!gere(e)) { montrePorte(''); dit(elErrPorte, e.message); }
    });
  } else {
    montrePorte('');
  }
})();
