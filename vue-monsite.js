// ===================================================================
//  Mon site — contenu du site en brouillon/publication, produits,
//  historique. Reprend le comportement de l'ancienne page unique, juste
//  deplace ici : Profil et Comptes sont partis dans Parametrage.
// ===================================================================

import { h, vider, differer, souffler, certain, depuis, prettifyKey } from './outils.js';
import * as D from './donnees.js';
import { MANIFEST, GROUP_ORDER } from './manifest.js?v=6';

const GROUPES_AUTORISES = ['Horaires', 'Footer'];
const JOURS = { lundi: 'Lundi', mardi: 'Mardi', mercredi: 'Mercredi', jeudi: 'Jeudi', vendredi: 'Vendredi', samedi: 'Samedi', dimanche: 'Dimanche' };

export async function rendre(page, etat, { charger }) {
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
  const groupesVerrouilles = [...groupesPresents].filter(
    (g) => client.acces_client === 'aucun' || !GROUPES_AUTORISES.includes(g),
  );

  const enAttente = new Set(
    [...textes, ...images]
      .filter((l) => l.valeur_brouillon !== null && GROUPES_AUTORISES.includes(MANIFEST[l.cle_bloc]?.groupe || 'Autres'))
      .map((l) => l.id),
  );

  const barre = h('div.publication');
  const texteBarre = h('span.texte');
  const btPublier = h('button.bt.bt-vif', { onclick: publier }, 'Publier mes modifications');

  function majBarre() {
    const n = enAttente.size;
    vider(texteBarre);
    texteBarre.append(n
      ? h('span', h('b', String(n)), ` modification${n > 1 ? 's' : ''} non publiee${n > 1 ? 's' : ''}`)
      : h('span', { style: { color: 'var(--sourdine)' } }, 'Votre site est a jour.'));
    btPublier.disabled = n === 0;
  }

  async function publier() {
    if (!certain(`Publier ${enAttente.size} modification(s) sur votre site maintenant ?`)) return;
    btPublier.disabled = true;
    btPublier.textContent = 'Publication...';
    const ids = [...enAttente];
    let echec = false;
    for (const id of ids) {
      const ligne = [...textes, ...images].find((l) => l.id === id);
      try { await D.publierChamp(ligne, client.id); }
      catch { echec = true; continue; }
      ligne.valeur = ligne.valeur_brouillon; ligne.valeur_brouillon = null;
      enAttente.delete(id);
    }
    if (echec) souffler("Certaines modifications n'ont pas pu etre publiees.", 'alerte');
    else {
      document.querySelectorAll('.champ-inline.modifie, .ligne-horaire.modifie').forEach((el) => el.classList.remove('modifie'));
      souffler('Votre site est a jour.', 'bien');
    }
    btPublier.textContent = 'Publier mes modifications';
    majBarre();
  }

  barre.append(texteBarre, h('span.droite', btPublier));

  if (client.acces_client === 'aucun') {
    page.append(h('div.section',
      h('div.section-tete', h('h2', 'Contenu de votre site')),
      h('div.section-corps', { style: { paddingTop: '14px' } },
        h('p', { style: { color: 'var(--sourdine)' } }, "L'ensemble de votre site est gere par LocWeb. Contactez-nous pour toute modification."))));
  } else {
    for (const groupe of GROUP_ORDER.filter((g) => GROUPES_AUTORISES.includes(g) && groupesPresents.has(g))) {
      const lignesTexte = textes.filter((l) => (MANIFEST[l.cle_bloc]?.groupe || 'Autres') === groupe);
      const lignesImage = images.filter((l) => (MANIFEST[l.cle_bloc]?.groupe || 'Autres') === groupe);
      if (!lignesTexte.length && !lignesImage.length) continue;
      page.append(sectionGroupe(client, groupe, lignesTexte, lignesImage, enAttente, majBarre));
    }
    if (client.acces_client === 'complet') page.append(sectionProduits(client, produits));
  }

  if (groupesVerrouilles.length && client.acces_client !== 'aucun') {
    page.append(h('div.hors-portee',
      h('strong', 'Gere par LocWeb'),
      `Le reste de votre site (${groupesVerrouilles.join(', ').toLowerCase()}) est mis a jour par notre equipe — dites-nous ce qu'il faut changer et on s'en occupe.`));
  }

  if (historique.length) page.append(carteHistorique(historique));
  page.append(barre);
  majBarre();
}

