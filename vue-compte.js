// ===================================================================
//  Mon compte — trois onglets : Mes infos, Connexions, Parrainage.
//
//  Avant, c'etaient trois entrees de menu distinctes pour des pages
//  visitees deux fois par an. Elles occupaient un tiers de la
//  navigation et poussaient le travail quotidien vers le bas. Une seule
//  entree, trois onglets : la navigation redevient une liste de choses
//  qu'on fait, pas une liste de choses qu'on possede.
//
//  L'onglet se lit dans le hash (#/compte?onglet=connexions) pour que
//  les liens "Connecter Google" des autres ecrans tombent au bon
//  endroit, et pour que le retour de Google revienne ici.
// ===================================================================

import { h, vider, differer, souffler, depuis, dateLongue } from './outils.js';
import * as D from './donnees.js';
import { GOOGLE_OAUTH_CLIENT_ID } from './config.js';
import { champsProfil } from './completion.js';

const SCOPES_GOOGLE = [
  'https://www.googleapis.com/auth/business.manage',
  'https://www.googleapis.com/auth/analytics.readonly',
].join(' ');

const ONGLETS = [
  { cle: 'infos',      libelle: 'Mes infos' },
  { cle: 'connexions', libelle: 'Connexions' },
  { cle: 'parrainage', libelle: 'Parrainage' },
];

