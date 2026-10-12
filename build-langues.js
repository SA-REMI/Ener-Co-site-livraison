#!/usr/bin/env node
/* =============================================================================
   GENERATEUR DES VERSIONS PAR LANGUE
   =============================================================================

   A QUOI CA SERT
   Un moteur de recherche indexe une URL et lui attribue une langue. Tant que les
   trois langues partagent la meme adresse, seule la langue ecrite dans le HTML
   est indexee : les traductions sont invisibles. Ce script ecrit une version par
   langue a son propre endroit :

       francais   ->  /expertise.html          (ecrit sur place)
       anglais    ->  /en/expertise.html
       italien    ->  /it/expertise.html

   LE FRANCAIS EST REGENERE AUSSI, VOLONTAIREMENT
   La page francaise est a la fois source et sortie. Le script y reinjecte les
   valeurs du dictionnaire, ce qui garantit que le texte ecrit en dur dans le
   HTML ne peut jamais diverger du dictionnaire. Sans cela l'ecart passe
   inapercu : une valeur peut dire "8 pays" dans le dictionnaire et "7 pays"
   dans le HTML, et c'est le HTML que lit un robot d'indexation.

   PAS D'ETAPE DE BUILD SUR NETLIFY
   Les fichiers produits sont versionnes dans le depot. Netlify continue de
   publier le dossier tel quel, sans commande de build : un deploiement ne peut
   donc pas echouer, propriete qu'on ne veut pas perdre. La console Decap
   continue de fonctionner a l'identique, puisque les surcharges de
   content/textes/*.json sont appliquees cote navigateur, sur les trois langues.

   CE SCRIPT SE RELANCE A LA MAIN, apres toute modification du dictionnaire
   dans assets/site.js :

       node build-langues.js              genere
       node build-langues.js verifier   ne rien ecrire, signaler si perime

   La verification est la garde : elle echoue si les fichiers du depot ne
   correspondent plus a ce que le dictionnaire produirait.
   ========================================================================== */

'use strict';
const fs = require('fs');
const path = require('path');

const RACINE = __dirname;
const SITE = 'https://ener-co.fr';
const LANGUES = ['fr', 'en', 'it'];
const DOSSIER = { fr: '', en: 'en', it: 'it' };
const OG_LOCALE = { fr: 'fr_FR', en: 'en_GB', it: 'it_IT' };

// Pages indexables : elles recoivent canonique, hreflang et og:url.
const INDEXABLES = [
  'index.html', 'expertise.html', 'secteurs.html', 'realisations.html',
  'references.html', 'engagements.html', 'recrutement.html', 'contact.html',
  'mentions-legales.html', 'politique-de-confidentialite.html',
];
// Traduite pour le visiteur mais en noindex : ni canonique ni hreflang.
const TRADUITES_NON_INDEXEES = ['merci.html'];
// Servie par Netlify pour tout chemin inconnu, donc une seule version possible.
const RACINE_SEULE = ['404.html'];

const VERIFIER = process.argv.slice(2).includes('verifier');

/* ---------------------------------------------------------------------------
   1 · LECTURE DU DICTIONNAIRE
   On extrait le litteral I18N de assets/site.js plutot que de charger le
   fichier : site.js s'adresse a un navigateur et touche document des son
   chargement. L'extraction est bornee par le debut de la declaration et par
   l'accolade fermante en debut de ligne, la seule a cette colonne.
--------------------------------------------------------------------------- */
function lireDictionnaire() {
  const src = fs.readFileSync(path.join(RACINE, 'assets', 'site.js'), 'utf8');
  const debut = src.indexOf('const I18N = {');
  if (debut === -1) throw new Error('declaration I18N introuvable dans assets/site.js');
  const apres = src.indexOf('\n};', debut);
  if (apres === -1) throw new Error('fin du litteral I18N introuvable');
  const litteral = src.slice(debut + 'const I18N = '.length, apres + 2);
  const dict = new Function('return ' + litteral)();

  for (const l of LANGUES) {
    if (!dict[l]) throw new Error('langue absente du dictionnaire : ' + l);
  }
  const tailles = LANGUES.map((l) => Object.keys(dict[l]).length);
  if (new Set(tailles).size !== 1) {
    throw new Error('dictionnaire dissymetrique : ' +
      LANGUES.map((l, i) => l + ' ' + tailles[i]).join(' · '));
  }
  return { dict, nbCles: tailles[0] };
}

