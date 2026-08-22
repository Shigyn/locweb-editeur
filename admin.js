// ===================================================================
//  Espace client LocWeb — logique.
//
//  Schema reel (verifie dans Supabase) :
//    clients(id, nom_site, domaine, auth_user_id, metier, ville, telephone,
//            acces_client, ...)                     -- acces_client: aucun|essentiel|complet
//    contenu_site(id, client_id, cle_bloc, valeur, valeur_brouillon, type, date_maj)
//    produits(id, client_id, nom, prix, description, image_url, stock, categorie, disponible)
//    profils_client(client_id, zone_intervention, reseaux jsonb, google_business_url,
//                    google_ads_id, acces_google_business, acces_google_ads, complete_le)
//
//  Regle de securite propre a cet ecran : le client ne voit et ne modifie
//  QUE les groupes "Horaires" et "Footer" du contenu (essentiel), plus les
//  produits si sa formule est "complet". Tout le reste (Hero, Services,
//  Preuve sociale...) reste invisible ici — c'est LocWeb qui le gere.
// ===================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { MANIFEST, GROUP_ORDER } from './manifest.js?v=6';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const GROUPES_AUTORISES = ['Horaires', 'Footer'];

/* ---------- petits outils locaux (memes principes que la console) ---------- */

const $ = (sel, r = document) => r.querySelector(sel);

// document.createElement('svg') ne cree pas un vrai element SVG (mauvais
// espace de noms) : invisible a l'ecran. Il faut createElementNS, et sur un
// element SVG les attributs passent toujours par setAttribute (viewBox etc.
// ne sont pas de simples chaines assignables comme en HTML).
const NS_SVG = 'http://www.w3.org/2000/svg';

function h(spec, ...reste) {
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

function vider(el) { while (el.firstChild) el.firstChild.remove(); }

function differer(fn, delai = 700) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), delai); };
}

function certain(q) { return window.confirm(q); }

