// ===================================================================
//  Petits outils partages entre toutes les pages de l'espace client.
// ===================================================================

export const $ = (sel, r = document) => r.querySelector(sel);

// document.createElement('svg') ne cree pas un vrai element SVG (mauvais
// espace de noms) : invisible a l'ecran. Il faut createElementNS, et sur un
// element SVG les attributs passent toujours par setAttribute (viewBox etc.
// ne sont pas de simples chaines assignables comme en HTML).
const NS_SVG = 'http://www.w3.org/2000/svg';

export function h(spec, ...reste) {
  const [balise, ...classes] = spec.split('.');
  const estSvg = balise === 'svg';
  const el = estSvg ? document.createElementNS(NS_SVG, 'svg') : document.createElement(balise || 'div');
  if (classes.length) {
    if (estSvg) el.setAttribute('class', classes.join(' '));
    else el.className = classes.join(' ');
  }
  let enfants = reste;
  if (reste[0] && typeof reste[0] === 'object' && !(reste[0] instanceof Node) && !Array.isArray(reste[0])) {
    const attrs = reste[0];
    enfants = reste.slice(1);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (!estSvg && k in el && typeof v !== 'boolean') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const enfant of enfants.flat(4)) {
    if (enfant === null || enfant === undefined || enfant === false) continue;
    el.append(enfant instanceof Node ? enfant : document.createTextNode(String(enfant)));
  }
  return el;
}

export function vider(el) { while (el.firstChild) el.firstChild.remove(); }

export function differer(fn, delai = 700) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), delai); };
}

/* Confirmation : une vraie fenetre au lieu du `confirm()` natif, qui est
   laid, non stylable, et bloque tout le navigateur. Renvoie une promesse
   pour s'utiliser exactement comme l'ancien : `if (!await certain(...))`.

   L'action destructive porte une couleur d'alerte et n'est jamais le
   bouton par defaut — Echap et le clic en dehors annulent. */
export function certain(question, { titre = 'Confirmation', action = 'Confirmer', danger = false } = {}) {
  return new Promise((resoudre) => {
    const fermer = (reponse) => {
      document.removeEventListener('keydown', surTouche);
      fond.remove();
      resoudre(reponse);
    };
    const surTouche = (e) => {
      if (e.key === 'Escape') fermer(false);
      if (e.key === 'Enter') fermer(true);
    };

    const btConfirmer = h('button.bt', {
      class: danger ? 'bt bt-danger' : 'bt bt-vif',
      onclick: () => fermer(true),
    }, action);

    const fond = h('div.fond-modale', {
      onclick: (e) => { if (e.target === fond) fermer(false); },
    },
      h('div.modale', { role: 'dialog', 'aria-modal': 'true' },
        h('p.modale-titre', titre),
        h('p.modale-texte', question),
        h('div.modale-pied',
          h('button.bt.bt-plein', { onclick: () => fermer(false) }, 'Annuler'),
          btConfirmer)));

    document.body.append(fond);
    document.addEventListener('keydown', surTouche);
    btConfirmer.focus();
  });
}

/* Export CSV : le point-virgule et le BOM sont necessaires pour qu'Excel
   en francais ouvre le fichier correctement (sinon tout atterrit dans
   une seule colonne et les accents sont casses). */
export function exporterCsv(nomFichier, colonnes, lignes) {
  const echapper = (v) => {
    const s = String(v ?? '');
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const contenu = [
    colonnes.map((c) => echapper(c.titre)).join(';'),
    ...lignes.map((l) => colonnes.map((c) => echapper(c.valeur(l))).join(';')),
  ].join('\r\n');

  const blob = new Blob(['﻿' + contenu], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const lien = h('a', { href: url, download: nomFichier });
  document.body.append(lien);
  lien.click();
  lien.remove();
  URL.revokeObjectURL(url);
}

let minuterieSouffle;
export function souffler(texte, ton = 'bien') {
  let el = $('#souffle');
  if (!el) { el = h('div', { id: 'souffle' }); document.body.append(el); }
  const fonds = { bien: 'var(--vert)', alerte: '#B8331F', veille: 'var(--ambre)' };
  el.style.background = fonds[ton] || 'var(--accent)';
  el.style.color = '#fff';
  el.textContent = texte;
  el.style.opacity = '0';
  el.style.transform = 'translateX(-50%) translateY(10px) scale(.97)';
  void el.offsetWidth;
  el.style.opacity = '1';
  el.style.transform = 'translateX(-50%) translateY(0) scale(1)';
  clearTimeout(minuterieSouffle);
  minuterieSouffle = setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(-50%) translateY(8px) scale(.97)';
  }, 2600);
}

