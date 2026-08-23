// ===================================================================
//  Progression — le module de completion du compte.
//
//  Principe : ne jamais afficher un pourcentage sans dire ce qui
//  manque. Un score seul culpabilise sans aider ; une liste de taches
//  cliquables transforme le score en chemin. Chaque tache pointe vers
//  l'endroit exact ou on la resout.
//
//  La source de verite des champs est ici, partagee entre "Mes infos"
//  (qui les affiche en formulaire) et l'accueil (qui affiche le reste
//  a faire). Ajouter un champ a un seul endroit suffit.
// ===================================================================

import { h } from './outils.js';

export const champsProfil = {
  contact: [
    { cle: 'contact_prenom',    libelle: 'Prénom',    type: 'text',  indice: '' },
    { cle: 'contact_nom',       libelle: 'Nom',       type: 'text',  indice: '' },
    { cle: 'contact_email',     libelle: 'E-mail',    type: 'email', indice: 'vous@exemple.fr' },
    { cle: 'contact_telephone', libelle: 'Téléphone', type: 'tel',   indice: '06 12 34 56 78' },
  ],
  activite: [
    { cle: 'metier',            libelle: 'Votre métier',        type: 'text', indice: 'Plombier, coiffeur, restaurateur...' },
    { cle: 'zone_intervention', libelle: "Zone d'intervention", type: 'text', indice: 'Béziers et 20 km autour' },
    { cle: 'ville',             libelle: 'Ville',               type: 'text', indice: 'Béziers' },
  ],
};

// Chaque etape vaut le meme poids : hierarchiser les points ferait
// croire qu'une tache est facultative alors qu'aucune ne l'est.
const ETAPES = [
  {
    id: 'contact',
    titre: 'Vos coordonnées',
    pourquoi: 'Pour vous joindre si votre site a un souci.',
    ou: '#/mes-infos',
    fait: (p) => Boolean(p.contact_telephone && (p.contact_prenom || p.contact_nom)),
  },
  {
    id: 'activite',
    titre: 'Votre métier et votre zone',
    pourquoi: 'Sert à cibler vos campagnes et à rédiger vos textes.',
    ou: '#/mes-infos',
    fait: (p) => Boolean(p.metier && p.zone_intervention),
  },
  {
    id: 'google',
    titre: 'Connecter Google',
    pourquoi: 'Sans ça, aucune statistique de visite ne peut s\'afficher.',
    ou: '#/parametrage',
    fait: (p) => Boolean(p.acces_ga4 || p.acces_google_business),
  },
  {
    id: 'reseaux',
    titre: 'Vos réseaux sociaux',
    pourquoi: 'Ils apparaissent en pied de page de votre site.',
    ou: '#/mes-infos',
    fait: (p) => Object.values(p.reseaux || {}).some(Boolean),
  },
  {
    id: 'site',
    titre: 'Publier votre site',
    pourquoi: 'Votre première publication met vos textes en ligne.',
    ou: '#/mon-site',
    fait: (p, c) => Boolean(c?.derniere_publication || c?.domaine),
  },
];

/** Retourne { faites, total, pourcent, reste: [etape] }. */
export function completion(profil = {}, client = {}) {
  const reste = ETAPES.filter((e) => !e.fait(profil, client));
  const faites = ETAPES.length - reste.length;
  return {
    faites,
    total: ETAPES.length,
    pourcent: Math.round((faites / ETAPES.length) * 100),
    reste,
  };
}

/** Anneau de progression en SVG. */
function anneau(pourcent, taille = 62) {
  const r = (taille - 8) / 2;
  const circonference = 2 * Math.PI * r;
  const c = taille / 2;
  return h('svg.prog-anneau', {
    viewBox: `0 0 ${taille} ${taille}`, width: taille, height: taille,
    html: `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--trait)" stroke-width="6"/>
      <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--accent)" stroke-width="6"
        stroke-linecap="round" stroke-dasharray="${circonference}"
        stroke-dashoffset="${circonference * (1 - pourcent / 100)}"
        transform="rotate(-90 ${c} ${c})"/>
      <text x="${c}" y="${c}" text-anchor="middle" dominant-baseline="central"
        font-size="15" font-weight="700" fill="var(--encre)">${pourcent}%</text>`,
  });
}

/**
 * Bloc complet : anneau + liste des etapes restantes.
 * Une fois tout fait, on affiche un etat de reussite plutot que de
 * masquer le bloc — disparaitre donnerait l'impression d'un bug.
 */
export function barreCompletion(profil, client, { compact = false } = {}) {
  const { faites, total, pourcent, reste } = completion(profil, client);

  if (!reste.length) {
    return h('div.section.prog-bloc',
      h('div.prog-tete',
        anneau(100),
        h('div',
          h('p.prog-titre', 'Votre compte est complet'),
          h('p.prog-sous', 'Tout est en place. Vos statistiques et vos campagnes sont pilotables.'))));
  }

  const liste = h('div.prog-liste');
  (compact ? reste.slice(0, 3) : reste).forEach((e) => {
    liste.append(h('a.prog-tache', { href: e.ou },
      h('span.prog-case'),
      h('span.prog-texte', h('b', e.titre), h('span', e.pourquoi)),
      h('span.prog-fleche', '→')));
  });

  return h('div.section.prog-bloc',
    h('div.prog-tete',
      anneau(pourcent),
      h('div',
        h('p.prog-titre', 'Terminer la configuration'),
        h('p.prog-sous', `${faites} étape${faites > 1 ? 's' : ''} sur ${total}. Il reste ${reste.length} chose${reste.length > 1 ? 's' : ''} à faire.`))),
    liste);
}
