// ===================================================================
//  Palette de commandes — Ctrl+K / Cmd+K.
//
//  Un client d'artisan ne connait pas ce raccourci : la palette est
//  donc aussi atteignable par un champ de recherche visible dans
//  l'entete. Le raccourci est un bonus pour Nico et pour les habitues,
//  pas le seul chemin.
//
//  Elle cherche dans trois choses : les pages, les actions, et le
//  contenu editable du site (le plus utile — "ou est le texte du
//  telephone deja ?").
// ===================================================================

import { h, vider } from './outils.js';
import * as D from './donnees.js';

const PAGES = [
  { titre: 'Accueil', detail: 'Vue d\'ensemble', lien: '#/accueil', motsCles: 'tableau bord resume' },
  { titre: 'Performances', detail: 'Visites, appels, fiche Google', lien: '#/performances', motsCles: 'statistiques visiteurs analytics trafic' },
  { titre: 'Mon éditeur', detail: 'Modifier les textes du site', lien: '#/mon-site', motsCles: 'contenu textes photos horaires publier' },
  { titre: 'Acquisition', detail: 'Campagnes publicitaires', lien: '#/acquisition', motsCles: 'ads publicite google facebook budget' },
  { titre: 'Mon activité', detail: 'Demandes de devis reçues', lien: '#/activite', motsCles: 'leads clients messages devis contacts' },
  { titre: 'Rapports', detail: 'Bilan hebdomadaire et mensuel', lien: '#/rapports', motsCles: 'bilan resume mois semaine pdf' },
  { titre: 'Mes infos', detail: 'Coordonnées, réseaux, abonnement', lien: '#/mes-infos', motsCles: 'profil telephone email nom formule prix' },
  { titre: 'Paramétrage', detail: 'Comptes Google, pixels', lien: '#/parametrage', motsCles: 'connexion ga4 analytics business ads pixel meta' },
  { titre: 'Parrainage', detail: 'Recommander LocWeb', lien: '#/parrainage', motsCles: 'offrir ami collegue mois offert' },
  { titre: 'Aide', detail: 'Nous contacter', lien: '#/aide', motsCles: 'support probleme question sos' },
];

/** Score simple : titre > detail > mots-cles, insensible aux accents. */
function nu(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** hero_titre -> "Hero, titre" : le client ne lit pas des cles techniques. */
function joli(cle) {
  const mots = String(cle || '').split(/[_-]/).filter(Boolean);
  if (!mots.length) return cle;
  const tete = mots[0].charAt(0).toUpperCase() + mots[0].slice(1);
  return mots.length > 1 ? `${tete}, ${mots.slice(1).join(' ')}` : tete;
}

function filtrer(entrees, requete) {
  const q = nu(requete).trim();
  if (!q) return entrees.slice(0, 8);
  const mots = q.split(/\s+/);
  return entrees
    .map((e) => {
      const titre = nu(e.titre);
      const reste = nu(`${e.detail || ''} ${e.motsCles || ''}`);
      let score = 0;
      for (const m of mots) {
        if (titre.startsWith(m)) score += 6;
        else if (titre.includes(m)) score += 4;
        else if (reste.includes(m)) score += 2;
        else return null;
      }
      return { ...e, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

export function installerPalette(etat) {
  if (document.querySelector('.palette-fond')) return;

  const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

  /* ---------- le declencheur visible dans l'entete ---------- */

  const hote = document.querySelector('.entete-droite');
  const declencheur = h('button.recherche-declencheur', { onclick: () => ouvrir() },
    h('svg.ic', {
      viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
      'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      html: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    }),
    h('span', 'Rechercher'),
    h('kbd', mac ? '⌘K' : 'Ctrl K'));
  if (hote) hote.insertBefore(declencheur, hote.firstChild);

  /* ---------- la palette ---------- */

  const saisie = h('input.palette-saisie', {
    type: 'text', placeholder: 'Rechercher une page, un texte de votre site...',
    autocomplete: 'off', spellcheck: 'false',
  });
  const resultats = h('div.palette-resultats');
  const fond = h('div.palette-fond', { hidden: true, onclick: (e) => { if (e.target === fond) fermer(); } },
    h('div.palette', { role: 'dialog', 'aria-modal': 'true' },
      h('div.palette-tete',
        h('svg.ic', {
          viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
          'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
          html: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
        }),
        saisie,
        h('kbd', 'Esc')),
      resultats));
  document.body.append(fond);

  // Le contenu editable n'est charge qu'une fois, a la premiere
  // ouverture : inutile de le tirer si personne ne cherche jamais.
  let entrees = PAGES;
  let contenuCharge = false;

  async function chargerContenu() {
    if (contenuCharge) return;
    contenuCharge = true;
    try {
      const lignes = await D.lireContenu(etat.client.id);
      const duSite = lignes
        .filter((l) => (l.valeur || l.valeur_brouillon))
        .slice(0, 120)
        .map((l) => ({
          titre: joli(l.cle_bloc),
          detail: String(l.valeur_brouillon ?? l.valeur ?? '').slice(0, 70),
          lien: '#/mon-site',
          motsCles: String(l.valeur || ''),
          badge: 'Texte du site',
        }));
      entrees = [...PAGES, ...duSite];
      dessiner();
    } catch { /* la recherche des pages fonctionne toujours */ }
  }

  let actif = 0;
  let visibles = [];

  function dessiner() {
    visibles = filtrer(entrees, saisie.value);
    actif = Math.min(actif, Math.max(visibles.length - 1, 0));
    vider(resultats);
    if (!visibles.length) {
      resultats.append(h('p.palette-vide', 'Aucun résultat.'));
      return;
    }
    visibles.forEach((e, i) => {
      resultats.append(h('button.palette-ligne', {
        class: i === actif ? 'palette-ligne actif' : 'palette-ligne',
        onclick: () => choisir(e),
        onmouseenter: () => { actif = i; marquer(); },
      },
        h('span.palette-texte', h('b', e.titre), e.detail ? h('span', e.detail) : null),
        e.badge ? h('span.palette-badge', e.badge) : null));
    });
  }

  function marquer() {
    [...resultats.children].forEach((el, i) => el.classList.toggle('actif', i === actif));
  }

  function choisir(e) {
    fermer();
    if (e.lien) location.hash = e.lien;
  }

  function ouvrir() {
    fond.hidden = false;
    saisie.value = '';
    actif = 0;
    dessiner();
    saisie.focus();
    chargerContenu();
  }

  function fermer() { fond.hidden = true; }

  saisie.addEventListener('input', () => { actif = 0; dessiner(); });
  saisie.addEventListener('keydown', (e) => {
    if (!visibles.length && e.key !== 'Escape') return;
    if (e.key === 'ArrowDown') { e.preventDefault(); actif = (actif + 1) % visibles.length; marquer(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); actif = (actif - 1 + visibles.length) % visibles.length; marquer(); }
    if (e.key === 'Enter' && visibles[actif]) { e.preventDefault(); choisir(visibles[actif]); }
    if (e.key === 'Escape') fermer();
  });

  addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      fond.hidden ? ouvrir() : fermer();
    }
  });
}
