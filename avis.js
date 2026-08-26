// ===================================================================
//  Demander un avis Google.
//
//  Les avis sont le premier levier de referencement local d'un
//  artisan. Personne n'en demande — non par negligence, mais parce
//  qu'il faudrait retrouver le bon lien dans son compte Google au
//  moment precis ou on a le client en face de soi, en fin de chantier,
//  les mains sales. C'est-a-dire jamais.
//
//  D'ou le QR : le lien est enregistre une fois, l'espace en fait un
//  code que le client montre sur son telephone. L'autre le scanne, le
//  formulaire d'avis s'ouvre. Plus rien a retrouver.
//
//  Le QR est dessine ici, hors ligne, par une bibliotheque vendorisee
//  — voir vendor/LISEZ-MOI.md pour la raison.
// ===================================================================

import { h, souffler } from './outils.js';
import qrcode from './vendor/qrcode.mjs';

/* Correction d'erreur 'M' : un QR reste lisible avec 15 % de sa
   surface abimee. Sur un ecran de telephone c'est superflu, mais le
   meme code finit souvent imprime et scotche sur un comptoir. */
const CORRECTION = 'M';

/** Le QR en SVG : il reste net imprime en A4 comme affiche en 120 px. */
function dessinerQr(texte, taille = 168) {
  const qr = qrcode(0, CORRECTION); // 0 = version choisie automatiquement
  qr.addData(texte);
  qr.make();

  const modules = qr.getModuleCount();
  const chemins = [];
  for (let l = 0; l < modules; l += 1) {
    for (let c = 0; c < modules; c += 1) {
      if (qr.isDark(l, c)) chemins.push(`M${c} ${l}h1v1h-1z`);
    }
  }

  return h('svg.qr-avis', {
    viewBox: `0 0 ${modules} ${modules}`,
    width: String(taille), height: String(taille),
    role: 'img',
    'aria-label': 'QR code vers le formulaire d\'avis Google',
    // `shape-rendering` : sans lui le navigateur lisse les carres et
    // laisse des liserés gris entre eux, que certains lecteurs ratent.
    'shape-rendering': 'crispEdges',
    html: `<rect width="${modules}" height="${modules}" fill="#fff"/>`
      + `<path d="${chemins.join('')}" fill="#000"/>`,
  });
}

/** Un lien d'avis Google plausible ? On refuse le reste sans deviner. */
export function lienValide(url) {
  const u = String(url || '').trim();
  if (!u) return false;
  try {
    const { protocol, hostname } = new URL(u);
    if (protocol !== 'https:') return false;
    return /(^|\.)g\.page$/.test(hostname)
      || /(^|\.)google\.com$/.test(hostname)
      || /(^|\.)maps\.app\.goo\.gl$/.test(hostname);
  } catch { return false; }
}

/* ---------- le bloc affiche au client ---------- */

export function blocAvis(profil) {
  const lien = profil?.lien_avis_google;

  const carte = h('div.avis-carte');

  if (!lienValide(lien)) {
    // Pas de lien : on explique ou le trouver, sans faire semblant
    // d'avoir un QR. Un QR vide serait pire que pas de QR.
    carte.append(
      h('p.avis-titre', 'Demander un avis Google'),
      h('p.avis-texte',
        "Les avis sont ce qui fait remonter votre fiche dans les résultats du coin. "
        + "Pour en demander en un geste, il nous faut votre lien d'avis — "
        + "on vous le met en place, écrivez-nous depuis la page Aide."),
    );
    return carte;
  }

  const champ = h('input.avis-lien', {
    type: 'text', value: lien, readonly: true,
    'aria-label': "Lien vers le formulaire d'avis",
    onclick: (e) => e.target.select(),
  });

  carte.append(
    h('div.avis-corps',
      dessinerQr(lien),
      h('div.avis-texte-zone',
        h('p.avis-titre', 'Demander un avis Google'),
        h('p.avis-texte',
          "Montrez ce code à votre client en fin de chantier : il le scanne "
          + 'avec son téléphone et le formulaire d\'avis s\'ouvre directement.'),
        h('div.avis-actions',
          champ,
          h('button.bt.bt-nu', {
            onclick: async () => {
              try {
                await navigator.clipboard.writeText(lien);
                souffler('Lien copié.', 'bien');
              } catch {
                // Presse-papier refuse (contexte non securise, permission) :
                // on selectionne, le client fait Ctrl+C lui-meme.
                champ.select();
                souffler('Appuyez sur Ctrl+C pour copier.', 'info');
              }
            },
          }, 'Copier le lien'),
          h('a.bt.bt-nu', { href: lien, target: '_blank', rel: 'noopener noreferrer' }, 'Ouvrir')))),
  );

  return carte;
}
