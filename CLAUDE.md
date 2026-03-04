# KAROSSE - Covoiturage Scolaire Nouméa

## Description
Application PWA de covoiturage scolaire pour la région de Nouméa, Nouvelle-Calédonie.

## Stack Technique
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v3
- **PWA**: @serwist/next (Service Worker + manifest)
- **Icons**: lucide-react
- **Dates**: date-fns
- **Notifications**: react-hot-toast
- **Backend**: Supabase (Auth, Database, Storage)
- **Push Notifications**: Web Push avec VAPID

## Structure du Projet

```
karosse/
├── app/
│   ├── (auth)/                    # Routes d'authentification (publiques)
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   ├── (dashboard)/               # Routes protégées
│   │   ├── calendar/
│   │   ├── drivers/
│   │   ├── group/
│   │   └── profile/
│   ├── auth/callback/             # OAuth callback
│   ├── manifest.ts                # PWA manifest
│   ├── sw.ts                      # Service Worker
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Landing page (redirects)
├── components/
│   ├── ui/                        # Composants UI réutilisables
│   ├── layout/                    # Header, BottomNav, PageShell
│   ├── forms/                     # Formulaires (Login, Register, etc.)
│   └── auth/                      # Composants auth (LogoutButton)
├── lib/
│   ├── supabase/                  # Clients Supabase
│   │   ├── client.ts              # Client browser (createBrowserClient)
│   │   ├── server.ts              # Client server (createServerClient)
│   │   ├── middleware.ts          # Session refresh (updateSession)
│   │   └── actions.ts             # Server actions (signIn, signUp, signOut)
│   └── utils/                     # Utilitaires
├── hooks/                         # Custom React hooks
├── types/                         # Types TypeScript
├── supabase/
│   └── migrations/                # Migrations SQL
│       ├── 001_initial_schema.sql
│       └── 002_seed_calendar_2026.sql
├── middleware.ts                  # Next.js middleware (auth)
└── public/
    └── icons/                     # Icônes PWA
```

## Couleurs (Tailwind)
- **Primary**: #1B4F72 (Bleu marine)
- **Secondary**: #2E86C1 (Bleu clair)
- **Accent**: #F39C12 (Orange)
- **Success**: #27AE60 (Vert)
- **Warning**: #F39C12 (Orange)
- **Danger**: #E74C3C (Rouge)

## Routes

### Publiques
- `/` - Redirige vers /calendar (connecté) ou /login (non connecté)
- `/login` - Connexion
- `/register` - Inscription
- `/forgot-password` - Récupération mot de passe

### Protégées (nécessitent authentification)
- `/calendar` - Calendrier des trajets
- `/drivers` - Liste des conducteurs du groupe
- `/group` - Gestion du groupe
- `/profile` - Profil utilisateur

## Modèles de Données (Supabase)

### groups
- id, name, description, school_name, school_address, invite_code
- created_at, updated_at

### members
- id, user_id, group_id, role ('admin'|'member')
- display_name, phone, is_driver
- created_at, updated_at
- UNIQUE(user_id, group_id)

### drivers
- id, member_id (UNIQUE)
- vehicle_model, vehicle_color, license_plate, max_passengers
- available_days (TEXT[]) - jours disponibles ['lun','mar','mer','jeu','ven']
- is_active, created_at, updated_at

### children
- id, member_id, first_name, last_name, grade, notes
- created_at, updated_at

### trips
- id, group_id, driver_id (nullable), date, direction ('to_school'|'from_school')
- departure_time (nullable), available_seats
- status ('planned'|'unassigned'|'scheduled'|'confirmed'|'in_progress'|'completed'|'cancelled')
- notes, created_at, updated_at

### trip_passengers
- id, trip_id, child_id, status, pickup_address, dropoff_address
- created_at, updated_at
- UNIQUE(trip_id, child_id)

