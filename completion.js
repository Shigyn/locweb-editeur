// ===================================================================
//  Ce qu'il reste a faire — source unique.
//
//  Avant, deux listes coexistaient : la progression du compte (etapes
//  de configuration) et les conseils des Rapports (deduits des
//  chiffres). Deux listes empilees sur le meme ecran, le client ne
//  savait plus laquelle regarder. Ici tout passe par une seule file,
//  classee par urgence reelle.
//
//  Regle : une action n'apparait que si une condition mesuree la
//  declenche. Pas de conseil generique — un seul suffit a decredibiliser
//  les autres.
// ===================================================================

import { h } from './outils.js';

export const champsProfil = {
  contact: [
    { cle: 'contact_prenom',    libelle: 'Prénom',    type: 'text' },
    { cle: 'contact_nom',       libelle: 'Nom',       type: 'text' },
    { cle: 'contact_email',     libelle: 'E-mail',    type: 'email' },
    { cle: 'contact_telephone', libelle: 'Téléphone', type: 'tel' },
  ],
  // Volontairement les MEMES colonnes que le questionnaire d'accueil
  // (vue-onboarding.js) : le client a ete prevenu qu'il pourrait
  // completer plus tard, il doit retrouver ses reponses, pas un second
  // jeu de champs vides a cote.
  activite: [
    { cle: 'secteur', libelle: 'Votre secteur', type: 'choix', options: [
      { valeur: 'artisan',      libelle: 'Artisan' },
      { valeur: 'independant',  libelle: 'Indépendant' },
      { valeur: 'restaurateur', libelle: 'Restaurateur' },
      { valeur: 'autre',        libelle: 'Autre' },
    ] },
    { cle: 'metier_precis',     libelle: 'Votre métier', type: 'text', indice: 'Plombier, coiffeur, restaurateur...' },
    { cle: 'localisation',      libelle: 'Votre ville',  type: 'text', indice: 'Nom de votre ville' },
    { cle: 'zone_intervention', libelle: 'Zone', type: 'choix', options: [
      { valeur: 'Sur place uniquement', libelle: 'Sur place uniquement' },
      { valeur: "Jusqu'à 5 km",  libelle: "Jusqu'à 5 km" },
      { valeur: "Jusqu'à 10 km", libelle: "Jusqu'à 10 km" },
      { valeur: "Jusqu'à 20 km", libelle: "Jusqu'à 20 km" },
      { valeur: "Jusqu'à 30 km", libelle: "Jusqu'à 30 km" },
      { valeur: "Jusqu'à 50 km", libelle: "Jusqu'à 50 km" },
      { valeur: 'Plus de 50 km', libelle: 'Plus de 50 km' },
      { valeur: 'Toute la France', libelle: 'Toute la France' },
    ] },
  ],
};

/* Etapes de configuration : elles servent au calcul du pourcentage.

   Uniquement ce que le client doit fournir lui-meme. La connexion
   Google n'y figure pas, volontairement : tous les clients ne la
   veulent pas, et certains ne prennent l'abonnement que pour
   l'editeur. Les compter ici bloquait ces clients-la a 60 % pour
   toujours — ce qui ne se lit pas comme une suggestion mais comme
   « votre installation est incomplete ».

   Elles restent proposees dans la liste `aFaire` ci-dessous, ou elles
   ont leur place : c'est un conseil, pas un reproche. */
const ETAPES = [
  { id: 'contact',  fait: (p) => Boolean(p.contact_telephone && (p.contact_prenom || p.contact_nom)) },
  { id: 'activite', fait: (p) => Boolean(p.metier_precis && p.zone_intervention) },
  { id: 'reseaux',  fait: (p) => Object.values(p.reseaux || {}).some(Boolean) },
];

/** Retourne { faites, total, pourcent, reste: [id] }. */
export function completion(profil = {}, client = {}) {
  const reste = ETAPES.filter((e) => !e.fait(profil, client)).map((e) => e.id);
  const faites = ETAPES.length - reste.length;
  return { faites, total: ETAPES.length, pourcent: Math.round((faites / ETAPES.length) * 100), reste };
}

/**
 * La file d'actions, de la plus urgente a la moins urgente.
 * `stats` et `demandes` sont facultatifs : sans eux, seules les etapes
 * de configuration remontent.
 */