/* ---------------------------------------------------------------------------
   2 · ECHAPPEMENT
   applyLang ecrit soit du texte (textContent) soit du HTML (innerHTML). Une
   valeur destinee a textContent doit etre echappee en entrant dans le HTML,
   sinon un caractere comme < casserait la page.
--------------------------------------------------------------------------- */
const echapperTexte = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const echapperAttribut = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
           .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ---------------------------------------------------------------------------
   3 · LECTURE DES BALISES
   On ne cherche pas la balise fermante par expression reguliere : avec des
   elements imbriques de meme nom elle attraperait la premiere fermeture
   rencontree, pas la bonne. On compte la profondeur, en ignorant les
   commentaires, et on refuse d'agir si la fermeture n'est pas trouvee.
--------------------------------------------------------------------------- */

// Fin de la balise ouvrante : le premier > hors valeur d'attribut.
function finBaliseOuvrante(html, debut) {
  let guillemet = null;
  for (let i = debut; i < html.length; i++) {
    const c = html[i];
    if (guillemet) { if (c === guillemet) guillemet = null; continue; }
    if (c === '"' || c === "'") { guillemet = c; continue; }
    if (c === '>') return i;
  }
  return -1;
}

// Index de la balise fermante correspondante, profondeur comprise.
function trouverFermeture(html, tag, apresOuvrante) {
  const ouvre = new RegExp('<' + tag + '(?=[\\s/>])', 'gi');
  const ferme = new RegExp('</' + tag + '\\s*>', 'gi');
  let profondeur = 1;
  let i = apresOuvrante;

  while (i < html.length) {
    // Un commentaire peut contenir une balise : on le saute en entier.
    const comm = html.indexOf('<!--', i);
    ouvre.lastIndex = i;
    ferme.lastIndex = i;
    const mo = ouvre.exec(html);
    const mf = ferme.exec(html);
    if (!mf) return -1;

    if (comm !== -1 && comm < mf.index && (!mo || comm < mo.index)) {
      const fin = html.indexOf('-->', comm);
      if (fin === -1) return -1;
      i = fin + 3;
      continue;
    }
    if (mo && mo.index < mf.index) {
      const fo = finBaliseOuvrante(html, mo.index);
      if (fo === -1) return -1;
      // Une balise auto-fermante n'ouvre pas de niveau.
      if (html[fo - 1] !== '/') profondeur++;
      i = fo + 1;
      continue;
    }
    profondeur--;
    if (profondeur === 0) return mf.index;
    i = mf.index + mf[0].length;
  }
  return -1;
}

/* ---------------------------------------------------------------------------
   4 · SUBSTITUTION DES TEXTES
   On reproduit exactement la semantique de applyLang :
     - valeur tableau              -> liste de <li>
     - attribut data-i18n-html,
       ou valeur contenant < ou &  -> innerHTML (ecrit tel quel)
     - sinon                       -> textContent (echappe)
   Une cle absente du dictionnaire laisse le contenu d'origine en place.
--------------------------------------------------------------------------- */
function releverPorteurs(html) {
  const porteurs = [];
  const re = /<([a-z][a-z0-9]*)\b[^>]*?\sdata-i18n="([^"]*)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    porteurs.push({ tag: m[1], cle: m[2], debut: m.index });
  }
  return porteurs;
}

/* GARDE · aucun element porteur ne doit en contenir un autre. Si cela arrivait,
   le navigateur ferait gagner le parent et effacerait l'enfant : le texte
   traduit de l'enfant disparaitrait sans aucun message.
   Ce controle se fait sur le HTML D'ORIGINE. Mene apres les substitutions, il
   lirait des index decales et signalerait des imbrications qui n'existent pas. */
function controlerImbrication(html, journal) {
  const porteurs = releverPorteurs(html);
  for (let a = 0; a < porteurs.length; a++) {
    const fo = finBaliseOuvrante(html, porteurs[a].debut);
    if (fo === -1) continue;
    const ff = trouverFermeture(html, porteurs[a].tag, fo + 1);
    if (ff === -1) continue;
    for (let b = a + 1; b < porteurs.length && porteurs[b].debut < ff; b++) {
      journal.erreurs.push('data-i18n imbrique : ' + porteurs[a].cle + ' contient ' + porteurs[b].cle);
    }
  }
}

