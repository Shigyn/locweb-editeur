// ===================================================================
//  Mon compte — deux onglets : Mes infos, Connexions.
//
//  Le parrainage a ete retire le 2026-08-24 : ce n'est pas un tableau
//  de bord public, l'offre n'a pas a y figurer pour l'instant. Le code
//  reste dans l'historique git si elle revient un jour, et la table
//  `parrainages` en base ne gene personne.
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

import { h, vider, differer, souffler, depuis, dateLongue, sectionPliable } from './outils.js';
import * as D from './donnees.js';
import { GOOGLE_OAUTH_CLIENT_ID } from './config.js';
import { champsProfil } from './completion.js';

/* Un seul consentement pour les trois services : Google presente une
   liste unique au client, et lui redemander separement ferait trois
   ecrans d'autorisation pour un artisan qui n'en comprend deja qu'un.

   Ajouter un scope ici oblige tout client deja connecte a se
   reconnecter — l'ancien jeton ne couvre pas le nouveau service et
   Google renvoie une erreur d'autorisation, pas une demande de
   consentement. C'est pour cela qu'on ne les ajoute pas un par un au
   fil de l'eau. */
const SCOPES_GOOGLE = [
  'https://www.googleapis.com/auth/business.manage',
  'https://www.googleapis.com/auth/analytics.readonly',
  // Search Console : ce que les gens tapent AVANT d'arriver sur le
  // site. C'est la seule source qui explique pourquoi le trafic est
  // faible, la ou Analytics ne fait que le constater.
  'https://www.googleapis.com/auth/webmasters.readonly',
].join(' ');

// Libelles des formules. Le tarif ne figure pas ici : il n'est affiche
// nulle part dans l'espace client, et le seul endroit ou il fait foi
// c'est le contrat.
const FORMULES = {
  vitrine: 'Vitrine',
  restaurant: 'Restaurant',
  ecommerce: 'E-commerce',
};

