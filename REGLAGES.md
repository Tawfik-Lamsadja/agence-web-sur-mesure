# Ô'resto · réglages du chantier « mouvement »

Quatre volets livrés en quatre commits : séquence scroll-pilotée, pièce 3D,
typographie cinétique, micro-delight. Ce fichier recense tout ce qui se règle
sans toucher à la mécanique — les valeurs actuelles sont une première
proposition, à ajuster après un premier retour visuel.

## 1. Le voyage du sushi (film continu, défilement pinné)

Cinq clips tournés en continuité (chacun reprend la dernière image du
précédent) forment **un seul plan de 420 images**. Le code les traite comme
une pellicule unique : un canvas, un index global, aucun chapitre à faire
alterner. La scène est collée en haut de l'écran, plein cadre, pendant toute
la course : le visiteur reste au même endroit, c'est le film qui avance.

Constante `CINE` en tête de la section 5 de `js/main.js` :

| Réglage | Valeur | Effet |
|---|---|---|
| `ecransDeCourse` | `8` | **Réglage maître de la vitesse.** Course totale du parcours en hauteurs d'écran. À 8 écrans pour 420 images, un écran de défilement avance d'environ 52 images. Plus grand = film plus lent sous le doigt, mais section plus longue à traverser. |
| `lissage` | `0.2` | Amortissement exponentiel de l'image affichée. Plus bas = plus feutré mais plus « en retard » sur le scroll ; plus haut = plus réactif mais plus sec. |
| `margePrechargement` | `150% 0px` | Distance à laquelle la pellicule commence à se charger. |
| `pasGrossier` | `6` | Passe grossière : une image sur 6 chargée d'abord, sur toute la longueur du film, pour que le défilement réponde aussitôt. |
| `parallelisme` | `6` | Chargements simultanés. |
| `dprMax` | `1.5` | Plafond de netteté du canvas. |

La progression est **linéaire** sur la course de la piste : pas de courbe
d'easing sur la timeline elle-même, le lissage exponentiel fait le reste. Si
le rendu semble trop mécanique, le premier levier est `lissage`, le second
`ecransDeCourse`.

Le découpage des mouvements vit dans la constante `PELLICULE` du même
fichier : un objet par clip, avec son identifiant de dossier et son nombre
d'images. **Si le nombre d'images extraites change, cette table doit changer
avec.**

| Mouvement | Dossier | Images | Clip source | Durée |
|---|---|---|---|---|
| 01 · Le poisson | `assets/seq/00a/` | 60 | `voyage-00a-poisson.mp4` | 2,4 s |
| 02 · L'ouverture | `assets/seq/00b/` | 90 | `voyage-00b-ouverture.mp4` | 10,0 s |
| 03 · Le prélèvement | `assets/seq/00c/` | 90 | `voyage-00c-prelevement.mp4` | 10,0 s |
| 04 · L'assemblage | `assets/seq/00d/` | 90 | `voyage-00d-assemblage.mp4` | 15,0 s |
| 05 · La prise | `assets/seq/00e/` | 90 | `voyage-00e-final.mp4` | 15,0 s |

Poids : **8,5 Mo pour 420 images** (1152 px de large, WebP qualité 44,
préréglage photo). La passe grossière rend la section utilisable à partir de
~1,4 Mo. L'encodage à 1280 px / qualité 62 (réglage du système précédent)
donnait 13,3 Mo pour un gain visuel nul sur ces images : commande exacte dans
`ASSETS.md`.

Le fondu entre légendes est piloté par `--t-slow` (900 ms) et `--e-soft` dans
`css/style.css`.

Deux replis, tous deux vérifiés au navigateur :

- **`prefers-reduced-motion`** : la piste sort du document, remplacée par la
  dernière image du parcours (`assets/voyage-final-fixe.jpg`) et les cinq
  mouvements racontés en clair. Aucun canvas, aucun observateur, aucun
  chargement de séquence.
- **Sans canvas ni IntersectionObserver** : la classe `sans-film` ramène la
  piste à un écran et la scène se fige sur son affiche.

## 2. Le hero

Aucun réglage : le hero est revenu à son état d'origine, `hero.mp4` en fond
avec `hero-poster.jpg` comme affiche, et le mouvement de travelling
(`kenburns`, 26 s) dans `css/style.css`.

La pièce 3D qui y vivait a été retirée : rendu jugé en deçà du reste du site.
Ont disparu avec elle `js/piece3d.js`, la bibliothèque Three.js vendorisée
(`js/vendor/`, son unique consommateur) et les règles `.hero__piece`.

## 3. Typographie cinétique

Constante `KIN` dans `js/main.js` (section 5 ter) :

| Réglage | Valeur | Effet |
|---|---|---|
| `rayon` | `110` px | Portée de l'influence du curseur (falloff gaussien). |
| `levee` | `8` px | Montée maximale d'une lettre. |
| `etirement` | `0.07` | Allongement vertical maximal (7 %). |
| `lissage` | `0.16` | Vitesse de retour au repos. |

L'origine de transformation (`transform-origin: 50% 92%`) est dans la règle
`.kin` de `css/style.css`.

## 4. Micro-delight

Section 17 de `css/style.css`, tout y est :

- courbe ressort commune `--e-spring: cubic-bezier(0.34, 1.56, 0.64, 1)` ;
- durées des poses : `se-pose` 260 ms (chips, calendrier) / 300 ms (tables) ;
- onde d'ajout au panier : `onde` 500 ms ; compteur : `marque` 320 ms ;
- ombres des boutons et du plan de salle dans les mêmes règles.

Les deux classes pilotées par `js/main.js` : `.is-added` (bouton d'ajout) et
`.is-pop` (compteur du panier).

## Garde-fous transversaux

- `prefers-reduced-motion` : chapitres empilés sur images fixes, pas de
  canvas, pas de 3D, pas de typo cinétique, durées à 1 ms partout.
- Tactile : typographie cinétique coupée (`pointer: fine` exigé), survols
  réservés aux périphériques à survol (`hover: hover`).
- Vieux navigateur : le voyage retombe sur l'ancien système vidéo, le hero
  reste sans 3D (module ES ignoré), rien ne casse.
- Un asset absent disparaît sans laisser de trace (garde-fous média
  existants) ; une frame de séquence manquante est remplacée par la plus
  proche chargée.