function substituerTextes(html, dict, journal) {
  const porteurs = releverPorteurs(html);
  journal.porteurs += porteurs.length;

  // Chaque element est traite en partant de la fin : les index situes avant le
  // point de reecriture restent valides.
  for (let k = porteurs.length - 1; k >= 0; k--) {
    const { tag, cle, debut } = porteurs[k];
    const valeur = dict[cle];
    if (valeur === undefined) { journal.clesAbsentes.push(cle); continue; }

    const fo = finBaliseOuvrante(html, debut);
    if (fo === -1) { journal.erreurs.push('balise ouvrante illisible : ' + cle); continue; }
    const ouvrante = html.slice(debut, fo + 1);
    const ff = trouverFermeture(html, tag, fo + 1);
    if (ff === -1) { journal.erreurs.push('fermeture introuvable : <' + tag + '> ' + cle); continue; }

    let contenu;
    if (Array.isArray(valeur)) {
      contenu = valeur.map((item) => '<li>' + item + '</li>').join('');
    } else if (/\sdata-i18n-html[\s=>]/i.test(ouvrante) || /[<&]/.test(valeur)) {
      contenu = valeur;
    } else {
      contenu = echapperTexte(valeur);
    }

    html = html.slice(0, fo + 1) + contenu + html.slice(ff);
    journal.remplaces++;
  }
  return html;
}

/* ---------------------------------------------------------------------------
   5 · SUBSTITUTION DES ATTRIBUTS
   data-i18n-attr="content:cle" ou "attr:cle, attr2:cle2".
   applyLang n'ecrit que si la valeur est non vide : on fait de meme.
--------------------------------------------------------------------------- */
function substituerAttributs(html, dict, journal) {
  return html.replace(/<([a-z][a-z0-9]*)\b([^>]*?)\sdata-i18n-attr="([^"]*)"([^>]*)>/gi,
    (tout, tag, avant, spec, apres) => {
      let corps = avant + ' data-i18n-attr="' + spec + '"' + apres;
      for (const paire of spec.split(',')) {
        const [attr, cle] = paire.split(':').map((s) => s.trim());
        if (!attr || !cle) continue;
        const valeur = dict[cle];
        if (!valeur) { if (valeur === undefined) journal.clesAbsentes.push(cle); continue; }
        const remplacement = attr + '="' + echapperAttribut(valeur) + '"';
        const reAttr = new RegExp('\\s' + attr + '="[^"]*"', 'i');
        if (reAttr.test(corps)) corps = corps.replace(reAttr, ' ' + remplacement);
        else corps = ' ' + remplacement + corps;
        journal.attributs++;
      }
      return '<' + tag + corps + '>';
    });
}

/* ---------------------------------------------------------------------------
   6 · EN-TETES PAR LANGUE
   Canonique propre a la langue, jeu de hreflang reciproque et x-default sur le
   francais. Le bloc est d'abord retire puis reecrit, pour que relancer le
   script ne l'empile pas.
--------------------------------------------------------------------------- */
function urlDe(lang, page) {
  const dossier = DOSSIER[lang] ? '/' + DOSSIER[lang] + '/' : '/';
  return SITE + dossier + (page === 'index.html' ? '' : page);
}

/* On detecte l'absence d'un motif en le CHERCHANT, jamais en constatant que la
   chaine n'a pas change apres remplacement : quand la valeur attendue est deja
   en place, en francais par exemple, le remplacement ne change rien et le
   controle signalerait a tort un motif introuvable. */
function remplacerUneFois(html, motif, remplacement, etiquette, journal) {
  if (!motif.test(html)) { journal.erreurs.push(etiquette); return html; }
  return html.replace(motif, remplacement);
}