export function prettifyKey(cle) {
  return cle.split('_').map((m) => m.charAt(0).toUpperCase() + m.slice(1)).join(' ');
}

export function depuis(iso) {
  if (!iso) return '—';
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 90) return "a l'instant";
  if (s < 5400) return `il y a ${Math.round(s / 60)} min`;
  if (s < 79200) return `il y a ${Math.round(s / 3600)} h`;
  const j = Math.round(s / 86400);
  if (j < 31) return `il y a ${j} j`;
  return `il y a ${Math.round(j / 30)} mois`;
}

export function nombre(n) { return Number(n || 0).toLocaleString('fr-FR'); }

export function euros(n) {
  if (n === null || n === undefined || n === '') return '—';
  return Number(n).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: Number.isInteger(+n) ? 0 : 2 });
}

const JOURS_LONG = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS_LONG = ['janv.', 'fevr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'aout', 'sept.', 'oct.', 'nov.', 'dec.'];
export function dateLongue(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${JOURS_LONG[d.getDay()]} ${d.getDate()} ${MOIS_LONG[d.getMonth()]}, ${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`;
}

export function jourDe(iso) { return new Date(iso).toISOString().slice(0, 10); }

export function joursGlissants(n) {
  const sortie = [];
  for (let i = n - 1; i >= 0; i--) sortie.push(jourDe(new Date(Date.now() - i * 864e5).toISOString()));
  return sortie;
}

/* Graphe en aire, une seule série, toujours à partir de vraies valeurs. */
export function grapheAires(valeurs, { hauteur = 64, couleur = 'var(--encre-douce)', voile = 'var(--surface-creux)' } = {}) {
  const L = 100, H = hauteur, marge = 2;
  const n = valeurs.length;
  const max = Math.max(1, ...valeurs);
  const x = (i) => (n <= 1 ? L / 2 : marge + (i / (n - 1)) * (L - marge * 2));
  const y = (v) => H - marge - (v / max) * (H - marge * 2);
  const ligne = valeurs.map((v, i) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(' ');
  const aire = `${marge},${H - marge} ${ligne} ${L - marge},${H - marge}`;
  return h('svg', {
    viewBox: `0 0 ${L} ${H}`, preserveAspectRatio: 'none',
    style: { width: '100%', height: hauteur + 'px', display: 'block' },
    html: `<polyline points="${aire}" fill="${voile}" stroke="none" />
           <polyline points="${ligne}" fill="none" stroke="${couleur}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />`,
  });
}

/* Camembert (anneau) + légende.

   Anneau plutôt que disque plein : le trou central accueille le total,
   et les arcs restent plus faciles à comparer que des parts pointues.
   Nuances de gris plutôt que couleurs : la teinte ne porte aucune
   information ici, seule la taille de l'arc compte. */
const NUANCES = ['1', '.72', '.52', '.36', '.24', '.15'];

export function camembert(entrees, { taille = 132, trou = 0.62 } = {}) {
  const total = entrees.reduce((s, e) => s + e.valeur, 0);
  const R = 50, r = R * trou;
  const cx = 60, cy = 60;

  let angle = -Math.PI / 2; // demarre en haut, comme une horloge
  let arcs = '';

  entrees.forEach((e, i) => {
    if (!e.valeur) return;
    const part = e.valeur / total;
    const fin = angle + part * Math.PI * 2;
    const grand = part > 0.5 ? 1 : 0;

    // Une part unique ne peut pas se dessiner en arc (debut = fin) :
    // on trace alors deux demi-anneaux qui forment le cercle complet.
    if (part >= 0.999) {
      arcs += `<path d="M ${cx} ${cy - R} A ${R} ${R} 0 1 1 ${cx - 0.01} ${cy - R} L ${cx - 0.01} ${cy - r} A ${r} ${r} 0 1 0 ${cx} ${cy - r} Z"
                 fill="var(--encre)" fill-opacity="${NUANCES[i] || '.12'}" />`;
      angle = fin;
      return;
    }

    const p = (rayon, a) => `${(cx + rayon * Math.cos(a)).toFixed(2)} ${(cy + rayon * Math.sin(a)).toFixed(2)}`;
    arcs += `<path d="M ${p(R, angle)} A ${R} ${R} 0 ${grand} 1 ${p(R, fin)} L ${p(r, fin)} A ${r} ${r} 0 ${grand} 0 ${p(r, angle)} Z"
               fill="var(--encre)" fill-opacity="${NUANCES[i] || '.12'}" />`;
    angle = fin;
  });

  const svg = h('svg', {
    viewBox: '0 0 120 120',
    style: { width: taille + 'px', height: taille + 'px', flex: 'none' },
    html: `${arcs}
      <text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="19" font-weight="700" fill="var(--encre)">${nombre(total)}</text>
      <text x="${cx}" y="${cy + 13}" text-anchor="middle" font-size="8.5" fill="var(--sourdine)">au total</text>`,
  });

  const legende = h('div.camembert-legende');
  entrees.forEach((e, i) => {
    const part = total ? Math.round((e.valeur / total) * 100) : 0;
    legende.append(h('div.camembert-ligne',
      h('span.camembert-puce', { style: { opacity: NUANCES[i] || '.12' } }),
      h('span.camembert-nom', { title: e.nom }, e.nom),
      h('span.camembert-val', `${nombre(e.valeur)} · ${part} %`)));
  });

  return h('div.camembert', svg, legende);
}

