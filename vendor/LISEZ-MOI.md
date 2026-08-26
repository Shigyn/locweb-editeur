# Bibliothèques tierces

## qrcode.mjs

`qrcode-generator` 2.0.4 de Kazuhiko Arase, licence MIT, copié tel quel
depuis npm le 2026-08-26.

Vendorisé plutôt que chargé depuis un CDN : le QR d'avis Google doit
s'afficher même quand le client est hors ligne dans son application
installée, et un CDN tiers est une dépendance de plus à surveiller.

Écrire l'encodeur à la main aurait été possible, mais c'est de la
manipulation de bits et de correction d'erreurs Reed-Solomon : une
erreur y produit un QR d'apparence normale que rien ne scanne, et il
n'y a pas de décodeur ici pour s'en apercevoir.

**Ne pas modifier.** Pour changer de version, refaire
`npm pack qrcode-generator` et recopier `dist/qrcode.mjs`.
