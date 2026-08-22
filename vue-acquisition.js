// ===================================================================
//  Acquisition — suivi des campagnes publicitaires + demande d'une
//  nouvelle campagne. Pas de paiement en ligne pour l'instant : la
//  demande part au statut "demandee", LocWeb la met en place puis
//  fait passer le statut a "en preparation" puis "active".
// ===================================================================

import { h, vider, euros, depuis, pastilleEtat, ETATS_CAMPAGNE, souffler, certain } from './outils.js';
import * as D from './donnees.js';

export async function rendre(page, etat, { charger, oublier }) {
  const { client } = etat;
  const campagnes = await charger('campagnes', () => D.listerCampagnes(client.id));

  vider(page);
  page.append(h('h1', 'Acquisition'));

  page.append(h('div.section',
    h('div.section-tete',
      h('h2', 'Vos campagnes'),
      h('p', 'La mise en place reelle est faite par notre equipe apres votre demande.')),
    h('div.section-corps', { style: { paddingTop: '14px' } },
      campagnes.length
        ? h('div', { style: { display: 'grid', gap: '10px' } }, ...campagnes.map(carteCampagne))
        : h('p', { style: { color: 'var(--sourdine)' } }, 'Aucune campagne pour le moment.'))));

  page.append(sectionDemande(client, campagnes, oublier));
}

function carteCampagne(c) {
  return h('div', {
    style: { display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap',
             padding: '13px 16px', background: 'var(--surface-creux)', border: '1px solid var(--trait)', borderRadius: '10px' },
  },
    h('div', { style: { flex: '1', minWidth: '160px' } },
      h('strong', { style: { display: 'block' } }, c.nom),
      h('span', { style: { fontSize: '.82rem', color: 'var(--sourdine)' } }, `${c.zone || 'zone non definie'} · demandee ${depuis(c.date_creation)}`)),
    pastilleEtat(c.statut, ETATS_CAMPAGNE),
    h('span', { style: { fontSize: '.86rem', color: 'var(--sourdine)' } }, c.budget_mensuel ? euros(c.budget_mensuel) + '/mois' : ''));
}

function sectionDemande(client, campagnes, oublier) {
  const nom = h('input', { type: 'text', placeholder: 'ex : Visibilite locale' });
  const objectif = h('select', {},
    h('option', { value: 'appels' }, "Plus d'appels"),
    h('option', { value: 'devis' }, 'Plus de demandes de devis'),
    h('option', { value: 'notoriete' }, 'Faire connaitre mon activite'));
  const budget = h('input', { type: 'number', min: '0', step: '10', placeholder: 'ex : 150' });
  const bouton = h('button.bt.bt-vif', { type: 'submit' }, 'Envoyer ma demande');

  const form = h('form', { onsubmit: async (e) => {
    e.preventDefault();
    if (!nom.value.trim()) { souffler('Donnez un nom a votre campagne.', 'alerte'); return; }
    if (!certain('Envoyer cette demande de campagne a LocWeb ?')) return;
    bouton.disabled = true;
    bouton.textContent = 'Envoi...';
    try {
      await D.demanderCampagne(client.id, {
        nom: nom.value.trim(), objectif: objectif.value,
        budget_mensuel: budget.value ? Number(budget.value) : null, zone: client.ville || null,
      });
      oublier('campagnes');
      souffler('Demande envoyee — on revient vers vous rapidement.', 'bien');
      nom.value = ''; budget.value = '';
    } catch { souffler('Envoi impossible.', 'alerte'); }
    bouton.disabled = false;
    bouton.textContent = 'Envoyer ma demande';
  } },
    h('label.champ', h('span', 'Nom de la campagne'), nom),
    h('label.champ', h('span', 'Objectif'), objectif),
    h('label.champ', h('span', 'Budget mensuel souhaite (EUR, optionnel)'), budget),
    bouton);

  return h('div.section',
    h('div.section-tete', h('h2', 'Demander une nouvelle campagne')),
    h('div.section-corps', { style: { paddingTop: '14px' } }, form));
}
