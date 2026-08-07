# Ô'resto · réglages du chantier « mouvement »

Quatre volets livrés en quatre commits : séquence scroll-pilotée, pièce 3D,
typographie cinétique, micro-delight. Ce fichier recense tout ce qui se règle
sans toucher à la mécanique — les valeurs actuelles sont une première
proposition, à ajuster après un premier retour visuel.

## 1. Le voyage du sushi (séquences sur canvas)

Constante `CINE` en tête de la section 5 de `js/main.js` :

| Réglage | Valeur | Effet |
|---|---|---|
| `ecransParChapAnime` | `2.2` | Hauteur de défilement d'un chapitre animé, en écrans. Plus grand = la séquence se déroule plus lentement sous le doigt. |
| `ecransParChapFixe` | `1.2` | Hauteur d'un chapitre fixe (le temps d'un fondu et d'une lecture). |
| `lissage` | `0.22` | Amortissement exponentiel de la frame affichée. Plus bas = plus feutré mais plus « en retard » sur le scroll ; plus haut = plus réactif mais plus sec. |
| `margePrechargement` | `150% 0px` | Distance à laquelle les séquences commencent à se charger. |
| `pasGrossier` | `6` | Passe grossière : une frame sur 6 chargée d'abord. |
| `parallelisme` | `6` | Chargements d'images simultanés. |
| `dprMax` | `1.5` | Plafond de netteté du canvas. |

La progression de frame est **linéaire** sur la hauteur du step (pas de courbe
d'easing sur la timeline elle-même) : c'est le choix d'Apple, le lissage
exponentiel fait le reste. Si le rendu semble trop mécanique, le premier levier
est `lissage`, le second `ecransParChapAnime`.

Le fondu entre chapitres reste piloté par `--t-slow` (900 ms) et `--e-soft`
dans `css/style.css`.

Séquences : 5 segments × 72 frames WebP 1280 px (~16 Ko pièce, ~5,3 Mo au
total, chargés uniquement à l'approche de la section). Commande de
régénération dans `ASSETS.md`.

## 2. Pièce 3D du hero

Constante `REGLAGES` en tête de `js/piece3d.js` :

| Réglage | Valeur | Effet |
|---|---|---|
| `vitesseRotation` | `0.14` rad/s | Un tour complet en ~45 s. |
| `amplitudeFlottement` | `0.05` | Hauteur du flottement vertical. |
| `periodeFlottement` | `7` s | Durée d'une respiration. |
| `inclinaison` | `0.1` rad | Bascule du plateau vers la caméra. |
| `dprMax` | `1.5` | Plafond de netteté. |

Position et taille du bloc : règle `.hero__piece` dans `css/style.css`
(`right`, `top: 20svh`, `width: min(26vw, 360px)`). Masqué sous 1180 px et en
mouvement réduit. Couleurs des matériaux et lumières : constante `C` du module,
reprise de la palette CSS.

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
