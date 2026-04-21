# Brief d'intégration WordPress — Site Ener-Co

**Destinataire** : équipe d'intégration WordPress
**Client** : Ener-Co SAS
**Objet** : migration de la maquette HTML statique vers un site WordPress multilingue FR / EN

---

## 1. Livrable

Dossier `Ener-Co-site-livraison/` contenant :

```
Ener-Co-site-livraison/
├── index.html              → page Accueil
├── expertise.html          → page Expertise (périmètre 6 cards + approche)
├── realisations.html       → page Réalisations (3 case studies + liens LinkedIn)
├── references.html         → page Références (bandeau certifications + 36 logos + carte Europe + MASE)
├── secteurs.html           → page Secteurs (10 secteurs avec tags métier)
├── recrutement.html        → page Recrutement (offre active + candidature spontanée)
├── contact.html            → page Contact (formulaire qualifié + coordonnées)
├── 404.html                → page erreur
├── assets/
│   ├── site.css            → feuille de style unique
│   ├── site.js             → JS i18n FR/EN + nav + année
│   ├── enerco-logo.png
│   ├── favicon.png
│   ├── logo-mase.jpg
│   ├── europe-map-reference.png
│   ├── brochure-ener-co-2026.pdf
│   ├── images/             → 12 photos chantier (Saint-Gaudens, Chaufferie, Fibre Excellence)
│   └── logos/              → 42 logos clients / partenaires
└── BRIEF-INTEGRATION.md    → ce document
```

Toutes les pages sont fonctionnelles en ouverture directe (double-clic) et ne nécessitent qu'un navigateur moderne (Chrome, Firefox, Safari, Edge 2022+).

---

## 2. Structure des pages WordPress

| Fichier source | Slug WP | Titre WP | Template |
|---|---|---|---|
| `index.html` | `/` (homepage) | Ener-Co · Distribution d'énergie industrielle | front-page |
| `expertise.html` | `/expertise` | Expertise | page-expertise |
| `realisations.html` | `/realisations` | Réalisations | page-realisations |
| `references.html` | `/references` | Références | page-references |
| `secteurs.html` | `/secteurs` | Secteurs | page-secteurs |
| `recrutement.html` | `/recrutement` | Recrutement | page-recrutement |
| `contact.html` | `/contact` | Contact | page-contact |
| `404.html` | (erreur 404) | Page introuvable | 404.php |

---

## 3. Design tokens (à reproduire fidèlement)

### Typographie
- **Police unique** : Inter (Google Fonts, poids 400 / 500 / 600 / 700)
- Pas d'autre police. Ne pas utiliser Manrope, Space Grotesk, Montserrat, etc.

### Palette
| Variable | Valeur | Usage |
|---|---|---|
| `--bg` | `#f3f4f6` | fond général |
| `--bg-alt` | `#ebedf0` | fond section alternée |
| `--surface` | `#ffffff` | cartes |
| `--ink` | `#0f1419` | texte principal |
| `--ink-2` | `#1b2129` | anthracite secondaire |
| `--muted` | `#5a6470` | texte secondaire |
| `--line` | `rgba(15, 20, 25, 0.09)` | bordures légères |
| `--accent` | `#d8541a` | orange industriel (accent unique) |
| `--accent-ink` | `#b23f0d` | orange foncé (text on light) |
| `--dark` | `#14181d` | fond footer + sections sombres |

### Rayons
- `--r-sm: 4px` · `--r-md: 8px` · `--r-lg: 12px` · `--r-xl: 16px`

### Espacements types
- Section standard : `padding: 88px 0` (desktop) / `60px 0` (mobile)
- Container : `width: min(100% - 32px, 1360px)`

---

## 4. Composants répétés (à transformer en blocs Gutenberg ou ACF)

### Composants identifiés dans la maquette

