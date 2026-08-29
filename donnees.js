// ===================================================================
//  Acces aux donnees — espace client.
//
//  Tout est implicitement borne au client connecte par RLS (chaque
//  policy filtre sur `client_id = (select id from clients where
//  auth_user_id = auth.uid())`). Les filtres explicites ci-dessous ne
//  sont qu'une precision de requete, jamais la barriere de securite.
// ===================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const EDGE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

/* ---------- session et compte ---------- */

export async function session() {
  const { data } = await sb.auth.getSession();
  return data.session;
}

export async function connexion(email, mdp) {
  const { error } = await sb.auth.signInWithPassword({ email, password: mdp });
  return error;
}

export async function motDePasseOublie(email) {
  return sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
}

export async function deconnexion() { await sb.auth.signOut(); }

export async function monClient() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  /* `select('*')` et non une liste de colonnes.

     PostgREST rejette la requete ENTIERE des qu'une seule colonne
     citee n'existe pas encore. Comme cette requete est celle de la
     connexion, une migration pas encore passee ne cassait pas une
     page : elle empechait TOUS les clients de se connecter, avec pour
     seul message « Aucun client associe a ce compte » — qui envoie
     chercher le probleme a l'oppose de la ou il est.

     Constate le 2026-08-27 en ajoutant `chantiers`. Avec `*`, une
     colonne manquante est simplement absente de la reponse, et le code
     qui la lit retombe sur son defaut. */
  const { data, error } = await sb
    .from('clients')
    .select('*')
    .eq('auth_user_id', user.id)
    .single();
  if (error || !data) return null;
  return data;
}

export async function monProfil(clientId) {
  const { data } = await sb.from('profils_client').select('*').eq('client_id', clientId).maybeSingle();
  return data;
}

export async function majProfil(clientId, champs) {
  const { error } = await sb.from('profils_client')
    .upsert({ client_id: clientId, ...champs, date_maj: new Date().toISOString() });
  if (error) throw error;
}

/* Enregistrement tolerant, pour l'onboarding.

   PostgREST rejette la requete ENTIERE dès qu'une seule colonne n'existe
   pas encore en base. Resultat : une migration non passee faisait echouer
   la sauvegarde complete, `complete_le` n'etait jamais ecrit, et le
   questionnaire revenait a chaque connexion.

   Ici on retente en retirant a chaque fois la colonne que PostgreSQL
   signale comme inconnue. Le profil se remplit donc autant que la base
   le permet, et `complete_le` finit toujours par passer. Ce qui n'a pas
   pu etre enregistre reste modifiable dans Parametrage. */
export async function majProfilTolerant(clientId, champs) {
  const restants = { ...champs };
  const ignores = [];

  for (let essai = 0; essai < 12; essai++) {
    const { error } = await sb.from('profils_client')
      .upsert({ client_id: clientId, ...restants, date_maj: new Date().toISOString() });

    if (!error) return { ok: true, ignores };

    // PGRST204 : "Could not find the 'xxx' column". On extrait le nom
    // entre apostrophes plutot que de deviner.
    const nom = error.message?.match(/'([^']+)' column/)?.[1];
    if (!nom || !(nom in restants)) return { ok: false, ignores, erreur: error };

    delete restants[nom];
    ignores.push(nom);
  }
  return { ok: false, ignores, erreur: new Error('trop de colonnes manquantes') };
}

/* ---------- contenu du site ---------- */

/* Le contenu d'un client vu par l'operateur : meme table, la policy
   `est_operateur()` autorise la lecture de toutes les fiches. */
export async function lireContenu(clientId) {
  const { data, error } = await sb
    .from('contenu_site')
    .select('id, cle_bloc, valeur, valeur_brouillon, type')
    .eq('client_id', clientId);
  if (error) throw error;
  return data || [];
}

export async function ecrireBrouillon(ligneId, brouillon) {
  const { error } = await sb.from('contenu_site')
    .update({ valeur_brouillon: brouillon, date_maj: new Date().toISOString() })
    .eq('id', ligneId);
  if (error) throw error;
}

