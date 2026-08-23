// ===================================================================
//  Journal des versions.
//
//  Ce fichier est la seule source de verite des nouveautes affichees au
//  client. Ajouter une entree EN HAUT a chaque livraison ; la pastille
//  de notification se declenche toute seule dès que la version la plus
//  recente differe de celle que le client a deja vue.
//
//  Ecrire du cote du client, pas du developpeur : "vos statistiques
//  Google" et non "integration API GA4 Data v1beta".
// ===================================================================

export const VERSIONS = [
  {
    version: '1.7',
    date: '2026-08-23',
    titre: 'Un espace plus simple',
    points: [
      'Le menu passe de dix entrées à cinq : Accueil, Statistiques, Mon site, Demandes, Publicité.',
      "L'accueil répond à une seule question : combien de visiteurs, combien de demandes, et quoi faire ensuite.",
      'Vos infos, vos connexions Google et votre parrainage sont regroupés dans Mon compte.',
      "Installez l'espace comme une application : menu du compte, puis Installer l'application.",
      'Vos coordonnées et vos réponses au questionnaire sont enfin vraiment enregistrées.',
    ],
  },
  {
    version: '1.4',
    date: '2026-08-23',
    titre: 'Votre fiche Google et vos vraies statistiques',
    points: [
      'Vos vues, appels et avis Google apparaissent dans Statistiques.',
      'Les répartitions téléphone / ordinateur et villes passent en camembert.',
      'Passez la souris sur un chiffre : une phrase explique ce qu\'il mesure.',
    ],
  },
  {
    version: '1.3',
    date: '2026-08-22',
    titre: 'Un vrai tableau de bord',
    points: [
      'Nouveau menu : Accueil, Performances, Mon éditeur, Acquisition, Mon activité.',
      'Vos statistiques Google Analytics, avec comparaison à la période précédente.',
      'Thème sombre disponible depuis le bouton en haut à droite.',
    ],
  },
  {
    version: '1.2',
    date: '2026-08-22',
    titre: 'Brouillon et publication',
    points: [
      'Vos modifications ne partent en ligne que lorsque vous cliquez sur Publier.',
      'Historique de ce qui a été publié, et par qui.',
      'Vos demandes de devis sont exportables en tableur.',
    ],
  },
];

export const VERSION_ACTUELLE = VERSIONS[0].version;