| Composant | Classe CSS racine | Usage | Recommandation back-office |
|---|---|---|---|
| Hero de page | `.page-hero` | toutes les pages sauf home | ACF Flexible Content : titre + lede + image |
| Band stats | `.stats-band` | home | Repeater ACF : 4 items (titre + description) |
| Cards expertise | `.scope-item` dans `.scope-grid` | expertise, home | Repeater 6 items |
| Cards approche | `.diff-item` dans `.diff-list` | expertise | Repeater 4 items |
| Case study | `.case-study` (light et `.case-study--dark`) | realisations | Flexible layout : mode clair/sombre + galerie photos (3 / 4 / 5) + 4 facts |
| Logo wall | `.logo-wall` dans `.logo-wall-group` | references, home | Repeater : image + alt + groupe (clients / partenaires) |
| Map showcase | `.map-showcase` | references | Statique (image Europe + 6 cartes pays) |
| MASE card | `.mase-card` | references | ACF group |
| Secteurs cards | `.sector-card` dans `.sectors-grid` | secteurs | Repeater 10 items : icône SVG + titre + description + tags |
| CTA final | `.cta-final` | toutes | Global footer bloc ou ACF |
| Formulaire contact | `.contact-form` | contact | Contact Form 7 ou WPForms recommandé |

### Champs éditables prioritaires (ACF minimum)

**Par page** :
- `hero_eyebrow` (text)
- `hero_title` (text)
- `hero_lede` (textarea)
- `hero_image` (image)
- `cta_eyebrow` / `cta_title` / `cta_text` / `cta_button_label` / `cta_button_url`

**Home supplémentaire** :
- `stats` (repeater 4 × {dt, dd})
- `teaser_expertise` (repeater 3 × {num, h3, p})
- `teaser_realisations` (repeater 3 × {image, sector, title, excerpt, url})
- `logo_wall_teaser` (repeater 12 × image)

**Réalisations** :
- `case_studies` (repeater variable × {variant: light/dark, eyebrow, title, lede, photos[], facts[]})

**Références** :
- `logos_clients` (repeater × {image, alt})
- `logos_partners` (repeater × {image, alt})
- `countries` (repeater 6 × {code, name, note, is_primary})

**Secteurs** :
- `sectors` (repeater 10 × {svg_icon, title, description, tags[]})

**Contact** :
- Formulaire via Contact Form 7 (envoi vers `contact@ener-co.fr`)

---

## 5. Multilingue FR / EN

### Plugin recommandé
**Polylang** (gratuit, 2 langues supportées nativement). Alternative : WPML si déjà en place.

### Chaînes à traduire

Les textes à traduire sont listés dans `assets/site.js` dans l'objet `I18N` (sections `fr` et `en`). À reproduire dans Polylang :

- Navigation (Accueil, Expertise, Réalisations, Secteurs, Références, Contact, Nous consulter)
- Footer (tous les labels)
- Toutes les chaînes longues par page (hero, section headers, cards, CTA)

### Gestion de la navigation
- Créer 2 menus WordPress (FR et EN)
- Sélecteur de langue dans le header (visuel fourni)

### Traductions côté serveur
Remplacer l'i18n JavaScript actuel (maquette statique) par le fonctionnement natif WordPress + Polylang. Le JS i18n peut être supprimé une fois l'intégration WP faite.

---

## 6. Mentions légales (données exactes à intégrer)

Ces données sont définitives, à reproduire telles quelles dans le footer et/ou une page dédiée `/mentions-legales` :

```
Ener-Co SAS
Société par actions simplifiée
Capital social : 45 000 €
RCS Lyon 809 073 992
SIRET : 809 073 992 00012
TVA intracom. : FR09 809073992
Code APE : 43.21A (Travaux d'installation électrique dans tous locaux)
Siège social : 11 rue Sigmund Freud, 69120 Vaulx-en-Velin, France
Téléphone : +33 (0)4 26 07 67 79
Email : contact@ener-co.fr
Responsable de la publication : Direction Ener-Co
```

### À compléter par l'hébergeur (obligation LCEN art. 6)
Les coordonnées de l'hébergeur (nom, adresse postale, téléphone) doivent être ajoutées dans le footer et la page `/mentions-legales` dès la mise en ligne. Emplacement prévu dans le bloc `.footer__legal`.

### Certifications affichées
Le site mentionne uniquement la **certification MASE Rhône-Alpes** (réelle et active). Aucune autre qualification n'est affichée à ce stade. Si Ener-Co obtient ultérieurement une certification Qualifelec, Qualibat, ISO 9001, RGE ou autre, les blocs concernés (footer col « Société », page `/references` bandeau certifications) pourront être enrichis.

### Pages légales à créer (stubs à remplir par Ener-Co)
- `/mentions-legales` (peut reprendre le bloc footer étendu)
- `/politique-de-confidentialite` (RGPD)
- `/cgv` (si vente en ligne, sinon facultatif)

