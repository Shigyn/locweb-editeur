// ===================================================================
//  Rapport mensuel.
//
//  Un mois civil termine, pas une fenetre glissante : le client parle
//  de « juillet », et juillet ne bouge plus une fois passe. Les
//  chiffres d'un rapport ouvert deux fois doivent etre identiques.
//
//  Ce que le rapport met en avant, dans cet ordre : les appels recus
//  depuis le site, puis les demandes, puis les visiteurs. C'est
//  l'inverse de l'ordre habituel d'un outil de statistiques, et c'est
//  voulu : sur le site d'un artisan, l'action qui compte est l'appui
//  sur le numero de telephone. Un visiteur ne paie pas les factures.
//
//  Regle de ton, non negociable : le rapport ne denigre jamais le
//  travail en place. Une baisse s'ecrit comme un fait, avec son
//  contexte ; jamais comme un reproche, et jamais suivie d'un « il
//  faudrait refaire ». Le conseil de fin est toujours une action a la
//  portee du client ce mois-ci, pas un devis deguise.
// ===================================================================

import { h, vider, nombre, sectionPliable } from './outils.js';
import * as D from './donnees.js';

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** Les douze derniers mois TERMINES, le plus recent d'abord. */
function moisDisponibles(depuisIso) {
  const maintenant = new Date();
  // On part du mois precedent : le mois en cours n'est pas fini, et un
  // rapport partiel se comparerait mal a un mois complet.
  let curseur = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth() - 1, 1));
  const debut = depuisIso ? new Date(depuisIso) : null;

  const liste = [];
  for (let i = 0; i < 12; i += 1) {
    // Avant l'arrivee du client, il n'y a rien a raconter.
    if (debut && curseur < new Date(Date.UTC(debut.getUTCFullYear(), debut.getUTCMonth(), 1))) break;
    liste.push({ annee: curseur.getUTCFullYear(), mois: curseur.getUTCMonth() + 1 });
    curseur = new Date(Date.UTC(curseur.getUTCFullYear(), curseur.getUTCMonth() - 1, 1));
  }
  return liste;
}

const nomDuMois = ({ annee, mois }) => `${MOIS[mois - 1]} ${annee}`;

/** Combien de fois cet evenement a-t-il ete declenche ? */
function contact(rep, cle) {
  return Number((rep?.contacts || []).find((c) => c.cle === cle)?.valeur || 0);
}

/* ---------- l'analyse ----------

   Ecrite a partir de regles, pas d'une intelligence artificielle : le
   client doit pouvoir relire le meme rapport dans six mois et y
   retrouver mot pour mot ce qu'on lui a dit. */

export function analyser({ totaux, variations, repartitions, demandes }) {
  const phrases = [];
  const appels = contact(repartitions, 'appel_telephone');
  const itineraires = contact(repartitions, 'clic_itineraire');
  const visiteurs = Number(totaux?.visiteurs || 0);

  /* 1. Ce qui s'est reellement passe. */

  if (appels > 0) {
    phrases.push(appels === 1
      ? 'Une personne a appelé directement depuis votre site.'
      : `${nombre(appels)} personnes ont appelé directement depuis votre site.`);
  }
  if (demandes > 0) {
    phrases.push(demandes === 1
      ? 'Vous avez reçu une demande par le formulaire.'
      : `Vous avez reçu ${nombre(demandes)} demandes par le formulaire.`);
  }
  if (itineraires > 0) {
    phrases.push(`${nombre(itineraires)} ${itineraires === 1 ? 'personne a demandé' : 'personnes ont demandé'} l'itinéraire pour venir.`);
  }
  if (!appels && !demandes && !itineraires && visiteurs > 0) {
    phrases.push(`${nombre(visiteurs)} ${visiteurs === 1 ? 'personne est venue' : 'personnes sont venues'} sur votre site ce mois-ci.`);
  }

  /* 2. Une variation, mais seulement si elle veut dire quelque chose.

     En dessous de dix visiteurs, un ecart de 40 % represente quatre
     personnes : l'annoncer comme une tendance serait faux. */

  const v = variations?.visiteurs;
  if (v !== null && v !== undefined && visiteurs >= 10) {
    const ecart = Math.round(Math.abs(v));
    if (ecart >= 15) {
      phrases.push(v > 0
        ? `La fréquentation est en hausse de ${ecart} % par rapport au mois précédent.`
        : `La fréquentation est en retrait de ${ecart} % par rapport au mois précédent — les mois se comparent mal entre eux quand l'activité est saisonnière.`);
    } else {
      phrases.push('La fréquentation est stable par rapport au mois précédent.');
    }
  }

  /* 3. Un fait utile, tire des repartitions. Un seul : trois
        observations d'affilee ne se retiennent pas. */

  const ville = (repartitions?.villes || [])[0];
  const jour = (repartitions?.jours_semaine || [])[0];
  const mobile = (repartitions?.appareils || []).find((a) => /mobile/i.test(a.cle));
  const partMobile = mobile && visiteurs ? Math.round((Number(mobile.valeur) / visiteurs) * 100) : null;

  if (partMobile !== null && partMobile >= 60) {
    phrases.push(`${partMobile} % de vos visiteurs sont sur téléphone.`);
  } else if (ville?.cle && ville.cle !== '(not set)') {
    phrases.push(`La plupart viennent de ${ville.cle}.`);
  } else if (jour?.cle) {
    phrases.push(`Votre meilleur jour est le ${String(jour.cle).toLowerCase()}.`);
  }

  return phrases;
}

