// ===================================================================
//  Chantiers — les photos avant / apres.
//
//  Ce qu'un artisan a de plus convaincant, il l'a deja dans son
//  telephone. Une facade refaite, une salle de bain finie : ca vend
//  mieux que n'importe quel paragraphe, et il en prend tous les jours
//  sans que rien n'arrive jamais sur son site.
//
//  Tout est donc pense pour qu'il publie en partant du chantier, d'une
//  main, sans ouvrir un ordinateur :
//
//  - le bouton ouvre directement l'appareil photo sur telephone
//    (`capture`), au lieu d'un explorateur de fichiers ;
//  - la photo « avant » est facultative, parce qu'elle n'existe pas
//    toujours et qu'exiger la paire ferait tout abandonner ;
//  - le titre et la description aussi : un artisan qui doit rediger
//    avant de publier ne publie pas. Il pourra completer plus tard,
//    ou jamais ;
//  - la reduction se fait avant l'envoi, sinon rien ne part en 4G.
// ===================================================================

import { h, vider, souffler, certain } from './outils.js';
import * as D from './donnees.js';
import { envoyerPhoto } from './photos.js';

/** Un champ photo : vignette si remplie, bouton sinon. */
function champPhoto({ libelle, url, obligatoire = false, surChoix }) {
  const entree = h('input', {
    type: 'file',
    accept: 'image/*',
    // Sur telephone, ouvre l'appareil photo plutot que la galerie :
    // c'est le geste qu'on veut, on est devant le chantier.
    capture: 'environment',
    hidden: true,
  });

  const apercu = h('div.chantier-vignette');
  const bouton = h('button.bt.bt-nu.chantier-bt-photo', {
    type: 'button',
    onclick: () => entree.click(),
  }, url ? 'Remplacer' : 'Choisir une photo');

  function dessiner(adresse) {
    vider(apercu);
    if (adresse) {
      apercu.append(h('img', { src: adresse, alt: libelle, loading: 'lazy' }));
      bouton.textContent = 'Remplacer';
    } else {
      apercu.append(h('span.chantier-vide', obligatoire ? 'Obligatoire' : 'Facultatif'));
      bouton.textContent = 'Choisir une photo';
    }
  }
  dessiner(url);

  entree.addEventListener('change', async () => {
    const fichier = entree.files?.[0];
    if (!fichier) return;
    bouton.disabled = true;
    bouton.textContent = 'Envoi…';
    try {
      const adresse = await surChoix(fichier);
      dessiner(adresse);
    } catch (e) {
      souffler(e.message || "La photo n'a pas pu être envoyée.", 'alerte');
      dessiner(url);
    } finally {
      bouton.disabled = false;
      // Sans ca, rechoisir le meme fichier ne declenche pas `change`.
      entree.value = '';
    }
  });

  return h('div.chantier-champ',
    h('span.chantier-libelle', libelle),
    apercu, bouton, entree);
}

/** Une realisation : deux photos, un titre, une description. */
function carteChantier(client, ligne, { surSuppression }) {
  const etat = { ...ligne };

  const enregistrer = async (champs) => {
    Object.assign(etat, champs);
    try {
      await D.majRealisation(etat.id, champs);
    } catch {
      souffler("La modification n'a pas pu être enregistrée.", 'alerte');
    }
  };

  const titre = h('input.chantier-titre', {
    type: 'text', value: etat.titre || '',
    placeholder: 'Ex. : réfection de toiture',
  });
  titre.addEventListener('change', () => enregistrer({ titre: titre.value.trim() || null }));

  const description = h('textarea.chantier-desc', {
    rows: '2', placeholder: 'Deux mots sur le chantier (facultatif)',
  });
  description.value = etat.description || '';
  description.addEventListener('change', () => enregistrer({ description: description.value.trim() || null }));

  const publiee = h('input', { type: 'checkbox', checked: etat.publiee !== false });
  publiee.addEventListener('change', () => enregistrer({ publiee: publiee.checked }));

  return h('div.chantier-carte',
    h('div.chantier-photos',
      champPhoto({
        libelle: 'Avant',
        url: etat.photo_avant,
        surChoix: async (f) => {
          const url = await envoyerPhoto(client.id, f);
          await enregistrer({ photo_avant: url });
          return url;
        },
      }),
      champPhoto({
        libelle: 'Après',
        url: etat.photo_apres,
        obligatoire: true,
        surChoix: async (f) => {
          const url = await envoyerPhoto(client.id, f);
          // Des qu'il y a quelque chose a montrer, ca se montre. Laisser
          // le client cocher « visible » ferait rester en brouillon des
          // chantiers qu'il croit publies — et un chantier invisible ne
          // sert a rien.
          await enregistrer({ photo_apres: url, publiee: true });
          publiee.checked = true;
          return url;
        },
      })),
    h('div.chantier-infos', titre, description,
      h('div.chantier-pied',
        h('label.chantier-visible', publiee, h('span', 'Visible sur le site')),
        h('button.bt.bt-nu.chantier-suppr', {
          type: 'button',
          onclick: async () => {
            if (!await certain('Supprimer ce chantier de votre site ?',
              { titre: 'Supprimer', action: 'Supprimer', danger: true })) return;
            try {
              await D.supprimerRealisation(etat.id);
              surSuppression();
            } catch {
              souffler('Suppression impossible.', 'alerte');
            }
          },
        }, 'Supprimer'))));
}

export function sectionChantiers(client, realisations) {
  const liste = h('div.chantier-liste');
  let lignes = [...realisations];

  function dessiner() {
    vider(liste);
    if (!lignes.length) {
      liste.append(h('p.chantier-invite',
        "Ajoutez la photo d'un chantier terminé. C'est ce qui convainc le plus "
        + 'un visiteur qui hésite, et vous en avez déjà dans votre téléphone.'));
      return;
    }
    for (const l of lignes) {
      liste.append(carteChantier(client, l, {
        surSuppression: () => { lignes = lignes.filter((x) => x.id !== l.id); dessiner(); },
      }));
    }
  }

  const ajouter = h('button.bt.bt-vif', {
    type: 'button',
    onclick: async () => {
      ajouter.disabled = true;
      try {
        // On cree la ligne d'abord, avec une photo « apres » vide : le
        // client remplit ensuite dans la carte. L'inverse — demander la
        // photo avant de creer — obligerait a garder un fichier en
        // memoire pendant que l'ecran change, et perdrait tout si
        // l'envoi echoue.
        const ligne = await D.creerRealisation(client.id, { photo_apres: '', publiee: false });
        lignes = [ligne, ...lignes];
        dessiner();
      } catch {
        souffler("Le chantier n'a pas pu être créé.", 'alerte');
      } finally {
        ajouter.disabled = false;
      }
    },
  }, 'Ajouter un chantier');

  dessiner();

  return h('div.section',
    h('div.section-tete',
      h('h2', 'Chantiers'),
      h('p.section-desc', 'Vos réalisations, en photo avant et après.')),
    h('div.section-corps', liste, h('div.chantier-actions', ajouter)));
}
