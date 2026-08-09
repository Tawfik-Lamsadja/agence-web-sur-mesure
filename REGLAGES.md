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
| `ecransDeCourse` | `8` | **Réglage maître de la vitesse.** Course du film en hauteurs d'écran. À 8 écrans pour 420 images, un écran de défilement avance d'environ 52 images. Plus grand = film plus lent sous le doigt, mais section plus longue à traverser. |
| `ecransDeSeuil` | `1` | Course du seuil, en écrans : le temps que le Ô se dévide et sorte du cadre. La piste mesure `ecransDeSeuil + ecransDeCourse`, soit 9 écrans. |
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

## 2. Le seuil, et le Ô qui se dévide

Le premier écran du site. Ce n'est plus une section à part : il vit **dans la
scène pinnée du voyage**, au-dessus du film, et se retire sous le défilement
pour le découvrir. Le film attend sur sa première image pendant ce temps :
c'est ce qui fait qu'il n'y a ni blanc ni saut au moment du relais.

Le Ô n'est pas une lettre de la police mais un anneau tracé en SVG, qui
reprend l'ensō de la maison. Il se dévide depuis son point de trois heures,
exactement là où naît le fil : l'encre du cercle devient celle du trait, qui
file vers la droite et sort du cadre.

Découpage dans `CINE.seuilPhases` (`js/main.js`), en fractions de la course du
seuil. Les chevauchements sont voulus : c'est ce qui enchaîne les gestes au
lieu de les faire se succéder par à-coups.

| Phase | Bornes | Ce qui bouge |
|---|---|---|
| `fuite` | `0 → 0.28` | Accroche, ligne, chapô et boutons s'effacent et montent de 14 px. |
| `deroule` | `0 → 0.55` | L'anneau se dévide, le fil se déploie sur 130 vw. |
| `sortie` | `0.45 → 0.92` | Le mot entier file vers la droite sur 118 vw. |
| `voile` | `0.5 → 1` | Le fond du seuil s'efface, le film et les légendes apparaissent. |

Durée totale : `CINE.ecransDeSeuil` (1 écran). Pour que le Ô parte plus vite,
baisser cette valeur ; pour étirer le geste, la monter.

Le tracé lui-même est dans `index.html` (`svg.seuil__o-svg`, viewBox
`16 0 98 132`, anneau `r=42` centré en `65,80`). Le périmètre du dévidage est
mesuré au chargement par `getTotalLength()` plutôt que calculé, pour que
l'encre s'épuise exactement à la fin. Le fil est ancré à `left: 92.5%` de la
boîte du Ô, soit son point de trois heures : **si le viewBox change, cet
ancrage doit changer avec.**

Le mot du bandeau de navigation ne s'affiche qu'une fois le bandeau accroché,
pour ne pas faire doublon avec le grand mot du seuil.

En `prefers-reduced-motion`, le seuil devient un premier écran ordinaire :
anneau entier, pas de fil, aucune fuite, et la piste retombe à un écran.

## 2 bis. Le chef et les photos de catégorie

Le film s'achève, le chef accueille, la carte suit. Ordre des sections :
**voyage, chef, carte, maison, comptoir, infos.**

Les six photos de catégorie sont associées dans la table `PHOTOS_CAT` de
`js/main.js`. Elle est explicite plutôt que déduite de l'identifiant : la
carte vit en base et peut gagner une catégorie sans que le dépôt ait la photo
correspondante. Dans ce cas la valeur manque, aucune image n'est posée, et
rien ne casse. Une image présente mais illisible est masquée par le même
garde-fou que le reste du site (`gardeImage`), l'aplat prune restant en place.

| Réglage | Où | Valeur | Pourquoi |
|---|---|---|---|
| Cadrage carte éditoriale | `.cat__photo` | `aspect-ratio: 3 / 2` | Les fichiers sont carrés, mais six carrés pleine colonne étirent la section sans fin et prennent le pas sur les listes, qui restent le sujet. |
| Hauteur du bandeau de commande | `.order__cat-photo` | `clamp(120px, 17vh, 180px)` | On vient ici pour commander : la liste des plats doit tenir sous le nom de la catégorie. À 21/9 pleine largeur, elle passait sous la ligne de flottaison. |
| Zoom au survol | `.cat__photo:hover` | `scale(1.04)` | Réservé aux périphériques à survol. |

## 3. Typographie cinétique

Elle porte désormais sur la **ligne d'accroche du seuil**
(« Vingt-deux couverts, un comptoir, une pièce à la fois. ») et non sur le mot
lui-même : le Ô est un tracé qui se dévide, on ne le découpe pas en lettres.
Les lettres sont regroupées par mot (`.kin-mot`), sans quoi le navigateur
coupe volontiers au milieu d'un mot.

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
