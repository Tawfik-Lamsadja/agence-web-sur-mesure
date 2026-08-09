# Ô'resto · assets à produire

Tous les fichiers vont dans `assets/`, à la racine du dépôt, avec **exactement**
ces noms. Les chemins sont déjà écrits dans `index.html`. Tant qu'un fichier est
absent, l'emplacement affiche un aplat prune sobre : pas d'icône cassée, pas de
texte de remplacement.

Direction artistique commune à tous les visuels : cinématographique, lumière
rasante et basse, dominante prune sombre avec un unique accent vermillon,
aucun visage net, aucun logo ni texte incrusté.

## Le voyage du sushi : cinq clips enchaînés

Ces cinq clips sont tournés **en continuité** : chacun reprend la dernière
image du précédent, ce qui en fait un plan unique de 52,5 secondes. Ils sont
fournis, pas générés depuis ce dépôt. Le site n'en lit jamais la vidéo : il
lit les séquences d'images extraites ci-dessous.

| Fichier | Type | Format | Emplacement |
|---|---|---|---|
| `voyage-00a-poisson.mp4` | vidéo, 2,4 s | 1280×720, 16/9 | Source du mouvement 01 |
| `voyage-00b-ouverture.mp4` | vidéo, 10 s | 1280×720, 16/9 | Source du mouvement 02 |
| `voyage-00c-prelevement.mp4` | vidéo, 10 s | 1280×720, 16/9 | Source du mouvement 03 |
| `voyage-00d-assemblage.mp4` | vidéo, 15 s | 1280×720, 16/9 | Source du mouvement 04 |
| `voyage-00e-final.mp4` | vidéo, 15 s | 1280×720, 16/9 | Source du mouvement 05 |
| `voyage-00a-poisson.jpg` | image | 1280×720, 16/9 | Affiche de la scène, visible avant chargement |
| `voyage-final-fixe.jpg` | image | 1152×648, 16/9 | Dernière image du parcours, état en mouvement réduit |
| `seq/00a/f001..f060.webp` | séquence | 1152 px, WebP | Mouvement 01, scruté au défilement |
| `seq/00b/f001..f090.webp` | séquence | 1152 px, WebP | Mouvement 02 |
| `seq/00c/f001..f090.webp` | séquence | 1152 px, WebP | Mouvement 03 |
| `seq/00d/f001..f090.webp` | séquence | 1152 px, WebP | Mouvement 04 |
| `seq/00e/f001..f090.webp` | séquence | 1152 px, WebP | Mouvement 05 |

### Régénérer les séquences

Le nombre d'images par clip est choisi entre 60 et 90 : `fps` vaut donc
`images ÷ durée`. Toute modification du nombre d'images doit être reportée
dans la constante `PELLICULE` de `js/main.js`.

```
ffmpeg -y -i assets/voyage-00d-assemblage.mp4 \
       -vf "fps=5.984,scale=1152:-2" -frames:v 90 \
       -c:v libwebp -preset photo -q:v 44 -compression_level 6 \
       assets/seq/00d/f%03d.webp
```

L'image fixe du mouvement réduit est la dernière image du dernier mouvement :

```
ffmpeg -y -i assets/seq/00e/f090.webp -q:v 3 assets/voyage-final-fixe.jpg
```

---

## Les autres visuels

