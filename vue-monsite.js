// ===================================================================
//  Mon editeur — contenu du site en brouillon/publication, produits,
//  historique. Reprend le comportement de l'ancienne page unique, juste
//  deplace ici : Profil et Comptes sont partis dans Parametrage.
// ===================================================================

import { h, vider, differer, souffler, certain, depuis, prettifyKey } from './outils.js';
import * as D from './donnees.js';
import { MANIFEST, GROUP_ORDER } from './manifest.js?v=6';

/* Ce que le client peut modifier depend de sa formule :
     aucun     — rien, tout passe par LocWeb ;
     essentiel — ce qui change souvent et ne casse rien (horaires, bas
                 de page, contact) ;
     complet   — l'ensemble de son site, plus ses produits.
   Un restaurant ou une boutique a besoin de "complet" : sa carte et ses
   prix bougent trop souvent pour passer par nous a chaque fois. */
const GROUPES_ESSENTIELS = ['Horaires', 'Footer', 'Contact'];

/* Ce qu'un restaurateur modifie vraiment : son accroche, ce qu'il
   propose, ses horaires et sa carte. Le reste (A propos, Engagement,
   Expertise, Preuve sociale, Offre) vient d'un modele pense pour les
   artisans et ne bouge jamais chez lui — l'afficher quand meme, c'est
   noyer les quatre sections utiles dans neuf. */
const GROUPES_RESTAURANT = ['Hero', 'Services', 'Horaires'];

/* "Autres" ramasse tout bloc sans entree au manifeste. C'est un filet
   de developpement, pas une section : le client n'a aucun moyen de
   savoir ce qu'il y trouvera, et ce qui s'y range est justement ce
   qu'on n'a pas su nommer. */
function groupesAutorises(acces, groupesPresents, secteur) {
  if (acces === 'aucun') return [];
  const tous = [...groupesPresents].filter((g) => g !== 'Autres');
  if (secteur === 'restaurateur') return tous.filter((g) => GROUPES_RESTAURANT.includes(g));
  if (acces === 'complet') return tous;
  return GROUPES_ESSENTIELS;
}
const JOURS = { lundi: 'Lundi', mardi: 'Mardi', mercredi: 'Mercredi', jeudi: 'Jeudi', vendredi: 'Vendredi', samedi: 'Samedi', dimanche: 'Dimanche' };

