// ===================================================================
//  Rapports — le bilan que Nico envoyait a la main.
//
//  Un rapport n'est pas un tableau de chiffres de plus : c'est une
//  phrase qui dit si le mois a ete bon, pourquoi, et quoi faire. Les
//  chiffres viennent apres, pour justifier la phrase.
//
//  Regle d'honnetete tenue partout ici : quand une donnee manque
//  (Google pas connecte, periode trop jeune), on le dit et on n'invente
//  pas de comparaison. Un rapport qui bluffe se retourne contre nous
//  au premier client qui verifie.
// ===================================================================

import { h, vider, nombre, EXPLICATIONS, avecAide, grapheComplet, exporterCsv } from './outils.js';
import * as D from './donnees.js';

const PERIODES = [
  { cle: 'semaine', libelle: 'Cette semaine', jours: 7, ga4: '7j' },
  { cle: 'mois', libelle: 'Ce mois-ci', jours: 30, ga4: '30j' },
  { cle: 'trimestre', libelle: '3 derniers mois', jours: 90, ga4: '90j' },
];

export async function rendre(page, etat, { charger } = {}) {
  const { client, profil } = etat;

  vider(page);
  page.append(h('h1', 'Rapports'),
    h('p.sous-titre', "Le bilan de votre présence en ligne, prêt à lire."));

  let periode = 'mois';

  const onglets = h('div.onglets');
  PERIODES.forEach((p) => {
    onglets.append(h('button.onglet', {
      class: p.cle === periode ? 'onglet actif' : 'onglet',
      onclick: () => {
        if (p.cle === periode) return;
        periode = p.cle;
        [...onglets.children].forEach((b, i) => b.classList.toggle('actif', PERIODES[i].cle === periode));
        dessiner();
      },
    }, p.libelle));
  });
  page.append(onglets);

  const corps = h('div');
  page.append(corps);

  async function dessiner() {
    vider(corps);
    corps.append(h('div.squelette'), h('div.squelette'));

    const def = PERIODES.find((p) => p.cle === periode);
    const [stats, demandes] = await Promise.all([
      D.statsGa4(def.ga4).catch(() => null),
      (charger ? charger('demandes', () => D.listerDemandes(client.id)) : D.listerDemandes(client.id)).catch(() => []),
    ]);

    const depuisDate = Date.now() - def.jours * 86400000;
    const precedentDebut = depuisDate - def.jours * 86400000;
    const dansPeriode = demandes.filter((d) => new Date(d.date_creation).getTime() >= depuisDate);
    const avant = demandes.filter((d) => {
      const t = new Date(d.date_creation).getTime();
      return t >= precedentDebut && t < depuisDate;
    });

    vider(corps);
    corps.append(synthese(def, stats, dansPeriode, avant, profil));
    corps.append(chiffres(def, stats, dansPeriode, avant));
    if ((stats?.series || []).length > 1) corps.append(courbe(stats));
    corps.append(actions(stats, dansPeriode, profil));
    corps.append(telechargement(def, stats, dansPeriode));
  }

  await dessiner();
}

/* ---------- la phrase de synthese ---------- */

/** Une variation GA4 arrive en pourcentage decimal ; on l'arrondit. */
function arrondi(v) {
  return (v === null || v === undefined || !Number.isFinite(v)) ? null : Math.round(v);
}

function evolution(actuel, precedent) {
  if (!precedent) return null;
  return Math.round(((actuel - precedent) / precedent) * 100);
}

function synthese(def, stats, dansPeriode, avant, profil) {
  const nbDemandes = dansPeriode.length;
  const ecart = evolution(nbDemandes, avant.length);

  let phrase;
  let ton = 'neutre';
  if (!stats && !nbDemandes) {
    phrase = "Pas encore assez de données pour tirer un bilan. Reliez Google dans Paramétrage pour suivre vos visites.";
  } else if (!nbDemandes) {
    phrase = `Aucune demande reçue sur cette période. Vos visiteurs viennent, mais ne passent pas à l'acte : vérifiez que votre téléphone est bien visible sur le site.`;
    ton = 'veille';
  } else if (ecart === null) {
    phrase = `${nbDemandes} demande${nbDemandes > 1 ? 's' : ''} reçue${nbDemandes > 1 ? 's' : ''}. C'est votre premiere periode mesuree : elle servira de reference pour la suite.`;
    ton = 'bien';
  } else if (ecart >= 10) {
    phrase = `${nbDemandes} demande${nbDemandes > 1 ? 's' : ''} reçue${nbDemandes > 1 ? 's' : ''}, soit ${ecart}% de plus que la période précédente. Ce qui est en place fonctionne : ne changez rien pour l'instant.`;
    ton = 'bien';
  } else if (ecart <= -10) {
    phrase = `${nbDemandes} demande${nbDemandes > 1 ? 's' : ''} reçue${nbDemandes > 1 ? 's' : ''}, soit ${Math.abs(ecart)}% de moins que la période précédente. Une baisse peut être saisonnière — regardez la courbe plus bas avant de conclure.`;
    ton = 'alerte';
  } else {
    phrase = `${nbDemandes} demande${nbDemandes > 1 ? 's' : ''} reçue${nbDemandes > 1 ? 's' : ''}, stable par rapport a la periode precedente.`;
    ton = 'bien';
  }

  return h('div.section.rapport-tete',
    h('div.section-corps', { style: { paddingTop: '18px', paddingBottom: '18px' } },
      h('span.etat', { 'data-ton': ton }, def.libelle),
      h('p.rapport-phrase', phrase),
      !profil?.acces_ga4
        ? h('p.aide', { style: { marginTop: '10px' } },
            "Vos statistiques de visite ne sont pas connectées : ce bilan ne repose que sur vos demandes reçues.")
        : null));
}

