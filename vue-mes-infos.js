// ===================================================================
//  Mes infos — l'identite du client : qui joindre, ou il travaille,
//  quels reseaux il anime, quelle formule il paie.
//
//  Le technique (comptes Google, pixels) vit dans vue-parametrage.js,
//  atteint par l'icone reglages de l'entete : ces deux pages n'ont ni
//  la meme frequence d'usage ni le meme public.
// ===================================================================

import { h, vider, differer, souffler } from './outils.js';
import * as D from './donnees.js';
import { barreCompletion, champsProfil, completion } from './completion.js';

export async function rendre(page, etat) {
  const { client } = etat;
  const profil = etat.profil || {};

  vider(page);
  page.append(h('h1', 'Mes infos'),
    h('p.sous-titre', 'Vos coordonnées et celles de votre activité.'));

  /* ---------- progression ----------

     Un profil a moitie rempli n'est pas un detail cosmetique : sans
     telephone on ne peut pas prevenir le client quand son site tombe,
     sans zone d'intervention une campagne cible mal. La barre dit
     exactement ce qui manque plutot que d'afficher un pourcentage. */

  const zoneProgression = h('div');
  const redessinerProgression = () => {
    vider(zoneProgression);
    zoneProgression.append(barreCompletion(profil, client));
  };
  redessinerProgression();
  page.append(zoneProgression);

  /* ---------- les champs ---------- */

  function groupe(titre, aide, champs) {
    const grille = h('div.onb-grille');
    champs.forEach(({ cle, libelle, type, indice, options }) => {
      // Un secteur est une liste fermee : une liste deroulante evite les
      // fautes de frappe qui rendraient le champ inexploitable ensuite.
      const saisie = type === 'choix'
        ? h('select', { value: profil[cle] || '' },
            h('option', { value: '' }, 'Non renseigné'),
            ...options.map((o) => h('option', { value: o.valeur }, o.libelle)))
        : h('input', { type, value: profil[cle] || '', placeholder: indice || '' });
      if (type === 'choix') saisie.value = profil[cle] || '';

      saisie.addEventListener(type === 'choix' ? 'change' : 'input', differer(async () => {
        const valeur = saisie.value.trim() || null;
        const { ok } = await D.majProfilTolerant(client.id, { [cle]: valeur });
        if (!ok) { souffler('Enregistrement impossible.', 'alerte'); return; }
        profil[cle] = valeur;
        etat.profil = profil;
        redessinerProgression();
        souffler('Enregistre.', 'bien');
      }));
      grille.append(h('label.champ', { style: { margin: '0' } }, h('span', libelle), saisie));
    });
    return h('div.section',
      h('div.section-tete', h('h2', titre), aide ? h('p', aide) : null),
      h('div.section-corps', { style: { paddingTop: '14px' } }, grille));
  }

  page.append(groupe('Qui contacter', 'En cas de problème sur votre site, ou pour valider une campagne.',
    champsProfil.contact));

  page.append(groupe('Mon activité', 'Ce qui sert à cibler vos campagnes et à rédiger vos textes.',
    champsProfil.activite));

  /* ---------- reseaux ---------- */

  const reseaux = { ...(profil.reseaux || {}) };
  const grilleReseaux = h('div.onb-grille');
  [
    { cle: 'facebook', libelle: 'Facebook', indice: 'Lien de votre page' },
    { cle: 'instagram', libelle: 'Instagram', indice: '@votrecompte' },
    { cle: 'tiktok', libelle: 'TikTok', indice: '@votrecompte' },
    { cle: 'linkedin', libelle: 'LinkedIn', indice: 'Lien de votre page' },
  ].forEach(({ cle, libelle, indice }) => {
    const saisie = h('input', { type: 'text', value: reseaux[cle] || '', placeholder: indice });
    saisie.addEventListener('input', differer(async () => {
      reseaux[cle] = saisie.value.trim() || null;
      const { ok } = await D.majProfilTolerant(client.id, { reseaux });
      if (!ok) { souffler('Enregistrement impossible.', 'alerte'); return; }
      profil.reseaux = reseaux;
      etat.profil = profil;
      redessinerProgression();
      souffler('Enregistre.', 'bien');
    }));
    grilleReseaux.append(h('label.champ', { style: { margin: '0' } }, h('span', libelle), saisie));
  });

  page.append(h('div.section',
    h('div.section-tete', h('h2', 'Mes réseaux'),
      h('p', 'Ils apparaissent dans le pied de page de votre site.')),
    h('div.section-corps', { style: { paddingTop: '14px' } }, grilleReseaux)));

  /* ---------- mon abonnement ---------- */

  const formule = client.formule || 'vitrine';
  const PRIX = { vitrine: 49, ecommerce: 79 };
  page.append(h('div.section',
    h('div.section-tete', h('h2', 'Mon abonnement')),
    h('div.section-corps', { style: { paddingTop: '14px' } },
      h('div.synthese',
        h('div.mesure', h('p.val', formule === 'ecommerce' ? 'E-commerce' : 'Vitrine'),
          h('p.etiq', 'Votre formule')),
        h('div.mesure', h('p.val', `${PRIX[formule] || 49} EUR`),
          h('p.etiq', 'Par mois, tout compris'))),
      h('p.aide', { style: { marginTop: '14px' } },
        'Hébergement, nom de domaine, éditeur de contenu, support direct et mises à jour sont inclus. Pour changer de formule, écrivez-nous depuis la page Aide.'))));

  /* ---------- compte ---------- */

  const { data: { user } } = await D.sb.auth.getUser();
  page.append(h('div.section',
    h('div.section-tete', h('h2', 'Mon compte')),
    h('div.section-corps', { style: { paddingTop: '14px' } },
      h('p.aide', 'Connecté avec ', h('b', user?.email || '—'), '.'),
      h('div', { style: { display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' } },
        h('button.bt.bt-plein', {
          onclick: async (e) => {
            e.target.disabled = true;
            await D.motDePasseOublie(user.email);
            e.target.disabled = false;
            souffler('E-mail de changement de mot de passe envoyé.', 'bien');
          },
        }, 'Changer mon mot de passe'),
        h('button.bt.bt-nu', {
          onclick: () => { D.deconnexion().then(() => location.reload()); },
        }, 'Se déconnecter')))));
}

export { completion };