export async function rendre(page, etat, { charger, parQui = 'client' } = {}) {
  const { client } = etat;

  const [contenu, produits, historique] = await Promise.all([
    charger('contenu', () => D.lireContenu(client.id)),
    client.acces_client === 'complet' ? charger('produits', () => D.listerProduits(client.id)) : Promise.resolve([]),
    D.listerHistorique(client.id).catch(() => []),
  ]);

  vider(page);
  page.append(h('h1', 'Mon site'));

  const textes = contenu.filter((l) => l.type === 'texte');
  const images = contenu.filter((l) => l.type === 'image');
  const groupesPresents = new Set([...textes, ...images].map((l) => MANIFEST[l.cle_bloc]?.groupe || 'Autres'));
  const autorises = groupesAutorises(client.acces_client, groupesPresents, etat.profil?.secteur);
  // "Autres" ne figure ni dans les sections editables ni dans la liste
  // des sections geree par LocWeb : annoncer au client qu'on s'occupe
  // de ses "autres" ne lui apprend rien et l'inquiete pour rien.
  const groupesVerrouilles = [...groupesPresents]
    .filter((g) => g !== 'Autres' && !autorises.includes(g));

  const enAttente = new Set(
    [...textes, ...images]
      .filter((l) => l.valeur_brouillon !== null && autorises.includes(MANIFEST[l.cle_bloc]?.groupe || 'Autres'))
      .map((l) => l.id),
  );

  const barre = h('div.publication');
  const texteBarre = h('span.texte');
  const btPublier = h('button.bt.bt-vif', { onclick: publier }, 'Publier mes modifications');

  function majBarre() {
    const n = enAttente.size;
    vider(texteBarre);
    texteBarre.append(n
      ? h('span', h('b', String(n)), ` modification${n > 1 ? 's' : ''} non publiée${n > 1 ? 's' : ''}`)
      : h('span', { style: { color: 'var(--sourdine)' } }, 'Votre site est à jour.'));
    btPublier.disabled = n === 0;
  }

  async function publier() {
    const nb = enAttente.size;
    if (!await certain(
      `${nb} modification${nb > 1 ? 's' : ''} ${nb > 1 ? 'seront publiees' : 'sera publiee'} sur votre site, visible${nb > 1 ? 's' : ''} immédiatement par vos visiteurs.`,
      { titre: 'Publier vos modifications ?', action: 'Publier' })) return;
    btPublier.disabled = true;
    btPublier.textContent = 'Publication...';
    const ids = [...enAttente];
    let echec = false;
    for (const id of ids) {
      const ligne = [...textes, ...images].find((l) => l.id === id);
      try { await D.publierChamp(ligne, client.id, parQui); }
      catch { echec = true; continue; }
      ligne.valeur = ligne.valeur_brouillon; ligne.valeur_brouillon = null;
      enAttente.delete(id);
    }
    if (echec) souffler("Certaines modifications n'ont pas pu être publiées.", 'alerte');
    else {
      document.querySelectorAll('.champ-inline.modifie, .ligne-horaire.modifie').forEach((el) => el.classList.remove('modifie'));
      souffler('Votre site est à jour.', 'bien');
    }
    btPublier.textContent = 'Publier mes modifications';
    majBarre();
  }

  barre.append(texteBarre, h('span.droite', btPublier));

  if (client.acces_client === 'aucun') {
    page.append(h('div.section',
      h('div.section-tete', h('h2', 'Contenu de votre site')),
      h('div.section-corps', { style: { paddingTop: '14px' } },
        h('p', { style: { color: 'var(--sourdine)' } }, "L'ensemble de votre site est géré par LocWeb. Contactez-nous pour toute modification."))));
  } else {
    // GROUP_ORDER d'abord (l'ordre d'affichage du site), puis les
    // groupes hors liste pour ne rien perdre en route.
    const ordre = [...GROUP_ORDER.filter((g) => autorises.includes(g) && groupesPresents.has(g)),
                   ...autorises.filter((g) => !GROUP_ORDER.includes(g))];
    for (const groupe of ordre) {
      const lignesTexte = textes.filter((l) => (MANIFEST[l.cle_bloc]?.groupe || 'Autres') === groupe);
      const lignesImage = images.filter((l) => (MANIFEST[l.cle_bloc]?.groupe || 'Autres') === groupe);
      if (!lignesTexte.length && !lignesImage.length) continue;
      page.append(sectionGroupe(client, groupe, lignesTexte, lignesImage, enAttente, majBarre));
    }
    if (client.acces_client === 'complet') {
      page.append(sectionProduits(client, produits, etat.profil?.secteur));
    }
  }

  if (groupesVerrouilles.length && client.acces_client !== 'aucun') {
    page.append(h('div.hors-portee',
      h('strong', 'Gère par LocWeb'),
      `Le reste de votre site (${groupesVerrouilles.join(', ').toLowerCase()}) est mis à jour par notre équipe — dites-nous ce qu'il faut changer et on s'en occupe.`));
  }

  if (historique.length) page.append(carteHistorique(historique));
  page.append(barre);
  majBarre();
}

