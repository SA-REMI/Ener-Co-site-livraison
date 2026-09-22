# Site Ener-Co · guide de reprise technique

Document destiné à la personne qui devrait reprendre la maintenance du site par le code : développeur, prestataire, ou collègue à l'aise avec HTML, CSS et Git. Il décrit ce qui existe, où ça se trouve, comment modifier la forme, et comment publier sans casser ce que les collègues éditent depuis la console.

Version du 22 septembre 2026. Dépôt : `SA-REMI/Ener-Co-site-livraison` sur GitHub, branche `main`.

## 1 · Le site en une page

- **Site statique** : 13 pages HTML, une feuille de style, un script. Aucun framework, aucune étape de construction, aucune base de données. Ce qui est dans le dépôt est ce qui est servi.
- **Trilingue** FR / EN / IT sans duplication de pages : chaque texte porte un attribut `data-i18n`, un dictionnaire JavaScript fournit les trois versions, un sélecteur bascule la langue côté navigateur.
- **Hébergé sur Netlify**, déployé automatiquement à chaque `git push` sur `main`. Adresse actuelle `https://ener-co.netlify.app`. Le domaine `ener-co.fr` est chez OVH et sera pointé sur Netlify.
- **Console d'édition** à `/admin` (Decap CMS + Netlify Identity) : les collègues modifient tout le contenu (textes, coordonnées, photos, logos, référencement, pages légales) sans code. La console écrit des commits dans le dépôt, ce qui redéploie le site.
- **Formulaire de contact** géré par Web3Forms (service externe, indépendant de l'hébergeur).
- **Règle de conception qui gouverne tout** : chaque contenu a une valeur par défaut écrite dans le HTML ou le script, et un fichier JSON dans `content/` peut la surcharger. Un fichier absent ou une valeur vide laisse la valeur par défaut. Le site ne peut donc jamais se retrouver vide.

## 2 · Accès nécessaires

| Quoi | Où | Qui le détient |
| :- | :- | :- |
| Code source | GitHub, organisation `SA-REMI`, dépôt `Ener-Co-site-livraison` | Willy Taunay (propriétaire) |
| Hébergement, déploiements, comptes de la console | Netlify, équipe `willy-taunay`, projet `ener-co` (site ID `e90403f1-2648-4928-b1a1-9cbf100107b2`) | Willy Taunay |
| Nom de domaine `ener-co.fr` et DNS | OVH | Compte au nom de la société, géré par le prestataire informatique |
| Formulaire de contact | Web3Forms, clé d'accès visible dans `contact.html` (publique par conception) | Willy Taunay ; les messages arrivent sur `contact@ener-co.fr` |

Sans accès GitHub vous ne pouvez rien publier. Sans accès Netlify vous ne pouvez ni créer de compte console ni revenir à un déploiement antérieur. Demandez les deux avant de commencer.

## 3 · Installer un poste de travail

1. Clonez le dépôt **hors de tout dossier synchronisé** (OneDrive, Google Drive, Dropbox). Sur le poste d'origine, le dépôt vit dans `C:\Dev\Ener-Co-site-livraison`. Un dépôt Git dans OneDrive a produit 69 copies de conflit et une copie locale désynchronisée : ne recommencez pas.
2. Aucune installation de dépendances. Node.js est utile pour les scripts de contrôle et pour servir le site localement.
3. Servez le site en HTTP local, par exemple :

```
npx serve -l 4177 .
```

puis ouvrez `http://localhost:4177/`. Ouvrir les fichiers en `file://` ne suffit pas : les fichiers de contenu sont chargés par `fetch()`, qui exige HTTP.

4. Une configuration de serveur de prévisualisation existe dans `.claude/launch.json` (nom `ener-co-static`, port 4173).

## 4 · Architecture des fichiers

```
index.html, expertise.html, realisations.html, secteurs.html,
references.html, engagements.html, recrutement.html, contact.html,
merci.html, mentions-legales.html, politique-de-confidentialite.html,
404.html                       les 13 pages (en-tête et pied de page dupliqués dans chacune)
assets/site.css                toute la mise en forme (environ 3 700 lignes)
assets/site.js                 dictionnaire des langues + comportements (environ 2 750 lignes)
assets/images/                 photos de chantier (jpg + webp), un sous-dossier par chantier
assets/logos/                  logos clients (png transparents)
assets/enerco-logo.png, favicon.png, logo-mase.jpg, europe-map-reference.*
content/                       fichiers de contenu écrits par la console (voir chapitre 6)
admin/index.html, admin/config.yml   la console d'édition
netlify.toml                   en-têtes de sécurité, cache, redirections
.htaccess                      équivalent Apache, conservé si le site devait être hébergé ailleurs
legacy/contact.php             ancien traitement PHP du formulaire, non servi sur Netlify
docs/GUIDE-CONSOLE.html        source du tutoriel des collègues (non publié ; diffusé en PDF sur le serveur interne)
ETAT_DES_LIEUX_SITE.md         analyse détaillée du site et scénarios d'hébergement
```

**Polices** : IBM Plex Sans chargée depuis Google Fonts (balise `<link>` dans chaque en-tête de page). Seule ressource externe au chargement, avec le script de la console sur `/admin`.

**Images** : chaque photo existe en `.jpg` (repli) et `.webp` (servi aux navigateurs compatibles) via une balise `<picture>`. Les logos sont des PNG transparents.

**Formulaire** (`contact.html`, en bas de page) : envoi en JavaScript vers `https://api.web3forms.com/submit` avec la clé d'accès, puis redirection vers `/merci.html`. Un champ caché `botcheck` sert d'anti-spam. Web3Forms n'accepte que les envois depuis un navigateur : un test avec `curl` renvoie 403, c'est normal.

## 5 · Le système de langues

Dans `assets/site.js`, l'objet `I18N` contient trois dictionnaires `fr`, `en`, `it` de **724 clés chacun**, strictement symétriques. Une clé ressemble à `home.hero.h1` (page `home`, section `hero`, élément `h1`). Les préfixes utilisés : `nav`, `footer`, `err` (communs), `home`, `exp`, `real`, `sect`, `refs`, `eng`, `recrut`, `contact`, `merci`, `legal`, `privacy`.

Dans le HTML :

- `data-i18n="home.hero.h1"` sur un élément : son contenu est remplacé par la valeur de la clé. Si la valeur contient `<` ou `&`, elle est injectée en HTML (gras, liens, retours à la ligne), sinon en texte.
- `data-i18n-attr="content:home.seo.description"` : remplace un attribut. Utilisé pour la balise `<meta name="description">`. La balise `<title>` porte un `data-i18n` classique.

La fonction `applyLang(lang)` parcourt ces attributs, met à jour le sélecteur, mémorise le choix dans `localStorage` (`enerco.lang`), puis ré-applique la colorisation du nom Ener-Co et les coordonnées (chapitre 6).

**Pour ajouter un texte traduit**, quatre gestes, tous obligatoires :

1. dans la page, poser `data-i18n="ns.nouvelle.cle"` avec le texte français en contenu par défaut ;
2. dans `site.js`, ajouter la clé dans les trois dictionnaires `fr`, `en`, `it` ;
3. dans `content/textes/<page>.json`, ajouter une entrée `{ "cle": "ns.nouvelle.cle", "fr": …, "en": …, "it": … }` pour que la console la propose ;
4. lancer le contrôle d'intégrité du chapitre 9.

Si vous oubliez l'étape 3, le texte s'affiche mais n'est pas éditable par les collègues. Si vous oubliez une langue à l'étape 2, le contrôle d'intégrité vous arrête.

## 6 · La console et les surcharges de contenu

La console est Decap CMS, chargée par `admin/index.html` depuis un CDN, configurée par `admin/config.yml`. Authentification par Netlify Identity (email + mot de passe, inscription sur invitation uniquement), écriture dans le dépôt par Git Gateway. Les collègues n'ont pas de compte GitHub et n'en ont pas besoin.

Chaque « Publier » dans la console crée un commit sur `main` avec un message automatique. Ces commits sont normaux et attendus. **Tirez toujours (`git pull`) avant de travailler**, sinon votre prochain push sera refusé.

Quatre fichiers de contenu, quatre mécanismes de surcharge dans `site.js` :

| Fichier | Mécanisme | Marqueur HTML | Fonction |
| :- | :- | :- | :- |
| `content/textes/*.json` (12 fichiers, un par page ou zone) | liste de `{cle, fr, en, it}` appliquée par-dessus `I18N` | `data-i18n` | `loadEditableTexts()` |
| `content/coordonnees.json` | téléphone, email, adresse, raison sociale | `data-coord="telephone"` (texte), `data-coord-href="tel"` ou `"mailto"` (lien) | `loadCoordonnees()`, `applyCoordonnees()` |
| `content/realisations-photos.json` | 4 photos par réalisation | `data-photo="c6.1"` sur chaque `<img>` | `loadPhotosRealisations()` |
| `content/references.json` | liste des logos clients | rendu par `renderClientStrip()` ; repli sur `CLIENTS_DATA` dans le script | `initClientStrip()` |

Points importants :

- **La surcharge gagne toujours sur la valeur par défaut.** Si vous modifiez un texte dans `site.js` sans modifier le JSON correspondant, le site continue d'afficher l'ancienne valeur du JSON. Modifiez les deux, ou seulement le JSON.
- Une valeur vide dans un JSON est ignorée : le site reprend la valeur par défaut. C'est la garantie « on ne peut pas vider le site ».
- Pour les photos, la surcharge ne s'applique que si le chemin diffère de celui du HTML ; dans ce cas la variante `.webp` de la balise `<picture>` est retirée, puisqu'elle correspondrait à l'ancienne image.
- Les coordonnées sont ré-appliquées après chaque changement de langue, parce que certains blocs traduits (page « merci ») contiennent des liens téléphone et email.

**Ajouter une zone à la console** : ajouter une collection dans `admin/config.yml` (le modèle `champs_texte`, défini en tête par une ancre YAML, sert à toutes les zones de textes), créer le fichier JSON correspondant, et pour les textes ajouter le nom du fichier à la constante `TEXT_FILES` dans `site.js`. Vérifiez le YAML avant de pousser : `npx js-yaml admin/config.yml`.

**Tester la console en local** : lancez `npx decap-server` dans le dépôt, ajoutez temporairement la ligne `local_backend: true` en tête de `admin/config.yml`, ouvrez `http://localhost:4177/admin/`. **Ne commitez jamais cette ligne.**

## 7 · Recettes : modifier la forme

### Changer une couleur, une taille, un espacement

Tout est dans `assets/site.css`. Les couleurs de la charte sont des variables CSS déclarées dans `:root` en tête de fichier (nom précédé de deux tirets) : `dark` (anthracite `#3D4452`), `ink` (texte), `brand-orange` (`#F26419`), `brand-green` (`#1FB85F`), `accent`, `muted`, etc. Modifier une variable change toutes ses utilisations. Cherchez la classe du composant (par exemple `.case-study`, `.linkedin-posts`, `.site-header`, `.footer`) pour un réglage local.

### Changer une mise en page

Le HTML des 13 pages est indépendant : l'en-tête, le menu mobile et le pied de page sont **dupliqués dans chaque page**. Une modification structurelle de ces blocs se fait donc 12 ou 13 fois. Faites-la par script (recherche et remplacement d'une chaîne exacte, avec comptage), jamais à la main page par page : le chapitre 9 montre le principe.

