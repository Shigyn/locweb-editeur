// ===================================================================
//  Accueil — le tableau de bord. Une phrase de synthese en haut, les
//  chiffres qui comptent en dessous, puis les acces aux sections.
//
//  Regle de fond : tout ce qui est affiche vient de donnees reelles
//  (GA4 pour le trafic, la base pour les demandes). Quand une source
//  manque, on le dit — jamais de chiffre de demonstration.
// ===================================================================

import { h, vider, nombre, grapheAires, souffler, EXPLICATIONS, avecAide } from './outils.js';
import * as D from './donnees.js';

const CARTES = [
  {
    route: '#/performances', titre: 'Performances',
    texte: 'Visiteurs, sessions et pages vues.',
    icone: '<path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 15 4-5 3 3 5-7"/>',
  },
  {
    route: '#/mon-site', titre: 'Mon editeur',
    texte: 'Horaires, textes et photos de votre site.',
    icone: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M7 6.5h.01M10 6.5h.01"/>',
  },
  {
    route: '#/acquisition', titre: 'Acquisition',
    texte: 'Lancez une campagne pour attirer des clients.',
    icone: '<path d="M3 10v4h4l6 4V6L7 10H3Z"/><path d="M17 9a4 4 0 0 1 0 6"/>',
  },
  {
    route: '#/activite', titre: 'Mon activite',
    texte: 'Les demandes recues via votre site.',
    icone: '<path d="M4 5h16v12H8l-4 4V5Z"/>',
  },
];

const ICONES_KPI = {
  visiteurs: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  demandes:  '<path d="M4 5h16v12H8l-4 4V5Z"/>',
  traiter:   '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  pages:     '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/>',
};

export async function rendre(page, etat, { charger }) {
  const { client } = etat;
  const demandes = await charger('demandes', () => D.listerDemandes(client.id));

  vider(page);
  page.append(
    h('h1', `Bonjour, ${client.nom_site || 'bienvenue'}`),
    h('p.sous-titre', 'Voici les performances de votre presence en ligne.'),
  );

  const limite = Date.now() - 30 * 864e5;
  const demandes30 = demandes.filter((d) => new Date(d.date_creation) >= limite);
  const nouvelles = demandes.filter((d) => (d.statut || 'nouvelle') === 'nouvelle').length;

  // La progression passe avant les chiffres tant qu'il reste des
  // etapes : un chiffre incomplet se lit mal, et l'utilisateur doit
  // savoir pourquoi avant de le regarder.
  const { barreCompletion, completion } = await import('./completion.js');
  if (completion(etat.profil || {}, client).reste.length) {
    page.append(barreCompletion(etat.profil || {}, client, { compact: true }));
  }

  const zoneSynthese = h('div');
  page.append(zoneSynthese);

  if (etat.profil?.acces_ga4) {
    await remplirAvecGa4(zoneSynthese, demandes30, nouvelles);
  } else {
    zoneSynthese.append(h('div.invite',
      h('div',
        h('p.invite-titre', 'Connectez Google Analytics pour suivre votre trafic'),
        h('p.invite-texte', "Vous verrez ici vos visiteurs, vos pages vues et l'evolution de votre presence en ligne.")),
      h('a.bt.bt-vif', { href: '#/parametrage' }, 'Connecter')));

    zoneSynthese.append(h('div.grille-kpi',
      carteKpi('demandes', 'Demandes recues', nombre(demandes30.length), '30 derniers jours', null, null),
      carteKpi('traiter', 'A traiter', nombre(nouvelles), nouvelles ? 'en attente de reponse' : 'tout est traite', null, null)));
  }

  page.append(h('p.titre-section', 'Vos sections'));
  const grille = h('div.grille-cartes');
  CARTES.forEach((c) => {
    grille.append(h('a.carte-menu', { href: c.route },
      h('span.carte-icone', h('svg', {
        viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
        'stroke-width': '1.7', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', html: c.icone,
      })),
      h('span.carte-titre', c.titre),
      h('span.carte-texte', c.texte)));
  });
  page.append(grille);
}

