import {
  pgTable,
  uuid,
  text,
  integer,
  date,
  time,
  timestamp,
  pgEnum,
  boolean,
  serial,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

// ─── Enums ────────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum("role", ["receptionniste", "medecin", "admin"])
export const sexeEnum = pgEnum("sexe", ["H", "F"])
export const statutRdvEnum = pgEnum("statut_rdv", [
  "confirme",
  "arrive",
  "en_consultation",
  "effectue",
  "annule",
  "no_show",
])
export const modeVersementEnum = pgEnum("mode_versement", [
  "baridi_mob",
  "especes",
])
export const typeVersementEnum = pgEnum("type_versement", [
  "acompte",
  "versement",
  "solde",
  "total",
])
export const natureCoutEnum = pgEnum("nature_cout", ["fixe", "variable"])
export const recurrenceCoutEnum = pgEnum("recurrence_cout", [
  "mensuel",
  "ponctuel",
])
export const categorieCoutEnum = pgEnum("categorie_cout", [
  "salaires",
  "livraison",
  "charges",
  "materiel_medical",
  "medicaments_injections",
  "fournitures",
  "entretien",
  "assurance",
  "impots",
  "marketing",
  "autre",
])

// ─── Profiles (extends Supabase auth.users) ───────────────────────────────────

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // = auth.users.id
  role: roleEnum("role").notNull().default("receptionniste"),
  nom: text("nom").notNull(),
  prenom: text("prenom").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// ─── Services (Catalogue) ─────────────────────────────────────────────────────

export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  nom: text("nom").notNull().unique(),
  prixStandard: integer("prix_standard").notNull(),
  notes: text("notes"),
  actif: boolean("actif").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// ─── Patients ─────────────────────────────────────────────────────────────────

export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  ref: text("ref").notNull().unique(), // PAT-001
  nom: text("nom").notNull(),
  prenom: text("prenom").notNull(),
  telephone: text("telephone").notNull(),
  dateNaissance: date("date_naissance"),
  sexe: sexeEnum("sexe"),
  pathologie: text("pathologie"),
  notesMedicales: text("notes_medicales"),
  montantDuCustom: integer("montant_du_custom"), // doctor override
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// ─── Rendez-vous ──────────────────────────────────────────────────────────────

export const rendezVous = pgTable("rendez_vous", {
  id: uuid("id").primaryKey().defaultRandom(),
  ref: text("ref").notNull().unique(), // RDV-001
  date: date("date").notNull(),
  heure: time("heure").notNull(),
  patientId: uuid("patient_id").references(() => patients.id, {
    onDelete: "set null",
  }),
  patientNomLibre: text("patient_nom_libre"),
  telephone: text("telephone"),
  age: integer("age"),
  medecinId: uuid("medecin_id").references(() => profiles.id),
  statut: statutRdvEnum("statut").notNull().default("confirme"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// ─── Consultations ────────────────────────────────────────────────────────────

export const consultations = pgTable("consultations", {
  id: uuid("id").primaryKey().defaultRandom(),
  ref: text("ref").notNull().unique(), // C-001
  date: date("date").notNull(),
  rdvId: uuid("rdv_id").references(() => rendezVous.id, {
    onDelete: "set null",
  }),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "restrict" }),
  serviceId: uuid("service_id").references(() => services.id, {
    onDelete: "set null",
  }),
  prixStandard: integer("prix_standard").notNull(),
  prixFinal: integer("prix_final").notNull(),
  medecinId: uuid("medecin_id").references(() => profiles.id),
  diagnostic: text("diagnostic"),
  ordonnance: text("ordonnance"),
  notesMedicales: text("notes_medicales"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// ─── Versements ───────────────────────────────────────────────────────────────

export const versements = pgTable("versements", {
  id: uuid("id").primaryKey().defaultRandom(),
  ref: text("ref").notNull().unique(), // V-001
  date: date("date").notNull(),
  patientId: uuid("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "restrict" }),
  montant: integer("montant").notNull(),
  mode: modeVersementEnum("mode").notNull(),
  type: typeVersementEnum("type").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// ─── Coûts ────────────────────────────────────────────────────────────────────

export const couts = pgTable("couts", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: date("date").notNull(),
  categorie: categorieCoutEnum("categorie").notNull(),
  description: text("description").notNull(),
  montant: integer("montant").notNull(),
  nature: natureCoutEnum("nature").notNull(),
  recurrence: recurrenceCoutEnum("recurrence").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// ─── Séquences (for generating refs like PAT-001) ─────────────────────────────

export const sequences = pgTable("sequences", {
  name: text("name").primaryKey(),
  value: integer("value").notNull().default(0),
})

// ─── Relations ────────────────────────────────────────────────────────────────

export const patientsRelations = relations(patients, ({ many }) => ({
  consultations: many(consultations),
  versements: many(versements),
  rendezVous: many(rendezVous),
}))

export const consultationsRelations = relations(consultations, ({ one }) => ({
  patient: one(patients, {
    fields: [consultations.patientId],
    references: [patients.id],
  }),
  service: one(services, {
    fields: [consultations.serviceId],
    references: [services.id],
  }),
  medecin: one(profiles, {
    fields: [consultations.medecinId],
    references: [profiles.id],
  }),
  rdv: one(rendezVous, {
    fields: [consultations.rdvId],
    references: [rendezVous.id],
  }),
}))

export const versementsRelations = relations(versements, ({ one }) => ({
  patient: one(patients, {
    fields: [versements.patientId],
    references: [patients.id],
  }),
}))

export const rendezVousRelations = relations(rendezVous, ({ one }) => ({
  patient: one(patients, {
    fields: [rendezVous.patientId],
    references: [patients.id],
  }),
  medecin: one(profiles, {
    fields: [rendezVous.medecinId],
    references: [profiles.id],
  }),
}))

// ─── Types ────────────────────────────────────────────────────────────────────

export type Profile = typeof profiles.$inferSelect
export type Service = typeof services.$inferSelect
export type Patient = typeof patients.$inferSelect
export type RendezVous = typeof rendezVous.$inferSelect
export type Consultation = typeof consultations.$inferSelect
export type Versement = typeof versements.$inferSelect
export type Cout = typeof couts.$inferSelect

export type NewPatient = typeof patients.$inferInsert
export type NewConsultation = typeof consultations.$inferInsert
export type NewVersement = typeof versements.$inferInsert
export type NewRendezVous = typeof rendezVous.$inferInsert
export type NewCout = typeof couts.$inferInsert