| Fichier | Type | Format | Emplacement |
|---|---|---|---|
| `hero.mp4` | vidéo, 8 à 12 s en boucle | 1920×1080, 16/9 | Fond du hero |
| `hero-poster.jpg` | image | 1920×1080, 16/9 | Affiche du hero, visible avant lecture |
| `maison-salle.jpg` | image | 1200×1600, 3/4 | Section « La maison » |
| `voyage-01-preparation.mp4` | vidéo, 5 à 8 s en boucle | 1920×1080, 16/9 | Voyage, chapitre 01 |
| `voyage-01-preparation.jpg` | image | 1920×1080, 16/9 | Affiche du chapitre 01, et image fixe en mouvement réduit |
| `voyage-02-dressage.jpg` | image | 1920×1080, 16/9 | Voyage, chapitre 02 |
| `voyage-03-service.mp4` | vidéo, 5 à 8 s en boucle | 1920×1080, 16/9 | Voyage, chapitre 03 |
| `voyage-03-service.jpg` | image | 1920×1080, 16/9 | Affiche du chapitre 03, et image fixe en mouvement réduit |
| `voyage-04-depot.jpg` | image | 1920×1080, 16/9 | Voyage, chapitre 04 |
| `voyage-05-prelevement.mp4` | vidéo, 5 à 8 s en boucle | 1920×1080, 16/9 | Voyage, chapitre 05 |
| `voyage-05-prelevement.jpg` | image | 1920×1080, 16/9 | Affiche du chapitre 05, et image fixe en mouvement réduit |
| `voyage-06-degustation.jpg` | image | 1920×1080, 16/9 | Voyage, chapitre 06 |
| `carte-assortiment.jpg` | image | 1920×1080, 16/9 | Section « La carte », grande photo |
| `comptoir.jpg` | image | 2100×900, 21/9 | Section citation, pleine largeur |
| `infos-facade.jpg` | image | 1200×1600, 3/4 | Section « Nous trouver » |
| `og-image.jpg` | image | 1200×630 | Aperçu au partage sur les réseaux |

Vidéos : H.264/MP4, sans piste audio, bitrate raisonnable (moins de 4 Mo par
fichier). Elles sont lues muettes, en boucle, et seulement quand elles sont à
l'écran. Les cinq `.jpg` du voyage qui accompagnent une vidéo servent d'affiche
et remplacent totalement la vidéo si l'utilisateur a activé la réduction des
animations.

Séquences d'images (`assets/seq/`) : extraites des vidéos du voyage, 72 frames
WebP par segment, dessinées sur canvas et pilotées par la position de
défilement. Régénération depuis une vidéo source :

```
ffmpeg -i assets/voyage-XX.mp4 -vf "fps=72/DUREE,scale=1280:-2" -frames:v 72 \
       -c:v libwebp -q:v 62 -compression_level 6 assets/seq/XX/f%03d.webp
```

Les deux assets du chapitre 01 et 02 (`voyage-0a-nage`, `voyage-0b-capture`)
ont été générés avec Seedance 2.0 (Higgsfield), 720p, 5 s, prompts ci-dessous.

---

## Prompts de génération, prêts à copier-coller

### Hero

**Fichier :** `hero.mp4`
**Type :** vidéo, 8 à 12 s, boucle sans coupure visible
**Prompt :** "Cinematic slow push-in on an intimate Japanese sushi counter at night, eight empty hinoki wood seats, single low warm lamp above a dark lacquered bar, deep plum and aubergine shadows filling the room, one small vermillion accent glowing from a paper lantern far in the background, thin smoke or steam drifting slowly through the light beam, shallow depth of field, anamorphic lens, 35mm film grain, no people visible, no faces, no text, no logo, muted desaturated palette of dark violet and bone white, seamless loop, locked tripod with almost imperceptible drift"

**Fichier :** `hero-poster.jpg`
**Type :** image
**Prompt :** "Cinematic still of an intimate Japanese sushi counter at night, eight empty hinoki wood seats, one low warm lamp above a dark lacquered bar, deep plum and aubergine shadows, a single vermillion glow from a distant paper lantern, thin drifting steam catching the light, shallow depth of field, anamorphic lens, 35mm film grain, no people, no faces, no text, no logo, muted palette of dark violet, near black and bone white, editorial restaurant photography"

### Le voyage du sushi