export async function rendre(page, etat) {
  const { client } = etat;
  const profil = etat.profil || {};

  vider(page);
  page.append(h('h1', 'Mon compte'));

  let actif = new URLSearchParams(location.hash.split('?')[1] || '').get('onglet');
  if (!ONGLETS.some((o) => o.cle === actif)) actif = 'infos';

  const barre = h('div.onglets');
  const corps = h('div');
  page.append(barre, corps);

  ONGLETS.forEach((o) => {
    barre.append(h('button.onglet', {
      class: o.cle === actif ? 'onglet actif' : 'onglet',
      onclick: () => {
        if (o.cle === actif) return;
        actif = o.cle;
        [...barre.children].forEach((b, i) => b.classList.toggle('actif', ONGLETS[i].cle === actif));
        history.replaceState(null, '', `${location.pathname}#/compte?onglet=${actif}`);
        dessiner();
      },
    }, o.libelle));
  });

  /* ---------- retour d'une tentative de connexion Google ---------- */

  const statutRetour = new URLSearchParams(location.hash.split('?')[1] || '').get('google');
  if (statutRetour) {
    const messages = {
      connecte: ['Compte Google connecté.', 'bien'],
      refuse: ['Connexion annulée.', 'veille'],
      session_expiree: ['Session expirée, reconnectez-vous.', 'alerte'],
      erreur: ['La connexion a échoué. Réessayez.', 'alerte'],
    };
    const [texte, ton] = messages[statutRetour] || messages.erreur;
    setTimeout(() => souffler(texte, ton), 200);
    actif = 'connexions';
    history.replaceState(null, '', `${location.pathname}#/compte?onglet=connexions`);
    [...barre.children].forEach((b, i) => b.classList.toggle('actif', ONGLETS[i].cle === 'connexions'));
  }

  async function dessiner() {
    vider(corps);
    if (actif === 'infos') corps.append(await ongletInfos());
    else if (actif === 'connexions') corps.append(ongletConnexions());
    else corps.append(await ongletParrainage());
  }

  await dessiner();

  /* ================= onglet 1 : mes infos ================= */

  async function ongletInfos() {
    const zone = h('div');

    zone.append(groupe('Qui contacter', 'En cas de problème sur votre site.', champsProfil.contact));
    zone.append(groupe('Mon métier', null, champsProfil.activite));

    /* ---------- reseaux ---------- */

    const reseaux = { ...(profil.reseaux || {}) };
    const grilleReseaux = h('div.onb-grille');
    [
      ['facebook', 'Facebook'], ['instagram', 'Instagram'],
      ['tiktok', 'TikTok'], ['linkedin', 'LinkedIn'],
    ].forEach(([cle, libelle]) => {
      const saisie = h('input', { type: 'text', value: reseaux[cle] || '' });
      saisie.addEventListener('input', differer(async () => {
        reseaux[cle] = saisie.value.trim() || null;
        const { ok } = await D.majProfilTolerant(client.id, { reseaux });
        if (!ok) { souffler('Enregistrement impossible.', 'alerte'); return; }
        profil.reseaux = reseaux;
        etat.profil = profil;
        souffler('Enregistré.', 'bien');
      }));
      grilleReseaux.append(h('label.champ', { style: { margin: '0' } }, h('span', libelle), saisie));
    });

    // L'adresse du site est affichee ici mais pas modifiable : c'est
    // LocWeb qui heberge et qui pointe le domaine. Un champ que le
    // client pourrait changer sans que rien ne bouge cote hebergement
    // ne ferait que casser le bouton "Voir mon site".
    const url = client.domaine
      ? (/^https?:\/\//.test(client.domaine) ? client.domaine : `https://${client.domaine}`)
      : null;

    zone.append(h('div.section',
      h('div.section-tete', h('h2', 'Mon site et mes réseaux')),
      h('div.section-corps', { style: { paddingTop: '14px' } },
        h('div.champ-lecture',
          h('span.champ-lecture-etiq', 'Adresse de votre site'),
          url
            ? h('a.champ-lecture-val', { href: url, target: '_blank', rel: 'noopener noreferrer' },
                client.domaine)
            : h('span.champ-lecture-val.vide', 'Pas encore en ligne'),
          h('span.champ-lecture-note', 'Géré par LocWeb')),
        h('div', { style: { marginTop: '18px' } }, grilleReseaux))));

    /* ---------- abonnement et compte ---------- */

    const formule = client.formule || 'vitrine';
    const PRIX = { vitrine: 49, ecommerce: 79 };
    const { data: { user } } = await D.sb.auth.getUser();

    zone.append(h('div.section',
      h('div.section-tete', h('h2', 'Mon abonnement')),
      h('div.section-corps', { style: { paddingTop: '16px' } },
        h('div.synthese',
          h('div.mesure',
            h('p.val', formule === 'ecommerce' ? 'E-commerce' : 'Vitrine'),
            h('p.etiq', 'Formule')),
          h('div.mesure',
            h('p.val', `${PRIX[formule] || 49} €`),
            h('p.etiq', 'Par mois, tout compris'))),
        h('p.aide', { style: { marginTop: '16px' } },
          'Connecté avec ', h('b', user?.email || '—'), '.'),
        h('div', { style: { display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' } },
          h('button.bt.bt-plein', {
            onclick: async (e) => {
              e.target.disabled = true;
              await D.motDePasseOublie(user.email);
              e.target.disabled = false;
              souffler('E-mail envoyé.', 'bien');
            },
          }, 'Changer mon mot de passe'),
          h('button.bt.bt-nu', {
            onclick: () => { D.deconnexion().then(() => location.reload()); },
          }, 'Se déconnecter')))));

    return zone;
  }

  function groupe(titre, aide, champs) {
    const grille = h('div.onb-grille');
    champs.forEach(({ cle, libelle, type, indice, options }) => {
      const saisie = type === 'choix'
        ? h('select', h('option', { value: '' }, 'Non renseigné'),
            ...options.map((o) => h('option', { value: o.valeur }, o.libelle)))
        : h('input', { type, value: profil[cle] || '', placeholder: indice || '' });
      if (type === 'choix') saisie.value = profil[cle] || '';

      saisie.addEventListener(type === 'choix' ? 'change' : 'input', differer(async () => {
        const valeur = saisie.value.trim() || null;
        const { ok } = await D.majProfilTolerant(client.id, { [cle]: valeur });
        if (!ok) { souffler('Enregistrement impossible.', 'alerte'); return; }
        profil[cle] = valeur;
        etat.profil = profil;
        souffler('Enregistré.', 'bien');
      }));
      grille.append(h('label.champ', { style: { margin: '0' } }, h('span', libelle), saisie));
    });

    return h('div.section',
      h('div.section-tete', h('h2', titre), aide ? h('p', aide) : null),
      h('div.section-corps', { style: { paddingTop: '14px' } }, grille));
  }

  /* ================= onglet 2 : connexions ================= */

  function ongletConnexions() {
    const zone = h('div');
    const corpsComptes = h('div.section-corps', { style: { paddingTop: '14px' } });

    corpsComptes.append(carteGoogle());
    corpsComptes.append(
      carteCompte({
        titre: 'Google Ads',
        aide: 'Votre identifiant client, 10 chiffres, en haut à droite de votre compte Google Ads.',
        champ: 'google_ads_id', placeholder: 'ex : 123-456-7890', accorde: 'acces_google_ads',
      }),
      carteCompte({
        titre: 'Pixel Meta',
        aide: "Dans le Gestionnaire d'événements Meta.",
        champ: 'pixel_meta_id', placeholder: 'ex : 123456789012345', accorde: 'acces_pixel_meta',
      }),
      carteCompte({
        titre: 'Pixel Google Ads',
        aide: 'Dans Google Ads : Outils puis Conversions.',
        champ: 'pixel_google_id', placeholder: 'ex : AW-123456789', accorde: 'acces_pixel_google',
      }),
    );

    zone.append(h('div.section',
      h('div.section-tete', h('h2', 'Comptes reliés')),
      corpsComptes));
    return zone;
  }

  function carteGoogle() {
    const tousConnectes = profil.acces_google_business && profil.acces_ga4;

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
    } }, tousConnectes ? 'Reconnecter Google' : 'Se connecter avec Google');

    const proprieteGa4 = champVerrouille({
      valeur: profil.ga4_property_id,
      placeholder: 'ex : 123456789',
      aide: 'ID de propriété GA4 — dans GA4 : Admin puis Paramètres de la propriété.',
      surValidation: async (v) => {
        await D.majProfil(client.id, { ga4_property_id: v });
        profil.ga4_property_id = v;
      },
    });

    const ficheGbp = champVerrouille({
      valeur: profil.gbp_location_id,
      placeholder: 'ex : 16711969773629618707',
      aide: 'Identifiant de votre fiche Google Business.',
      surValidation: async (v) => {
        await D.majProfilTolerant(client.id, { gbp_location_id: v });
        profil.gbp_location_id = v;
      },
    });

    return h('div.champ-inline',
      h('label.champ-tete', h('span', 'Google Business + Analytics')),
      h('div', { style: { display: 'grid', gap: '4px', marginTop: '6px' } },
        ligneEtat('Fiche Google Business', profil.acces_google_business),
        ligneEtat('Google Analytics', profil.acces_ga4)),
      h('div', { style: { marginTop: '12px' } }, bouton),
      h('div', { style: { marginTop: '14px' } }, proprieteGa4),
      h('div', { style: { marginTop: '12px' } }, ficheGbp));
  }

  function ligneEtat(libelle, valeur) {
    return h('p.ligne-etat', { 'data-ok': valeur ? 'oui' : 'non' },
      valeur ? `${libelle} — connecté ${depuis(valeur)}` : `${libelle} — pas connecté`);
  }

  /* Champ verrouille : un identifiant technique se saisit une fois et
     ne se retouche presque jamais. Le laisser modifiable en permanence,
     c'est risquer de l'effacer d'un coup de clavier et de casser les
     statistiques sans comprendre pourquoi. */
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
        souffler('Enregistré.', 'bien');
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
    return h('div', aide ? h('p.aide', { style: { marginBottom: '8px' } }, aide) : null, bloc);
  }

  function carteCompte({ titre, aide, champ, placeholder, accorde }) {
    const saisie = champVerrouille({
      valeur: profil[champ], placeholder, aide,
      surValidation: async (v) => {
        await D.majProfil(client.id, { [champ]: v });
        profil[champ] = v;
      },
    });

    const etatTexte = h('span.mini-etat');
    function peindre(v) {
      etatTexte.textContent = v ? `Fait ${depuis(v)}` : 'Pas encore fait';
      etatTexte.dataset.ok = v ? 'oui' : 'non';
    }
    peindre(profil[accorde]);

    const bouton = h('button.bt.bt-plein.bt-mini', { onclick: async () => {
      const nouvelle = profil[accorde] ? null : new Date().toISOString();
      try { await D.majProfil(client.id, { [accorde]: nouvelle }); }
      catch { souffler('Enregistrement impossible.', 'alerte'); return; }
      profil[accorde] = nouvelle;
      peindre(nouvelle);
      bouton.textContent = nouvelle ? 'Annuler' : "C'est fait";
    } }, profil[accorde] ? 'Annuler' : "C'est fait");

    return h('div.champ-inline',
      h('label.champ-tete', h('span', titre), etatTexte),
      h('div', { style: { marginTop: '10px' } }, saisie),
      h('div', { style: { marginTop: '10px' } }, bouton));
  }

  /* ================= onglet 3 : parrainage ================= */

  async function ongletParrainage() {
    const zone = h('div');
    const code = codeParrainage(client);
    const lien = `https://locweb.fr/?parrain=${encodeURIComponent(code)}`;
    const message = `Salut, je passe par LocWeb pour mon site internet (${client.domaine || 'locweb.fr'}). Avec mon code ${code} ton premier mois est offert : ${lien}`;

    async function copier(texte, quoi) {
      try {
        await navigator.clipboard.writeText(texte);
        souffler(`${quoi} copié.`, 'bien');
      } catch { souffler('Copie impossible.', 'alerte'); }
    }

    zone.append(h('div.section',
      h('div.section-tete',
        h('h2', 'Un mois offert de chaque côté'),
        h('p', 'Votre filleul a son premier mois offert, vous aussi.')),
      h('div.section-corps', { style: { paddingTop: '18px' } },
        h('div.parrain-code',
          h('span.parrain-etiq', 'Votre code'),
          h('b.parrain-val', code),
          h('button.bt.bt-plein.bt-mini', { onclick: () => copier(code, 'Code') }, 'Copier')),
        h('div', { style: { display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' } },
          h('a.bt.bt-vif', {
            href: `https://wa.me/?text=${encodeURIComponent(message)}`,
            target: '_blank', rel: 'noopener noreferrer',
          }, 'Envoyer par WhatsApp'),
          h('a.bt.bt-plein', { href: `sms:?&body=${encodeURIComponent(message)}` }, 'Par SMS'),
          h('button.bt.bt-nu', { onclick: () => copier(lien, 'Lien') }, 'Copier le lien')))));

    const suivi = h('div.section',
      h('div.section-tete', h('h2', 'Vos parrainages')),
      h('div.section-corps', { style: { paddingTop: '16px' } }, h('div.squelette')));
    zone.append(suivi);

    const corpsSuivi = suivi.querySelector('.section-corps');
    try {
      const { data, error } = await D.sb
        .from('parrainages')
        .select('id, filleul_nom, statut, date_creation')
        .eq('parrain_client_id', client.id)
        .order('date_creation', { ascending: false });
      if (error) throw error;

      vider(corpsSuivi);
      if (!data.length) {
        corpsSuivi.append(h('p.aide', "Personne n'a encore utilisé votre code."));
      } else {
        const table = h('div.liste-carte', { style: { margin: '0' } });
        data.forEach((p) => {
          table.append(h('div.ligne-liste',
            h('span.principal',
              h('strong', p.filleul_nom || 'Un artisan'),
              h('span', dateLongue(p.date_creation))),
            h('span.etat', { 'data-ton': p.statut === 'valide' ? 'bien' : 'veille' },
              p.statut === 'valide' ? 'Mois offert' : 'En attente')));
        });
        corpsSuivi.append(table);
      }
    } catch {
      // Table absente : on ne bluffe pas un compteur.
      vider(corpsSuivi);
      corpsSuivi.append(h('p.aide',
        'Le suivi arrive bientôt. En attendant, on applique le mois offert à la main.'));
    }

    return zone;
  }
}

/** Code lisible et stable, derive du nom du site. */
function codeParrainage(client) {
  if (client.code_parrainage) return client.code_parrainage;
  const base = (client.nom_site || 'locweb')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'LOCWEB';
  // Quatre chiffres tires de l'identifiant : deux clients homonymes ne
  // peuvent pas tomber sur le meme code.
  const suffixe = String(client.id || '').replace(/\D/g, '').slice(-4).padStart(4, '0');
  return `${base}${suffixe}`;
}
