// ===================================================================
//  Accueil — le point d'entree. Pas un tableau de chiffres : une porte
//  vers chaque section, plus les deux ou trois choses qui demandent
//  vraiment une action aujourd'hui.
// ===================================================================

import { h, vider, nombre } from './outils.js';
import * as D from './donnees.js';

const CARTES = [
  {
    route: '#/performances', titre: 'Performances',
    texte: 'Visiteurs, sessions et pages vues de votre site.',
    icone: '<path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 15 4-5 3 3 5-7"/>',
  },
  {
    route: '#/mon-site', titre: 'Mon site',
    texte: 'Modifiez vos horaires, vos textes et vos photos.',
    icone: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M7 6.5h.01M10 6.5h.01"/>',
  },
  {
    route: '#/acquisition', titre: 'Acquisition',
    texte: 'Vos campagnes publicitaires et vos demandes.',
    icone: '<path d="M3 10v4h4l6 4V6L7 10H3Z"/><path d="M17 9a4 4 0 0 1 0 6"/>',
  },
  {
    route: '#/activite', titre: 'Mon activite',
    texte: 'Les demandes recues via votre site.',
    icone: '<path d="M4 5h16v12H8l-4 4V5Z"/>',
  },
];

export async function rendre(page, etat, { charger }) {
  const { client } = etat;
  const demandes = await charger('demandes', () => D.listerDemandes(client.id));
  const nouvelles = demandes.filter((d) => (d.statut || 'nouvelle') === 'nouvelle').length;

  vider(page);
  page.append(
    h('h1', `Bonjour, ${client.nom_site || 'bienvenue'}`),
    h('p.sous-titre', "Voici votre espace. Tout se pilote depuis les sections ci-dessous."),
  );

  // Une seule banniere, et seulement quand il y a vraiment quelque chose
  // a faire — sinon l'ecran d'accueil devient du bruit qu'on apprend a
  // ignorer.
  if (nouvelles) {
    page.append(h('a.banniere', { href: '#/activite' },
      h('span.banniere-pastille', nombre(nouvelles)),
      h('span',
        h('strong', nouvelles > 1 ? `${nouvelles} nouvelles demandes` : 'Une nouvelle demande'),
        h('span', { style: { display: 'block', fontSize: '.85rem', color: 'var(--sourdine)' } },
          'Cliquez pour les consulter et y repondre.')),
      h('span.banniere-fleche', { html: '&rarr;' })));
  }

  const grille = h('div.grille-cartes');
  CARTES.forEach((c) => {
    grille.append(h('a.carte-menu', { href: c.route },
      h('span.carte-icone', h('svg', {
        viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
        'stroke-width': '1.7', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
        html: c.icone,
      })),
      h('span.carte-titre', c.titre),
      h('span.carte-texte', c.texte)));
  });
  page.append(grille);
}
