// ===================================================================
//  Mon activite — les demandes recues sur le site. Un mail part deja
//  automatiquement au client a chaque soumission ; cette page sert a
//  garder trace de ce qui a ete suivi, comme une petite boite de
//  reception.
// ===================================================================

import { h, vider, depuis, dateLongue, nombre, pastilleEtat, ETATS_DEMANDE,
         ETATS_CAMPAGNE, exporterCsv, souffler } from './outils.js';
import * as D from './donnees.js';

export async function rendre(page, etat, { charger, oublier, rafraichirPastille }) {
  const { client } = etat;
  const [demandes, campagnes, commandes] = await Promise.all([
    charger('demandes', () => D.listerDemandes(client.id)),
    charger('campagnes', () => D.listerCampagnes(client.id)).catch(() => []),
    /* Un client sans commandes n'a simplement rien ici, et un client
       dont la policy n'est pas encore posee non plus : dans les deux
       cas on retombe sur une liste vide, jamais sur une page en
       erreur. */
    charger('commandes', () => D.listerCommandes(client.id)).catch(() => []),
  ]);

  vider(page);
  /* Le titre suit ce que le client recoit VRAIMENT. Un snack ne recoit
     pas de << demandes >>, il recoit des commandes — et lui afficher un
     mot qui ne correspond a rien de son metier, c'est lui apprendre a
     ne pas ouvrir la page. */
  page.append(h('h1', commandes.length && !demandes.length ? 'Commandes' : 'Demandes'));

  // Ce que le client a demande A LocWeb, avant ce qu'il a recu DE ses
  // visiteurs : quand on vient de commander une campagne, c'est la
  // premiere chose qu'on cherche. Seules les campagnes encore en
  // mouvement s'affichent — une campagne terminee n'attend plus rien.
  const enCours = campagnes.filter((c) => ['demandee', 'en_preparation'].includes(c.statut));
  if (enCours.length) {
    const liste = h('div.section-corps', { style: { paddingTop: '10px' } });
    enCours.forEach((c) => {
      liste.append(h('div.suivi-ads',
        h('div',
          h('p.suivi-ads-nom', c.nom),
          h('p.suivi-ads-sous', `Demandée ${depuis(c.date_creation)}`)),
        pastilleEtat(c.statut, ETATS_CAMPAGNE)));
    });
    page.append(h('div.section',
      h('div.section-tete',
        h('h2', 'Ma demande de campagne'),
        h('a.section-lien', { href: '#/publicite' }, 'Voir →')),
      liste));
  }

  if (commandes.length) page.append(blocCommandes(commandes));

  if (!demandes.length) {
    // Un restaurant qui recoit des commandes n'a pas besoin qu'on lui
    // annonce en plus qu'il n'a pas de formulaire de contact.
    if (!commandes.length) {
      page.append(h('div.section', h('div.section-corps', { style: { paddingTop: '14px' } },
        h('p', { style: { color: 'var(--sourdine)' } }, "Aucune demande reçue pour le moment."))));
    }
    return;
  }

  const nouvelles = demandes.filter((d) => (d.statut || 'nouvelle') === 'nouvelle').length;
  page.append(h('div.synthese',
    h('div.mesure', h('p.val', nombre(demandes.length)), h('p.etiq', 'Total reçu'), h('p.sous', 'depuis la mise en ligne')),
    h('div.mesure', h('p.val', nombre(nouvelles)), h('p.etiq', 'À traiter'), h('p.sous', nouvelles ? 'sans réponse' : 'tout est traité'))));

  // Export : un artisan qui veut relancer ses prospects dans son propre
  // tableur ne doit pas avoir a recopier a la main.
  page.append(h('div.barre-outils',
    h('button.bt.bt-plein.bt-mini', {
      onclick: () => {
        exporterCsv(
          `demandes-${new Date().toISOString().slice(0, 10)}.csv`,
          [
            { titre: 'Date', valeur: (d) => dateLongue(d.date_creation) },
            { titre: 'Nom', valeur: (d) => d.nom },
            { titre: 'Téléphone', valeur: (d) => d.telephone },
            { titre: 'Email', valeur: (d) => d.email },
            { titre: 'Ville', valeur: (d) => d.ville },
            { titre: 'Besoin', valeur: (d) => d.besoin },
            { titre: 'Message', valeur: (d) => d.message },
            { titre: 'Statut', valeur: (d) => ETATS_DEMANDE[d.statut || 'nouvelle']?.libelle },
          ],
          demandes);
        souffler('Fichier télécharge.', 'bien');
      },
    }, 'Exporter en CSV')));

  const liste = h('div.liste-carte');
  demandes.forEach((d) => { const [ligne, detail] = ligneDemande(d, oublier, rafraichirPastille); liste.append(ligne, detail); });
  page.append(liste);
}

