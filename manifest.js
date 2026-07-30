// Manifeste optionnel : libellés lisibles + regroupement par section pour l'affichage.
// Purement cosmétique — si une clé n'a pas d'entrée ici, elle s'affiche quand même
// (libellé = la clé technique, groupe = "Autres"). Un client sans manifeste défini
// fonctionne donc normalement, juste avec un affichage moins soigné.
export const MANIFEST = {
  hero_titre_ligne1: { label: 'Titre principal — ligne 1', groupe: 'Hero' },
  hero_titre_accent: { label: 'Titre principal — accroche', groupe: 'Hero' },
  hero_sous_titre: { label: 'Sous-titre', groupe: 'Hero' },

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
