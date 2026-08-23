// ===================================================================
//  Performances — les vraies statistiques GA4.
//
//  Choix de fond : un seul graphique dans le temps (les visiteurs).
//  Visiteurs, sessions et pages vues mesurent le meme trafic, donc
//  leurs courbes se ressemblent forcement — trois fois le meme dessin
//  n'apprend rien. La place est donnee aux repartitions (appareil,
//  ville, pages, jours), qui disent chacune quelque chose de different.
// ===================================================================

import {
  h, vider, nombre, grapheComplet, camembert, souffler, EXPLICATIONS, avecAide,
} from './outils.js';
import * as D from './donnees.js';

const PERIODES = [
  { cle: '24h', libelle: '24 h',     compare: 'la veille' },
  { cle: '7j',  libelle: '7 jours',  compare: 'les 7 jours precedents' },
  { cle: '30j', libelle: '30 jours', compare: 'les 30 jours precedents' },
];

const METRIQUES = [
  { cle: 'visiteurs',       libelle: 'Visiteurs',         icone: 'personnes' },
  { cle: 'pages_vues',      libelle: 'Pages vues',        icone: 'page' },
  { cle: 'duree_moyenne',   libelle: 'Duree moyenne',     icone: 'horloge', duree: true },
  { cle: 'taux_engagement', libelle: "Taux d'engagement", icone: 'cible',   pourcent: true },
];

const ICONES = {
  personnes: '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.3 2.9-5.8 6.5-5.8s6.5 2.5 6.5 5.8"/><circle cx="17.5" cy="7.5" r="2.4"/><path d="M16 13.6c2.6.5 4.5 2.7 4.5 5.6"/>',
  page:      '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
  horloge:   '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  cible:     '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".8" fill="currentColor" stroke="none"/>',
};

const JOURS_SEMAINE = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const APPAREILS = { mobile: 'Telephone', desktop: 'Ordinateur', tablet: 'Tablette' };

