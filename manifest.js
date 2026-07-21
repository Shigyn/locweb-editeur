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
  faq_5_reponse: { label: 'FAQ 5 — réponse', groupe: 'FAQ' },

  // Clés spécifiques à KSM Burger (site avec section "Pourquoi", "À propos",
  // horaires détaillés) — groupes réutilisés quand le sens correspond
  // (ex: "Pourquoi" ~ "Services"), nouveaux groupes sinon.
  pourquoi_1_desc: { label: 'Argument 1 — description', groupe: 'Services' },
  pourquoi_2_desc: { label: 'Argument 2 — description', groupe: 'Services' },
  pourquoi_3_desc: { label: 'Argument 3 — description', groupe: 'Services' },

  apropos_texte_1: { label: 'À propos — paragraphe 1', groupe: 'À propos' },
  apropos_texte_2: { label: 'À propos — paragraphe 2', groupe: 'À propos' },
  apropos_image: { label: 'À propos — photo', groupe: 'À propos' },

  footer_description: { label: 'Footer — texte de présentation', groupe: 'Footer' },

  horaires_lundi: { label: 'Horaires — lundi', groupe: 'Horaires' },
  horaires_mardi: { label: 'Horaires — mardi', groupe: 'Horaires' },
  horaires_mercredi: { label: 'Horaires — mercredi', groupe: 'Horaires' },
  horaires_jeudi: { label: 'Horaires — jeudi', groupe: 'Horaires' },
  horaires_vendredi: { label: 'Horaires — vendredi', groupe: 'Horaires' },
  horaires_samedi: { label: 'Horaires — samedi', groupe: 'Horaires' },
  horaires_dimanche: { label: 'Horaires — dimanche', groupe: 'Horaires' },

  // Clés spécifiques à AZROW (entreprise du bâtiment inclusive, Montpellier)
  // Noms de clés préfixés/spécifiques pour éviter toute collision avec les clés
  // génériques service_X_desc / stat_X_valeur déjà utilisées par le site LocWeb lui-même.
  service_electricite_desc: { label: 'Électricité — description', groupe: 'Services' },
  service_bati_ancien_desc: { label: 'Bâti ancien — description', groupe: 'Services' },
  service_eco_construction_desc: { label: 'Éco-construction — description', groupe: 'Services' },
  service_plomberie_desc: { label: 'Plomberie — description', groupe: 'Services' },
  service_carrelage_desc: { label: 'Carrelage — description', groupe: 'Services' },
  engagement_texte_1: { label: 'Engagement — paragraphe 1', groupe: 'Engagement' },
  engagement_image_1: { label: 'Engagement — photo 1', groupe: 'Engagement' },
  engagement_texte_2: { label: 'Engagement — paragraphe 2', groupe: 'Engagement' },
  engagement_image_2: { label: 'Engagement — photo 2', groupe: 'Engagement' },
  stat_metiers_valeur: { label: 'Chiffre clé — nb corps de métier', groupe: 'Preuve sociale' },
  stat_metiers_label: { label: 'Chiffre clé — légende (métiers)', groupe: 'Preuve sociale' },
  stat_ville_valeur: { label: 'Chiffre clé — ville', groupe: 'Preuve sociale' },
  stat_ville_label: { label: 'Chiffre clé — légende (ville)', groupe: 'Preuve sociale' },
  stat_inclusif_valeur: { label: 'Chiffre clé — taux inclusion', groupe: 'Preuve sociale' },
  stat_inclusif_label: { label: 'Chiffre clé — légende (inclusion)', groupe: 'Preuve sociale' },
  stat_devis_valeur: { label: 'Chiffre clé — devis', groupe: 'Preuve sociale' },
  stat_devis_label: { label: 'Chiffre clé — légende (devis)', groupe: 'Preuve sociale' },
  contact_telephone: { label: 'Téléphone de contact', groupe: 'Footer' },
  contact_email: { label: 'Email de contact', groupe: 'Footer' }
};

export const GROUP_ORDER = [
  'Hero', 'Services', 'À propos', 'Engagement', 'Preuve sociale', 'Comment ça marche',
  'Offre', 'FAQ', 'Horaires', 'Footer', 'Autres'
];
