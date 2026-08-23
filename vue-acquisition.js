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

const OBJECTIFS = [
  { cle: 'appels', libelle: "Plus d'appels" },
  { cle: 'devis',  libelle: 'Plus de demandes de devis' },
  { cle: 'rdv',    libelle: 'Plus de rendez-vous' },
  { cle: 'trafic', libelle: 'Plus de visiteurs' },
];

const METHODE = [
  { n: '1', titre: 'Analyse de votre marche',  texte: 'Nous regardons votre metier, votre zone et vos concurrents.' },
  { n: '2', titre: 'Recherche de mots-cles',   texte: 'Nous identifions les recherches de vos clients potentiels.' },
  { n: '3', titre: 'Optimisation du budget',   texte: 'Nous repartissons votre budget sur ce qui convertit le mieux.' },
  { n: '4', titre: 'Lancement et suivi',       texte: 'Nous lancons la campagne et surveillons les resultats.' },
];

const ETAPES_ANALYSE = [
  'Analyse de votre activite',
  'Analyse de la zone geographique',
  'Recherche de mots-cles',
  'Estimation du budget',
  'Preparation de la campagne',
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
      h('p.sous-titre', 'Nous vous aidons a attirer de nouveaux clients grace a votre presence en ligne.'),
    );

    page.append(h('div.appel-action',
      h('span.appel-icone', h('svg', {
        viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6',
        'stroke-linecap': 'round', 'stroke-linejoin': 'round',
        html: '<path d="m12 3 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"/><path d="M19 15v4M17 17h4"/>',
      })),
      h('p.appel-titre', 'Pret a attirer plus de clients ?'),
      h('p.appel-texte', "Une campagne Google Ads pensee pour votre activite, votre zone et votre budget. En 5 etapes simples."),
      h('button.bt.bt-vif', { onclick: () => lancerAssistant() }, 'Lancer ma campagne')));

    page.append(h('p.titre-section', 'Comment ca marche'));
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
        h('span', `${c.zone || 'zone non definie'} · demandee ${depuis(c.date_creation)}`)),
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
      h('button.lien-retour', { onclick: afficherAccueil }, '← Retour a l\'acquisition'),
      hote);

    const ECRANS = [ecranCampagne, ecranMotsCles, ecranEstimation, null, ecranRecap];

    function afficher() {
      vider(hote);
      const c = ECRANS[etape - 1]();
      hote.append(
        h('p.onb-compteur', `ETAPE ${etape} / ${TOTAL}`),
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
        blocInfo('Activite', etat.profil?.metier_precis || client.metier || 'Non renseignee'),
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
      budget.addEventListener('input', () => { reponses.budget_hebdo = Number(budget.value) || 0; });
      corps.append(h('label.champ', { style: { marginTop: '22px' } },
        h('span', 'Votre budget (EUR / semaine)'), budget));

      return {
        titre: 'Votre campagne',
        sous: 'Voici ce que nous savons deja de votre activite.',
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

      const saisie = h('input', { type: 'text', placeholder: 'Ajouter un mot-cle' });
      const ajouter = () => {
        const v = saisie.value.trim().toLowerCase();
        if (!v) return;
        if (reponses.mots_cles.includes(v)) { souffler('Ce mot-cle est deja dans la liste.', 'veille'); return; }
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
        titre: 'Mots-cles',
        sous: 'Nous ciblons les recherches les plus pertinentes pour votre activite.',
        corps,
      };
    }

    /* --- etape 3 : estimation --- */

    function ecranEstimation() {
      // Fourchette calculee a partir du budget avec un cout par clic
      // typique pour un artisan local (1,20 EUR a 2,50 EUR) et un taux de
      // conversion de 3 a 8 %. Ce sont des ordres de grandeur, pas une
      // promesse — l'ecran le dit explicitement.
      const b = reponses.budget_hebdo || 0;
      const clicsMin = Math.floor(b / 2.5);
      const clicsMax = Math.floor(b / 1.2);
      const demMin = Math.max(0, Math.round(clicsMin * 0.03));
      const demMax = Math.max(clicsMax ? 1 : 0, Math.round(clicsMax * 0.08));

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
          h('p.estim-etiq', 'demandes potentielles / semaine'))));

      corps.append(h('p.note-prudence',
        "Ces chiffres sont des estimations basees sur des campagnes comparables dans votre metier. Ils ne constituent pas une garantie de resultat."));

      return {
        titre: 'Estimation de votre campagne',
        sous: 'Une fourchette realiste — pas une garantie.',
        corps,
        action: 'Preparer ma campagne',
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
      hote.append(h('div.prepa', h('span.prepa-rond'), h('h1', 'Analyse de votre activite...'), liste));

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
        h('h1', 'Votre campagne est prete.'),
        liste,
        h('button.bt.bt-vif', { style: { marginTop: '26px' }, onclick: () => { etape = 5; afficher(); } },
          'Voir le recapitulatif')));
    }

    /* --- etape 5 : recapitulatif --- */

    function ecranRecap() {
      const b = reponses.budget_hebdo || 0;
      const mensuel = b * 4;
      const gestion = 49;
      const corps = h('div');

      corps.append(h('div.recap-tableau',
        ligneRecap('Campagne', OBJECTIFS.find((o) => o.cle === reponses.objectif)?.libelle || '—'),
        ligneRecap('Budget publicitaire', `${nombre(mensuel)} EUR / mois`),
        ligneRecap('Prestation de gestion LocWeb', `${gestion} EUR / mois`),
        ligneRecap('Total', `${nombre(mensuel + gestion)} EUR / mois`, true)));

      corps.append(h('p.note-prudence',
        "Aucun paiement n'est effectue depuis cette page. Apres validation, nous vous recontactons pour finaliser la mise en place de la campagne dans Google Ads."));

      return {
        titre: 'Recapitulatif',
        sous: 'Verifiez les informations avant de nous envoyer votre demande.',
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
        souffler('Demande envoyee — on revient vers vous rapidement.', 'bien');
      } catch {
        souffler("Envoi impossible. Reessayez ou contactez-nous.", 'alerte');
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
    return ville || zone || 'Zone a definir';
  }

  function motsClesInitiaux() {
    const metier = (etat.profil?.metier_precis || client.metier || '').toLowerCase();
    const ville = (etat.profil?.localisation || client.ville || '').toLowerCase();
    if (!metier) return [];
    const base = metier.split(/[\/,]/)[0].trim();
    return [base, `${base} ${ville}`.trim(), `${base} urgence ${ville}`.trim()]
      .filter((m, i, t) => m && t.indexOf(m) === i);
  }

  function suggestions() {
    const metier = (etat.profil?.metier_precis || client.metier || '').toLowerCase();
    const ville = (etat.profil?.localisation || client.ville || '').toLowerCase();
    if (!metier) return [];
    const base = metier.split(/[\/,]/)[0].trim();
    return [
      `depannage ${base} ${ville}`.trim(),
      `${base} pas cher ${ville}`.trim(),
      `devis ${base} ${ville}`.trim(),
      `${base} rapide ${ville}`.trim(),
    ].filter(Boolean);
  }

  function blocInfo(libelle, valeur) {
    return h('div.bloc-info', h('p.bloc-info-etiq', libelle), h('p.bloc-info-val', valeur));
  }
}