/* Graphe complet : axe des valeurs a gauche, grille horizontale, labels
   de dates dessous. Dessine en SVG sans librairie — une trentaine de
   points ne justifie pas d'embarquer Chart.js et ses 200 Ko. */
export function grapheComplet(valeurs, etiquettes, { hauteur = 220 } = {}) {
  const L = 760, H = hauteur;
  const gaucheAxe = 44, basAxe = 26, hautMarge = 12, droiteMarge = 12;
  const aireL = L - gaucheAxe - droiteMarge;
  const aireH = H - hautMarge - basAxe;

  const brut = Math.max(1, ...valeurs);
  const max = graduationHaute(brut);
  const n = valeurs.length;
  const x = (i) => gaucheAxe + (n <= 1 ? aireL / 2 : (i / (n - 1)) * aireL);
  const y = (v) => hautMarge + aireH - (v / max) * aireH;

  const NB_LIGNES = 4;
  let grille = '';
  for (let i = 0; i <= NB_LIGNES; i++) {
    const v = (max / NB_LIGNES) * i;
    const py = y(v);
    grille += `<line x1="${gaucheAxe}" y1="${py.toFixed(1)}" x2="${L - droiteMarge}" y2="${py.toFixed(1)}" stroke="var(--trait)" stroke-width="1" />`;
    grille += `<text x="${gaucheAxe - 10}" y="${(py + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="var(--sourdine)">${abrege(v)}</text>`;
  }

  const points = valeurs.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const aire = `${gaucheAxe},${hautMarge + aireH} ${points} ${x(n - 1).toFixed(1)},${hautMarge + aireH}`;

  // Un label sur deux au maximum : au-dela, ils se chevauchent et
  // deviennent illisibles plutot qu'informatifs.
  const pas = Math.max(1, Math.ceil(n / 8));
  let labels = '';
  etiquettes.forEach((e, i) => {
    if (i % pas !== 0 && i !== n - 1) return;
    labels += `<text x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="var(--sourdine)">${e}</text>`;
  });

  const pastilles = valeurs.map((v, i) =>
    `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3" fill="var(--surface)" stroke="var(--encre)" stroke-width="1.6" />`).join('');

  return h('svg', {
    viewBox: `0 0 ${L} ${H}`,
    style: { width: '100%', height: 'auto', display: 'block', overflow: 'visible' },
    html: `${grille}
           <polyline points="${aire}" fill="var(--surface-creux)" stroke="none" />
           <polyline points="${points}" fill="none" stroke="var(--encre)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
           ${n <= 32 ? pastilles : ''}
           ${labels}`,
  });
}

// Arrondit le maximum a une graduation lisible (10, 25, 50, 100...)
// pour que l'axe affiche des nombres ronds au lieu de 37,4 / 74,8.
function graduationHaute(v) {
  const magnitude = Math.pow(10, Math.floor(Math.log10(v)));
  const normalise = v / magnitude;
  const palier = normalise <= 1 ? 1 : normalise <= 2 ? 2 : normalise <= 2.5 ? 2.5 : normalise <= 5 ? 5 : 10;
  return palier * magnitude;
}

