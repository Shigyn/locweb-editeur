// ===================================================================
//  Promotions (2026-10-28, KSM) — un onglet a part de « Mon site ».
//
//  « Ajouter un plat » ouvre la liste de la carte (comme les plats
//  epuises du comptoir) ; on touche le plat, il arrive en haut de la
//  liste, on met le nouveau prix, c'est en ligne. Le plat en promo garde
//  les choix de l'original (viande, sauces, menu) : le site les reprend
//  grace a promo_de. Plus aucune promo = plus de rubrique sur le site.
// ===================================================================

import { h, vider, souffler, certain } from './outils.js';
import * as D from './donnees.js';

const euros = (n) => Number(n).toFixed(2).replace('.', ',') + ' €';

export async function rendre(page, etat, { charger } = {}) {
  const { client } = etat;
  const [{ promos }, carte] = await Promise.all([
    charger('promos', () => D.listerPromos(client.id)),
    charger('produits', () => D.listerProduits(client.id)),
  ]);
  const plats = carte.filter((p) => p.categorie && p.categorie !== 'Suppléments');

  vider(page);
  page.append(h('h1', 'Promotions'));
  page.append(h('p', { style: { color: 'var(--sourdine)', margin: '0 0 18px' } },
    'Les plats en promotion apparaissent dans la rubrique Promotions de votre site, avec les mêmes choix que le plat d’origine. Seul le prix change.'));

  const liste = h('div.promos-liste');
  let brouillon = null; // le plat choisi dans la fenetre, en attente de son prix

  function ligneBrouillon(plat) {
    const prix = h('input', { type: 'number', step: '0.01', min: '0', placeholder: 'Nouveau prix' });
    const valider = h('button.bt.bt-vif', { onclick: async () => {
      const v = Number(prix.value);
      if (!(v > 0)) { souffler('Indiquez le prix de la promotion.', 'alerte'); prix.focus(); return; }
      valider.disabled = true;
      try {
        const p = await D.creerPromo(client.id, plat, plat.nom, v);
        promos.push(p);
        brouillon = null;
        dessiner();
        souffler('Promotion en ligne sur votre site.', 'bien');
        D.syncProduitStripe(p.id);
      } catch { valider.disabled = false; souffler('Impossible d’ajouter la promotion.', 'alerte'); }
    } }, 'Mettre en promo');
    prix.addEventListener('keydown', (e) => { if (e.key === 'Enter') valider.click(); });
    setTimeout(() => prix.focus(), 0);
    return h('div.promo-ligne.promo-nouvelle',
      h('div.promo-nom', h('b', plat.nom), h('span', `Prix normal : ${euros(plat.prix)}`)),
      h('label.promo-prix', h('span', 'Prix promo (€)'), prix),
      h('div.promo-actions', valider, h('button.bt.bt-nu', { onclick: () => { brouillon = null; dessiner(); } }, 'Annuler')));
  }

  function lignePromo(p) {
    const prix = h('input', { type: 'number', step: '0.01', min: '0', value: p.prix ?? '' });
    prix.addEventListener('change', async () => {
      const v = Number(prix.value);
      if (!(v > 0)) { prix.value = p.prix; return; }
      try { await D.majProduit(p.id, { prix: v }); } catch { souffler('Enregistrement impossible.', 'alerte'); return; }
      p.prix = v;
      souffler('Prix enregistré.', 'bien');
      D.syncProduitStripe(p.id);
    });
    const origine = plats.find((x) => x.id === p.promo_de);
    return h('div.promo-ligne',
      h('div.promo-nom', h('b', p.nom),
        h('span', origine ? `Prix normal : ${euros(origine.prix)}` : (p.disponible === false ? 'Épuisée au comptoir' : 'En ligne'))),
      h('label.promo-prix', h('span', 'Prix promo (€)'), prix),
      h('div.promo-actions', h('button.bt.bt-nu', { onclick: async () => {
        if (!await certain(`« ${p.nom} » disparaîtra de la rubrique Promotions de votre site.`,
          { titre: 'Retirer cette promotion ?', action: 'Retirer', danger: true })) return;
        try { await D.retirerPromo(p.id); } catch { souffler('Impossible de retirer la promotion.', 'alerte'); return; }
        promos.splice(promos.indexOf(p), 1);
        dessiner();
        souffler('Promotion retirée.', 'bien');
      } }, 'Retirer')));
  }

  function dessiner() {
    vider(liste);
    if (brouillon) liste.append(ligneBrouillon(brouillon));
    promos.sort((a, b) => Number(a.prix) - Number(b.prix)).forEach((p) => liste.append(lignePromo(p)));
    if (!brouillon && !promos.length) liste.append(h('p.vide', 'Aucune promotion en ce moment : la rubrique Promotions est masquée sur votre site.'));
  }

  // La fenetre : toute la carte, rubrique par rubrique, un bouton par plat.
  function choisirPlat() {
    const fermer = () => { document.removeEventListener('keydown', surTouche); fond.remove(); };
    const surTouche = (e) => { if (e.key === 'Escape') fermer(); };
    const corps = h('div.promo-choix');
    const rubriques = new Map();
    plats.forEach((p) => { if (!rubriques.has(p.categorie)) rubriques.set(p.categorie, []); rubriques.get(p.categorie).push(p); });
    rubriques.forEach((lot, cat) => {
      corps.append(h('p.promo-rubrique', cat));
      corps.append(h('div.promo-grille', ...lot.sort((a, b) => String(a.nom).localeCompare(String(b.nom), 'fr')).map((p) =>
        h('button.promo-plat', { type: 'button', onclick: () => { fermer(); brouillon = p; dessiner(); } },
          h('b', p.nom), h('span', euros(p.prix))))));
    });
    const fond = h('div.fond-modale', { onclick: (e) => { if (e.target === fond) fermer(); } },
      h('div.modale.modale-large.promo-modale', { role: 'dialog', 'aria-modal': 'true' },
        h('p.modale-titre', 'Quel plat mettre en promo ?'),
        corps,
        h('div.modale-pied', h('button.bt.bt-plein', { onclick: fermer }, 'Annuler'))));
    document.body.append(fond);
    document.addEventListener('keydown', surTouche);
  }

  page.append(h('div.section', h('div.section-corps', { style: { paddingTop: '14px' } },
    h('button.bt.bt-vif', { onclick: choisirPlat, style: { marginBottom: '14px' } }, '+ Ajouter un plat'),
    liste)));
  dessiner();
}
