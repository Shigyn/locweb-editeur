// ===================================================================
//  Accueil (= Performance) — les vrais chiffres de CE site uniquement.
//  Rien n'est affiche tant qu'il n'y a pas de vraie donnee : pas de
//  sparkline plate a zero pour faire joli.
// ===================================================================

import { h, vider, nombre, grapheAires, jourDe, joursGlissants } from './outils.js';
import * as D from './donnees.js';

export async function rendre(page, etat, { charger }) {
  const { client } = etat;

  const [visites, demandes] = await Promise.all([
    charger('visites', () => D.listerVisites(client.id, 30)),
    charger('demandes', () => D.listerDemandes(client.id)),
  ]);

  vider(page);
  page.append(h('h1', { style: { fontSize: '1.5rem', fontWeight: '750', marginBottom: '18px' } }, 'Accueil'));

  const limite = Date.now() - 30 * 864e5;
  const demandes30 = demandes.filter((d) => new Date(d.date_creation) >= limite);
  const nouvelles = demandes.filter((d) => (d.statut || 'nouvelle') === 'nouvelle').length;
  const taux = visites.length ? (demandes30.length / visites.length * 100) : 0;

  page.append(h('div.synthese',
    mesure('Visites (30 j)', visites.length, 'tous appareils confondus'),
    mesure('Demandes (30 j)', demandes30.length, 'formulaires soumis'),
    mesure('A traiter', nouvelles, nouvelles ? 'demandes sans reponse' : 'tout est traite'),
    mesure('Taux de conversion', visites.length ? `${taux.toFixed(1)} %` : '—', 'visites -> demandes'),
  ));

  if (!visites.length) {
    page.append(h('div.section', h('div.section-corps', { style: { paddingTop: '14px' } },
      h('p', { style: { color: 'var(--sourdine)' } },
        "Pas encore de visite enregistree. Vos statistiques apparaitront ici des que votre site aura recu du monde."))));
    return;
  }

  /* ---------- tendance 30 jours ---------- */

  const jours = joursGlissants(30);
  const parJourV = new Map(jours.map((j) => [j, 0]));
  for (const v of visites) { const j = jourDe(v.horodatage); if (parJourV.has(j)) parJourV.set(j, parJourV.get(j) + 1); }
  const serie = jours.map((j) => parJourV.get(j));

  page.append(h('div.section',
    h('div.section-tete', h('h2', 'Visites — 30 derniers jours')),
    h('div.section-corps', { style: { paddingTop: '14px' } }, grapheAires(serie, { hauteur: 90 }))));

  /* ---------- provenance ---------- */

  const parSource = new Map();
  for (const v of visites) {
    const s = classerSource(v.referent);
    parSource.set(s, (parSource.get(s) || 0) + 1);
  }
  const lignesSource = [...parSource.entries()].sort((a, b) => b[1] - a[1]);
  const max = lignesSource[0][1];

  page.append(h('div.section',
    h('div.section-tete', h('h2', 'D\'ou viennent vos visiteurs')),
    h('div.section-corps', { style: { paddingTop: '14px' } }, h('div', { style: { display: 'grid', gap: '10px' } },
      ...lignesSource.map(([source, n]) => h('div', {
        style: { display: 'grid', gridTemplateColumns: '90px 1fr 44px', gap: '12px', alignItems: 'center' },
      },
        h('span', { style: { fontSize: '.86rem', fontWeight: '600' } }, source),
        h('div', { style: { background: 'var(--surface-creux)', borderRadius: '100px', height: '8px', overflow: 'hidden' } },
          h('div', { style: { background: 'var(--encre-douce)', height: '100%', width: `${(n / max * 100).toFixed(0)}%`, borderRadius: '100px' } })),
        h('span', { style: { fontSize: '.82rem', textAlign: 'right', color: 'var(--sourdine)' } }, nombre(n))))))));
}

function mesure(etiq, val, sous) {
  return h('div.mesure', h('p.val', typeof val === 'number' ? nombre(val) : val), h('p.etiq', etiq), h('p.sous', sous));
}

function classerSource(referent) {
  if (!referent) return 'Direct';
  const r = referent.toLowerCase();
  if (r.includes('google.')) return 'Google';
  if (r.includes('facebook.com')) return 'Facebook';
  if (r.includes('instagram.com')) return 'Instagram';
  if (r.includes('bing.com')) return 'Bing';
  return 'Autres';
}