function abrege(v) {
  if (v >= 1000) return (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + 'k';
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

/* ---------- explications des indicateurs ----------
   Un artisan n'a aucune raison de savoir ce qu'est un "taux
   d'engagement". Chaque chiffre affiche porte donc sa definition en
   une phrase, en clair, sans vocabulaire d'analyste. */
export const EXPLICATIONS = {
  visiteurs: "Nombre de personnes différentes venues sur votre site. Une même personne qui revient trois fois compte pour une.",
  sessions: "Nombre de visites au total. Si un visiteur revient le lendemain, cela fait deux sessions.",
  pages_vues: "Nombre total de pages consultées, toutes visites confondues.",
  taux_engagement: "Part des visiteurs qui ont vraiment regardé votre site, au lieu de repartir aussitôt.",
  duree_moyenne: "Temps passé en moyenne sur votre site à chaque visite.",
  conversion: "Part de vos visiteurs qui vous ont contacté via le formulaire. C'est le chiffre qui relie votre site à votre chiffre d'affaires.",
  demandes: "Demandes de devis ou de contact reçues via le formulaire de votre site.",
  traiter: "Demandes auxquelles vous n'avez pas encore répondu.",
  appareils: "Répartition entre téléphone, ordinateur et tablette. Chez la plupart des artisans, le téléphone domine largement.",
  villes: "Villes d'où viennent vos visiteurs. Utile pour vérifier que votre zone d'intervention est bien couverte.",
  pages: "Les pages les plus consultées de votre site — donc les prestations qui intéressent le plus.",
  jours_semaine: "Les jours où l'on vous cherche le plus.",
};

/* Bulle d'aide au survol.

   UNE seule bulle vit dans le <body> et se deplace : une bulle enfant de
   chaque element serait coupee par le `overflow: hidden` des cartes (qui
   sert a leurs coins arrondis). C'est aussi ce que font les vraies
   librairies de tooltip, pour la meme raison. */
let bulleUnique;

function bulle() {
  if (!bulleUnique) {
    bulleUnique = h('div.bulle', { role: 'tooltip' });
    document.body.append(bulleUnique);
  }
  return bulleUnique;
}

function montrer(cible, texte) {
  const b = bulle();
  b.textContent = texte;
  b.classList.add('visible');

  const r = cible.getBoundingClientRect();
  const rb = b.getBoundingClientRect();
  const marge = 10;

  // Au-dessus par defaut ; en dessous s'il n'y a pas la place en haut.
  let haut = r.top - rb.height - 8;
  let flecheEnBas = true;
  if (haut < marge) { haut = r.bottom + 8; flecheEnBas = false; }

  // Bornee a l'ecran : sans ca, un element en bord droit pousse la bulle
  // hors du champ de vision.
  let gauche = r.left;
  const maxGauche = window.innerWidth - rb.width - marge;
  if (gauche > maxGauche) gauche = maxGauche;
  if (gauche < marge) gauche = marge;

  b.style.top = `${haut}px`;
  b.style.left = `${gauche}px`;
  b.classList.toggle('vers-bas', !flecheEnBas);
  // La fleche suit la cible meme quand la bulle a ete recalee.
  b.style.setProperty('--fleche', `${Math.max(12, Math.min(r.left - gauche + r.width / 2, rb.width - 12))}px`);
}

function cacher() {
  if (bulleUnique) bulleUnique.classList.remove('visible');
}

export function avecAide(element, aide) {
  if (!aide) return element;
  element.classList.add('a-aide');
  element.tabIndex = 0;
  element.addEventListener('mouseenter', () => montrer(element, aide));
  element.addEventListener('mouseleave', cacher);
  element.addEventListener('focus', () => montrer(element, aide));
  element.addEventListener('blur', cacher);
  return element;
}

// Une page qui defile laisserait la bulle flotter au mauvais endroit.
addEventListener('scroll', cacher, true);

export const ETATS_DEMANDE = {
  nouvelle:     { libelle: 'Nouvelle',      ton: 'action' },
  vue:          { libelle: 'Vue',           ton: '' },
  devis_envoye: { libelle: 'Devis envoyé',  ton: 'veille' },
  gagnee:       { libelle: 'Gagnée',        ton: 'bien' },
  perdue:       { libelle: 'Perdue',        ton: '' },
  indesirable:  { libelle: 'Indésirable',   ton: '' },
};

export const ETATS_CAMPAGNE = {
  demandee:       { libelle: 'Demandée',       ton: 'action' },
  en_preparation: { libelle: 'En préparation', ton: 'veille' },
  active:         { libelle: 'Active',         ton: 'bien' },
  en_pause:       { libelle: 'En pause',       ton: '' },
  terminee:       { libelle: 'Terminée',       ton: '' },
};

export function pastilleEtat(cle, table) {
  const e = table[cle] || { libelle: cle || '—', ton: '' };
  return h('span.etat', { 'data-ton': e.ton || null }, e.libelle);
}