let minuterieSouffle;
function souffler(texte, ton = 'bien') {
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

function prettifyKey(cle) {
  return cle.split('_').map((m) => m.charAt(0).toUpperCase() + m.slice(1)).join(' ');
}

/* ---------- etat ---------- */

let client = null;   // ligne clients
let profil = null;   // ligne profils_client (ou null)

const ecranConnexion = $('#ecran-connexion');
const espace = $('#espace');
const page = $('#page');
const erreurConnexion = $('#connexion-erreur');

/* ---------- connexion ---------- */

$('#form-connexion').addEventListener('submit', async (e) => {
  e.preventDefault();
  const bouton = $('#bt-connexion');
  erreurConnexion.textContent = '';
  bouton.disabled = true;
  bouton.textContent = 'Connexion...';
  const { error } = await supabase.auth.signInWithPassword({
    email: $('#ident-email').value.trim(),
    password: $('#ident-mdp').value,
  });
  bouton.disabled = false;
  bouton.textContent = 'Se connecter';
  if (error) { erreurConnexion.textContent = 'Identifiants incorrects.'; return; }
  await apresConnexion();
});

$('#bt-oubli').addEventListener('click', async () => {
  const email = $('#ident-email').value.trim();
  if (!email) { erreurConnexion.textContent = "Renseignez d'abord votre e-mail ci-dessus."; return; }
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
  erreurConnexion.style.color = '';
  erreurConnexion.textContent = `E-mail envoye a ${email} si ce compte existe.`;
});

$('#bt-deconnexion').addEventListener('click', async () => {
  await supabase.auth.signOut();
  location.reload();
});

async function apresConnexion() {
  const { data: { user } } = await supabase.auth.getUser();

  // .single() choue si deux clients partagent le meme auth_user_id —
  // volontaire : mieux vaut un message clair qu'un mauvais site affiche.
  const { data: c, error: erreurClient } = await supabase
    .from('clients')
    .select('id, nom_site, domaine, acces_client, metier, ville, telephone')
    .eq('auth_user_id', user.id)
    .single();

  if (erreurClient || !c) {
    erreurConnexion.textContent = 'Aucun client associe a ce compte.';
    await supabase.auth.signOut();
    return;
  }

  client = c;
  const { data: p } = await supabase.from('profils_client').select('*').eq('client_id', client.id).maybeSingle();
  profil = p;

  ecranConnexion.style.display = 'none';
  espace.style.display = 'block';
  $('#nom-site').textContent = client.nom_site || 'votre site';
  const lienSite = $('#lien-site');
  if (client.domaine) {
    lienSite.href = /^https?:\/\//.test(client.domaine) ? client.domaine : `https://${client.domaine}`;
    lienSite.hidden = false;
  }

  if (!profil || !profil.complete_le) {
    rendreAccueil();
  } else {
    await rendrePage();
  }
}

/* ==================================================================
   Mini questionnaire d'accueil — une seule fois, apres la livraison.
   Volontairement court : zone d'intervention + reseaux + fiche Google.
   Les horaires reellement affiches sur le site se modifient plus bas,
   dans le contenu du site — pas la peine de les redemander ici.
   ================================================================== */

function rendreAccueil() {
  vider(page);

  const zone = h('input', { type: 'text', placeholder: 'ex : Beziers et 20 km alentour', value: profil?.zone_intervention || '' });
  const facebook = h('input', { type: 'text', placeholder: 'https://facebook.com/...', value: profil?.reseaux?.facebook || '' });
  const instagram = h('input', { type: 'text', placeholder: 'https://instagram.com/...', value: profil?.reseaux?.instagram || '' });
  const google = h('input', { type: 'text', placeholder: 'Lien de votre fiche Google', value: profil?.google_business_url || '' });

  const bouton = h('button.bt.bt-vif.bt-large', { type: 'submit' }, 'Valider et continuer');
  const skip = h('button.bt.bt-nu', { type: 'button', onclick: async () => { await rendrePage(); } }, 'Passer pour l\'instant');

  const form = h('form', {
    onsubmit: async (e) => {
      e.preventDefault();
      bouton.disabled = true;
      bouton.textContent = 'Enregistrement...';
      const { error } = await supabase.from('profils_client').upsert({
        client_id: client.id,
        zone_intervention: zone.value || null,
        reseaux: { facebook: facebook.value || null, instagram: instagram.value || null },
        google_business_url: google.value || null,
        complete_le: new Date().toISOString(),
        date_maj: new Date().toISOString(),
      });
      if (error) {
        souffler('Enregistrement impossible.', 'alerte');
        bouton.disabled = false;
        bouton.textContent = 'Valider et continuer';
        return;
      }
      profil = { ...(profil || {}), complete_le: new Date().toISOString() };
      await rendrePage();
    },
  },
    h('label.champ', h('span', "Ou intervenez-vous ?"), zone),
    h('label.champ', h('span', 'Facebook (optionnel)'), facebook),
    h('label.champ', h('span', 'Instagram (optionnel)'), instagram),
    h('label.champ', h('span', 'Votre fiche Google (optionnel)'), google),
    h('div', { style: { display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap' } }, bouton, skip),
  );

  page.append(
    h('div.section',
      h('div.section-tete',
        h('h2', 'Bienvenue !'),
        h('p', 'Quatre petites questions pour finir de configurer votre espace — deux minutes.')),
      h('div.section-corps', { style: { paddingTop: '14px' } }, form)),
  );
}

/* ==================================================================
   Page principale
   ================================================================== */

async function rendrePage() {
  vider(page);
  page.append(h('div.squelette'), h('div.squelette'), h('div.squelette'));

  const [{ data: contenu, error: erreurContenu }, { data: produits }, { data: historique }] = await Promise.all([
    supabase.from('contenu_site').select('id, cle_bloc, valeur, valeur_brouillon, type').eq('client_id', client.id),
    client.acces_client === 'complet'
      ? supabase.from('produits').select('id, nom, prix, description, image_url, stock, categorie, disponible').eq('client_id', client.id)
      : Promise.resolve({ data: [] }),
    supabase.from('historique_publications').select('cle_bloc, publie_par, date_publication')
      .eq('client_id', client.id).order('date_publication', { ascending: false }).limit(20),
  ]);

  vider(page);

  if (erreurContenu) {
    page.append(h('div.section', h('div.section-corps', { style: { paddingTop: '14px' } },
      h('p.mot', { 'data-ton': 'alerte' }, 'Impossible de charger votre site pour le moment.'),
      h('button.bt.bt-plein', { onclick: rendrePage, style: { marginTop: '10px' } }, 'Reessayer'))));
    return;
  }

  const textes = (contenu || []).filter((l) => l.type === 'texte');
  const images = (contenu || []).filter((l) => l.type === 'image');

  const groupesPresents = new Set([...textes, ...images].map((l) => MANIFEST[l.cle_bloc]?.groupe || 'Autres'));
  // Avec la formule "aucun", meme Horaires/Footer restent verrouilles —
  // ne pas se limiter a GROUPES_AUTORISES ici, sinon ces deux groupes
  // manqueraient a tort dans la note "gere par LocWeb" ci-dessous.
  const groupesVerrouilles = [...groupesPresents].filter(
    (g) => client.acces_client === 'aucun' || !GROUPES_AUTORISES.includes(g),
  );

  /* ---------- brouillon / publication, limite a ce que le client voit ---------- */

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
    // Volontairement une mise a jour directe et bornee aux lignes visibles
    // ici, PAS la fonction partagee avec la console : celle-ci publierait
    // aussi un brouillon en cours cote LocWeb sur une autre section.
    const ids = [...enAttente];
    let echec = false;
    for (const id of ids) {
      const ligne = [...textes, ...images].find((l) => l.id === id);
      const { error: e } = await supabase.from('contenu_site')
        .update({ valeur: ligne.valeur_brouillon, valeur_brouillon: null, date_maj: new Date().toISOString() })
        .eq('id', id);
      if (e) { echec = true; continue; }
      // Best-effort : un echec ici ne doit pas faire croire au client que
      // sa publication a rate, la vraie donnee du site est deja a jour.
      await supabase.from('historique_publications').insert({
        client_id: client.id, cle_bloc: ligne.cle_bloc,
        ancienne_valeur: ligne.valeur, nouvelle_valeur: ligne.valeur_brouillon,
        publie_par: 'client',
      }).catch(() => {});
    }
    if (echec) {
      souffler('Certaines modifications n\'ont pas pu etre publiees.', 'alerte');
    } else {
      ids.forEach((id) => {
        const l = [...textes, ...images].find((x) => x.id === id);
        if (l) { l.valeur = l.valeur_brouillon; l.valeur_brouillon = null; }
        enAttente.delete(id);
      });
      document.querySelectorAll('.champ-inline.modifie, .ligne-horaire.modifie').forEach((el) => el.classList.remove('modifie'));
      souffler('Votre site est a jour.', 'bien');
    }
    btPublier.textContent = 'Publier mes modifications';
    majBarre();
  }

  barre.append(texteBarre, h('span.droite', btPublier));

  /* ---------- rendu ---------- */

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
      page.append(sectionGroupe(groupe, lignesTexte, lignesImage, enAttente, majBarre));
    }

    if (client.acces_client === 'complet') {
      page.append(sectionProduits(produits || []));
    }
  }

  // Pour "aucun", la carte ci-dessus dit deja tout — pas la peine de
  // repeter la meme information sous une deuxieme forme juste en dessous.
  if (groupesVerrouilles.length && client.acces_client !== 'aucun') {
    page.append(h('div.hors-portee',
      h('strong', 'Gere par LocWeb'),
      `Le reste de votre site (${groupesVerrouilles.join(', ').toLowerCase()}) est mis a jour par notre equipe — dites-nous ce qu'il faut changer et on s'en occupe.`,
    ));
  }

  page.append(sectionProfil());
  page.append(sectionComptes());
  if (historique && historique.length) page.append(sectionHistorique(historique));
  page.append(barre);
  majBarre();
}

/* Pas d'ancienne/nouvelle valeur affichee ici — juste quoi et quand.
   L'avant/apres existe en base (historique_publications) pour qui en a
   besoin, mais l'exposer ici alourdirait l'ecran pour un usage rare. */
function sectionHistorique(historique) {
  return h('div.section',
    h('div.section-tete', h('h2', 'Historique des modifications')),
    h('div.section-corps', { style: { paddingTop: '6px' } },
      h('div', { style: { display: 'grid', gap: '2px' } },
        ...historique.map((l) => h('div', {
          style: { display: 'flex', justifyContent: 'space-between', gap: '12px',
                   padding: '9px 0', borderBottom: '1px solid var(--trait)', fontSize: '.86rem' },
        },
          h('span', (MANIFEST[l.cle_bloc]?.label || prettifyKey(l.cle_bloc)) + (l.publie_par === 'operateur' ? ' (par LocWeb)' : '')),
          h('span', { style: { color: 'var(--sourdine)', whiteSpace: 'nowrap' } }, depuis(l.date_publication))),
        ))));
}

function depuis(iso) {
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 90) return "a l'instant";
  if (s < 5400) return `il y a ${Math.round(s / 60)} min`;
  if (s < 79200) return `il y a ${Math.round(s / 3600)} h`;
  const j = Math.round(s / 86400);
  if (j < 31) return `il y a ${j} j`;
  return `il y a ${Math.round(j / 30)} mois`;
}

