// ===================================================================
//  Centre de notifications — la cloche de l'entete.
//
//  Aucune table dediee : le flux est deduit de ce qui existe deja
//  (demandes de devis, publications, versions de l'app). Creer une
//  table "notifications" obligerait a l'ecrire au bon moment depuis
//  cinq endroits differents, avec le risque classique du flux qui
//  desynchronise de la realite. Ici, si une demande existe, la
//  notification existe — par construction.
//
//  Le "lu" est local a l'appareil : c'est une preference d'affichage,
//  pas une donnee metier.
// ===================================================================

import { h, vider, depuis } from './outils.js';
import * as D from './donnees.js';
import { VERSIONS } from './versions.js';

const CLE_LU = 'locweb-notifs-lues';

function derniereLecture() {
  try { return Number(localStorage.getItem(CLE_LU)) || 0; } catch { return Date.now(); }
}
function marquerLu() {
  try { localStorage.setItem(CLE_LU, String(Date.now())); } catch { /* navigation privee */ }
}

const ICONES = {
  demande: '<path d="M4 5h16v12H8l-4 4V5Z"/>',
  publication: '<path d="M20 6 9 17l-5-5"/>',
  version: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
  alerte: '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
};

/** Construit le flux, du plus recent au plus ancien. */
export async function fluxNotifications(etat) {
  const { client, profil } = etat;
  const evenements = [];

  const [demandes, historique] = await Promise.all([
    D.listerDemandes(client.id).catch(() => []),
    D.listerHistorique(client.id, 10).catch(() => []),
  ]);

  demandes.slice(0, 15).forEach((d) => {
    evenements.push({
      type: 'demande',
      date: new Date(d.date_creation || Date.now()).getTime(),
      titre: `Nouvelle demande de ${d.nom || 'un visiteur'}`,
      detail: d.message ? d.message.slice(0, 90) : (d.telephone || d.email || ''),
      lien: '#/demandes',
      urgent: (d.statut || 'nouvelle') === 'nouvelle',
    });
  });

  historique.slice(0, 10).forEach((l) => {
    evenements.push({
      type: 'publication',
      date: new Date(l.date_publication || Date.now()).getTime(),
      titre: 'Modification publiée sur votre site',
      detail: l.cle_bloc || '',
      lien: '#/mon-site',
    });
  });

  VERSIONS.slice(0, 3).forEach((v) => {
    evenements.push({
      type: 'version',
      date: new Date(v.date).getTime(),
      titre: `Nouveautés : ${v.titre}`,
      detail: v.points[0] || '',
      lien: null,
      version: v.version,
    });
  });

  // Une connexion Google absente n'est pas un evenement date : on la
  // remonte comme alerte du jour, parce qu'elle bloque tout le reste.
  if (!profil?.acces_ga4) {
    evenements.push({
      type: 'alerte',
      date: Date.now(),
      titre: 'Vos statistiques ne sont pas connectées',
      detail: 'Reliez Google pour voir vos visites et vos appels.',
      lien: '#/compte?onglet=connexions',
      urgent: true,
    });
  }

  return evenements.sort((a, b) => b.date - a.date).slice(0, 25);
}

function icone(type) {
  return h('span.notif-icone', { 'data-type': type },
    h('svg', {
      viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
      'stroke-width': '1.9', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      html: ICONES[type] || ICONES.version,
    }));
}

/** Installe la cloche dans l'entete. Ne fait rien si elle est deja la. */
export function installerCloche(etat) {
  const hote = document.querySelector('.entete-droite');
  if (!hote || hote.querySelector('.cloche')) return;

  const pastille = h('span.cloche-pastille', { hidden: true });
  const bouton = h('button.entete-icone.cloche', {
    title: 'Notifications', 'aria-label': 'Notifications', 'aria-expanded': 'false',
  },
    h('svg.ic', {
      viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
      'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      html: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    }),
    pastille);

  const panneau = h('div.notif-panneau', { hidden: true });
  const enveloppe = h('div.menu-compte', bouton, panneau);
  hote.insertBefore(enveloppe, hote.querySelector('.menu-compte'));

  // Cache d'une minute : assez pour que l'ouverture soit instantanee,
  // assez court pour qu'une demande arrivee entre-temps remonte.
  let flux = null;
  let fluxLe = 0;

  async function charger() {
    if (flux && Date.now() - fluxLe < 60000) return flux;
    flux = await fluxNotifications(etat);
    fluxLe = Date.now();
    return flux;
  }

  // Au chargement, on calcule seulement le compteur : le panneau, lui,
  // n'est construit qu'a l'ouverture.
  charger().then((liste) => {
    const seuil = derniereLecture();
    const neufs = liste.filter((e) => e.date > seuil || e.urgent).length;
    pastille.hidden = neufs === 0;
    if (neufs) pastille.textContent = neufs > 9 ? '9+' : String(neufs);
  }).catch(() => { /* la cloche n'est pas critique */ });

  async function dessiner() {
    vider(panneau);
    panneau.append(h('p.notif-tete', 'Notifications',
      h('button.bt.bt-nu.bt-mini', {
        onclick: () => { marquerLu(); pastille.hidden = true; dessiner(); },
      }, 'Tout marquer comme lu')));

    const liste = await charger();
    if (!liste.length) {
      panneau.append(h('p.notif-vide', 'Rien de neuf pour le moment.'));
      return;
    }
    const seuil = derniereLecture();
    const corps = h('div.notif-liste');
    liste.forEach((e) => {
      const neuf = e.date > seuil || e.urgent;
      const contenu = [
        icone(e.type),
        h('span.notif-texte',
          h('b', e.titre),
          e.detail ? h('span', e.detail) : null,
          h('time', depuis(new Date(e.date).toISOString()))),
        neuf ? h('span.notif-point') : null,
      ];
      corps.append(e.lien
        ? h('a.notif-ligne', { href: e.lien, onclick: () => { fermer(); } }, ...contenu)
        : h('div.notif-ligne', ...contenu));
    });
    panneau.append(corps);
  }

  function fermer() {
    panneau.hidden = true;
    bouton.setAttribute('aria-expanded', 'false');
  }

  bouton.addEventListener('click', (e) => {
    e.stopPropagation();
    const ouvrir = panneau.hidden;
    document.querySelectorAll('.menu-deroulant').forEach((m) => { m.hidden = true; });
    panneau.hidden = !ouvrir;
    bouton.setAttribute('aria-expanded', String(ouvrir));
    if (ouvrir) dessiner();
  });

  document.addEventListener('click', (e) => {
    if (!panneau.hidden && !enveloppe.contains(e.target)) fermer();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fermer(); });
}
