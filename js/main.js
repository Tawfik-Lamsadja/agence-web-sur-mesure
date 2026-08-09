/* =========================================================================
   Ô'resto · script unique, sans dépendance
   ========================================================================= */
(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduce   = reduceMQ.matches;
  var live     = $('#live');

  function say(msg) { if (live) { live.textContent = ''; setTimeout(function () { live.textContent = msg; }, 40); } }

  var euroRond = new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
  var euroCent = new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' });
  function prix(cents) { return (cents % 100 === 0 ? euroRond : euroCent).format(cents / 100); }

  function jourLong(d) { return d.toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' }); }

  var FUSEAU = 'Europe/Brussels';
  var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var INDEX_JOUR = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  var fmtBruxelles = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSEAU,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false
  });

  function partsBruxelles(d) {
    var out = {};
    fmtBruxelles.formatToParts(d).forEach(function (p) { out[p.type] = p.value; });
    return {
      jour: out.year + '-' + out.month + '-' + out.day,
      heures: Number(out.hour) % 24,
      minutes: Number(out.minute),
      jourSemaine: INDEX_JOUR[out.weekday]
    };
  }

  function jourBruxelles(d) { return partsBruxelles(d).jour; }
  function cle(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* ===================================================================
     1. Garde-fous média : un fichier absent disparaît sans laisser de trace
     =================================================================== */
  /* Une image absente s'efface au lieu d'afficher une icône cassée. Sortie de
     gardeMedias pour servir aussi aux images créées après le démarrage. */
  function gardeImage(img) {
    var perdu = function () { img.classList.add('is-missing'); };
    img.addEventListener('error', perdu);
    if (img.complete && img.naturalWidth === 0) perdu();
  }

  function gardeMedias() {
    $$('img[data-guard]').forEach(gardeImage);

    $$('video[data-guard-video]').forEach(function (v) {
      var perdu = function () {
        v.classList.add('is-missing');
        v.removeAttribute('data-autoplay');
      };
      /* La phase de capture attrape aussi l'erreur émise par <source>. */
      v.addEventListener('error', perdu, true);
      if (v.error) perdu();
    });
  }

  /* ===================================================================
     2. Chargement : l'ensō se trace, puis s'efface
     =================================================================== */
  function preloader() {
    var el = $('#preloader');
    if (!el) return;
    if (reduce) { el.remove(); return; }

    var debut = Date.now();
    var fini = function () {
      var reste = Math.max(0, 1500 - (Date.now() - debut));
      setTimeout(function () {
        el.classList.add('is-done');
        setTimeout(function () { el.remove(); }, 700);
      }, reste);
    };
    if (document.readyState === 'complete') fini();
    else window.addEventListener('load', fini);
    setTimeout(fini, 4000);
  }

  /* ===================================================================
     3. En-tête
     =================================================================== */
  function entete() {
    var head = $('#head');
    var burger = $('#burger');
    if (!head) return;

    var maj = function () { head.classList.toggle('is-stuck', window.scrollY > 40); };
    maj();
    window.addEventListener('scroll', maj, { passive: true });

    if (burger) {
      burger.addEventListener('click', function () {
        var ouvert = head.classList.toggle('is-open');
        burger.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
        burger.setAttribute('aria-label', ouvert ? 'Fermer le menu' : 'Ouvrir le menu');
      });
    }
    $$('.head__nav a').forEach(function (a) {
      a.addEventListener('click', function () {
        head.classList.remove('is-open');
        if (burger) burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ===================================================================
     4. Vidéos : lecture uniquement quand elles sont à l'écran
     =================================================================== */
  function joue(v) {
    if (!v || reduce || v.classList.contains('is-missing')) return;
    if (v.preload === 'none') v.preload = 'auto';
    var p = v.play();
    if (p && p.catch) p.catch(function () { /* lecture refusée par le navigateur */ });
  }
  function pause(v) { if (v && !v.paused) v.pause(); }

  function heroVideo() {
    var v = $('.seuil__media video[data-autoplay]');
    if (!v || reduce) return;
    if (!('IntersectionObserver' in window)) { joue(v); return; }
    new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) { e.isIntersecting ? joue(v) : pause(v); });
    }, { threshold: 0.15 }).observe(v);
  }

  /* ===================================================================
     5. Le voyage du sushi

     Un seul film, cinq mouvements enchaînés, pilotés au défilement.

     Les cinq clips ont été tournés en continuité : chacun reprend la
     dernière image du précédent. Ils forment donc un plan unique de 420
     images, et le code les traite comme tel — une seule bande, un seul
     canvas, un seul index global. Il n'y a pas de « chapitres » à faire
     alterner, seulement une pellicule que le défilement déroule.

     La mécanique est celle qui a été validée : séquences d'images WebP
     extraites par ffmpeg, dessinées sur un <canvas>, frame calculée depuis
     la position de défilement, préchargement progressif en deux passes,
     boucle throttlée par requestAnimationFrame. Aucun décodage vidéo en
     temps réel.

     Le défilement est pinné : la scène est collée en haut de l'écran, plein
     cadre, pendant toute la course de la piste. Le visiteur reste
     visuellement au même endroit ; c'est le film qui avance sous ses yeux.

     Réglages à ajuster après retour visuel : tout est dans CINE.
     =================================================================== */
  var CINE = {
    /* Course totale du parcours, en hauteurs d'écran. C'est le réglage
       maître de la vitesse : plus il est grand, plus le film se déroule
       lentement sous le doigt. À 8 écrans pour 420 images, un écran de
       défilement fait avancer d'environ 52 images. */
    ecransDeCourse: 8,
    /* Course du seuil, en hauteurs d'écran : le temps que le Ô se dévide et
       quitte le cadre. Court volontairement — le film doit prendre la main
       vite. La piste mesure donc `ecransDeSeuil + ecransDeCourse` écrans. */
    ecransDeSeuil: 1,
    /* Découpage du seuil, en fractions de sa propre course. Chaque paire est
       un début et une fin ; les chevauchements sont voulus, c'est ce qui
       enchaîne les gestes sans les faire se succéder par à-coups. */
    seuilPhases: {
      fuite:   [0, 0.28],    /* accroche, ligne, chapô et boutons s'effacent */
      deroule: [0, 0.55],    /* l'anneau se dévide, le fil se déploie */
      sortie:  [0.45, 0.92], /* le mot file vers la droite et sort du cadre */
      voile:   [0.5, 1]      /* le fond du seuil s'efface, le film apparaît */
    },
    /* Lissage exponentiel de l'image affichée (0 à 1 par image rendue).
       Plus haut = plus réactif, plus bas = plus feutré. */
    lissage: 0.2,
    /* Démarrage du préchargement : distance de la section, en hauteurs
       d'écran, à laquelle la pellicule commence à se charger. */
    margePrechargement: '150% 0px',
    /* Passe grossière : une image sur N chargée d'abord, pour que le
       défilement réponde vite ; le reste suit. */
    pasGrossier: 6,
    /* Chargements simultanés. */
    parallelisme: 6,
    /* Netteté du canvas : plafond de devicePixelRatio. */
    dprMax: 1.5
  };

  /* La pellicule, dans l'ordre du récit. Le nombre d'images de chaque
     mouvement est celui produit par l'extraction ffmpeg (voir ASSETS.md). */
  var PELLICULE = [
    { id: '00a', n: 60 },
    { id: '00b', n: 90 },
    { id: '00c', n: 90 },
    { id: '00d', n: 90 },
    { id: '00e', n: 90 }
  ];

  function voyage() {
    var sec = $('[data-voyage]');
    if (!sec) return;

    var piste  = $('[data-piste]', sec);
    var stage  = $('.voyage__stage', sec);
    var canvas = $('[data-film]', sec);
    var mouvs  = $$('.mouv', sec);
    var dots   = $$('.voyage__dots button', sec);
    var seuil  = $('[data-seuil]', sec);

    /* Mouvement réduit : la feuille de style a déjà remplacé la piste par
       l'image fixe et le résumé. Rien à piloter, rien à charger. */
    if (reduce) return;

    var supporteCinema = 'IntersectionObserver' in window &&
      'requestAnimationFrame' in window &&
      !!(canvas && canvas.getContext && canvas.getContext('2d'));

    /* Sans canvas ni observateur, la piste n'a plus de raison d'être haute :
       la scène se fige sur son affiche et le récit se lit dans le résumé. */
    if (!supporteCinema) {
      sec.classList.add('sans-film');
      return;
    }

    var ctx = canvas.getContext('2d');

    /* Index global : les cinq mouvements bout à bout. */
    var TOTAL = 0;
    var depart = PELLICULE.map(function (m) { var d = TOTAL; TOTAL += m.n; return d; });
    var images = new Array(TOTAL);
    var chargees = 0;
    var prete = false;
    var cible = 0, courante = 0, dessinee = -1;
    var actif = -1;

    /* ----- géométrie de la course -----
       La piste porte le seuil puis le film. La fraction ci-dessous est la
       part de la course qui revient au seuil ; au-delà, le film déroule. */
    var ecransTotal = CINE.ecransDeSeuil + CINE.ecransDeCourse;
    var partSeuil = CINE.ecransDeSeuil / ecransTotal;
    piste.style.height = (ecransTotal * 100) + 'svh';

    /* ----- le seuil -----
       Une phase donne sa progression propre, de 0 à 1, à partir de la
       progression du seuil. */
    function phase(t, bornes) {
      return Math.min(1, Math.max(0, (t - bornes[0]) / (bornes[1] - bornes[0])));
    }

    var seuilPose = -1;

    function appliqueSeuil(t) {
      if (!seuil || t === seuilPose) return;
      seuilPose = t;
      var p = CINE.seuilPhases;
      var s = stage.style;
      s.setProperty('--seuil-fuite', phase(t, p.fuite).toFixed(4));
      s.setProperty('--o-deroule', phase(t, p.deroule).toFixed(4));
      s.setProperty('--o-sortie', phase(t, p.sortie).toFixed(4));
      s.setProperty('--seuil-voile', phase(t, p.voile).toFixed(4));
      /* Passé le seuil, il sort du champ du curseur et du clavier. */
      seuil.classList.toggle('est-passe', t >= 1);
    }

    /* Le périmètre exact de l'anneau, mesuré sur le tracé plutôt que calculé :
       le dévidage doit s'arrêter pile quand l'encre est épuisée. */
    var anneau = seuil && $('.seuil__o-anneau', seuil);
    if (anneau && anneau.getTotalLength) {
      stage.style.setProperty('--o-perimetre', anneau.getTotalLength().toFixed(1));
    }

    function appliqueMouvement(i) {
      if (i === actif) return;
      actif = i;
      mouvs.forEach(function (m, idx) { m.classList.toggle('is-active', idx === i); });
      dots.forEach(function (d, idx) {
        if (idx === i) d.setAttribute('aria-current', 'true');
        else d.removeAttribute('aria-current');
      });
    }

    /* Le mouvement auquel appartient une image globale. */
    function mouvementDe(index) {
      for (var i = PELLICULE.length - 1; i >= 0; i--) {
        if (index >= depart[i]) return i;
      }
      return 0;
    }

    /* ----- navigation par les repères ----- */
    dots.forEach(function (d) {
      d.addEventListener('click', function () {
        var i = parseInt(d.getAttribute('data-goto'), 10);
        if (isNaN(i)) return;
        /* Position de défilement qui place le premier plan du mouvement,
           le seuil étant déjà derrière nous. */
        var p = partSeuil + (1 - partSeuil) * (depart[i] / (TOTAL - 1));
        var r = piste.getBoundingClientRect();
        var course = piste.offsetHeight - window.innerHeight;
        window.scrollTo({
          top: window.scrollY + r.top + p * course,
          behavior: 'smooth'
        });
      });
    });

    /* ----- chargement progressif de la pellicule ----- */
    var chargementLance = false;

    function srcFrame(index) {
      var i = mouvementDe(index);
      var local = index - depart[i] + 1;
      var num = String(local);
      while (num.length < 3) num = '0' + num;
      return 'assets/seq/' + PELLICULE[i].id + '/f' + num + '.webp';
    }

    function chargeTout() {
      if (chargementLance) return;
      chargementLance = true;

      /* D'abord une image sur six, du début à la fin du film : le défilement
         répond aussitôt sur toute la course. Le reste comble ensuite. */
      var file = [];
      var i;
      for (i = 0; i < TOTAL; i += CINE.pasGrossier) file.push(i);
      for (i = 0; i < TOTAL; i++) if (i % CINE.pasGrossier !== 0) file.push(i);

      var enCours = 0;
      var seuil = Math.ceil(TOTAL / CINE.pasGrossier);

      function suivant() {
        while (enCours < CINE.parallelisme && file.length) charge(file.shift());
      }
      function charge(index) {
        enCours++;
        var img = new Image();
        img.decoding = 'async';
        img.onload = function () {
          images[index] = img;
          chargees++;
          /* La passe grossière suffit à montrer le canvas : les trous sont
             comblés par l'image chargée la plus proche. */
          if (!prete && chargees >= seuil) {
            prete = true;
            dessinee = -1;
            stage.classList.add('a-film');
          }
          enCours--;
          suivant();
        };
        img.onerror = function () {
          /* Image absente : le film continue sans elle. Si rien ne charge,
             le canvas ne s'affiche jamais et l'affiche reste en place. */
          enCours--;
          suivant();
        };
        img.src = srcFrame(index);
      }
      suivant();
    }

    new IntersectionObserver(function (entrees, io) {
      entrees.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.disconnect();
        chargeTout();
      });
    }, { rootMargin: CINE.margePrechargement }).observe(sec);

    /* ----- dimensionnement du canvas ----- */
    function taille() {
      var dpr = Math.min(window.devicePixelRatio || 1, CINE.dprMax);
      canvas.width = Math.round((stage.clientWidth || 1) * dpr);
      canvas.height = Math.round((stage.clientHeight || 1) * dpr);
      dessinee = -1; /* force un redessin à la prochaine image */
    }
    taille();
    window.addEventListener('resize', taille);

    /* ----- dessin d'une image, cadrage cover ----- */
    function dessine(index) {
      var img = images[index];
      if (!img) {
        /* Image pas encore là : la plus proche déjà chargée fait l'affaire. */
        for (var d = 1; d < TOTAL; d++) {
          if (images[index - d]) { img = images[index - d]; break; }
          if (images[index + d]) { img = images[index + d]; break; }
        }
      }
      if (!img) return;

      var cw = canvas.width, ch = canvas.height;
      var k = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      var dw = img.naturalWidth * k, dh = img.naturalHeight * k;
      ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
      dessinee = index;
    }

    /* ----- boucle : position de défilement vers image ----- */
    var enBoucle = false;

    function boucle() {
      if (!enBoucle) return;

      /* Progression sur la course de la piste : 0 quand la scène vient de se
         coller en haut de l'écran, 1 quand elle s'apprête à se décoller. */
      var r = piste.getBoundingClientRect();
      var course = piste.offsetHeight - window.innerHeight;
      var p = course > 0 ? -r.top / course : 0;
      p = Math.min(1, Math.max(0, p));

      /* La course se partage : le seuil d'abord, le film ensuite. Tant que le
         seuil n'est pas franchi, le film attend sur sa première image — c'est
         ce qui fait que le relais se prend sans blanc ni saut. */
      var pFilm;
      if (p < partSeuil) {
        appliqueSeuil(p / partSeuil);
        pFilm = 0;
      } else {
        appliqueSeuil(1);
        pFilm = (p - partSeuil) / (1 - partSeuil);
      }

      cible = pFilm * (TOTAL - 1);
      courante += (cible - courante) * CINE.lissage;
      var index = Math.round(courante);

      if (prete && index !== dessinee) dessine(index);
      appliqueMouvement(mouvementDe(index));

      requestAnimationFrame(boucle);
    }

    /* La boucle ne tourne que quand la section occupe l'écran. */
    new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (e.isIntersecting && !enBoucle) {
          enBoucle = true;
          requestAnimationFrame(boucle);
        } else if (!e.isIntersecting) {
          enBoucle = false;
        }
      });
    }, { threshold: 0 }).observe(sec);

    appliqueMouvement(0);
    appliqueSeuil(0);
  }


  /* ===================================================================
     5 ter. Typographie cinétique du hero

     Le titre réagit à l'approche du curseur : chaque lettre proche s'étire
     très légèrement vers le haut, puis se repose. Un souffle, pas un effet.
     Uniquement au pointeur fin — jamais au tactile, jamais en mouvement
     réduit — et le titre reste un bloc de texte ordinaire pour le reste du
     monde : l'intitulé complet est posé en aria-label avant le découpage.

     Réglages à ajuster après premier retour visuel : constante KIN.
     =================================================================== */
  var KIN = {
    rayon: 110,       /* portée de l'influence du curseur, en pixels */
    levee: 8,         /* montée maximale d'une lettre, en pixels */
    etirement: 0.07,  /* allongement vertical maximal (0.07 = 7 %) */
    lissage: 0.16     /* amortissement du retour (0 à 1 par image) */
  };

  function typoCinetique() {
    if (reduce) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    if (!('requestAnimationFrame' in window)) return;

    /* La ligne d'accroche du seuil, et non le mot lui-même : le Ô est un
       tracé qui se dévide au défilement, on ne le découpe pas en lettres. */
    var zone = $('.seuil');
    var titre = zone && $('.seuil__ligne', zone);
    if (!titre) return;

    /* L'intitulé lisible d'abord, le découpage ensuite. Les <br> deviennent
       des espaces dans le libellé. */
    var brut = [];
    (function collecte(n) {
      Array.prototype.forEach.call(n.childNodes, function (e) {
        if (e.nodeType === 3) brut.push(e.textContent);
        else if (e.nodeName === 'BR') brut.push(' ');
        else collecte(e);
      });
    })(titre);
    titre.setAttribute('aria-label', brut.join('').replace(/\s+/g, ' ').trim());

    /* Chaque lettre reçoit sa boîte, mais les lettres d'un même mot sont
       regroupées : sans cela, chaque boîte devient un point de rupture et le
       navigateur coupe volontiers au milieu d'un mot. */
    var lettres = [];
    (function decoupe(n) {
      Array.prototype.slice.call(n.childNodes).forEach(function (e) {
        if (e.nodeType === 3) {
          var frag = document.createDocumentFragment();
          e.textContent.split(/(\s+)/).forEach(function (bout) {
            if (bout === '') return;
            if (/^\s+$/.test(bout)) { frag.appendChild(document.createTextNode(bout)); return; }
            var mot = document.createElement('span');
            mot.className = 'kin-mot';
            bout.split('').forEach(function (ch) {
              var s = document.createElement('span');
              s.className = 'kin';
              s.textContent = ch;
              mot.appendChild(s);
              lettres.push({ el: s, val: 0, cible: 0 });
            });
            frag.appendChild(mot);
          });
          n.replaceChild(frag, e);
        } else if (e.nodeName !== 'BR') {
          decoupe(e);
        }
      });
    })(titre);
    if (!lettres.length) return;

    var sx = 0, sy = 0, dedans = false, enBoucle = false;

    function pas() {
      var actifs = 0;
      lettres.forEach(function (l) {
        if (dedans) {
          var r = l.el.getBoundingClientRect();
          var dx = r.left + r.width / 2 - sx;
          var dy = r.top + r.height / 2 - sy;
          var d2 = dx * dx + dy * dy;
          l.cible = Math.exp(-d2 / (2 * KIN.rayon * KIN.rayon));
        } else {
          l.cible = 0;
        }
        l.val += (l.cible - l.val) * KIN.lissage;
        if (l.val < 0.004) {
          if (l.el.style.transform) l.el.style.transform = '';
          return;
        }
        actifs++;
        l.el.style.transform = 'translateY(' + (-KIN.levee * l.val).toFixed(2) + 'px)' +
          ' scaleY(' + (1 + KIN.etirement * l.val).toFixed(4) + ')';
      });
      if (!dedans && !actifs) { enBoucle = false; return; }
      requestAnimationFrame(pas);
    }

    function reveille() {
      if (!enBoucle) { enBoucle = true; requestAnimationFrame(pas); }
    }

    zone.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      sx = e.clientX; sy = e.clientY;
      dedans = true;
      reveille();
    });
    zone.addEventListener('pointerleave', function () {
      dedans = false;
      reveille();
    });
  }

  /* ===================================================================
     5 bis. Accès à l'API
     =================================================================== */
  var PANNE = 'Le service est momentanément indisponible. Réessayez dans un instant.';

  function requete(methode, chemin, corps) {
    var opts = { method: methode, headers: {} };
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

  var API = {
    get: function (chemin) { return requete('GET', chemin, null); },
    post: function (chemin, corps) { return requete('POST', chemin, corps); }
  };

  function montreErreur(el, message) {
    if (!el) return;
    el.textContent = message || '';
    el.hidden = !message;
    if (message) say(message);
  }

  /* Compteur de fidélité posé sur l'écran de confirmation. L'état est dessiné
     tel quel, sans compte à rebours ni chiffre qui défile : la valeur affichée
     est celle que le serveur vient de renvoyer.

     Une fidélité absente — compteur indisponible côté serveur — n'affiche
     rien, plutôt qu'un chiffre faux. */
  function dessineFidelite(id, fid) {
    var el = $('#' + id);
    if (!el) return;
    if (!fid || typeof fid.visites !== 'number') { el.hidden = true; return; }

    el.textContent = '';
    el.hidden = false;

    var marques = document.createElement('span');
    marques.className = 'loyalty__marks';
    marques.setAttribute('aria-hidden', 'true');
    /* Au palier exact, le cycle est plein : les dix marques sont encrées. */
    var pleines = fid.recompenseAtteinte ? fid.palier : fid.dansCycle;
    for (var i = 0; i < fid.palier; i++) {
      var m = document.createElement('i');
      m.className = 'loyalty__mark' + (i < pleines ? ' is-on' : '');
      marques.appendChild(m);
    }

    var texte = document.createElement('span');
    texte.className = 'loyalty__text';
    texte.textContent = fid.recompenseAtteinte
      ? 'Votre ' + fid.visites + 'ᵉ visite. ' + fid.recompense + ' à votre prochaine venue.'
      : fid.visites + (fid.visites > 1 ? ' visites' : ' visite') +
        ' · encore ' + fid.restantes + ' avant ' + fid.recompense.toLowerCase() + '.';

    el.appendChild(marques);
    el.appendChild(texte);
  }

  /* ===================================================================
     6. La carte
     =================================================================== */
  var CARTE = [];
  var PAR_ID = {};

  /* Photo signature de chaque catégorie. La table est explicite plutôt que
     déduite de l'identifiant : la carte vit en base et peut gagner une
     catégorie sans que le dépôt ait la photo qui va avec. Dans ce cas la
     valeur manque, aucune image n'est posée, et rien ne casse. */
  var PHOTOS_CAT = {
    sashimi:  'assets/menu-sashimi.jpg',
    nigiri:   'assets/menu-nigiri.jpg',
    rouleaux: 'assets/menu-rouleaux.jpg',
    chauds:   'assets/menu-chauds.jpg',
    desserts: 'assets/menu-desserts.jpg',
    boissons: 'assets/menu-boissons.jpg'
  };

  function photoCategorie(id) { return PHOTOS_CAT[id] || ''; }

  /* La photo accompagne un nom de catégorie déjà écrit juste à côté : elle
     est décorative, son texte de remplacement reste vide. */
  function figurePhoto(idCat, classe) {
    var src = photoCategorie(idCat);
    if (!src) return null;
    var fig = document.createElement('figure');
    fig.className = classe + ' media';
    var img = document.createElement('img');
    img.className = 'media__el';
    img.src = src;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    gardeImage(img);
    fig.appendChild(img);
    return fig;
  }

  /* La carte vit en base : elle se modifie sans repasser par le code. */
  function chargeCarte() {
    return API.get('menu').then(function (data) {
      CARTE = data.categories || [];
      PAR_ID = {};
      CARTE.forEach(function (c) {
        c.items.forEach(function (i) { PAR_ID[i.id] = i; });
      });
      return CARTE;
    });
  }

  function carteEditoriale() {
    var hote = $('#carte-liste');
    if (!hote) return;
    [0, 1].forEach(function (col) {
      var colonne = document.createElement('div');
      CARTE.filter(function (c) { return c.col === col; }).forEach(function (c) {
        var bloc = document.createElement('section');
        bloc.className = 'cat';

        var photo = figurePhoto(c.id, 'cat__photo');
        if (photo) bloc.appendChild(photo);

        var h = document.createElement('h3');
        h.className = 'cat__name';
        h.textContent = c.nom;
        bloc.appendChild(h);

        if (c.note) {
          var n = document.createElement('p');
          n.className = 'cat__note';
          n.textContent = c.note;
          bloc.appendChild(n);
        }

        var ul = document.createElement('ul');
        ul.className = 'cat__list';
        c.items.forEach(function (it) {
          var li = document.createElement('li');
          var g = document.createElement('div');
          var nom = document.createElement('span');
          nom.className = 'cat__item-name';
          nom.textContent = it.nom;
          g.appendChild(nom);
          if (it.desc) {
            var d = document.createElement('span');
            d.className = 'cat__item-desc';
            d.textContent = it.desc;
            g.appendChild(d);
          }
          var p = document.createElement('span');
          p.className = 'cat__price';
          p.textContent = prix(it.prix);
          li.appendChild(g);
          li.appendChild(p);
          ul.appendChild(li);
        });
        bloc.appendChild(ul);
        colonne.appendChild(bloc);
      });
      hote.appendChild(colonne);
    });
  }

  /* ===================================================================
     7. Feuilles : ouverture, fermeture, navigation par ancre
     =================================================================== */
  var FEUILLES = {
    reserver: '#sheet-reserver',
    commander: '#sheet-commander',
    cadeau: '#sheet-cadeau',
    privatiser: '#sheet-privatiser'
  };
  var ouverte = null;
  var dernierFocus = null;
  var empilees = 0;

  function focusables(zone) {
    return $$('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', zone)
      .filter(function (el) { return el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement; });
  }

  function fond(masque) {
    ['#head', 'main', '.foot'].forEach(function (s) {
      var el = $(s);
      if (!el) return;
      if (masque) { el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); }
      else { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); }
    });
  }

  function ouvre(nom) {
    var el = $(FEUILLES[nom]);
    if (!el || ouverte === nom) return;
    if (ouverte) ferme(true);

    dernierFocus = document.activeElement;
    ouverte = nom;
    el.hidden = false;
    document.body.classList.add('is-locked');
    fond(true);
    /* Laisse le navigateur peindre l'état fermé avant la transition. */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { el.classList.add('is-open'); });
    });

    var cible = focusables($('.sheet__panel', el))[0];
    if (cible) setTimeout(function () { cible.focus(); }, 60);
    if (nom === 'reserver') reservation.reinitSiTermine();
    if (nom === 'cadeau') bonCadeau.reinitSiTermine();
    if (nom === 'privatiser') privatiser.reinitSiTermine();
  }

  function ferme(silencieux) {
    if (!ouverte) return;
    var el = $(FEUILLES[ouverte]);
    ouverte = null;
    if (el) {
      el.classList.remove('is-open');
      var cacher = function () { el.hidden = true; };
      reduce ? cacher() : setTimeout(cacher, 320);
      if (el.id === 'sheet-commander') panier.fermeTiroir();
    }
    document.body.classList.remove('is-locked');
    fond(false);
    if (!silencieux && dernierFocus && dernierFocus.focus) dernierFocus.focus();
  }

  function appliqueAncre() {
    var nom = location.hash.replace('#', '');
    if (FEUILLES[nom]) ouvre(nom);
    else ferme();
  }

  function demandeOuverture(nom) {
    if (location.hash === '#' + nom) { ouvre(nom); return; }
    history.pushState(null, '', '#' + nom);
    empilees++;
    appliqueAncre();
  }

  function demandeFermeture() {
    if (empilees > 0) { empilees--; history.back(); }
    else {
      history.replaceState(null, '', location.pathname + location.search);
      ferme();
    }
  }

  function feuilles() {
    $$('[data-open]').forEach(function (b) {
      b.addEventListener('click', function () { demandeOuverture(b.getAttribute('data-open')); });
    });
    $$('[data-close]').forEach(function (b) {
      b.addEventListener('click', demandeFermeture);
    });

    window.addEventListener('hashchange', appliqueAncre);

    document.addEventListener('keydown', function (e) {
      if (!ouverte) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        if (panier.tiroirOuvert()) panier.fermeTiroir();
        else demandeFermeture();
        return;
      }
      if (e.key === 'Tab') {
        var zone = panier.tiroirOuvert() ? $('#cart') : $('.sheet__panel', $(FEUILLES[ouverte]));
        var list = focusables(zone);
        if (!list.length) return;
        var premier = list[0], dernier = list[list.length - 1];
        if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier.focus(); }
        else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier.focus(); }
        else if (!zone.contains(document.activeElement)) { e.preventDefault(); premier.focus(); }
      }
    });

    if (location.hash) appliqueAncre();
  }

  /* ===================================================================
     8. Réservation
     =================================================================== */
  var ACOMPTE = 1000; /* 10 € par personne, en centimes ; confirmé par l'API */
  var TOTAL_ETAPES = 6;

  var reservation = (function () {
    var etape = 0;
    var etat = { date: null, creneau: null, convives: 2, table: null, nom: '', tel: '', mail: '', note: '' };
    var moisVu = new Date();
    moisVu.setDate(1);

    /* Plan de salle et disponibilités du jour choisi, tels que l'API les donne. */
    var TABLES = [];
    var dispo = null;
    var dispoPour = null;
    var enVol = null;
    var envoiEnCours = false;

    var elEtapes, elLabel, elEnso, elSuivant, elRetour, elResume, elPied, elErreur;

    function ferme_jour(d) { var j = d.getDay(); return j === 0 || j === 1; }

    function iso(d) {
      var m = d.getMonth() + 1, j = d.getDate();
      return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (j < 10 ? '0' + j : j);
    }

    /* Les disponibilités d'une date ne sont demandées qu'une fois. */
    function assureDispo() {
      if (!etat.date) return Promise.resolve(null);
      var jour = iso(etat.date);
      if (dispo && dispoPour === jour) return Promise.resolve(dispo);
      if (enVol && enVol.jour === jour) return enVol.promesse;

      var promesse = API.get('availability?date=' + encodeURIComponent(jour)).then(function (data) {
        dispo = data;
        dispoPour = jour;
        TABLES = data.tables || [];
        if (typeof data.acompteParPersonne === 'number') ACOMPTE = data.acompteParPersonne;
        enVol = null;
        return data;
      }, function (e) {
        enVol = null;
        throw e;
      });

      enVol = { jour: jour, promesse: promesse };
      return promesse;
    }

    function creneauxDu(service) {
      if (!dispo || !dispo.creneaux) return [];
      return dispo.creneaux.filter(function (c) { return c.service === service; });
    }

    function creneauLibre(c) { return !c.complet && !c.passe; }

    function tablesDispo() {
      if (!dispo || !etat.creneau) return [];
      var c = dispo.creneaux.filter(function (x) { return x.heure === etat.creneau; })[0];
      if (!c) return [];
      return TABLES.filter(function (t) {
        return t.cap >= etat.convives && c.tablesPrises.indexOf(t.id) === -1;
      }).map(function (t) { return t.id; });
    }

    /* ---------- calendrier ---------- */
    function dessineCalendrier() {
      var grille = $('#cal-grid'), titre = $('#cal-month');
      if (!grille) return;
      grille.textContent = '';
      titre.textContent = cap(moisVu.toLocaleDateString('fr-BE', { month: 'long', year: 'numeric' }));

      var aujourdhui = new Date(); aujourdhui.setHours(0, 0, 0, 0);
      var limite = new Date(aujourdhui.getTime() + 60 * 864e5);
      var premier = new Date(moisVu.getFullYear(), moisVu.getMonth(), 1);
      var decalage = (premier.getDay() + 6) % 7; /* semaine commencée le lundi */
      var nbJours = new Date(moisVu.getFullYear(), moisVu.getMonth() + 1, 0).getDate();
      var i;

      for (i = 0; i < decalage; i++) {
        var vide = document.createElement('div');
        vide.className = 'cal__day cal__day--empty';
        grille.appendChild(vide);
      }
      for (i = 1; i <= nbJours; i++) {
        var d = new Date(moisVu.getFullYear(), moisVu.getMonth(), i);
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'cal__day';
        b.textContent = i;
        b.setAttribute('aria-label', jourLong(d));
        var hs = d < aujourdhui || d > limite || ferme_jour(d);
        if (hs) {
          b.disabled = true;
          b.setAttribute('aria-label', jourLong(d) + ', indisponible');
        } else {
          b.setAttribute('aria-pressed', etat.date && cle(etat.date) === cle(d) ? 'true' : 'false');
          (function (jour) {
            b.addEventListener('click', function () {
              etat.date = jour;
              etat.creneau = null;
              etat.table = null;
              dispo = null;
              dispoPour = null;
              dessineCalendrier();
              valide();
            });
          })(d);
        }
        grille.appendChild(b);
      }

      var moisCourant = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1);
      var moisLimite = new Date(limite.getFullYear(), limite.getMonth(), 1);
      $('#cal-prev').disabled = moisVu <= moisCourant;
      $('#cal-next').disabled = moisVu >= moisLimite;
    }

    /* ---------- créneaux ---------- */
    function attenteCreneaux(message) {
      [['#slots-midi', 'midi'], ['#slots-soir', 'soir']].forEach(function (paire) {
        var hote = $(paire[0]);
        if (!hote) return;
        hote.textContent = '';
        var p = document.createElement('p');
        p.className = 'slots__wait';
        p.textContent = message;
        hote.appendChild(p);
      });
    }

    function dessineCreneaux() {
      [['#slots-midi', 'midi'], ['#slots-soir', 'soir']].forEach(function (paire) {
        var hote = $(paire[0]);
        if (!hote) return;
        hote.textContent = '';

        var liste = creneauxDu(paire[1]);
        if (!liste.length) {
          var p = document.createElement('p');
          p.className = 'slots__wait';
          p.textContent = dispo && dispo.ferme ? 'Fermé ce jour-là.' : 'Plus rien de libre à ce service.';
          hote.appendChild(p);
          return;
        }

        liste.forEach(function (c) {
          var h = c.heure;
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'chip';
          b.textContent = h.replace(':', 'h');
          b.setAttribute('aria-pressed', etat.creneau === h ? 'true' : 'false');
          if (!creneauLibre(c)) {
            b.disabled = true;
            b.setAttribute('aria-label', h.replace(':', 'h') + (c.passe ? ', déjà passé' : ', complet'));
          } else {
            b.addEventListener('click', function () {
              etat.creneau = h;
              etat.table = null;
              dessineCreneaux();
              valide();
            });
          }
          hote.appendChild(b);
        });
      });
    }

    /* ---------- convives ---------- */
    function dessineConvives() {
      var hote = $('#party');
      if (!hote) return;
      hote.textContent = '';
      var maxi = (dispo && dispo.convivesMax) || 6;
      for (var n = 1; n <= maxi; n++) {
        (function (nb) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'chip';
            b.setAttribute('aria-pressed', etat.convives === nb ? 'true' : 'false');
          b.textContent = nb;
          b.setAttribute('aria-label', nb + (nb > 1 ? ' personnes' : ' personne'));
          b.addEventListener('click', function () {
            etat.convives = nb;
            etat.table = null;
            dessineConvives();
            valide();
          });
          hote.appendChild(b);
        })(n);
      }
    }

    /* ---------- plan de salle ---------- */
    function dessinePlan() {
      var hote = $('#plan');
      if (!hote) return;
      $$('.seat', hote).forEach(function (s) { s.remove(); });
      var libres = tablesDispo();

      TABLES.forEach(function (t) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'seat';
        b.style.left = t.x + '%';
        b.style.top = t.y + '%';
        b.style.width = t.w + '%';
        b.style.height = t.h + '%';

        var n = document.createElement('span');
        n.className = 'seat__name';
        n.textContent = t.nom;
        var c = document.createElement('span');
        c.className = 'seat__cap';
        c.textContent = t.cap + ' couverts';
        b.appendChild(n);
        b.appendChild(c);

        var dispo = libres.indexOf(t.id) !== -1;
        b.setAttribute('aria-pressed', etat.table === t.id ? 'true' : 'false');
        if (!dispo) {
          b.disabled = true;
          b.setAttribute('aria-label', t.nom + ', ' + (t.cap < etat.convives ? 'trop petite pour ' + etat.convives + ' personnes' : 'déjà réservée'));
        } else {
          b.setAttribute('aria-label', t.nom + ', ' + t.cap + ' couverts, libre');
          b.addEventListener('click', function () {
            etat.table = t.id;
            dessinePlan();
            valide();
          });
        }
        hote.appendChild(b);
      });
    }

    /* ---------- récapitulatif ---------- */
    function dessineRecap() {
      var hote = $('#recap');
      if (!hote) return;
      hote.textContent = '';
      var t = TABLES.filter(function (x) { return x.id === etat.table; })[0];
      var lignes = [
        ['Date', etat.date ? cap(jourLong(etat.date)) : ''],
        ['Heure', etat.creneau ? etat.creneau.replace(':', 'h') : ''],
        ['Convives', etat.convives + (etat.convives > 1 ? ' personnes' : ' personne')],
        ['Place', t ? t.nom : ''],
        ['Au nom de', etat.nom]
      ];
      lignes.forEach(function (l) {
        var d = document.createElement('div');
        var a = document.createElement('span'); a.textContent = l[0];
        var b = document.createElement('strong'); b.textContent = l[1];
        d.appendChild(a); d.appendChild(b);
        hote.appendChild(d);
      });
      $('#deposit-total').textContent = prix(ACOMPTE * etat.convives);
    }

    /* ---------- validation d'étape ---------- */
    function complete(i) {
      if (i === 0) return !!etat.date;
      if (i === 1) return !!etat.creneau;
      if (i === 2) return !!etat.convives;
      if (i === 3) return !!etat.table;
      if (i === 4) return champsValides(false);
      if (i === 5) return $('#r-ok').checked;
      return true;
    }

    function champsValides(afficher) {
      var tests = [
        { id: 'r-nom', ok: function (v) { return v.trim().length >= 2; }, msg: 'Indiquez votre nom.' },
        { id: 'r-tel', ok: function (v) { return /^\+?[0-9 ().]{9,}$/.test(v.trim()); }, msg: 'Numéro incomplet. Exemple : +32 470 00 00 00' },
        { id: 'r-mail', ok: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); }, msg: 'Adresse e-mail invalide.' }
      ];
      var tout = true;
      tests.forEach(function (t) {
        var el = $('#' + t.id);
        var err = $('[data-err-for="' + t.id + '"]');
        var bon = t.ok(el.value);
        if (!bon) tout = false;
        if (afficher) {
          el.setAttribute('aria-invalid', bon ? 'false' : 'true');
          if (err) { err.textContent = bon ? '' : t.msg; err.hidden = bon; }
        }
      });
      return tout;
    }

    function valide() {
      elSuivant.disabled = !complete(etape);
      resume();
    }

    function resume() {
      if (!elResume) return;
      var bouts = [];
      if (etat.date) bouts.push(cap(jourLong(etat.date)));
      if (etat.creneau) bouts.push(etat.creneau.replace(':', 'h'));
      if (etape >= 2) bouts.push(etat.convives + (etat.convives > 1 ? ' personnes' : ' personne'));
      elResume.textContent = bouts.join(' · ');
    }

    var TITRES = ['Date', 'Heure', 'Convives', 'Place', 'Coordonnées', 'Acompte'];

    function montre(i) {
      etape = i;
      elEtapes.forEach(function (s, idx) { s.hidden = idx !== i; s.classList.toggle('is-active', idx === i); });

      var termine = i >= TOTAL_ETAPES;
      elPied.hidden = termine;
      if (termine) {
        elLabel.textContent = 'Réservation confirmée';
        elEnso.style.setProperty('--enso-progress', 1);
        return;
      }

      elLabel.textContent = 'Étape ' + (i + 1) + ' sur ' + TOTAL_ETAPES + ' · ' + TITRES[i];
      elEnso.style.setProperty('--enso-progress', (i + 1) / TOTAL_ETAPES);
      elRetour.hidden = i === 0;
      elSuivant.textContent = i === TOTAL_ETAPES - 1 ? 'Confirmer et verser l\'acompte' : 'Continuer';
      montreErreur(elErreur, '');

      /* Les étapes 1 à 3 dépendent des disponibilités réelles du jour choisi. */
      if (i >= 1 && i <= 3) {
        if (i === 1) attenteCreneaux('Recherche des disponibilités…');
        elSuivant.disabled = true;
        assureDispo().then(function () {
          if (etape !== i) return;
          if (i === 1) dessineCreneaux();
          if (i === 2) dessineConvives();
          if (i === 3) dessinePlan();
          valide();
        }, function (e) {
          if (etape !== i) return;
          if (i === 1) attenteCreneaux('Disponibilités inaccessibles.');
          montreErreur(elErreur, e.message);
        });
      } else {
        if (i === 5) dessineRecap();
        valide();
      }

      var corps = $('.sheet__body', $('#sheet-reserver'));
      if (corps) corps.scrollTop = 0;
    }

    function confirme() {
      if (!champsValides(true)) { montre(4); return; }
      if (envoiEnCours) return;

      envoiEnCours = true;
      elSuivant.disabled = true;
      elSuivant.textContent = 'Envoi…';
      montreErreur(elErreur, '');

      API.post('reservations', {
        date: iso(etat.date),
        creneau: etat.creneau,
        tableId: etat.table,
        convives: etat.convives,
        nom: etat.nom,
        tel: etat.tel,
        mail: etat.mail,
        note: etat.note
      }).then(function (rep) {
        envoiEnCours = false;
        $('#r-ref').textContent = rep.reference;
        $('#r-done-text').textContent =
          'Nous vous attendons le ' + jourLong(etat.date) + ' à ' + etat.creneau.replace(':', 'h') +
          ', ' + rep.tableNom.toLowerCase() + ', pour ' + rep.convives + (rep.convives > 1 ? ' personnes' : ' personne') +
          '.' + (rep.emailEnvoye ? ' La confirmation part à l\'instant vers ' + etat.mail + '.' : '') +
          ' Pour annuler, appelez le +32 2 512 04 77 au plus tard vingt-quatre heures avant.';
        dessineFidelite('r-fid', rep.fidelite);
        montre(TOTAL_ETAPES);
        say('Réservation confirmée, référence ' + rep.reference);
      }, function (e) {
        envoiEnCours = false;
        elSuivant.textContent = 'Confirmer et verser l\'acompte';
        elSuivant.disabled = false;

        /* La place vient d'être prise : le plan doit repartir des vraies données.
           Le message est posé après le changement d'étape, qui remet à zéro. */
        if (e.code === 'place_prise' || e.code === 'creneau_passe') {
          dispo = null;
          dispoPour = null;
          etat.table = null;
          montre(3);
        } else if (e.champs) {
          montre(4);
          champsValides(true);
        }
        montreErreur(elErreur, e.message);
      });
    }

    function init() {
      var feuille = $('#sheet-reserver');
      if (!feuille) return;

      elEtapes = $$('.step', feuille);
      elLabel = $('#reserver-step-label');
      elEnso = $('#reserver-enso');
      elSuivant = $('#r-next');
      elRetour = $('#r-back');
      elResume = $('#r-summary');
      elPied = $('#reserver-foot');
      elErreur = $('#r-error');

      $('#cal-prev').addEventListener('click', function () {
        moisVu = new Date(moisVu.getFullYear(), moisVu.getMonth() - 1, 1);
        dessineCalendrier();
      });
      $('#cal-next').addEventListener('click', function () {
        moisVu = new Date(moisVu.getFullYear(), moisVu.getMonth() + 1, 1);
        dessineCalendrier();
      });

      ['r-nom', 'r-tel', 'r-mail'].forEach(function (id) {
        $('#' + id).addEventListener('input', function () {
          etat.nom = $('#r-nom').value;
          etat.tel = $('#r-tel').value;
          etat.mail = $('#r-mail').value;
          valide();
        });
        $('#' + id).addEventListener('blur', function () { if (etape === 4) champsValides(true); });
      });
      $('#r-note').addEventListener('input', function () { etat.note = this.value; });
      $('#r-ok').addEventListener('change', valide);

      elSuivant.addEventListener('click', function () {
        if (etape === 4 && !champsValides(true)) return;
        if (etape === TOTAL_ETAPES - 1) { confirme(); return; }
        montre(etape + 1);
      });
      elRetour.addEventListener('click', function () { if (etape > 0) montre(etape - 1); });

      dessineCalendrier();
      montre(0);
    }

    return {
      init: init,
      reinitSiTermine: function () {
        if (etape >= TOTAL_ETAPES) {
          etat = { date: null, creneau: null, convives: 2, table: null, nom: '', tel: '', mail: '', note: '' };
          ['r-nom', 'r-tel', 'r-mail', 'r-note'].forEach(function (id) { $('#' + id).value = ''; });
          $('#r-ok').checked = false;
          dispo = null;
          dispoPour = null;
          moisVu = new Date(); moisVu.setDate(1);
          dessineCalendrier();
          montre(0);
        }
      }
    };
  })();

  /* ===================================================================
     8 bis. Le plat qui rejoint le panier

     Prolongement du micro-delight déjà en place : l'onde qui quitte le bouton
     et le compteur qui marque le coup restent, une vignette du plat part en
     plus du bouton, décrit un arc et se referme sur le panier. Le geste dit
     où l'article est allé, ce qu'un compteur qui change ne dit pas.

     La vignette porte la photo de la catégorie : les plats n'ont pas d'image
     propre. Sans photo, sans animation possible, ou en mouvement réduit, il
     ne se passe rien de plus qu'avant.

     Réglages : constante VOL.
     =================================================================== */
  var VOL = {
    duree: 620,        /* durée du vol, en millisecondes */
    taille: 96,        /* côté de la vignette au départ, en pixels */
    finEchelle: 0.18,  /* taille à l'arrivée, en fraction de la taille */
    cambrure: 0.3,     /* hauteur de l'arc, en fraction de la distance */
    courbe: 'cubic-bezier(0.32, 0, 0.24, 1)'
  };

  function voleVersPanier(depuis, src) {
    if (reduce || !src || !depuis) return;
    /* Sans l'API d'animation, on s'abstient plutôt que de bricoler : l'onde
       et le compteur suffisent à dire que l'ajout a eu lieu. */
    if (typeof depuis.animate !== 'function') return;

    var cible = $('#cart-open');
    if (!cible) return;

    var rd = depuis.getBoundingClientRect();
    var rc = cible.getBoundingClientRect();
    if (!rc.width) return; /* panier hors du champ : rien à viser */

    var t = VOL.taille;
    var x0 = rd.left + rd.width / 2 - t / 2;
    var y0 = rd.top + rd.height / 2 - t / 2;
    var dx = rc.left + rc.width / 2 - t / 2 - x0;
    var dy = rc.top + rc.height / 2 - t / 2 - y0;

    var vignette = document.createElement('div');
    vignette.className = 'vol';
    vignette.setAttribute('aria-hidden', 'true');
    vignette.style.width = t + 'px';
    vignette.style.height = t + 'px';
    vignette.style.left = x0 + 'px';
    vignette.style.top = y0 + 'px';
    vignette.style.backgroundImage = 'url("' + src + '")';
    document.body.appendChild(vignette);

    /* Le sommet de l'arc est pris au-dessus de la corde : le plat s'élève
       avant de retomber dans le panier, au lieu de glisser en ligne droite. */
    var cambre = -Math.abs(dx) * VOL.cambrure;

    var anim = vignette.animate([
      { transform: 'translate(0px, 0px) scale(1)', opacity: 1 },
      { transform: 'translate(' + (dx / 2) + 'px, ' + (dy / 2 + cambre) + 'px) scale(0.6)',
        opacity: 1, offset: 0.55 },
      { transform: 'translate(' + dx + 'px, ' + dy + 'px) scale(' + VOL.finEchelle + ')', opacity: 0 }
    ], { duration: VOL.duree, easing: VOL.courbe, fill: 'forwards' });

    var retire = function () {
      if (vignette.parentNode) vignette.parentNode.removeChild(vignette);
    };
    anim.onfinish = retire;
    anim.oncancel = retire;
    /* Filet : une animation qui ne rend jamais la main ne doit pas laisser
       la vignette collée à l'écran. */
    setTimeout(retire, VOL.duree + 400);
  }

  /* ===================================================================
     9. Commande à emporter
     =================================================================== */
  var panier = (function () {
    var lignes = {};
    var envoiEnCours = false;
    var nbAvant = 0;
    var elTiroir, elCompte, elEnso, elTotal, elListe, elVide, elValider, elFini, elErreur;

    function nb() {
      var n = 0, k;
      for (k in lignes) if (lignes.hasOwnProperty(k)) n += lignes[k];
      return n;
    }
    function total() {
      var t = 0, k;
      for (k in lignes) if (lignes.hasOwnProperty(k)) t += lignes[k] * PAR_ID[k].prix;
      return t;
    }

    function ajoute(id, delta) {
      var q = (lignes[id] || 0) + delta;
      if (q <= 0) delete lignes[id]; else lignes[id] = q;
      dessine();
    }

    function dessine() {
      var n = nb();
      elCompte.textContent = n;
      /* Le compteur marque le coup à chaque changement — jamais au premier
         dessin, jamais en mouvement réduit. */
      if (n !== nbAvant && !reduce) {
        elCompte.classList.remove('is-pop');
        void elCompte.offsetWidth; /* relance l'animation */
        elCompte.classList.add('is-pop');
      }
      nbAvant = n;
      $('#cart-open').classList.toggle('is-empty', n === 0);
      elEnso.style.setProperty('--enso-progress', Math.min(1, n / 8));
      elTotal.textContent = prix(total());
      elValider.disabled = n === 0 || envoiEnCours;
      elVide.hidden = n > 0;
      elListe.textContent = '';

      Object.keys(lignes).forEach(function (id) {
        var it = PAR_ID[id];
        var li = document.createElement('li');

        var nom = document.createElement('span');
        nom.className = 'cart__line-name';
        nom.textContent = it.nom;

        var p = document.createElement('span');
        p.className = 'cart__line-price';
        p.textContent = prix(it.prix * lignes[id]);

        var q = document.createElement('div');
        q.className = 'qty';
        var moins = document.createElement('button');
        moins.type = 'button';
        moins.textContent = '−';
        moins.setAttribute('aria-label', 'Retirer un ' + it.nom);
        moins.addEventListener('click', function () { ajoute(id, -1); });
        var out = document.createElement('output');
        out.textContent = lignes[id];
        var plus = document.createElement('button');
        plus.type = 'button';
        plus.textContent = '+';
        plus.setAttribute('aria-label', 'Ajouter un ' + it.nom);
        plus.addEventListener('click', function () { ajoute(id, 1); });
        q.appendChild(moins); q.appendChild(out); q.appendChild(plus);

        li.appendChild(nom);
        li.appendChild(p);
        li.appendChild(q);
        elListe.appendChild(li);
      });
    }

    function dessineMenu() {
      var onglets = $('#order-tabs'), liste = $('#order-list');
      if (!liste) return;
      onglets.textContent = '';
      liste.textContent = '';

      CARTE.forEach(function (c, idx) {
        var o = document.createElement('button');
        o.type = 'button';
        o.textContent = c.nom;
        if (idx === 0) o.setAttribute('aria-current', 'true');
        o.addEventListener('click', function () {
          var cible = $('#cat-' + c.id);
          if (cible) cible.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
          $$('button', onglets).forEach(function (x) { x.removeAttribute('aria-current'); });
          o.setAttribute('aria-current', 'true');
        });
        onglets.appendChild(o);

        var bloc = document.createElement('section');
        bloc.className = 'order__cat';
        bloc.id = 'cat-' + c.id;

        var photo = figurePhoto(c.id, 'order__cat-photo');
        if (photo) bloc.appendChild(photo);
        /* Les plats n'ont pas d'image propre : la vignette qui rejoint le
           panier emprunte celle de leur catégorie. */
        var srcVignette = photoCategorie(c.id);

        var h = document.createElement('h3');
        h.textContent = c.nom;
        bloc.appendChild(h);
        if (c.note) {
          var n = document.createElement('p');
          n.textContent = c.note;
          bloc.appendChild(n);
        }

        c.items.forEach(function (it) {
          var dispo = it.emporter !== false;
          var row = document.createElement('article');
          row.className = 'dish' + (dispo ? '' : ' dish--off');

          var bloc2 = document.createElement('div');
          var nom = document.createElement('p');
          nom.className = 'dish__name';
          nom.textContent = it.nom;
          bloc2.appendChild(nom);
          if (it.desc) {
            var d = document.createElement('p');
            d.className = 'dish__desc';
            d.textContent = it.desc;
            bloc2.appendChild(d);
          }
          if (!dispo) {
            var off = document.createElement('p');
            off.className = 'dish__off';
            off.textContent = 'Servi en salle uniquement.';
            bloc2.appendChild(off);
          }

          var p = document.createElement('span');
          p.className = 'dish__price';
          p.textContent = prix(it.prix);

          var add = document.createElement('button');
          add.type = 'button';
          add.className = 'dish__add';
          add.disabled = !dispo;
          add.setAttribute('aria-label', dispo ? 'Ajouter ' + it.nom + ' au panier' : it.nom + ', indisponible à emporter');
          if (dispo) {
            add.addEventListener('click', function () {
              ajoute(it.id, 1);
              /* Une onde quitte le bouton : l'ajout s'est bien produit ici. */
              if (!reduce) {
                add.classList.remove('is-added');
                void add.offsetWidth;
                add.classList.add('is-added');
              }
              /* Et la vignette du plat s'en va rejoindre le panier. */
              voleVersPanier(add, srcVignette);
              say(it.nom + ' ajouté au panier, ' + nb() + ' article' + (nb() > 1 ? 's' : ''));
            });
          }

          row.appendChild(bloc2);
          row.appendChild(p);
          row.appendChild(add);
          bloc.appendChild(row);
        });

        liste.appendChild(bloc);
      });
    }

    /* Le comptoir vit à l'heure de Bruxelles, pas à celle du visiteur :
       le serveur refuserait un retrait calculé dans un autre fuseau. */
    function ouvertureService(d) {
      var p = partsBruxelles(d);
      if (p.jourSemaine === 0 || p.jourSemaine === 1) return false;
      var m = p.heures * 60 + p.minutes;
      return (m >= 720 && m <= 855) || (m >= 1110 && m <= 1335);
    }

    function heuresRetrait() {
      var d = new Date(Date.now() + 30 * 60000);
      d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
      var out = [], garde = 0;
      while (out.length < 10 && garde++ < 800) {
        if (ouvertureService(d)) out.push(new Date(d.getTime()));
        d = new Date(d.getTime() + 15 * 60000);
      }
      return out;
    }

    function dessineRetrait() {
      var sel = $('#pickup-time');
      if (!sel) return;
      sel.textContent = '';
      var auj = jourBruxelles(new Date());
      heuresRetrait().forEach(function (d) {
        var p = partsBruxelles(d);
        var o = document.createElement('option');
        o.value = d.toISOString();
        o.textContent = (jourBruxelles(d) === auj ? 'Aujourd\'hui' : cap(JOURS[p.jourSemaine])) +
          ', ' + p.heures + 'h' + (p.minutes < 10 ? '0' + p.minutes : p.minutes);
        sel.appendChild(o);
      });
      if (!sel.options.length) {
        var vide = document.createElement('option');
        vide.textContent = 'Aucun retrait avant la réouverture, mardi';
        sel.appendChild(vide);
      }
    }

    function ouvreTiroir() {
      elTiroir.classList.add('is-open');
      elTiroir.setAttribute('aria-hidden', 'false');
      $('#cart-open').setAttribute('aria-expanded', 'true');
      dessineRetrait();
      var c = $('#cart-close');
      if (c) setTimeout(function () { c.focus(); }, 60);
    }
    function fermeTiroir() {
      if (!elTiroir) return;
      elTiroir.classList.remove('is-open');
      elTiroir.setAttribute('aria-hidden', 'true');
      var b = $('#cart-open');
      if (b) b.setAttribute('aria-expanded', 'false');
    }

    var CHAMPS = [
      { id: 'o-nom', cle: 'nom', ok: function (v) { return v.trim().length >= 2; }, msg: 'Indiquez votre nom.' },
      { id: 'o-tel', cle: 'tel', ok: function (v) { return /^\+?[0-9 ().]{9,}$/.test(v.trim()); }, msg: 'Numéro incomplet. Exemple : +32 470 00 00 00' },
      { id: 'o-mail', cle: 'mail', ok: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); }, msg: 'Adresse e-mail invalide.' }
    ];

    function champsValides(afficher) {
      var tout = true;
      CHAMPS.forEach(function (c) {
        var el = $('#' + c.id);
        if (!el) return;
        var err = $('[data-err-for="' + c.id + '"]');
        var bon = c.ok(el.value);
        if (!bon) tout = false;
        if (afficher) {
          el.setAttribute('aria-invalid', bon ? 'false' : 'true');
          if (err) { err.textContent = bon ? '' : c.msg; err.hidden = bon; }
        }
      });
      return tout;
    }

    function valide() {
      if (envoiEnCours) return;
      if (!champsValides(true)) {
        montreErreur(elErreur, 'Complétez vos coordonnées pour recevoir la confirmation.');
        var manquant = CHAMPS.filter(function (c) { return !c.ok($('#' + c.id).value); })[0];
        if (manquant) $('#' + manquant.id).focus();
        return;
      }

      var sel = $('#pickup-time');
      if (!sel || !sel.value) {
        montreErreur(elErreur, 'Choisissez une heure de retrait.');
        return;
      }

      envoiEnCours = true;
      elValider.disabled = true;
      elValider.textContent = 'Envoi…';
      montreErreur(elErreur, '');

      var articles = Object.keys(lignes).map(function (id) {
        return { id: id, qte: lignes[id] };
      });

      API.post('orders', {
        articles: articles,
        retrait: sel.value,
        nom: $('#o-nom').value,
        tel: $('#o-tel').value,
        mail: $('#o-mail').value
      }).then(function (rep) {
        envoiEnCours = false;
        elValider.textContent = 'Valider la commande';
        var quand = sel.selectedOptions.length ? sel.selectedOptions[0].textContent : '';
        $('#o-ref').textContent = rep.reference;
        $('#o-done-text').textContent =
          rep.pieces + ' article' + (rep.pieces > 1 ? 's' : '') + ', ' + prix(rep.totalCents) +
          '. Retrait ' + quand.toLowerCase() + ', rue de Flandre 68. Présentez ce numéro au comptoir, le paiement se fait sur place.';
        dessineFidelite('o-fid', rep.fidelite);
        elFini.hidden = false;
        say('Commande enregistrée, numéro ' + rep.reference);
      }, function (e) {
        envoiEnCours = false;
        elValider.textContent = 'Valider la commande';
        elValider.disabled = false;
        montreErreur(elErreur, e.message);
        /* Une heure de retrait devenue invalide se recalcule sur-le-champ. */
        if (e.code === 'retrait_trop_tot' || e.code === 'retrait_ferme') dessineRetrait();
      });
    }

    function init() {
      elTiroir = $('#cart');
      if (!elTiroir) return;
      elCompte = $('#cart-count');
      elEnso = $('.cart-btn__enso');
      elTotal = $('#cart-total');
      elListe = $('#cart-lines');
      elVide = $('#cart-empty');
      elValider = $('#cart-checkout');
      elFini = $('#cart-done');
      elErreur = $('#cart-error');

      CHAMPS.forEach(function (c) {
        var el = $('#' + c.id);
        if (el) el.addEventListener('blur', function () { champsValides(true); });
      });

      dessine();

      $('#cart-open').addEventListener('click', function () {
        elTiroir.classList.contains('is-open') ? fermeTiroir() : ouvreTiroir();
      });
      $('#cart-close').addEventListener('click', function () {
        fermeTiroir();
        $('#cart-open').focus();
      });
      elValider.addEventListener('click', valide);
      $('#cart-done-close').addEventListener('click', function () {
        elFini.hidden = true;
        lignes = {};
        dessine();
        fermeTiroir();
        demandeFermeture();
      });
    }

    return {
      init: init,
      dessineMenu: dessineMenu,
      fermeTiroir: fermeTiroir,
      tiroirOuvert: function () { return !!elTiroir && elTiroir.classList.contains('is-open'); }
    };
  })();

  /* ===================================================================
     10. Démarrage
     =================================================================== */
  function carteIndisponible() {
    var message = 'La carte est momentanément indisponible. Rechargez la page dans un instant.';
    [$('#carte-liste'), $('#order-list')].forEach(function (hote) {
      if (!hote) return;
      hote.textContent = '';
      var p = document.createElement('p');
      p.className = 'slots__wait';
      p.textContent = message;
      hote.appendChild(p);
    });
    say(message);
  }

  /* ===================================================================
     11. Bon cadeau et privatisation

     Deux formulaires d'une seule étape, bâtis sur le même squelette : une
     validation locale qui n'ouvre le bouton que quand tout est bon, puis un
     envoi dont les erreurs de champs renvoyées par l'API sont reposées sur
     les champs concernés.
     =================================================================== */
  var COORD = [
    { suffixe: 'nom', cle: 'nom', ok: function (v) { return v.trim().length >= 2; }, msg: 'Indiquez votre nom.' },
    { suffixe: 'tel', cle: 'tel', ok: function (v) { return /^\+?[0-9 ().-]{9,20}$/.test(v.trim()); }, msg: 'Numéro incomplet. Exemple : +32 470 00 00 00' },
    { suffixe: 'mail', cle: 'mail', ok: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); }, msg: 'Adresse e-mail invalide.' }
  ];

  function marqueChamp(id, message) {
    var el = $('#' + id);
    var err = $('[data-err-for="' + id + '"]');
    if (el) el.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (err) { err.textContent = message || ''; err.hidden = !message; }
  }

  /* Les erreurs que l'API renvoie par champ priment sur la validation locale :
     c'est elle qui fait autorité. */
  function reposeErreurs(prefixe, champs) {
    if (!champs) return;
    COORD.forEach(function (c) {
      if (champs[c.cle]) marqueChamp(prefixe + '-' + c.suffixe, champs[c.cle]);
    });
  }

  function coordValides(prefixe, afficher) {
    var tout = true;
    COORD.forEach(function (c) {
      var el = $('#' + prefixe + '-' + c.suffixe);
      if (!el) return;
      var bon = c.ok(el.value);
      if (!bon) tout = false;
      if (afficher) marqueChamp(prefixe + '-' + c.suffixe, bon ? '' : c.msg);
    });
    return tout;
  }

  function litCoord(prefixe) {
    var note = $('#' + prefixe + '-note');
    return {
      nom: $('#' + prefixe + '-nom').value.trim(),
      tel: $('#' + prefixe + '-tel').value.trim(),
      mail: $('#' + prefixe + '-mail').value.trim(),
      note: note ? note.value.trim() : ''
    };
  }

  /* Remet la feuille sur son formulaire. Sans cela, rouvrir une feuille déjà
     envoyée réafficherait la confirmation, pied de page caché. */
  function reinitFeuille(feuille) {
    if (!feuille) return false;
    var etapes = $$('.step', feuille);
    if (!etapes.length || !etapes[1] || etapes[1].hidden) return false;
    etapes.forEach(function (s, i) {
      s.hidden = i !== 0;
      s.classList.toggle('is-active', i === 0);
    });
    var pied = $('.sheet__foot', feuille);
    if (pied) pied.hidden = false;
    $$('input, textarea', feuille).forEach(function (el) { el.value = ''; });
    $$('[data-err-for]', feuille).forEach(function (e) { e.textContent = ''; e.hidden = true; });
    $$('[aria-invalid]', feuille).forEach(function (e) { e.setAttribute('aria-invalid', 'false'); });
    $$('.chip', feuille).forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
    return true;
  }

  /* Bascule la feuille sur son écran de confirmation. */
  function montreFin(feuille) {
    $$('.step', feuille).forEach(function (s, i) {
      s.hidden = i !== 1;
      s.classList.toggle('is-active', i === 1);
    });
    var pied = $('.sheet__foot', feuille);
    if (pied) pied.hidden = true;
    var titre = $('.step--done .display', feuille);
    if (titre) { titre.setAttribute('tabindex', '-1'); titre.focus(); }
  }

  function cadeau() {
    var MONTANTS = [2500, 5000, 10000];
    var choisi = null;
    var envoiEnCours = false;
    var elEnvoi, elErreur, elResume;

    function montantCourant() {
      if (choisi !== null) return choisi;
      var libre = $('#g-libre').value.trim();
      if (libre === '') return null;
      var euros = Number(libre);
      if (!isFinite(euros) || Math.floor(euros) !== euros) return null;
      var cents = euros * 100;
      if (cents < 1000 || cents > 50000) return null;
      return cents;
    }

    function valide() {
      var cents = montantCourant();
      var bon = cents !== null && coordValides('g', false);
      elEnvoi.disabled = envoiEnCours || !bon;
      elResume.textContent = cents === null ? '' : 'Bon de ' + prix(cents);
      return bon;
    }

    function envoie() {
      if (envoiEnCours) return;
      if (!coordValides('g', true)) {
        montreErreur(elErreur, 'Complétez vos coordonnées pour recevoir le bon.');
        return;
      }
      var cents = montantCourant();
      if (cents === null) {
        marqueChamp('g-libre', 'Montant entre 10 et 500 €, par euro entier.');
        montreErreur(elErreur, 'Choisissez un montant.');
        return;
      }

      envoiEnCours = true;
      elEnvoi.disabled = true;
      elEnvoi.textContent = 'Envoi…';
      montreErreur(elErreur, '');

      var coord = litCoord('g');
      API.post('bons', {
        montantCents: cents,
        nom: coord.nom, tel: coord.tel, mail: coord.mail, note: coord.note
      }).then(function (rep) {
        envoiEnCours = false;
        $('#g-ref').textContent = rep.code;
        $('#g-done-text').textContent =
          'Un bon de ' + prix(rep.montantCents) + ', utilisable en une fois.' +
          (rep.emailEnvoye ? ' Il part à l\'instant vers ' + coord.mail + '.' : '') +
          ' Annoncez simplement ce code au comptoir.';
        montreFin($('#sheet-cadeau'));
        say('Bon cadeau émis, code ' + rep.code);
      }, function (e) {
        envoiEnCours = false;
        elEnvoi.textContent = 'Recevoir le bon';
        elEnvoi.disabled = false;
        reposeErreurs('g', e.champs);
        if (e.code === 'montant_invalide') marqueChamp('g-libre', e.message);
        montreErreur(elErreur, e.message);
      });
    }

    return {
      init: function () {
        var feuille = $('#sheet-cadeau');
        if (!feuille) return;

        elEnvoi = $('#g-send');
        elErreur = $('#g-error');
        elResume = $('#g-summary');

        $$('#g-montants .chip').forEach(function (b) {
          b.addEventListener('click', function () {
            var v = parseInt(b.getAttribute('data-montant'), 10);
            /* Un second clic sur le même bouton le désélectionne. */
            choisi = (choisi === v) ? null : v;
            $$('#g-montants .chip').forEach(function (o) {
              o.setAttribute('aria-pressed', String(parseInt(o.getAttribute('data-montant'), 10) === choisi));
            });
            /* Les deux saisies s'excluent : un bouton vide le champ libre. */
            if (choisi !== null) { $('#g-libre').value = ''; marqueChamp('g-libre', ''); }
            montreErreur(elErreur, '');
            valide();
          });
        });

        $('#g-libre').addEventListener('input', function () {
          if (this.value.trim() !== '' && choisi !== null) {
            choisi = null;
            $$('#g-montants .chip').forEach(function (o) { o.setAttribute('aria-pressed', 'false'); });
          }
          marqueChamp('g-libre', '');
          montreErreur(elErreur, '');
          valide();
        });

        COORD.forEach(function (c) {
          var el = $('#g-' + c.suffixe);
          el.addEventListener('input', valide);
          el.addEventListener('blur', function () { coordValides('g', true); });
        });

        elEnvoi.addEventListener('click', envoie);
        valide();
      },
      reinitSiTermine: function () {
        if (!reinitFeuille($('#sheet-cadeau'))) return;
        choisi = null;
        envoiEnCours = false;
        elEnvoi.textContent = 'Recevoir le bon';
        montreErreur(elErreur, '');
        valide();
      }
    };
  }

  function privatisation() {
    var envoiEnCours = false;
    var elEnvoi, elErreur, elResume;

    /* Bornes du sélecteur de date : aujourd'hui, et douze mois plus tard. */
    function borne(decalageMois) {
      var d = new Date();
      d.setMonth(d.getMonth() + decalageMois);
      return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
    }

    function convivesCourant() {
      var v = $('#p-convives').value.trim();
      if (v === '') return null;
      var n = Number(v);
      if (!isFinite(n) || Math.floor(n) !== n || n < 8 || n > 22) return null;
      return n;
    }

    function dateCourante() {
      var v = $('#p-date').value;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
      if (v < borne(0) || v > borne(12)) return null;
      return v;
    }

    function valide() {
      var bon = dateCourante() !== null && convivesCourant() !== null && coordValides('p', false);
      elEnvoi.disabled = envoiEnCours || !bon;
      var n = convivesCourant();
      elResume.textContent = n === null ? '' : n + ' convives';
      return bon;
    }

    function envoie() {
      if (envoiEnCours) return;

      var date = dateCourante();
      if (date === null) {
        marqueChamp('p-date', 'Choisissez une date dans les douze prochains mois.');
        montreErreur(elErreur, 'La date n’est pas valide.');
        return;
      }
      var convives = convivesCourant();
      if (convives === null) {
        marqueChamp('p-convives', 'Entre 8 et 22 convives.');
        montreErreur(elErreur, 'Le nombre de convives n’est pas valide.');
        return;
      }
      if (!coordValides('p', true)) {
        montreErreur(elErreur, 'Complétez vos coordonnées pour que nous puissions vous répondre.');
        return;
      }

      envoiEnCours = true;
      elEnvoi.disabled = true;
      elEnvoi.textContent = 'Envoi…';
      montreErreur(elErreur, '');

      var coord = litCoord('p');
      API.post('privatisations', {
        date: date,
        convives: convives,
        type: $('#p-type').value,
        nom: coord.nom, tel: coord.tel, mail: coord.mail, note: coord.note
      }).then(function (rep) {
        envoiEnCours = false;
        $('#p-ref').textContent = rep.reference;
        $('#p-done-text').textContent =
          /* jourLong attend une Date : l'API renvoie une chaîne ISO. Midi évite
             qu'un décalage de fuseau ne fasse reculer d'un jour. */
          rep.typeLibelle + ' pour ' + rep.convives + ' personnes, le ' +
          jourLong(new Date(rep.date + 'T12:00:00')) + '.' +
          (rep.emailEnvoye ? ' Un accusé de réception part vers ' + coord.mail + '.' : '') +
          ' La salle n’est pas encore bloquée : nous vous recontactons sous quarante-huit heures.';
        montreFin($('#sheet-privatiser'));
        say('Demande de privatisation reçue, référence ' + rep.reference);
      }, function (e) {
        envoiEnCours = false;
        elEnvoi.textContent = 'Envoyer la demande';
        elEnvoi.disabled = false;
        reposeErreurs('p', e.champs);
        if (e.code === 'date_invalide' || e.code === 'hors_horizon') marqueChamp('p-date', e.message);
        if (e.code === 'convives_invalide') marqueChamp('p-convives', e.message);
        montreErreur(elErreur, e.message);
      });
    }

    return {
      init: function () {
        var feuille = $('#sheet-privatiser');
        if (!feuille) return;

        elEnvoi = $('#p-send');
        elErreur = $('#p-error');
        elResume = $('#p-summary');

        var elDate = $('#p-date');
        elDate.min = borne(0);
        elDate.max = borne(12);

        ['p-date', 'p-convives', 'p-type'].forEach(function (id) {
          var el = $('#' + id);
          el.addEventListener('input', function () { marqueChamp(id, ''); montreErreur(elErreur, ''); valide(); });
          el.addEventListener('change', valide);
        });

        COORD.forEach(function (c) {
          var el = $('#p-' + c.suffixe);
          el.addEventListener('input', valide);
          el.addEventListener('blur', function () { coordValides('p', true); });
        });

        elEnvoi.addEventListener('click', envoie);
        valide();
      },
      reinitSiTermine: function () {
        if (!reinitFeuille($('#sheet-privatiser'))) return;
        envoiEnCours = false;
        elEnvoi.textContent = 'Envoyer la demande';
        /* Le sélecteur de type n'est pas un input : reinitFeuille ne le touche pas. */
        $('#p-type').selectedIndex = 0;
        montreErreur(elErreur, '');
        valide();
      }
    };
  }

  var bonCadeau = cadeau();
  var privatiser = privatisation();

  /* ===================================================================
     12. Repli du mouvement piloté par le défilement

     Quand animation-timeline manque, les entrées de section sont rejouées
     par IntersectionObserver. Le CSS ne pose l'état masqué que sous la
     classe js-reveal, ajoutée ici : sans JavaScript, ou sans observateur,
     rien n'est masqué et le contenu s'affiche normalement.
     =================================================================== */
  var CIBLES_ENTREE = [
    '.carte__head .display',
    '.carte__head .lede',
    '.carte__grid > *',
    '.carte__plate',
    '.carte__cta',
    '.infos__text',
    '.infos__media'
  ].join(', ');

  function entrees() {
    /* Le natif s'en charge : ne rien doubler. */
    var natif = window.CSS && CSS.supports && CSS.supports('animation-timeline', 'view()');
    if (natif) return;

    /* Mouvement réduit : le contenu reste en place, sans entrée du tout. */
    if (reduce) return;
    if (!('IntersectionObserver' in window)) return;

    var cibles = $$(CIBLES_ENTREE);
    if (!cibles.length) return;

    document.documentElement.classList.add('js-reveal');

    var io = new IntersectionObserver(function (vues) {
      vues.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-revele');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

    cibles.forEach(function (c) { io.observe(c); });

    /* Un élément déjà à l'écran au chargement ne déclenche pas toujours
       l'observateur avant la première peinture : on le révèle d'office. */
    requestAnimationFrame(function () {
      cibles.forEach(function (c) {
        var r = c.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) {
          c.classList.add('is-revele');
          io.unobserve(c);
        }
      });
    });
  }

  function demarre() {
    gardeMedias();
    preloader();
    entete();
    heroVideo();
    voyage();
    typoCinetique();
    reservation.init();
    panier.init();
    bonCadeau.init();
    privatiser.init();
    feuilles();
    entrees();

    /* Les deux affichages de la carte attendent la même réponse. */
    chargeCarte().then(function () {
      carteEditoriale();
      panier.dessineMenu();
    }, carteIndisponible);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarre);
  else demarre();
})();
