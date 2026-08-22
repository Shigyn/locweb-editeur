// ===================================================================
//  Espace client LocWeb — noyau : connexion, questionnaire d'accueil,
//  routage entre les pages (Accueil, Mon site, Acquisition, Mon
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
  $('#nom-site').textContent = client.nom_site || 'votre site';
  const lienSite = $('#lien-site');
  if (client.domaine) {
    lienSite.href = /^https?:\/\//.test(client.domaine) ? client.domaine : `https://${client.domaine}`;
    lienSite.hidden = false;
  }

  if (!etat.profil || !etat.profil.complete_le) {
    await rendreAccueilOnboarding();
  } else {
    await router();
    rafraichirPastille();
  }
}

/* ---------- mini questionnaire, une fois apres la livraison ---------- */

async function rendreAccueilOnboarding() {
  const page = $('#page');
  vider(page);

  const zone = h('input', { type: 'text', placeholder: 'ex : Beziers et 20 km alentour', value: etat.profil?.zone_intervention || '' });
  const facebook = h('input', { type: 'text', placeholder: 'https://facebook.com/...', value: etat.profil?.reseaux?.facebook || '' });
  const instagram = h('input', { type: 'text', placeholder: 'https://instagram.com/...', value: etat.profil?.reseaux?.instagram || '' });
  const google = h('input', { type: 'text', placeholder: 'Lien de votre fiche Google', value: etat.profil?.google_business_url || '' });
  const bouton = h('button.bt.bt-vif.bt-large', { type: 'submit' }, 'Valider et continuer');
  const skip = h('button.bt.bt-nu', { type: 'button', onclick: async () => { await router(); rafraichirPastille(); } }, "Passer pour l'instant");

  const form = h('form', {
    onsubmit: async (e) => {
      e.preventDefault();
      bouton.disabled = true;
      bouton.textContent = 'Enregistrement...';
      try {
        await D.majProfil(etat.client.id, {
          zone_intervention: zone.value || null,
          reseaux: { facebook: facebook.value || null, instagram: instagram.value || null },
          google_business_url: google.value || null,
          complete_le: new Date().toISOString(),
        });
      } catch { souffler('Enregistrement impossible.', 'alerte'); bouton.disabled = false; bouton.textContent = 'Valider et continuer'; return; }
      etat.profil = { ...(etat.profil || {}), complete_le: new Date().toISOString() };
      await router();
      rafraichirPastille();
    },
  },
    h('label.champ', h('span', "Ou intervenez-vous ?"), zone),
    h('label.champ', h('span', 'Facebook (optionnel)'), facebook),
    h('label.champ', h('span', 'Instagram (optionnel)'), instagram),
    h('label.champ', h('span', 'Votre fiche Google (optionnel)'), google),
    h('div', { style: { display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap' } }, bouton, skip),
  );

  page.append(h('div.section',
    h('div.section-tete', h('h2', 'Bienvenue !'), h('p', 'Quatre petites questions pour finir de configurer votre espace — deux minutes.')),
    h('div.section-corps', { style: { paddingTop: '14px' } }, form)));
}

/* ---------- routage ---------- */

const page = $('#page');
const VUES = {
  accueil:     () => import('./vue-accueil.js'),
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
  const nom = (location.hash.replace(/^#\/?/, '') || 'accueil').split('/')[0];
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
