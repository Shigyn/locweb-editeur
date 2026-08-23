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
  erreurConnexion.textContent = `E-mail envoyé à ${email} si ce compte existe.`;
});

$('#bt-deconnexion').addEventListener('click', async () => { await D.deconnexion(); location.reload(); });
$('#bt-deconnexion-menu')?.addEventListener('click', async () => { await D.deconnexion(); location.reload(); });

/* ---------- menu du compte ---------- */

const avatar = $('#entete-avatar');
const menuCompte = $('#menu-compte');

avatar?.addEventListener('click', (e) => {
  e.stopPropagation();
  const ouvert = !menuCompte.hidden;
  menuCompte.hidden = ouvert;
  avatar.setAttribute('aria-expanded', String(!ouvert));
});
// Clic ailleurs ou Echap : referme. Un menu qui reste ouvert derriere le
// contenu est plus genant qu'utile.
document.addEventListener('click', () => {
  if (menuCompte && !menuCompte.hidden) {
    menuCompte.hidden = true;
    avatar.setAttribute('aria-expanded', 'false');
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menuCompte && !menuCompte.hidden) {
    menuCompte.hidden = true;
    avatar.setAttribute('aria-expanded', 'false');
  }
});

/* ---------- theme clair / sombre ---------- */

const THEMES = { clair: 'sombre', sombre: 'clair' };

function appliquerTheme(t) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('locweb-theme-client', t); } catch { /* navigation privee */ }
}

appliquerTheme((() => {
  try {
    const enregistre = localStorage.getItem('locweb-theme-client');
    if (enregistre === 'clair' || enregistre === 'sombre') return enregistre;
  } catch { /* navigation privee */ }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'sombre' : 'clair';
})());

$('#bt-theme')?.addEventListener('click', () => {
  appliquerTheme(THEMES[document.documentElement.dataset.theme] || 'sombre');
});

async function apresConnexion() {
  const client = await D.monClient();
  if (!client) {
    erreurConnexion.textContent = 'Aucun client associé à ce compte.';
    await D.deconnexion();
    return;
  }
  etat.client = client;
  etat.profil = await D.monProfil(client.id);

  ecranConnexion.style.display = 'none';
  espace.style.display = 'block';
  installerBoutonMaj();
  const nom = client.nom_site || 'votre site';
  $('#nom-site').textContent = nom;
  $('#entete-nom').textContent = nom;
  $('#entete-avatar').textContent = nom.trim().slice(0, 2).toUpperCase();
  $('#menu-nom').textContent = nom;
  const { data: { user: compte } } = await D.sb.auth.getUser();
  $('#menu-mail').textContent = compte?.email || '';

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
    // Chauffe le cache avant meme que l'utilisateur ne navigue : les
    // appels Google partent maintenant, la premiere page qui en a besoin
    // trouvera la reponse deja prete. Volontairement sans `await` — rien
    // ici ne doit retarder l'affichage.
    D.prechargerStats(etat.profil);
    charger('demandes', () => D.listerDemandes(client.id));
    charger('contenu', () => D.lireContenu(client.id));

    await router();
    rafraichirPastille();
  }

  // Les modules transverses se greffent sur l'entete — laquelle est
  // masquee pendant l'onboarding. Rien a installer tant qu'on y est.
  if (espace.classList.contains('mode-onboarding')) return;
  const [{ installerCloche }, { installerPalette }, installation] = await Promise.all([
    import('./notifications.js'),
    import('./palette.js'),
    import('./installation.js'),
  ]);
  installerCloche(etat);
  installerPalette(etat);
  installation.installerBoutonInstallation();
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
  rapports:    () => import('./vue-rapports.js'),
  'mes-infos': () => import('./vue-mes-infos.js'),
  parametrage: () => import('./vue-parametrage.js'),
  parrainage:  () => import('./vue-parrainage.js'),
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

  document.querySelectorAll('a[data-route]').forEach((a) => {
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
      h('button.bt.bt-plein', { onclick: () => { oublier(); router(); }, style: { marginTop: '10px' } }, 'Réessayer'))));
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

/* ---------- installation sur le telephone ---------- */

// Avant meme la connexion : la page de connexion fait partie de la
// coquille mise en cache, sinon un client hors ligne ouvrirait une
// icone sur une page blanche.
import('./installation.js').then((m) => m.installerServiceWorker());

/* ---------- reprise de session ---------- */

D.session().then((s) => { if (s) apresConnexion(); else ecranConnexion.style.display = 'grid'; });

/* ---------- bouton "Nouveautes" ----------

   Un point rouge tant que la derniere version n'a pas ete ouverte. La
   version vue est gardee dans le navigateur : elle n'a de sens que pour
   cet appareil, et la stocker en base ferait une requete de plus au
   demarrage pour une information sans enjeu. */

import { VERSIONS, VERSION_ACTUELLE } from './versions.js';

const CLE_VUE = 'locweb-version-vue';

function versionVue() {
  try { return localStorage.getItem(CLE_VUE); } catch { return VERSION_ACTUELLE; }
}

function marquerVue() {
  try { localStorage.setItem(CLE_VUE, VERSION_ACTUELLE); } catch { /* navigation privee */ }
}

function installerBoutonMaj() {
  if (document.querySelector('.maj-bouton')) return;
  const aDuNeuf = versionVue() !== VERSION_ACTUELLE;

  const pastille = h('span.maj-pastille', { hidden: !aDuNeuf });
  const bouton = h('button.maj-bouton', {
    title: 'Nouveautés',
    'aria-label': 'Voir les nouveautés',
    onclick: () => { ouvrirNouveautes(); },
  },
    h('svg', {
      viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
      'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      html: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    }),
    pastille);

  document.body.append(bouton);

  function ouvrirNouveautes() {
    marquerVue();
    pastille.hidden = true;

    const liste = h('div.maj-liste');
    VERSIONS.forEach((v, i) => {
      liste.append(h('div.maj-version',
        h('div.maj-entete',
          h('span.maj-num', `Version ${v.version}`),
          i === 0 && aDuNeuf ? h('span.etat', { 'data-ton': 'bien' }, 'Nouveau') : null,
          h('span.maj-date', new Date(v.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }))),
        h('p.maj-titre', v.titre),
        h('ul.maj-points', ...v.points.map((p) => h('li', p)))));
    });

    const fond = h('div.fond-modale', { onclick: (e) => { if (e.target === fond) fond.remove(); } },
      h('div.modale.modale-large', { role: 'dialog', 'aria-modal': 'true' },
        h('p.modale-titre', 'Nouveautés de votre espace'),
        h('p.modale-texte', "Ce qui a changé récemment, du plus récent au plus ancien."),
        liste,
        h('div.modale-pied', h('button.bt.bt-vif', { onclick: () => fond.remove() }, 'Compris'))));

    const surTouche = (e) => {
      if (e.key !== 'Escape') return;
      fond.remove();
      document.removeEventListener('keydown', surTouche);
    };
    document.addEventListener('keydown', surTouche);
    document.body.append(fond);
  }
}