async function remplirAvecGa4(zone, demandes30, nouvelles) {
  zone.append(h('div.squelette', { style: { height: '120px', borderRadius: '16px', marginBottom: '18px' } }));

  let r;
  try {
    const { data: { session } } = await D.sb.auth.getSession();
    const reponse = await fetch(`${D.EDGE_FUNCTIONS_URL}/ga4-donnees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ periode: '30j' }),
    });
    r = await reponse.json();
    if (!reponse.ok) throw new Error(r.error || 'refus');
  } catch {
    vider(zone);
    zone.append(h('div.invite',
      h('div',
        h('p.invite-titre', 'Statistiques momentanement indisponibles'),
        h('p.invite-texte', "Vos demandes restent consultables ci-dessous.")),
      h('a.bt.bt-plein', { href: '#/performances' }, 'Reessayer')));
    zone.append(h('div.grille-kpi',
      carteKpi('demandes', 'Demandes recues', nombre(demandes30.length), '30 derniers jours', null, null),
      carteKpi('traiter', 'A traiter', nombre(nouvelles), nouvelles ? 'en attente' : 'tout est traite', null, null)));
    return;
  }

  const serie = r.series || [];
  const totaux = r.totaux || {};
  const variations = r.variations || {};
  const visiteurs = totaux.visiteurs || 0;

  // Taux de conversion : part des visiteurs qui sont alles jusqu'a
  // remplir le formulaire. C'est le seul chiffre qui relie le trafic au
  // chiffre d'affaires, donc celui qui merite d'etre mis en avant.
  const taux = visiteurs ? (demandes30.length / visiteurs) * 100 : null;

  vider(zone);

  /* ---------- phrase de synthese ---------- */

  const enHausse = (variations.visiteurs ?? 0) > 0;
  zone.append(h('div.synthese-narrative',
    h('p.synthese-badge', 'DONNEES SYNCHRONISEES A L\'INSTANT'),
    h('p.synthese-titre', visiteurs
      ? (enHausse ? 'Votre presence en ligne progresse.' : 'Votre presence en ligne est stable.')
      : 'Votre site attend ses premiers visiteurs.'),
    h('p.synthese-texte', visiteurs
      ? `Sur les 30 derniers jours, votre site a recu ${nombre(visiteurs)} visiteur${visiteurs > 1 ? 's' : ''}` +
        (demandes30.length
          ? ` et genere ${nombre(demandes30.length)} demande${demandes30.length > 1 ? 's' : ''}, soit un taux de conversion de ${taux.toFixed(1)} %.`
          : ", mais aucune demande n'a encore ete envoyee via le formulaire.")
      : "Des que votre site recevra des visites, vous verrez ici son evolution jour par jour."),
    h('a.synthese-lien', { href: '#/performances' }, 'Voir le detail des performances →')));

  /* ---------- rangee de KPI ---------- */

  zone.append(h('div.grille-kpi',
    carteKpi('visiteurs', 'Visiteurs', nombre(visiteurs), '30 derniers jours',
      variations.visiteurs, serie.map((l) => l.visiteurs)),
    carteKpi('pages', 'Pages vues', nombre(totaux.pages_vues || 0), '30 derniers jours',
      variations.pages_vues, serie.map((l) => l.pages_vues)),
    carteKpi('demandes', 'Demandes recues', nombre(demandes30.length), '30 derniers jours', null, null),
    carteKpi('traiter', 'A traiter', nombre(nouvelles), nouvelles ? 'en attente de reponse' : 'tout est traite', null, null),
  ));

  /* ---------- taux de conversion ---------- */

  if (taux !== null) {
    // Barre plafonnee a 10 % : au-dela, un site local est deja
    // exceptionnel, et une echelle sur 100 rendrait toute barre
    // invisible.
    const largeur = Math.min(100, (taux / 10) * 100);
    zone.append(h('div.section',
      h('div.section-corps', { style: { padding: '20px 22px' } },
        h('div.conversion-tete',
          h('div',
            avecAide(h('p.conversion-etiq', 'Votre taux de conversion'), EXPLICATIONS.conversion),
            h('p.conversion-val', `${taux.toFixed(1)} %`)),
          h('p.conversion-aide', 'Part de vos visiteurs qui vous contactent')),
        h('div.conversion-barre', h('div.conversion-jauge', { style: { width: `${largeur.toFixed(1)}%` } })),
        h('p.conversion-repere', 'Un bon taux pour un site local se situe entre 2 % et 5 %.'))));
  }
}

function carteKpi(icone, libelle, valeur, sous, variation, serie, cleAide) {
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
    h('p.kpi-sous', sous),
    serie && serie.length > 1 ? h('div.kpi-graphe', grapheAires(serie, { hauteur: 34 })) : null);
}

function badgeVariation(v) {
  if (v === null || v === undefined || !Number.isFinite(v)) return null;
  const hausse = v >= 0;
  return h('span.badge-var', { class: `badge-var ${hausse ? 'hausse' : 'baisse'}` },
    h('span.badge-fleche', { html: hausse ? '&uarr;' : '&darr;' }),
    `${Math.abs(v).toFixed(1)} %`);
}