Conservez toujours les attributs `data-i18n`, `data-i18n-attr`, `data-coord`, `data-coord-href` et `data-photo` : ce sont eux qui relient le HTML à la console. Un attribut perdu, c'est un contenu qui redevient figé sans que personne ne s'en aperçoive. L'audit du chapitre 9 le détecte.

### Ajouter une réalisation (cas détaillé avec photos)

1. Les photos : demandez-les en qualité d'origine, anonymisées (visages, plaques, informations client). Redimensionnez à 1 600 px de large maximum, produisez un `.jpg` (qualité 85) et un `.webp` (qualité 80, outil `cwebp` de libwebp). Rangez-les dans `assets/images/<slug>/`. Ne commitez pas les originaux lourds.
2. Dans `realisations.html`, dupliquez un bloc `<article class="case-study">`, donnez-lui un nouvel identifiant et un nouveau préfixe de clés (`real.c7.eyebrow`, `real.c7.h`, `real.c7.p`, `real.c7.f1` à `f4`). Marquez ses images `data-photo="c7.1"` à `"c7.4"`. Un seul article porte la classe de mise en avant (`case-study` suivie du modificateur `dark`, fond gris clair) : le plus récent, en tête.
3. Ajoutez les 7 clés dans `site.js` (trois langues) et dans `content/textes/realisations.json`.
4. Ajoutez l'entrée du cas dans `content/realisations-photos.json` (chemins avec barre oblique initiale).
5. Optionnel : la carte LinkedIn correspondante dans la section « Publications LinkedIn » de la même page (clés `real.li.pN.label` et `.title`). La grille s'adapte au nombre de cartes.
6. Contrôle d'intégrité, prévisualisation, push.

