// ===================================================================
//  Accueil — repond a une seule question : "ca marche ou pas ?"
//
//  Quatre blocs, dans cet ordre, et rien d'autre :
//    1. une phrase qui tranche
//    2. deux ou trois chiffres, selon ce qui est branche
//    3. une courbe
//    4. ce qu'il faut faire
//
//  Ce qui a ete retire volontairement : la grille "Vos sections", qui
//  reproduisait le menu lateral en plus gros ; la barre de taux de
//  conversion, dont le chiffre figure maintenant dans les trois du
//  haut ; et les sous-titres qui presentaient chaque bloc alors que le
//  bloc se presente tout seul.
//
//  Regle de fond : tout vient de donnees reelles. Quand une source
//  manque, on le dit — jamais de chiffre de demonstration.
// ===================================================================

import { h, vider, nombre, grapheAires, EXPLICATIONS, avecAide } from './outils.js';
import * as D from './donnees.js';
import { blocAFaire } from './completion.js';

const ICONES_KPI = {
  visiteurs: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  demandes:  '<path d="M4 5h16v12H8l-4 4V5Z"/>',
  appels:    '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>',
  conversion: '<path d="M12 20v-6"/><path d="M6 20V10"/><path d="M18 20V4"/>',
};

export async function rendre(page, etat, { charger }) {
  const { client, profil } = etat;
  const demandes = await charger('demandes', () => D.listerDemandes(client.id));

  vider(page);
  page.append(h('h1', `Bonjour, ${client.nom_site || 'bienvenue'}`));

  const zone = h('div');
  page.append(zone);
  zone.append(h('div.squelette', { style: { height: '104px', borderRadius: '16px', marginBottom: '18px' } }));

  const [stats, fiche] = await Promise.all([
    profil?.acces_ga4 ? D.statsGa4('30j').catch(() => null) : null,
    profil?.acces_google_business ? D.statsGbp('30j').catch(() => null) : null,
  ]);

  const limite = Date.now() - 30 * 864e5;
  const demandes30 = demandes.filter((d) => new Date(d.date_creation) >= limite);

  vider(zone);
  zone.append(verdict(stats, demandes30, profil));
  zone.append(chiffres(stats, fiche, demandes30));
  const graphe = courbe(stats);
  if (graphe) zone.append(graphe);
  const actions = blocAFaire(profil || {}, client, { stats, demandes, limite: 3 });
  if (actions) zone.append(actions);
}

/* ---------- 1. la phrase qui tranche ---------- */

// Un verdict, pas une description. "342 visiteurs" ne dit pas si c'est
// bien ; "en hausse de 12 %" le dit.
function verdict(stats, demandes30, profil) {
  const visiteurs = stats?.totaux?.visiteurs ?? null;
  const variation = stats?.variations?.visiteurs;
  const nb = demandes30.length;

  let titre;
  let texte;

  if (!profil?.acces_ga4) {
    titre = nb ? `${nb} demande${nb > 1 ? 's' : ''} ce mois-ci` : 'Votre site est en ligne';
    texte = 'Reliez Google pour voir combien de personnes le visitent.';
  } else if (!stats) {
    titre = 'Statistiques indisponibles';
    texte = 'Vos demandes restent consultables. Réessayez dans un moment.';
  } else if (!visiteurs) {
    titre = 'Votre site attend ses premiers visiteurs';
    texte = 'Dès les premières visites, vous verrez ici son évolution.';
  } else if (Number.isFinite(variation) && variation >= 10) {
    titre = `Votre trafic progresse de ${Math.round(variation)} %`;
    texte = `${nombre(visiteurs)} visiteurs sur 30 jours. Ce qui est en place fonctionne.`;
  } else if (Number.isFinite(variation) && variation <= -10) {
    titre = `Votre trafic baisse de ${Math.abs(Math.round(variation))} %`;
    texte = `${nombre(visiteurs)} visiteurs sur 30 jours. Une baisse peut être saisonnière.`;
  } else {
    titre = 'Votre présence en ligne est stable';
    texte = `${nombre(visiteurs)} visiteurs sur 30 jours${nb ? `, ${nb} demande${nb > 1 ? 's' : ''}` : ''}.`;
  }

  return h('div.verdict',
    h('p.verdict-titre', titre),
    h('p.verdict-texte', texte));
}

/* ---------- 2. les chiffres ---------- */

/* On n'affiche que des cartes qui portent une valeur.

   Trois cartes vides ne disent pas "pas de donnees", elles donnent
   l'impression d'un outil casse. Et surtout : le taux de contact se
   calcule a partir des deux autres — l'afficher a cote d'elles, c'est
   montrer trois fois la meme chose. Il n'apparait donc que lorsqu'il
   apprend quelque chose, et cede sa place aux appels Google des que la
   fiche est reliee : un appel est un canal a part entiere, pas une
   division des deux colonnes precedentes. */
function chiffres(stats, fiche, demandes30) {
  const visiteurs = stats?.totaux?.visiteurs ?? null;
  const appels = fiche?.totaux?.appels ?? null;
  const grille = h('div.grille-kpi');

  if (visiteurs !== null) {
    grille.append(kpi('visiteurs', 'Visiteurs', nombre(visiteurs),
      stats?.variations?.visiteurs, (stats?.series || []).map((l) => l.visiteurs)));
  }

  grille.append(kpi('demandes', 'Demandes reçues', nombre(demandes30.length), null, null));

  if (appels !== null) {
    grille.append(kpi('appels', 'Appels depuis Google', nombre(appels), null, null));
  } else if (visiteurs) {
    const taux = (demandes30.length / visiteurs) * 100;
    grille.append(kpi('conversion', 'Taux de contact', `${taux.toFixed(1)} %`,
      null, null, 'conversion'));
  }

  return grille;
}

function kpi(icone, libelle, valeur, variation, serie, cleAide) {
  return h('div.kpi',
    h('div.kpi-haut',
      h('span.kpi-icone', h('svg', {
        viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
        'stroke-width': '1.7', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
        html: ICONES_KPI[icone] || '',
      })),
      badgeVariation(variation)),
    h('p.kpi-val', valeur),
    avecAide(h('p.kpi-etiq', libelle), EXPLICATIONS[cleAide || icone]),
    serie && serie.length > 1 ? h('div.kpi-graphe', grapheAires(serie, { hauteur: 34 })) : null);
}

function badgeVariation(v) {
  if (v === null || v === undefined || !Number.isFinite(v)) return null;
  const hausse = v >= 0;
  return h('span.badge-var', { class: `badge-var ${hausse ? 'hausse' : 'baisse'}` },
    h('span.badge-fleche', { html: hausse ? '&uarr;' : '&darr;' }),
    `${Math.abs(v).toFixed(1)} %`);
}

/* ---------- 3. la courbe ---------- */

function courbe(stats) {
  const serie = stats?.series || [];
  if (serie.length < 2) return null;
  return h('div.section',
    h('div.section-tete',
      h('h2', 'Visiteurs'),
      h('a.section-lien', { href: '#/statistiques' }, 'Tout voir →')),
    h('div.section-corps', { style: { paddingTop: '18px' } },
      h('div.kpi-graphe', { style: { height: '110px' } },
        grapheAires(serie.map((l) => l.visiteurs), { hauteur: 110 }))));
}
