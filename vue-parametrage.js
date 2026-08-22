// ===================================================================
//  Parametrage — mon profil, connexion des comptes (Google Business,
//  Google Ads, pixels publicitaires). Objectif : connecter tout ca en
//  quelques clics, sans jamais demander de mot de passe ni de cle —
//  seulement une date de confirmation.
// ===================================================================

import { h, vider, differer, souffler, depuis } from './outils.js';
import * as D from './donnees.js';
import { GOOGLE_OAUTH_CLIENT_ID } from './config.js';

const SCOPES_GOOGLE = [
  'https://www.googleapis.com/auth/business.manage',
  'https://www.googleapis.com/auth/analytics.readonly',
].join(' ');

export async function rendre(page, etat) {
  const { client } = etat;
  let profil = etat.profil || {};

  vider(page);
  page.append(h('h1', { style: { fontSize: '1.5rem', fontWeight: '750', marginBottom: '18px' } }, 'Parametrage'));

  /* ---------- profil ---------- */

  const zone = h('input', { type: 'text', value: profil.zone_intervention || '' });
  const facebook = h('input', { type: 'text', value: profil.reseaux?.facebook || '' });
  const instagram = h('input', { type: 'text', value: profil.reseaux?.instagram || '' });
  const sauverProfil = differer(async () => {
    try {
      await D.majProfil(client.id, {
        zone_intervention: zone.value || null,
        reseaux: { facebook: facebook.value || null, instagram: instagram.value || null },
      });
      souffler('Enregistre.', 'bien');
    } catch { souffler('Enregistrement impossible.', 'alerte'); }
  });
  [zone, facebook, instagram].forEach((el) => el.addEventListener('input', sauverProfil));

  page.append(h('div.section',
    h('div.section-tete', h('h2', 'Mon profil'), h('p', 'Ces informations nous aident a mieux vous representer.')),
    h('div.section-corps', { style: { paddingTop: '14px' } },
      h('label.champ', h('span', "Ou intervenez-vous ?"), zone),
      h('label.champ', h('span', 'Facebook'), facebook),
      h('label.champ', h('span', 'Instagram'), instagram))));

  /* ---------- retour d'une tentative de connexion Google ---------- */

  const statutRetour = new URLSearchParams(location.hash.split('?')[1] || '').get('google');
  if (statutRetour) {
    const messages = {
      connecte: ['Compte Google connecte.', 'bien'],
      refuse: ["Connexion annulee — vous n'avez pas termine le consentement Google.", 'veille'],
      session_expiree: ['Votre session a expire, reconnectez-vous puis reessayez.', 'alerte'],
      erreur: ['La connexion a echoue. Reessayez, ou contactez-nous si ca persiste.', 'alerte'],
    };
    const [texte, ton] = messages[statutRetour] || messages.erreur;
    setTimeout(() => souffler(texte, ton), 200);
    history.replaceState(null, '', location.pathname + '#/parametrage');
  }

  /* ---------- comptes ---------- */

  const corpsComptes = h('div.section-corps', { style: { paddingTop: '14px' } });
  corpsComptes.append(carteGoogle(client, profil));
  corpsComptes.append(
    carteCompte(client, profil, {
      titre: 'Google Ads (publicite)',
      aide: 'Donnez-nous votre identifiant client (10 chiffres, en haut a droite de votre compte Google Ads). On vous envoie une demande de liaison a accepter en un clic.',
      champ: 'google_ads_id', placeholder: 'ex : 123-456-7890', accorde: 'acces_google_ads',
    }),
    carteCompte(client, profil, {
      titre: 'Pixel Meta (Facebook/Instagram Ads)',
      aide: "Si vous faites de la publicite sur Facebook ou Instagram, collez ici l'identifiant de votre pixel (Gestionnaire d'evenements Meta).",
      champ: 'pixel_meta_id', placeholder: 'ex : 123456789012345', accorde: 'acces_pixel_meta',
    }),
    carteCompte(client, profil, {
      titre: 'Pixel Google Ads',
      aide: "L'identifiant de conversion Google Ads (visible dans Outils > Conversions), si vous en avez deja un.",
      champ: 'pixel_google_id', placeholder: 'ex : AW-123456789', accorde: 'acces_pixel_google',
    }),
  );

  page.append(h('div.section', h('div.section-tete', h('h2', 'Connecter mes comptes')), corpsComptes));

  /* ---------- deconnexion (visible ici en plus du rail, masque sur mobile) ---------- */

  page.append(h('div.section',
    h('div.section-corps', { style: { paddingTop: '14px' } },
      h('button.bt.bt-nu', { onclick: () => { D.deconnexion().then(() => location.reload()); } }, 'Se deconnecter'))));

  function carteGoogle(client, profil) {
    const connecteGbp = profil.acces_google_business;
    const connecteGa4 = profil.acces_ga4;
    const tousConnectes = connecteGbp && connecteGa4;

    const lignesEtat = h('div', { style: { display: 'grid', gap: '4px', marginTop: '8px' } },
      ligneEtat('Fiche Google Business', connecteGbp),
      ligneEtat('Google Analytics (GA4)', connecteGa4));

    const bouton = h('button.bt.bt-vif', { onclick: async (e) => {
      e.target.disabled = true;
      const { data: { session } } = await D.sb.auth.getSession();
      if (!session) { souffler('Session expiree, reconnectez-vous.', 'alerte'); e.target.disabled = false; return; }
      const params = new URLSearchParams({
        client_id: GOOGLE_OAUTH_CLIENT_ID,
        redirect_uri: `${D.EDGE_FUNCTIONS_URL}/oauth-google-echange`,
        response_type: 'code', access_type: 'offline', prompt: 'consent',
        scope: SCOPES_GOOGLE, state: session.access_token,
      });
      location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    } }, tousConnectes ? 'Reconnecter mon compte Google' : 'Se connecter avec Google');

    const proprieteGa4 = h('input', {
      type: 'text', placeholder: 'ID de propriete GA4 (ex : 123456789)', value: profil.ga4_property_id || '',
      style: { marginTop: '10px' },
    });
    const sauverPropriete = differer(async () => {
      try { await D.majProfil(client.id, { ga4_property_id: proprieteGa4.value || null }); profil.ga4_property_id = proprieteGa4.value || null; souffler('Enregistre.', 'bien'); }
      catch { souffler('Enregistrement impossible.', 'alerte'); }
    });
    proprieteGa4.addEventListener('input', sauverPropriete);

    return h('div.champ-inline',
      h('label', 'Google Business + Analytics'),
      h('p.aide', "Un seul clic connecte votre fiche Google Business et vos statistiques GA4 — LocWeb pourra afficher vos vraies performances ici. Aucun mot de passe ne nous est jamais communique."),
      lignesEtat,
      h('div', { style: { marginTop: '12px' } }, bouton),
      h('p.aide', { style: { marginTop: '12px' } }, "ID de propriete GA4 (different du code G-XXXXX) — dans GA4 : Admin -> Parametres de la propriete."),
      proprieteGa4);
  }

  function ligneEtat(libelle, valeur) {
    return h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '.86rem' } },
      valeur
        ? h('span', { style: { color: 'var(--vert)', fontWeight: '650' } }, `✓ ${libelle} — connecte ${depuis(valeur)}`)
        : h('span', { style: { color: 'var(--sourdine)' } }, `${libelle} — pas encore connecte`));
  }

  function carteCompte(client, profil, { titre, aide, champ, placeholder, accorde }) {
    const saisie = h('input', { type: 'text', placeholder, value: profil[champ] || '' });
    const sauverChamp = differer(async () => {
      try { await D.majProfil(client.id, { [champ]: saisie.value || null }); profil[champ] = saisie.value || null; }
      catch { souffler('Enregistrement impossible.', 'alerte'); }
    });
    saisie.addEventListener('input', sauverChamp);

    const etatTexte = h('span');
    function peindre(v) {
      vider(etatTexte);
      etatTexte.append(v
        ? h('span', { style: { color: 'var(--vert)', fontWeight: '650', fontSize: '.86rem' } }, `✓ Connecte (${depuis(v)})`)
        : h('span', { style: { color: 'var(--sourdine)', fontSize: '.86rem' } }, 'Pas encore fait'));
    }
    peindre(profil[accorde]);

    const bouton = h('button.bt.bt-plein', { onclick: async () => {
      const nouvelle = profil[accorde] ? null : new Date().toISOString();
      try { await D.majProfil(client.id, { [accorde]: nouvelle }); }
      catch { souffler('Enregistrement impossible.', 'alerte'); return; }
      profil[accorde] = nouvelle;
      peindre(nouvelle);
      bouton.textContent = nouvelle ? 'Annuler' : "C'est fait";
      souffler(nouvelle ? 'Merci !' : 'Marque comme non fait.', nouvelle ? 'bien' : 'veille');
    } }, profil[accorde] ? 'Annuler' : "C'est fait");

    return h('div.champ-inline',
      h('label', titre, etatTexte),
      h('p.aide', aide),
      h('div', { style: { display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' } }, saisie, bouton));
  }
}