export async function rendre(page, etat) {
  vider(page);
  page.append(h('h1', 'Performances'));

  if (!etat.profil?.acces_ga4) {
    page.append(carteVide(
      'Connectez Google Analytics pour voir vos statistiques',
      'Rendez-vous dans Parametrage pour connecter votre compte Google en un clic.',
      h('a.bt.bt-vif', { href: '#/parametrage' }, 'Aller au parametrage')));
    return;
  }

  const onglets = h('div.onglets-periode');
  const zone = h('div');
  let periodeActive = '7j';

  PERIODES.forEach((p) => {
    onglets.append(h('button', {
      class: p.cle === periodeActive ? 'onglet actif' : 'onglet',
      onclick: () => {
        periodeActive = p.cle;
        [...onglets.children].forEach((b, i) => { b.className = PERIODES[i].cle === p.cle ? 'onglet actif' : 'onglet'; });
        charger(p);
      },
    }, p.libelle));
  });

  page.append(h('div.barre-outils', onglets), zone);

  async function charger(periode) {
    // Le squelette reprend exactement la structure et les hauteurs du
    // contenu final : sans ca, la page sursaute au moment ou les
    // donnees arrivent et remplacent des blocs plus courts.
    vider(zone);
    const attenteSite = blocPliable('Performance de votre site');
    attenteSite.corps.append(
      h('div.grille-kpi', ...METRIQUES.map(() => h('div.squelette.sq-kpi'))),
      h('div.squelette.sq-graphe'),
      h('div.grille-duo', h('div.squelette.sq-carte'), h('div.squelette.sq-carte')));
    zone.append(attenteSite.bloc);

    let r;
    try {
      r = await D.statsGa4(periode.cle);
    } catch (err) {
      const messageErreur = err.donnees?.error || err.message || '';
      if (messageErreur) {
        vider(zone);
        const manqueId = messageErreur === 'ID de propriete GA4 non renseigne.';
        zone.append(carteVide(
          manqueId ? "Il manque l'identifiant de votre propriete Analytics" : 'Statistiques momentanement indisponibles',
          manqueId
            ? 'Renseignez-le dans Parametrage — dans GA4 : Admin puis Parametres de la propriete.'
            : 'Reessayez dans quelques instants. Si ca persiste, contactez-nous.',
          manqueId ? h('a.bt.bt-vif', { href: '#/parametrage' }, 'Aller au parametrage') : null));
        return;
      }
      vider(zone);
      zone.append(carteVide('Statistiques momentanement indisponibles', 'Verifiez votre connexion et reessayez.'));
      souffler('Impossible de recuperer les statistiques Google.', 'alerte');
      return;
    }

    const serie = r.series || [];
    const totaux = r.totaux || {};
    const variations = r.variations || {};
    const rep = r.repartitions || {};
    vider(zone);

    /* ---------- cartes KPI ---------- */

    const site = blocPliable('Performance de votre site');
    zone.append(site.bloc);

    const grille = h('div.grille-kpi');
    METRIQUES.forEach((m, i) => {
      const brut = totaux[m.cle] ?? 0;
      const valeur = m.pourcent ? (brut * 100).toFixed(1) + ' %'
        : m.duree ? formaterDuree(brut)
        : nombre(brut);

      const etiquette = avecAide(
        h('p.kpi-etiq', m.libelle),
        EXPLICATIONS[m.cle]);

      grille.append(h('div.kpi',
        h('div.kpi-haut',
          h('span.kpi-icone', h('svg', {
            viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
            'stroke-width': '1.7', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
            html: ICONES[m.icone] || '',
          })),
          badgeVariation(variations[m.cle])),
        h('p.kpi-val', valeur),
        etiquette,
        h('p.kpi-sous', `vs ${periode.compare}`)));
    });
    site.corps.append(grille);

    /* ---------- un seul graphique dans le temps ---------- */

    if (serie.length > 1) {
      site.corps.append(h('div.section',
        h('div.section-tete',
          h('h2', 'Visiteurs'),
          h('p', `Evolution sur ${periode.libelle.toLowerCase()}`)),
        h('div.section-corps', { style: { paddingTop: '18px' } },
          grapheComplet(serie.map((l) => l.visiteurs), serie.map((l) => formaterJour(l.date))))));
    }

    /* ---------- repartitions ---------- */

    const duo = h('div.grille-duo');

    // Camembert pour ces deux-la : ce sont des parts d'un tout (100 %
    // des visiteurs se repartissent entre les appareils, entre les
    // villes). Les pages et les jours, eux, restent en barres — ce sont
    // des classements, pas des parts.
    if (rep.appareils?.length) {
      duo.append(carteCamembert('Telephone ou ordinateur', 'appareils',
        rep.appareils.map((a) => ({ nom: APPAREILS[a.cle] || a.cle, valeur: a.valeur }))));
    }
    if (rep.villes?.length) {
      duo.append(carteCamembert("D'ou viennent vos visiteurs", 'villes',
        rep.villes.filter((v) => v.cle && v.cle !== '(not set)')
          .map((v) => ({ nom: v.cle, valeur: v.valeur }))));
    }
    if (duo.children.length) site.corps.append(duo);

    const duo2 = h('div.grille-duo');
    if (rep.pages?.length) {
      duo2.append(carteRepartition('Pages les plus vues', 'pages',
        rep.pages.map((p) => ({ nom: p.cle === '/' ? "Page d'accueil" : p.cle, valeur: p.valeur }))));
    }
    if (rep.jours_semaine?.length) {
      // GA4 renvoie 0=dimanche. On reordonne pour commencer au lundi,
      // comme une semaine francaise.
      const ordre = [1, 2, 3, 4, 5, 6, 0];
      const parJour = new Map(rep.jours_semaine.map((j) => [Number(j.cle), j.valeur]));
      duo2.append(carteRepartition('Jours de la semaine', 'jours_semaine',
        ordre.map((n) => ({ nom: JOURS_SEMAINE[n], valeur: parJour.get(n) || 0 }))));
    }
    if (duo2.children.length) site.corps.append(duo2);

    if (!serie.length) {
      site.corps.append(carteVide('Aucune donnee sur cette periode',
        "Votre site n'a pas encore recu de visite sur la periode choisie."));
    }
  }

  await charger(PERIODES.find((p) => p.cle === periodeActive));

  // La fiche Google se charge a part : elle a sa propre connexion, sa
  // propre API, et peut echouer sans empecher le reste d'exister.
  if (etat.profil?.acces_google_business) {
    const zoneGbp = h('div');
    page.append(zoneGbp);
    chargerGbp(zoneGbp, periodeActive);
  }
}