Les intros de la page (« plusieurs cas détaillés », « nos publications récentes ») sont volontairement neutres : ne réintroduisez pas un nombre.

### Ajouter une page

Copiez la page la plus proche, changez le titre et la description (balises `<title data-i18n>` et `<meta name="description" data-i18n-attr>`), créez un nouveau préfixe de clés, ajoutez un fichier `content/textes/<page>.json`, sa collection dans `config.yml`, son nom dans `TEXT_FILES`, et un lien dans le menu (desktop et mobile, dans les 13 pages). Ajoutez la page au fichier `sitemap.xml` si celui-ci existe au moment où vous lisez ceci (voir chapitre 11).

### Changer le formulaire de contact

Les champs sont dans `contact.html`. Le script d'envoi en bas de la même page lit tous les champs du formulaire et les envoie à Web3Forms. Ajouter un champ ne demande aucune autre modification. La clé d'accès Web3Forms est celle du compte de Willy Taunay.

## 8 · Déployer et revenir en arrière

**Déployer** : `git push origin main`. Netlify détecte le commit, publie en une à deux minutes. Il n'y a pas de commande de build. Vérifiez sur `https://ener-co.netlify.app` avec un rafraîchissement forcé (Ctrl + F5).

**Revenir en arrière**, deux voies :

