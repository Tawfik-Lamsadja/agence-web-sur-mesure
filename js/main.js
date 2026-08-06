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

  function heure(d) {
    var h = d.getHours(), m = d.getMinutes();
    return h + 'h' + (m < 10 ? '0' + m : m);
  }
  function jourLong(d) { return d.toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' }); }
  function cle(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* Empreinte stable : les mêmes disponibilités reviennent pour une même date. */
  function empreinte(str) {
    var h = 2166136261, i;
    for (i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0);
  }

  function ref(prefixe) {
    var base = (Date.now() % 1679616).toString(36) + Math.floor(Math.random() * 36).toString(36);
    return prefixe + '-' + base.toUpperCase().slice(-5);
  }

  /* ===================================================================
     1. Garde-fous média : un fichier absent disparaît sans laisser de trace
     =================================================================== */
  function gardeMedias() {
    $$('img[data-guard]').forEach(function (img) {
      var perdu = function () { img.classList.add('is-missing'); };
      img.addEventListener('error', perdu);
      if (img.complete && img.naturalWidth === 0) perdu();
    });

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
    var v = $('.hero__media video[data-autoplay]');
    if (!v || reduce) return;
    if (!('IntersectionObserver' in window)) { joue(v); return; }
    new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) { e.isIntersecting ? joue(v) : pause(v); });
    }, { threshold: 0.15 }).observe(v);
  }

  /* ===================================================================
     5. Le voyage du sushi
     =================================================================== */
  function voyage() {
    var sec = $('[data-voyage]');
    if (!sec) return;

    var chaps = $$('.chap', sec);
    var dots  = $$('.voyage__dots button', sec);
    var steps = $$('.voyage__steps > div', sec);
    var actif = 0;
    var visible = false;

    function applique(i) {
      actif = i;
      chaps.forEach(function (c, idx) {
        c.classList.toggle('is-active', idx === i);
        var v = c.querySelector('video');
        if (!v) return;
        (idx === i && visible) ? joue(v) : pause(v);
      });
      dots.forEach(function (d, idx) {
        if (idx === i) d.setAttribute('aria-current', 'true');
        else d.removeAttribute('aria-current');
      });
    }

    dots.forEach(function (d) {
      d.addEventListener('click', function () {
        var i = parseInt(d.getAttribute('data-goto'), 10);
        var cible = steps[i];
        if (!cible) return;
        var r = cible.getBoundingClientRect();
        window.scrollTo({
          top: window.scrollY + r.top + r.height / 2 - window.innerHeight / 2,
          behavior: reduce ? 'auto' : 'smooth'
        });
      });
    });

    if (reduce) {
      /* Les six chapitres sont empilés par la feuille de style : rien à piloter. */
      chaps.forEach(function (c) { c.classList.add('is-active'); });
      return;
    }
    if (!('IntersectionObserver' in window)) { applique(0); return; }

    /* La scène joue seulement quand elle occupe l'écran. */
    new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        visible = e.isIntersecting;
        if (!visible) chaps.forEach(function (c) { pause(c.querySelector('video')); });
        else applique(actif);
      });
    }, { threshold: 0.2 }).observe($('.voyage__stage', sec));

    /* Le chapitre qui croise le milieu de l'écran prend le relais. */
    var io = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (!e.isIntersecting) return;
        var i = parseInt(e.target.getAttribute('data-step'), 10);
        if (i !== actif) applique(i);
      });
    }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
    steps.forEach(function (s) { io.observe(s); });

    applique(0);
  }

  /* ===================================================================
     6. La carte
     =================================================================== */
  var CARTE = [
    {
      id: 'sashimi', nom: 'Sashimi', col: 0,
      note: 'Découpés à la commande, jamais à l\'avance.',
      items: [
        { id: 'sa-sau', nom: 'Saumon, six tranches', desc: 'Élevage des Féroé, taillé au yanagiba.', prix: 1400 },
        { id: 'sa-tho', nom: 'Thon rouge, six tranches', desc: 'Longe du jour, selon arrivage.', prix: 1800 },
        { id: 'sa-dau', nom: 'Daurade, six tranches', desc: 'Maturée vingt-quatre heures, zeste de yuzu.', prix: 1600 },
        { id: 'sa-ass', nom: 'Assortiment du jour, douze tranches', desc: 'Trois poissons, choisis le matin même.', prix: 2800 }
      ]
    },
    {
      id: 'nigiri', nom: 'Nigiri', col: 0,
      note: 'À la pièce. Le riz est assaisonné toutes les deux heures.',
      items: [
        { id: 'ni-sau', nom: 'Saumon', desc: '', prix: 350 },
        { id: 'ni-tho', nom: 'Thon rouge', desc: '', prix: 450 },
        { id: 'ni-dau', nom: 'Daurade', desc: '', prix: 400 },
        { id: 'ni-cre', nom: 'Crevette', desc: '', prix: 350 },
        { id: 'ni-ang', nom: 'Anguille laquée', desc: 'Sauce maison, réduite chaque lundi.', prix: 500 },
        { id: 'ni-tam', nom: 'Omelette tamago', desc: '', prix: 300 }
      ]
    },
    {
      id: 'rouleaux', nom: 'Rouleaux', col: 0,
      note: '',
      items: [
        { id: 'ro-con', nom: 'Maki concombre, six pièces', desc: '', prix: 600 },
        { id: 'ro-sau', nom: 'Maki saumon, six pièces', desc: '', prix: 800 },
        { id: 'ro-cal', nom: 'California crabe avocat, six pièces', desc: 'Crabe entier, jamais de surimi.', prix: 1000 },
        { id: 'ro-fut', nom: 'Futomaki végétal, quatre pièces', desc: 'Shiitaké, épinard, carotte, tamago.', prix: 900 }
      ]
    },
    {
      id: 'chauds', nom: 'Plats chauds', col: 1,
      note: '',
      items: [
        { id: 'ch-gyo', nom: 'Gyoza au porc, cinq pièces', desc: 'Pliés le matin, poêlés à la commande.', prix: 900 },
        { id: 'ch-ram', nom: 'Ramen shoyu', desc: 'Bouillon de douze heures, servi à table uniquement.', prix: 1700, emporter: false },
        { id: 'ch-tat', nom: 'Bœuf tataki', desc: 'Filet saisi trente secondes, ponzu.', prix: 1900 },
        { id: 'ch-aub', nom: 'Aubergine au miso', desc: 'Miso rouge, cuisson au four à bois.', prix: 1100 }
      ]
    },
    {
      id: 'desserts', nom: 'Desserts', col: 1,
      note: '',
      items: [
        { id: 'de-moc', nom: 'Mochi, deux pièces', desc: 'Sésame noir ou matcha.', prix: 600 },
        { id: 'de-cre', nom: 'Crème au thé matcha', desc: '', prix: 700 },
        { id: 'de-yuz', nom: 'Sorbet yuzu', desc: '', prix: 600 }
      ]
    },
    {
      id: 'boissons', nom: 'Boissons', col: 1,
      note: '',
      items: [
        { id: 'bo-sen', nom: 'Thé sencha', desc: 'En théière, réinfusé autant que vous voulez.', prix: 400 },
        { id: 'bo-bie', nom: 'Bière japonaise, 33 cl', desc: '', prix: 500 },
        { id: 'bo-sak', nom: 'Saké junmai, 12 cl', desc: 'Servi frais, préfecture de Niigata.', prix: 900 },
        { id: 'bo-eau', nom: 'Eau plate ou pétillante, 50 cl', desc: '', prix: 350 }
      ]
    }
  ];

  var PAR_ID = {};
  CARTE.forEach(function (c) { c.items.forEach(function (i) { PAR_ID[i.id] = i; }); });

  function carteEditoriale() {
    var hote = $('#carte-liste');
    if (!hote) return;
    [0, 1].forEach(function (col) {
      var colonne = document.createElement('div');
      CARTE.filter(function (c) { return c.col === col; }).forEach(function (c) {
        var bloc = document.createElement('section');
        bloc.className = 'cat';

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
  var FEUILLES = { reserver: '#sheet-reserver', commander: '#sheet-commander' };
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
  var TABLES = [
    { id: 'c1', nom: 'Comptoir, 1 et 2', cap: 2, x: 8,  y: 15, w: 23, h: 15 },
    { id: 'c2', nom: 'Comptoir, 3 à 5',  cap: 3, x: 33, y: 15, w: 27, h: 15 },
    { id: 'c3', nom: 'Comptoir, 6 à 8',  cap: 3, x: 62, y: 15, w: 27, h: 15 },
    { id: 't1', nom: 'Table 1, fenêtre', cap: 4, x: 10, y: 50, w: 24, h: 26 },
    { id: 't2', nom: 'Table 2, salle',   cap: 4, x: 39, y: 55, w: 24, h: 26 },
    { id: 't3', nom: 'Table 3, fond',    cap: 6, x: 68, y: 48, w: 26, h: 32 }
  ];

  var CRENEAUX_MIDI = ['12:00', '12:30', '13:00', '13:30'];
  var CRENEAUX_SOIR = ['18:30', '19:00', '19:30', '20:00', '20:30'];
  var ACOMPTE = 1000; /* 10 € par personne, en centimes */
  var TOTAL_ETAPES = 6;

  var reservation = (function () {
    var etape = 0;
    var etat = { date: null, creneau: null, convives: 2, table: null, nom: '', tel: '', mail: '', note: '' };
    var moisVu = new Date();
    moisVu.setDate(1);

    var elEtapes, elLabel, elEnso, elSuivant, elRetour, elResume, elPied;

    function ferme_jour(d) { var j = d.getDay(); return j === 0 || j === 1; }

    function creneauLibre(d, h) { return empreinte(cle(d) + '|' + h) % 100 >= 22; }

    function tablesDispo() {
      if (!etat.date || !etat.creneau) return [];
      var base = cle(etat.date) + '|' + etat.creneau;
      var libres = TABLES.filter(function (t) {
        return t.cap >= etat.convives && empreinte(base + '|' + t.id) % 100 >= 30;
      });
      /* Le service ne refuse jamais tout le monde : une place reste ouverte. */
      if (!libres.length) {
        var secours = TABLES.filter(function (t) { return t.cap >= etat.convives; });
        if (secours.length) libres = [secours[secours.length - 1]];
      }
      return libres.map(function (t) { return t.id; });
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
    function dessineCreneaux() {
      [['#slots-midi', CRENEAUX_MIDI], ['#slots-soir', CRENEAUX_SOIR]].forEach(function (paire) {
        var hote = $(paire[0]);
        if (!hote) return;
        hote.textContent = '';
        paire[1].forEach(function (h) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'chip';
            b.textContent = h.replace(':', 'h');
          var libre = etat.date ? creneauLibre(etat.date, h) : false;
          b.setAttribute('aria-pressed', etat.creneau === h ? 'true' : 'false');
          if (!libre) {
            b.disabled = true;
            b.setAttribute('aria-label', h.replace(':', 'h') + ', complet');
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
      for (var n = 1; n <= 6; n++) {
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

      if (i === 1) dessineCreneaux();
      if (i === 2) dessineConvives();
      if (i === 3) dessinePlan();
      if (i === 5) dessineRecap();

      valide();
      var corps = $('.sheet__body', $('#sheet-reserver'));
      if (corps) corps.scrollTop = 0;
    }

    function confirme() {
      if (!champsValides(true)) { montre(4); return; }
      var t = TABLES.filter(function (x) { return x.id === etat.table; })[0];
      var reference = ref('OR');
      $('#r-ref').textContent = reference;
      $('#r-done-text').textContent =
        'Nous vous attendons le ' + jourLong(etat.date) + ' à ' + etat.creneau.replace(':', 'h') +
        ', ' + t.nom.toLowerCase() + ', pour ' + etat.convives + (etat.convives > 1 ? ' personnes' : ' personne') +
        '. La confirmation part à l\'instant vers ' + etat.mail + '. Pour annuler, appelez le +32 2 512 04 77 au plus tard vingt-quatre heures avant.';
      montre(TOTAL_ETAPES);
      say('Réservation confirmée, référence ' + reference);
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
          moisVu = new Date(); moisVu.setDate(1);
          dessineCalendrier();
          montre(0);
        }
      }
    };
  })();

  /* ===================================================================
     9. Commande à emporter
     =================================================================== */
  var panier = (function () {
    var lignes = {};
    var elTiroir, elCompte, elEnso, elTotal, elListe, elVide, elValider, elFini;

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
      $('#cart-open').classList.toggle('is-empty', n === 0);
      elEnso.style.setProperty('--enso-progress', Math.min(1, n / 8));
      elTotal.textContent = prix(total());
      elValider.disabled = n === 0;
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

    function ouvertureService(d) {
      var j = d.getDay();
      if (j === 0 || j === 1) return false;
      var m = d.getHours() * 60 + d.getMinutes();
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
      var auj = new Date();
      heuresRetrait().forEach(function (d) {
        var o = document.createElement('option');
        var memeJour = d.toDateString() === auj.toDateString();
        o.value = d.toISOString();
        o.textContent = (memeJour ? 'Aujourd\'hui' : cap(d.toLocaleDateString('fr-BE', { weekday: 'long' }))) + ', ' + heure(d);
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

    function valide() {
      var sel = $('#pickup-time');
      var quand = sel && sel.selectedOptions.length ? sel.selectedOptions[0].textContent : 'à la réouverture';
      var reference = ref('EM');
      $('#o-ref').textContent = reference;
      $('#o-done-text').textContent =
        nb() + ' article' + (nb() > 1 ? 's' : '') + ', ' + prix(total()) +
        '. Retrait ' + quand.toLowerCase() + ', rue de Flandre 68. Présentez ce numéro au comptoir, le paiement se fait sur place.';
      elFini.hidden = false;
      say('Commande enregistrée, numéro ' + reference);
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

      dessineMenu();
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
      fermeTiroir: fermeTiroir,
      tiroirOuvert: function () { return !!elTiroir && elTiroir.classList.contains('is-open'); }
    };
  })();

  /* ===================================================================
     10. Démarrage
     =================================================================== */
  function demarre() {
    gardeMedias();
    preloader();
    entete();
    heroVideo();
    voyage();
    carteEditoriale();
    reservation.init();
    panier.init();
    feuilles();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarre);
  else demarre();
})();