function entetes(html, lang, page, indexable, journal) {
  html = remplacerUneFois(html, /(<html\b[^>]*?)\slang="[^"]*"/i,
    '$1 lang="' + lang + '"', 'attribut lang introuvable sur <html> : ' + page, journal);

  /* Nettoyage des blocs deja poses, pour que relancer le script ne les empile
     pas. Le motif retire la fin de ligne QUI PRECEDE la balise, parce que
     l'insertion ajoute justement une fin de ligne avant chaque ligne du bloc.
     Retirer celle qui SUIT serait asymetrique : chaque passage consommerait une
     ligne vide de plus et le fichier ne se stabiliserait jamais. */
  html = html.replace(/\r?\n[ \t]*<link rel="alternate" hreflang="[^"]*"[^>]*>/gi, '');
  html = html.replace(/\r?\n[ \t]*<meta property="og:locale(?::alternate)?"[^>]*>/gi, '');

  // Les anciennes balises ne se trouvaient pas au meme endroit : leur retrait
  // laisse des lignes vides en trop. On les ramene a une seule, dans l'en-tete
  // uniquement, pour ne pas toucher au corps de la page.
  html = html.replace(/<head>[\s\S]*?<\/head>/i, (tete) =>
    tete.replace(/(\r?\n)[ \t]*(?:\r?\n[ \t]*)+(\r?\n)/g, '$1$2'));

  if (!indexable) return html;

  html = remplacerUneFois(html, /(<link rel="canonical" href=")[^"]*(")/i,
    '$1' + urlDe(lang, page) + '$2', 'canonique introuvable : ' + page, journal);
  html = remplacerUneFois(html, /(<meta property="og:url" content=")[^"]*(")/i,
    '$1' + urlDe(lang, page) + '$2', 'og:url introuvable : ' + page, journal);

  // Les alternats sont identiques sur les trois versions : c'est la reciprocite
  // qui les rend valides aux yeux d'un moteur.
  const lignes = LANGUES.map((l) =>
    '  <link rel="alternate" hreflang="' + l + '" href="' + urlDe(l, page) + '">');
  lignes.push('  <link rel="alternate" hreflang="x-default" href="' + urlDe('fr', page) + '">');
  lignes.push('  <meta property="og:locale" content="' + OG_LOCALE[lang] + '">');
  // Les deux autres langues, declarees depuis la page courante.
  for (const l of LANGUES) {
    if (l !== lang) lignes.push('  <meta property="og:locale:alternate" content="' + OG_LOCALE[l] + '">');
  }

  const finDeLigne = html.includes('\r\n') ? '\r\n' : '\n';
  const bloc = lignes.join(finDeLigne);
  html = remplacerUneFois(html, /(<link rel="canonical"[^>]*>)/i,
    '$1' + finDeLigne + bloc, 'insertion hreflang impossible : ' + page, journal);
  journal.hreflang++;
  return html;
}

/* ---------------------------------------------------------------------------
   7 · PRODUCTION
--------------------------------------------------------------------------- */
function produire() {
  const { dict, nbCles } = lireDictionnaire();
  console.log('Dictionnaire · ' + nbCles + ' cles x ' + LANGUES.length + ' langues\n');

  const aEcrire = [];
  const journalGlobal = { porteurs: 0, remplaces: 0, attributs: 0, hreflang: 0, clesAbsentes: [], erreurs: [] };

  const taches = [];
  for (const page of INDEXABLES) for (const l of LANGUES) taches.push({ page, lang: l, indexable: true });
  for (const page of TRADUITES_NON_INDEXEES) for (const l of LANGUES) taches.push({ page, lang: l, indexable: false });
  for (const page of RACINE_SEULE) taches.push({ page, lang: 'fr', indexable: false });

  for (const { page, lang, indexable } of taches) {
    const source = path.join(RACINE, page);
    if (!fs.existsSync(source)) { journalGlobal.erreurs.push('page absente : ' + page); continue; }

    const journal = { porteurs: 0, remplaces: 0, attributs: 0, hreflang: 0, clesAbsentes: [], erreurs: [] };
    let html = fs.readFileSync(source, 'utf8');
    controlerImbrication(html, journal);
    html = substituerTextes(html, dict[lang], journal);
    html = substituerAttributs(html, dict[lang], journal);
    html = entetes(html, lang, page, indexable, journal);

    /* GARDE · tout porteur data-i18n doit avoir ete remplace.
       Un texte dont la cle manque au dictionnaire reste en francais dans les
       trois langues : il n'est traduisible par personne, ni par le code ni par
       la console. La page sort alors partiellement dans la langue de la source
       et se fait indexer comme un doublon, sans rien d'anormal a l'ecran.

       On compte, on ne se contente pas de verifier qu'il reste au moins un
       remplacement : chaque page porte des cles nav.* et footer.* toujours
       presentes, donc un controle "au moins un remplacement" serait toujours
       satisfait et ne garderait rien. */
    if (journal.remplaces !== journal.porteurs) {
      journal.erreurs.push((journal.porteurs - journal.remplaces) + ' texte(s) non remplace(s) sur ' +
        journal.porteurs + ' dans ' + lang + '/' + page);
    }
    // Le meme trou existe du cote des attributs : une cle absente y passerait
    // sans faire bouger le compte des textes.
    const manquantes = [...new Set(journal.clesAbsentes)];
    if (manquantes.length) {
      journal.erreurs.push('cle(s) absente(s) du dictionnaire dans ' + lang + '/' + page +
        ' : ' + manquantes.join(', '));
    }

    const cible = DOSSIER[lang]
      ? path.join(RACINE, DOSSIER[lang], page)
      : path.join(RACINE, page);
    aEcrire.push({ cible, html, page, lang, journal });

    for (const k of ['porteurs', 'remplaces', 'attributs', 'hreflang']) journalGlobal[k] += journal[k];
    journalGlobal.clesAbsentes.push(...journal.clesAbsentes);
    journalGlobal.erreurs.push(...journal.erreurs);
  }

  // Rien n'est ecrit tant qu'une seule tache a echoue : mieux vaut un depot
  // inchange qu'un depot a moitie traduit.
  if (journalGlobal.erreurs.length) {
    console.error('ECHEC · ' + journalGlobal.erreurs.length + ' probleme(s), aucun fichier ecrit :');
    for (const e of [...new Set(journalGlobal.erreurs)]) console.error('  · ' + e);
    process.exit(1);
  }

  let perimes = 0, ecrits = 0;
  for (const { cible, html } of aEcrire) {
    const existe = fs.existsSync(cible) ? fs.readFileSync(cible, 'utf8') : null;
    if (existe === html) continue;
    perimes++;
    if (!VERIFIER) {
      fs.mkdirSync(path.dirname(cible), { recursive: true });
      fs.writeFileSync(cible, html);
      ecrits++;
    }
  }

  console.log('Pages traitees      ' + aEcrire.length);
  console.log('Textes remplaces    ' + journalGlobal.remplaces + ' / ' + journalGlobal.porteurs + ' porteurs');
  console.log('Attributs ecrits    ' + journalGlobal.attributs);
  console.log('Jeux de hreflang    ' + journalGlobal.hreflang);

  if (VERIFIER) {
    console.log('\nVERIFICATION · fichiers perimes : ' + perimes);
    if (perimes > 0) {
      console.error('ECHEC · le depot ne correspond plus au dictionnaire.');
      console.error('Relancer : node build-langues.js');
      process.exit(1);
    }
    console.log('Le depot est a jour.');
  } else {
    console.log('\nFichiers ecrits     ' + ecrits + ' (sur ' + aEcrire.length + ')');
  }
  return { nbCles, pages: aEcrire };
}

/* ---------------------------------------------------------------------------
   8 · PLAN DU SITE
   Trente URL au lieu de dix, chacune declarant ses alternats. On ne touche pas
   au fichier en mode verification.
--------------------------------------------------------------------------- */
function genererSitemap() {
  const { execSync } = require('child_process');
  const dateDe = (page) => {
    try {
      const d = execSync('git log -1 --format=%cs -- "' + page + '"', { cwd: RACINE, encoding: 'utf8' }).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    } catch (e) { /* hors depot git ou clone superficiel */ }
    return fs.statSync(path.join(RACINE, page)).mtime.toISOString().slice(0, 10);
  };

  const lignes = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  ];
  for (const page of INDEXABLES) {
    const lastmod = dateDe(page);
    for (const l of LANGUES) {
      lignes.push('  <url>');
      lignes.push('    <loc>' + urlDe(l, page) + '</loc>');
      for (const alt of LANGUES) {
        lignes.push('    <xhtml:link rel="alternate" hreflang="' + alt + '" href="' + urlDe(alt, page) + '"/>');
      }
      lignes.push('    <xhtml:link rel="alternate" hreflang="x-default" href="' + urlDe('fr', page) + '"/>');
      lignes.push('    <lastmod>' + lastmod + '</lastmod>');
      lignes.push('  </url>');
    }
  }
  lignes.push('</urlset>');
  const xml = lignes.join('\n') + '\n';

  const cible = path.join(RACINE, 'sitemap.xml');
  const existe = fs.existsSync(cible) ? fs.readFileSync(cible, 'utf8') : null;
  const nbUrl = INDEXABLES.length * LANGUES.length;
  if (VERIFIER) {
    console.log('\nPlan du site · ' + nbUrl + ' URL · ' + (existe === xml ? 'a jour' : 'PERIME'));
    if (existe !== xml) process.exit(1);
  } else {
    if (existe !== xml) fs.writeFileSync(cible, xml);
    console.log('Plan du site        ' + nbUrl + ' URL');
  }
}

produire();
genererSitemap();
console.log('\n' + (VERIFIER ? 'Verification terminee.' : 'Generation terminee.'));