// Une icone et une phrase par section : le client reconnait la partie de
// son site dont on parle sans avoir a deviner ce que "Footer" recouvre.
const SECTIONS = {
  Hero: {
    icone: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h7M7 13h5"/>',
    texte: 'Le grand titre en haut de votre site',
  },
  Services: {
    icone: '<path d="M14.7 6.3a4 4 0 0 0 5 5l-9.4 9.4a2.8 2.8 0 0 1-4-4Z"/><path d="m18 4 2 2"/>',
    texte: 'Vos prestations',
  },
  'À propos': {
    icone: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
    texte: 'Votre présentation',
  },
  Engagement: {
    icone: '<path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="9"/>',
    texte: 'Vos engagements',
  },
  Expertise: {
    icone: '<path d="m12 3 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8L6.6 19.6l1-6L3.3 9.4l6-.9Z"/>',
    texte: 'Votre savoir-faire',
  },
  'Preuve sociale': {
    icone: '<path d="M8 10h8M8 14h5"/><path d="M4 5h16v12H8l-4 4V5Z"/>',
    texte: 'Avis et chiffres clés',
  },
  Offre: {
    icone: '<path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7"/><path d="M2 7h20v5H2z"/><path d="M12 21V7"/>',
    texte: 'Vos tarifs et formules',
  },
  Horaires: {
    icone: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    texte: 'Ouverture jour par jour',
  },
  Contact: {
    icone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>',
    texte: 'Téléphone, e-mail, adresse',
  },
  Footer: {
    icone: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 15h18"/>',
    texte: 'Bas de page, mentions légales',
  },
  Autres: {
    icone: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>',
    texte: 'Autres contenus de votre site',
  },
};

function sectionGroupe(client, groupe, lignesTexte, lignesImage, enAttente, majBarre) {
  const corps = h('div.section-corps');
  if (groupe === 'Horaires') lignesTexte.forEach((l) => corps.append(champHoraire(l, enAttente, majBarre)));
  else lignesTexte.forEach((l) => corps.append(champTexte(l, enAttente, majBarre)));
  lignesImage.forEach((l) => corps.append(champImage(client, l, enAttente, majBarre)));

  const meta = SECTIONS[groupe] || SECTIONS.Autres;
  const total = lignesTexte.length + lignesImage.length;
  const modifies = [...lignesTexte, ...lignesImage].filter((l) => l.valeur_brouillon !== null).length;

  // Tout ferme au depart : la page se lit alors comme un sommaire, une
  // ligne par section. On n'ouvre que ce qu'on vient modifier.
  // Exception : une section qui contient des modifications non publiees
  // s'ouvre d'office, sinon on risque de publier sans avoir relu.
  const bloc = h('details.section.section-pliable', { open: modifies > 0 });
  bloc.append(
    h('summary.section-resume',
      h('span.section-icone', h('svg', {
        viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
        'stroke-width': '1.7', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', html: meta.icone,
      })),
      h('span.section-infos',
        h('span.section-nom', groupe),
        h('span.section-desc', meta.texte)),
      modifies ? h('span.etat', { 'data-ton': 'veille' }, `${modifies} modif.`) : null,
      h('span.section-compte', `${total} champ${total > 1 ? 's' : ''}`),
      h('span.section-chevron', { html: '&rsaquo;' })),
    corps);
  return bloc;
}

function champTexte(ligne, enAttente, majBarre) {
  const info = MANIFEST[ligne.cle_bloc];
  const enLigne = ligne.valeur ?? '';
  const courant = ligne.valeur_brouillon ?? enLigne;
  const longue = courant.length > 70 || /\n/.test(courant);
  const saisie = h(longue ? 'textarea' : 'input', { type: longue ? null : 'text', value: courant, rows: longue ? 3 : null });
  const drapeau = h('span.drapeau', h('svg', { viewBox: '0 0 12 12', fill: 'currentColor', html: '<circle cx="6" cy="6" r="6"/>' }), 'non publie');
  const bloc = h('div.champ-inline', h('label', info?.label || prettifyKey(ligne.cle_bloc), ligne.valeur_brouillon !== null ? drapeau : null), saisie);
  if (ligne.valeur_brouillon !== null) bloc.classList.add('modifie');

  const enregistrer = differer(async (v) => {
    const identique = (v ?? '') === (enLigne ?? '');
    try { await D.ecrireBrouillon(ligne.id, identique ? null : v); }
    catch { souffler('Enregistrement impossible.', 'alerte'); return; }
    ligne.valeur_brouillon = identique ? null : v;
    if (identique) { enAttente.delete(ligne.id); bloc.classList.remove('modifie'); drapeau.remove(); }
    else { enAttente.add(ligne.id); bloc.classList.add('modifie'); if (!drapeau.isConnected) bloc.querySelector('label').append(drapeau); }
    majBarre();
  });
  saisie.addEventListener('input', () => enregistrer(saisie.value));
  return bloc;
}

