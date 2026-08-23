// ===================================================================
//  Installation de l'app sur le telephone.
//
//  Interet reel pour un artisan : l'espace devient une icone sur
//  l'ecran d'accueil, il s'ouvre en plein ecran sans barre d'adresse,
//  et il reste consultable en tournee quand le reseau lache.
//
//  On ne declenche jamais l'invite tout seul : `beforeinstallprompt`
//  est capture, l'entree apparait dans le menu du compte, et c'est le
//  clic du client qui ouvre la boite de dialogue du navigateur. Une
//  invite surgie sans raison se fait refuser une fois pour toutes.
// ===================================================================

import { h, souffler } from './outils.js';

const CLE_REFUS = 'locweb-install-refuse';

let invite = null;

/** iOS ne fournit aucune API : l'ajout se fait a la main depuis Safari. */
function estIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
}

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

  const entree = h('button.menu-item.menu-item-install', { hidden: true },
    "Installer l'application");
  menu.insertBefore(entree, menu.querySelector('.menu-item-danger'));

  /* ---------- Android, Chrome, Edge : invite native ---------- */

  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    invite = e;
    if (localStorage.getItem(CLE_REFUS) !== 'oui') entree.hidden = false;
  });

  entree.addEventListener('click', async () => {
    if (estIOS()) { expliquerIOS(); return; }
    if (!invite) return;
    invite.prompt();
    const { outcome } = await invite.userChoice;
    invite = null;
    entree.hidden = true;
    if (outcome === 'dismissed') {
      // On ne represente pas l'entree : un refus est une reponse.
      try { localStorage.setItem(CLE_REFUS, 'oui'); } catch { /* navigation privee */ }
    }
  });

  addEventListener('appinstalled', () => {
    entree.hidden = true;
    souffler('Application installée.', 'bien');
  });

  /* ---------- iOS : pas d'API, on montre la marche a suivre ---------- */

  if (estIOS() && localStorage.getItem(CLE_REFUS) !== 'oui') entree.hidden = false;

  function expliquerIOS() {
    const fond = h('div.fond-modale', { onclick: (e) => { if (e.target === fond) fond.remove(); } },
      h('div.modale', { role: 'dialog', 'aria-modal': 'true' },
        h('p.modale-titre', "Ajouter à votre écran d'accueil"),
        h('p.modale-texte', "Sur iPhone, l'ajout se fait depuis Safari, en trois gestes :"),
        h('ol.install-etapes',
          h('li', 'Touchez le bouton Partager, en bas de Safari.'),
          h('li', 'Faites défiler puis touchez « Sur l\'écran d\'accueil ».'),
          h('li', 'Touchez « Ajouter », en haut à droite.')),
        h('div.modale-pied',
          h('button.bt.bt-nu', {
            onclick: () => {
              try { localStorage.setItem(CLE_REFUS, 'oui'); } catch { /* navigation privee */ }
              entree.hidden = true;
              fond.remove();
            },
          }, 'Ne plus proposer'),
          h('button.bt.bt-vif', { onclick: () => fond.remove() }, 'Compris'))));
    document.body.append(fond);
  }
}
