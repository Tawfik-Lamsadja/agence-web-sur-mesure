# Ô'resto

Site vitrine de démonstration pour un restaurant japonais fictif à Bruxelles.
Fait partie de l'écosystème de démos réutilisables de l'agence, aux côtés de
Faubourg Coiffure et de la démo menuiserie.

**Aucun établissement réel.** L'adresse, le téléphone et les paiements sont
fictifs et le resteront. Les réservations et les commandes, elles, sont
désormais bel et bien enregistrées et donnent lieu à un e-mail : celui-ci
rappelle donc explicitement, en pied de message, qu'il provient d'une
démonstration et qu'aucun repas n'attend son destinataire.

## Ce que la démo montre

- **Le voyage du sushi** : narration en six chapitres pilotée au défilement, une
  seule pièce suivie du geste du chef jusqu'à la bouche. Trois chapitres sur
  vidéo muette en boucle, trois sur image fixe. Les vidéos ne se lancent que
  lorsqu'elles sont à l'écran et se mettent en pause dès qu'elles en sortent.
- **Réservation de table** : calendrier, créneaux, convives, choix de la place
  sur un plan de salle, coordonnées, acompte anti no-show de 10 € par personne
  déduit de l'addition. Six étapes, une confirmation avec référence. Les
  créneaux et les places affichés sont ceux qui restent réellement libres.
- **Commande à emporter** : carte, ajout au panier, tiroir coulissant, choix de
  l'heure de retrait, coordonnées, récapitulatif et validation.

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

api/                       Azure Functions, Node.js
  src/functions/           les quatre points d'entrée HTTP
  src/shared/              règles de service, Cosmos, Brevo, validation
  scripts/seed-menu.js     crée la base, les conteneurs et charge la carte
```

## L'API

| Route | Rôle |
|---|---|
| `GET /api/menu` | La carte, telle qu'elle est en base |
| `GET /api/availability?date=AAAA-MM-JJ` | Créneaux et tables réellement libres ce jour-là |
| `POST /api/reservations` | Enregistre une réservation, envoie la confirmation |
| `POST /api/orders` | Enregistre une commande à emporter, envoie la confirmation |

Trois garde-fous portent tout l'édifice :

- **Une place ne se vend pas deux fois.** L'identifiant du document vaut
  `date|créneau|table` : Cosmos refuse lui-même la seconde écriture. Deux clics
  simultanés ne peuvent pas réserver la même table, et le second visiteur est
  ramené au plan de salle avec la raison affichée.
- **Les prix ne viennent jamais du navigateur.** Le total d'une commande est
  recalculé depuis la carte en base. Un panier trafiqué est sans effet.
- **Les points d'entrée publics sont plafonnés.** Ils envoient un e-mail vers une
  adresse fournie par l'appelant : sans plafond par IP, ils serviraient à
  spammer des tiers. Les compteurs portent un TTL et se vident seuls.

Le service raisonne en heure de Bruxelles, jamais dans le fuseau du serveur ni
dans celui du visiteur.

## Technique

HTML, CSS et JavaScript natifs côté page : aucun framework, aucune étape de
build. Seules les polices viennent de Google Fonts (Cormorant Garamond et
Karla). L'API est en Node.js et n'a que deux dépendances, `@azure/functions` et
`@azure/cosmos`.

- Toutes les couleurs sont des variables CSS déclarées en tête de feuille.
- Un média absent est masqué par le script : l'emplacement conserve son aplat
  sombre, sans icône cassée ni texte de remplacement.
- `prefers-reduced-motion` bascule le voyage en six chapitres empilés, sur
  images fixes, sans défilement piloté ni lecture vidéo.
- Cibles tactiles à 44 px minimum, focus visible, piège de focus dans les
  panneaux, fermeture au clavier, libellés annoncés aux lecteurs d'écran.
- Testé de 375 à 1440 px, sans débordement horizontal.

## Mise en service

Tout tient dans les paliers gratuits, sans date d'expiration.

### 1. Cosmos DB

Dans le portail Azure, créer un compte **Azure Cosmos DB for NoSQL** en
activant **Appliquer la remise de niveau gratuit**. Ce palier offre 1000 RU/s et
25 Go à vie et couvre intégralement cet usage.

> Un seul compte au palier gratuit est autorisé par abonnement. Si l'option est
> grisée, c'est qu'un autre compte l'occupe déjà.

Relever, sous *Clés*, l'URI et la clé primaire.

### 2. Créer la base et charger la carte

```bash
cd api
npm install
cp local.settings.json.exemple local.settings.json   # puis renseigner les valeurs
npm run seed
```

Le script crée la base, les quatre conteneurs avec leurs clés de partition, puis
charge la carte. Il est relançable sans risque.

### 3. Brevo

Créer un compte Brevo (300 e-mails par jour, gratuit à vie), vérifier une
adresse d'expéditeur sous *Senders*, et générer une clé sous *SMTP & API*. Aucun
nom de domaine n'est nécessaire : la vérification d'une seule adresse suffit.

### 4. Static Web App

Créer une **Static Web App** au plan **Free**, liée à ce dépôt et à la branche
déployée. Dans *Configuration*, ajouter les variables d'application :

| Nom | Valeur |
|---|---|
| `COSMOS_ENDPOINT` | l'URI relevée à l'étape 1 |
| `COSMOS_KEY` | la clé primaire |
| `COSMOS_DATABASE` | `oresto` |
| `BREVO_API_KEY` | la clé de l'étape 3 |
| `BREVO_SENDER_EMAIL` | l'adresse vérifiée |
| `BREVO_SENDER_NAME` | `Ô'resto (démonstration)` |

Enfin, dans les *Secrets* du dépôt GitHub, déposer le jeton de déploiement de la
Static Web App sous le nom `AZURE_STATIC_WEB_APPS_API_TOKEN`.

Sans ces variables, le site répond quand même : la carte et les disponibilités
échouent proprement avec un message, et une réservation enregistrée dont
l'e-mail n'a pas pu partir le signale au lieu de le promettre.

## Lancer en local

```bash
npm install -g azure-functions-core-tools@4 --unsafe-perm true
npm install -g @azure/static-web-apps-cli
swa start . --api-location api
```

Puis ouvrir <http://localhost:4280>, qui sert la page et l'API sur la même
origine. `api/local.settings.json` fournit les clés et n'est jamais versionné.

## Déploiement

`.github/workflows/azure-static-web-apps.yml` publie la racine comme site et
`api/` comme API managée à chaque poussée sur la branche déployée. Rien à
compiler.