**Fichier :** `voyage-0a-nage.mp4`
**Type :** vidéo, 5 s, boucle
**Prompt :** "Cinematic underwater shot of a single silver-scaled fish swimming slowly through deep dark water, near-black aubergine and dark plum toned water with absolutely no blue tint, faint shafts of pale warm light falling from above, tiny particles drifting in the beam, the fish's flank catching one soft bone-white highlight and a faint warm vermillion glint, slow steady gliding motion from right to left, shallow depth of field, 35mm film grain, no people, no faces, no text, no logo, muted palette of dark violet, near black and bone white, seamless loop"

**Fichier :** `voyage-0b-capture.mp4`
**Type :** vidéo, 5 s, boucle
**Prompt :** "Close-up of a weathered fisherman's hands hauling a wet rope net up from dark water at night, water droplets and fine spray catching a single low warm lamp, one silver fish gleaming caught in the mesh, deep plum and near-black shadows swallowing the frame, one small vermillion boat lamp glowing far in the background, cinematic slow motion, shallow depth of field, 35mm film grain, hands and forearms only, no face visible, no text, no logo, muted palette of dark violet, near black and bone white, seamless loop"

**Fichier :** `voyage-01-preparation.mp4`
**Type :** vidéo, 5 à 8 s, boucle
**Prompt :** "Extreme close-up of a sushi chef's hands slicing a loin of fish with a long yanagiba knife on a pale wooden board, single precise downward stroke, macro detail on the blade edge and the glistening cut surface, dramatic low side lighting, deep plum and near-black background falling into darkness, one warm vermillion rim light on the knuckles, shallow depth of field, cinematic slow motion, 35mm film grain, hands only, no face visible, no text, no logo, dark violet and bone color palette, seamless loop"

**Fichier :** `voyage-01-preparation.jpg`
**Type :** image
**Prompt :** "Extreme close-up still of a sushi chef's hands slicing fish with a long yanagiba knife on a pale wooden board, macro detail on the blade and the glistening cut, dramatic low side lighting, deep plum and near-black background, a single warm vermillion rim light on the knuckles, shallow depth of field, cinematic, 35mm film grain, hands only, no face, no text, no logo, dark violet and bone palette"

**Fichier :** `voyage-02-dressage.jpg`
**Type :** image
**Prompt :** "Single piece of nigiri sushi placed alone at the centre of a black lacquer tray, viewed at a low three-quarter angle, the empty lacquer surface reflecting one soft warm highlight, a faint circular brushstroke of ink barely visible in the lacquer glaze echoing an ensō, deep plum shadows swallowing the edges of the frame, dramatic single-source lighting from the upper left, macro detail on the rice grains and the sheen of the fish, cinematic, 35mm film grain, extreme negative space, no hands, no people, no text, no logo, dark violet, vermillion and bone palette"

**Fichier :** `voyage-03-service.mp4`
**Type :** vidéo, 5 à 8 s, boucle
**Prompt :** "Tracking shot following a waiter's hands carrying a black lacquer tray with a single sushi piece through a dark restaurant dining room, camera moving smoothly alongside at tray height, background of deep plum walls and out-of-focus warm lamps sliding past as soft bokeh, the tray held perfectly level, torso and hands only in frame, no face visible, dramatic low ambient light, one vermillion lamp flaring briefly in the background, cinematic steadicam, shallow depth of field, 35mm film grain, no text, no logo, dark violet and bone palette, seamless loop"

**Fichier :** `voyage-03-service.jpg`
**Type :** image
**Prompt :** "Still of a waiter's hands carrying a black lacquer tray with a single sushi piece through a dark restaurant dining room, tray held perfectly level, deep plum walls and out-of-focus warm lamps as soft bokeh behind, torso and hands only, no face visible, dramatic low ambient light with one vermillion flare in the background, cinematic, shallow depth of field, 35mm film grain, no text, no logo, dark violet and bone palette"

**Fichier :** `voyage-04-depot.jpg`
**Type :** image
**Prompt :** "Black lacquer tray with a single sushi piece being set down on a low burnt-oak table, shot from a seated diner's eye level, the server's hand just releasing the tray at the edge of frame, deep plum darkness beyond the table, one warm overhead pool of light isolating the tray, charred wood grain visible in the foreground, cinematic, shallow depth of field, 35mm film grain, no faces, no text, no logo, dark violet, vermillion and bone palette, generous negative space"

