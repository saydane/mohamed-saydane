# Coeur de Bouskoura | قلب بوسكورة

> Restaurant gastronomique marocain à Bouskoura, Casablanca.
> Application web mobile-first bilingue (Français & Arabe/Darija RTL), haute sécurité, propulsée par React, Express et `node:sqlite`.

---

## 🏛️ Présentation de l'Application

« Coeur de Bouskoura » (قلب بوسكورة) est une expérience numérique raffinée pour un restaurant marocain d'exception :
- **Bilingue natif** : Bascule instantanée entre Français et Arabe marocain (Darija) avec inversion complète de la direction du texte (`dir="rtl"` / `dir="ltr"`).
- **Thème Sombre & Doré** : Esthétique marocaine chaleureuse avec motifs zellige subtils, teintes ambre/or impérial, et sélecteur Sombre/Clair (aligné par défaut sur `prefers-color-scheme`).
- **Carte Gastronomique (25 plats d'exception)** : 5 catégories (Entrées, Plats & Tajines, Grillades au feu de bois, Desserts, Thés & Boissons). Priorité aux plats avec photos réelles, et cartes textuelles dorées élégantes pour les plats sans photo (aucun faux visuel).
- **Panier & Commande 1-Tap WhatsApp** : Calcul du total en Dirhams (DH) et génération d'un message préformaté, sécurisé et tronqué vers `wa.me/212...`.
- **Réservation de Tables Validée** : Validation stricte côté serveur avec fuseau horaire `Africa/Casablanca`, respect des heures d'ouverture (12h00 - 23h30), validation des numéros marocains (+212 / 05 / 06 / 07), prévention des doublons (409) et lien WhatsApp de notification pour le propriétaire.
- **Chatbot Intelligent « قلب بوسكورة »** :
  1. Règles instantanées (prix des plats, horaires, adresse, disponibilité).
  2. Cache SQLite pour les FAQ récurrentes (uniquement si l'historique est vide, invalidé lors des modifications de carte).
  3. Intégration Gemini avec timeout 8s et 1 retry.
  4. Repli automatique vers WhatsApp en cas d'erreur ou d'épuisement du quota journalier par IP.
- **Espace Administrateur (#admin)** :
  - Route confidentielle `#admin` sans lien direct public.
  - Configuration du mot de passe propriétaire au premier démarrage (minimum 8 caractères, aucun mot de passe par défaut).
  - Authentification scrypt + sel + `crypto.timingSafeEqual`.
  - Protection contre la force brute : verrouillage de l'IP pendant 10 minutes après 6 échecs consécutifs, stocké en base SQLite.
  - Sessions stockées sous forme de hachages SHA-256 (aucun jeton en clair en base).
  - Téléversement sécurisé de photos : contrôle des octets magiques (JPEG/PNG/WebP), rejet des scripts malveillants, ré-encodage WebP via `sharp` pour supprimer les métadonnées EXIF.
  - Sauvegardes atomiques de la base avec `VACUUM INTO`.

---

## 🚀 Déploiement en Production

### 1. Prérequis Système
- Node.js >= 22.13.0 (nécessaire pour le support natif de `node:sqlite` et `node:test`).
- Certificat HTTPS (Cloudflare, Let's Encrypt ou Google Cloud Run).

### 2. Configuration des Volumes Persistants
Pour garantir la persistance des données et des photos téléversées :
- `/data` : Contient la base `restaurant.sqlite` et ses journaux WAL.
- `/uploads` : Contient les photos des plats ré-encodées en WebP.
- `/backups` : Contient les clichés `VACUUM INTO`.

Monter des volumes persistants sur ces répertoires lors du déploiement Docker ou Kubernetes.

### 3. Variables d'Environnement (`server/.env`)
Les secrets doivent uniquement résider dans `server/.env` (ignoré par Git) :
```bash
GEMINI_API_KEY="votre_cle_gemini_api"
GEMINI_MODEL="gemini-2.5-flash"
PORT=3000
NODE_ENV="production"
```

### 4. Configuration Reverse-Proxy & IP Client
Express est configuré avec `app.set('trust proxy', 1)` pour inspecter exactement 1 saut de reverse-proxy de confiance, ou l'en-tête `CF-Connecting-IP` si déployé derrière Cloudflare. Ne jamais faire confiance aveuglément à un en-tête `X-Forwarded-For` arbitraire.

---

## 🔒 Confidentialité & Rétention des Données (Conformité CNDP / RGPD)

Conformément à la loi marocaine n° 09-08 relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel :
1. **Numéros de téléphone et coordonnées de réservation** :
   - Recueillis uniquement dans le cadre strict de la gestion des réservations et du service client.
   - Durée de rétention recommandée : conservation maximale de 90 jours après la date de réservation pour les audits de fréquentation, puis purge automatisée.
   - Les numéros de téléphone ne sont jamais transmis à des tiers ni utilisés à des fins de prospection publicitaire sans consentement explicite.
2. **Photos téléversées** :
   - Toutes les images sont traitées via `sharp` à la volée pour éliminer l'intégralité des métadonnées EXIF (données de géolocalisation GPS, modèle d'appareil, horodatage interne) avant d'être écrites sur le disque.

---

## 💾 Sauvegarde Atomique SQLite

L'application intègre une procédure de sauvegarde non bloquante utilisant la commande SQLite native `VACUUM INTO` :
- Crée un instantané compact et autonome sans suspendre les requêtes en lecture/écriture (`WAL mode`).
- Exclut intrinsèquement les journaux temporaires `.sqlite-wal`, `.sqlite-shm` ainsi que les fichiers de configuration secrets (`.env`).
- Déclenchable depuis le tableau de bord `#admin` ou via tâche cron planifiée appelant `server/backup.ts`.

---

## 🧪 Tests Unitaires & Critères d'Acceptation

Pour exécuter la suite de tests unitaires native Node :
```bash
npm test
```

Critères validés :
- **P3** : Réservation avec date passée -> 400 ; Heure en dehors des horaires (ex: 10:00) -> 400 ; Doublon -> 409 ; Numéros marocains (+212, 05, 06, 07).
- **P4** : Query "شحال الحريرة؟" -> source=rule ; même question FAQ posée deux fois -> source=cache ; historique non-vide -> ignore le cache ; échec Gemini -> repli WhatsApp.
- **P5** : 6 tentatives de connexion échouées -> verrouillage IP 429 ; jetons de session stockés sous forme de hash sha256 (aucun jeton en clair) ; fichier `.php` renommé en `.jpg` rejeté par le contrôle des octets magiques.