- Dans Netlify, onglet Deploys : chaque déploiement passé est conservé ; « Publish deploy » sur un ancien le remet en ligne immédiatement, sans toucher au dépôt. Utile en urgence.
- Dans Git : `git revert <commit>` puis push. Plus propre, l'historique reste cohérent.

Les commits de la console et les vôtres se mélangent sur `main` : c'est voulu. Ne travaillez pas sur une autre branche pendant des semaines, vous divergeriez du contenu édité par les collègues.

## 9 · Contrôles avant de pousser

Trois contrôles, à lancer depuis la racine du dépôt. Ils prennent quelques secondes et ont évité plusieurs régressions.

**Intégrité des langues et de la console** (Node) : le script suivant vérifie que `site.js` se charge, que les trois dictionnaires ont le même nombre de clés, qu'aucune clé utilisée dans une page n'est absente d'une langue, et que chaque clé utilisée existe dans un fichier de la console.

```js
const fs = require('fs');
const src = fs.readFileSync('assets/site.js', 'utf8').split(/\r?\n/);
const end = src.findIndex((l, i) => i > 2 && /^};\s*$/.test(l));
fs.writeFileSync('_t.cjs', src.slice(2, end + 1).join('\n').replace('const I18N =', 'module.exports ='));
const I = require('./_t.cjs'); fs.unlinkSync('_t.cjs');
console.log('fr', Object.keys(I.fr).length, 'en', Object.keys(I.en).length, 'it', Object.keys(I.it).length);
const used = new Set(), orph = [];
for (const f of fs.readdirSync('.').filter(f => f.endsWith('.html') && !f.startsWith('GUIDE'))) {
  const h = fs.readFileSync(f, 'utf8');
  for (const m of h.matchAll(/data-i18n="([^"]+)"/g)) { used.add(m[1]); if (!(m[1] in I.fr) || !(m[1] in I.en) || !(m[1] in I.it)) orph.push(f + ':' + m[1]); }
  for (const m of h.matchAll(/data-i18n-attr="([^"]+)"/g)) for (const p of m[1].split(',')) { const k = p.split(':')[1].trim(); used.add(k); if (!(k in I.fr)) orph.push(f + ':attr:' + k); }
}
const inJson = new Set();
for (const f of fs.readdirSync('content/textes')) for (const t of JSON.parse(fs.readFileSync('content/textes/' + f, 'utf8')).textes) inJson.add(t.cle);
console.log('orphelines :', orph.length ? orph.join(', ') : 'aucune');
console.log('absentes de la console :', [...used].filter(k => !inJson.has(k)).join(', ') || 'aucune');
```

**Audit de couverture** (dans la console du navigateur, sur le site servi) : liste, page par page, les textes visibles qui ne sont ni sous `data-i18n` ni sous `data-coord`, c'est-à-dire non éditables. Résultat attendu : seulement les noms de langues « Français / English / Italiano ». Le principe : parcourir les nœuds texte du `<body>` de chaque page chargée par `fetch`, remonter les parents à la recherche de ces attributs, et lister ce qui n'en a pas.

