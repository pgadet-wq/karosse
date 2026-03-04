# Configuration des Notifications Push - KAROSSE

Ce document explique comment configurer le système de notifications push pour KAROSSE.

## 1. Génération des clés VAPID

Les clés VAPID (Voluntary Application Server Identification) sont nécessaires pour authentifier les notifications push.

### Installation de web-push (si pas déjà fait)

```bash
npm install -g web-push
```

### Génération des clés

```bash
web-push generate-vapid-keys
```

Cela génère une sortie comme :

```
=======================================

Public Key:
BNxPPLxPJ1jK9n3kJQoHT5wGl...

Private Key:
k3HzPmJxEu_BcV2h6VqP...

=======================================
```

## 2. Configuration des variables d'environnement

### Fichier `.env.local` (développement local)

```env
# VAPID Keys for Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BNxPPLxPJ1jK9n3kJQoHT5wGl...
VAPID_PRIVATE_KEY=k3HzPmJxEu_BcV2h6VqP...
VAPID_SUBJECT=mailto:contact@karosse.nc
```

### Vercel (production)

Dans le dashboard Vercel > Settings > Environment Variables, ajoutez :

| Variable | Valeur |
|----------|--------|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Votre clé publique |
| `VAPID_PRIVATE_KEY` | Votre clé privée |
| `VAPID_SUBJECT` | `mailto:contact@karosse.nc` |

### Supabase Secrets (pour l'Edge Function)

```bash
# Via Supabase CLI
supabase secrets set VAPID_PUBLIC_KEY=BNxPPLxPJ1jK9n3kJQoHT5wGl...
supabase secrets set VAPID_PRIVATE_KEY=k3HzPmJxEu_BcV2h6VqP...
supabase secrets set VAPID_SUBJECT=mailto:contact@karosse.nc
```

Ou via le dashboard Supabase : Settings > Edge Functions > Secrets

## 3. Déploiement de l'Edge Function

### Via Supabase CLI

```bash
# Se connecter à Supabase
supabase login

# Lier au projet
supabase link --project-ref votre-project-ref

# Déployer la fonction
supabase functions deploy send-reminder
```

### Configuration du Cron

La fonction est configurée pour s'exécuter à 08:00 UTC (19:00 Nouméa).

Pour activer le cron via le dashboard Supabase :

1. Allez dans Database > Extensions
2. Activez l'extension `pg_cron`
3. Allez dans SQL Editor et exécutez :

```sql
-- Créer le job cron pour les rappels quotidiens
SELECT cron.schedule(
  'send-daily-reminders',
  '0 8 * * *',  -- 08:00 UTC = 19:00 Nouméa
  $$
  SELECT net.http_post(
    url := 'https://your-project-ref.supabase.co/functions/v1/send-reminder',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'
  );
  $$
);
```

**Note:** Remplacez `your-project-ref` par votre référence de projet Supabase.

### Vérifier les jobs cron

```sql
SELECT * FROM cron.job;
```

### Supprimer un job cron

```sql
SELECT cron.unschedule('send-daily-reminders');
```

## 4. Test des notifications

### Test manuel via l'API

```bash
# Depuis le terminal
curl -X POST https://your-project.supabase.co/functions/v1/send-reminder \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Test depuis l'application

1. Connectez-vous à l'application
2. Allez dans Profil > Notifications
3. Activez les notifications
4. Cliquez sur "Envoyer une notification de test"

## 5. Structure de la notification

### Payload envoyé au Service Worker

```json
{
  "title": "Rappel trajet demain matin",
  "body": "Demain matin, c'est vous ! Départ à 07:30, 3 enfants à conduire au Collège de Mariotti.",
  "url": "/calendar?date=2026-03-05",
  "type": "trip_reminder"
}
```

### Types de notifications

| Type | Description |
|------|-------------|
| `trip_reminder` | Rappel de trajet la veille |
| `trip_update` | Modification d'un trajet |
| `group_invite` | Invitation à rejoindre un groupe |
| `general` | Notification générale |

## 6. Dépannage

### Les notifications ne s'affichent pas

1. Vérifiez que les notifications sont autorisées dans le navigateur
2. Vérifiez que le Service Worker est enregistré (`Application` > `Service Workers` dans DevTools)
3. Vérifiez la console pour les erreurs

### L'Edge Function échoue

1. Vérifiez les logs : `supabase functions logs send-reminder`
2. Vérifiez que les secrets sont configurés
3. Testez manuellement avec curl

### Subscriptions expirées

Les subscriptions peuvent expirer si :
- L'utilisateur n'a pas visité le site depuis longtemps
- Le navigateur a été réinstallé
- Les permissions ont été révoquées

La fonction supprime automatiquement les subscriptions expirées (code 410).

## 7. Monitoring

### Table de logs (optionnelle)

Pour activer le logging des notifications, créez la table :

```sql
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_logs_created_at ON notification_logs(created_at);
CREATE INDEX idx_notification_logs_user_id ON notification_logs(user_id);
```

Et décommentez la ligne dans l'Edge Function :
```typescript
await supabase.from("notification_logs").insert(logs);
```
