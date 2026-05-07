# Fonctionnalités de Fatourty

Liste de toutes les fonctionnalités réellement implémentées et fonctionnelles dans l'application.

---

## Authentification

- Connexion par email / mot de passe (Firebase Auth JS SDK)
- Inscription par email / mot de passe
- Persistance de session via `auth.onAuthStateChanged` dans le layout racine
- Déconnexion (réinitialise le store et redirige vers l'onboarding)

---

## Onboarding (premier lancement)

- Écran de bienvenue avec sélection de pays (modal), langue (modal) et devise (chips)
- Saisie du taux de TVA par défaut
- Écran de création du profil entreprise (nom, adresse, TVA)
- Navigation séquentielle entre les étapes (`index → profile → completed`)
- Flag `onboardingCompleted` persisté : redirige automatiquement vers l'app principale lors des lancements suivants

---

## Création de facture (assistant multi-étapes)

- Démarrage d'une nouvelle facture via `store.startNewInvoice()` (pré-remplit l'émetteur depuis le profil, génère le numéro)
- **Étape 1 – Informations** : numéro de facture éditable, date d'émission, date d'échéance (validation Zod + React Hook Form)
- **Étape 2 – Destinataire** :
  - Sélection d'un contact existant si des contacts sont enregistrés (`contact.tsx`)
  - Création d'un nouveau contact si aucun n'existe (`new-contact.tsx`)
- **Étape 3 – Désignations** : liste dynamique d'articles (ajout / suppression), saisie de désignation, quantité et prix unitaire, calcul du total par ligne en temps réel
- **Étape 4 – Récapitulatif** : affichage complet (émetteur, destinataire, articles, sous-total, total)
- Confirmation et sauvegarde : `store.saveInvoice()` → redirige vers l'écran de succès
- Reprise d'une facture en cours depuis l'écran d'accueil

---

## Gestion des factures

- Liste de toutes les factures avec numéro, destinataire, montant total et date
- Filtrage par statut : Toutes / Payées / Impayées / En retard
- Filtrage par année (date picker)
- Suppression d'une facture avec alerte de confirmation
- Animations de liste (entrée/sortie fluide via `react-native-reanimated`)
- **Détail d'une facture** :
  - Affichage du numéro, dates, client, articles, total et statut
  - Génération automatique du PDF à l'ouverture de l'écran
  - Partage du PDF via le système natif (`expo-sharing`)
  - Marquage de la facture comme payée
  - Suppression depuis l'écran de détail

---

## Génération de PDF

- Rendu HTML → PDF via `expo-print`
- Contenu : en-tête, émetteur, destinataire, tableau des désignations, sous-total, TVA, droit de timbre, total
- Sauvegarde dans `FileSystem.documentDirectory` sous le nom `facture-{invoiceNumber}.pdf`
- Partage natif du fichier PDF

---

## Contacts

- Ajout automatique du destinataire comme contact lors de la sauvegarde d'une facture (pas de doublon)
- Liste de tous les contacts avec avatar initiales
- Recherche en temps réel par nom
- Suppression d'un contact via menu contextuel (appui long) avec confirmation
- Modification d'un contact (nom, adresse, TVA, email)
- Création rapide d'une nouvelle facture directement depuis la fiche contact (pré-sélectionne le destinataire)

---

## Paramètres

- Affichage du nom de l'entreprise en en-tête
- Modification du profil entreprise (nom, adresse, TVA, SIRET)
- Modification des préférences financières : devise (TND / EUR / USD) et taux de TVA par défaut
- Lien vers le centre d'aide (hidopi.com)
- Affichage de la version de l'application

---

## Avis et feedback

- Demande d'avis App Store / Google Play avec fenêtre de 3 jours entre chaque demande (`expo-store-review`)
- Envoi de feedback par email (`mailto:h.chebbi@hidopi.com`)
- Déclenchement après génération de facture (dialogue « J'adore 😍 / Pas terrible »)

---

## Monitoring et analytique

- **Sentry** : capture des erreurs, suivi de navigation, détection des frames lentes/gelées
- **Vexo Analytics** : événements personnalisés (`Start_Fatoura_Jdida`, `Reprendre Fatoura`, `Facture_PDF_Generee`)
- **Error Boundary** global : affiche un écran d'erreur avec bouton « Réessayer » en cas d'exception non gérée

---

## Numérotation des factures

- Génération automatique au format `INV-{SEQ3}{MM}{YY}` (ex. `INV-001 0526`)
- Séquence basée sur les factures du mois en cours
- Validation du format par expression régulière
