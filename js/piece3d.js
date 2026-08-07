/* =========================================================================
   Ô'resto · pièce signature en trois dimensions

   Un seul objet stylisé : le nigiri sur son plateau de laque, en rotation
   lente dans le hero. Purement décoratif et purement additif — le module
   s'interrompt sans bruit si WebGL manque, si le mouvement est réduit ou si
   l'écran est étroit, et le hero reste alors exactement ce qu'il était.

   Réglages à ajuster après premier retour visuel : tout est dans REGLAGES.
   ========================================================================= */

const REGLAGES = {
  /* Rotation continue du plateau, en radians par seconde. */
  vitesseRotation: 0.14,
  /* Flottement vertical : amplitude (unités scène) et période (secondes). */
  amplitudeFlottement: 0.05,
  periodeFlottement: 7,
  /* Inclinaison de départ du plateau, pour montrer le dessus de la pièce. */
  inclinaison: 0.1,
  /* Netteté : plafond de devicePixelRatio. */
  dprMax: 1.5
};

/* Palette du site, reprise de css/style.css. */
const C = {
  bone: 0xf2ede6,
  shu: 0xc0492b,
  shuHi: 0xd2593a,
  mauve: 0xa98cb8,
  laque: 0x17101f
};

const hote = document.querySelector('[data-piece3d]');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (hote && !reduce && supporteWebgl()) {
  import('./vendor/three.module.min.js')
    .then((THREE) => monte(THREE))
    .catch(() => { /* module absent : le hero reste inchangé */ });
}

function supporteWebgl() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext &&
      (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) {
    return false;
  }
}

function monte(THREE) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  } catch (e) {
    return; /* contexte refusé : abandon silencieux */
  }

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, REGLAGES.dprMax));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 30);
  camera.position.set(0, 1.7, 5.4);
  camera.lookAt(0, 0.1, 0);

  /* ----- l'objet : plateau de laque, riz, tranche ----- */
  const groupe = new THREE.Group();
  groupe.rotation.x = REGLAGES.inclinaison;
  scene.add(groupe);

  const plateau = new THREE.Mesh(
    new THREE.CylinderGeometry(2.3, 2.36, 0.14, 64),
    new THREE.MeshStandardMaterial({ color: C.laque, roughness: 0.28, metalness: 0.35 })
  );
  plateau.position.y = -0.42;
  groupe.add(plateau);

  /* Le riz : une sphère aplatie dont la base s'enfonce dans le plateau,
     pour dessiner le dôme d'un nigiri sans géométrie coûteuse. */
  const riz = new THREE.Mesh(
    new THREE.SphereGeometry(1, 48, 32),
    new THREE.MeshStandardMaterial({ color: C.bone, roughness: 0.95 })
  );
  riz.scale.set(1.42, 0.6, 0.8);
  riz.position.y = -0.05;
  groupe.add(riz);

  /* La tranche : une lamelle vermillon légèrement plus large, drapée dessus. */
  const tranche = new THREE.Mesh(
    new THREE.SphereGeometry(1, 48, 32),
    new THREE.MeshStandardMaterial({ color: C.shu, roughness: 0.5 })
  );
  tranche.scale.set(1.62, 0.2, 0.92);
  tranche.position.y = 0.42;
  tranche.rotation.z = -0.05;
  groupe.add(tranche);

  /* ----- lumière : clé chaude, ambiance mauve, liseré vermillon ----- */
  scene.add(new THREE.AmbientLight(C.mauve, 0.5));

  const cle = new THREE.DirectionalLight(0xfff3e4, 2.4);
  cle.position.set(-3, 4, 3);
  scene.add(cle);

  const lisere = new THREE.PointLight(C.shuHi, 6, 12);
  lisere.position.set(3.4, 0.6, -2.6);
  scene.add(lisere);

  hote.appendChild(renderer.domElement);

  /* ----- taille ----- */
  function taille() {
    const w = hote.clientWidth || 1;
    const h = hote.clientHeight || 1;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  taille();
  window.addEventListener('resize', taille);

  /* ----- boucle, seulement quand le hero est visible ----- */
  let visible = false;
  let enBoucle = false;
  let precedent = 0;

  function boucle(t) {
    if (!visible) { enBoucle = false; return; }
    const dt = precedent ? Math.min((t - precedent) / 1000, 0.1) : 0;
    precedent = t;

    groupe.rotation.y += REGLAGES.vitesseRotation * dt;
    groupe.position.y = Math.sin(t / 1000 * (Math.PI * 2) / REGLAGES.periodeFlottement) *
      REGLAGES.amplitudeFlottement;

    renderer.render(scene, camera);
    requestAnimationFrame(boucle);
  }

  new IntersectionObserver((entrees) => {
    entrees.forEach((e) => {
      visible = e.isIntersecting && !document.hidden;
      if (visible && !enBoucle) {
        enBoucle = true;
        precedent = 0;
        requestAnimationFrame(boucle);
      }
    });
  }, { threshold: 0 }).observe(hote);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { visible = false; return; }
    const r = hote.getBoundingClientRect();
    visible = r.bottom > 0 && r.top < window.innerHeight;
    if (visible && !enBoucle) {
      enBoucle = true;
      precedent = 0;
      requestAnimationFrame(boucle);
    }
  });

  hote.classList.add('is-live');
}
