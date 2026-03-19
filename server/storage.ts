import { eq, and, gt, count } from "drizzle-orm";
import { db } from "./db";
import { users, verificationTokens, resetTokens, planConfig, payments } from "@shared/schema";
import type { User, InsertUser, VerificationToken, ResetToken, PlanConfig, Payment } from "@shared/schema";

export type { User, InsertUser };

export interface IStorage {
  // Users
  getUserById(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(data: { email: string; passwordHash: string }): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User>;

  // Verification
  createVerificationToken(userId: number): Promise<VerificationToken>;
  getVerificationToken(token: string): Promise<VerificationToken | undefined>;
  deleteVerificationToken(id: number): Promise<void>;

  // Reset
  createResetToken(userId: number): Promise<ResetToken>;
  getResetToken(token: string): Promise<ResetToken | undefined>;
  markResetTokenUsed(id: number): Promise<void>;

  // Plan config
  getPlanConfig(): Promise<PlanConfig>;
  incrementFounderSpot(): Promise<void>;
  incrementEarlySpot(): Promise<void>;

  // Usage
  recordUsage(userId: number): Promise<{ uploadsToday: number; uploadsMonth: number }>;

  // Payments
  createPayment(data: { userId: number; orderId: string; amount: number; currency: string }): Promise<Payment>;
  getPaymentByOrderId(orderId: string): Promise<Payment | undefined>;
  updatePaymentStatus(orderId: string, status: string, extra?: { planType?: string; planDurationDays?: number; paidAt?: Date }): Promise<Payment>;
  countSuccessfulPayments(): Promise<number>;
  activateUserPlan(userId: number, planType: string, durationDays: number): Promise<User>;

  // Gumroad pending payment
  setPendingPayment(userId: number, provider: string, plan: string): Promise<User>;
  clearPendingPayment(userId: number): Promise<User>;
  activateGumroadPlan(userId: number): Promise<User>;
}

function addHours(date: Date, hours: number): Date {
  const d = new Date(date);
  d.setHours(d.getHours() + hours);
  return d;
}

export class PgStorage implements IStorage {
  async getUserById(id: number) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async createUser(data: { email: string; passwordHash: string }): Promise<User> {
    const [user] = await db.insert(users).values({
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      planType: "free",
      emailVerified: false,
      uploadsUsedMonth: 0,
      uploadsUsedToday: 0,
      lifetimeFreeUsed: 0,
    }).returning();
    return user;
  }

  async updateUser(id: number, data: Partial<User>): Promise<User> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }

  async createVerificationToken(userId: number): Promise<VerificationToken> {
    // Delete existing tokens for this user
    await db.delete(verificationTokens).where(eq(verificationTokens.userId, userId));
    const [token] = await db.insert(verificationTokens).values({
      userId,
      expiresAt: addHours(new Date(), 24),
    }).returning();
    return token;
  }

  async getVerificationToken(token: string): Promise<VerificationToken | undefined> {
    const [vt] = await db.select().from(verificationTokens).where(
      and(eq(verificationTokens.token, token), gt(verificationTokens.expiresAt, new Date()))
    );
    return vt;
  }

  async deleteVerificationToken(id: number): Promise<void> {
    await db.delete(verificationTokens).where(eq(verificationTokens.id, id));
  }

  async createResetToken(userId: number): Promise<ResetToken> {
    await db.delete(resetTokens).where(eq(resetTokens.userId, userId));
    const [token] = await db.insert(resetTokens).values({
      userId,
      expiresAt: addHours(new Date(), 1),
      used: false,
    }).returning();
    return token;
  }

  async getResetToken(token: string): Promise<ResetToken | undefined> {
    const [rt] = await db.select().from(resetTokens).where(
      and(
        eq(resetTokens.token, token),
        eq(resetTokens.used, false),
        gt(resetTokens.expiresAt, new Date())
      )
    );
    return rt;
  }

  async markResetTokenUsed(id: number): Promise<void> {
    await db.update(resetTokens).set({ used: true }).where(eq(resetTokens.id, id));
  }

  async getPlanConfig(): Promise<PlanConfig> {
    const [config] = await db.select().from(planConfig);
    if (!config) {
      // Seed default config
      const [newConfig] = await db.insert(planConfig).values({
        founderSpotsTotal: 300,
        founderSpotsUsed: 0,
        earlySpotsTotal: 300,
        earlySpotsUsed: 0,
      }).returning();
      return newConfig;
    }
    return config;
  }