---

## 7. SEO

Chaque page contient déjà :
- `<title>` optimisé par page
- `<meta name="description">` personnalisée
- Open Graph (og:title, og:description, og:image, og:locale)
- JSON-LD `ElectricalContractor` sur `index.html` (à reproduire sur toutes les pages si possible)
- `hreflang` FR / EN

### À faire côté WP
- Plugin SEO : **Yoast SEO** ou **Rank Math** (gratuit)
- Vérifier que les meta `<title>` / `<description>` sont bien reprises par le plugin
- Générer sitemap XML automatique (plugin)
- Configurer `robots.txt`

---

## 8. Performance & accessibilité

### Déjà fait dans la maquette
- `loading="lazy"` sur toutes les images hors above-the-fold
- `font-display: swap` sur Inter
- Skip link `#main`
- `:focus-visible` avec outline orange
- Tous les `alt` présents
- Smooth scroll CSS natif

### À vérifier côté WP
- Compression images WebP (plugin Imagify ou ShortPixel recommandé)
- Cache serveur (WP Rocket ou plugin équivalent)
- Test accessibilité : WCAG AA (contrastes déjà conformes dans la maquette)
- PageSpeed Insights objectif : > 90 desktop, > 70 mobile

---

## 9. Plugins WordPress recommandés

| Fonction | Plugin recommandé | Gratuit |
|---|---|---|
| Multilingue FR/EN | **Polylang** | Oui (2 langues) |
| Champs personnalisés | **ACF (Advanced Custom Fields)** | Oui, Pro pour repeaters |
| Formulaire contact | **Contact Form 7** ou **WPForms Lite** | Oui |
| SEO | **Rank Math** | Oui |
| Cache | **WP Rocket** ou **W3 Total Cache** | Payant / Oui |
| Images WebP | **Imagify** ou **ShortPixel** | Freemium |
| RGPD | **Complianz** ou **Cookiebot** | Freemium |

---

## 10. Checklist avant mise en ligne

- [ ] 6 pages publiées avec bon slug et bon template
- [ ] Menu principal FR et EN configurés
- [ ] Mentions légales complètes (y compris hébergeur)
- [ ] Formulaire de contact testé (envoi vers `contact@ener-co.fr`)
- [ ] Sitemap.xml généré et soumis à Google Search Console
- [ ] Certificat SSL actif (HTTPS)
- [ ] Plugin RGPD installé et bandeau cookies configuré
- [ ] Tests navigateurs : Chrome, Firefox, Safari, Edge (desktop + mobile)
- [ ] Test responsive : 1440 / 1280 / 1024 / 768 / 375 px
- [ ] Vérification accessibilité (contrastes, navigation clavier)
- [ ] PageSpeed > 85 desktop / > 65 mobile
- [ ] Redirection 301 depuis l'ancien site si applicable

---

## 11. Contact projet

**Ener-Co SAS**
11 rue Sigmund Freud, 69120 Vaulx-en-Velin
Tél. +33 (0)4 26 07 67 79
`contact@ener-co.fr`

Responsable communication : Responsable communication Ener-Co

---

## 12. Notes additionnelles

### Logos clients
Les 42 logos dans `assets/logos/` sont affichés en monochrome au repos (`filter: grayscale(1)`) et retrouvent leur couleur au survol (`opacity: 1`). Ce comportement est conforme aux pratiques premium B2B et doit être conservé.

### Photos chantiers
12 photos natives (Saint-Gaudens, Chaufferie gaz 2000 A, Fibre Excellence Eta-com) sont incluses dans `assets/images/`. Elles sont publiables en l'état. Prévoir une zone de médiathèque dédiée "Chantiers" si de nouveaux chantiers sont ajoutés.

### Carte Europe
L'image `assets/europe-map-reference.png` est une carte statique. Si le client souhaite une version interactive (clic pays → page dédiée), prévoir un refactor en SVG avec `<a>` wrappers.

### Contenu à faire évoluer avec Ener-Co
- Rajouter des photos hero alternatives (actuellement la même Saint-Gaudens est réutilisée sur home et expertise)
- Compléter les chiffres-clés (bandeau stats de la home) avec des données concrètes (MW installés, mètres de GAB, effectif)
- Ajouter une page blog / actualités si besoin

---

*Fin du brief. Document rédigé pour faciliter une intégration WordPress fidèle de la maquette HTML.*