function champHoraire(ligne, enAttente, majBarre) {
  const jourCle = Object.keys(JOURS).find((j) => ligne.cle_bloc.includes(j));
  const enLigne = ligne.valeur ?? '';
  const courant = ligne.valeur_brouillon ?? enLigne;
  const saisie = h('input', { type: 'text', placeholder: 'ex : 9h - 12h, 14h - 19h ou Fermé', value: courant });
  const bloc = h('div.ligne-horaire', h('span.jour', JOURS[jourCle] || prettifyKey(ligne.cle_bloc)), saisie);
  if (ligne.valeur_brouillon !== null) bloc.classList.add('modifie');

  const enregistrer = differer(async (v) => {
    const identique = (v ?? '') === (enLigne ?? '');
    try { await D.ecrireBrouillon(ligne.id, identique ? null : v); }
    catch { souffler('Enregistrement impossible.', 'alerte'); return; }
    ligne.valeur_brouillon = identique ? null : v;
    identique ? enAttente.delete(ligne.id) : enAttente.add(ligne.id);
    bloc.classList.toggle('modifie', !identique);
    majBarre();
  });
  saisie.addEventListener('input', () => enregistrer(saisie.value));
  return bloc;
}

function champImage(client, ligne, enAttente, majBarre) {
  const info = MANIFEST[ligne.cle_bloc];
  const courant = ligne.valeur_brouillon ?? ligne.valeur ?? '';
  const preview = h('img', { src: courant, alt: '' });
  const entree = h('label.entree-fichier', 'Changer la photo', h('input', { type: 'file', accept: 'image/*' }));
  const bloc = h('div.ligne-image', preview, h('div.info', h('label', info?.label || prettifyKey(ligne.cle_bloc)), entree));

  entree.querySelector('input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    souffler('Envoi de la photo...', 'veille');
    let url;
    try { url = await D.uploaderImage(client.id, file); }
    catch { souffler("Erreur lors de l'envoi de la photo.", 'alerte'); return; }
    try { await D.ecrireBrouillon(ligne.id, url); }
    catch { souffler('Enregistrement impossible.', 'alerte'); return; }
    ligne.valeur_brouillon = url;
    preview.src = url;
    enAttente.add(ligne.id);
    majBarre();
    souffler('Photo prête à être publiée.', 'bien');
  });
  return bloc;
}

const CHAMPS_SYNC_STRIPE = ['nom', 'prix', 'description', 'disponible'];

function sectionProduits(client, produits, secteur) {
  const corps = h('div.section-corps', { style: { paddingTop: '14px' } });
  const liste = h('div');
  corps.append(liste);

  // Les categories deja utilisees alimentent une liste de suggestions.
  // Sans ca, "Entrees", "entree" et "Entrée" deviennent trois rubriques
  // distinctes sur le site, et la carte part en morceaux.
  const suggestions = h('datalist', { id: 'categories-produits' });
  function majSuggestions() {
    vider(suggestions);
    [...new Set(produits.map((p) => p.categorie).filter(Boolean))]
      .forEach((c) => suggestions.append(h('option', { value: c })));
  }
  corps.append(suggestions);

  function dessiner() {
    vider(liste);
    majSuggestions();

    if (!produits.length) {
      liste.append(h('p.vide', 'Rien pour le moment.'));
      return;
    }

    // Regroupe par categorie, dans l'ordre ou chacune apparait. Pas
    // d'ordre alphabetique : sur une carte, les entrees passent avant
    // les desserts, et "Desserts, Entrees, Plats" n'a aucun sens.
    const groupes = new Map();
    produits.forEach((p) => {
      const cle = p.categorie || '';
      if (!groupes.has(cle)) groupes.set(cle, []);
      groupes.get(cle).push(p);
    });

    const retirer = (p) => {
      const i = produits.indexOf(p);
      if (i >= 0) produits.splice(i, 1);
      dessiner();
    };

    groupes.forEach((lot, cle) => {
      liste.append(h('p.groupe-produits',
        cle || 'Sans catégorie',
        h('span.groupe-compte', `${lot.length} article${lot.length > 1 ? 's' : ''}`)));
      lot.forEach((p) => liste.append(carteProduit(client, p, retirer, dessiner)));
    });
  }
  dessiner();

  corps.append(h('button.bt.bt-plein', { onclick: async () => {
    let p;
    try { p = await D.creerProduit(client.id); } catch { souffler('Impossible de créer le produit.', 'alerte'); return; }
    produits.push(p);
    dessiner();
    await D.syncProduitStripe(p.id);
  } }, secteur === 'restaurateur' ? '+ Ajouter un plat' : '+ Ajouter un produit'));

  return h('div.section',
    h('div.section-tete', h('h2', secteur === 'restaurateur' ? 'Ma carte' : 'Produits et tarifs')),
    corps);
}