function sectionGroupe(client, groupe, lignesTexte, lignesImage, enAttente, majBarre) {
  const corps = h('div.section-corps');
  if (groupe === 'Horaires') lignesTexte.forEach((l) => corps.append(champHoraire(l, enAttente, majBarre)));
  else lignesTexte.forEach((l) => corps.append(champTexte(l, enAttente, majBarre)));
  lignesImage.forEach((l) => corps.append(champImage(client, l, enAttente, majBarre)));
  return h('div.section', h('div.section-tete', h('h2', groupe)), corps);
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
  const saisie = h('input', { type: 'text', placeholder: 'ex : 9h - 12h, 14h - 19h ou Ferme', value: courant });
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
    souffler('Photo prete a etre publiee.', 'bien');
  });
  return bloc;
}

const CHAMPS_SYNC_STRIPE = ['nom', 'prix', 'description', 'disponible'];

function sectionProduits(client, produits) {
  const corps = h('div.section-corps', { style: { paddingTop: '14px' } });
  const liste = h('div');
  corps.append(liste);

  function dessiner() {
    vider(liste);
    if (!produits.length) liste.append(h('p.vide', 'Aucun produit pour le moment.'));
    produits.forEach((p) => liste.append(carteProduit(client, p, () => {
      const i = produits.indexOf(p); if (i >= 0) produits.splice(i, 1); dessiner();
    })));
  }
  dessiner();

  corps.append(h('button.bt.bt-plein', { onclick: async () => {
    let p;
    try { p = await D.creerProduit(client.id); } catch { souffler('Impossible de creer le produit.', 'alerte'); return; }
    produits.push(p);
    dessiner();
    await D.syncProduitStripe(p.id);
  } }, '+ Ajouter un produit'));

  return h('div.section', h('div.section-tete', h('h2', 'Produits et tarifs')), corps);
}

function carteProduit(client, p, surSuppression) {
  const nom = h('input', { type: 'text', value: p.nom ?? '' });
  const prix = h('input', { type: 'number', step: '0.01', value: p.prix ?? '' });
  const categorie = h('input', { type: 'text', value: p.categorie ?? '' });
  const desc = h('textarea', { rows: 2, value: p.description ?? '' });
  const dispo = h('input', { type: 'checkbox', checked: !!p.disponible });
  const img = h('img', { src: p.image_url || '' });
  const fichier = h('input', { type: 'file', accept: 'image/*' });

  async function sauver(field, valeur) {
    try { await D.majProduit(p.id, { [field]: valeur }); } catch { souffler('Enregistrement impossible.', 'alerte'); return; }
    p[field] = valeur;
    souffler('Enregistre.', 'bien');
    if (CHAMPS_SYNC_STRIPE.includes(field)) await D.syncProduitStripe(p.id);
  }

  nom.addEventListener('change', () => sauver('nom', nom.value));
  prix.addEventListener('change', () => sauver('prix', Number(prix.value)));
  categorie.addEventListener('change', () => sauver('categorie', categorie.value));
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
      h('label.champ.produit-desc', h('span', 'Categorie'), categorie),
      h('label.champ.produit-desc', h('span', 'Description'), desc)),
    h('div.produit-bas',
      h('label.produit-dispo', dispo, 'Disponible a la vente'),
      h('button.bt.bt-nu', { onclick: async () => {
        if (!certain('Supprimer ce produit ?')) return;
        await D.supprimerProduit(p.id);
        surSuppression();
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
