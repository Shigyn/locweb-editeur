// ===================================================================
//  Mon activite — les demandes recues sur le site. Un mail part deja
//  automatiquement au client a chaque soumission ; cette page sert a
//  garder trace de ce qui a ete suivi, comme une petite boite de
//  reception.
// ===================================================================

import { h, vider, depuis, dateLongue, nombre, pastilleEtat, ETATS_DEMANDE, exporterCsv, souffler } from './outils.js';
import * as D from './donnees.js';

export async function rendre(page, etat, { charger, oublier, rafraichirPastille }) {
  const { client } = etat;
  const demandes = await charger('demandes', () => D.listerDemandes(client.id));

  vider(page);
  page.append(h('h1', 'Demandes'));

  if (!demandes.length) {
    page.append(h('div.section', h('div.section-corps', { style: { paddingTop: '14px' } },
      h('p', { style: { color: 'var(--sourdine)' } }, "Aucune demande reçue pour le moment."))));
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
