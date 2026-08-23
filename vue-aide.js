// ===================================================================
//  Aide — page volontairement courte : dire clairement quoi faire
//  quand quelque chose bloque, pas noyer sous une FAQ.
// ===================================================================

import { h, vider } from './outils.js';

export async function rendre(page) {
  vider(page);
  page.append(
    h('h1', 'Aide'),
    h('div.section',
      h('div.section-tete', h('h2', 'Une question, un souci ?')),
      h('div.section-corps', { style: { paddingTop: '14px' } },
        h('p', { style: { color: 'var(--sourdine)', marginBottom: '16px' } },
          "Contactez-nous directement — on répond vite, pas de formulaire à remplir."),
        h('p', { style: { marginBottom: '16px' } },
          "Site en panne, question sur votre facture, modification que vous ne trouvez pas dans votre espace : appelez-nous, on s'en occupe."),
        h('a.bt.bt-vif', { href: 'tel:0745531434' }, '📞 07 45 53 14 34'))),
  );
}
