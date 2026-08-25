// ===================================================================
//  Application de bureau — la barre de titre, refaite par nous.
//
//  La fenetre Windows est ouverte sans decoration : plus de bandeau
//  gris au-dessus d'une interface qui a deja son propre entete. En
//  echange, deux choses que le systeme assurait doivent etre reprises
//  ici : de quoi fermer la fenetre, et de quoi l'attraper pour la
//  deplacer.
//
//  Rien de tout cela n'existe dans le navigateur. `window.__TAURI__`
//  n'y est pas defini, la fonction sort immediatement, et pas une
//  regle de style ne s'applique : la classe `dans-application` n'est
//  jamais posee.
// ===================================================================

/** La fenetre est-elle celle de l'application installee ? */
function dansApplication() {
  return typeof window.__TAURI__ !== 'undefined';
}

export function preparerFenetreBureau() {
  if (!dansApplication()) return;

  document.documentElement.classList.add('dans-application');

  const fenetre = window.__TAURI__.window.getCurrentWindow();

  /* ---------- de quoi deplacer la fenetre ---------- */

  // Sans barre de titre, il faut designer ce qu'on peut attraper.
  // `.entete` dans l'application, `.connexion` sur l'ecran d'entree :
  // dans les deux cas une large zone vide, la ou on chercherait a
  // saisir la fenetre. Tauri ne declenche le deplacement que sur
  // l'element portant l'attribut, jamais sur ses enfants — les
  // boutons de l'entete restent donc cliquables.
  const marquer = () => {
    for (const el of document.querySelectorAll('.entete, .connexion')) {
      el.setAttribute('data-tauri-drag-region', '');
    }
  };
  marquer();

  // `.entete` n'existe qu'une fois le client connecte.
  new MutationObserver(marquer).observe(document.body, { childList: true, subtree: true });

  /* ---------- la croix ---------- */

  const croix = document.createElement('button');
  croix.className = 'fermer-application';
  croix.type = 'button';
  croix.title = "Quitter l'application";
  croix.setAttribute('aria-label', "Quitter l'application");
  croix.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"'
    + ' stroke-width="1.8" stroke-linecap="round" aria-hidden="true">'
    + '<path d="M6 6l12 12M18 6L6 18"/></svg>';

  croix.addEventListener('click', () => {
    // Un echec ne doit pas laisser le client devant un bouton mort :
    // Alt+F4 reste toujours disponible, on le lui rappelle.
    fenetre.close().catch(() => {
      croix.title = "Impossible de fermer d'ici — utilisez Alt+F4";
    });
  });

  document.body.append(croix);
}
