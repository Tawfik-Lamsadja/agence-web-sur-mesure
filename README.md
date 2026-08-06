# Ô'resto

Site vitrine de démonstration pour un restaurant japonais fictif à Bruxelles.
Fait partie de l'écosystème de démos réutilisables de l'agence, aux côtés de
Faubourg Coiffure et de la démo menuiserie.

**Aucun établissement réel.** Les coordonnées, les disponibilités et les
paiements sont fictifs et le resteront.

## Ce que la démo montre

- **Le voyage du sushi** : narration en six chapitres pilotée au défilement, une
  seule pièce suivie du geste du chef jusqu'à la bouche. Trois chapitres sur
  vidéo muette en boucle, trois sur image fixe. Les vidéos ne se lancent que
  lorsqu'elles sont à l'écran et se mettent en pause dès qu'elles en sortent.
- **Réservation de table** : calendrier, créneaux, convives, choix de la place
  sur un plan de salle, coordonnées, acompte anti no-show de 10 € par personne
  déduit de l'addition. Six étapes, une confirmation avec référence.
- **Commande à emporter** : carte, ajout au panier, tiroir coulissant, choix de
  l'heure de retrait, récapitulatif et validation simulée.

Les deux parcours sont indépendants, atteignables par deux boutons distincts
dans l'en-tête, et adressables directement par `#reserver` et `#commander`.

## L'ensō

Le cercle calligraphique fait écho au « Ô » du nom. Il n'est jamais décoratif :

| Usage | Comportement |
|---|---|
| Écran de chargement | Se trace au pinceau, puis s'efface |
| Logo, en-tête et pied | Marque pleine |
| Séparateur de section | Marque pleine, en creux |
| Réservation | Se remplit d'une étape à l'autre, plein à la confirmation |
| Panier | Se remplit à mesure que le panier se garnit |

La forme est un tracé unique généré géométriquement, avec pleins et déliés
comme un vrai coup de pinceau. Elle est définie une seule fois dans
`index.html` puis réutilisée par référence.

## Structure

```
index.html                 page unique, contenu et gabarits
css/style.css              feuille unique, toutes les couleurs en :root
js/main.js                 un seul script, sans dépendance
assets/                    images et vidéos, à déposer
favicon.svg                l'ensō
staticwebapp.config.json   configuration Azure Static Web Apps
ASSETS.md                  liste des assets et prompts de génération
```

## Technique

HTML, CSS et JavaScript natifs. Aucun framework, aucune étape de build, aucune
dépendance installée. Seules les polices sont chargées depuis Google Fonts
(Cormorant Garamond et Karla).

- Toutes les couleurs sont des variables CSS déclarées en tête de feuille.
- Un média absent est masqué par le script : l'emplacement conserve son aplat
  sombre, sans icône cassée ni texte de remplacement.
- `prefers-reduced-motion` bascule le voyage en six chapitres empilés, sur
  images fixes, sans défilement piloté ni lecture vidéo.
- Cibles tactiles à 44 px minimum, focus visible, piège de focus dans les
  panneaux, fermeture au clavier, libellés annoncés aux lecteurs d'écran.
- Testé de 375 à 1440 px, sans débordement horizontal.

## Lancer en local

```bash
python3 -m http.server 8000
```

Puis ouvrir <http://localhost:8000>.

## Déploiement

Prévu pour Azure Static Web Apps. `staticwebapp.config.json` définit le repli de
navigation, les types MIME des vidéos et la mise en cache de `assets/`. Rien à
compiler : le contenu de la racine est le site.