/* ---------- le conseil ----------

   Un seul, choisi par ordre de priorite. Toujours une action que le
   client peut mener lui-meme ce mois-ci — jamais « votre site
   mériterait ». */

export function conseiller({ totaux, repartitions, demandes }) {
  const visiteurs = Number(totaux?.visiteurs || 0);
  const appels = contact(repartitions, 'appel_telephone');
  const mobile = (repartitions?.appareils || []).find((a) => /mobile/i.test(a.cle));
  const partMobile = mobile && visiteurs ? (Number(mobile.valeur) / visiteurs) * 100 : 0;
  const sources = repartitions?.sources || [];
  const recherche = sources.find((s) => /organic|recherche/i.test(s.cle));
  const partRecherche = recherche && visiteurs ? (Number(recherche.valeur) / visiteurs) * 100 : 0;

  if (visiteurs < 30) {
    return {
      titre: 'Faites connaître votre adresse',
      texte: "Le site est en ligne et fonctionne, il lui manque surtout d'être vu. "
        + "Mettez l'adresse sur vos devis, vos factures, votre véhicule et votre signature d'e-mail : "
        + "ce sont les endroits où vos clients la liront sans que ça vous coûte quoi que ce soit.",
    };
  }

  if (appels === 0 && visiteurs >= 30) {
    return {
      titre: 'Le téléphone, en haut et en gros',
      texte: 'Des visiteurs viennent, mais aucun n\'a appuyé sur le numéro ce mois-ci. '
        + "Le plus souvent il s'agit d'un numéro qu'on doit chercher : s'il apparaît dès le premier écran, "
        + "en bouton plutôt qu'en texte, l'écart se voit vite. Dites-le-nous, on le remonte.",
    };
  }

  if (partMobile >= 70) {
    return {
      titre: 'Vos clients vous lisent au téléphone',
      texte: `${Math.round(partMobile)} % de vos visiteurs sont sur mobile, souvent debout et pressés. `
        + "Ouvrez votre site sur votre propre téléphone et vérifiez qu'on peut vous appeler d'un seul pouce, "
        + 'sans faire défiler. C\'est le test le plus utile que vous puissiez faire vous-même.',
    };
  }

  if (partRecherche < 30 && visiteurs >= 30) {
    return {
      titre: 'Demandez un avis Google',
      texte: 'Vos visiteurs vous connaissent déjà : peu arrivent par une recherche. '
        + 'Les avis sont ce qui fait remonter une fiche dans les résultats locaux, et le moment '
        + "le plus efficace pour en demander un est la fin d'un chantier, sur place, "
        + 'quand le client est content.',
    };
  }

  if (demandes === 0 && appels > 0) {
    return {
      titre: 'Le téléphone marche, le formulaire moins',
      texte: 'On vous appelle, c\'est le principal. Le formulaire sert surtout le soir et le week-end, '
        + 'quand personne n\'ose déranger — quelques mots pour dire sous combien de temps vous répondez '
        + 'suffisent souvent à le débloquer.',
    };
  }

  return {
    titre: 'Continuez à demander des avis',
    texte: 'Le mois s\'est bien passé. Le geste qui rapporte le plus, et qui ne coûte rien, '
      + 'reste de demander un avis Google à chaque client satisfait : c\'est ce qui vous fait '
      + 'remonter dans les résultats du mois prochain.',
  };
}

/* ---------- rendu ---------- */