const ICONES_GBP = {
  vues:        '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  appels:      '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>',
  itineraires: '<path d="m3 11 19-9-9 19-2-8-8-2Z"/>',
  clics_site:  '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
};

const LIBELLES_GBP = {
  vues: 'Vues de la fiche',
  appels: 'Appels recus',
  itineraires: 'Itineraires demandes',
  clics_site: 'Clics vers le site',
};

const AIDE_GBP = {
  vues: "Nombre de fois ou votre fiche est apparue dans Google ou sur Maps.",
  appels: "Personnes ayant appuye sur le bouton Appeler de votre fiche Google. Ce sont des appels que vous devez a votre presence en ligne.",
  itineraires: "Personnes ayant demande l'itineraire vers votre adresse.",
  clics_site: "Personnes venues sur votre site depuis votre fiche Google.",
};

async function chargerGbp(zone, periode) {
  vider(zone);
  const attente = blocPliable('Performance de votre fiche Google');
  attente.corps.append(h('div.grille-kpi', ...[0, 1, 2, 3].map(() => h('div.squelette.sq-kpi'))));
  zone.append(attente.bloc);

  let r;
  try {
    r = await D.statsGbp(periode);
  } catch (e) {
    vider(zone);
    const echec = blocPliable('Performance de votre fiche Google');
    zone.append(echec.bloc);
    echec.corps.append(carteVide(
      String(e.message).includes('Identifiant')
        ? "Il manque l'identifiant de votre fiche Google"
        : 'Statistiques de la fiche indisponibles',
      String(e.message).includes('Identifiant')
        ? "Renseignez-le dans Parametrage pour voir les vues, les appels et les avis de votre fiche."
        : "Cette section reapparaitra des que Google reprendra la main.",
      String(e.message).includes('Identifiant')
        ? h('a.bt.bt-vif', { href: '#/parametrage' }, 'Aller au parametrage') : null));
    return;
  }

  const t = r.totaux || {};
  vider(zone);
  const gbp = blocPliable('Performance de votre fiche Google');
  zone.append(gbp.bloc);

  const grille = h('div.grille-kpi');
  ['vues', 'appels', 'itineraires', 'clics_site'].forEach((cle, i) => {
    const etiquette = avecAide(h('p.kpi-etiq', LIBELLES_GBP[cle]), AIDE_GBP[cle]);
    grille.append(h('div.kpi',
      h('div.kpi-haut', h('span.kpi-icone', h('svg', {
        viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
        'stroke-width': '1.7', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
        html: ICONES_GBP[cle],
      }))),
      h('p.kpi-val', nombre(t[cle] || 0)),
      etiquette));
  });
  gbp.corps.append(grille);

  /* ---------- avis ---------- */

  if (r.avis) {
    const a = r.avis;
    const corps = h('div.section-corps', { style: { paddingTop: '16px' } });

    if (a.note_moyenne) {
      corps.append(h('div.note-globale',
        h('p.note-chiffre', Number(a.note_moyenne).toFixed(1)),
        h('div',
          h('p.note-etoiles', etoiles(a.note_moyenne)),
          h('p.note-compte', `${nombre(a.nombre)} avis au total`))));
    }

    if (a.derniers?.length) {
      const liste = h('div.avis-liste');
      a.derniers.forEach((av) => {
        liste.append(h('div.avis',
          h('div.avis-tete',
            h('span.avis-auteur', av.auteur),
            h('span.avis-note', etoiles(av.note)),
            av.repondu
              ? h('span.etat', { 'data-ton': 'bien' }, 'Repondu')
              : h('span.etat', { 'data-ton': 'veille' }, 'Sans reponse')),
          av.texte ? h('p.avis-texte', av.texte) : null));
      });
      corps.append(liste);
    } else {
      corps.append(h('p', { style: { color: 'var(--sourdine)', fontSize: '.9rem' } },
        "Aucun avis pour le moment."));
    }

    gbp.corps.append(h('div.section',
      h('div.section-tete', h('h2', 'Vos avis Google')), corps));
  }
}