/* ---------- les chiffres ---------- */

function mesure(valeur, etiquette, ecart, aide) {
  const bloc = h('div.mesure',
    h('p.val', valeur),
    h('p.etiq', etiquette),
    ecart === null || ecart === undefined
      ? null
      : h('p.ecart', { 'data-sens': ecart >= 0 ? 'haut' : 'bas' },
          `${ecart >= 0 ? '+' : ''}${ecart}%`));
  return aide ? avecAide(bloc, aide) : bloc;
}

function chiffres(def, stats, dansPeriode, avant) {
  const grille = h('div.synthese');

  grille.append(mesure(nombre(dansPeriode.length), 'Demandes reçues',
    evolution(dansPeriode.length, avant.length),
    'Le nombre de formulaires remplis sur votre site pendant la période.'));

  if (stats) {
    const t = stats.totaux || {};
    const v = stats.variations || {};
    grille.append(mesure(nombre(t.visiteurs ?? 0), 'Visiteurs',
      arrondi(v.visiteurs), EXPLICATIONS.visiteurs));
    grille.append(mesure(nombre(t.pages_vues ?? 0), 'Pages vues',
      arrondi(v.pages_vues), EXPLICATIONS.pages_vues));

    const taux = t.visiteurs
      ? Math.round((dansPeriode.length / t.visiteurs) * 1000) / 10
      : null;
    grille.append(mesure(taux === null ? '—' : `${taux}%`, 'Taux de contact', null,
      'La part de vos visiteurs qui vous ont écrit. Entre 1 % et 5 %, vous êtes dans la norme des sites d\'artisans.'));
  }

  return h('div.section',
    h('div.section-tete', h('h2', 'Les chiffres')),
    h('div.section-corps', { style: { paddingTop: '16px' } }, grille));
}

function courbe(stats) {
  return h('div.section',
    h('div.section-tete', h('h2', 'Évolution des visites')),
    h('div.section-corps', { style: { paddingTop: '16px' } },
      grapheComplet(stats.series.map((p) => p.visiteurs), stats.series.map((p) => p.date))));
}

/* ---------- ce qu'il faut faire ---------- */

// Chaque conseil est declenche par une condition mesuree, jamais
// affiche par defaut : un conseil generique decredibilise les autres.
function actions(stats, dansPeriode, profil) {
  const conseils = [];

  if (!profil?.acces_ga4) {
    conseils.push(['Connectez Google Analytics', 'Sans ça, impossible de savoir combien de personnes visitent votre site.', '#/parametrage']);
  }
  if (!profil?.acces_google_business) {
    conseils.push(['Connectez votre fiche Google Business', 'La majorité des appels d\'artisans viennent de la fiche, pas du site.', '#/parametrage']);
  }
  if (stats && (stats.totaux?.visiteurs ?? 0) > 50 && dansPeriode.length === 0) {
    conseils.push(['Rendez votre téléphone plus visible', 'Vous avez des visiteurs mais aucune demande : le bouton d\'appel est peut-être trop bas dans la page.', '#/mon-site']);
  }
  if (dansPeriode.some((d) => (d.statut || 'nouvelle') === 'nouvelle')) {
    const n = dansPeriode.filter((d) => (d.statut || 'nouvelle') === 'nouvelle').length;
    conseils.push([`${n} demande${n > 1 ? 's' : ''} sans réponse`, 'Un devis rappelé dans l\'heure a beaucoup plus de chances d\'aboutir.', '#/activite']);
  }
  if (stats && (stats.totaux?.visiteurs ?? 0) < 30) {
    conseils.push(['Votre site est peu visité', 'Une campagne locale ciblée sur votre zone peut amorcer le trafic.', '#/acquisition']);
  }

  if (!conseils.length) {
    return h('div.section',
      h('div.section-tete', h('h2', 'À faire')),
      h('div.section-corps', { style: { paddingTop: '14px' } },
        h('p.aide', 'Rien de particulier à corriger sur cette période.')));
  }

  const liste = h('div.prog-liste');
  conseils.slice(0, 4).forEach(([titre, pourquoi, lien]) => {
    liste.append(h('a.prog-tache', { href: lien },
      h('span.prog-case'),
      h('span.prog-texte', h('b', titre), h('span', pourquoi)),
      h('span.prog-fleche', '→')));
  });

  return h('div.section',
    h('div.section-tete', h('h2', 'À faire'), h('p', 'Déduit de vos chiffres, pas de conseils génériques.')),
    liste);
}

/* ---------- sortie ---------- */

function telechargement(def, stats, dansPeriode) {
  return h('div.section',
    h('div.section-corps', { style: { paddingTop: '16px' } },
      h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap' } },
        h('button.bt.bt-plein', {
          onclick: () => {
            exporterCsv(`rapport-${def.cle}`,
              ['Indicateur', 'Valeur'],
              [
                ['Période', def.libelle],
                ['Demandes reçues', dansPeriode.length],
                ['Visiteurs', stats?.totaux?.visiteurs ?? 'non connecte'],
                ['Pages vues', stats?.totaux?.pages_vues ?? 'non connecte'],
                ["Taux d'engagement", stats?.totaux?.taux_engagement ?? 'non connecte'],
              ]);
          },
        }, 'Télécharger en tableur'),
        h('button.bt.bt-nu', { onclick: () => window.print() }, 'Imprimer ou enregistrer en PDF'))));
}