**Preuve sur le rendu** : ouvrez la page dans un navigateur, faites la modification réelle (ou une modification temporaire du JSON), constatez, remettez. Un test qui passe sur le code n'a jamais remplacé un regard sur l'écran. En particulier : les images en chargement différé ne se chargent pas hors écran, et une fenêtre de navigateur cachée ne dessine rien.

## 10 · Pièges connus

- **Dépôt dans OneDrive** : copies de conflit, fichiers restaurés d'une autre machine, `.claude/launch.json` modifié dans votre dos. Jamais.
- **Double tiret et tiret cadratin** : règle éditoriale du projet, aucun double tiret ni tiret cadratin dans les textes du site. Utiliser le point médian `·`, la virgule, ou reformuler.
- **La surcharge JSON gagne** : voir chapitre 6. Modifier `site.js` seul ne suffit pas pour un texte déjà présent dans un JSON.
- **Pages légales** : les valeurs contiennent des balises HTML (`<strong>`, `<br>`, `<a>`). Les cases EN et IT contiennent volontairement le texte français.
- **Menu mobile** : dupliqué dans chaque page, traduit par les mêmes clés `nav.*` que le menu desktop.
- **`@media (max-width)` s'applique aussi au papier** : une page A4 imprimée fait environ 700 px utiles. Toute règle destinée aux petits écrans doit être écrite `@media screen and (max-width: …)`, sinon elle s'applique à l'impression.
- **Chemins d'images dans les JSON** : avec barre oblique initiale (`/assets/…`) pour que la console les affiche depuis `/admin/`.
- **`local_backend: true`** dans `config.yml` : pour tester la console en local uniquement, à ne jamais pousser.
- **Avertissements `LF will be replaced by CRLF`** à chaque commit : sans conséquence.
- **Mentions légales** : au moment de la rédaction, elles indiquent encore « Hébergeur : OVH SAS ». L'hébergeur est Netlify ; OVH ne gère que le domaine. À corriger dans la console.

## 11 · Ce qui reste à faire (état au 22 septembre 2026)

1. **Pointer `ener-co.fr` sur Netlify** : dans Netlify, Domain management, ajouter le domaine ; chez OVH, un enregistrement A pour la racine et un CNAME pour `www`, sans toucher aux MX (messagerie). Puis dans Netlify Identity, vérifier que les liens d'invitation utilisent la bonne adresse.
2. **Avant la bascule du domaine** : ajouter dans `netlify.toml` les redirections 301 des dix anciennes URL WordPress (`/gaines-a-barres/`, `/nos-clients/`, `/contact/`, `/mentions-legales/`, `/politique-de-confidentialite/`, `/panneaux-photovoltaiques/`, `/pupitres-simulateurs/`, `/transfert-industriel/`, `/2020/10/25/bonjour-tout-le-monde/`) vers les pages équivalentes, et créer `sitemap.xml` et `robots.txt` (absents aujourd'hui). Déclarer le sitemap dans Google Search Console.
3. **Contrat SITSEO** (ancien prestataire, hébergeur de l'ancien site WordPress chez IONOS) : à dénoncer à son échéance ; sans lien technique avec le nouveau site.
4. **Photos de chantier et offres d'emploi comme données structurées** : les textes sont éditables, l'ajout d'une réalisation ou d'une offre entièrement nouvelle reste une opération de code (chapitre 7).
5. **Texte alternatif des images** : écrit en dur dans le HTML, non éditable par la console. Marginal.

## 12 · Références rapides

- Site : `https://ener-co.netlify.app`
- Console : `https://ener-co.netlify.app/admin/`
- Tutoriel des collègues : PDF sur le serveur interne (source : `docs/GUIDE-CONSOLE.html`, à regénérer sans y laisser les identifiants)
- Dépôt : `https://github.com/SA-REMI/Ener-Co-site-livraison`
- Netlify : `https://app.netlify.com`, projet `ener-co`
- Decap CMS (documentation de la console) : `https://decapcms.org/docs/`
- Web3Forms : `https://web3forms.com`

Interlocuteur : Willy Taunay, Ener-Co, `willy.taunay@sa-remi.fr`.