**Fichier :** `voyage-05-prelevement.mp4`
**Type :** vidéo, 5 à 8 s, boucle
**Prompt :** "Extreme close-up of wooden chopsticks sliding underneath a single piece of nigiri sushi and lifting it cleanly off a black lacquer tray, the rice staying perfectly intact, macro detail on the grains and the glossy fish, dramatic low key lighting from one side, deep plum and near-black background, a faint vermillion reflection on the lacquer, cinematic slow motion, shallow depth of field, 35mm film grain, hands partially visible, no face, no text, no logo, dark violet and bone palette, seamless loop"

**Fichier :** `voyage-05-prelevement.jpg`
**Type :** image
**Prompt :** "Extreme close-up still of wooden chopsticks sliding underneath a single piece of nigiri sushi and lifting it off a black lacquer tray, rice perfectly intact, macro detail on the grains and glossy fish, dramatic low key side lighting, deep plum and near-black background, faint vermillion reflection on the lacquer, cinematic, shallow depth of field, 35mm film grain, hands partially visible, no face, no text, no logo, dark violet and bone palette"

**Fichier :** `voyage-06-degustation.jpg`
**Type :** image
**Prompt :** "Discreet close-up of a single piece of nigiri sushi held in chopsticks and raised toward a mouth, framed tightly on the chopsticks and the sushi with the lower face deliberately out of frame and lost in shadow, no recognisable features, dramatic single warm light source from the side, deep plum darkness filling most of the composition, cinematic, very shallow depth of field, 35mm film grain, intimate and restrained, no text, no logo, dark violet, vermillion and bone palette"

### La carte, le comptoir, l'adresse

**Fichier :** `carte-assortiment.jpg`
**Type :** image
**Prompt :** "Overhead cinematic still of an assortment of sashimi slices arranged in a loose curve on a dark slate board, the arrangement subtly tracing an open circular brushstroke like an ensō, glistening fish in muted coral and pale tones, deep plum background with heavy falloff into black, one warm directional light raking across the surface, macro texture on the slate and the fish, generous negative space around the composition, editorial food photography, 35mm film grain, no hands, no people, no text, no logo, dark violet, vermillion and bone palette"

**Fichier :** `comptoir.jpg`
**Type :** image
**Prompt :** "Wide cinematic shot of a sushi chef working behind a dark counter, seen from the side and slightly below, hands and forearms in sharp focus mid-gesture, head and face cropped out of frame by the top edge, deep plum walls and hanging warm lamps behind, one vermillion accent glowing at the far end of the counter, heavy shadow occupying the left third of the frame for text overlay, anamorphic ultra wide 21:9 composition, shallow depth of field, 35mm film grain, no visible face, no text, no logo, dark violet and bone palette"

**Fichier :** `infos-facade.jpg`
**Type :** image
**Prompt :** "Narrow Brussels townhouse restaurant façade at night in vertical 3:4 framing, dark plum painted wood storefront, warm light spilling from a single window onto wet cobblestones, one small vermillion paper lantern glowing beside the door, rain-slicked street reflecting the light, no readable signage, no text, no logo, no people, cinematic street photography, shallow depth of field, 35mm film grain, deep violet night palette with bone white highlights"

**Fichier :** `og-image.jpg`
**Type :** image, 1200×630
**Prompt :** "Cinematic wide still of a single piece of nigiri sushi on a black lacquer tray, positioned in the right third of the frame, the left two thirds falling into deep plum darkness with a faint circular ink brushstroke echoing an ensō barely visible in the shadow, one warm directional light on the sushi, one small vermillion accent, extreme negative space, editorial food photography, 35mm film grain, no hands, no people, no text, no logo, dark violet, vermillion and bone palette"
