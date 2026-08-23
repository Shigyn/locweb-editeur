// ===================================================================
//  Opérateur — ce que Nico voit, et personne d'autre.
//
//  L'entree de menu n'apparait que pour un compte present dans la table
//  `operateurs`. Mais c'est du confort d'affichage, pas de la securite :
//  ce qui protege vraiment les donnees, ce sont les policies
//  `est_operateur()` en base. Un client qui devinerait l'adresse
//  #/operateur verrait une page vide, pas les campagnes des autres.
//
//  Raison d'etre : une demande de campagne se posait en base et
//  attendait que quelqu'un la regarde. Il n'existait aucun endroit en
//  ligne pour la voir ni pour faire avancer son statut — seulement une
//  console jamais deployee.
// ===================================================================

import { h, vider, souffler, depuis, euros, nombre, certain,
         pastilleEtat, ETATS_CAMPAGNE, SUITE_CAMPAGNE } from './outils.js';
import * as D from './donnees.js';

export async function rendre(page, etat, { oublier } = {}) {
  vider(page);
  page.append(h('h1', 'Demandes clients'));

  const zone = h('div');
  page.append(zone);
  zone.append(h('div.squelette'), h('div.squelette'));

  let campagnes;
  try {
    campagnes = await D.listerToutesCampagnes();
  } catch (err) {
    console.error('Lecture des campagnes refusée :', err);
    vider(zone);
    zone.append(h('div.section', h('div.section-corps', { style: { padding: '28px 22px' } },
      h('p.mot', { 'data-ton': 'alerte' }, 'Lecture impossible.'),
      h('p.aide', { style: { marginTop: '8px' } },
        "Ce compte n'est pas reconnu comme opérateur, ou la base a refusé la requête."))));
    return;
  }

  vider(zone);

  // Les demandes non traitees d'abord : c'est la seule partie de cette
  // page ou quelqu'un attend une reponse.
  const aTraiter = campagnes.filter((c) => c.statut === 'demandee');
  const suivies = campagnes.filter((c) => c.statut !== 'demandee');

  zone.append(h('div.synthese',
    h('div.mesure',
      h('p.val', nombre(aTraiter.length)),
      h('p.etiq', 'À traiter')),
    h('div.mesure',
      h('p.val', nombre(campagnes.filter((c) => c.statut === 'active').length)),
      h('p.etiq', 'Ads en ligne')),
    h('div.mesure',
      h('p.val', euros(campagnes
        .filter((c) => c.statut === 'active')
        .reduce((t, c) => t + Number(c.budget_mensuel || 0), 0))),
      h('p.etiq', 'Budget mensuel géré'))));

  if (!campagnes.length) {
    zone.append(h('div.section', h('div.section-corps', { style: { padding: '28px 22px' } },
      h('p.aide', 'Aucune demande de campagne pour le moment.'))));
    return;
  }

  if (aTraiter.length) zone.append(bloc('À traiter', aTraiter));
  if (suivies.length) zone.append(bloc('Suivi', suivies));

  function bloc(titre, liste) {
    const corps = h('div.section-corps', { style: { paddingTop: '10px' } });
    liste.forEach((c) => corps.append(carte(c)));
    return h('div.section',
      h('div.section-tete', h('h2', titre)),
      corps);
  }

  function carte(c) {
    const etat = pastilleEtat(c.statut, ETATS_CAMPAGNE);

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
      vider(etat);
      etat.replaceWith(pastilleEtat(vers, ETATS_CAMPAGNE));
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
        etat),
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