export function aFaire(profil = {}, client = {}, { stats = null, demandes = [] } = {}) {
  const liste = [];
  const visiteurs = stats?.totaux?.visiteurs ?? null;
  const sansReponse = demandes.filter((d) => (d.statut || 'nouvelle') === 'nouvelle').length;

  // Un devis qui attend passe avant tout le reste : c'est le seul point
  // de la liste ou chaque heure coute de l'argent au client.
  if (sansReponse) {
    liste.push({
      titre: `${sansReponse} demande${sansReponse > 1 ? 's' : ''} sans réponse`,
      pourquoi: "Rappelé dans l'heure, un devis aboutit bien plus souvent.",
      ou: '#/demandes',
    });
  }
  if (!profil.acces_ga4) {
    liste.push({
      titre: 'Connecter Google Analytics',
      pourquoi: 'Sans ça, aucune statistique de visite ne peut s\'afficher.',
      ou: '#/compte?onglet=connexions',
    });
  }
  if (!profil.acces_google_business) {
    liste.push({
      titre: 'Connecter votre fiche Google',
      pourquoi: "La fiche amène souvent plus d'appels que le site lui-même.",
      ou: '#/compte?onglet=connexions',
    });
  }
  if (visiteurs !== null && visiteurs > 50 && !demandes.length) {
    liste.push({
      titre: 'Rendez votre téléphone plus visible',
      pourquoi: 'Des visiteurs viennent, mais aucun ne vous contacte.',
      ou: '#/mon-site',
    });
  }
  // Les avis sont le premier levier de referencement local, et le lien
  // se saisit une fois pour toutes. Tant qu'il manque, le QR de
  // l'accueil ne peut pas exister.
  if (!profil.lien_avis_google) {
    liste.push({
      titre: "Activer la demande d'avis",
      pourquoi: 'Les avis Google font remonter votre fiche dans le coin.',
      ou: '#/aide',
    });
  }
  if (!profil.contact_telephone) {
    liste.push({
      titre: 'Vos coordonnées',
      pourquoi: 'Pour vous joindre si votre site a un souci.',
      ou: '#/compte',
    });
  }
  if (!profil.metier_precis || !profil.zone_intervention) {
    liste.push({
      titre: 'Votre métier et votre zone',
      pourquoi: 'Sert à cibler vos campagnes.',
      ou: '#/compte',
    });
  }
  if (visiteurs !== null && visiteurs < 30) {
    liste.push({
      titre: 'Votre site est peu visité',
      pourquoi: 'Une campagne locale peut amorcer le trafic.',
      ou: '#/publicite',
    });
  }
  if (!Object.values(profil.reseaux || {}).some(Boolean)) {
    liste.push({
      titre: 'Vos réseaux sociaux',
      pourquoi: 'Ils apparaissent en pied de page de votre site.',
      ou: '#/compte',
    });
  }
  return liste;
}

/** Anneau de progression en SVG. */
function anneau(pourcent, taille = 52) {
  const r = (taille - 7) / 2;
  const circonference = 2 * Math.PI * r;
  const c = taille / 2;
  return h('svg.prog-anneau', {
    viewBox: `0 0 ${taille} ${taille}`, width: taille, height: taille,
    html: `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--trait)" stroke-width="5"/>
      <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--accent)" stroke-width="5"
        stroke-linecap="round" stroke-dasharray="${circonference}"
        stroke-dashoffset="${circonference * (1 - pourcent / 100)}"
        transform="rotate(-90 ${c} ${c})"/>
      <text x="${c}" y="${c}" text-anchor="middle" dominant-baseline="central"
        font-size="13" font-weight="700" fill="var(--encre)">${pourcent}%</text>`,
  });
}

/**
 * Le bloc "A faire". `limite` coupe la liste — l'accueil en montre
 * trois, une liste de huit lignes ne se lit pas, elle se subit.
 */
export function blocAFaire(profil, client, { stats, demandes, limite = 3 } = {}) {
  const liste = aFaire(profil, client, { stats, demandes });
  if (!liste.length) return null;

  const { pourcent } = completion(profil, client);
  const corps = h('div.prog-liste');
  liste.slice(0, limite).forEach((e) => {
    corps.append(h('a.prog-tache', { href: e.ou },
      h('span.prog-case'),
      h('span.prog-texte', h('b', e.titre), h('span', e.pourquoi)),
      h('span.prog-fleche', '→')));
  });

  const reste = liste.length - limite;
  return h('div.section.prog-bloc',
    h('div.prog-tete',
      anneau(pourcent),
      h('p.prog-titre', 'À faire')),
    corps,
    reste > 0 ? h('p.prog-reste', `+ ${reste} autre${reste > 1 ? 's' : ''}`) : null);
}
