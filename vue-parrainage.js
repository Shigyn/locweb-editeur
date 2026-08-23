// ===================================================================
//  Parrainage — un mois offert de chaque cote.
//
//  Le meilleur canal d'acquisition d'une agence locale, c'est le
//  plombier qui parle au carreleur. Ce module ne cree pas ce reflexe,
//  il lui donne un outil : un lien pret a envoyer par SMS.
//
//  Honnetete : le suivi des filleuls n'apparait que si la table
//  existe cote base. Tant qu'elle n'est pas installee, on affiche le
//  code et le partage, et on dit franchement que le credit se fait a
//  la main — plutot que d'afficher un compteur toujours a zero.
// ===================================================================

import { h, vider, souffler, dateLongue } from './outils.js';
import * as D from './donnees.js';

const AVANTAGE = 'un mois offert';

/** Code lisible, stable, derive du nom du site. */
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

export async function rendre(page, etat) {
  const { client } = etat;
  const code = codeParrainage(client);
  const lien = `https://locweb.fr/?parrain=${encodeURIComponent(code)}`;

  vider(page);
  page.append(h('h1', 'Parrainage'),
    h('p.sous-titre', `Vous connaissez un artisan sans site ? ${AVANTAGE[0].toUpperCase()}${AVANTAGE.slice(1)} pour lui, ${AVANTAGE} pour vous.`));

  /* ---------- comment ca marche ---------- */

  const etapes = [
    ['Vous envoyez votre lien', 'Par SMS, WhatsApp, ou de vive voix avec votre code.'],
    ['Il prend un abonnement', "On lui offre son premier mois, sans qu'il ait rien à demander."],
    ['Vous êtes crédité', `${AVANTAGE[0].toUpperCase()}${AVANTAGE.slice(1)} déduit de votre prochaine facture.`],
  ];
  const methode = h('div.methode');
  etapes.forEach(([titre, texte], i) => {
    methode.append(h('div.methode-etape',
      h('span.methode-num', String(i + 1)),
      h('b', titre),
      h('p', texte)));
  });

  page.append(h('div.section',
    h('div.section-tete', h('h2', 'Comment ça marche')),
    h('div.section-corps', { style: { paddingTop: '18px' } }, methode)));

  /* ---------- le code et le lien ---------- */

  const message = `Salut, je passe par LocWeb pour mon site internet (${client.domaine || 'locweb.fr'}). Avec mon code ${code} ton premier mois est offert : ${lien}`;

  async function copier(texte, quoi) {
    try {
      await navigator.clipboard.writeText(texte);
      souffler(`${quoi} copie.`, 'bien');
    } catch {
      souffler('Copie impossible — sélectionnez le texte à la main.', 'alerte');
    }
  }

  page.append(h('div.section',
    h('div.section-tete', h('h2', 'Votre lien de parrainage')),
    h('div.section-corps', { style: { paddingTop: '18px' } },
      h('div.parrain-code',
        h('span.parrain-etiq', 'Votre code'),
        h('b.parrain-val', code),
        h('button.bt.bt-plein.bt-mini', { onclick: () => copier(code, 'Code') }, 'Copier')),
      h('div.parrain-lien',
        h('input', { type: 'text', value: lien, readonly: true, onclick: (e) => e.target.select() }),
        h('button.bt.bt-vif', { onclick: () => copier(lien, 'Lien') }, 'Copier le lien')),
      h('div', { style: { display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' } },
        h('a.bt.bt-plein', {
          href: `https://wa.me/?text=${encodeURIComponent(message)}`,
          target: '_blank', rel: 'noopener noreferrer',
        }, 'Envoyer par WhatsApp'),
        h('a.bt.bt-plein', {
          href: `sms:?&body=${encodeURIComponent(message)}`,
        }, 'Envoyer par SMS'),
        h('button.bt.bt-nu', { onclick: () => copier(message, 'Message') }, 'Copier le message')))));

  /* ---------- suivi ---------- */

  const suivi = h('div.section',
    h('div.section-tete', h('h2', 'Vos parrainages')),
    h('div.section-corps', { style: { paddingTop: '16px' } }, h('div.squelette')));
  page.append(suivi);

  const corpsSuivi = suivi.querySelector('.section-corps');
  try {
    const { data, error } = await D.sb
      .from('parrainages')
      .select('id, filleul_nom, statut, date_creation, date_validation')
      .eq('parrain_client_id', client.id)
      .order('date_creation', { ascending: false });
    if (error) throw error;

    vider(corpsSuivi);
    if (!data.length) {
      corpsSuivi.append(h('p.aide',
        "Personne n'a encore utilisé votre code. Le premier apparaîtra ici dès qu'il aura signé."));
    } else {
      const valides = data.filter((p) => p.statut === 'valide').length;
      corpsSuivi.append(h('div.synthese',
        h('div.mesure', h('p.val', String(data.length)), h('p.etiq', 'Personnes parrainées')),
        h('div.mesure', h('p.val', String(valides)), h('p.etiq', 'Mois offerts'))));
      const table = h('div.liste-carte', { style: { marginTop: '18px', marginBottom: '0' } });
      data.forEach((p) => {
        table.append(h('div.ligne-liste',
          h('span.principal',
            h('strong', p.filleul_nom || 'Un artisan'),
            h('span', dateLongue(p.date_creation))),
          h('span.etat', { 'data-ton': p.statut === 'valide' ? 'bien' : 'veille' },
            p.statut === 'valide' ? 'Mois offert' : 'En attente de signature')));
      });
      corpsSuivi.append(table);
    }
  } catch {
    // Table absente : on ne bluffe pas un compteur.
    vider(corpsSuivi);
    corpsSuivi.append(h('p.aide',
      "Le suivi automatique de vos parrainages arrive bientôt. En attendant, donnez votre code : on applique le mois offert à la main dès qu'un filleul signe."));
  }
}
