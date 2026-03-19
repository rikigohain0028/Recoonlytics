import { pgTable, text, serial, boolean, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ── Users ──────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  planType: text("plan_type").notNull().default("free"),       // free | founder | early | pro
  emailVerified: boolean("email_verified").notNull().default(false),
  isAdmin: boolean("is_admin").notNull().default(false),
  uploadsUsedMonth: integer("uploads_used_month").notNull().default(0),
  uploadsUsedToday: integer("uploads_used_today").notNull().default(0),
  lifetimeFreeUsed: integer("lifetime_free_used").notNull().default(0),
  lastDailyReset: timestamp("last_daily_reset"),
  lastMonthlyReset: timestamp("last_monthly_reset"),
  planStartDate: timestamp("plan_start_date"),
  planEndDate: timestamp("plan_end_date"),
  pendingPlan: text("pending_plan"),
  pendingPayment: boolean("pending_payment").notNull().default(false),
  pendingDate: timestamp("pending_date"),
  paymentProvider: text("payment_provider"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastDailyReset: true,
  lastMonthlyReset: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ── Verification Tokens ────────────────────────────────────────────────
export const verificationTokens = pgTable("verification_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: uuid("token").notNull().unique().defaultRandom(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type VerificationToken = typeof verificationTokens.$inferSelect;

// ── Password Reset Tokens ──────────────────────────────────────────────
export const resetTokens = pgTable("reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: uuid("token").notNull().unique().defaultRandom(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ResetToken = typeof resetTokens.$inferSelect;

// ── Plan Config ────────────────────────────────────────────────────────
export const planConfig = pgTable("plan_config", {
  id: serial("id").primaryKey(),
  founderSpotsTotal: integer("founder_spots_total").notNull().default(300),
  founderSpotsUsed: integer("founder_spots_used").notNull().default(0),
  earlySpotsTotal: integer("early_spots_total").notNull().default(300),
  earlySpotsUsed: integer("early_spots_used").notNull().default(0),
});

export type PlanConfig = typeof planConfig.$inferSelect;

// ── Payments ───────────────────────────────────────────────────────────
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  orderId: text("order_id").notNull().unique(),
  paymentProvider: text("payment_provider").notNull().default("cashfree"),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("INR"),
  status: text("status").notNull().default("pending"),         // pending | success | failed
  planType: text("plan_type"),                                 // founder | early | pro
  planDurationDays: integer("plan_duration_days"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  paidAt: timestamp("paid_at"),
});

export type Payment = typeof payments.$inferSelect;
