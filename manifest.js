// Manifeste optionnel : libellés lisibles + regroupement par section pour l'affichage.
// Purement cosmétique — si une clé n'a pas d'entrée ici, elle s'affiche quand même
// (libellé = la clé technique, groupe = "Autres"). Un client sans manifeste défini
// fonctionne donc normalement, juste avec un affichage moins soigné.
export const MANIFEST = {
  hero_titre_ligne1: { label: 'Titre principal — ligne 1', groupe: 'Hero' },
  hero_titre_accent: { label: 'Titre principal — accroche', groupe: 'Hero' },
  hero_sous_titre: { label: 'Sous-titre', groupe: 'Hero' },
  hero_form_titre: { label: 'Titre du formulaire', groupe: 'Hero' },

  service_1_desc: { label: 'Site web professionnel — description', groupe: 'Services' },
  service_2_desc: { label: 'Fiche Google Business — description', groupe: 'Services' },
  service_3_desc: { label: 'Réseaux sociaux — description', groupe: 'Services' },
  service_4_desc: { label: 'Supports print — description', groupe: 'Services' },
  service_5_desc: { label: 'Logo & identité — description', groupe: 'Services' },
  service_6_desc: { label: 'Avis Google — description', groupe: 'Services' },

  stat_1_valeur: { label: 'Chiffre clé 1 — valeur', groupe: 'Preuve sociale' },
  stat_1_label: { label: 'Chiffre clé 1 — légende', groupe: 'Preuve sociale' },
  stat_2_valeur: { label: 'Chiffre clé 2 — valeur', groupe: 'Preuve sociale' },
  stat_2_label: { label: 'Chiffre clé 2 — légende', groupe: 'Preuve sociale' },
  stat_3_valeur: { label: 'Chiffre clé 3 — valeur', groupe: 'Preuve sociale' },
  stat_3_label: { label: 'Chiffre clé 3 — légende', groupe: 'Preuve sociale' },
  stat_4_valeur: { label: 'Chiffre clé 4 — valeur', groupe: 'Preuve sociale' },
  stat_4_label: { label: 'Chiffre clé 4 — légende', groupe: 'Preuve sociale' },
  temoin_1_texte: { label: 'Témoignage 1 — texte', groupe: 'Preuve sociale' },
  temoin_1_nom: { label: 'Témoignage 1 — nom', groupe: 'Preuve sociale' },
  temoin_1_role: { label: 'Témoignage 1 — métier / ville', groupe: 'Preuve sociale' },
  temoin_2_texte: { label: 'Témoignage 2 — texte', groupe: 'Preuve sociale' },
  temoin_2_nom: { label: 'Témoignage 2 — nom', groupe: 'Preuve sociale' },
  temoin_2_role: { label: 'Témoignage 2 — métier / ville', groupe: 'Preuve sociale' },
  temoin_3_texte: { label: 'Témoignage 3 — texte', groupe: 'Preuve sociale' },
  temoin_3_nom: { label: 'Témoignage 3 — nom', groupe: 'Preuve sociale' },
  temoin_3_role: { label: 'Témoignage 3 — métier / ville', groupe: 'Preuve sociale' },

  etape_1_desc: { label: 'Étape 1 — description', groupe: 'Comment ça marche' },
  etape_2_desc: { label: 'Étape 2 — description', groupe: 'Comment ça marche' },
  etape_3_desc: { label: 'Étape 3 — description', groupe: 'Comment ça marche' },
  etape_4_desc: { label: 'Étape 4 — description', groupe: 'Comment ça marche' },

  prix_valeur: { label: 'Prix — montant', groupe: 'Offre' },
  prix_frequence: { label: 'Prix — fréquence', groupe: 'Offre' },
  prix_avantage_1: { label: 'Avantage 1', groupe: 'Offre' },
  prix_avantage_2: { label: 'Avantage 2', groupe: 'Offre' },
  prix_avantage_3: { label: 'Avantage 3', groupe: 'Offre' },
  prix_avantage_4: { label: 'Avantage 4', groupe: 'Offre' },
  prix_avantage_5: { label: 'Avantage 5', groupe: 'Offre' },
  prix_avantage_6: { label: 'Avantage 6', groupe: 'Offre' },
  prix_avantage_7: { label: 'Avantage 7', groupe: 'Offre' },
  prix_note: { label: 'Note en bas de l\'offre', groupe: 'Offre' },

  faq_1_reponse: { label: 'FAQ 1 — réponse', groupe: 'FAQ' },
  faq_2_reponse: { label: 'FAQ 2 — réponse', groupe: 'FAQ' },
  faq_3_reponse: { label: 'FAQ 3 — réponse', groupe: 'FAQ' },
  faq_4_reponse: { label: 'FAQ 4 — réponse', groupe: 'FAQ' },
  faq_5_reponse: { label: 'FAQ 5 — réponse', groupe: 'FAQ' }
};

export const GROUP_ORDER = ['Hero', 'Services', 'Preuve sociale', 'Comment ça marche', 'Offre', 'FAQ', 'Autres'];