function carte(etiquette, valeur, variation) {
  const enfants = [
    h('p.rap-etiq', etiquette),
    h('p.rap-valeur', nombre(valeur)),
  ];
  if (variation !== null && variation !== undefined) {
    const e = Math.round(variation);
    enfants.push(h('p.rap-var', { 'data-sens': e > 0 ? 'haut' : e < 0 ? 'bas' : 'plat' },
      e > 0 ? `+${e} %` : `${e} %`));
  }
  return h('div.rap-carte', ...enfants);
}

export async function rendre(page, etat, { charger } = {}) {
  vider(page);
  page.append(h('h1.titre-page', 'Rapport mensuel'));

  const mois = moisDisponibles(etat.client?.cree_le);
  if (!mois.length) {
    page.append(h('p.vide', "Votre premier rapport paraîtra le mois prochain, une fois un mois complet écoulé."));
    return;
  }

  const choix = h('select.rap-choix',
    ...mois.map((m, i) => h('option', { value: String(i) }, nomDuMois(m))));

  const corps = h('div.rap-corps');
  page.append(h('div.rap-tete', h('label.rap-label', 'Mois', choix)), corps);

  async function dessiner() {
    const m = mois[Number(choix.value)];
    vider(corps);
    corps.append(h('p.vide', 'Chargement du rapport…'));

    let stats;
    try {
      stats = await D.statsGa4Mois(m.annee, m.mois);
    } catch (e) {
      vider(corps);
      // On dit ce qui manque plutot que « rapport indisponible » : le
      // client doit savoir si c'est a lui d'agir.
      const raison = e?.donnees?.code === 'ga4_property_manquant'
        ? "Vos statistiques ne sont pas encore reliées. Rendez-vous dans Mon compte, onglet Connexions."
        : "Les chiffres de ce mois n'ont pas pu être récupérés. Réessayez dans quelques minutes.";
      corps.append(h('p.vide', raison));
      return;
    }

    // Les demandes du mois : elles vivent chez nous, pas chez Google.
    let demandes = 0;
    try {
      const toutes = charger
        ? await charger('demandes', () => D.listerDemandes(etat.client.id))
        : await D.listerDemandes(etat.client.id);
      const prefixe = `${m.annee}-${String(m.mois).padStart(2, '0')}`;
      demandes = toutes.filter((d) => String(d.date_creation || '').startsWith(prefixe)).length;
    } catch { /* le rapport reste lisible sans ce chiffre */ }

    const { totaux, variations, repartitions } = stats;
    const appels = contact(repartitions, 'appel_telephone');
    const phrases = analyser({ totaux, variations, repartitions, demandes });
    const conseil = conseiller({ totaux, repartitions, demandes });

    vider(corps);
    corps.append(
      h('p.rap-mois', nomDuMois(m)),

      // L'ordre est deliberement inverse par rapport aux Statistiques :
      // les appels d'abord, les visiteurs en dernier.
      h('div.rap-cartes',
        carte('Appels depuis le site', appels),
        carte('Demandes reçues', demandes),
        carte('Visiteurs', totaux?.visiteurs || 0, variations?.visiteurs)),

      h('div.rap-bloc',
        h('h2.rap-titre', 'Ce que dit ce mois'),
        ...phrases.map((p) => h('p.rap-phrase', p))),

      h('div.rap-bloc.rap-conseil',
        h('h2.rap-titre', conseil.titre),
        h('p.rap-phrase', conseil.texte)),
    );

    // Le detail existe pour qui veut verifier, mais ferme : le rapport
    // doit tenir en un ecran, sinon il ne sera pas lu.
    const { bloc, corps: dedans } = sectionPliable({
      titre: 'Le détail des chiffres',
      resume: 'Pages vues, visites, contacts',
    });
    const dl = h('dl.rap-detail');
    const ligne = (k, val) => dl.append(h('dt', k), h('dd', val));
    ligne('Pages vues', nombre(totaux?.pages_vues || 0));
    ligne('Visites', nombre(totaux?.sessions || 0));
    for (const [nom, cle] of [['Itinéraires demandés', 'clic_itineraire'],
      ['Clics e-mail', 'clic_email'], ['WhatsApp', 'clic_whatsapp']]) {
      const n = contact(repartitions, cle);
      if (n) ligne(nom, nombre(n));
    }
    dedans.append(dl);
    corps.append(bloc);
  }

  choix.addEventListener('change', dessiner);
  await dessiner();
}
