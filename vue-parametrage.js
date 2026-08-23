// ===================================================================
//  Parametrage — le technique : connexion des comptes Google Business,
//  Google Analytics, Google Ads, pixels publicitaires. Objectif :
//  connecter tout ca en quelques clics, sans jamais demander de mot de
//  passe ni de cle — seulement une date de confirmation.
//
//  Les coordonnees du client, elles, vivent dans vue-mes-infos.js :
//  ce sont deux usages differents (une adresse e-mail se change souvent,
//  un identifiant de propriete GA4 se pose une fois pour toutes).
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
  page.append(h('h1', 'Paramétrage'),
    h('p.sous-titre', 'Les comptes techniques reliés à votre espace.'));

  /* ---------- retour d'une tentative de connexion Google ---------- */

  const statutRetour = new URLSearchParams(location.hash.split('?')[1] || '').get('google');
  if (statutRetour) {
    const messages = {
      connecte: ['Compte Google connecté.', 'bien'],
      refuse: ["Connexion annulée — vous n'avez pas terminé le consentement Google.", 'veille'],
      session_expiree: ['Votre session a expiré, reconnectez-vous puis réessayez.', 'alerte'],
      erreur: ['La connexion a échoué. Réessayez, ou contactez-nous si ça persiste.', 'alerte'],
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
      titre: 'Google Ads (publicité)',
      aide: 'Donnez-nous votre identifiant client (10 chiffres, en haut à droite de votre compte Google Ads). On vous envoie une demande de liaison à accepter en un clic.',
      champ: 'google_ads_id', placeholder: 'ex : 123-456-7890', accorde: 'acces_google_ads',
    }),
    carteCompte(client, profil, {
      titre: 'Pixel Meta (Facebook/Instagram Ads)',
      aide: "Si vous faites de la publicité sur Facebook ou Instagram, collez ici l'identifiant de votre pixel (Gestionnaire d'événements Meta).",
      champ: 'pixel_meta_id', placeholder: 'ex : 123456789012345', accorde: 'acces_pixel_meta',
    }),
    carteCompte(client, profil, {
      titre: 'Pixel Google Ads',
      aide: "L'identifiant de conversion Google Ads (visible dans Outils > Conversions), si vous en avez déjà un.",
      champ: 'pixel_google_id', placeholder: 'ex : AW-123456789', accorde: 'acces_pixel_google',
    }),
  );

  page.append(h('div.section', h('div.section-tete', h('h2', 'Connecter mes comptes')), corpsComptes));

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
      if (!session) { souffler('Session expirée, reconnectez-vous.', 'alerte'); e.target.disabled = false; return; }
      const params = new URLSearchParams({
        client_id: GOOGLE_OAUTH_CLIENT_ID,
        redirect_uri: `${D.EDGE_FUNCTIONS_URL}/oauth-google-echange`,
        response_type: 'code', access_type: 'offline', prompt: 'consent',
        scope: SCOPES_GOOGLE, state: session.access_token,
      });
      location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    } }, tousConnectes ? 'Reconnecter mon compte Google' : 'Se connecter avec Google');

    const proprieteGa4 = champVerrouille({
      valeur: profil.ga4_property_id,
      placeholder: 'ex : 123456789',
      surValidation: async (v) => {
        await D.majProfil(client.id, { ga4_property_id: v });
        profil.ga4_property_id = v;
      },
    });

    const ficheGbp = champVerrouille({
      valeur: profil.gbp_location_id,
      placeholder: 'ex : 16711969773629618707',
      surValidation: async (v) => {
        await D.majProfilTolerant(client.id, { gbp_location_id: v });
        profil.gbp_location_id = v;
      },
    });

    return h('div.champ-inline',
      h('label', 'Google Business + Analytics'),
      h('p.aide', "Un seul clic connecte votre fiche Google Business et vos statistiques GA4 — LocWeb pourra afficher vos vraies performances ici. Aucun mot de passe ne nous est jamais communiqué."),
      lignesEtat,
      h('div', { style: { marginTop: '12px' } }, bouton),
      h('p.aide', { style: { marginTop: '14px' } }, "ID de propriété GA4 (différent du code G-XXXXX) — dans GA4 : Admin puis Paramètres de la propriété."),
      proprieteGa4,
      h('p.aide', { style: { marginTop: '14px' } }, "Identifiant de votre fiche Google Business, pour afficher vues, appels et avis."),
      ficheGbp);
  }

  function ligneEtat(libelle, valeur) {
    return h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '.86rem' } },
      valeur
        ? h('span', { style: { color: 'var(--vert)', fontWeight: '650' } }, `✓ ${libelle} — connecté ${depuis(valeur)}`)
        : h('span', { style: { color: 'var(--sourdine)' } }, `${libelle} — pas encore connecté`));
  }

  /* Champ verrouille : un identifiant technique (cle GA4, ID de fiche
     Google...) se saisit une fois et ne se retouche presque jamais. Le
     laisser modifiable en permanence, c'est prendre le risque de l'effacer
     d'un coup de clavier malheureux — et de casser les statistiques sans
     comprendre pourquoi. On passe donc explicitement en mode edition. */
  function champVerrouille({ valeur, placeholder, aide, surValidation }) {
    const bloc = h('div.champ-verrou');
    let enEdition = false;

    function dessiner() {
      vider(bloc);
      if (!enEdition) {
        bloc.append(
          h('span.champ-verrou-val', { class: valeur ? 'champ-verrou-val' : 'champ-verrou-val vide' },
            valeur || 'Non renseigné'),
          h('button.bt.bt-plein.bt-mini', { onclick: () => { enEdition = true; dessiner(); } },
            valeur ? 'Modifier' : 'Renseigner'));
        return;
      }

      const saisie = h('input', { type: 'text', placeholder, value: valeur || '' });
      const valider = async () => {
        const nouvelle = saisie.value.trim() || null;
        try { await surValidation(nouvelle); }
        catch { souffler('Enregistrement impossible.', 'alerte'); return; }
        valeur = nouvelle;
        enEdition = false;
        dessiner();
        souffler('Enregistre.', 'bien');
      };
      saisie.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); valider(); }
        if (e.key === 'Escape') { enEdition = false; dessiner(); }
      });

      bloc.append(saisie,
        h('button.bt.bt-vif.bt-mini', { onclick: valider }, 'Valider'),
        h('button.bt.bt-nu.bt-mini', { onclick: () => { enEdition = false; dessiner(); } }, 'Annuler'));
      saisie.focus();
      saisie.select();
    }

    dessiner();
    return h('div', aide ? h('p.aide', aide) : null, bloc);
  }

  function carteCompte(client, profil, { titre, aide, champ, placeholder, accorde }) {
    const saisie = champVerrouille({
      valeur: profil[champ], placeholder,
      surValidation: async (v) => {
        await D.majProfil(client.id, { [champ]: v });
        profil[champ] = v;
      },
    });

    const etatTexte = h('span');
    function peindre(v) {
      vider(etatTexte);
      etatTexte.append(v
        ? h('span', { style: { color: 'var(--vert)', fontWeight: '650', fontSize: '.86rem' } }, `✓ Connecté (${depuis(v)})`)
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
      souffler(nouvelle ? 'Merci !' : 'Marqué comme non fait.', nouvelle ? 'bien' : 'veille');
    } }, profil[accorde] ? 'Annuler' : "C'est fait");

    return h('div.champ-inline',
      h('label.champ-tete', h('span', titre), etatTexte),
      h('p.aide', aide),
      h('div', { style: { marginTop: '10px' } }, saisie),
      h('div', { style: { marginTop: '10px' } }, bouton));
  }
}
