# Ô'resto · assets à produire

Tous les fichiers vont dans `assets/`, à la racine du dépôt, avec **exactement**
ces noms. Les chemins sont déjà écrits dans `index.html`. Tant qu'un fichier est
absent, l'emplacement affiche un aplat prune sobre : pas d'icône cassée, pas de
texte de remplacement.

Direction artistique commune à tous les visuels : cinématographique, lumière
rasante et basse, dominante prune sombre avec un unique accent vermillon,
aucun visage net, aucun logo ni texte incrusté.

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
l'écran. Les trois `.jpg` du voyage qui accompagnent une vidéo servent d'affiche
et remplacent totalement la vidéo si l'utilisateur a activé la réduction des
animations.

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
