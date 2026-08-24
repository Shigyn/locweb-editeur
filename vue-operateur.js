// ===================================================================
//  Mode opérateur — la vue d'ensemble, réservée à Nico.
//
//  L'entree de menu n'apparait que pour un compte present dans la table
//  `operateurs`. Mais c'est du confort d'affichage, pas de la securite :
//  ce qui protege vraiment les donnees, ce sont les policies
//  `est_operateur()` en base. Un client qui devinerait l'adresse
//  #/operateur verrait une page vide, pas les fiches des autres.
//
//  Deux onglets, deux questions differentes :
//    - Clients   : qui est ou, quoi est branche, qui attend une reponse
//    - Campagnes : qu'est-ce qui attend d'etre monte dans Google Ads
// ===================================================================

import { h, vider, souffler, depuis, euros, nombre, certain, grapheAires,
         pastilleEtat, ETATS_CAMPAGNE, SUITE_CAMPAGNE } from './outils.js';
import * as D from './donnees.js';

const ONGLETS = [
  { cle: 'clients', libelle: 'Clients' },
  { cle: 'campagnes', libelle: 'Campagnes' },
];

/* Au niveau du module, pas dans `rendre`.

   Declare a l'interieur, il tombait apres le `await dessiner()` qui
   l'utilise : un `const` n'existe pas avant sa ligne, et l'attente rend
   l'ordre d'execution trompeur. La table n'a aucune raison d'etre
   recreee a chaque rendu de toute facon. */
const FORMULES = { vitrine: 'Vitrine', restaurant: 'Restaurant', ecommerce: 'E-commerce' };