function ligneDemande(d, oublier, rafraichirPastille) {
  const select = h('select', { style: { minWidth: '150px' },
    onchange: async (e) => {
      const avant = d.statut || 'nouvelle';
      try {
        await D.majDemande(d.id, e.target.value);
        d.statut = e.target.value;
        oublier('demandes');
        rafraichirPastille();
      } catch { e.target.value = avant; }
    } },
    ...Object.entries(ETATS_DEMANDE).map(([cle, v]) => h('option', { value: cle, selected: (d.statut || 'nouvelle') === cle }, v.libelle)));

  const detail = h('div', { hidden: true, style: { padding: '0 20px 15px', color: 'var(--sourdine)', fontSize: '.86rem', whiteSpace: 'pre-wrap' } },
    d.message || '(pas de message)',
    h('div', { style: { marginTop: '6px', fontSize: '.8rem' } }, `Reçue le ${dateLongue(d.date_creation)}`));

  const ligne = h('div.ligne-liste', { style: { cursor: 'pointer', flexWrap: 'wrap' }, onclick: (e) => {
    if (e.target.closest('select')) return;
    detail.hidden = !detail.hidden;
  } },
    h('div.principal',
      h('strong', d.nom || 'Sans nom'),
      h('span', [d.telephone, d.ville, d.besoin].filter(Boolean).join(' · ') || depuis(d.date_creation))),
    pastilleEtat(d.statut, ETATS_DEMANDE),
    select);

  return [ligne, detail];
}

/* =================================================================
   LES COMMANDES

   Volontairement en LECTURE SEULE. Le statut d'une commande se change
   au comptoir, sur l'ecran de service, par quelqu'un qui a le plat
   sous les yeux : une commande passee a << prete >> depuis un
   telephone en salle, c'est un client qui attend pour rien.

   Ce que cette page apporte, c'est ce que l'ecran du comptoir ne
   montre pas — le passe. L'ecran de service n'affiche que les
   commandes en cours ; ici on voit combien il y en a eu, pour combien,
   et sur quel rythme.
   ================================================================= */
const ETATS_COMMANDE = {
  recue:     { libelle: 'A accepter', ton: 'attente' },
  acceptee:  { libelle: 'En preparation', ton: 'encours' },
  prete:     { libelle: 'Prete', ton: 'bien' },
  recuperee: { libelle: 'Recuperee', ton: 'bien' },
  annulee:   { libelle: 'Annulee', ton: 'sourdine' },
};

function blocCommandes(commandes) {
  const euros = (n) => (Number(n) || 0).toFixed(2).replace('.', ',') + ' \u20ac';

  const limite = new Date();
  limite.setDate(limite.getDate() - 30);
  const sur30 = commandes.filter((c) => new Date(c.date_creation) >= limite);
  const encaisse = sur30.reduce((t, c) => t + (Number(c.total) || 0), 0);
  // Le panier moyen n'a de sens que sur des commandes qui ont eu lieu :
  // compter les annulees le tirerait vers le bas sans rien dire de
  // vrai.
  const valides = sur30.filter((c) => c.statut !== 'annulee');
  const panier = valides.length ? encaisse / valides.length : 0;

  const synthese = h('div.synthese',
    h('div.mesure', h('p.val', nombre(sur30.length)), h('p.etiq', 'Commandes'), h('p.sous', 'sur 30 jours')),
    h('div.mesure', h('p.val', euros(encaisse)), h('p.etiq', 'Total'), h('p.sous', 'sur 30 jours')),
    h('div.mesure', h('p.val', euros(panier)), h('p.etiq', 'Panier moyen'), h('p.sous', 'hors annulees')));

  const liste = h('div.liste-carte');
  commandes.slice(0, 50).forEach((c) => {
    const heure = c.heure_confirmee || c.heure_demandee
      || (c.adresse_livraison || '').replace(/^Retrait sur place\s*\u2014\s*/, '') || null;
    const etat = ETATS_COMMANDE[c.statut] || { libelle: c.statut || '\u2014' };
    liste.append(h('div.ligne-liste', { style: { flexWrap: 'wrap' } },
      h('div.principal',
        h('strong', c.nom_client || 'Sans nom'),
        h('span', [c.telephone_client, heure && `retrait ${heure}`, depuis(c.date_creation)]
          .filter(Boolean).join(' \u00b7 '))),
      h('strong', { style: { marginLeft: 'auto', whiteSpace: 'nowrap' } }, euros(c.total)),
      h('span.etat', { style: { marginLeft: '12px' } }, etat.libelle)));
  });

  return h('div.section',
    h('div.section-tete', h('h2', 'Commandes recues')),
    h('div.section-corps', { style: { paddingTop: '10px' } }, synthese, liste));
}
