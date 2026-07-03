# QUALITY_GATE.md — Contrôles de fin de tâche

> Avant de déclarer une tâche terminée, Claude doit dérouler cette checklist sur le **périmètre modifié** (pas tout le repo), puis produire le rapport final au format défini en bas de page.
>
> Ne vérifier que les sections touchées par la tâche : une tâche 100 % backend ne déclenche pas la section Mobile, et inversement. Une section non concernée est notée `N/A` dans le rapport.
>
> **Pré-requis systématiques (avant de coder, pas seulement avant de conclure) :**
> - Les flux touchés ont été vérifiés contre les diagrammes de [workflow/](./workflow/) — un écart entre le code et le diagramme se résout explicitement (corriger le code ou mettre à jour le diagramme).
> - Tout appel réseau ou évolution d'endpoint est conforme au contrat [API.md](./API.md) (auth Bearer/API-Key, préfixe `/api/v1`, format `{ success, data, message, timestamp }`).

---

# Mobile (`InvoiceGenerator/`)

## Navigation correcte

- [ ] Tout nouvel écran est accessible depuis un flux réel (aucun écran orphelin).
- [ ] Navigation uniquement via `expo-router` (`router.push/replace`) — jamais `useNavigation` de `@react-navigation/native`.
- [ ] Le retour arrière (geste iOS + bouton Android) laisse l'app dans un état cohérent, notamment dans le wizard (`newInvoice` non corrompu).
- [ ] L'auth gate de `app/_layout.tsx` couvre le nouvel écran (pas d'écran protégé accessible sans login).

## Cohérence UX (parcours)

