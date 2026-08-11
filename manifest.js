// Manifeste optionnel : libellés lisibles + regroupement par section pour l'affichage.
// Purement cosmétique — si une clé n'a pas d'entrée ici, elle s'affiche quand même
// (libellé = la clé technique, groupe = "Autres"). Un client sans manifeste défini
// fonctionne donc normalement, juste avec un affichage moins soigné.
export const MANIFEST = {
  hero_titre_ligne1: { label: 'Titre principal — ligne 1', groupe: 'Hero' },
  hero_titre_accent: { label: 'Titre principal — accroche', groupe: 'Hero' },
  hero_sous_titre: { label: 'Sous-titre', groupe: 'Hero' },

  prix_classique_creation: { label: 'Vitrine classique — prix création', groupe: 'Offre' },
  prix_classique_mensuel: { label: 'Vitrine classique — prix mensuel', groupe: 'Offre' },
  prix_classique_avantage_1: { label: 'Vitrine classique — avantage 1', groupe: 'Offre' },
  prix_classique_avantage_2: { label: 'Vitrine classique — avantage 2', groupe: 'Offre' },
  prix_classique_avantage_3: { label: 'Vitrine classique — avantage 3', groupe: 'Offre' },
  prix_classique_avantage_4: { label: 'Vitrine classique — avantage 4', groupe: 'Offre' },
  prix_classique_avantage_5: { label: 'Vitrine classique — avantage 5', groupe: 'Offre' },
  prix_classique_avantage_6: { label: 'Vitrine classique — avantage 6', groupe: 'Offre' },
  prix_classique_note: { label: 'Vitrine classique — note', groupe: 'Offre' },

  prix_ultra_creation: { label: 'Site animé — prix création', groupe: 'Offre' },
  prix_ultra_mensuel: { label: 'Site animé — prix mensuel', groupe: 'Offre' },
  prix_ultra_avantage_1: { label: 'Site animé — avantage 1', groupe: 'Offre' },
  prix_ultra_avantage_2: { label: 'Site animé — avantage 2', groupe: 'Offre' },
  prix_ultra_avantage_3: { label: 'Site animé — avantage 3', groupe: 'Offre' },
  prix_ultra_avantage_4: { label: 'Site animé — avantage 4', groupe: 'Offre' },
  prix_ultra_avantage_5: { label: 'Site animé — avantage 5', groupe: 'Offre' },
  prix_ultra_avantage_6: { label: 'Site animé — avantage 6', groupe: 'Offre' },
  prix_ultra_note: { label: 'Site animé — note', groupe: 'Offre' },

  prix_ecom_creation: { label: 'E-commerce — prix création', groupe: 'Offre' },
  prix_ecom_mensuel: { label: 'E-commerce — prix mensuel', groupe: 'Offre' },
  prix_ecom_avantage_1: { label: 'E-commerce — avantage 1', groupe: 'Offre' },
  prix_ecom_avantage_2: { label: 'E-commerce — avantage 2', groupe: 'Offre' },
  prix_ecom_avantage_3: { label: 'E-commerce — avantage 3', groupe: 'Offre' },
  prix_ecom_avantage_4: { label: 'E-commerce — avantage 4', groupe: 'Offre' },
  prix_ecom_avantage_5: { label: 'E-commerce — avantage 5', groupe: 'Offre' },
  prix_ecom_avantage_6: { label: 'E-commerce — avantage 6', groupe: 'Offre' },

  prix_premium_avantage_1: { label: 'Site ultra premium — avantage 1', groupe: 'Offre' },
  prix_premium_avantage_2: { label: 'Site ultra premium — avantage 2', groupe: 'Offre' },
  prix_premium_avantage_3: { label: 'Site ultra premium — avantage 3', groupe: 'Offre' },
  prix_premium_avantage_4: { label: 'Site ultra premium — avantage 4', groupe: 'Offre' },
  prix_premium_avantage_5: { label: 'Site ultra premium — avantage 5', groupe: 'Offre' },

  prix_chatbot_creation: { label: 'Option Assistant IA — prix création', groupe: 'Offre' },
  prix_chatbot_mensuel: { label: 'Option Assistant IA — prix mensuel', groupe: 'Offre' },
  prix_chatbot_avantage_1: { label: 'Option Assistant IA — avantage 1', groupe: 'Offre' },
  prix_chatbot_avantage_2: { label: 'Option Assistant IA — avantage 2', groupe: 'Offre' },
  prix_chatbot_avantage_3: { label: 'Option Assistant IA — avantage 3', groupe: 'Offre' },
  prix_chatbot_avantage_4: { label: 'Option Assistant IA — avantage 4', groupe: 'Offre' },

  prix_smsauto_creation: { label: 'Option SMS appel manqué — prix création', groupe: 'Offre' },
  prix_smsauto_mensuel: { label: 'Option SMS appel manqué — prix mensuel', groupe: 'Offre' },
  prix_smsauto_avantage_1: { label: 'Option SMS appel manqué — avantage 1', groupe: 'Offre' },
  prix_smsauto_avantage_2: { label: 'Option SMS appel manqué — avantage 2', groupe: 'Offre' },
  prix_smsauto_avantage_3: { label: 'Option SMS appel manqué — avantage 3', groupe: 'Offre' },
  prix_smsauto_avantage_4: { label: 'Option SMS appel manqué — avantage 4', groupe: 'Offre' },

  prix_packprint_creation: { label: 'Option Pack print — prix', groupe: 'Offre' },
  prix_packprint_avantage_1: { label: 'Option Pack print — avantage 1', groupe: 'Offre' },
  prix_packprint_avantage_2: { label: 'Option Pack print — avantage 2', groupe: 'Offre' },
  prix_packprint_avantage_3: { label: 'Option Pack print — avantage 3', groupe: 'Offre' },
  prix_packprint_avantage_4: { label: 'Option Pack print — avantage 4', groupe: 'Offre' },

  addon_avantage_1: { label: 'Autres services — ligne 1 (Fiche Google)', groupe: 'Offre' },
  addon_avantage_2: { label: 'Autres services — ligne 2 (Réseaux sociaux)', groupe: 'Offre' },
  addon_avantage_3: { label: 'Autres services — ligne 3 (Publicité en ligne)', groupe: 'Offre' },

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
  contact_email: { label: 'Email de contact', groupe: 'Footer' },

  // Clés spécifiques à Maison Verrier (site test premium tier 3, rénovation bâti ancien)
  service_charpente_desc: { label: 'Charpente — description', groupe: 'Services' },
  service_renovation_desc: { label: 'Rénovation bâti ancien — description', groupe: 'Services' },
  service_toiture_desc: { label: 'Toiture — description', groupe: 'Services' },
  service_maconnerie_desc: { label: 'Maçonnerie pierre — description', groupe: 'Services' },
  service_menuiserie_desc: { label: 'Menuiserie sur mesure — description', groupe: 'Services' },
  service_suivi_desc: { label: 'Suivi de chantier — description', groupe: 'Services' },
  expertise_texte_1: { label: 'Expertise — paragraphe 1', groupe: 'Expertise' },
  expertise_texte_2: { label: 'Expertise — paragraphe 2', groupe: 'Expertise' }
};

export const GROUP_ORDER = [
  'Hero', 'Services', 'À propos', 'Engagement', 'Expertise', 'Preuve sociale',
  'Offre', 'Horaires', 'Footer', 'Autres'
];
