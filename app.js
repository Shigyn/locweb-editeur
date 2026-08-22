// ===================================================================
//  Espace client LocWeb — noyau : connexion, questionnaire d'accueil,
//  routage entre les pages (Accueil, Mon editeur, Acquisition, Mon
//  activite, Parametrage, Aide).
// ===================================================================

import { $, h, vider, souffler } from './outils.js';
import * as D from './donnees.js';

export const etat = { client: null, profil: null };

/* ---------- cache leger : evite de recharger a chaque navigation ---------- */

const cache = new Map();
export async function charger(cle, fabrique) {
  if (!cache.has(cle)) cache.set(cle, fabrique().catch((e) => { cache.delete(cle); throw e; }));
  return cache.get(cle);
}
export function oublier(prefixe = '') {
  for (const c of [...cache.keys()]) if (!prefixe || c.startsWith(prefixe)) cache.delete(c);
}

/* ---------- connexion ---------- */

const ecranConnexion = $('#ecran-connexion');
const espace = $('#espace');
const erreurConnexion = $('#connexion-erreur');

$('#form-connexion').addEventListener('submit', async (e) => {
  e.preventDefault();
  const bouton = $('#bt-connexion');
  erreurConnexion.textContent = '';
  bouton.disabled = true;
  bouton.textContent = 'Connexion...';
  const err = await D.connexion($('#ident-email').value.trim(), $('#ident-mdp').value);
  bouton.disabled = false;
  bouton.textContent = 'Se connecter';
  if (err) { erreurConnexion.textContent = 'Identifiants incorrects.'; return; }
  await apresConnexion();
});

$('#bt-oubli').addEventListener('click', async () => {
  const email = $('#ident-email').value.trim();
  if (!email) { erreurConnexion.textContent = "Renseignez d'abord votre e-mail ci-dessus."; return; }
  await D.motDePasseOublie(email);
  erreurConnexion.style.color = '';
  erreurConnexion.textContent = `E-mail envoye a ${email} si ce compte existe.`;
});

$('#bt-deconnexion').addEventListener('click', async () => { await D.deconnexion(); location.reload(); });

async function apresConnexion() {
  const client = await D.monClient();
  if (!client) {
    erreurConnexion.textContent = 'Aucun client associe a ce compte.';
    await D.deconnexion();
    return;
  }
  etat.client = client;
  etat.profil = await D.monProfil(client.id);

  ecranConnexion.style.display = 'none';
  espace.style.display = 'block';
  const nom = client.nom_site || 'votre site';
  $('#nom-site').textContent = nom;
  $('#entete-nom').textContent = nom;
  $('#entete-avatar').textContent = nom.trim().slice(0, 2).toUpperCase();

  if (client.domaine) {
    const url = /^https?:\/\//.test(client.domaine) ? client.domaine : `https://${client.domaine}`;
    for (const sel of ['#lien-site', '#entete-site']) {
      const el = $(sel);
      if (el) { el.href = url; el.hidden = false; }
    }
  }

  if (!etat.profil || !etat.profil.complete_le) {
    await rendreAccueilOnboarding();
  } else {
    await router();
    rafraichirPastille();
  }
}

/* ---------- onboarding en 5 etapes, a la premiere connexion ---------- */

// Plein ecran : pendant l'onboarding le menu lateral n'a aucun sens, on
// n'a rien a piloter tant que l'espace n'est pas configure. La classe
// sur #espace masque le rail et l'entete d'un seul geste, sans toucher
// a la structure du document.
async function rendreAccueilOnboarding() {
  espace.classList.add('mode-onboarding');
  const module = await import('./vue-onboarding.js');
  await module.rendre($('#page'), etat, {
    router,
    rafraichirPastille,
    terminer: async () => {
      espace.classList.remove('mode-onboarding');
      location.hash = '#/accueil';
      await router();
      rafraichirPastille();
    },
  });
}

/* ---------- routage ---------- */

const page = $('#page');
const VUES = {
  accueil:      () => import('./vue-accueil.js'),
  performances: () => import('./vue-performances.js'),
  'mon-site':  () => import('./vue-monsite.js'),
  acquisition: () => import('./vue-acquisition.js'),
  activite:    () => import('./vue-activite.js'),
  parametrage: () => import('./vue-parametrage.js'),
  aide:        () => import('./vue-aide.js'),
};

function squelette() {
  vider(page);
  page.append(h('div.squelette'), h('div.squelette'), h('div.squelette'));
}

let jeton = 0;

export async function router() {
  const nom = (location.hash.replace(/^#\/?/, '') || 'accueil').split(/[/?]/)[0];
  const importer = VUES[nom] || VUES.accueil;
  const mien = ++jeton;
  squelette();

  document.querySelectorAll('.rail-nav a[data-route]').forEach((a) => {
    a.setAttribute('aria-current', a.dataset.route === nom ? 'page' : 'false');
  });

  try {
    const module = await importer();
    if (mien !== jeton) return;
    vider(page);
    await module.rendre(page, etat, { charger, oublier, rafraichirPastille });
  } catch (e) {
    if (mien !== jeton) return;
    console.error(e);
    vider(page);
    page.append(h('div.section', h('div.section-corps', { style: { paddingTop: '14px' } },
      h('p.mot', { 'data-ton': 'alerte' }, 'Impossible de charger cette page.'),
      h('button.bt.bt-plein', { onclick: () => { oublier(); router(); }, style: { marginTop: '10px' } }, 'Reessayer'))));
  }
}

addEventListener('hashchange', router);

export async function rafraichirPastille() {
  try {
    const demandes = await charger('demandes', () => D.listerDemandes(etat.client.id));
    const n = demandes.filter((d) => (d.statut || 'nouvelle') === 'nouvelle').length;
    const el = $('#pastille-activite');
    el.textContent = n > 99 ? '99+' : String(n);
    el.hidden = n === 0;
  } catch { /* le rail n'est pas critique */ }
}

/* ---------- reprise de session ---------- */

D.session().then((s) => { if (s) apresConnexion(); else ecranConnexion.style.display = 'grid'; });
