// ===================================================================
//  Performances — les vraies statistiques GA4 du site, avec bascule
//  24h / 7j / 30j. Rien n'est invente : si GA4 n'est pas connecte ou
//  si l'ID de propriete manque, on le dit au lieu d'afficher des zeros.
// ===================================================================

import { h, vider, nombre, grapheAires, souffler } from './outils.js';
import * as D from './donnees.js';

const PERIODES = ['24h', '7j', '30j'];
const METRIQUES = [
  { cle: 'visiteurs',       libelle: 'Visiteurs',          icone: 'oeil' },
  { cle: 'sessions',        libelle: 'Sessions',           icone: 'cycle' },
  { cle: 'pages_vues',      libelle: 'Pages vues',         icone: 'page' },
  { cle: 'taux_engagement', libelle: "Taux d'engagement",  icone: 'cible', pourcent: true },
];

const ICONES = {
  oeil:  '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  cycle: '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/>',
  page:  '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/>',
  cible: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".6" fill="currentColor" stroke="none"/>',
};

export async function rendre(page, etat) {
  vider(page);
  page.append(h('h1', 'Performances'));

  if (!etat.profil?.acces_ga4) {
    page.append(carteVide(
      "Connectez Google Analytics pour voir vos statistiques",
      "Rendez-vous dans Parametrage pour connecter votre compte Google en un clic.",
      h('a.bt.bt-vif', { href: '#/parametrage' }, 'Aller au parametrage')));
    return;
  }

  const onglets = h('div.onglets-periode');
  const zone = h('div');
  let periodeActive = '7j';

  PERIODES.forEach((p) => {
    const bt = h('button', {
      class: p === periodeActive ? 'onglet actif' : 'onglet',
      onclick: () => {
        periodeActive = p;
        [...onglets.children].forEach((b, i) => { b.className = PERIODES[i] === p ? 'onglet actif' : 'onglet'; });
        charger(p);
      },
    }, p);
    onglets.append(bt);
  });

  page.append(h('div.barre-outils', onglets), zone);

  async function charger(periode) {
    vider(zone);
    zone.append(h('div.synthese', ...METRIQUES.map(() => h('div.squelette', { style: { height: '132px' } }))));

    let resultat;
    try {
      const { data: { session } } = await D.sb.auth.getSession();
      const reponse = await fetch(`${D.EDGE_FUNCTIONS_URL}/ga4-donnees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ periode }),
      });
      resultat = await reponse.json();
      if (!reponse.ok) {
        vider(zone);
        zone.append(carteVide(
          resultat.error === 'ID de propriete GA4 non renseigne.'
            ? "Il manque l'identifiant de votre propriete Analytics"
            : 'Statistiques momentanement indisponibles',
          resultat.error === 'ID de propriete GA4 non renseigne.'
            ? "Renseignez-le dans Parametrage — vous le trouverez dans GA4, Admin puis Parametres de la propriete."
            : "Reessayez dans quelques instants. Si ca persiste, contactez-nous.",
          resultat.error === 'ID de propriete GA4 non renseigne.'
            ? h('a.bt.bt-vif', { href: '#/parametrage' }, 'Aller au parametrage') : null));
        return;
      }
    } catch {
      vider(zone);
      zone.append(carteVide('Statistiques momentanement indisponibles', 'Verifiez votre connexion et reessayez.'));
      souffler('Impossible de recuperer les statistiques Google.', 'alerte');
      return;
    }

    const serie = resultat.series || [];
    vider(zone);

    const cartes = h('div.synthese');
    METRIQUES.forEach(({ cle, libelle, icone, pourcent }) => {
      const valeurs = serie.map((l) => l[cle] || 0);
      const total = pourcent
        ? (valeurs.reduce((s, v) => s + v, 0) / Math.max(1, valeurs.length) * 100).toFixed(1) + ' %'
        : nombre(valeurs.reduce((s, v) => s + v, 0));
      cartes.append(h('div.kpi',
        h('span.kpi-icone', h('svg', {
          viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
          'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
          html: ICONES[icone] || '',
        })),
        h('p.kpi-val', total),
        h('p.kpi-etiq', libelle),
        valeurs.length > 1 ? h('div.kpi-graphe', grapheAires(valeurs, { hauteur: 40 })) : null));
    });
    zone.append(cartes);

    if (!serie.length) {
      zone.append(carteVide('Aucune donnee sur cette periode',
        "Votre site n'a pas encore recu de visite sur la periode choisie."));
    }
  }

  await charger(periodeActive);
}

function carteVide(titre, texte, action) {
  return h('div.section', h('div.section-corps', { style: { padding: '32px 22px', textAlign: 'center' } },
    h('p', { style: { fontWeight: '650', marginBottom: '6px' } }, titre),
    h('p', { style: { color: 'var(--sourdine)', fontSize: '.9rem', maxWidth: '46ch', margin: '0 auto' } }, texte),
    action ? h('div', { style: { marginTop: '16px' } }, action) : null));
}