function sectionGroupe(groupe, lignesTexte, lignesImage, enAttente, majBarre) {
  const corps = h('div.section-corps');

  if (groupe === 'Horaires') {
    lignesTexte.forEach((l) => corps.append(champHoraire(l, enAttente, majBarre)));
  } else {
    lignesTexte.forEach((l) => corps.append(champTexte(l, enAttente, majBarre)));
  }
  lignesImage.forEach((l) => corps.append(champImage(l, enAttente, majBarre)));

  return h('div.section',
    h('div.section-tete', h('h2', groupe)),
    corps);
}

function champTexte(ligne, enAttente, majBarre) {
  const info = MANIFEST[ligne.cle_bloc];
  const enLigne = ligne.valeur ?? '';
  const courant = ligne.valeur_brouillon ?? enLigne;
  const longue = courant.length > 70 || /\n/.test(courant);

  const saisie = h(longue ? 'textarea' : 'input', { type: longue ? null : 'text', value: courant, rows: longue ? 3 : null });
  const drapeau = h('span.drapeau',
    h('svg', { viewBox: '0 0 12 12', fill: 'currentColor', html: '<circle cx="6" cy="6" r="6"/>' }), 'non publie');

  const bloc = h('div.champ-inline', h('label', info?.label || prettifyKey(ligne.cle_bloc), ligne.valeur_brouillon !== null ? drapeau : null), saisie);
  if (ligne.valeur_brouillon !== null) bloc.classList.add('modifie');

  const enregistrer = differer(async (v) => {
    const identique = (v ?? '') === (enLigne ?? '');
    const { error } = await supabase.from('contenu_site')
      .update({ valeur_brouillon: identique ? null : v, date_maj: new Date().toISOString() })
      .eq('id', ligne.id);
    if (error) { souffler('Enregistrement impossible.', 'alerte'); return; }
    ligne.valeur_brouillon = identique ? null : v;
    if (identique) { enAttente.delete(ligne.id); bloc.classList.remove('modifie'); drapeau.remove(); }
    else { enAttente.add(ligne.id); bloc.classList.add('modifie'); if (!drapeau.isConnected) bloc.querySelector('label').append(drapeau); }
    majBarre();
  });
  saisie.addEventListener('input', () => enregistrer(saisie.value));
  return bloc;
}

