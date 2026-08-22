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

const ETAPES_PREPA = [
  'Enregistrement de vos informations',
  'Verification de vos connexions',
  'Configuration de votre editeur',
  'Preparation de votre espace',
];

export async function rendre(page, etat, { router, rafraichirPastille }) {
  const { client } = etat;
  const reponses = { ...(etat.profil || {}) };
  let etape = 1;
  const TOTAL = 5;

  const hote = h('div.onb');
  vider(page);
  page.append(hote);

  const ECRANS = [etapeEntreprise, etapeActivite, etapePresence, etapeObjectifs, etapeAcquisition];

  function afficher() {
    vider(hote);
    const contenu = ECRANS[etape - 1]();
    hote.append(
      h('p.onb-compteur', `ETAPE ${etape} / ${TOTAL}`),
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

  function etapeEntreprise() {
    const secteur = champ('Secteur / activite', 'secteur', 'ex : Artisanat du batiment');
    const metier = champ('Metier', 'metier_precis', 'ex : Plomberie / Chauffage');
    const localisation = champ('Localisation', 'localisation', 'ex : Beziers');
    const zone = champ("Zone d'intervention", 'zone_intervention', 'ex : rayon de 30 km');
    return {
      titre: h('h1', 'Votre entreprise'),
      sous: 'Verifions les informations de votre entreprise.',
      corps: h('div.onb-grille', secteur, metier, localisation, zone),
    };
  }

  /* ---------- etape 2 : activite ---------- */

  function etapeActivite() {
    return {
      titre: h('h1', 'Votre activite'),
      sous: 'Ces chiffres nous aident a mieux comprendre votre entreprise. Rien n\'est obligatoire.',
      corps: h('div.onb-grille',
        champ("Nombre d'employes", 'nb_employes', 'ex : 4', 'number'),
        champ('Clients par mois', 'clients_par_mois', 'ex : 25', 'number'),
        champ('Panier moyen (EUR)', 'panier_moyen', 'ex : 450', 'number'),
        champ("Chiffre d'affaires mensuel (EUR)", 'ca_mensuel', 'ex : 11000', 'number'),
        champ("Objectif de chiffre d'affaires (EUR)", 'objectif_ca', 'ex : 15000', 'number')),
    };
  }

  /* ---------- etape 3 : presence en ligne ---------- */

  function etapePresence() {
    const corps = h('div.onb-grille',
      champ('Site internet', 'site_internet', client.domaine || 'ex : monsite.fr'),
      champReseau('Facebook', 'facebook'),
      champReseau('Instagram', 'instagram'));

    corps.append(
      ligneConnexion('Google Business Profile', reponses.acces_google_business),
      ligneConnexion('Google Analytics', reponses.acces_ga4));

    return {
      titre: h('h1', 'Votre presence en ligne'),
      sous: 'Vous pourrez connecter vos comptes Google maintenant ou plus tard, depuis Parametrage.',
      corps,
    };
  }

  /* ---------- etape 4 : objectifs ---------- */

  function etapeObjectifs() {
    const choisis = new Set(reponses.objectifs || []);
    const grille = h('div.onb-choix');
    OBJECTIFS.forEach((o) => {
      const carte = h('button.choix', {
        type: 'button',
        class: choisis.has(o.cle) ? 'choix actif' : 'choix',
        onclick: () => {
          choisis.has(o.cle) ? choisis.delete(o.cle) : choisis.add(o.cle);
          reponses.objectifs = [...choisis];
          carte.className = choisis.has(o.cle) ? 'choix actif' : 'choix';
          carte.querySelector('.choix-case').innerHTML = choisis.has(o.cle) ? '&check;' : '';
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
    return {
      titre: h('h1', 'Vos objectifs'),
      sous: 'Selectionnez ce qui compte le plus pour vous — vous pourrez changer plus tard.',
      corps: grille,
    };
  }

  /* ---------- etape 5 : acquisition ---------- */

  function etapeAcquisition() {
    const corps = h('div.onb-grille');
    corps.append(
      bascule('Avez-vous deja fait de la publicite ?', 'deja_fait_pub',
        'Google Ads, Meta Ads, Instagram...'),
      champ('Budget publicitaire mensuel (EUR)', 'budget_pub_mensuel', 'ex : 300', 'number'),
      bascule('Google Ads', 'utilise_google_ads'),
      bascule('Meta Ads (Facebook / Instagram)', 'utilise_meta_ads'));
    return {
      titre: h('h1', 'Votre acquisition'),
      sous: 'Quelques informations pour preparer vos futures campagnes.',
      corps,
    };
  }

  /* ---------- fabriques de champs ---------- */

  function champ(libelle, cle, exemple, type = 'text') {
    const saisie = h('input', { type, placeholder: exemple, value: reponses[cle] ?? '' });
    saisie.addEventListener('input', () => {
      reponses[cle] = saisie.value === '' ? null : (type === 'number' ? Number(saisie.value) : saisie.value);
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

  function ligneConnexion(libelle, connecte) {
    return h('div.onb-connexion',
      h('span.onb-connexion-nom', libelle),
      connecte
        ? h('span.etat', { 'data-ton': 'bien' }, 'Connecte')
        : h('a.bt.bt-plein.bt-mini', { href: '#/parametrage' }, '+ Connecter'));
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
      h('h1', 'Preparation de votre espace...'),
      liste));

    // Plancher de 550 ms par etape : sans ca, une connexion rapide fait
    // clignoter les quatre lignes en un eclair et l'utilisateur ne voit
    // rien du tout.
    const avecPlancher = async (travail) => {
      const [resultat] = await Promise.all([travail, new Promise((r) => setTimeout(r, 550))]);
      return resultat;
    };

    let echec = false;

    // 1. Enregistrement reel du profil
    lignes[0].classList.add('encours');
    try {
      await avecPlancher(D.majProfil(client.id, {
        secteur: reponses.secteur ?? null,
        metier_precis: reponses.metier_precis ?? null,
        localisation: reponses.localisation ?? null,
        zone_intervention: reponses.zone_intervention ?? null,
        nb_employes: reponses.nb_employes ?? null,
        clients_par_mois: reponses.clients_par_mois ?? null,
        panier_moyen: reponses.panier_moyen ?? null,
        ca_mensuel: reponses.ca_mensuel ?? null,
        objectif_ca: reponses.objectif_ca ?? null,
        site_internet: reponses.site_internet ?? null,
        reseaux: reponses.reseaux ?? null,
        objectifs: reponses.objectifs ?? null,
        deja_fait_pub: reponses.deja_fait_pub ?? null,
        budget_pub_mensuel: reponses.budget_pub_mensuel ?? null,
        utilise_google_ads: reponses.utilise_google_ads ?? null,
        utilise_meta_ads: reponses.utilise_meta_ads ?? null,
        complete_le: new Date().toISOString(),
      }));
      terminer(lignes[0]);
    } catch { echec = true; terminer(lignes[0], true); }

    // 2. Relecture des connexions (vraie lecture en base)
    lignes[1].classList.add('encours');
    try {
      etat.profil = await avecPlancher(D.monProfil(client.id));
      terminer(lignes[1]);
    } catch { terminer(lignes[1], true); }

    // 3. Chargement reel du contenu editable
    lignes[2].classList.add('encours');
    try {
      await avecPlancher(D.lireContenu(client.id));
      terminer(lignes[2]);
    } catch { terminer(lignes[2], true); }

    // 4. Chargement reel des demandes (alimente la pastille du menu)
    lignes[3].classList.add('encours');
    try {
      await avecPlancher(D.listerDemandes(client.id));
      terminer(lignes[3]);
    } catch { terminer(lignes[3], true); }

    if (echec) {
      souffler("Certaines informations n'ont pas pu etre enregistrees.", 'alerte');
    }
    ecranFinal();
  }

  function terminer(ligne, enErreur) {
    ligne.classList.remove('encours');
    ligne.classList.add(enErreur ? 'echoue' : 'faite');
  }

  /* ---------- ecran final ---------- */

  function ecranFinal() {
    vider(hote);
    hote.append(h('div.prepa',
      h('span.prepa-coche', { html: '&check;' }),
      h('h1', 'Votre espace est pret'),
      h('p.onb-sous', { style: { textAlign: 'center' } },
        `Le tableau de bord de ${client.nom_site || 'votre entreprise'} est configure et pret a l'emploi.`),
      h('button.bt.bt-vif', {
        style: { marginTop: '22px' },
        onclick: async () => { location.hash = '#/accueil'; await router(); rafraichirPastille(); },
      }, 'Acceder a mon tableau de bord →')));
  }

  afficher();
}
