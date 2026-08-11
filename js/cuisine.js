/* =========================================================================
   Ô'resto · écran de cuisine

   Une nouvelle présentation d'un flux déjà existant, pas un second système :
   les commandes viennent de la même route que la vue du comptoir, et les
   changements d'état passent par la même. Seuls la mise en page et le rythme
   changent, parce qu'ici on lit à un mètre, les mains prises.

   Le code de service n'est jamais jugé dans cette page : il part au serveur,
   qui répond par un jeton signé de portée « cuisine ». Ce jeton ouvre la file
   et rien d'autre — la carte, les plats et les codes QR lui restent fermés.

   Réglages : constante CUISINE.
   ========================================================================= */
(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var CUISINE = {
    /* Rafraîchissement de la file. Plus court que le suivi client : ici on
       veut voir tomber le ticket, pas apprendre une nouvelle. */
    periodeMs: 6000,
    /* Temps qu'une commande servie reste affichée avant de quitter la file.
       Assez pour voir qu'on a bien appuyé, assez court pour dégager la vue. */
    retraitServieMs: 6000,
    /* Le bip : une sinusoïde courte et basse, pas une alarme. */
    bip: { frequenceHz: 880, dureeMs: 130, volume: 0.16, secondeNoteHz: 1174 }
  };

  /* Le jeton vit en localStorage et non en sessionStorage : une tablette qui
     se met en veille ou un onglet refermé par mégarde ne doivent pas obliger
     à ressaisir le code en plein service. */
  var CLE_JETON = 'oresto-cuisine-jeton';
  var CLE_SON = 'oresto-cuisine-son';
  var PANNE = 'Service momentanément injoignable. Nouvelle tentative en cours.';

  var elPorte    = $('#cui-porte');
  var elEcran    = $('#cui-ecran');
  var elForm     = $('#cui-form');
  var elCode     = $('#cui-code');
  var elPave     = $('#cui-pave');
  var elEntrer   = $('#cui-entrer');
  var elErrPorte = $('#cui-porte-erreur');
  var elFile     = $('#cui-file');
  var elVide     = $('#cui-vide');
  var elCompte   = $('#cui-compte');
  var elPanne    = $('#cui-panne');
  var elSon      = $('#cui-son');

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Références déjà vues : ce qui n'y figure pas est une commande neuve. */
  var connues = Object.create(null);
  var premiereLecture = true;
  var minuterie = null;
  var partantes = Object.create(null);

  var heure = new Intl.DateTimeFormat('fr-BE', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Brussels'
  });

  /* ===================================================================
     Le bip

     Fabriqué à la volée plutôt que chargé : pas de fichier à servir, et le
     contexte audio est débloqué par le toucher qui ouvre la session, ce qui
     satisfait les navigateurs sans demander un geste de plus.
     =================================================================== */
  var audio = null;
  var sonActif = localStorage.getItem(CLE_SON) !== 'non';

  function preteAudio() {
    if (audio) return;
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    try { audio = new C(); } catch (e) { audio = null; }
  }

  function bip() {
    if (!sonActif || !audio) return;
    if (audio.state === 'suspended') audio.resume();

    var b = CUISINE.bip;
    [[b.frequenceHz, 0], [b.secondeNoteHz, b.dureeMs / 1000]].forEach(function (paire) {
      var o = audio.createOscillator();
      var g = audio.createGain();
      o.type = 'sine';
      o.frequency.value = paire[0];
      var t0 = audio.currentTime + paire[1];
      /* Attaque et extinction douces : un créneau net claque désagréablement. */
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(b.volume, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + b.dureeMs / 1000);
      o.connect(g).connect(audio.destination);
      o.start(t0);
      o.stop(t0 + b.dureeMs / 1000 + 0.02);
    });
  }

  /* ===================================================================
     Accès au serveur
     =================================================================== */
  function jeton() { return localStorage.getItem(CLE_JETON) || ''; }

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
          err.statut = r.status;
          throw err;
        }
        return data;
      });
    });
  }

  function gere(e) {
    if (e.statut === 401) {
      localStorage.removeItem(CLE_JETON);
      montrePorte('Session expirée. Entrez à nouveau le code.');
      return true;
    }
    return false;
  }

  function dit(el, message) {
    if (!el) return;
    el.textContent = message || '';
    el.hidden = !message;
  }

  /* ===================================================================
     Les deux écrans
     =================================================================== */
  function montrePorte(message) {
    if (minuterie) { clearInterval(minuterie); minuterie = null; }
    elPorte.hidden = false;
    elEcran.hidden = true;
    dit(elErrPorte, message);
    elCode.value = '';
    connues = Object.create(null);
    premiereLecture = true;
  }

  function montreEcran() {
    elPorte.hidden = true;
    elEcran.hidden = false;
    dit(elErrPorte, '');
  }

  /* ===================================================================
     La file
     =================================================================== */
  function ligneOu(c) {
    if (c.service === 'salle') return c.tableNom || c.tableId || 'À table';
    return 'À emporter';
  }

  function ligneMeta(c) {
    var bouts = [c.reference];
    if (c.service === 'emporter' && c.retrait) {
      bouts.push('retrait ' + heure.format(new Date(c.retrait)));
    }
    bouts.push(c.pieces + (c.pieces > 1 ? ' articles' : ' article'));
    return bouts.join(' · ');
  }

  function ticket(c) {
    var el = document.createElement('article');
    el.className = 'tick' + (c.statut === 'preparation' ? ' est-en-prep' : '');
    el.setAttribute('data-ref', c.reference);

    var tete = document.createElement('header');
    tete.className = 'tick__tete';

    var ou = document.createElement('p');
    ou.className = 'tick__ou';
    ou.textContent = ligneOu(c);
    tete.appendChild(ou);

    var h = document.createElement('p');
    h.className = 'tick__heure';
    h.textContent = heure.format(new Date(c.creeLe));
    tete.appendChild(h);
    el.appendChild(tete);

    var meta = document.createElement('p');
    meta.className = 'tick__meta';
    meta.textContent = ligneMeta(c);
    el.appendChild(meta);

    var ul = document.createElement('ul');
    ul.className = 'tick__lignes';
    (c.articles || []).forEach(function (a) {
      var li = document.createElement('li');
      var q = document.createElement('span');
      q.className = 'tick__qte';
      q.textContent = a.qte + '×';
      var n = document.createElement('span');
      n.textContent = a.nom;
      li.appendChild(q);
      li.appendChild(n);
      ul.appendChild(li);
    });
    el.appendChild(ul);

    if (c.note) {
      var note = document.createElement('p');
      note.className = 'tick__note';
      note.textContent = c.note;
      el.appendChild(note);
    }

    var gestes = document.createElement('div');
    gestes.className = 'tick__gestes';

    if (c.statut !== 'preparation') {
      gestes.appendChild(geste(c, 'En préparation', 'preparation', 'tick__geste--prep'));
    }
    gestes.appendChild(geste(c, 'Servie', 'servie', 'tick__geste--servie'));
    el.appendChild(gestes);

    return el;
  }

  function geste(c, libelle, statut, classe) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'tick__geste ' + classe;
    b.textContent = libelle;
    b.addEventListener('click', function () {
      $$('.tick__geste', b.parentNode).forEach(function (x) { x.disabled = true; });
      b.textContent = '…';
      requete('POST', 'gestion/commande/statut', {
        jour: c.jour,
        reference: c.reference,
        service: c.service,
        statut: statut
      }).then(function () {
        if (statut === 'servie') retire(c.reference);
        relit();
      }, function (e) {
        $$('.tick__geste', b.parentNode).forEach(function (x) { x.disabled = false; });
        b.textContent = libelle;
        if (gere(e)) return;
        dit(elPanne, e.message);
      });
    });
    return b;
  }

  /* Une commande servie s'efface puis quitte la file, pour dégager la vue
     sans faire disparaître le ticket sous le doigt. */
  function retire(reference) {
    partantes[reference] = Date.now() + CUISINE.retraitServieMs;
  }

  function dessine(liste) {
    /* Ce qui est servi depuis assez longtemps quitte la file. */
    var maintenant = Date.now();
    var visibles = liste.filter(function (c) {
      if (c.statut !== 'servie') return true;

      /* Servie avant l'ouverture de l'écran : elle n'a rien à y faire. Sans
         cette réserve, toute la journée déjà servie défilerait quelques
         secondes à chaque prise de poste. On la note comme connue et déjà
         partie, pour qu'elle ne revienne pas à la lecture suivante. */
      if (premiereLecture) {
        connues[c.reference] = true;
        partantes[c.reference] = 0;
        return false;
      }

      if (!partantes[c.reference]) partantes[c.reference] = maintenant + CUISINE.retraitServieMs;
      return partantes[c.reference] > maintenant;
    });

    elFile.textContent = '';
    var neuves = 0;

    visibles.forEach(function (c) {
      var el = ticket(c);
      if (!connues[c.reference]) {
        connues[c.reference] = true;
        /* La toute première lecture n'est pas une arrivée : sinon toute la
           file tomberait d'un coup en sonnant à l'ouverture de l'écran. */
        if (!premiereLecture) { el.classList.add('est-neuf'); neuves++; }
      }
      if (c.statut === 'servie') el.classList.add('est-partante');
      elFile.appendChild(el);
    });

    if (neuves > 0) bip();
    premiereLecture = false;

    var enCours = visibles.filter(function (c) { return c.statut !== 'servie'; }).length;
    elVide.hidden = enCours > 0;
    elCompte.textContent = enCours === 0
      ? 'Aucune commande en attente'
      : enCours + (enCours > 1 ? ' commandes en cours' : ' commande en cours');
  }

  function relit() {
    return requete('GET', 'gestion/commandes?service=tout').then(function (data) {
      dit(elPanne, '');
      dessine(data.commandes || []);
    }, function (e) {
      if (gere(e)) return;
      /* Une panne réseau ne doit pas vider l'écran : on garde ce qui est
         affiché et on signale, la prochaine lecture corrigera. */
      dit(elPanne, e.message);
    });
  }

  function lance() {
    montreEcran();
    relit();
    if (minuterie) clearInterval(minuterie);
    minuterie = setInterval(function () {
      if (document.hidden) return;
      relit();
    }, CUISINE.periodeMs);
  }

  /* ===================================================================
     La porte
     =================================================================== */
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'effacer', '0', 'valider'].forEach(function (t) {
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('data-touche', t);
    b.textContent = t === 'effacer' ? 'Effacer' : t === 'valider' ? 'OK' : t;
    b.addEventListener('click', function () {
      preteAudio();
      if (t === 'effacer') { elCode.value = ''; return; }
      if (t === 'valider') { elForm.requestSubmit ? elForm.requestSubmit() : elForm.dispatchEvent(new Event('submit', { cancelable: true })); return; }
      elCode.value += t;
    });
    elPave.appendChild(b);
  });

  elForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var code = elCode.value;
    if (!code) { dit(elErrPorte, 'Entrez le code.'); return; }

    /* Le toucher qui ouvre la session débloque aussi le son. */
    preteAudio();
    if (audio && audio.state === 'suspended') audio.resume();

    elEntrer.disabled = true;
    elEntrer.textContent = 'Vérification…';
    dit(elErrPorte, '');

    fetch('/api/cuisine/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: code })
    }).then(function (r) {
      return r.text().then(function (brut) {
        var data = {};
        try { data = brut ? JSON.parse(brut) : {}; } catch (x) { /* réponse non JSON */ }
        if (!r.ok) throw new Error(data.message || PANNE);
        return data;
      });
    }).then(function (data) {
      localStorage.setItem(CLE_JETON, data.jeton);
      elEntrer.disabled = false;
      elEntrer.textContent = 'Entrer';
      lance();
    }).catch(function (err) {
      elEntrer.disabled = false;
      elEntrer.textContent = 'Entrer';
      elCode.value = '';
      localStorage.removeItem(CLE_JETON);
      dit(elErrPorte, err.message);
    });
  });

  elSon.addEventListener('click', function () {
    sonActif = !sonActif;
    localStorage.setItem(CLE_SON, sonActif ? 'oui' : 'non');
    elSon.setAttribute('aria-pressed', sonActif ? 'true' : 'false');
    if (sonActif) { preteAudio(); bip(); }
  });
  elSon.setAttribute('aria-pressed', sonActif ? 'true' : 'false');

  $('#cui-sortir').addEventListener('click', function () {
    localStorage.removeItem(CLE_JETON);
    montrePorte('Session fermée.');
  });

  /* Un retour d'écran veille doit montrer la file réelle, pas celle d'il y a
     un quart d'heure. */
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && minuterie) relit();
  });

  /* Tablette rallumée, onglet rouvert : le jeton est encore là, on entre. */
  if (jeton()) {
    lance();
  } else {
    montrePorte('');
  }
})();
