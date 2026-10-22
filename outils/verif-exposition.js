#!/usr/bin/env node
/* =============================================================================
   CONTROLE D'EXPOSITION · quels fichiers le site sert-il REELLEMENT ?
   =============================================================================

   A LANCER APRES CHAQUE DEPLOIEMENT :

       node outils/verif-exposition.js                  (ener-co.netlify.app)
       node outils/verif-exposition.js ener-co.fr       (apres la bascule)

   POURQUOI CE CONTROLE EXISTE
   Le 22 octobre 2026, cinq fichiers internes etaient servis en clair alors que
   netlify.toml contenait les regles censees les bloquer : le code PHP archive,
   le guide de reprise technique, le generateur, un vieux brief d'integration et
   la brochure. Deux causes, et il faut avoir les deux en tete.

   1. Sur Netlify, un fichier PRESENT dans le dossier publie l'emporte sur une
      redirection. Sans `force = true`, la regle est ecrite, deployee, et ne
      s'applique jamais. Elle rassure sans rien garder.

   2. La recette precedente testait "/legacy/*" en remplacant l'etoile par un
      chemin invente. Ce chemin n'existe pas, donc la regle s'appliquait et le
      controle passait au vert, alors que le vrai fichier restait accessible.
      Une regle qui bloque un fichier existant ne se teste que sur le VRAI
      chemin de ce fichier.

   CE QUE FAIT CE SCRIPT
   Il n'interroge pas netlify.toml, il interroge le site. Il demande a git la
   liste des fichiers versionnes, retire ceux qui ont vocation a etre publics,
   et verifie que tous les autres repondent autre chose que 200.

   Ajouter un document interne a la racine du depot sans regle de blocage fera
   donc echouer ce controle, en naissant, et non six mois plus tard.
   ========================================================================== */

'use strict';
const { execSync } = require('child_process');
const https = require('https');
const path = require('path');

const HOTE = process.argv[2] || 'ener-co.netlify.app';
const RACINE = path.resolve(__dirname, '..');

/* Ce qui a vocation a etre servi. Tout le reste doit etre bloque.
   admin/ en fait partie : la console Decap charge sa configuration depuis le
   navigateur, elle ne peut pas fonctionner si on la bloque. Elle ne contient
   aucun identifiant, c'est Netlify Identity qui authentifie. */
const PUBLIC_LEGITIME = [
  /^[a-z0-9-]+\.html$/,            // pages francaises
  /^(en|it)\/[a-z0-9-]+\.html$/,   // pages traduites
  /^assets\//,                     // styles, scripts, images, logos
  /^content\//,                    // surcharges lues par le navigateur
  /^admin\//,                      // console d'edition
  /^sitemap\.xml$/,
  /^robots\.txt$/,
  /^favicon/,
  /^_headers$/,
  /^_redirects$/,
];

const demander = (chemin) => new Promise((ok) => {
  const req = https.get({ host: HOTE, path: '/' + chemin, timeout: 20000 }, (r) => {
    let taille = 0;
    r.on('data', (c) => { taille += c.length; });
    r.on('end', () => ok({ code: r.statusCode, taille }));
  });
  req.on('timeout', () => { req.destroy(); ok({ code: 0, taille: 0 }); });
  req.on('error', () => ok({ code: 0, taille: 0 }));
});

(async () => {
  const fichiers = execSync('git ls-files', { cwd: RACINE, encoding: 'utf8' })
    .split('\n').map((s) => s.trim()).filter(Boolean);
  const aTester = fichiers.filter((f) => !PUBLIC_LEGITIME.some((re) => re.test(f)));

  console.log('Hote interroge        ' + HOTE);
  console.log('Fichiers versionnes   ' + fichiers.length);
  console.log('Sans vocation publique ' + aTester.length + '\n');

  const exposes = [];
  const injoignables = [];
  for (const f of aTester) {
    const r = await demander(f);
    if (r.code === 200) exposes.push({ f, taille: r.taille });
    // Un hote injoignable ne doit pas passer pour un site bien protege :
    // sans cette distinction, une panne reseau rendrait le controle vert.
    if (r.code === 0) injoignables.push(f);
    const etat = r.code === 200 ? 'EXPOSE' : r.code === 0 ? 'INJOIGN' : 'bloque ';
    console.log('  ' + etat + '  HTTP ' + String(r.code).padEnd(4) +
      String(r.taille).padStart(7) + ' o   ' + f);
  }

  console.log('\n' + '='.repeat(60));
  if (injoignables.length) {
    console.error('CONTROLE NON CONCLUANT · ' + injoignables.length + ' requete(s) sans reponse.');
    process.exit(2);
  }
  if (exposes.length) {
    console.error('ECHEC · ' + exposes.length + ' fichier(s) servis alors qu\'ils ne devraient pas :');
    for (const e of exposes) console.error('  · ' + e.f + '  (' + e.taille + ' octets)');
    console.error('\nAjouter une regle dans netlify.toml, AVEC force = true.');
    process.exit(1);
  }
  console.log('CONTROLE PASSE · aucun fichier interne servi sur ' + HOTE);
})();
