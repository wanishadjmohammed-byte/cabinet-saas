-- Tables des documents imprimables : comptes rendus et factures.
-- À exécuter une seule fois (SQL Editor Supabase) — ou `npm run db:push`.

create table if not exists comptes_rendus (
  id              uuid primary key default gen_random_uuid(),
  ref             text not null unique,                 -- CR-001
  date            date not null,
  patient_id      uuid not null references patients(id) on delete restrict,
  consultation_id uuid references consultations(id) on delete set null,
  type            text not null default 'SUIVI MEDICAL',
  motif           text,
  contenu         text not null,
  medecin_id      uuid references profiles(id),
  created_at      timestamp not null default now()
);

create index if not exists comptes_rendus_patient_id_idx on comptes_rendus (patient_id);

create table if not exists factures (
  id                uuid primary key default gen_random_uuid(),
  numero            text not null unique,               -- 000001
  date              date not null,
  patient_id        uuid references patients(id) on delete set null,
  patient_nom       text not null,                      -- figé à l'émission
  patient_age       text,
  patient_sexe      text,
  type_intervention text,
  date_intervention date,
  tva               integer not null default 19,
  notes             text,
  created_at        timestamp not null default now()
);

create index if not exists factures_patient_id_idx on factures (patient_id);

create table if not exists facture_lignes (
  id          uuid primary key default gen_random_uuid(),
  facture_id  uuid not null references factures(id) on delete cascade,
  description text not null,
  montant     integer not null,
  ordre       integer not null default 0
);

create index if not exists facture_lignes_facture_id_idx on facture_lignes (facture_id);
