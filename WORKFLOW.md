# WORKFLOW.md — Processus de développement Myfakto

> Processus **obligatoire** pour tout développement (humain ou Claude Code), du bug fix à la fonctionnalité.
>
> ⚠️ Ne pas confondre : **`WORKFLOW.md`** (ce fichier — comment on développe) ≠ **`workflow/`** (les diagrammes Mermaid des parcours utilisateur — ce que l'app fait).

---

## Les 12 étapes

Chaque étape produit un livrable et a une condition de blocage : on ne passe pas à la suivante tant qu'elle n'est pas remplie.

### Phase A — Comprendre (étapes 1–5)

| # | Étape | Action concrète | Bloquant si… |
|---|---|---|---|
| 1 | **Comprendre la demande** | Reformuler en une phrase : quoi, pour qui, pourquoi. Identifier ce qui est explicitement **hors périmètre**. | La demande est ambiguë → poser la question avant de lire quoi que ce soit. |
| 2 | **Lire MEMORY.md** | Vérifier les décisions d'architecture et règles durables qui touchent la tâche (local-first, store unique, statuts français, typo `onbording`…). | La tâche contredit une décision actée → voir la règle d'arrêt ci-dessous. |
| 3 | **Lire QUALITY_GATE.md** | Repérer **à l'avance** les sections du gate que la tâche déclenchera (Mobile ? Backend ? MongoDB ? API ?) — on code en connaissant ses critères de sortie. | — |
| 4 | **Lire FILES.md** | Localiser les dossiers concernés : contenu autorisé/interdit, dépendances autorisées. Utiliser la section « Si je veux… » si le cas y figure. | Le plan nécessiterait de mettre du code dans un dossier où il est interdit. |
| 5 | **Lire API.md + workflow/** | Si la tâche touche un appel réseau ou un endpoint : relire le contrat (`API.md` §conventions + §15 intégration mobile). Si elle touche un parcours utilisateur : relire le diagramme correspondant dans `workflow/`. | Le changement casserait le contrat v1 (champ renommé, format modifié) → c'est un versionnement, pas un patch. |

### Phase B — Décider (étapes 6–7)

| # | Étape | Action concrète | Bloquant si… |
|---|---|---|---|
| 6 | **Évaluer les impacts** | Lister : fichiers touchés, données persistées affectées (→ `migrate()` ?), contrat API affecté (→ les deux copies d'`API.md` ?), parcours modifié (→ `workflow/` ?), risque de régression sur le wizard/l'auth gate. | Un impact touche les données persistées des utilisateurs existants sans plan de migration. |
| 7 | **Proposer un plan** | Plan court : étapes ordonnées, fichiers précis, ce qui n'est **pas** fait. Pour une tâche non triviale, le présenter avant de coder. | Le plan casse une convention documentée → **règle d'arrêt** (ci-dessous). |

### Phase C — Réaliser (étapes 8–9)

| # | Étape | Action concrète | Bloquant si… |
|---|---|---|---|
| 8 | **Développer** | Suivre les conventions : `MOBILE_GUIDELINES.md` côté app, règles CLAUDE.md du backend côté API. Petits commits cohérents. Route backend modifiée = `swagger.js` dans le **même commit**. | — |
| 9 | **Vérifier les tests** | Mobile : `npx tsc --noEmit` + `npm run lint` (pas de suite de tests — ne pas en créer sans demande). Backend : `npm test` (Mocha) + scénario Bruno ajouté/mis à jour pour tout endpoint touché (`npx @usebruno/cli run --env local bruno/`). | Un test échoue → corriger avant de continuer, jamais de test désactivé pour passer. |

### Phase D — Livrer (étapes 10–12)

| # | Étape | Action concrète | Bloquant si… |
|---|---|---|---|
| 10 | **Vérifier QUALITY_GATE.md** | Dérouler les sections identifiées à l'étape 3 sur le périmètre modifié. Produire le rapport PASS/WARNING/FAIL. | Un ❌ FAIL → la tâche n'est **pas terminée**, retour à l'étape 8. |
| 11 | **Mettre à jour la documentation** | Au même commit : `workflow/` si un parcours change, `API.md` (les **deux copies**) si le contrat change, `FILES.md` si la structure change, `MEMORY.md` si une décision durable est prise, `fonctionnalités.md` si une fonctionnalité apparaît/disparaît. | La doc contredirait le code livré. |
| 12 | **Résumer les changements** | Résumé pour un relecteur : ce qui a changé et pourquoi, fichiers touchés, rapport quality gate, ce qui reste volontairement non fait. | — |

---

## 🛑 Règle d'arrêt — convention cassée

Si à n'importe quelle étape la modification envisagée **casse une convention documentée** (MEMORY.md, FILES.md, API.md, MOBILE_GUIDELINES.md, CLAUDE.md) :

1. **S'arrêter avant d'implémenter.**
2. Exposer : la convention concernée (fichier + règle), pourquoi la tâche la remet en cause, les alternatives (respecter la convention autrement / la faire évoluer).
3. **Attendre la confirmation explicite de l'utilisateur.**
4. Si la convention évolue : mettre à jour le document de référence **dans le même commit** que le code — une convention cassée silencieusement est pire qu'une convention absente.

Exemples concrets : ajouter un second store Zustand, envoyer `total` au backend, renommer `onbording/`, répondre hors `ResponseFormatter`, requête Mongo sans `userId`, brancher partiellement la sync `domain/` avant la décision post-MVP.

---

## Mode allégé (micro-tâches)

Pour une modification **sans impact structurel** — typo, libellé, ajustement de style NativeWind, commentaire :

- Étapes 1, 8, 9 (tsc + lint), 12 suffisent.
- Dès que la modification touche le store, une route, un parcours, un formulaire ou une dépendance → processus complet, sans exception.
- En cas de doute sur le mode applicable → processus complet.

---

## Rappels d'ancrage

- L'ordre de lecture (étapes 2–5) va du plus durable au plus spécifique : décisions → critères de sortie → structure → contrats.
- Le rapport de l'étape 10 utilise le format défini dans [QUALITY_GATE.md](./QUALITY_GATE.md) (verdict global : FAIL > WARNING > PASS).
- Objectif courant du projet : **MVP store** — en cas d'arbitrage, la checklist « Prêt pour le store » de [MOBILE_GUIDELINES.md](./MOBILE_GUIDELINES.md) prime sur toute amélioration hors périmètre.