- [ ] Toute chaîne visible par l'utilisateur est en **français correct** (pas de label anglais, pas de titre de dev type « Yoopiii », accents inclus dans les headers).
- [ ] Après une action irréversible (sauvegarde de facture, complétion d'onboarding), navigation en `router.replace` — le retour arrière ne doit jamais re-exposer l'écran de commit.
- [ ] Montants affichés de façon uniforme (`formatNumberWithSpaces` + devise du **profil**) — jamais de devise en dur.
- [ ] Flux multi-étapes : progression visible (« étape X/N ») et étapes conformes au diagramme `workflow/` correspondant.
- [ ] Un seul CTA primaire par écran ; couleurs issues de la palette existante (pas de nouveau bleu/vert ad hoc).
- [ ] Toute erreur montrée à l'utilisateur offre une issue (réessayer, corriger) — jamais un échec silencieux en `console.error`.

## Responsive

- [ ] Aucune dimension en dur qui casse sur petit écran (utiliser flex/`%`/classes Tailwind adaptatives).
- [ ] Les zones sensibles respectent `SafeAreaView` / `react-native-safe-area-context` (notch, home indicator).
- [ ] Les formulaires restent utilisables clavier ouvert (`KeyboardAwareScrollView`).

## Gestion Android

- [ ] Comportement vérifié du bouton back matériel.
- [ ] Pas d'API iOS-only sans fallback (ex. `context-menu`, haptics).
- [ ] Build dev EAS ou `expo run:android` passe si du natif/config a changé (`app.json`, plugins, expo-build-properties).

## Gestion iOS

- [ ] Pas d'API Android-only sans garde `Platform.OS`.
- [ ] Modales et date pickers testés (comportements `@react-native-community/datetimepicker` divergent selon l'OS).
- [ ] Permissions déclarées dans `app.json` (`infoPlist`) si une capability est ajoutée.

## Accessibilité

- [ ] Éléments tactiles ≥ 44×44 pt avec `accessibilityLabel`/`accessibilityRole` sur les contrôles custom.
- [ ] Contraste texte/fond suffisant (pas de gris clair sur blanc).
- [ ] Les erreurs de formulaire sont annoncées textuellement, pas seulement par la couleur.

## Dark Mode

- [ ] Pas de couleur codée en dur qui devient illisible en thème sombre ; si le dark mode n'est pas supporté sur l'écran, `userInterfaceStyle` doit rester cohérent dans `app.json`.

## Offline

- [ ] La fonctionnalité marche **sans réseau** (l'app est local-first) : aucun appel `domain/` bloquant dans un parcours critique.
- [ ] Nouvel état persisté → ajouté au store Zustand + fonction `migrate` mise à jour pour les utilisateurs existants.
- [ ] Échec réseau → message utilisateur, jamais de crash ni de spinner infini.

## Gestion mémoire

- [ ] Tout `useEffect` avec souscription (Firebase, listeners, timers) retourne sa fonction de cleanup.
- [ ] Pas d'accumulation de fichiers : les PDFs générés dans `documentDirectory` sont réutilisés ou nettoyés.
- [ ] Pas de setState après unmount (garde ou abort).

## Performance

- [ ] Listes longues virtualisées (Animated.FlatList), jamais de `.map()` dans un ScrollView pour des données non bornées.
- [ ] Pas de travail lourd (génération PDF, parsing) sur le fil du rendu — déclenché par action utilisateur ou différé.

## Pas de re-render inutile

- [ ] Sélecteurs Zustand ciblés (`useStore((s) => s.invoices)`) — jamais `useStore()` entier dans un écran.
- [ ] Callbacks passés aux listes mémoïsés (`useCallback`) si la liste est volumineuse.
- [ ] Pas d'objet/tableau littéral recréé à chaque rendu passé en prop à un composant mémoïsé.

## Animations fluides

- [ ] Animations via `react-native-reanimated` (thread UI) ou Lottie — pas de `Animated` JS-driven sur un parcours chaud.
- [ ] Transitions d'écran et entrées/sorties de liste sans à-coups sur un device réel (pas seulement le simulateur).

---

# Backend (`invoice-backend/`)

## Architecture respectée

- [ ] Chaîne middleware : `[verifyFirebaseToken, checkSubscription?, sanitizeInput, handler]` — `verifyFirebaseToken` **toujours en premier**.
- [ ] Logique métier dans `src/services/` (classes statiques, retours en objets plain) — pas de logique inline nouvelle dans les routes.
- [ ] Réponses uniquement via `ResponseFormatter.success/error/paginated/created/noContent`.
- [ ] `senders.js` et `profile.js` n'ont pas servi de modèles (non conformes).

## Validation

- [ ] Toute entrée validée avant le service : validator statique `{ isValid, errors }` + regex dans `validation.constants.js`.
- [ ] Échec de validation → `ResponseFormatter.error(res, VALIDATION.INVALID_DATA, 400, errors)`.
- [ ] Attention : `findByIdAndUpdate` + `runValidators` ne déclenche pas les validators custom des sous-documents — valider en amont.

## Gestion erreurs

- [ ] Chaque handler async est protégé (`asyncHandler` ou try/catch) — aucune promesse non catchée.
- [ ] Erreur loggée au format : `logger.error(\`ROUTE /path failed - ${error.message}\`)`.
- [ ] Aucun détail interne (stack, requête Mongo) ne fuite dans la réponse client.

## Logs

- [ ] Logs via Winston (`src/utils/logger.js`) — pas de `console.log`.
- [ ] Aucun secret ni donnée personnelle dans les logs (rappel : `cloudinary.config.js` a déjà fauté).
- [ ] Actions significatives tracées via `AuditTrailService.logAction()` avec une action **de l'enum uniquement** — et pas de double-log avec `auditMiddleware`.

## Sécurité

- [ ] **Chaque requête MongoDB filtre par `userId: req.user.uid`** — c'est le contrôle n°1, sans exception.
- [ ] Pas de query params passés bruts à `find()` (whitelist des filtres).
- [ ] Rate limiting adapté si l'endpoint est coûteux (PDF, IA, auth).
- [ ] Secrets uniquement via `.env` — jamais en dur, jamais commités.

## Permissions

- [ ] Quotas de plan appliqués (`checkSubscription` / `checkInvoiceLimit`) si la ressource est facturable.
- [ ] Un utilisateur ne peut ni lire ni modifier une ressource d'un autre `userId` (tester avec un second token).
- [ ] Routes API-key (`verifyApiKey`) : périmètre limité à ce que la clé autorise.

---

# MongoDB

## Index

- [ ] Nouveau champ requêté fréquemment → index déclaré dans le schéma (dont `userId` sur toute nouvelle collection).
- [ ] Recherche texte → index texte (modèle : Recipient).
- [ ] Unicité métier (ex. `tag`) → index unique + gestion du conflit E11000 dans le service.

## Transactions

- [ ] Écritures multi-documents dépendantes (ex. facture + audit + quota) : soit transaction/session Mongoose, soit ordre d'écriture tolérant à l'échec partiel — le choix est justifié.
- [ ] Pas de lecture-puis-écriture racée sur les compteurs (préférer `$inc` / opérations atomiques).

## Optimisation

- [ ] Listes : `limit` + `skip`/curseur, jamais de `find()` non borné.
- [ ] Projections : ne remonter que les champs utiles ; champs sensibles en `select: false` respectés.
- [ ] Soft delete filtré : `deleted`/`archived` exclus explicitement quand il n'y a pas de pre-find hook (cas Devis).

---

# API

## Statuts HTTP

- [ ] 200 lecture, 201 création (`ResponseFormatter.created`), 204 suppression (`noContent`), 400 validation, 401 token, 403 permission/quota, 404 introuvable, 409 conflit d'unicité.
- [ ] Jamais de 200 pour signaler une erreur.

## Pagination

- [ ] Toute liste répond via `ResponseFormatter.paginated` avec `page`/`limit` (et un `limit` max plafonné).

## Tri

- [ ] Paramètre `sort` supporté ou tri par défaut documenté (création décroissante) ; champ de tri whitelisté.

## Validation

- [ ] Params d'URL validés (`validateObjectId` pour les ids), body validé par le validator, query params typés.

## Swagger

- [ ] `src/docs/swagger.js` mis à jour **dans le même commit** que la route.
- [ ] `node scripts/check-swagger-coverage.js` passe (nouveau fichier de route → ajouté au `ROUTE_MAP`).

---

# Tests

## Unitaires

- [ ] Mobile : **aucune infrastructure de test n'existe** — ne pas en créer sans demande explicite (règle CLAUDE.md). Vérification = `npm run lint` + `npx tsc --noEmit`.
- [ ] Backend : logique pure nouvelle (calculs, validators) couverte par un test Mocha dans `tests/` si le module s'y prête.

## Intégration

- [ ] Backend : tout endpoint créé/modifié a son scénario Bruno dans `bruno/<ressource>/` (cas nominal + cas d'erreur).
- [ ] La suite passe : `npx @usebruno/cli run --env local bruno/`.

---

# Documentation

## Mise à jour nécessaire

- [ ] `CLAUDE.md` si une convention ou commande change.
- [ ] `FILES.md` si un dossier/fichier structurant est ajouté.
- [ ] `PROJECT.md` si la stack, un flux principal ou une contrainte évolue.
- [ ] `MEMORY.md` si une décision d'architecture durable est prise.
- [ ] `workflow/*.md` si un parcours utilisateur change ; `fonctionnalités.md` si une fonctionnalité est ajoutée/retirée.
- [ ] Backend : `API.md` / `swagger.js` synchronisés avec les routes.

---

# Rapport final

À produire à la fin de chaque tâche, avant de conclure. Une ligne par section applicable, puis un verdict global.

**Niveaux :**

| Niveau | Signification | Conséquence |
|---|---|---|
| ✅ **PASS** | Tous les contrôles de la section passent. | Rien à faire. |
| ⚠️ **WARNING** | Écart non bloquant : dette assumée, contrôle non vérifiable ici (ex. test sur device réel), ou amélioration recommandée. | Livrable, mais l'écart est listé explicitement. |
| ❌ **FAIL** | Contrôle bloquant violé (sécurité `userId`, validation absente, écran cassé, Swagger manquant…). | **La tâche n'est pas terminée** : corriger avant de conclure. |

**Format :**

```
## Rapport Quality Gate

| Section | Verdict | Détail |
|---|---|---|
| Mobile — Navigation | ✅ PASS | — |
| Mobile — Offline | ⚠️ WARNING | migrate() non testé avec un ancien store réel |
| Backend — Sécurité | ✅ PASS | Filtre userId vérifié sur les 3 requêtes |
| API — Swagger | ❌ FAIL | POST /invoices/:id/remind non documenté |
| Tests — Intégration | ✅ PASS | 2 scénarios Bruno ajoutés |
| Documentation | ✅ PASS | workflow/04 mis à jour |

**Verdict global : FAIL** — corriger swagger.js avant livraison.
```

Règle de verdict global : `FAIL` si au moins un ❌ ; sinon `WARNING` si au moins un ⚠️ ; sinon `PASS`.
