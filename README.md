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

- **Le voyage du sushi** : un plan unique de cinquante-deux secondes, découpé
  en cinq mouvements et piloté au défilement. La scène reste collée à l'écran,
  plein cadre, du premier au dernier mouvement : le visiteur ne bouge pas,
  c'est le film qui avance. Techniquement, 420 images WebP dessinées sur un
  canvas, l'image suivant la position de défilement, sans aucun décodage vidéo
  en temps réel. Chargement progressif en deux passes, déclenché à l'approche
  de la section.
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
  src/shared/              règles de service, stockage, Brevo, validation
  scripts/seed-menu.js     crée les tables et charge la carte
```

## Le stockage

Azure Table Storage, quatre tables dans le compte `orestodemo2026` :

| Table | Clé de partition | Clé de ligne |
|---|---|---|
| `reservations` | la date | `créneau_table` |
| `commandes` | le jour de retrait | la référence |
| `carte` | `carte` | l'identifiant de catégorie |
| `quotas` | `action \| IP` | un identifiant tiré au hasard |

Deux conséquences de ce modèle méritent d'être connues :

- Une entité ne porte que des propriétés plates. Les listes — les plats d'une
  catégorie, les lignes d'une commande — sont donc stockées sérialisées en JSON
  dans une colonne de texte.
- Table Storage n'expire rien tout seul. Les compteurs de quota portent leur
  propre date de péremption : les entrées périmées ne sont pas comptées et sont
  effacées au passage.

## L'API

| Route | Rôle |
|---|---|
| `GET /api/menu` | La carte, telle qu'elle est en base |
| `GET /api/availability?date=AAAA-MM-JJ` | Créneaux et tables réellement libres ce jour-là |
| `POST /api/reservations` | Enregistre une réservation, envoie la confirmation |
| `POST /api/orders` | Enregistre une commande à emporter, envoie la confirmation |
| `POST /api/admin/session` | Vérifie le mot de passe du back-office, délivre un jeton |
| `GET /api/admin/carte` | La carte telle qu'on l'édite, jeton exigé |
| `POST /api/admin/plat` | Ajoute ou modifie un plat, jeton exigé |
| `DELETE /api/admin/plat` | Retire un plat, jeton exigé |

Trois garde-fous portent tout l'édifice :

- **Une place ne se vend pas deux fois.** La date fait la clé de partition, le
  couple créneau/table la clé de ligne : Table Storage rejette lui-même la
  seconde insertion sur le même triplet. Deux clics simultanés ne peuvent pas
  réserver la même table, et le second visiteur est ramené au plan de salle avec
  la raison affichée.
- **Les prix ne viennent jamais du navigateur.** Le total d'une commande est
  recalculé depuis la carte en base. Un panier trafiqué est sans effet.
- **Les points d'entrée publics sont plafonnés.** Ils envoient un e-mail vers une
  adresse fournie par l'appelant : sans plafond par IP, ils serviraient à
  spammer des tiers.
- **Le back-office est fermé côté serveur.** Le mot de passe est comparé dans la
  fonction, à temps constant, et le jeton de session est signé avec ce même
  secret. Lire le code de la page n'ouvre rien : sans jeton valable, chaque
  route d'administration répond 401. Les tentatives sont plafonnées comme le
  reste, faute de quoi le mot de passe se trouverait par force brute.

Le service raisonne en heure de Bruxelles, jamais dans le fuseau du serveur ni
dans celui du visiteur.

## Technique

HTML, CSS et JavaScript natifs côté page : aucun framework, aucune étape de
build. Seules les polices viennent de Google Fonts (Cormorant Garamond et
Karla). L'API est en Node.js et n'a que deux dépendances, `@azure/functions` et
`@azure/data-tables`.

- Toutes les couleurs sont des variables CSS déclarées en tête de feuille.
- Un média absent est masqué par le script : l'emplacement conserve son aplat
  sombre, sans icône cassée ni texte de remplacement.
- `prefers-reduced-motion` réduit le voyage à la dernière image du parcours et
  aux cinq mouvements racontés en clair : plus de défilement piloté, plus de
  canvas, aucune séquence chargée.
- Cibles tactiles à 44 px minimum, focus visible, piège de focus dans les
  panneaux, fermeture au clavier, libellés annoncés aux lecteurs d'écran.
- Testé de 375 à 1440 px, sans débordement horizontal.

## Mise en service

L'hébergement et les e-mails tiennent dans les paliers gratuits. Le stockage,
lui, est facturé à l'usage : à ce volume, la dépense se compte en fractions de
centime par mois, mais elle n'est pas nulle au sens strict.

### 1. Compte de stockage

Le compte **orestodemo2026** (West Europe) est déjà en place. Relever sa chaîne
de connexion sous *Sécurité + réseau · Clés d'accès*.

### 2. Créer les tables et charger la carte

```bash
cd api
npm install
cp local.settings.json.exemple local.settings.json   # puis renseigner les valeurs
npm run seed
```

Le script crée les quatre tables puis charge la carte. Il est relançable sans
risque : les tables existantes sont réutilisées et la carte est remplacée.

### 3. Brevo

Créer un compte Brevo (300 e-mails par jour, gratuit à vie), vérifier une
adresse d'expéditeur sous *Senders*, et générer une clé sous *SMTP & API*. Aucun
nom de domaine n'est nécessaire : la vérification d'une seule adresse suffit.

### 4. Static Web App

Créer une **Static Web App** au plan **Free**, liée à ce dépôt et à la branche
déployée. Dans *Configuration*, ajouter les variables d'application :

| Nom | Valeur |
|---|---|
| `AZURE_STORAGE_CONNECTION_STRING` | la chaîne relevée à l'étape 1 |
| `BREVO_API_KEY` | la clé de l'étape 3 |
| `BREVO_SENDER_EMAIL` | l'adresse vérifiée |
| `BREVO_SENDER_NAME` | `Ô'resto (démonstration)` |
| `ADMIN_PASSWORD` | le mot de passe du back-office, voir l'étape 5 |

Enfin, dans les *Secrets* du dépôt GitHub, déposer le jeton de déploiement de la
Static Web App sous le nom `AZURE_STATIC_WEB_APPS_API_TOKEN`.

### 5. Back-office

Le restaurateur modifie sa carte sur **`/admin`**, page qui n'est liée depuis
aucune page publique et que les moteurs ne sont pas invités à indexer. Il n'y a
ni compte ni base d'utilisateurs : un seul mot de passe, dans la variable
`ADMIN_PASSWORD`.

Ce mot de passe sert aussi de clé de signature des jetons de session. Le
changer révoque donc toutes les sessions ouvertes, sans registre à tenir. Une
session dure huit heures, et le jeton vit en `sessionStorage` : fermer l'onglet
suffit à la clore.

Choisir une phrase longue et propre à ce site. Sans cette variable, `/admin`
s'affiche mais annonce que le back-office n'est pas configuré, et aucune route
d'administration ne répond.

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
