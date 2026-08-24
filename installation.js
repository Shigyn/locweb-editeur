// ===================================================================
//  Installation de l'espace en tant qu'application.
//
//  Interet reel pour un artisan : l'espace devient une icone sur son
//  ecran, il s'ouvre sans barre d'adresse, et il reste consultable en
//  tournee quand le reseau lache.
//
//  On ne declenche jamais l'invite tout seul : `beforeinstallprompt`
//  est capture, l'entree apparait dans le menu du compte, et c'est le
//  clic du client qui ouvre la boite de dialogue du navigateur. Une
//  invite surgie sans raison se fait refuser une fois pour toutes.
//
//  Quand le navigateur ne sait pas installer — Safari, Firefox, ou un
//  client venu chercher la version Windows — l'entree renvoie vers
//  /telecharger.html, qui reconnait l'appareil et montre le seul chemin
//  qui le concerne.
// ===================================================================

const PAGE_INSTALLATION = '/telecharger.html';

let invite = null;

function dejaInstallee() {
  return matchMedia('(display-mode: standalone)').matches
    || navigator.standalone === true;
}

export function installerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // Apres le chargement : l'enregistrement du worker ne doit pas
  // disputer la bande passante aux premieres requetes de l'app.
  addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Sans service worker l'app fonctionne normalement, elle n'est
      // simplement ni installable ni consultable hors ligne.
    });
  });
}

export function installerBoutonInstallation() {
  const menu = document.querySelector('#menu-compte');
  if (!menu || menu.querySelector('.menu-item-install')) return;
  if (dejaInstallee()) return;

  // Toujours visible, contrairement a avant : l'entree menait a une
  // impasse sur les navigateurs sans invite native, alors que c'est
  // precisement la que le client a besoin qu'on lui explique.
  const entree = document.createElement('button');
  entree.className = 'menu-item menu-item-install';
  entree.textContent = "Installer l'application";
  menu.insertBefore(entree, menu.querySelector('.menu-item-danger'));

  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    invite = e;
  });

  entree.addEventListener('click', async () => {
    // Le chemin le plus court quand le navigateur le propose : une
    // boite de dialogue, un clic, c'est installe.
    if (invite) {
      invite.prompt();
      await invite.userChoice;
      invite = null;
      return;
    }
    location.href = PAGE_INSTALLATION;
  });

  addEventListener('appinstalled', () => { entree.hidden = true; });
}
