'use strict';

/* Contenu de départ de la carte. Il n'est lu que par le script de seed :
   une fois en base, la carte se modifie sans repasser par le code. */
module.exports = [
  {
    id: 'sashimi', nom: 'Sashimi', col: 0, ordre: 0,
    note: "Découpés à la commande, jamais à l'avance.",
    items: [
      { id: 'sa-sau', nom: 'Saumon, six tranches', desc: 'Élevage des Féroé, taillé au yanagiba.', prix: 1400 },
      { id: 'sa-tho', nom: 'Thon rouge, six tranches', desc: 'Longe du jour, selon arrivage.', prix: 1800 },
      { id: 'sa-dau', nom: 'Daurade, six tranches', desc: 'Maturée vingt-quatre heures, zeste de yuzu.', prix: 1600 },
      { id: 'sa-ass', nom: 'Assortiment du jour, douze tranches', desc: 'Trois poissons, choisis le matin même.', prix: 2800 }
    ]
  },
  {
    id: 'nigiri', nom: 'Nigiri', col: 0, ordre: 1,
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
    id: 'rouleaux', nom: 'Rouleaux', col: 0, ordre: 2, note: '',
    items: [
      { id: 'ro-con', nom: 'Maki concombre, six pièces', desc: '', prix: 600 },
      { id: 'ro-sau', nom: 'Maki saumon, six pièces', desc: '', prix: 800 },
      { id: 'ro-cal', nom: 'California crabe avocat, six pièces', desc: 'Crabe entier, jamais de surimi.', prix: 1000 },
      { id: 'ro-fut', nom: 'Futomaki végétal, quatre pièces', desc: 'Shiitaké, épinard, carotte, tamago.', prix: 900 }
    ]
  },
  {
    id: 'chauds', nom: 'Plats chauds', col: 1, ordre: 3, note: '',
    items: [
      { id: 'ch-gyo', nom: 'Gyoza au porc, cinq pièces', desc: 'Pliés le matin, poêlés à la commande.', prix: 900 },
      { id: 'ch-ram', nom: 'Ramen shoyu', desc: 'Bouillon de douze heures, servi à table uniquement.', prix: 1700, emporter: false },
      { id: 'ch-tat', nom: 'Bœuf tataki', desc: 'Filet saisi trente secondes, ponzu.', prix: 1900 },
      { id: 'ch-aub', nom: 'Aubergine au miso', desc: 'Miso rouge, cuisson au four à bois.', prix: 1100 }
    ]
  },
  {
    id: 'desserts', nom: 'Desserts', col: 1, ordre: 4, note: '',
    items: [
      { id: 'de-moc', nom: 'Mochi, deux pièces', desc: 'Sésame noir ou matcha.', prix: 600 },
      { id: 'de-cre', nom: 'Crème au thé matcha', desc: '', prix: 700 },
      { id: 'de-yuz', nom: 'Sorbet yuzu', desc: '', prix: 600 }
    ]
  },
  {
    id: 'boissons', nom: 'Boissons', col: 1, ordre: 5, note: '',
    items: [
      { id: 'bo-sen', nom: 'Thé sencha', desc: 'En théière, réinfusé autant que vous voulez.', prix: 400 },
      { id: 'bo-bie', nom: 'Bière japonaise, 33 cl', desc: '', prix: 500 },
      { id: 'bo-sak', nom: 'Saké junmai, 12 cl', desc: 'Servi frais, préfecture de Niigata.', prix: 900 },
      { id: 'bo-eau', nom: 'Eau plate ou pétillante, 50 cl', desc: '', prix: 350 }
    ]
  }
];