function etoiles(note) {
  const n = Math.round(Number(note) || 0);
  return '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n));
}

/* Grande section depliable : les deux blocs (site / fiche Google) font
   chacun une page entiere de contenu. Repliables, on choisit celui qu'on
   veut regarder au lieu de defiler dans les deux. */
function blocPliable(titre, ouvert = true) {
  const corps = h('div.bloc-corps');
  const bloc = h('details.bloc-pliable', { open: ouvert },
    h('summary.bloc-tete',
      h('span.bloc-titre', titre),
      h('span.bloc-chevron', { html: '&rsaquo;' })),
    corps);
  return { bloc, corps };
}

function carteCamembert(titre, cleAide, entrees) {
  return h('div.section',
    h('div.section-tete', avecAide(h('h2', titre), EXPLICATIONS[cleAide])),
    h('div.section-corps', { style: { paddingTop: '18px' } }, camembert(entrees)));
}

function carteRepartition(titre, cleAide, entrees) {
  const max = Math.max(1, ...entrees.map((e) => e.valeur));
  const corps = h('div.repartition');
  entrees.forEach((e) => {
    corps.append(h('div.repartition-ligne',
      h('span.repartition-nom', { title: e.nom }, e.nom),
      h('div.repartition-piste',
        h('div.repartition-barre', { style: { width: `${(e.valeur / max * 100).toFixed(1)}%` } })),
      h('span.repartition-val', nombre(e.valeur))));
  });

  return h('div.section',
    h('div.section-tete', avecAide(h('h2', titre), EXPLICATIONS[cleAide])),
    h('div.section-corps', { style: { paddingTop: '16px' } }, corps));
}

function badgeVariation(v) {
  if (v === null || v === undefined || !Number.isFinite(v)) return null;
  const hausse = v >= 0;
  return h('span.badge-var', { class: `badge-var ${hausse ? 'hausse' : 'baisse'}` },
    h('span.badge-fleche', { html: hausse ? '&uarr;' : '&darr;' }),
    `${Math.abs(v).toFixed(1)} %`);
}

function formaterDuree(secondes) {
  const s = Math.round(secondes || 0);
  if (s < 60) return `${s} s`;
  return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')}`;
}

// GA4 renvoie les dates au format YYYYMMDD
function formaterJour(brut) {
  if (!brut || brut.length !== 8) return brut || '';
  return `${brut.slice(6, 8)}/${brut.slice(4, 6)}`;
}

function carteVide(titre, texte, action) {
  return h('div.section', h('div.section-corps', { style: { padding: '36px 22px', textAlign: 'center' } },
    h('p', { style: { fontWeight: '650', marginBottom: '6px' } }, titre),
    h('p', { style: { color: 'var(--sourdine)', fontSize: '.9rem', maxWidth: '46ch', margin: '0 auto' } }, texte),
    action ? h('div', { style: { marginTop: '18px' } }, action) : null));
}
