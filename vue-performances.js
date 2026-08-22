// ===================================================================
//  Performances — les vraies statistiques GA4, avec variation par
//  rapport a la periode precedente. Aucun chiffre n'est invente : si
//  GA4 n'est pas branche, on le dit au lieu d'afficher des zeros.
// ===================================================================

import { h, vider, nombre, grapheComplet, grapheAires, souffler } from './outils.js';
import * as D from './donnees.js';

const PERIODES = [
  { cle: '24h', libelle: '24 h',  compare: 'la veille' },
  { cle: '7j',  libelle: '7 jours',  compare: 'les 7 jours precedents' },
  { cle: '30j', libelle: '30 jours', compare: 'les 30 jours precedents' },
];

const METRIQUES = [
  { cle: 'visiteurs',       libelle: 'Visiteurs',         icone: 'personnes' },
  { cle: 'sessions',        libelle: 'Sessions',          icone: 'cycle' },
  { cle: 'pages_vues',      libelle: 'Pages vues',        icone: 'page' },
  { cle: 'taux_engagement', libelle: "Taux d'engagement", icone: 'cible', pourcent: true },
];

const ICONES = {
  personnes: '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.3 2.9-5.8 6.5-5.8s6.5 2.5 6.5 5.8"/><circle cx="17.5" cy="7.5" r="2.4"/><path d="M16 13.6c2.6.5 4.5 2.7 4.5 5.6"/>',
  cycle:     '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/>',
  page:      '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
  cible:     '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".8" fill="currentColor" stroke="none"/>',
};

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
    vider(zone);
    zone.append(h('div.grille-kpi', ...METRIQUES.map(() => h('div.squelette', { style: { height: '148px', borderRadius: '16px' } }))));

    let resultat;
    try {
      const { data: { session } } = await D.sb.auth.getSession();
      const reponse = await fetch(`${D.EDGE_FUNCTIONS_URL}/ga4-donnees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ periode: periode.cle }),
      });
      resultat = await reponse.json();
      if (!reponse.ok) {
        vider(zone);
        const manqueId = resultat.error === 'ID de propriete GA4 non renseigne.';
        zone.append(carteVide(
          manqueId ? "Il manque l'identifiant de votre propriete Analytics" : 'Statistiques momentanement indisponibles',
          manqueId
            ? 'Renseignez-le dans Parametrage — vous le trouverez dans GA4, Admin puis Parametres de la propriete.'
            : 'Reessayez dans quelques instants. Si ca persiste, contactez-nous.',
          manqueId ? h('a.bt.bt-vif', { href: '#/parametrage' }, 'Aller au parametrage') : null));
        return;
      }
    } catch {
      vider(zone);
      zone.append(carteVide('Statistiques momentanement indisponibles', 'Verifiez votre connexion et reessayez.'));
      souffler('Impossible de recuperer les statistiques Google.', 'alerte');
      return;
    }

    const serie = resultat.series || [];
    const totaux = resultat.totaux || {};
    const variations = resultat.variations;
    vider(zone);

    /* ---------- cartes KPI ---------- */

    const grille = h('div.grille-kpi');
    METRIQUES.forEach((m) => {
      const brut = totaux[m.cle] ?? 0;
      const valeur = m.pourcent ? (brut * 100).toFixed(1) + ' %' : nombre(brut);
      const varia = variations ? variations[m.cle] : null;

      grille.append(h('div.kpi',
        h('span.kpi-icone', h('svg', {
          viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
          'stroke-width': '1.7', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
          html: ICONES[m.icone] || '',
        })),
        h('p.kpi-etiq', m.libelle),
        h('p.kpi-val', valeur),
        h('div.kpi-pied',
          h('span.kpi-periode', `vs ${periode.compare}`),
          badgeVariation(varia))));
    });
    zone.append(grille);

    /* ---------- graphique principal ---------- */

    if (serie.length > 1) {
      const etiquettes = serie.map((l) => formaterJour(l.date));
      const valeurs = serie.map((l) => l.visiteurs);
      zone.append(h('div.section',
        h('div.section-tete', h('h2', 'Visiteurs'), h('p', `Evolution sur ${periode.libelle.toLowerCase()}`)),
        h('div.section-corps', { style: { paddingTop: '18px' } }, grapheComplet(valeurs, etiquettes))));

      zone.append(h('div.grille-duo',
        carteGraphe('Sessions', serie.map((l) => l.sessions), etiquettes),
        carteGraphe('Pages vues', serie.map((l) => l.pages_vues), etiquettes)));
    } else if (!serie.length) {
      zone.append(carteVide('Aucune donnee sur cette periode',
        "Votre site n'a pas encore recu de visite sur la periode choisie."));
    }
  }

  await charger(PERIODES.find((p) => p.cle === periodeActive));
}

function carteGraphe(titre, valeurs, etiquettes) {
  return h('div.section',
    h('div.section-tete', h('h2', titre)),
    h('div.section-corps', { style: { paddingTop: '16px' } },
      grapheComplet(valeurs, etiquettes, { hauteur: 180 })));
}

function badgeVariation(v) {
  if (v === null || v === undefined || !Number.isFinite(v)) {
    return h('span.badge-var.neutre', '—');
  }
  const hausse = v >= 0;
  return h('span.badge-var', { class: `badge-var ${hausse ? 'hausse' : 'baisse'}` },
    h('span.badge-fleche', { html: hausse ? '&uarr;' : '&darr;' }),
    `${Math.abs(v).toFixed(1)} %`);
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
