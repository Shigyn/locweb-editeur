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

export function certain(q) { return window.confirm(q); }

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

/* Graphe en aire, une seule serie, toujours a partir de vraies valeurs. */
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

export const ETATS_DEMANDE = {
  nouvelle:     { libelle: 'Nouvelle',      ton: 'action' },
  vue:          { libelle: 'Vue',           ton: '' },
  devis_envoye: { libelle: 'Devis envoye',  ton: 'veille' },
  gagnee:       { libelle: 'Gagnee',        ton: 'bien' },
  perdue:       { libelle: 'Perdue',        ton: '' },
  indesirable:  { libelle: 'Indesirable',   ton: '' },
};

export const ETATS_CAMPAGNE = {
  demandee:       { libelle: 'Demandee',       ton: 'action' },
  en_preparation: { libelle: 'En preparation', ton: 'veille' },
  active:         { libelle: 'Active',         ton: 'bien' },
  en_pause:       { libelle: 'En pause',       ton: '' },
  terminee:       { libelle: 'Terminee',       ton: '' },
};

export function pastilleEtat(cle, table) {
  const e = table[cle] || { libelle: cle || '—', ton: '' };
  return h('span.etat', { 'data-ton': e.ton || null }, e.libelle);
}
