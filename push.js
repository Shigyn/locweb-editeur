// ===================================================================
//  Notifications push.
//
//  Le seul evenement qui merite d'interrompre quelqu'un : une nouvelle
//  demande. Un artisan sur un chantier ne consulte pas un tableau de
//  bord, et une demande vue trois jours plus tard est un chantier
//  perdu.
//
//  On ne demande JAMAIS l'autorisation au chargement. Un navigateur
//  qui voit surgir la boite « Autoriser les notifications ? » sans
//  raison se fait refuser une fois pour toutes, et il n'existe aucun
//  moyen de redemander ensuite — c'est definitif, par appareil. La
//  demande part donc au clic, et uniquement au clic.
// ===================================================================

import * as D from './donnees.js';

/* Cle publique VAPID. Elle n'est pas secrete : elle voyage dans chaque
   abonnement et identifie simplement l'expediteur aupres du service de
   push du navigateur. La cle privee, elle, ne quitte jamais le
   serveur. */
const VAPID_PUBLIQUE = 'BOcZdqb1smdsNqnHjCZHxOff-NQGry6n_m7Dos_tT1g43gn0RzcF5Zk5a6tUT7X_Cl0GodBMy4cZZcg5A6tgYvk';

/** Base64 URL vers Uint8Array : ce que l'API PushManager attend. */
function versOctets(base64url) {
  const bourrage = '='.repeat((4 - (base64url.length % 4)) % 4);
  const brut = atob((base64url + bourrage).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(brut, (c) => c.charCodeAt(0));
}

export function pushDisponible() {
  return 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

/** Refusee une fois, l'autorisation ne peut plus etre redemandee. */
export function pushRefuse() {
  return pushDisponible() && Notification.permission === 'denied';
}

export async function pushActif() {
  if (!pushDisponible() || Notification.permission !== 'granted') return false;
  try {
    const enregistrement = await navigator.serviceWorker.ready;
    return !!(await enregistrement.pushManager.getSubscription());
  } catch { return false; }
}

/**
 * Demande l'autorisation, s'abonne, enregistre l'appareil.
 * A n'appeler que depuis un vrai clic.
 * @returns {Promise<{ok: boolean, raison?: string}>}
 */
export async function activerPush(clientId) {
  if (!pushDisponible()) {
    return { ok: false, raison: "Votre navigateur ne sait pas afficher de notifications." };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return {
      ok: false,
      raison: permission === 'denied'
        ? "Les notifications sont bloquées pour ce site. Vous pouvez les réautoriser dans les réglages de votre navigateur."
        : "Autorisation non accordée.",
    };
  }

  try {
    const enregistrement = await navigator.serviceWorker.ready;

    // Un abonnement peut deja exister : on le reutilise plutot que
    // d'en creer un second, sinon la meme notification arriverait en
    // double sur le meme appareil.
    const abonnement = await enregistrement.pushManager.getSubscription()
      || await enregistrement.pushManager.subscribe({
        // Obligatoire depuis Chrome 52 : pas de push silencieux, chaque
        // message doit se traduire par une notification visible.
        userVisibleOnly: true,
        applicationServerKey: versOctets(VAPID_PUBLIQUE),
      });

    await D.enregistrerAbonnementPush(clientId, abonnement);
    return { ok: true };
  } catch (e) {
    console.error('Abonnement push refusé', e);
    return { ok: false, raison: "L'abonnement n'a pas pu être enregistré. Réessayez dans un moment." };
  }
}

export async function desactiverPush() {
  if (!pushDisponible()) return;
  try {
    const enregistrement = await navigator.serviceWorker.ready;
    const abonnement = await enregistrement.pushManager.getSubscription();
    if (!abonnement) return;
    // On oublie l'appareil en base AVANT de resilier : si l'ordre
    // etait inverse et que la suppression echouait, le serveur
    // continuerait d'envoyer vers un abonnement mort.
    await D.oublierAbonnementPush(abonnement.endpoint).catch(() => undefined);
    await abonnement.unsubscribe();
  } catch (e) {
    console.error('Désabonnement impossible', e);
  }
}