### school_calendar
- id, date (UNIQUE), is_school_day, label
- type ('school'|'holiday'|'vacation'|'weekend')
- created_at

### push_subscriptions
- id, user_id, endpoint (UNIQUE), p256dh, auth
- created_at, updated_at

## RLS (Row Level Security)
- Toutes les tables ont RLS activé
- Filtrage par groupe via `members.user_id = auth.uid()`
- `push_subscriptions` filtré par `user_id = auth.uid()`
- `school_calendar` accessible en lecture à tous les utilisateurs authentifiés

## Calendrier Scolaire NC 2026
- Année scolaire : 16 février - 19 décembre 2026
- Vacances : avril (4-19), juin (6-21), août (8-23), octobre (10-25)
- Jours fériés NC :
  - 6 avril : Lundi de Pâques
  - 1 mai : Fête du Travail
  - 8 mai : Victoire 1945
  - 14 mai : Ascension
  - 25 mai : Lundi de Pentecôte
  - 14 juillet : Fête nationale
  - 15 août : Assomption
  - 24 septembre : Fête de la Citoyenneté NC
  - 1 novembre : Toussaint
  - 11 novembre : Armistice

## Commandes

```bash
npm run dev      # Développement
npm run build    # Build production
npm run start    # Serveur production
npm run lint     # Linting
```

## Variables d'Environnement

Voir `.env.local.example` :
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

## Notifications Push

### Architecture
- **Frontend** : `lib/notifications.ts` - Gestion des permissions et subscriptions
- **Service Worker** : `app/sw.ts` - Réception et affichage des notifications
- **API** : `app/api/push/route.ts` - CRUD subscriptions
- **Edge Function** : `supabase/functions/send-reminder/` - Envoi automatique

### Types de notifications
| Type | Description | Déclencheur |
|------|-------------|-------------|
| `trip_reminder` | Rappel de trajet | Cron 08:00 UTC (veille) |
| `trip_update` | Modification de trajet | Mise à jour trips |
| `group_invite` | Invitation groupe | Nouveau membre |

### Configuration VAPID
```bash
# Générer les clés
npx web-push generate-vapid-keys

# Configurer Supabase secrets
supabase secrets set VAPID_PUBLIC_KEY=...
supabase secrets set VAPID_PRIVATE_KEY=...
```

### Cron pour rappels
- Exécution : 08:00 UTC = 19:00 Nouméa
- Cible : Conducteurs avec trajet le lendemain
- Action : Push notification avec détails du trajet

Voir `docs/push-notifications-setup.md` pour la configuration complète.

## Composants UI

### Layout
- `PageShell` - Wrapper avec header et action button
- `BottomNav` - Navigation mobile (4 onglets)

### Feedback
- `EmptyState` - États vides avec illustrations (calendar, drivers, children, group)
- `ErrorBoundary` - Capture des erreurs React
- `OfflineBanner` - Indicateur mode hors-ligne
- `SplashScreen` - Écran d'accueil PWA avec animation

### Interactivité
- `PullToRefresh` - Actualisation par glissement (mobile)
- `Modal` - Bottom sheet responsive
- `Avatar` - Initiales colorées

### Skeletons (Loading)
- `SkeletonCalendar` - Chargement calendrier
- `SkeletonDriverList` - Chargement liste conducteurs
- `SkeletonMemberList` - Chargement membres
- `SkeletonProfile` - Chargement profil

## Accessibilité

- Focus visible sur tous les éléments interactifs
- `aria-label` en français sur tous les boutons
- Support `prefers-reduced-motion`
- Support `prefers-contrast: high`
- Font-size minimum 16px (pas de zoom iOS)
- Contrastes AAA vérifiés

## Hooks Personnalisés

- `useNetworkStatus` - Détection online/offline

## Performance

- Loading states avec skeletons animés
- Requêtes Supabase optimisées (colonnes spécifiques)
- Supabase Realtime pour mises à jour en temps réel
- Service Worker pour cache offline