/* `parQui` distingue une publication faite par le client de celle faite
   par LocWeb depuis le mode operateur. Sans ca l'historique attribue
   tout au client, et six mois plus tard personne ne sait qui a change
   quoi — y compris quand le client affirme n'avoir rien touche. */
export async function publierChamp(ligne, clientId, parQui = 'client') {
  const { error } = await sb.from('contenu_site')
    .update({ valeur: ligne.valeur_brouillon, valeur_brouillon: null, date_maj: new Date().toISOString() })
    .eq('id', ligne.id);
  if (error) throw error;
  await sb.from('historique_publications').insert({
    client_id: clientId, cle_bloc: ligne.cle_bloc,
    ancienne_valeur: ligne.valeur, nouvelle_valeur: ligne.valeur_brouillon, publie_par: parQui,
  }).catch(() => {}); // annexe : ne doit jamais faire echouer la publication elle-meme
}

export async function listerHistorique(clientId, limite = 20) {
  const { data } = await sb.from('historique_publications')
    .select('cle_bloc, publie_par, date_publication')
    .eq('client_id', clientId).order('date_publication', { ascending: false }).limit(limite);
  return data || [];
}

/* ---------- produits ---------- */

export async function listerProduits(clientId) {
  const { data, error } = await sb.from('produits')
    .select('id, nom, prix, description, image_url, stock, categorie, disponible').eq('client_id', clientId);
  if (error) throw error;
  return data || [];
}

export async function creerProduit(clientId) {
  const { data, error } = await sb.from('produits')
    .insert({ client_id: clientId, nom: 'Nouveau produit', prix: 0 }).select().single();
  if (error) throw error;
  return data;
}

export async function majProduit(id, champs) {
  const { error } = await sb.from('produits').update(champs).eq('id', id);
  if (error) throw error;
}

export async function supprimerProduit(id) {
  await sb.from('produits').delete().eq('id', id);
}

export async function uploaderImage(clientId, file) {
  const path = `${clientId}/${Date.now()}_${file.name}`;
  const { error } = await sb.storage.from('site-images').upload(path, file, { upsert: true });
  if (error) throw error;
  return sb.storage.from('site-images').getPublicUrl(path).data.publicUrl;
}

export async function syncProduitStripe(produitId) {
  const { data: { session: s } } = await sb.auth.getSession();
  await fetch(`${SUPABASE_URL}/functions/v1/sync-produit-stripe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${s.access_token}` },
    body: JSON.stringify({ produit_id: produitId }),
  }).catch((err) => console.warn('Synchro Stripe indisponible.', err));
}

/* ---------- performances (Accueil) ---------- */

export async function listerVisites(clientId, jours = 30) {
  const depuisDate = new Date(Date.now() - jours * 864e5).toISOString();
  const { data, error } = await sb.from('visites')
    .select('chemin, referent, horodatage').eq('client_id', clientId).gte('horodatage', depuisDate);
  if (error) throw error;
  return data || [];
}

/* ---------- mon activite (demandes) ---------- */

