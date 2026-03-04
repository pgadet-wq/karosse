-- KAROSSE - Calendrier Scolaire Nouvelle-Calédonie 2026
-- Année scolaire : 16 février 2026 - 19 décembre 2026

-- Vacances scolaires 2026 :
-- - Vacances d'avril : 4-19 avril 2026
-- - Vacances de juin : 6-21 juin 2026
-- - Vacances d'août : 8-23 août 2026
-- - Vacances d'octobre : 10-25 octobre 2026

-- Jours fériés Nouvelle-Calédonie 2026 :
-- - 6 avril : Lundi de Pâques (en vacances)
-- - 1 mai : Fête du Travail
-- - 8 mai : Victoire 1945
-- - 14 mai : Ascension
-- - 25 mai : Lundi de Pentecôte
-- - 14 juillet : Fête nationale
-- - 15 août : Assomption (en vacances)
-- - 24 septembre : Fête de la Citoyenneté NC
-- - 1 novembre : Toussaint (en vacances)
-- - 11 novembre : Armistice

-- Clear existing calendar data for 2026
DELETE FROM school_calendar WHERE EXTRACT(YEAR FROM date) = 2026;

-- Generate all dates from Feb 16 to Dec 19, 2026
INSERT INTO school_calendar (date, is_school_day, label, type)
SELECT
  d::date,
  CASE
    -- Weekends
    WHEN EXTRACT(DOW FROM d) IN (0, 6) THEN FALSE
    -- Vacances d'avril (4-19 avril)
    WHEN d BETWEEN '2026-04-04' AND '2026-04-19' THEN FALSE
    -- Vacances de juin (6-21 juin)
    WHEN d BETWEEN '2026-06-06' AND '2026-06-21' THEN FALSE
    -- Vacances d'août (8-23 août)
    WHEN d BETWEEN '2026-08-08' AND '2026-08-23' THEN FALSE
    -- Vacances d'octobre (10-25 octobre)
    WHEN d BETWEEN '2026-10-10' AND '2026-10-25' THEN FALSE
    -- Jours fériés
    WHEN d = '2026-05-01' THEN FALSE -- Fête du Travail
    WHEN d = '2026-05-08' THEN FALSE -- Victoire 1945
    WHEN d = '2026-05-14' THEN FALSE -- Ascension
    WHEN d = '2026-05-25' THEN FALSE -- Lundi de Pentecôte
    WHEN d = '2026-07-14' THEN FALSE -- Fête nationale
    WHEN d = '2026-09-24' THEN FALSE -- Fête de la Citoyenneté NC
    WHEN d = '2026-11-11' THEN FALSE -- Armistice
    ELSE TRUE
  END,
  CASE
    -- Weekends
    WHEN EXTRACT(DOW FROM d) = 0 THEN 'Dimanche'
    WHEN EXTRACT(DOW FROM d) = 6 THEN 'Samedi'
    -- Vacances
    WHEN d BETWEEN '2026-04-04' AND '2026-04-19' THEN 'Vacances d''avril'
    WHEN d BETWEEN '2026-06-06' AND '2026-06-21' THEN 'Vacances de juin'
    WHEN d BETWEEN '2026-08-08' AND '2026-08-23' THEN 'Vacances d''août'
    WHEN d BETWEEN '2026-10-10' AND '2026-10-25' THEN 'Vacances d''octobre'
    -- Jours fériés
    WHEN d = '2026-04-06' THEN 'Lundi de Pâques'
    WHEN d = '2026-05-01' THEN 'Fête du Travail'
    WHEN d = '2026-05-08' THEN 'Victoire 1945'
    WHEN d = '2026-05-14' THEN 'Ascension'
    WHEN d = '2026-05-25' THEN 'Lundi de Pentecôte'
    WHEN d = '2026-07-14' THEN 'Fête nationale'
    WHEN d = '2026-08-15' THEN 'Assomption'
    WHEN d = '2026-09-24' THEN 'Fête de la Citoyenneté NC'
    WHEN d = '2026-11-01' THEN 'Toussaint'
    WHEN d = '2026-11-11' THEN 'Armistice'
    ELSE NULL
  END,
  CASE
    -- Weekends
    WHEN EXTRACT(DOW FROM d) IN (0, 6) THEN 'weekend'
    -- Vacances
    WHEN d BETWEEN '2026-04-04' AND '2026-04-19' THEN 'vacation'
    WHEN d BETWEEN '2026-06-06' AND '2026-06-21' THEN 'vacation'
    WHEN d BETWEEN '2026-08-08' AND '2026-08-23' THEN 'vacation'
    WHEN d BETWEEN '2026-10-10' AND '2026-10-25' THEN 'vacation'
    -- Jours fériés (hors vacances et week-ends)
    WHEN d = '2026-05-01' THEN 'holiday'
    WHEN d = '2026-05-08' THEN 'holiday'
    WHEN d = '2026-05-14' THEN 'holiday'
    WHEN d = '2026-05-25' THEN 'holiday'
    WHEN d = '2026-07-14' THEN 'holiday'
    WHEN d = '2026-09-24' THEN 'holiday'
    WHEN d = '2026-11-11' THEN 'holiday'
    ELSE 'school'
  END
FROM generate_series('2026-02-16'::date, '2026-12-19'::date, '1 day'::interval) d;

-- Summary comment
COMMENT ON TABLE school_calendar IS 'Calendrier scolaire NC 2026 - Du 16/02 au 19/12';
