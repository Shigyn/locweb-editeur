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
  expertise_texte_2: { label: 'Expertise — paragraphe 2', groupe: 'Expertise' },

  /* ---- Auto Wash 34 (Beziers) ---- */
  hero_surtitre: { label: 'Hero — surtitre', groupe: 'Hero' },
  hero_titre: { label: 'Hero — titre principal', groupe: 'Hero' },
  hero_accroche: { label: 'Hero — accroche', groupe: 'Hero' },
  hero_mots: { label: "Hero — mots qui tournent (separes par des virgules)", groupe: 'Hero' },
  hero_photo_1: { label: 'Hero — photo 1 du diaporama', groupe: 'Hero' },
  hero_photo_2: { label: 'Hero — photo 2 du diaporama', groupe: 'Hero' },
  hero_photo_3: { label: 'Hero — photo 3 du diaporama', groupe: 'Hero' },
  formules_titre: { label: 'Formules — titre', groupe: 'Services' },
  formules_intro: { label: 'Formules — introduction', groupe: 'Services' },
  formule_1_titre: { label: 'Formule 1 — nom', groupe: 'Services' },
  formule_1_liste: { label: 'Formule 1 — ce qui est inclus', groupe: 'Services' },
  formule_2_titre: { label: 'Formule 2 — nom', groupe: 'Services' },
  formule_2_liste: { label: 'Formule 2 — ce qui est inclus', groupe: 'Services' },
  formule_3_titre: { label: 'Formule 3 — nom', groupe: 'Services' },
  formule_3_liste: { label: 'Formule 3 — ce qui est inclus', groupe: 'Services' },
  bande_photo: { label: 'Bande — photo de fond', groupe: 'Preuve sociale' },
  citation_texte: { label: 'Bande — phrase mise en avant', groupe: 'Preuve sociale' },
  citation_auteur: { label: 'Bande — signature', groupe: 'Preuve sociale' },
  deroule_titre: { label: 'Deroulement — titre', groupe: 'Engagement' },
  deroule_intro: { label: 'Deroulement — introduction', groupe: 'Engagement' },
  etape_1_titre: { label: 'Etape 1 — titre', groupe: 'Engagement' },
  etape_1_texte: { label: 'Etape 1 — texte', groupe: 'Engagement' },
  etape_2_titre: { label: 'Etape 2 — titre', groupe: 'Engagement' },
  etape_2_texte: { label: 'Etape 2 — texte', groupe: 'Engagement' },
  etape_3_titre: { label: 'Etape 3 — titre', groupe: 'Engagement' },
  etape_3_texte: { label: 'Etape 3 — texte', groupe: 'Engagement' },
  zone_titre: { label: 'Zone desservie — titre', groupe: 'A propos' },
  zone_intro: { label: 'Zone desservie — introduction', groupe: 'A propos' },
  zone_communes: { label: 'Zone desservie — liste des communes', groupe: 'A propos' },
  contact_titre: { label: 'Contact — titre', groupe: 'Footer' },
  contact_intro: { label: 'Contact — introduction', groupe: 'Footer' },
  contact_adresse: { label: 'Adresse', groupe: 'Footer' },
  contact_horaires: { label: 'Horaires', groupe: 'Horaires' },

  /* ---- Auto Wash 34 : bande d'appel ----
     Libelles entre GUILLEMETS et non entre apostrophes : « Bande
     d'appel » en contient une, qui fermait la chaine au milieu. */
  appel_photo: { label: "Bande d'appel — photo de fond", groupe: 'Engagement' },
  appel_surtitre: { label: "Bande d'appel — surtitre", groupe: 'Engagement' },
  appel_titre: { label: "Bande d'appel — titre", groupe: 'Engagement' },
  appel_texte: { label: "Bande d'appel — texte", groupe: 'Engagement' },

  /* ---- Auto Wash 34 : textiles ---- */
  formule_4_titre: { label: "Formule 4 — nom", groupe: 'Services' },
  formule_4_liste: { label: "Formule 4 — ce qui est inclus", groupe: 'Services' },
  textile_titre: { label: "Textiles — titre", groupe: 'Services' },
  textile_intro: { label: "Textiles — introduction", groupe: 'Services' },
  textile_etiquette: { label: "Textiles — intitule de la liste", groupe: 'Services' },
  textile_liste: { label: "Textiles — ce qui est traite", groupe: 'Services' },
  textile_photo_1: { label: "Textiles — photo 1", groupe: 'Services' },
  textile_legende_1: { label: "Textiles — legende 1", groupe: 'Services' },
  textile_photo_2: { label: "Textiles — photo 2", groupe: 'Services' },
  textile_legende_2: { label: "Textiles — legende 2", groupe: 'Services' },
  faq_q7: { label: "FAQ — question 7", groupe: 'FAQ' },
  faq_r7: { label: "FAQ — reponse 7", groupe: 'FAQ' },
  faq_q8: { label: "FAQ — question 8", groupe: 'FAQ' },
  faq_r8: { label: "FAQ — reponse 8", groupe: 'FAQ' },

  /* ---- Auto Wash 34 : questions frequentes ---- */
  faq_titre: { label: 'FAQ — titre', groupe: 'FAQ' },
  faq_intro: { label: 'FAQ — introduction', groupe: 'FAQ' },
  faq_q1: { label: 'FAQ — question 1', groupe: 'FAQ' },
  faq_r1: { label: 'FAQ — reponse 1', groupe: 'FAQ' },
  faq_q2: { label: 'FAQ — question 2', groupe: 'FAQ' },
  faq_r2: { label: 'FAQ — reponse 2', groupe: 'FAQ' },
  faq_q3: { label: 'FAQ — question 3', groupe: 'FAQ' },
  faq_r3: { label: 'FAQ — reponse 3', groupe: 'FAQ' },
  faq_q4: { label: 'FAQ — question 4', groupe: 'FAQ' },
  faq_r4: { label: 'FAQ — reponse 4', groupe: 'FAQ' },
  faq_q5: { label: 'FAQ — question 5', groupe: 'FAQ' },
  faq_r5: { label: 'FAQ — reponse 5', groupe: 'FAQ' },
  faq_q6: { label: 'FAQ — question 6', groupe: 'FAQ' },
  faq_r6: { label: 'FAQ — reponse 6', groupe: 'FAQ' },

  //  Redybat — carreleur, peintre et plaquiste a Lyon (2026-09-09).
  //  Chacun des quatre metiers a un texte ET une photo. La ligne image
  //  n'est pas facultative : sans elle, l'onglet Images de l'editeur
  //  annonce « aucune zone balisee » alors que le site tourne tres bien
  //  avec ses visuels statiques, et rien ne le signale.
  services_titre: { label: 'Nos metiers — titre', groupe: 'Services' },
  services_intro: { label: 'Nos metiers — introduction', groupe: 'Services' },
  service_carrelage_img: { label: 'Carrelage — photo', groupe: 'Services' },
  service_peinture_desc: { label: 'Peinture — description', groupe: 'Services' },
  service_peinture_img: { label: 'Peinture — photo', groupe: 'Services' },
  service_placo_desc: { label: 'Placo et cloisons — description', groupe: 'Services' },
  service_placo_img: { label: 'Placo et cloisons — photo', groupe: 'Services' },
  service_facade_desc: { label: 'Facade — description', groupe: 'Services' },
  service_facade_img: { label: 'Facade — photo', groupe: 'Services' },

  realisations_titre: { label: 'Realisations — titre', groupe: 'Preuve sociale' },
  realisations_intro: { label: 'Realisations — introduction', groupe: 'Preuve sociale' },
  realisation_1_avant: { label: 'Chantier 1 — photo avant', groupe: 'Preuve sociale' },
  realisation_1_apres: { label: 'Chantier 1 — photo apres', groupe: 'Preuve sociale' },
  realisation_2_avant: { label: 'Chantier 2 — photo avant', groupe: 'Preuve sociale' },
  realisation_2_apres: { label: 'Chantier 2 — photo apres', groupe: 'Preuve sociale' },
  realisation_2_lieu: { label: 'Chantier 2 — lieu', groupe: 'Preuve sociale' },

  //  Les deux bandes photo pleine largeur qui rythment la page.
  bande_chiffre: { label: 'Bande 1 — chiffre mis en avant', groupe: 'Expertise' },
  bande_titre: { label: 'Bande 1 — titre', groupe: 'Expertise' },
  bande_texte: { label: 'Bande 1 — texte', groupe: 'Expertise' },
  bande2_titre: { label: 'Bande 2 — titre', groupe: 'Engagement' },
  bande2_texte: { label: 'Bande 2 — texte', groupe: 'Engagement' },

  //  Sensi'Dyf — Georgia Gomez, psychopedagogue a Beziers (2026-09-09).
  //  `parcours_formations` est volontairement VIDE a la livraison : ses
  //  diplomes ne figurent nulle part sur ses pages publiques, et on ne
  //  devine pas les qualifications de quelqu'un qui travaille avec des
  //  enfants en situation de handicap.
  hero_publics: { label: 'Hero — publics accompagnes', groupe: 'Hero' },

  regard_titre: { label: 'Le regard — titre', groupe: 'A propos' },
  regard_intro: { label: 'Le regard — introduction', groupe: 'A propos' },
  regard_titre_1: { label: 'Le regard — volet 1, titre', groupe: 'A propos' },
  regard_texte_1: { label: 'Le regard — volet 1, texte', groupe: 'A propos' },
  regard_img_1: { label: 'Le regard — volet 1, photo', groupe: 'A propos' },
  regard_texte_2: { label: 'Le regard — volet 2, texte', groupe: 'A propos' },
  regard_img_2: { label: 'Le regard — volet 2, photo', groupe: 'A propos' },
  regard_texte_3: { label: 'Le regard — volet 3, texte', groupe: 'A propos' },
  regard_img_3: { label: 'Le regard — volet 3, photo', groupe: 'A propos' },

  bande1_titre: { label: 'Bande sensorielle — titre', groupe: 'Expertise' },
  bande1_texte: { label: 'Bande sensorielle — texte', groupe: 'Expertise' },

  service_caa: { label: 'CAA — description', groupe: 'Services' },
  service_aba: { label: 'Comportements defis — description', groupe: 'Services' },
  service_reflexes: { label: 'Reflexes archaiques — description', groupe: 'Services' },
  service_oro: { label: 'Reeducation oro-myo-faciale — description', groupe: 'Services' },
  service_ecole: { label: 'Coaching scolaire — description', groupe: 'Services' },
  service_parentalite: { label: 'Parentalite — description', groupe: 'Services' },
  service_mdph: { label: 'Demarches MDPH — description', groupe: 'Services' },
  service_materiel: { label: 'Materiel specialise — description', groupe: 'Services' },

  parcours_titre: { label: 'Qui je suis — titre', groupe: 'A propos' },
  parcours_citation: { label: 'Qui je suis — citation mise en avant', groupe: 'A propos' },
  parcours_texte_1: { label: 'Qui je suis — paragraphe 1', groupe: 'A propos' },
  parcours_texte_2: { label: 'Qui je suis — paragraphe 2', groupe: 'A propos' },
  parcours_texte_3: { label: 'Qui je suis — paragraphe 3', groupe: 'A propos' },
  parcours_photo: { label: 'Qui je suis — photo', groupe: 'A propos' },
  parcours_formations: { label: 'Qui je suis — formations et diplomes (A REMPLIR)', groupe: 'A propos' },

  financement_titre: { label: 'Financement — titre', groupe: 'Offre' },
  financement_soustitre: { label: 'Financement — sous-titre', groupe: 'Offre' },
  financement_texte_1: { label: 'Financement — paragraphe 1', groupe: 'Offre' },
  financement_texte_2: { label: 'Financement — paragraphe 2', groupe: 'Offre' },
  financement_texte_3: { label: 'Financement — paragraphe 3', groupe: 'Offre' }
};

export const GROUP_ORDER = [
  'Hero', 'Services', 'À propos', 'Engagement', 'Expertise', 'Preuve sociale',
  'Offre', 'FAQ', 'Horaires', 'Footer', 'Autres'
];
