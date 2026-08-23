// ===================================================================
//  Service worker — rend l'espace installable et consultable hors ligne.
//
//  Strategie : le reseau d'abord, le cache en secours.
//
//  L'inverse (cache d'abord) serait plus rapide, mais cette app est
//  redeployee a chaque correction : un client se retrouverait avec une
//  version figee sans aucun moyen de s'en apercevoir. Ici, tant qu'il y
//  a du reseau il voit la derniere version ; le cache ne sert que quand
//  la connexion tombe — sur un chantier, dans un sous-sol, en tournee.
//
//  Rien de ce qui vient de Supabase n'est mis en cache : des
//  statistiques ou des demandes de devis perimees affichees comme
//  fraiches seraient pires que pas de donnees du tout.
// ===================================================================

const CACHE = 'locweb-espace-v1';

// Le strict necessaire pour que l'app s'ouvre hors ligne. Le reste des
// modules est mis en cache au fil de la navigation.
const COQUILLE = [
  '/',
  '/index.html',
  '/app.webmanifest',
  '/icone-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(COQUILLE))
      // Une coquille incomplete ne doit pas empecher l'installation :
      // le reseau prend le relais de toute facon.
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((noms) => Promise.all(noms.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Tout ce qui n'est pas servi par ce domaine part directement au
  // reseau : Supabase, Google Fonts, les appels d'API.
  if (url.origin !== self.location.origin) return;

  e.respondWith((async () => {
    try {
      // `no-cache` force la revalidation aupres du serveur pour le code
      // de l'app. Sans ca, GitHub Pages sert un module js depuis le
      // cache HTTP du navigateur pendant plusieurs minutes apres un
      // deploiement — et le client voit un melange d'ancien et de
      // nouveau, ce qui est pire qu'une version en retard.
      const estCode = /\.(js|css|webmanifest)$/i.test(url.pathname);
      const reponse = await fetch(req, estCode ? { cache: 'no-cache' } : undefined);
      // On ne garde que les reponses completes : mettre une 404 ou une
      // reponse partielle en cache reviendrait a figer une panne.
      if (reponse.ok && reponse.type === 'basic') {
        const copie = reponse.clone();
        caches.open(CACHE).then((c) => c.put(req, copie)).catch(() => undefined);
      }
      return reponse;
    } catch {
      const enCache = await caches.match(req);
      if (enCache) return enCache;

      // Une navigation hors ligne retombe sur la page d'accueil : le
      // routage se fait cote client, elle sait afficher la bonne vue.
      if (req.mode === 'navigate') {
        const coquille = await caches.match('/index.html');
        if (coquille) return coquille;
      }
      throw new Error('hors ligne');
    }
  })());
});

// Permet a la page de forcer l'activation d'une nouvelle version sans
// attendre la fermeture de tous les onglets.
self.addEventListener('message', (e) => {
  if (e.data === 'active-toi') self.skipWaiting();
});
