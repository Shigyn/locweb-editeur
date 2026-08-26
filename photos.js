// ===================================================================
//  Photos de chantier — reduction avant envoi.
//
//  Un artisan photographie avec son telephone : 8 a 12 Mo par cliche,
//  4000 pixels de large. Televersee telle quelle, une seule photo pese
//  plus lourd que tout le reste du site reuni, met une minute a partir
//  en 4G depuis un chantier, et fait ramer la page du visiteur qui la
//  regarde sur son propre telephone.
//
//  On reduit donc AVANT d'envoyer, dans le navigateur. Ce n'est pas un
//  detail d'optimisation : sans ca la fonctionnalite est inutilisable
//  la ou elle sert, c'est-a-dire dehors, avec une barre de reseau.
// ===================================================================

import * as D from './donnees.js';

/* 1600 px sur le grand cote : au-dela, l'ecran d'un visiteur n'affiche
   pas la difference, et le poids double. La qualite 0.82 est le point
   ou le JPEG cesse de se voir sans encore peser. Ensemble, ils font
   passer un cliche de 10 Mo a environ 250 Ko. */
const COTE_MAX = 1600;
const QUALITE = 0.82;

// 25 Mo : au-dela ce n'est plus une photo de telephone mais un fichier
// d'appareil reflex ou un envoi accidentel. On refuse avant de charger
// l'image en memoire, ce qui ferait planter l'onglet sur un mobile.
const POIDS_MAX = 25 * 1024 * 1024;

/**
 * Reduit une image et la renvoie en JPEG.
 * @returns {Promise<Blob>}
 */
export async function reduireImage(fichier) {
  if (!/^image\//.test(fichier.type)) {
    throw new Error("Ce fichier n'est pas une image.");
  }
  if (fichier.size > POIDS_MAX) {
    throw new Error('Cette image est trop lourde (25 Mo maximum).');
  }

  // `imageOrientation: from-image` applique la rotation EXIF. Sans
  // elle, une photo prise en tenant le telephone verticalement
  // s'affiche couchee — le capteur est toujours en paysage, seule une
  // etiquette dit comment la redresser, et le canvas l'ignore.
  const image = await createImageBitmap(fichier, { imageOrientation: 'from-image' });

  const echelle = Math.min(1, COTE_MAX / Math.max(image.width, image.height));
  const largeur = Math.round(image.width * echelle);
  const hauteur = Math.round(image.height * echelle);

  const toile = document.createElement('canvas');
  toile.width = largeur;
  toile.height = hauteur;
  const ctx = toile.getContext('2d');
  // Le fond blanc compte : un PNG transparent converti en JPEG sans
  // fond donne des zones noires.
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, largeur, hauteur);
  ctx.drawImage(image, 0, 0, largeur, hauteur);
  image.close?.();

  const blob = await new Promise((res) => toile.toBlob(res, 'image/jpeg', QUALITE));
  if (!blob) throw new Error("L'image n'a pas pu être préparée.");
  return blob;
}

/**
 * Reduit puis televerse. Renvoie l'adresse publique.
 * @returns {Promise<string>}
 */
export async function envoyerPhoto(clientId, fichier) {
  const reduite = await reduireImage(fichier);
  // Nom stable et sans accent : le nom d'origine vient du telephone et
  // contient parfois des espaces ou des caracteres que le stockage
  // refuse.
  const nom = `chantiers/${clientId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  return D.envoyerFichierSite(nom, reduite);
}
