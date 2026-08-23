// ===================================================================
//  Acquisition — page de presentation + assistant de campagne en 5
//  etapes.
//
//  Ce qui est reel et ce qui ne l'est pas, dit clairement a l'ecran :
//  la campagne est PREPAREE ici (objectif, mots-cles, budget, zone) puis
//  MONTEE A LA MAIN par LocWeb dans Google Ads. L'ecran d'analyse n'est
//  pas une automatisation : c'est la generation locale des mots-cles a
//  partir du metier et de la ville. Le paiement n'est pas branche dans
//  cette version — l'ecran le dit noir sur blanc plutot que de simuler
//  une transaction.
// ===================================================================

import { h, vider, euros, depuis, pastilleEtat, ETATS_CAMPAGNE, souffler, nombre } from './outils.js';
import * as D from './donnees.js';

/* En dessous de ce budget hebdomadaire, une campagne locale ne sort
   pas assez souvent pour produire quoi que ce soit de mesurable — et
   la gestion coute alors plus cher que la publicite elle-meme. On ne
   bloque pas : c'est l'argent du client. On le dit, une fois, et on le
   laisse decider. */
const BUDGET_FAIBLE = 35;

const OBJECTIFS = [
  { cle: 'appels', libelle: "Plus d'appels" },
  { cle: 'devis',  libelle: 'Plus de demandes de devis' },
  { cle: 'rdv',    libelle: 'Plus de rendez-vous' },
  { cle: 'trafic', libelle: 'Plus de visiteurs' },
];

const METHODE = [
  { n: '1', titre: 'Analyse de votre marché',  texte: 'Nous regardons votre métier, votre zone et vos concurrents.' },
  { n: '2', titre: 'Recherche de mots-clés',   texte: 'Nous identifions les recherches de vos clients potentiels.' },
  { n: '3', titre: 'Optimisation du budget',   texte: 'Nous répartissons votre budget sur ce qui convertit le mieux.' },
  { n: '4', titre: 'Lancement et suivi',       texte: 'Nous lançons la campagne et surveillons les résultats.' },
];

const ETAPES_ANALYSE = [
  'Analyse de votre activité',
  'Analyse de la zone géographique',
  'Recherche de mots-clés',
  'Estimation du budget',
  'Préparation de la campagne',
];