const ONGLETS = [
  { cle: 'infos',      libelle: 'Mes infos' },
  { cle: 'connexions', libelle: 'Connexions' },
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
    corps.append(actif === 'connexions' ? ongletConnexions() : await ongletInfos());
  }

  await dessiner();

  /* ================= onglet 1 : mes infos ================= */

  async function ongletInfos() {
    const zone = h('div');

    zone.append(await blocNotifications());
    zone.append(groupe('Qui contacter', 'En cas de problème sur votre site.', champsProfil.contact,
      '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c0-3.6 3.4-6.2 7.5-6.2s7.5 2.6 7.5 6.2"/>'));
    zone.append(groupe('Mon métier', null, champsProfil.activite,
      '<path d="M4 16a8 8 0 0 1 16 0"/><path d="M2 16h20"/><path d="M10 8V4.5A1.5 1.5 0 0 1 11.5 3h1A1.5 1.5 0 0 1 14 4.5V8"/>'));

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

    // Meme case que les reseaux, mais un lien plutot qu'un champ : le
    // domaine ne se modifie pas ici (c'est LocWeb qui heberge), en
    // revanche le client veut souvent aller voir son site. Un lien
    // repond a l'envie reelle sans laisser croire a une saisie.
    const urlSite = client.domaine
      ? (/^https?:\/\//.test(client.domaine) ? client.domaine : `https://${client.domaine}`)
      : null;

    const champSite = urlSite
      ? h('a.champ-lien', {
          href: urlSite, target: '_blank', rel: 'noopener noreferrer',
          title: 'Ouvrir mon site dans un nouvel onglet',
        },
          client.domaine,
          h('svg.champ-lien-icone', {
            viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
            'stroke-width': '1.9', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
            html: '<path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
          }))
      : h('span.champ-lien.vide', 'Pas encore en ligne');
    grilleReseaux.prepend(h('div.champ', { style: { margin: '0' } },
      h('span', 'Adresse de votre site'), champSite));

    const remplisReseaux = Object.values(profil.reseaux || {}).filter(Boolean).length;
    const site = sectionPliable({
      titre: 'Mon site et mes réseaux',
      icone: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18"/>',
      resume: `${remplisReseaux} réseau${remplisReseaux > 1 ? 'x' : ''}`,
    });
    site.corps.append(grilleReseaux);
    zone.append(site.bloc);

    /* ---------- abonnement et compte ---------- */

    // Pas de prix affiche : le client sait ce qu'il paie, il l'a signe.
    // Le lui remettre sous les yeux en gros chiffres a chaque visite
    // transforme son espace de travail en facture, et invite a se
    // demander si ca les vaut plutot qu'a s'en servir.
    const { data: { user } } = await D.sb.auth.getUser();

    const abo = sectionPliable({
      titre: 'Mon abonnement',
      icone: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>',
      resume: FORMULES[client.formule] || FORMULES.vitrine,
    });
    abo.corps.append(
        h('p.formule-nom', FORMULES[client.formule] || FORMULES.vitrine),
        h('p.aide', { style: { marginTop: '8px' } },
          'Hébergement, nom de domaine, éditeur de contenu et support inclus.'),
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
          }, 'Se déconnecter')));
    zone.append(abo.bloc);

    return zone;
  }

  function groupe(titre, aide, champs, icone) {
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

    // Le resume dit ce qu'on trouvera dedans sans avoir a ouvrir : un
    // titre seul n'apprend rien, "2 sur 4" dit s'il faut aller voir.
    const remplis = champs.filter((c) => profil[c.cle]).length;
    const { bloc, corps } = sectionPliable({
      titre, sous: aide, icone,
      resume: `${remplis} sur ${champs.length}`,
    });
    corps.append(grille);
    return bloc;
  }

  /* ---------- etre prevenu d'une nouvelle demande ----------

     Place en tete de l'onglet, avant les coordonnees : c'est le seul
     reglage de cette page qui change quelque chose au quotidien. Une
     demande vue trois jours plus tard est un chantier perdu.

     Le module n'est charge qu'ici : inutile de le tirer au demarrage
     pour un reglage que le client ouvre une fois. */
  async function blocNotifications() {
    const P = await import('./push.js');

    const carte = h('div.carte-simple');
    const titre = h('p.avis-titre', 'Être prévenu des nouvelles demandes');
    const texte = h('p.avis-texte');
    const zoneBouton = h('div.avis-actions');
    carte.append(titre, texte, zoneBouton);

    async function dessiner() {
      vider(zoneBouton);

      if (!P.pushDisponible()) {
        texte.textContent = "Votre navigateur ne sait pas afficher de notifications. "
          + "Installez l'application depuis le menu de votre compte pour en recevoir.";
        return;
      }

      if (P.pushRefuse()) {
        // Un refus est definitif par appareil : aucun bouton ne peut le
        // rattraper, seul le client peut revenir dessus dans son
        // navigateur. Proposer un bouton ici ne ferait qu'echouer.
        texte.textContent = "Les notifications sont bloquées pour ce site sur cet appareil. "
          + "Vous pouvez les réautoriser depuis les réglages de votre navigateur, "
          + "à la ligne Notifications.";
        return;
      }

      if (await P.pushActif()) {
        texte.textContent = "Cet appareil vous prévient dès qu'une demande arrive, "
          + "même application fermée.";
        zoneBouton.append(h('button.bt.bt-nu', {
          onclick: async (e) => {
            e.target.disabled = true;
            await P.desactiverPush();
            await dessiner();
            souffler('Notifications désactivées.', 'bien');
          },
        }, 'Ne plus être prévenu sur cet appareil'));
        return;
      }

      texte.textContent = "Recevez une notification dès qu'une demande arrive, "
        + "même quand l'application est fermée. C'est souvent l'heure qui suit "
        + "qui décide si le devis aboutit.";
      zoneBouton.append(h('button.bt.bt-vif', {
        onclick: async (e) => {
          e.target.disabled = true;
          const { ok, raison } = await P.activerPush(client.id);
          await dessiner();
          souffler(ok ? 'Notifications activées.' : raison, ok ? 'bien' : 'alerte');
        },
      }, 'Me prévenir sur cet appareil'));
    }

    await dessiner();
    return carte;
  }

  /* ================= onglet 2 : connexions ================= */

  function ongletConnexions() {
    const zone = h('div');
    const connectes = ['acces_ga4', 'acces_google_business', 'acces_google_ads',
      'acces_pixel_meta', 'acces_pixel_google'].filter((c) => profil[c]).length;
    const { bloc, corps: corpsComptes } = sectionPliable({
      titre: 'Comptes reliés',
      icone: '<path d="M9 12a3 3 0 0 1 3-3h4a3 3 0 0 1 0 6h-1"/><path d="M15 12a3 3 0 0 1-3 3H8a3 3 0 0 1 0-6h1"/>',
      resume: `${connectes} sur 5`,
      ouvert: true,
    });

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

    zone.append(bloc);
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

    /* Choix dans une liste plutot que saisie a la main.

       Les identifiants Google sont des nombres a 9 et 20 chiffres,
       planques dans deux ecrans differents de l'admin et dans une URL.
       Une faute de frappe casse tout en silence. Comme le consentement
       OAuth donne deja acces a la liste des proprietes et des fiches,
       autant la proposer.

       Le champ manuel reste accessible en repli : un client peut avoir
       une propriete partagee qui n'apparait pas dans sa liste. */
    const zoneChoix = h('div', { style: { marginTop: '14px' } });

    if (profil.acces_ga4 || profil.acces_google_business) {
      zoneChoix.append(h('div.squelette', { style: { height: '60px' } }));
      remplirChoix();
    } else {
      zoneChoix.append(champsManuels());
    }

    async function remplirChoix() {
      let comptes;
      try { comptes = await D.comptesGoogle(); }
      catch (err) {
        console.error('Liste des comptes Google indisponible :', err);
        vider(zoneChoix);
        zoneChoix.append(champsManuels());
        return;
      }

      vider(zoneChoix);

      // Chaque cote est traite separement : Analytics peut repondre
      // pendant que la fiche echoue. Les melanger, c'est afficher une
      // liste et faire disparaitre l'autre sans un mot d'explication.
      zoneChoix.append(bloc({
        titre: 'Propriété Analytics',
        options: (comptes.proprietes || []).map((p) => ({
          valeur: p.id,
          libelle: p.mesure ? `${p.nom} — ${p.mesure}` : p.nom,
          brut: p,
        })),
        valeur: profil.ga4_property_id,
        souci: comptes.soucis?.analytics,
        manuel: () => champGa4(),
        surChoix: async (id, p) => {
          await D.majProfilTolerant(client.id, {
            ga4_property_id: id,
            ga4_measurement_id: p?.mesure || null,
          });
          profil.ga4_property_id = id;
          souffler('Propriété reliée.', 'bien');
        },
      }));

      zoneChoix.append(bloc({
        titre: 'Fiche Google Business',
        options: (comptes.fiches || []).map((f) => ({
          valeur: f.id,
          libelle: f.adresse ? `${f.nom} — ${f.adresse}` : f.nom,
          brut: f,
        })),
        valeur: profil.gbp_location_id,
        souci: comptes.soucis?.fiche,
        manuel: () => champGbp(),
        surChoix: async (id, f) => {
          await D.majProfilTolerant(client.id, { gbp_location_id: id });
          profil.gbp_location_id = id;
          souffler('Fiche reliée.', 'bien');
          if (f) proposerReprise(f);
        },
      }));

      zoneChoix.append(bloc({
        titre: 'Search Console',
        options: (comptes.sites || []).map((s) => ({
          valeur: s.id, libelle: s.nom, brut: s,
        })),
        valeur: profil.search_console_site,
        souci: comptes.soucis?.recherche,
        surChoix: async (id) => {
          await D.majProfilTolerant(client.id, {
            search_console_site: id,
            // Search Console ne remonte jamais avant la verification :
            // on note a partir de quand les chiffres existent.
            search_console_depuis: profil.search_console_depuis
              || new Date().toISOString().slice(0, 10),
          });
          profil.search_console_site = id;
          souffler('Search Console relié.', 'bien');
        },
      }));
    }

    /* Une liste quand Google repond, le champ manuel sinon — et dans ce
       cas on dit pourquoi. "Rien ici" laisse croire a un compte vide,
       alors que neuf fois sur dix c'est une API a activer. */
    function bloc({ titre, options, valeur, souci, manuel, surChoix }) {
      if (options.length) {
        return listeChoix({ libelle: titre, options, valeur, surChoix });
      }
      // Meme regle qu'ailleurs : le detail technique en console, une
      // phrase lisible a l'ecran. Un client n'a pas a lire un message
      // d'erreur d'API pour comprendre ou il en est.
      if (souci) console.error(`${titre} — Google a refusé la liste :`, souci);
      const enAttenteAcces = souci && /quota|not been used|disabled/i.test(souci);

      return h('div', { style: { marginBottom: '14px' } },
        h('p.aide', { style: { marginBottom: '8px' } },
          enAttenteAcces
            ? `${titre} — accès en cours de validation chez Google. En attendant, saisie manuelle :`
            : souci
              ? `${titre} — Google n'a pas répondu. Saisie manuelle :`
              : `${titre} — rien trouvé sur ce compte Google. Saisie manuelle :`),
        manuel());
    }

    function listeChoix({ libelle, options, valeur, surChoix }) {
      const select = h('select',
        h('option', { value: '' }, 'Choisir...'),
        ...options.map((o) => h('option', { value: o.valeur }, o.libelle)));
      select.value = valeur || '';
      select.addEventListener('change', async () => {
        const choisi = options.find((o) => o.valeur === select.value);
        try { await surChoix(select.value || null, choisi?.brut); }
        catch { souffler('Enregistrement impossible.', 'alerte'); }
      });
      return h('label.champ', { style: { marginBottom: '12px' } },
        h('span', libelle), select);
    }

    /* Ce que Google sait deja du client : on ne l'ecrase jamais sans
       demander. Une adresse ou des horaires ecrases en silence, c'est
       la mauvaise surprise garantie. */
    function proposerReprise(f) {
      const reprises = [];
      if (f.telephone && !profil.contact_telephone) reprises.push(['contact_telephone', 'téléphone', f.telephone]);
      if (f.ville && !profil.localisation) reprises.push(['localisation', 'ville', f.ville]);
      if (f.categorie && !profil.metier_precis) reprises.push(['metier_precis', 'métier', f.categorie]);
      if (!reprises.length) return;

      const resume = reprises.map(([, quoi, val]) => `${quoi} : ${val}`).join(' · ');
      const banniere = h('div.onb-apres', { style: { marginTop: '4px', marginBottom: '12px' } },
        h('div',
          h('b', 'Reprendre les infos de votre fiche Google ?'),
          h('p', resume),
          h('div', { style: { display: 'flex', gap: '10px', marginTop: '10px' } },
            h('button.bt.bt-vif.bt-mini', {
              onclick: async () => {
                const champs = Object.fromEntries(reprises.map(([cle, , val]) => [cle, val]));
                const { ok } = await D.majProfilTolerant(client.id, champs);
                if (!ok) { souffler('Enregistrement impossible.', 'alerte'); return; }
                Object.assign(profil, champs);
                etat.profil = profil;
                banniere.remove();
                souffler('Informations reprises.', 'bien');
              },
            }, 'Reprendre'),
            h('button.bt.bt-nu.bt-mini', { onclick: () => banniere.remove() }, 'Non merci'))));
      zoneChoix.prepend(banniere);
    }

    function champGa4() {
      return champVerrouille({
        valeur: profil.ga4_property_id,
        placeholder: 'ex : 123456789',
        aide: 'ID de propriété GA4 — dans GA4 : Admin puis Paramètres de la propriété.',
        surValidation: async (v) => {
          await D.majProfil(client.id, { ga4_property_id: v });
          profil.ga4_property_id = v;
        },
      });
    }

    function champGbp() {
      return champVerrouille({
        valeur: profil.gbp_location_id,
        placeholder: 'ex : 16711969773629618707',
        aide: 'Identifiant de votre fiche Google Business.',
        surValidation: async (v) => {
          await D.majProfilTolerant(client.id, { gbp_location_id: v });
          profil.gbp_location_id = v;
        },
      });
    }

    function champsManuels() {
      return h('div',
        h('div', champGa4()),
        h('div', { style: { marginTop: '12px' } }, champGbp()));
    }

    return h('div.champ-inline',
      h('label.champ-tete', h('span', 'Google Business + Analytics')),
      h('div', { style: { display: 'grid', gap: '4px', marginTop: '6px' } },
        ligneEtat('Fiche Google Business', profil.acces_google_business),
        ligneEtat('Google Analytics', profil.acces_ga4)),
      h('div', { style: { marginTop: '12px' } }, bouton),
      zoneChoix);
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

}