const JOURS = { lundi: 'Lundi', mardi: 'Mardi', mercredi: 'Mercredi', jeudi: 'Jeudi', vendredi: 'Vendredi', samedi: 'Samedi', dimanche: 'Dimanche' };

function champHoraire(ligne, enAttente, majBarre) {
  const jourCle = Object.keys(JOURS).find((j) => ligne.cle_bloc.includes(j));
  const enLigne = ligne.valeur ?? '';
  const courant = ligne.valeur_brouillon ?? enLigne;
  const saisie = h('input', { type: 'text', placeholder: 'ex : 9h - 12h, 14h - 19h ou Ferme', value: courant });
  const bloc = h('div.ligne-horaire', h('span.jour', JOURS[jourCle] || prettifyKey(ligne.cle_bloc)), saisie);
  if (ligne.valeur_brouillon !== null) bloc.classList.add('modifie');

  const enregistrer = differer(async (v) => {
    const identique = (v ?? '') === (enLigne ?? '');
    const { error } = await supabase.from('contenu_site')
      .update({ valeur_brouillon: identique ? null : v, date_maj: new Date().toISOString() })
      .eq('id', ligne.id);
    if (error) { souffler('Enregistrement impossible.', 'alerte'); return; }
    ligne.valeur_brouillon = identique ? null : v;
    identique ? enAttente.delete(ligne.id) : enAttente.add(ligne.id);
    bloc.classList.toggle('modifie', !identique);
    majBarre();
  });
  saisie.addEventListener('input', () => enregistrer(saisie.value));
  return bloc;
}