export async function rendre(page, etat, { charger, oublier }) {
  const { client } = etat;
  const campagnes = await charger('campagnes', () => D.listerCampagnes(client.id));

  vider(page);
  afficherAccueil();

  /* ---------- page d'accueil de la section ---------- */

  function afficherAccueil() {
    vider(page);
    page.append(
      h('h1', 'Obtenez plus de clients'),
    );

    page.append(h('div.appel-action',
      h('span.appel-icone', h('svg', {
        viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6',
        'stroke-linecap': 'round', 'stroke-linejoin': 'round',
        html: '<path d="m12 3 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"/><path d="M19 15v4M17 17h4"/>',
      })),
      h('p.appel-titre', 'Lancer une campagne Google'),
      h('p.appel-texte', 'Ciblée sur votre métier, votre zone et votre budget.'),
      h('button.bt.bt-vif', { onclick: () => lancerAssistant() }, 'Lancer ma campagne')));

    page.append(h('p.titre-section', 'Comment ça marche'));
    const methode = h('div.methode');
    METHODE.forEach((m) => {
      methode.append(h('div.methode-etape',
        h('span.methode-num', m.n),
        h('p.methode-titre', m.titre),
        h('p.methode-texte', m.texte)));
    });
    page.append(methode);

    if (campagnes.length) {
      page.append(h('p.titre-section', 'Vos campagnes'));
      const liste = h('div.liste-carte');
      campagnes.forEach((c) => liste.append(ligneCampagne(c)));
      page.append(liste);
    }
  }

  function ligneCampagne(c) {
    return h('div.ligne-liste',
      h('div.principal',
        h('strong', c.nom),
        h('span', `${c.zone || 'zone non definie'} · demandée ${depuis(c.date_creation)}`)),
      pastilleEtat(c.statut, ETATS_CAMPAGNE),
      h('span', { style: { fontSize: '.86rem', color: 'var(--sourdine)' } },
        c.budget_mensuel ? `${euros(c.budget_mensuel)}/mois` : ''));
  }

  /* ---------- assistant en 5 etapes ---------- */

  function lancerAssistant() {
    const reponses = {
      objectif: etat.profil?.objectifs?.[0] || 'appels',
      budget_hebdo: 50,
      mots_cles: motsClesInitiaux(),
      zone: zoneTexte(),
    };
    let etape = 1;
    const TOTAL = 5;

    const hote = h('div.onb');
    vider(page);
    // Pas de barre de marque ici : le menu lateral et l'entete sont deja
    // affiches, la repeter ferait trois fois "LocWeb" au meme ecran.
    page.append(
      h('button.lien-retour', { onclick: afficherAccueil }, '← Retour à l\'acquisition'),
      hote);

    const ECRANS = [ecranCampagne, ecranMotsCles, ecranEstimation, null, ecranRecap];

    function afficher() {
      vider(hote);
      const c = ECRANS[etape - 1]();
      hote.append(
        h('p.onb-compteur', `ÉTAPE ${etape} / ${TOTAL}`),
        h('h1', c.titre),
        c.sous ? h('p.onb-sous', c.sous) : null,
        c.corps,
        h('div.onb-pied',
          etape > 1 ? h('button.bt.bt-nu', { onclick: reculer }, 'Retour') : h('span'),
          h('button.bt.bt-vif', { onclick: avancer }, c.action || 'Continuer')));
    }

    function reculer() {
      etape -= (etape === 5 ? 2 : 1); // l'ecran 4 est l'analyse, on ne le rejoue pas
      afficher();
    }

    function avancer() {
      if (etape === 3) { etape = 4; lancerAnalyse(); return; }
      if (etape === TOTAL) { enregistrer(); return; }
      etape++;
      afficher();
    }

    /* --- etape 1 : la campagne --- */

    function ecranCampagne() {
      const corps = h('div');

      corps.append(h('div.recap-ligne',
        blocInfo('Activité', etat.profil?.metier_precis || client.metier || 'Non renseignée'),
        blocInfo('Zone', reponses.zone),
        blocInfo('Budget conseille', '50 EUR / semaine')));

      corps.append(h('p.champ-titre', 'Votre objectif principal'));
      const choix = h('div.onb-choix');
      OBJECTIFS.forEach((o) => {
        const carte = h('button.choix', {
          type: 'button',
          class: reponses.objectif === o.cle ? 'choix actif' : 'choix',
          onclick: () => {
            reponses.objectif = o.cle;
            [...choix.children].forEach((el, i) => {
              el.className = OBJECTIFS[i].cle === o.cle ? 'choix actif' : 'choix';
              el.querySelector('.choix-radio').className = OBJECTIFS[i].cle === o.cle ? 'choix-radio actif' : 'choix-radio';
            });
          },
        },
          h('span.choix-radio', { class: reponses.objectif === o.cle ? 'choix-radio actif' : 'choix-radio' }),
          h('span.choix-texte', o.libelle));
        choix.append(carte);
      });
      corps.append(choix);

      const budget = h('input', { type: 'number', min: '10', step: '10', value: reponses.budget_hebdo });
      const alerte = h('p.avertissement', { hidden: true },
        `En dessous de ${BUDGET_FAIBLE} EUR par semaine, votre annonce sort trop rarement pour donner des résultats visibles. Vous pouvez continuer, mais nous préférons vous le dire avant.`);
      const verifier = () => { alerte.hidden = !(reponses.budget_hebdo && reponses.budget_hebdo < BUDGET_FAIBLE); };
      budget.addEventListener('input', () => {
        reponses.budget_hebdo = Number(budget.value) || 0;
        verifier();
      });
      verifier();
      corps.append(h('label.champ', { style: { marginTop: '22px' } },
        h('span', 'Votre budget (EUR / semaine)'), budget), alerte);

      return {
        titre: 'Votre campagne',
        sous: 'Voici ce que nous savons déjà de votre activité.',
        corps,
      };
    }

    /* --- etape 2 : mots-cles --- */

    function ecranMotsCles() {
      const corps = h('div');
      const zonePuces = h('div.puces');

      function redessiner() {
        vider(zonePuces);
        reponses.mots_cles.forEach((m, i) => {
          zonePuces.append(h('span.puce', m,
            h('button.puce-x', { onclick: () => { reponses.mots_cles.splice(i, 1); redessiner(); } }, '×')));
        });
      }
      redessiner();
      corps.append(zonePuces);

      const saisie = h('input', { type: 'text', placeholder: 'Ajouter un mot-clé' });
      const ajouter = () => {
        const v = saisie.value.trim().toLowerCase();
        if (!v) return;
        if (reponses.mots_cles.includes(v)) { souffler('Ce mot-clé est déjà dans la liste.', 'veille'); return; }
        reponses.mots_cles.push(v);
        saisie.value = '';
        redessiner();
      };
      saisie.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); ajouter(); } });

      corps.append(h('div.ajout-ligne', saisie, h('button.bt.bt-plein', { onclick: ajouter }, 'Ajouter')));

      const restantes = suggestions().filter((s) => !reponses.mots_cles.includes(s));
      if (restantes.length) {
        corps.append(h('p.champ-titre', { style: { marginTop: '22px' } }, 'Suggestions'));
        const sugg = h('div.suggestions');
        restantes.forEach((s) => {
          sugg.append(h('button.suggestion', {
            onclick: (e) => {
              reponses.mots_cles.push(s);
              e.target.remove();
              redessiner();
            },
          }, `+ ${s}`));
        });
        corps.append(sugg);
      }

      return {
        titre: 'Mots-clés',
        sous: 'Nous ciblons les recherches les plus pertinentes pour votre activité.',
        corps,
      };
    }

    /* --- etape 3 : estimation --- */

    function ecranEstimation() {
      const m = ESTIMATION[etat.profil?.secteur] || ESTIMATION.artisan;
      const b = reponses.budget_hebdo || 0;
      const clicsMin = Math.floor(b / m.cpc[1]);
      const clicsMax = Math.floor(b / m.cpc[0]);
      const demMin = Math.round(clicsMin * m.conversion[0]);
      const demMax = Math.round(clicsMax * m.conversion[1]);

      const corps = h('div');
      corps.append(h('div.recap-ligne',
        blocInfo('Budget', `${nombre(b)} EUR / sem.`),
        blocInfo('Objectif', OBJECTIFS.find((o) => o.cle === reponses.objectif)?.libelle || '—'),
        blocInfo('Zone', reponses.zone)));

      corps.append(h('div.estim-duo',
        h('div.estim',
          h('p.estim-val', clicsMin === clicsMax ? nombre(clicsMin) : `${nombre(clicsMin)}–${nombre(clicsMax)}`),
          h('p.estim-etiq', 'visites potentielles / semaine')),
        h('div.estim',
          h('p.estim-val', demMin === demMax ? nombre(demMin) : `${nombre(demMin)}–${nombre(demMax)}`),
          h('p.estim-etiq', `${m.unite} / semaine`))));

      corps.append(h('p.note-prudence',
        `Ordres de grandeur pour ce type d'activité, pas une garantie. ${m.reserve}`));

      return {
        titre: 'Estimation de votre campagne',
        sous: 'Une fourchette réaliste — pas une garantie.',
        corps,
        action: 'Préparer ma campagne',
      };
    }

    /* --- etape 4 : ecran d'analyse --- */

    function lancerAnalyse() {
      vider(hote);
      const liste = h('div.prepa-liste');
      const lignes = ETAPES_ANALYSE.map((t) => {
        const l = h('div.prepa-ligne', h('span.prepa-puce'), h('span', t));
        liste.append(l);
        return l;
      });
      hote.append(h('div.prepa', h('span.prepa-rond'), h('h1', 'Analyse de votre activité...'), liste));

      // Chaque etape correspond a un vrai calcul local (croisement
      // metier x ville, estimation budgetaire). C'est rapide, d'ou le
      // rythme impose pour que l'oeil puisse suivre.
      let i = 0;
      const avancer = () => {
        if (i > 0) { lignes[i - 1].classList.remove('encours'); lignes[i - 1].classList.add('faite'); }
        if (i >= lignes.length) { setTimeout(ecranPret, 400); return; }
        lignes[i].classList.add('encours');
        i++;
        setTimeout(avancer, 620);
      };
      avancer();
    }

    function ecranPret() {
      vider(hote);
      const liste = h('div.prepa-liste');
      ETAPES_ANALYSE.forEach((t) => liste.append(h('div.prepa-ligne.faite', h('span.prepa-puce'), h('span', t))));
      hote.append(h('div.prepa',
        h('span.prepa-coche', { html: '&check;' }),
        h('h1', 'Votre campagne est prête.'),
        liste,
        h('button.bt.bt-vif', { style: { marginTop: '26px' }, onclick: () => { etape = 5; afficher(); } },
          'Voir le récapitulatif')));
    }

    /* --- etape 5 : recapitulatif --- */

    function ecranRecap() {
      const GESTION = 49;
      const PAS = 10;
      const MINI = 10;
      const corps = h('div');

      // Le budget se regle ICI, pas seulement a l'etape 1. C'est en
      // voyant le total, gestion comprise, qu'on realise si la somme
      // passe — et devoir remonter trois ecrans pour ajuster de 10 EUR
      // fait abandonner.
      const tableau = h('div.recap-tableau');

      const moins = h('button.bt-pas', { type: 'button', 'aria-label': 'Baisser le budget' }, '−');
      const plus = h('button.bt-pas', { type: 'button', 'aria-label': 'Augmenter le budget' }, '+');
      const valeur = h('span.budget-val');
      const reglage = h('div.budget-reglage', moins, valeur, plus);

      const bouger = (delta) => {
        const nouveauB = Math.max(MINI, (reponses.budget_hebdo || 0) + delta);
        reponses.budget_hebdo = nouveauB;
        peindre();
      };
      moins.addEventListener('click', () => bouger(-PAS));
      plus.addEventListener('click', () => bouger(PAS));

      const parSemaine = h('p.aide', { style: { marginTop: '10px' } });
      const alerte = h('p.avertissement', { hidden: true },
        `En dessous de ${BUDGET_FAIBLE} EUR par semaine, votre annonce sort trop rarement pour donner des résultats visibles.`);

      function peindre() {
        const b = reponses.budget_hebdo || 0;
        const mensuel = b * 4;
        valeur.textContent = `${nombre(mensuel)} EUR / mois`;
        moins.disabled = b <= MINI;
        parSemaine.textContent =
          `Soit ${nombre(b)} EUR par semaine. Ajustable à tout moment, même après le lancement.`;
        alerte.hidden = !(b && b < BUDGET_FAIBLE);

        vider(tableau);
        tableau.append(
          ligneRecap('Campagne', OBJECTIFS.find((o) => o.cle === reponses.objectif)?.libelle || '—'),
          ligneRecap('Budget publicitaire', reglage),
          ligneRecap('Prestation de gestion LocWeb', `${GESTION} EUR / mois`),
          ligneRecap('Total', `${nombre(mensuel + GESTION)} EUR / mois`, true));
      }
      peindre();
      corps.append(tableau);

      corps.append(parSemaine, alerte);

      corps.append(h('p.note-prudence',
        "Aucun paiement n'est effectué depuis cette page. Après validation, nous vous recontactons pour finaliser la mise en place de la campagne dans Google Ads."));

      return {
        titre: 'Récapitulatif',
        sous: 'Vérifiez les informations avant de nous envoyer votre demande.',
        corps,
        action: 'Envoyer ma demande',
      };
    }

    function ligneRecap(libelle, valeur, fort) {
      return h('div.recap-tableau-ligne', { class: fort ? 'recap-tableau-ligne fort' : 'recap-tableau-ligne' },
        h('span', libelle), h('span', valeur));
    }

    /* --- enregistrement final --- */

    async function enregistrer() {
      const b = reponses.budget_hebdo || 0;
      try {
        await D.demanderCampagne(client.id, {
          nom: `${OBJECTIFS.find((o) => o.cle === reponses.objectif)?.libelle || 'Campagne'} — ${reponses.zone}`,
          objectif: reponses.objectif,
          budget_mensuel: b * 4,
          zone: reponses.zone,
          mots_cles: reponses.mots_cles,
        });
        oublier('campagnes');
        souffler('Demande envoyée — on revient vers vous rapidement.', 'bien');
      } catch (err) {
        // La vraie cause va dans la console : "Envoi impossible" ne dit
        // rien a Nico quand un client l'appelle pour signaler le
        // probleme, et c'est justement la qu'il faut pouvoir trancher
        // entre un souci de reseau et un refus de la base.
        console.error('Demande de campagne refusée :', err);
        souffler("Envoi impossible. Réessayez ou contactez-nous.", 'alerte');
        return;
      }
      campagnes.unshift({
        nom: `${OBJECTIFS.find((o) => o.cle === reponses.objectif)?.libelle} — ${reponses.zone}`,
        statut: 'demandee', zone: reponses.zone, budget_mensuel: b * 4,
        date_creation: new Date().toISOString(),
      });
      afficherAccueil();
    }

    afficher();
  }

  /* ---------- aides ---------- */

  function zoneTexte() {
    const ville = etat.profil?.localisation || client.ville;
    const zone = etat.profil?.zone_intervention;
    if (ville && zone) return `${ville} · ${zone}`;
    return ville || zone || 'Zone à définir';
  }

  /* Les mots-cles dependent du metier, pas d'un moule unique.

     "depannage snack" et "devis snack" ne veulent rien dire : personne
     ne demande un devis pour un kebab. Un restaurateur se cherche par
     "a emporter", "livraison", "ouvert le dimanche" ; un artisan par
     "urgence" et "devis". Proposer les mauvais mots-cles decredibilise
     tout l'assistant, et un client qui les valide paie des clics qui
     n'aboutiront jamais. */
  /* Estimation par secteur.

     Un meme budget ne produit pas du tout le meme resultat selon le
     metier, et pas seulement parce que le taux de conversion change :

     1. Le cout du clic. "plombier urgence" se dispute a prix d'or entre
        artisans ; "snack fleurie" ne se dispute presque pas.
     2. Le taux. Chercher un restaurant, c'est deja vouloir manger. Un
        devis de charpente se compare pendant des semaines.
     3. L'unite mesuree. Un artisan remplit un formulaire, on le compte.
        Un client de snack appelle, ou pousse la porte — ca n'apparait
        jamais dans les demandes du site.

     Ces fourchettes sont des ordres de grandeur poses a la main, pas
     des donnees mesurees. Elles seront a recalibrer sur les vraies
     campagnes une fois qu'il y en aura assez dans la table `campagnes`. */
  const ESTIMATION = {
    restaurateur: {
      cpc: [0.40, 1.10],
      conversion: [0.15, 0.35],
      unite: 'appels ou commandes',
      reserve: "La plupart des clients appellent ou passent directement : ces contacts n'apparaitront pas dans vos demandes en ligne.",
    },
    artisan: {
      cpc: [1.20, 2.50],
      conversion: [0.03, 0.08],
      unite: 'demandes de devis',
      reserve: 'Un devis se compare : le contact arrive souvent plusieurs jours apres le clic.',
    },
    independant: {
      cpc: [0.80, 2.00],
      conversion: [0.05, 0.15],
      unite: 'prises de contact',
      reserve: 'Une partie des contacts passera par le telephone plutot que par le formulaire.',
    },
  };
  ESTIMATION.autre = ESTIMATION.independant;

  const MODELES = {
    restaurateur: {
      initiaux: (b, v) => [b, `${b} ${v}`, `restaurant ${v}`],
      suggestions: (b, v) => [
        `${b} a emporter ${v}`,
        `livraison ${b} ${v}`,
        `${b} ouvert ${v}`,
        `meilleur ${b} ${v}`,
        `commander ${b} ${v}`,
      ],
    },
    artisan: {
      initiaux: (b, v) => [b, `${b} ${v}`, `${b} urgence ${v}`],
      suggestions: (b, v) => [
        `depannage ${b} ${v}`,
        `devis ${b} ${v}`,
        `${b} pas cher ${v}`,
        `${b} rapide ${v}`,
      ],
    },
    independant: {
      initiaux: (b, v) => [b, `${b} ${v}`, `${b} pres de moi`],
      suggestions: (b, v) => [
        `${b} ${v} tarif`,
        `prendre rendez-vous ${b} ${v}`,
        `meilleur ${b} ${v}`,
        `${b} a domicile ${v}`,
      ],
    },
  };
  MODELES.autre = MODELES.independant;

  function modele() {
    return MODELES[etat.profil?.secteur] || MODELES.artisan;
  }

  function racine() {
    const metier = (etat.profil?.metier_precis || client.metier || '').toLowerCase();
    const ville = (etat.profil?.localisation || client.ville || '').toLowerCase();
    return { base: metier.split(/[\/,]/)[0].trim(), ville };
  }

  function nettoyer(liste) {
    return liste
      .map((m) => m.replace(/\s+/g, ' ').trim())
      .filter((m, i, t) => m && t.indexOf(m) === i);
  }

  function motsClesInitiaux() {
    const { base, ville } = racine();
    if (!base) return [];
    return nettoyer(modele().initiaux(base, ville));
  }

  function suggestions() {
    const { base, ville } = racine();
    if (!base) return [];
    return nettoyer(modele().suggestions(base, ville));
  }

  function blocInfo(libelle, valeur) {
    return h('div.bloc-info', h('p.bloc-info-etiq', libelle), h('p.bloc-info-val', valeur));
  }
}