export async function rendre(page, etat, { oublier } = {}) {
  vider(page);
  page.append(h('h1', 'Mode opérateur'));

  let actif = new URLSearchParams(location.hash.split('?')[1] || '').get('onglet');
  if (!ONGLETS.some((o) => o.cle === actif)) actif = 'clients';

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
        history.replaceState(null, '', `${location.pathname}#/operateur?onglet=${actif}`);
        dessiner();
      },
    }, o.libelle));
  });

  async function dessiner() {
    vider(corps);
    corps.append(h('div.squelette'), h('div.squelette'));
    try {
      vider(corps);
      corps.append(actif === 'clients' ? await ongletClients() : await ongletCampagnes());
    } catch (err) {
      // Le motif exact plutot qu'une supposition : "pas operateur" et
      // "colonne inexistante" se corrigent de deux facons opposees.
      console.error('Vue opérateur :', err);
      vider(corps);
      corps.append(h('div.section', h('div.section-corps', { style: { padding: '28px 22px' } },
        h('p.mot', { 'data-ton': 'alerte' }, 'Lecture impossible.'),
        h('p.aide', { style: { marginTop: '8px' } },
          err?.message || "La base a refusé la requête."))));
    }
  }

  await dessiner();

  /* ================= onglet 1 : les clients ================= */

  async function ongletClients() {
    const [clients, demandes] = await Promise.all([
      D.tousLesClients(),
      D.toutesLesDemandes().catch(() => []),
    ]);

    const zone = h('div');

    // Compte par client en une passe : une requete par fiche aurait
    // multiplie les allers-retours pour une information deja la.
    const parClient = new Map();
    demandes.forEach((d) => {
      const c = parClient.get(d.client_id) || { total: 0, nouvelles: 0, derniere: null };
      c.total += 1;
      if ((d.statut || 'nouvelle') === 'nouvelle') c.nouvelles += 1;
      if (!c.derniere) c.derniere = d.date_creation;
      parClient.set(d.client_id, c);
    });

    const aRepondre = demandes.filter((d) => (d.statut || 'nouvelle') === 'nouvelle').length;
    const nonBranches = clients.filter((c) => !profil(c).acces_ga4).length;

    zone.append(h('div.synthese',
      h('div.mesure', h('p.val', nombre(clients.length)), h('p.etiq', 'Clients')),
      h('div.mesure', h('p.val', nombre(aRepondre)), h('p.etiq', 'Demandes sans réponse')),
      h('div.mesure', h('p.val', nombre(nonBranches)), h('p.etiq', 'Sans Analytics'))));

    const liste = h('div.section-corps', { style: { paddingTop: '6px' } });
    clients.forEach((c) => liste.append(carteClient(c, parClient.get(c.id))));
    zone.append(h('div.section',
      h('div.section-tete', h('h2', 'Tous les clients')),
      liste));

    return zone;
  }

  // profils_client arrive en tableau quand la relation est jointe ;
  // parfois en objet selon la forme de la requete. On aplatit.
  function profil(c) {
    const p = c.profils_client;
    return (Array.isArray(p) ? p[0] : p) || {};
  }

  function carteClient(c, compte) {
    const p = profil(c);
    const url = c.domaine
      ? (/^https?:\/\//.test(c.domaine) ? c.domaine : `https://${c.domaine}`)
      : null;

    // Ce qui compte d'un coup d'oeil : est-ce branche, et quelqu'un
    // attend-il une reponse. Le detail se charge en ouvrant la fiche.
    const jetons = h('div.op-jetons',
      jeton('Analytics', Boolean(p.acces_ga4)),
      jeton('Fiche Google', Boolean(p.acces_google_business)),
      jeton('Questionnaire', Boolean(p.complete_le)),
      jeton('Éditeur complet', c.acces_client === 'complet'));

    const nouvelles = compte?.nouvelles || 0;
    const resume = h('div.op-resume');

    // Les chiffres ne partent qu'a l'ouverture. Charger les stats des
    // douze clients d'un coup ferait douze appels Google pour une page
    // qu'on ne lit qu'en diagonale.
    let charge = false;
    const fiche = h('details.op-client', {
      ontoggle: () => {
        if (!fiche.open || charge) return;
        charge = true;
        remplirResume(c, p, resume);
      },
    },
      h('summary.op-client-tete',
        h('div',
          h('p.op-client-nom', c.nom_site || 'Sans nom'),
          h('p.op-client-lien', url ? c.domaine : 'Pas de domaine')),
        nouvelles
          ? h('span.etat', { 'data-ton': 'action' },
              `${nouvelles} demande${nouvelles > 1 ? 's' : ''} à traiter`)
          : h('span.etat', compte?.total ? `${compte.total} demande${compte.total > 1 ? 's' : ''}` : 'Aucune demande'),
        h('span.section-chevron', { html: '&rsaquo;' })),
      jetons,
      h('p.op-client-pied',
        [c.formule ? FORMULES[c.formule] || c.formule : null,
         p.metier_precis || c.ville,
         compte?.derniere ? `dernière demande ${depuis(compte.derniere)}` : null]
          .filter(Boolean).join(' · ')),
      resume);

    return fiche;
  }

  /* Le resume de performances d'un client, charge a la demande.

     La fonction ga4-donnees accepte un client_id quand l'appelant est
     operateur — et c'est elle qui le verifie, pas cet ecran. */
  async function remplirResume(c, p, hote) {
    if (!p.acces_ga4) {
      hote.append(h('p.aide', { style: { marginTop: '14px' } },
        "Analytics n'est pas connecté chez ce client : aucun chiffre à afficher."),
        actions(c, url(c)));
      return;
    }

    hote.append(h('div.squelette', { style: { height: '76px', marginTop: '14px' } }));

    let r;
    try { r = await D.statsGa4('30j', c.id); }
    catch (err) {
      console.error(`Stats de ${c.nom_site} :`, err);
      vider(hote);
      hote.append(h('p.aide', { style: { marginTop: '14px' } },
        err?.donnees?.error || err?.message || 'Chiffres indisponibles.'),
        actions(c, url(c)));
      return;
    }

    const t = r.totaux || {};
    const serie = (r.series || []).map((l) => l.visiteurs);
    const appels = (r.repartitions?.contacts || [])
      .find((x) => x.cle === 'appel_telephone')?.valeur;

    vider(hote);
    hote.append(
      h('p.op-resume-titre', '30 derniers jours'),
      h('div.op-resume-chiffres',
        mesure(nombre(t.visiteurs ?? 0), 'Visiteurs'),
        mesure(nombre(t.pages_vues ?? 0), 'Pages vues'),
        mesure(appels === undefined ? '—' : nombre(appels), 'Appels depuis le site')),
      serie.length > 1
        ? h('div.op-resume-graphe', grapheAires(serie, { hauteur: 44 }))
        : null,
      actions(c, url(c)));
  }

  function url(c) {
    if (!c.domaine) return null;
    return /^https?:\/\//.test(c.domaine) ? c.domaine : `https://${c.domaine}`;
  }

  function mesure(valeur, etiquette) {
    return h('div', h('p.op-resume-val', valeur), h('p.op-resume-etiq', etiquette));
  }

  function actions(c, lien) {
    return h('div.op-resume-actions',
      lien
        ? h('a.bt.bt-plein.bt-mini', { href: lien, target: '_blank', rel: 'noopener noreferrer' },
            'Voir le site')
        : null);
  }

  function jeton(libelle, ok) {
    return h('span.op-jeton', { 'data-ok': ok ? 'oui' : 'non' }, libelle);
  }

  /* ================= onglet 2 : les campagnes ================= */

  async function ongletCampagnes() {
    const campagnes = await D.listerToutesCampagnes();
    const zone = h('div');

    const aTraiter = campagnes.filter((c) => c.statut === 'demandee');
    const suivies = campagnes.filter((c) => c.statut !== 'demandee');

    zone.append(h('div.synthese',
      h('div.mesure', h('p.val', nombre(aTraiter.length)), h('p.etiq', 'À traiter')),
      h('div.mesure', h('p.val', nombre(campagnes.filter((c) => c.statut === 'active').length)),
        h('p.etiq', 'Ads en ligne')),
      h('div.mesure', h('p.val', euros(campagnes
        .filter((c) => c.statut === 'active')
        .reduce((t, c) => t + Number(c.budget_mensuel || 0), 0))),
        h('p.etiq', 'Budget mensuel géré'))));

    if (!campagnes.length) {
      zone.append(h('div.section', h('div.section-corps', { style: { padding: '28px 22px' } },
        h('p.aide', 'Aucune demande de campagne pour le moment.'))));
      return zone;
    }

    if (aTraiter.length) zone.append(bloc('À traiter', aTraiter));
    if (suivies.length) zone.append(bloc('Suivi', suivies));
    return zone;
  }

  function bloc(titre, liste) {
    const corpsBloc = h('div.section-corps', { style: { paddingTop: '10px' } });
    liste.forEach((c) => corpsBloc.append(carteCampagne(c)));
    return h('div.section', h('div.section-tete', h('h2', titre)), corpsBloc);
  }

  function carteCampagne(c) {
    const pastille = pastilleEtat(c.statut, ETATS_CAMPAGNE);

    const choix = h('select',
      ...SUITE_CAMPAGNE.map((k) => h('option', { value: k }, ETATS_CAMPAGNE[k].libelle)));
    choix.value = c.statut;

    choix.addEventListener('change', async () => {
      const avant = c.statut;
      const vers = choix.value;

      // Une campagne "lancée" veut dire que de l'argent part chez
      // Google. On ne bascule pas ce statut par un clic de travers.
      if (vers === 'active' && avant !== 'active') {
        const ok = await certain(
          `Confirmer que la campagne "${c.nom}" est en ligne dans Google Ads ? Le client le verra immédiatement dans son espace.`,
          { titre: 'Marquer comme lancée', action: 'Confirmer' });
        if (!ok) { choix.value = avant; return; }
      }

      try { await D.majCampagne(c.id, { statut: vers }); }
      catch (err) {
        console.error('Changement de statut refusé :', err);
        souffler('Enregistrement impossible.', 'alerte');
        choix.value = avant;
        return;
      }
      c.statut = vers;
      pastille.replaceWith(pastilleEtat(vers, ETATS_CAMPAGNE));
      oublier?.('campagnes');
      souffler(`Statut : ${ETATS_CAMPAGNE[vers].libelle}.`, 'bien');
    });

    const motsCles = (c.mots_cles || []).length
      ? h('div.puces', { style: { marginTop: '10px' } },
          ...c.mots_cles.map((m) => h('span.puce', m)))
      : null;

    return h('div.demande-ads',
      h('div.demande-ads-tete',
        h('div',
          h('p.demande-ads-client', c.clients?.nom_site || 'Client inconnu'),
          h('p.demande-ads-nom', c.nom)),
        pastille),
      h('div.demande-ads-faits',
        fait('Budget', c.budget_mensuel ? `${euros(c.budget_mensuel)} / mois` : '—'),
        fait('Zone', c.zone || '—'),
        fait('Demandée', depuis(c.date_creation))),
      motsCles,
      h('div.demande-ads-pied',
        h('span.demande-ads-etiq', 'Faire passer à'),
        choix));
  }

  function fait(etiquette, valeur) {
    return h('div', h('p.demande-ads-etiq', etiquette), h('p.demande-ads-val', valeur));
  }
}