function carteProduit(client, p, surSuppression, surRegroupement) {
  const nom = h('input', { type: 'text', value: p.nom ?? '' });
  const prix = h('input', { type: 'number', step: '0.01', value: p.prix ?? '' });
  const categorie = h('input', { type: 'text', value: p.categorie ?? '', list: 'categories-produits', placeholder: 'Entrées, Plats, Desserts...' });
  const desc = h('textarea', { rows: 2, value: p.description ?? '' });
  const dispo = h('input', { type: 'checkbox', checked: !!p.disponible });
  const img = h('img', { src: p.image_url || '' });
  const fichier = h('input', { type: 'file', accept: 'image/*' });

  async function sauver(field, valeur) {
    try { await D.majProduit(p.id, { [field]: valeur }); } catch { souffler('Enregistrement impossible.', 'alerte'); return; }
    p[field] = valeur;
    souffler('Enregistré.', 'bien');
    if (CHAMPS_SYNC_STRIPE.includes(field)) await D.syncProduitStripe(p.id);
  }

  nom.addEventListener('change', () => sauver('nom', nom.value));
  prix.addEventListener('change', () => sauver('prix', Number(prix.value)));
  categorie.addEventListener('change', async () => {
    await sauver('categorie', categorie.value);
    surRegroupement?.();
  });
  desc.addEventListener('change', () => sauver('description', desc.value));
  dispo.addEventListener('change', () => sauver('disponible', dispo.checked));

  fichier.addEventListener('change', async () => {
    const file = fichier.files[0];
    if (!file) return;
    let url;
    try { url = await D.uploaderImage(client.id, file); } catch { souffler("Erreur lors de l'envoi de la photo.", 'alerte'); return; }
    img.src = url;
    await sauver('image_url', url);
  });

  return h('div.produit',
    h('div.produit-tete', img, h('label.entree-fichier', 'Changer la photo', fichier)),
    h('div.produit-grille',
      h('label.champ', h('span', 'Nom'), nom),
      h('label.champ', h('span', 'Prix (EUR)'), prix),
      h('label.champ.produit-desc', h('span', 'Catégorie'), categorie),
      h('label.champ.produit-desc', h('span', 'Description'), desc)),
    h('div.produit-bas',
      h('label.produit-dispo', dispo, 'Disponible à la vente'),
      h('button.bt.bt-nu', { onclick: async () => {
        if (!await certain(
          `"${p.nom || 'Ce produit'}" sera définitivement retiré de votre site. Cette action est irréversible.`,
          { titre: 'Supprimer ce produit ?', action: 'Supprimer', danger: true })) return;
        await D.supprimerProduit(p.id);
        surSuppression(p);
      } }, 'Supprimer')));
}

function carteHistorique(historique) {
  return h('div.section',
    h('div.section-tete', h('h2', 'Historique des modifications')),
    h('div.section-corps', { style: { paddingTop: '6px' } },
      h('div', { style: { display: 'grid', gap: '2px' } },
        ...historique.map((l) => h('div', {
          style: { display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '9px 0', borderBottom: '1px solid var(--trait)', fontSize: '.86rem' },
        },
          h('span', (MANIFEST[l.cle_bloc]?.label || prettifyKey(l.cle_bloc)) + (l.publie_par === 'operateur' ? ' (par LocWeb)' : '')),
          h('span', { style: { color: 'var(--sourdine)', whiteSpace: 'nowrap' } }, depuis(l.date_publication)))))));
}