  async incrementFounderSpot(): Promise<void> {
    const [config] = await db.select().from(planConfig);
    if (config) {
      await db.update(planConfig).set({ founderSpotsUsed: config.founderSpotsUsed + 1 }).where(eq(planConfig.id, config.id));
    }
  }

  async incrementEarlySpot(): Promise<void> {
    const [config] = await db.select().from(planConfig);
    if (config) {
      await db.update(planConfig).set({ earlySpotsUsed: config.earlySpotsUsed + 1 }).where(eq(planConfig.id, config.id));
    }
  }

  async recordUsage(userId: number): Promise<{ uploadsToday: number; uploadsMonth: number }> {
    const user = await this.getUserById(userId);
    if (!user) throw new Error("User not found");

    const now = new Date();
    let dailyCount = user.uploadsUsedToday;
    let monthlyCount = user.uploadsUsedMonth;

    // Check daily reset (24h)
    const lastDaily = user.lastDailyReset;
    if (!lastDaily || (now.getTime() - lastDaily.getTime()) > 24 * 60 * 60 * 1000) {
      dailyCount = 0;
    }

    // Check monthly reset (30 days)
    const lastMonthly = user.lastMonthlyReset;
    if (!lastMonthly || (now.getTime() - lastMonthly.getTime()) > 30 * 24 * 60 * 60 * 1000) {
      monthlyCount = 0;
    }

    const newDaily = dailyCount + 1;
    const newMonthly = monthlyCount + 1;

    await db.update(users).set({
      uploadsUsedToday: newDaily,
      uploadsUsedMonth: newMonthly,
      lifetimeFreeUsed: user.lifetimeFreeUsed + 1,
      lastDailyReset: dailyCount === 0 ? now : user.lastDailyReset,
      lastMonthlyReset: monthlyCount === 0 ? now : user.lastMonthlyReset,
    }).where(eq(users.id, userId));

    return { uploadsToday: newDaily, uploadsMonth: newMonthly };
  }

  async createPayment(data: { userId: number; orderId: string; amount: number; currency: string }): Promise<Payment> {
    const [payment] = await db.insert(payments).values({
      userId: data.userId,
      orderId: data.orderId,
      amount: data.amount,
      currency: data.currency,
      status: "pending",
      paymentProvider: "cashfree",
    }).returning();
    return payment;
  }

  async getPaymentByOrderId(orderId: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.orderId, orderId));
    return payment;
  }

  async updatePaymentStatus(
    orderId: string,
    status: string,
    extra?: { planType?: string; planDurationDays?: number; paidAt?: Date }
  ): Promise<Payment> {
    const [payment] = await db.update(payments).set({
      status,
      ...(extra?.planType ? { planType: extra.planType } : {}),
      ...(extra?.planDurationDays ? { planDurationDays: extra.planDurationDays } : {}),
      ...(extra?.paidAt ? { paidAt: extra.paidAt } : {}),
    }).where(eq(payments.orderId, orderId)).returning();
    return payment;
  }

  async countSuccessfulPayments(): Promise<number> {
    const [result] = await db.select({ total: count() }).from(payments).where(eq(payments.status, "success"));
    return result?.total ?? 0;
  }

  async activateUserPlan(userId: number, planType: string, durationDays: number): Promise<User> {
    const now = new Date();
    const planEndDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const [user] = await db.update(users).set({
      planType,
      planStartDate: now,
      planEndDate,
      uploadsUsedMonth: 0,
      uploadsUsedToday: 0,
      lastMonthlyReset: now,
      lastDailyReset: now,
    }).where(eq(users.id, userId)).returning();
    return user;
  }

  async setPendingPayment(userId: number, provider: string, plan: string): Promise<User> {
    const [user] = await db.update(users).set({
      pendingPlan: plan,
      pendingPayment: true,
      pendingDate: new Date(),
      paymentProvider: provider,
    }).where(eq(users.id, userId)).returning();
    return user;
  }

  async clearPendingPayment(userId: number): Promise<User> {
    const [user] = await db.update(users).set({
      pendingPlan: null,
      pendingPayment: false,
      pendingDate: null,
    }).where(eq(users.id, userId)).returning();
    return user;
  }

  async activateGumroadPlan(userId: number): Promise<User> {
    const now = new Date();
    const planEndDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const [user] = await db.update(users).set({
      planType: "pro",
      planStartDate: now,
      planEndDate,
      uploadsUsedMonth: 0,
      uploadsUsedToday: 0,
      lastMonthlyReset: now,
      lastDailyReset: now,
      pendingPlan: null,
      pendingPayment: false,
      pendingDate: null,
    }).where(eq(users.id, userId)).returning();
    return user;
  }
}

export const storage = new PgStorage();