function champImage(ligne, enAttente, majBarre) {
  const info = MANIFEST[ligne.cle_bloc];
  const courant = ligne.valeur_brouillon ?? ligne.valeur ?? '';
  const preview = h('img', { src: courant, alt: '' });
  const entree = h('label.entree-fichier', 'Changer la photo', h('input', { type: 'file', accept: 'image/*' }));

  const bloc = h('div.ligne-image', preview,
    h('div.info', h('label', info?.label || prettifyKey(ligne.cle_bloc)), entree));

  entree.querySelector('input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    souffler('Envoi de la photo...', 'veille');
    const path = `${client.id}/${Date.now()}_${file.name}`;
    const { error: erreurUpload } = await supabase.storage.from('site-images').upload(path, file, { upsert: true });
    if (erreurUpload) { souffler("Erreur lors de l'envoi de la photo.", 'alerte'); return; }
    const { data } = supabase.storage.from('site-images').getPublicUrl(path);
    const { error } = await supabase.from('contenu_site')
      .update({ valeur_brouillon: data.publicUrl, date_maj: new Date().toISOString() })
      .eq('id', ligne.id);
    if (error) { souffler('Enregistrement impossible.', 'alerte'); return; }
    ligne.valeur_brouillon = data.publicUrl;
    preview.src = data.publicUrl;
    enAttente.add(ligne.id);
    majBarre();
    souffler('Photo prete a etre publiee.', 'bien');
  });

  return bloc;
}

/* ==================================================================
   Produits — ecriture directe, pas de brouillon (le prix doit refleter
   ce que Stripe facture reellement, pas un etat en attente).
   ================================================================== */

const CHAMPS_SYNC_STRIPE = ['nom', 'prix', 'description', 'disponible'];

function sectionProduits(produits) {
  const corps = h('div.section-corps', { style: { paddingTop: '14px' } });
  const liste = h('div');
  corps.append(liste);

  function dessiner() {
    vider(liste);
    if (!produits.length) { liste.append(h('p.vide', 'Aucun produit pour le moment.')); }
    produits.forEach((p) => liste.append(carteProduit(p, () => { const i = produits.indexOf(p); if (i >= 0) produits.splice(i, 1); dessiner(); })));
  }
  dessiner();

  const ajouter = h('button.bt.bt-plein', { onclick: async () => {
    const { data, error } = await supabase.from('produits').insert({ client_id: client.id, nom: 'Nouveau produit', prix: 0 }).select().single();
    if (error || !data) { souffler('Impossible de creer le produit.', 'alerte'); return; }
    produits.push(data);
    dessiner();
    await syncProduitStripe(data.id);
  } }, '+ Ajouter un produit');

  corps.append(ajouter);

  return h('div.section', h('div.section-tete', h('h2', 'Produits et tarifs')), corps);
}

function carteProduit(p, surSuppression) {
  const nom = h('input', { type: 'text', value: p.nom ?? '' });
  const prix = h('input', { type: 'number', step: '0.01', value: p.prix ?? '' });
  const categorie = h('input', { type: 'text', value: p.categorie ?? '' });
  const desc = h('textarea', { rows: 2, value: p.description ?? '' });
  const dispo = h('input', { type: 'checkbox', checked: !!p.disponible });
  const img = h('img', { src: p.image_url || '' });
  const fichier = h('input', { type: 'file', accept: 'image/*' });

  async function sauver(field, valeur) {
    const { error } = await supabase.from('produits').update({ [field]: valeur }).eq('id', p.id);
    if (error) { souffler('Enregistrement impossible.', 'alerte'); return; }
    p[field] = valeur;
    souffler('Enregistre.', 'bien');
    if (CHAMPS_SYNC_STRIPE.includes(field)) await syncProduitStripe(p.id);
  }

  nom.addEventListener('change', () => sauver('nom', nom.value));
  prix.addEventListener('change', () => sauver('prix', Number(prix.value)));
  categorie.addEventListener('change', () => sauver('categorie', categorie.value));
  desc.addEventListener('change', () => sauver('description', desc.value));
  dispo.addEventListener('change', () => sauver('disponible', dispo.checked));

  fichier.addEventListener('change', async () => {
    const file = fichier.files[0];
    if (!file) return;
    const path = `${client.id}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('site-images').upload(path, file, { upsert: true });
    if (error) { souffler("Erreur lors de l'envoi de la photo.", 'alerte'); return; }
    const { data } = supabase.storage.from('site-images').getPublicUrl(path);
    img.src = data.publicUrl;
    await sauver('image_url', data.publicUrl);
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
        await supabase.from('produits').delete().eq('id', p.id);
        surSuppression();
      } }, 'Supprimer')));
}

async function syncProduitStripe(produitId) {
  const { data: { session } } = await supabase.auth.getSession();
  await fetch(`${SUPABASE_URL}/functions/v1/sync-produit-stripe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ produit_id: produitId }),
  }).catch((err) => console.warn('Synchro Stripe indisponible.', err));
}

