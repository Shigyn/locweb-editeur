// ===================================================================
//  Onboarding — 5 etapes a la premiere connexion, puis un ecran de
//  preparation et l'arrivee sur le tableau de bord.
//
//  Honnetete de l'ecran de preparation : chaque ligne cochee correspond
//  a une operation qui a REELLEMENT lieu (enregistrement du profil,
//  lecture des connexions, chargement du contenu). On ne simule pas une
//  analyse qui n'existe pas — la duree vient du vrai travail, avec un
//  plancher pour que l'oeil ait le temps de suivre.
// ===================================================================

import { h, vider, souffler } from './outils.js';
import * as D from './donnees.js';

const OBJECTIFS = [
  { cle: 'appels', libelle: "Plus d'appels",            icone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>' },
  { cle: 'devis',  libelle: 'Plus de demandes de devis', icone: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>' },
  { cle: 'rdv',    libelle: 'Plus de rendez-vous',       icone: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>' },
  { cle: 'trafic', libelle: 'Plus de trafic',            icone: '<path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 15 4-5 3 3 5-7"/>' },
  { cle: 'avis',   libelle: "Plus d'avis Google",        icone: '<path d="m12 3 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8L6.6 19.6l1-6L3.3 9.4l6-.9Z"/>' },
];

// Quatre familles, pas douze : le but est de trier en un coup d'oeil,
// pas de faire une nomenclature INSEE. Le champ metier juste en dessous
// recupere la precision. L'exemple propose s'adapte au secteur choisi —
// "ex : Pizzeria" parle plus a un restaurateur que "ex : Plombier".
const SECTEURS = [
  {
    cle: 'artisan',
    libelle: 'Artisan',
    exemple: 'ex : Plombier chauffagiste',
    icone: '<path d="M4 16a8 8 0 0 1 16 0"/><path d="M2 16h20"/><path d="M10 8V4.5A1.5 1.5 0 0 1 11.5 3h1A1.5 1.5 0 0 1 14 4.5V8"/>',
  },
  {
    cle: 'independant',
    libelle: 'Indépendant',
    exemple: 'ex : Coach sportif, photographe',
    icone: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/>',
  },
  {
    cle: 'restaurateur',
    libelle: 'Restaurateur',
    exemple: 'ex : Pizzeria, brasserie',
    icone: '<path d="M6 3v7a2 2 0 0 0 4 0V3"/><path d="M8 10v11"/><path d="M17.5 3c-1.4 2-2 4-2 6 0 1.4.7 2 2 2v10"/>',
  },
  {
    cle: 'autre',
    libelle: 'Autre',
    exemple: 'ex : Votre activité',
    icone: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="16" cy="12" r="1.1" fill="currentColor" stroke="none"/>',
  },
];

// Des paliers, pas un champ libre : ce qui compte pour cibler une
// campagne, c'est l'ordre de grandeur.
const DISTANCES = [
  'Sur place uniquement',
  "Jusqu'à 5 km",
  "Jusqu'à 10 km",
  "Jusqu'à 20 km",
  "Jusqu'à 30 km",
  "Jusqu'à 50 km",
  'Plus de 50 km',
  'Toute la France',
];

const CANAUX = [
  { cle: 'bouche',   libelle: 'Bouche a oreille',  icone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>' },
  { cle: 'google',   libelle: 'Recherche Google',  icone: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>' },
  { cle: 'reseaux',  libelle: 'Réseaux sociaux',   icone: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>' },
  { cle: 'ads',      libelle: 'Publicité en ligne', icone: '<path d="M3 10v4h4l6 4V6L7 10H3Z"/><path d="M17 9a4 4 0 0 1 0 6"/>' },
  { cle: 'annuaire', libelle: 'Annuaires, Pages Jaunes', icone: '<path d="M4 4h16v16H4z"/><path d="M8 8h8M8 12h8M8 16h5"/>' },
  { cle: 'autres',   libelle: 'Autrement',          icone: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>' },
];

const ETAPES_PREPA = [
  'Enregistrement de vos informations',
  'Vérification de vos connexions',
  'Configuration de votre éditeur',
  'Préparation de votre espace',
];

export async function rendre(page, etat, { terminer }) {
  const { client } = etat;
  const reponses = { ...(etat.profil || {}) };
  let etape = 1;
  const TOTAL = 5;

  const hote = h('div.onb');
  vider(page);

  // Barre fixe en haut : la marque rassure sur l'endroit ou on se
  // trouve, et "Passer" laisse toujours une sortie — un questionnaire
  // sans echappatoire, c'est la porte fermee au nez du client presse.
  page.append(
    h('div.onb-barre',
      h('div.onb-barre-dedans',
        h('p.marque', { html: 'Loc<em>Web</em>' }),
        h('button.bt.bt-nu', { onclick: passer }, 'Passer pour l\'instant'))),
    hote,
  );

  // "Passer" enregistre quand meme ce qui a deja ete saisi et marque
  // l'onboarding comme vu : on ne le represente pas a chaque connexion,
  // tout reste modifiable depuis Parametrage.
  async function passer() {
    try {
      await D.majProfilTolerant(client.id, { ...champsProfil(), complete_le: new Date().toISOString() });
      etat.profil = { ...(etat.profil || {}), complete_le: new Date().toISOString() };
    } catch { souffler("Vos réponses n'ont pas pu être enregistrées.", 'alerte'); }
    await terminer();
  }

  function champsProfil() {
    return {
      secteur: reponses.secteur ?? null,
      metier_precis: reponses.metier_precis ?? null,
      localisation: reponses.localisation ?? null,
      zone_intervention: reponses.zone_intervention ?? null,
      reseaux: reponses.reseaux ?? null,
      objectifs: reponses.objectifs ?? null,
      canaux_actuels: reponses.canaux_actuels ?? null,
    };
  }

  const ECRANS = [etapeMetier, etapeZone, etapeObjectifs, etapePresence, etapeAcquisition];

  function afficher() {
    vider(hote);
    const contenu = ECRANS[etape - 1]();
    hote.append(
      h('p.onb-compteur', `ÉTAPE ${etape} / ${TOTAL}`),
      contenu.titre,
      contenu.sous ? h('p.onb-sous', contenu.sous) : null,
      contenu.corps,
      h('div.onb-pied',
        etape > 1 ? h('button.bt.bt-nu', { onclick: () => { etape--; afficher(); } }, 'Retour') : h('span'),
        h('button.bt.bt-vif', { onclick: suivant }, etape === TOTAL ? 'Terminer' : 'Continuer')),
    );
    hote.scrollIntoView({ block: 'start', behavior: 'instant' });
  }

  function suivant() {
    if (etape < TOTAL) { etape++; afficher(); return; }
    lancerPreparation();
  }

  /* ---------- etape 1 : entreprise ---------- */

  // Une question par ecran : un formulaire de quatre champs d'un coup
  // fait fuir ; la meme chose etalee se remplit sans y penser.

  /* ---------- etape 1 : le metier ---------- */

  function etapeMetier() {
    const saisieMetier = h('input', {
      type: 'text',
      placeholder: exempleMetier(),
      value: reponses.metier_precis ?? '',
    });
    saisieMetier.addEventListener('input', () => {
      reponses.metier_precis = saisieMetier.value || null;
    });

    const cartes = cartesUniques(SECTEURS, 'secteur', (choisi) => {
      // Le placeholder suit le secteur, mais on ne touche jamais a ce
      // que le client a deja tape : ce serait effacer son travail.
      saisieMetier.placeholder = choisi ? choisi.exemple : exempleMetier();
      if (!saisieMetier.value) saisieMetier.focus();
    });

    return {
      titre: h('h1', 'Quel est votre métier ?'),
      sous: "Cela nous sert à proposer les bons mots-clés pour vos campagnes.",
      corps: h('div',
        cartes,
        h('label.champ', { style: { marginTop: '20px', marginBottom: '0' } },
          h('span', 'Votre métier, en un mot'),
          saisieMetier)),
    };
  }

  function exempleMetier() {
    const choisi = SECTEURS.find((s) => s.cle === reponses.secteur);
    return choisi ? choisi.exemple : 'ex : Plombier chauffagiste';
  }

  /* Cartes a choix UNIQUE. Volontairement separe de cartesCochables :
     un choix unique se re-clique pour se deselectionner, et la semantique
     ARIA n'est pas la meme (radio, pas case a cocher). Fusionner les deux
     donnerait une fonction a rallonge pleine de si. */
  function cartesUniques(liste, cle, surChoix) {
    const grille = h('div.onb-choix', { role: 'radiogroup' });
    const cartes = new Map();

    function peindre() {
      cartes.forEach((carte, valeur) => {
        const actif = reponses[cle] === valeur;
        carte.className = actif ? 'choix actif' : 'choix';
        carte.setAttribute('aria-checked', String(actif));
        carte.querySelector('.choix-case').innerHTML = actif ? '&check;' : '';
      });
    }

    liste.forEach((o) => {
      const carte = h('button.choix', {
        type: 'button', role: 'radio',
        onclick: () => {
          // Re-cliquer sur le choix courant l'annule : sans ca, un clic
          // par erreur sur "Restaurateur" serait impossible a defaire.
          reponses[cle] = reponses[cle] === o.cle ? null : o.cle;
          peindre();
          surChoix?.(SECTEURS.find((s) => s.cle === reponses[cle]) || null);
        },
      },
        h('span.choix-icone', h('svg', {
          viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
          'stroke-width': '1.7', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', html: o.icone,
        })),
        h('span.choix-texte', o.libelle),
        h('span.choix-case'));
      cartes.set(o.cle, carte);
      grille.append(carte);
    });

    peindre();
    return grille;
  }

  /* ---------- etape 2 : la zone ---------- */

  function etapeZone() {
    return {
      titre: h('h1', 'Ou intervenez-vous ?'),
      sous: 'Votre ville et le rayon autour duquel vous vous déplacez.',
      corps: h('div.onb-grille',
        champ('Votre ville', 'localisation', 'Nom de votre ville'),
        listeDeroulante("Jusqu'à quelle distance", 'zone_intervention', DISTANCES)),
    };
  }

  /* ---------- etape 3 : presence en ligne ---------- */

  function etapePresence() {
    const corps = h('div',
      h('div.onb-grille',
        champReseau('Facebook', 'facebook'),
        champReseau('Instagram', 'instagram')));

    // Volontairement AUCUN bouton de connexion ici. Le consentement
    // Google est une redirection vers un autre site : declenchee au
    // milieu du questionnaire, elle en ejecte le client, qui revient
    // sur un formulaire vide sans comprendre ce qui s'est passe. La
    // connexion se fait apres, depuis Parametrage, ou l'aller-retour
    // ne fait rien perdre.
    const dejaConnecte = reponses.acces_google_business || reponses.acces_ga4;
    corps.append(h('div.onb-apres',
      h('span.onb-apres-icone', h('svg', {
        viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
        'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
        html: dejaConnecte
          ? '<path d="M20 6 9 17l-5-5"/>'
          : '<circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16h.01"/>',
      })),
      h('div',
        h('b', dejaConnecte ? 'Vos comptes Google sont connectés' : 'Et vos statistiques Google ?'),
        h('p', dejaConnecte
          ? 'Rien à faire ici, vos chiffres remonteront automatiquement.'
          : "Elles se connectent en un clic, juste après. On vous y emmènera."))));

    return {
      titre: h('h1', 'Vos réseaux sociaux'),
      sous: 'Facultatif. Ils apparaîtront dans le pied de page de votre site.',
      corps,
    };
  }

  /* ---------- etape 5 : publicite ---------- */

  function etapeAcquisition() {
    return {
      titre: h('h1', "Comment vos clients vous trouvent-ils aujourd'hui ?"),
      sous: 'Plusieurs réponses possibles. Cela nous dit sur quel canal appuyer en priorité.',
      corps: cartesCochables(CANAUX, 'canaux'),
    };
  }

  /* ---------- etape 2 : objectifs ---------- */

  function etapeObjectifs() {
    return {
      titre: h('h1', 'Que voulez-vous obtenir ?'),
      sous: 'Plusieurs réponses possibles — vous pourrez changer plus tard.',
      corps: cartesCochables(OBJECTIFS, 'objectifs'),
    };
  }

  /* Cartes a selection multiple, partagees par les etapes Objectifs et
     Canaux : meme comportement, seule la liste change. L'etat se lit au
     cadre ET a la coche, jamais a la couleur seule. */
  function cartesCochables(liste, cle) {
    const champ = cle === 'objectifs' ? 'objectifs' : 'canaux_actuels';
    const choisis = new Set(reponses[champ] || []);
    const grille = h('div.onb-choix');

    liste.forEach((o) => {
      const carte = h('button.choix', {
        type: 'button',
        class: choisis.has(o.cle) ? 'choix actif' : 'choix',
        'aria-pressed': String(choisis.has(o.cle)),
        onclick: () => {
          choisis.has(o.cle) ? choisis.delete(o.cle) : choisis.add(o.cle);
          reponses[champ] = [...choisis];
          const actif = choisis.has(o.cle);
          carte.className = actif ? 'choix actif' : 'choix';
          carte.setAttribute('aria-pressed', String(actif));
          carte.querySelector('.choix-case').innerHTML = actif ? '&check;' : '';
        },
      },
        h('span.choix-icone', h('svg', {
          viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
          'stroke-width': '1.7', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', html: o.icone,
        })),
        h('span.choix-texte', o.libelle),
        h('span.choix-case', { html: choisis.has(o.cle) ? '&check;' : '' }));
      grille.append(carte);
    });
    return grille;
  }

  /* ---------- fabriques de champs ---------- */

  function champ(libelle, cle, exemple, type = 'text') {
    const saisie = h('input', { type, placeholder: exemple, value: reponses[cle] ?? '' });
    saisie.addEventListener('input', () => {
      reponses[cle] = saisie.value === '' ? null : (type === 'number' ? Number(saisie.value) : saisie.value);
    });
    return h('label.champ', h('span', libelle), saisie);
  }

  /* Une liste fermee vaut mieux qu'un champ libre quand la reponse sert
     ensuite a cibler : "30km", "30 km", "trente kilometres" et "dept 34"
     sont quatre facons d'ecrire la meme chose, et aucune n'est
     exploitable automatiquement. */
  function listeDeroulante(libelle, cle, options) {
    const saisie = h('select',
      h('option', { value: '' }, 'Choisir...'),
      ...options.map((o) => h('option', { value: o }, o)));
    saisie.value = reponses[cle] || '';
    saisie.addEventListener('change', () => {
      reponses[cle] = saisie.value || null;
    });
    return h('label.champ', h('span', libelle), saisie);
  }

  function champReseau(libelle, cle) {
    const saisie = h('input', { type: 'text', placeholder: `https://${cle}.com/...`, value: reponses.reseaux?.[cle] || '' });
    saisie.addEventListener('input', () => {
      reponses.reseaux = { ...(reponses.reseaux || {}), [cle]: saisie.value || null };
    });
    return h('label.champ', h('span', libelle), saisie);
  }

  function bascule(libelle, cle, aide) {
    const bouton = h('button.bascule', {
      type: 'button',
      class: reponses[cle] ? 'bascule active' : 'bascule',
      'aria-pressed': String(Boolean(reponses[cle])),
      onclick: () => {
        reponses[cle] = !reponses[cle];
        bouton.className = reponses[cle] ? 'bascule active' : 'bascule';
        bouton.setAttribute('aria-pressed', String(Boolean(reponses[cle])));
      },
    }, h('span.bascule-pastille'));

    return h('div.onb-bascule',
      h('div', h('p.onb-bascule-titre', libelle), aide ? h('p.onb-bascule-aide', aide) : null),
      bouton);
  }

  /* ---------- ecran de preparation ---------- */

  async function lancerPreparation() {
    vider(hote);
    const liste = h('div.prepa-liste');
    const lignes = ETAPES_PREPA.map((texte) => {
      const l = h('div.prepa-ligne', h('span.prepa-puce'), h('span', texte));
      liste.append(l);
      return l;
    });

    hote.append(h('div.prepa',
      h('span.prepa-rond'),
      h('h1', 'Préparation de votre espace...'),
      liste));

    // Plancher de 550 ms par etape : sans ca, une connexion rapide fait
    // clignoter les quatre lignes en un eclair et l'utilisateur ne voit
    // rien du tout.
    const avecPlancher = async (travail) => {
      const [resultat] = await Promise.all([travail, new Promise((r) => setTimeout(r, 550))]);
      return resultat;
    };

    let echec = false;

    // 1. Enregistrement du profil. Volontairement tolerant : une colonne
    //    manquante en base ne doit pas faire echouer l'onboarding entier
    //    ni empecher `complete_le` de passer — sinon le questionnaire
    //    revient a chaque connexion.
    lignes[0].classList.add('encours');
    let resultat;
    try {
      resultat = await avecPlancher(D.majProfilTolerant(client.id, {
        ...champsProfil(), complete_le: new Date().toISOString(),
      }));
      marquerLigne(lignes[0], !resultat.ok);
      if (!resultat.ok) echec = true;
      if (resultat.ignores?.length) {
        console.warn('Colonnes absentes en base, ignorées :', resultat.ignores.join(', '));
      }
    } catch { echec = true; marquerLigne(lignes[0], true); }

    // 2. Relecture des connexions (vraie lecture en base)
    lignes[1].classList.add('encours');
    try {
      etat.profil = await avecPlancher(D.monProfil(client.id));
      marquerLigne(lignes[1]);
    } catch { marquerLigne(lignes[1], true); }

    // 3. Chargement reel du contenu editable
    lignes[2].classList.add('encours');
    try {
      await avecPlancher(D.lireContenu(client.id));
      marquerLigne(lignes[2]);
    } catch { marquerLigne(lignes[2], true); }

    // 4. Chargement reel des demandes (alimente la pastille du menu)
    lignes[3].classList.add('encours');
    try {
      await avecPlancher(D.listerDemandes(client.id));
      marquerLigne(lignes[3]);
    } catch { marquerLigne(lignes[3], true); }

    if (echec) {
      souffler("Certaines informations n'ont pas pu être enregistrées.", 'alerte');
    }
    ecranFinal();
  }

  function marquerLigne(ligne, enErreur) {
    ligne.classList.remove('encours');
    ligne.classList.add(enErreur ? 'echoue' : 'faite');
  }

  /* ---------- ecran final ---------- */

  function ecranFinal() {
    vider(hote);

    // L'etape 4 annonce qu'on emmenera le client connecter Google : on
    // tient parole ici. Sans ca la phrase serait un mensonge, et le
    // client se retrouverait avec un tableau de bord vide sans savoir
    // qu'il lui manque une connexion.
    const restentComptes = !reponses.acces_ga4 || !reponses.acces_google_business;

    const allerA = async (hash) => {
      await terminer();
      location.hash = hash;
    };

    hote.append(h('div.prepa',
      h('span.prepa-coche', { html: '&check;' }),
      h('h1', 'Votre espace est prêt'),
      h('p.onb-sous', { style: { textAlign: 'center' } },
        restentComptes
          ? "Dernière chose : connectez Google pour voir vos visites et vos appels. C'est un clic, et c'est ce qui remplit votre tableau de bord."
          : `Le tableau de bord de ${client.nom_site || 'votre entreprise'} est configuré et prêt à l'emploi.`),
      h('div.prepa-boutons',
        restentComptes
          ? h('button.bt.bt-vif', { onclick: () => allerA('#/compte?onglet=connexions') }, 'Connecter Google →')
          : null,
        h('button', {
          class: restentComptes ? 'bt bt-nu' : 'bt bt-vif',
          onclick: terminer,
        }, restentComptes ? 'Plus tard' : 'Accéder à mon tableau de bord →'))));
  }

  afficher();
}
