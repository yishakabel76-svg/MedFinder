import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";
export type UserRole = "user" | "admin";
export type PharmacyApprovalStatus = "pending" | "approved" | "rejected";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").$type<UserRole>().notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
);

export const appMeta = pgTable("app_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const pharmacies = pgTable(
  "pharmacies",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    area: text("area").notNull(),
    address: text("address").notNull(),
    licenseNumber: text("license_number").notNull().unique(),
    verified: boolean("verified").notNull().default(false),
    phone: text("phone").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    hours: text("hours").notNull().default("08:00–20:00"),
    ownerId: integer("owner_id").references(() => users.id, { onDelete: "set null" }),
    approvalStatus: text("approval_status").$type<PharmacyApprovalStatus>().notNull().default("approved"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("pharmacies_area_idx").on(table.area),
    index("pharmacies_owner_idx").on(table.ownerId),
    index("pharmacies_approval_idx").on(table.approvalStatus),
  ],
);

export const medicines = pgTable(
  "medicines",
  {
    id: serial("id").primaryKey(),
    genericName: text("generic_name").notNull(),
    brandNames: text("brand_names").array().notNull().default(sql`'{}'::text[]`),
    nameAmharic: text("name_amharic").notNull().default(""),
    strength: text("strength").notNull(),
    form: text("form").notNull(),
    category: text("category").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("medicines_identity_idx").on(table.genericName, table.strength, table.form),
    index("medicines_generic_name_idx").on(table.genericName),
  ],
);

export const stocks = pgTable(
  "stocks",
  {
    id: serial("id").primaryKey(),
    pharmacyId: integer("pharmacy_id")
      .notNull()
      .references(() => pharmacies.id, { onDelete: "cascade" }),
    medicineId: integer("medicine_id")
      .notNull()
      .references(() => medicines.id, { onDelete: "cascade" }),
    status: text("status").$type<StockStatus>().notNull().default("in_stock"),
    quantity: integer("quantity").notNull().default(0),
    priceBirr: real("price_birr"),
    lastConfirmedAt: timestamp("last_confirmed_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("stocks_pharmacy_medicine_idx").on(table.pharmacyId, table.medicineId),
    index("stocks_medicine_idx").on(table.medicineId),
    index("stocks_last_confirmed_idx").on(table.lastConfirmedAt),
  ],
);

export const stockReports = pgTable(
  "stock_reports",
  {
    id: serial("id").primaryKey(),
    stockId: integer("stock_id")
      .notNull()
      .references(() => stocks.id, { onDelete: "cascade" }),
    reporterType: text("reporter_type").notNull().default("patient"),
    reason: text("reason").notNull(),
    isReviewed: boolean("is_reviewed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("stock_reports_created_at_idx").on(table.createdAt)],
);