/* ==================================================================
   Mon profil — modifiable a tout moment, pas seulement au premier login.
   ================================================================== */

function sectionProfil() {
  const zone = h('input', { type: 'text', value: profil?.zone_intervention || '' });
  const facebook = h('input', { type: 'text', value: profil?.reseaux?.facebook || '' });
  const instagram = h('input', { type: 'text', value: profil?.reseaux?.instagram || '' });

  const sauver = differer(async () => {
    const { error } = await supabase.from('profils_client').upsert({
      client_id: client.id,
      zone_intervention: zone.value || null,
      reseaux: { facebook: facebook.value || null, instagram: instagram.value || null },
      date_maj: new Date().toISOString(),
    });
    souffler(error ? 'Enregistrement impossible.' : 'Enregistre.', error ? 'alerte' : 'bien');
  });
  [zone, facebook, instagram].forEach((el) => el.addEventListener('input', sauver));

  return h('div.section',
    h('div.section-tete', h('h2', 'Mon profil'), h('p', 'Ces informations nous aident a mieux vous representer.')),
    h('div.section-corps', { style: { paddingTop: '14px' } },
      h('label.champ', h('span', "Ou intervenez-vous ?"), zone),
      h('label.champ', h('span', 'Facebook'), facebook),
      h('label.champ', h('span', 'Instagram'), instagram)));
}

/* ==================================================================
   Comptes — le client connecte lui-meme ses acces, jamais de mot de
   passe ni de cle stockes ici : uniquement la date a laquelle il a
   confirme l'avoir fait.
   ================================================================== */

function sectionComptes() {
  const corps = h('div.section-corps', { style: { paddingTop: '14px' } });

  corps.append(carteCompte({
    titre: 'Fiche Google Business',
    aide: "Ouvrez votre fiche (celle qui s'affiche sur Google Maps), allez dans Parametres puis Gestionnaires, et invitez-nous — contactez-nous si vous n'avez pas notre adresse sous la main.",
    champ: 'google_business_url', placeholder: 'Lien de votre fiche',
    accorde: 'acces_google_business',
  }));

  corps.append(carteCompte({
    titre: 'Google Ads (publicite)',
    aide: 'Donnez-nous votre identifiant client (10 chiffres, en haut a droite de votre compte Google Ads). On vous envoie une demande de liaison a accepter en un clic.',
    champ: 'google_ads_id', placeholder: 'ex : 123-456-7890',
    accorde: 'acces_google_ads',
  }));

  return h('div.section', h('div.section-tete', h('h2', 'Connecter mes comptes')), corps);
}

function carteCompte({ titre, aide, champ, placeholder, accorde }) {
  const saisie = h('input', { type: 'text', placeholder, value: profil?.[champ] || '' });
  const sauverChamp = differer(async () => {
    await supabase.from('profils_client').upsert({ client_id: client.id, [champ]: saisie.value || null, date_maj: new Date().toISOString() });
  });
  saisie.addEventListener('input', sauverChamp);

  const etatTexte = h('span');
  function peindre(v) {
    vider(etatTexte);
    etatTexte.append(v
      ? h('span', { style: { color: 'var(--vert)', fontWeight: '650', fontSize: '.86rem' } }, '✓ Connecte')
      : h('span', { style: { color: 'var(--sourdine)', fontSize: '.86rem' } }, 'Pas encore fait'));
  }
  peindre(profil?.[accorde]);

  const bouton = h('button.bt.bt-plein', { onclick: async () => {
    const nouvelle = profil?.[accorde] ? null : new Date().toISOString();
    await supabase.from('profils_client').upsert({ client_id: client.id, [accorde]: nouvelle, date_maj: new Date().toISOString() });
    profil = { ...(profil || {}), [accorde]: nouvelle };
    peindre(nouvelle);
    bouton.textContent = nouvelle ? 'Annuler' : "C'est fait";
    souffler(nouvelle ? 'Merci !' : 'Marque comme non fait.', nouvelle ? 'bien' : 'veille');
  } }, profil?.[accorde] ? 'Annuler' : "C'est fait");

  return h('div.champ-inline',
    h('label', titre, etatTexte),
    h('p.aide', aide),
    h('div', { style: { display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' } }, saisie, bouton));
}

/* ---------- reprise de session ---------- */

supabase.auth.getSession().then(({ data: { session } }) => { if (session) apresConnexion(); });