export async function listerDemandes(clientId) {
  const { data, error } = await sb.from('leads')
    .select('id, nom, telephone, email, ville, besoin, message, statut, date_creation')
    .eq('client_id', clientId).order('date_creation', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function majDemande(id, statut) {
  const { error } = await sb.from('leads').update({ statut, date_traitement: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

/* ---------- acquisition (campagnes) ---------- */

/* Ce a quoi le client a acces chez Google : proprietes Analytics et
   fiches d'etablissement, avec ce que Google sait deja de lui
   (telephone, adresse, horaires, categorie). Evite de lui faire
   recopier des identifiants a 20 chiffres. */
export async function comptesGoogle() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) throw new Error('Session absente.');
  const reponse = await fetch(`${EDGE_FUNCTIONS_URL}/google-comptes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw Object.assign(new Error(donnees.error || 'Requête refusée.'), { donnees });
  return donnees;
}

/* ---------- operateur ----------

   Ces trois fonctions ne marchent QUE pour un compte operateur : les
   policies `est_operateur()` de la base filtrent tout le reste. Un
   client qui les appellerait recevrait une liste vide, pas les donnees
   des autres. La verification est en base, pas ici. */

export async function suisJeOperateur() {
  const { data, error } = await sb.rpc('est_operateur');
  return !error && data === true;
}

/* Tous les clients avec leur profil. Les policies `est_operateur()`
   font le tri : un client recevrait sa seule ligne, pas celles des
   autres. */
export async function tousLesClients() {
  // `*` volontairement, pas une liste de colonnes : PostgREST rejette
  // la requete ENTIERE des qu'une seule colonne demandee n'existe pas.
  // Une migration en retard suffirait a faire disparaitre toute la vue,
  // et c'est arrive.
  const { data, error } = await sb.from('clients')
    .select('*, profils_client(*)')
    .order('nom_site');
  if (error) throw error;
  return data || [];
}

/* Toutes les demandes, pour compter par client sans une requete par
   fiche. */
export async function toutesLesDemandes() {
  const { data, error } = await sb.from('leads')
    .select('id, client_id, statut, date_creation')
    .order('date_creation', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function listerToutesCampagnes() {
  const { data, error } = await sb.from('campagnes')
    .select('*, clients(nom_site)')
    .order('date_creation', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function majCampagne(id, champs) {
  const { error } = await sb.from('campagnes')
    .update({ ...champs, date_maj: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function listerCampagnes(clientId) {
  const { data, error } = await sb.from('campagnes').select('*').eq('client_id', clientId).order('date_creation', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function demanderCampagne(clientId, champs) {
  const { error } = await sb.from('campagnes').insert({ client_id: clientId, statut: 'demandee', ...champs });
  if (error) throw error;
}

/* ---------- statistiques Google, avec cache partage ----------

   Accueil et Performances demandaient chacun leurs propres chiffres,
   soit deux appels identiques a quelques secondes d'intervalle. Le cache
   ci-dessous les met en commun et permet surtout de PRECHARGER des la
   connexion : quand l'utilisateur arrive sur une page, la reponse est
   deja la.

   Une entree = une promesse, pas un resultat : deux appels simultanes
   pour la meme periode partagent donc le meme aller-retour reseau. */
const cacheStats = new Map();

async function appelStats(fonction, periode, clientId, fenetre = null) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) throw new Error('Session absente.');
  const corps = fenetre ? { ...fenetre } : { periode };
  if (clientId) corps.client_id = clientId;
  const reponse = await fetch(`${EDGE_FUNCTIONS_URL}/${fonction}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(corps),
  });
  const donnees = await reponse.json();
  if (!reponse.ok) throw Object.assign(new Error(donnees.error || 'Requête refusée.'), { donnees });
  return donnees;
}

/* `clientId` n'est utilisable que par un operateur, et c'est la
   fonction serveur qui le verifie — pas ce fichier. Il entre dans la
   cle de cache, sinon les chiffres d'un client s'afficheraient pour le
   suivant. */
export function statsGa4(periode = '7j', clientId = null) {
  const cle = `ga4:${periode}:${clientId || 'moi'}`;
  if (!cacheStats.has(cle)) {
    cacheStats.set(cle, appelStats('ga4-donnees', periode, clientId)
      .catch((e) => { cacheStats.delete(cle); throw e; }));
  }
  return cacheStats.get(cle);
}

/* Un mois civil, pas les trente derniers jours.

   Le rapport parle de « juillet », et juillet n'est pas la fenetre
   glissante qui finit aujourd'hui : la comparaison avec juin serait
   fausse, et les chiffres changeraient d'un jour a l'autre pour un
   mois pourtant termine. `mois` va de 1 a 12. */
export function statsGa4Mois(annee, mois, clientId = null) {
  const deuxChiffres = (n) => String(n).padStart(2, '0');
  const debut = `${annee}-${deuxChiffres(mois)}-01`;
  // Jour 0 du mois suivant = dernier jour de celui-ci, sans avoir a
  // connaitre sa longueur ni les annees bissextiles.
  const dernier = new Date(Date.UTC(annee, mois, 0)).getUTCDate();
  const fin = `${annee}-${deuxChiffres(mois)}-${deuxChiffres(dernier)}`;

  const cle = `ga4:${debut}:${fin}:${clientId || 'moi'}`;
  if (!cacheStats.has(cle)) {
    cacheStats.set(cle, appelStats('ga4-donnees', null, clientId, { debut, fin })
      .catch((e) => { cacheStats.delete(cle); throw e; }));
  }
  return cacheStats.get(cle);
}

/* Search Console : ce qui se passe AVANT l'arrivee sur le site. Meme
   mise en cache que les autres, meme regle sur `clientId`. */
export function statsSearchConsole(periode = '30j', clientId = null) {
  const cle = `sc:${periode}:${clientId || 'moi'}`;
  if (!cacheStats.has(cle)) {
    cacheStats.set(cle, appelStats('search-console-donnees', periode, clientId)
      .catch((e) => { cacheStats.delete(cle); throw e; }));
  }
  return cacheStats.get(cle);
}

export function statsGbp(periode = '30j', clientId = null) {
  const cle = `gbp:${periode}:${clientId || 'moi'}`;
  if (!cacheStats.has(cle)) {
    cacheStats.set(cle, appelStats('gbp-donnees', periode, clientId)
      .catch((e) => { cacheStats.delete(cle); throw e; }));
  }
  return cacheStats.get(cle);
}

export function oublierStats() { cacheStats.clear(); }

/* Lance les requetes sans attendre le resultat : elles chaufferont le
   cache pendant que l'utilisateur regarde la premiere page. Les echecs
   sont volontairement avales — c'est du confort, pas une etape critique,
   et la vue reaffichera l'erreur proprement si elle survient. */
export function prechargerStats(profil) {
  if (profil?.acces_ga4) {
    statsGa4('30j').catch(() => {});
    statsGa4('7j').catch(() => {});
  }
  if (profil?.acces_google_business) statsGbp('30j').catch(() => {});
}

/* ---------- notifications push ---------- */

/* Une ligne par APPAREIL, pas par client : le meme artisan peut avoir
   l'application sur son telephone et sur son ordinateur, et vouloir
   etre prevenu sur les deux. L'endpoint sert de cle — c'est lui que le
   navigateur regenere s'il renouvelle l'abonnement. */
export async function enregistrerAbonnementPush(clientId, abonnement) {
  const brut = abonnement.toJSON();
  const { error } = await sb.from('abonnements_push').upsert({
    client_id: clientId,
    endpoint: brut.endpoint,
    p256dh: brut.keys.p256dh,
    auth: brut.keys.auth,
    agent: navigator.userAgent.slice(0, 200),
  }, { onConflict: 'endpoint' });
  if (error) throw error;
}

export async function oublierAbonnementPush(endpoint) {
  const { error } = await sb.from('abonnements_push').delete().eq('endpoint', endpoint);
  if (error) throw error;
}

/* ---------- chantiers (photos avant / apres) ---------- */

/* Le bucket `site-images` sert deja aux photos de produits. Un seul
   bucket, des chemins distincts : un bucket de plus voudrait dire une
   policy de plus a tenir a jour, pour aucun gain. */
export async function envoyerFichierSite(chemin, blob) {
  const { error } = await sb.storage.from('site-images')
    .upload(chemin, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return sb.storage.from('site-images').getPublicUrl(chemin).data.publicUrl;
}

export async function listerRealisations(clientId) {
  const { data, error } = await sb.from('realisations')
    .select('id, titre, description, photo_avant, photo_apres, ordre, publiee, cree_le')
    .eq('client_id', clientId)
    .order('ordre', { ascending: false })
    .order('cree_le', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function creerRealisation(clientId, champs) {
  const { data, error } = await sb.from('realisations')
    .insert({ client_id: clientId, ...champs }).select().single();
  if (error) throw error;
  return data;
}

export async function majRealisation(id, champs) {
  const { error } = await sb.from('realisations').update(champs).eq('id', id);
  if (error) throw error;
}

export async function supprimerRealisation(id) {
  const { error } = await sb.from('realisations').delete().eq('id', id);
  if (error) throw error;
}
