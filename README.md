# KAROSSE - Covoiturage Scolaire Noumea

Application PWA de covoiturage scolaire pour la region de Noumea, Nouvelle-Caledonie. Permet aux parents d'organiser les trajets vers l'ecole de maniere collaborative avec rotation automatique des conducteurs.

## Fonctionnalites

- Calendrier interactif des trajets (aller/retour)
- Rotation automatique des conducteurs
- Gestion des groupes de covoiturage
- Inscription des enfants
- Notifications push pour les rappels
- Mode hors-ligne (PWA)
- Interface mobile-first

## Stack Technique

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v3
- **PWA**: @serwist/next
- **Backend**: Supabase (Auth, Database, Realtime)
- **Push**: Web Push avec VAPID

## Installation Locale

### 1. Cloner le repository

```bash
git clone https://github.com/VOTRE_USERNAME/karosse.git
cd karosse
```

### 2. Installer les dependances

```bash
npm install
```

### 3. Configurer les variables d'environnement

Copier le fichier d'exemple et remplir les valeurs :

```bash
cp .env.local.example .env.local
```

Editer `.env.local` avec vos credentials Supabase et VAPID.

### 4. Lancer le serveur de developpement

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Variables d'Environnement

| Variable | Description | Requis |
|----------|-------------|--------|
| `NEXT_PUBLIC_SITE_URL` | URL du site (ex: https://karosse.vercel.app) | Oui |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase | Oui |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cle publique Supabase | Oui |
| `SUPABASE_SERVICE_ROLE_KEY` | Cle service Supabase (backend) | Oui |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Cle publique VAPID | Oui |
| `VAPID_PRIVATE_KEY` | Cle privee VAPID | Oui |
| `VAPID_SUBJECT` | Email contact VAPID | Oui |

## Supabase Setup

### 1. Creer un projet Supabase

1. Aller sur [supabase.com](https://supabase.com) et creer un compte
2. Cliquer "New Project"
3. Choisir un nom, mot de passe DB, et region (Sydney pour NC)
4. Attendre la creation du projet

### 2. Recuperer les credentials

Dans Settings > API :
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Appliquer les migrations

Dans l'onglet SQL Editor, executer dans l'ordre :

```sql
-- 1. Schema initial
-- Copier le contenu de supabase/migrations/001_initial_schema.sql

-- 2. Calendrier scolaire 2026
-- Copier le contenu de supabase/migrations/002_seed_calendar_2026.sql

-- 3. Disponibilites conducteurs
-- Copier le contenu de supabase/migrations/003_add_driver_availability.sql
```

### 4. Configurer l'authentification

Dans Authentication > Providers :
- Activer "Email" avec confirmation desactivee (dev)
- Optionnel : configurer OAuth (Google, etc.)

Dans Authentication > URL Configuration :
- Site URL : `https://votre-domaine.vercel.app`
- Redirect URLs : `https://votre-domaine.vercel.app/auth/callback`

## Generer les Cles VAPID

Les cles VAPID sont necessaires pour les notifications push.

```bash
npx web-push generate-vapid-keys
```

Resultat :
```
Public Key: BLxxxxxxx...
Private Key: xxxxxxx...
```

Ajouter ces valeurs dans `.env.local` et Vercel :
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` = Public Key
- `VAPID_PRIVATE_KEY` = Private Key
- `VAPID_SUBJECT` = `mailto:contact@karosse.nc`

## Deploiement Vercel

### 1. Connecter le repository

1. Aller sur [vercel.com](https://vercel.com)
2. "Add New Project"
3. Importer le repository GitHub
4. Framework: Next.js (detecte automatiquement)

### 2. Configurer les variables d'environnement

Dans Project Settings > Environment Variables, ajouter :

```
NEXT_PUBLIC_SITE_URL=https://karosse.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BLxxx...
VAPID_PRIVATE_KEY=xxx...
VAPID_SUBJECT=mailto:contact@karosse.nc
```

### 3. Deployer

Cliquer "Deploy". Vercel va :
- Installer les dependances
- Builder l'application
- Deployer sur le CDN global

### 4. Configurer le domaine (optionnel)

Dans Project Settings > Domains :
- Ajouter votre domaine personnalise
- Configurer les DNS selon les instructions

## Supabase Edge Functions

Pour les notifications push automatiques :

### 1. Installer Supabase CLI

```bash
npm install -g supabase
```

### 2. Se connecter

```bash
supabase login
supabase link --project-ref VOTRE_PROJECT_REF
```

### 3. Deployer la fonction

```bash
supabase functions deploy send-reminder
```

### 4. Configurer les secrets

```bash
supabase secrets set VAPID_PUBLIC_KEY="BLxxx..."
supabase secrets set VAPID_PRIVATE_KEY="xxx..."
supabase secrets set VAPID_SUBJECT="mailto:contact@karosse.nc"
```

### 5. Configurer le cron

Dans Supabase Dashboard > Database > Extensions, activer `pg_cron`.

Puis dans SQL Editor :

```sql
SELECT cron.schedule(
  'send-daily-reminders',
  '0 8 * * *',  -- 08:00 UTC = 19:00 Noumea
  $$
  SELECT net.http_post(
    url := 'https://xxx.supabase.co/functions/v1/send-reminder',
    headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

## Scripts Disponibles

```bash
npm run dev      # Serveur de developpement
npm run build    # Build production
npm run start    # Serveur production
npm run lint     # Linting ESLint
```

## Structure du Projet

```
karosse/
├── app/                    # Routes Next.js App Router
│   ├── (auth)/            # Routes publiques (login, register)
│   ├── (dashboard)/       # Routes protegees (calendar, drivers, etc.)
│   └── api/               # API Routes
├── components/
│   ├── ui/                # Composants UI reutilisables
│   ├── layout/            # Header, BottomNav, PageShell
│   ├── calendar/          # Composants calendrier
│   └── trips/             # Composants trajets
├── lib/
│   ├── supabase/          # Clients Supabase
│   └── utils/             # Utilitaires
├── hooks/                 # Custom React hooks
├── types/                 # Types TypeScript
└── supabase/
    ├── migrations/        # Migrations SQL
    └── functions/         # Edge Functions
```

## Licence

Projet prive - Tous droits reserves.
