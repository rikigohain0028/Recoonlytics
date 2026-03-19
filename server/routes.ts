import type { Express, Request, Response } from "express";
import type { Server } from "http";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { sendVerificationEmail, sendWelcomeEmail, sendResetEmail } from "./email";
import { log } from "./index";
import { createCashfreeOrder, getCashfreeOrderStatus } from "./cashfree";

const JWT_SECRET = process.env.JWT_SECRET || "rco_jwt_secret_2024_please_set_env";
const JWT_EXPIRES = "30d";

// ── Admin owner account ───────────────────────────────────────────────────
const ADMIN_EMAIL = "rikigohain0028@gmail.com";

// ── Plan limits ──────────────────────────────────────────────────────────
const DAILY_FREE_LIMIT = 3;
const MONTHLY_PREMIUM_LIMIT = 300;

function getBaseUrl(req: Request): string {
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  const host = (req.headers["x-forwarded-host"] as string) || req.headers.host || "";
  if (host) return `${proto}://${host}`;
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  if (domain) return `https://${domain}`;
  return process.env.APP_URL || "https://recoonlytics.replit.app";
}

function signToken(userId: number): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function verifyToken(token: string): { sub: number } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { sub: number };
  } catch {
    return null;
  }
}

function extractToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

async function requireAuth(req: Request, res: Response): Promise<{ userId: number } | null> {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ message: "Authentication required" });
    return null;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ message: "Invalid or expired token" });
    return null;
  }
  return { userId: payload.sub };
}

// ── Rate limiting (simple in-memory) ──────────────────────────────────
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  // ── Auth Routes ──────────────────────────────────────────────────────

  // POST /api/auth/signup
  app.post("/api/auth/signup", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ message: "Email and password are required" });
      if (typeof email !== "string" || !email.includes("@")) return res.status(400).json({ message: "Invalid email address" });
      if (typeof password !== "string" || password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

      const existing = await storage.getUserByEmail(email);
      if (existing) return res.status(409).json({ message: "An account with this email already exists" });

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await storage.createUser({ email, passwordHash });

      // Create and send verification token
      const vt = await storage.createVerificationToken(user.id);
      const baseUrl = getBaseUrl(req);
      try {
        await sendVerificationEmail(user.email, vt.token, baseUrl);
      } catch (err) {
        log(`Warning: Failed to send verification email: ${err}`);
      }

      const token = signToken(user.id);
      return res.status(201).json({
        message: "Account created. Please check your email to verify your account.",
        token,
        user: {
          id: user.id,
          email: user.email,
          planType: user.planType,
          emailVerified: user.emailVerified,
          uploadsUsedToday: user.uploadsUsedToday,
          uploadsUsedMonth: user.uploadsUsedMonth,
        },
      });
    } catch (err) {
      log(`Signup error: ${err}`);
      return res.status(500).json({ message: "Server error during signup" });
    }
  });

  // POST /api/auth/login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const ip = req.ip || "unknown";
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ message: "Too many login attempts. Please try again in 15 minutes." });
    }

    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

      const user = await storage.getUserByEmail(email);
      if (!user) return res.status(401).json({ message: "Invalid email or password" });

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return res.status(401).json({ message: "Invalid email or password" });

      const token = signToken(user.id);
      return res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          planType: user.planType,
          emailVerified: user.emailVerified,
          uploadsUsedToday: user.uploadsUsedToday,
          uploadsUsedMonth: user.uploadsUsedMonth,
        },
      });
    } catch (err) {
      log(`Login error: ${err}`);
      return res.status(500).json({ message: "Server error during login" });
    }
  });

  // GET /api/auth/me
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    try {
      const user = await storage.getUserById(auth.userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      return res.json({
        id: user.id,
        email: user.email,
        planType: user.planType,
        emailVerified: user.emailVerified,
        uploadsUsedToday: user.uploadsUsedToday,
        uploadsUsedMonth: user.uploadsUsedMonth,
        lifetimeFreeUsed: user.lifetimeFreeUsed,
        createdAt: user.createdAt,
        pendingPayment: user.pendingPayment,
        pendingPlan: user.pendingPlan,
        paymentProvider: user.paymentProvider,
        planStartDate: user.planStartDate,
        planEndDate: user.planEndDate,
      });
    } catch (err) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // POST /api/auth/verify-email
  app.post("/api/auth/verify-email", async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ message: "Token is required" });

      const vt = await storage.getVerificationToken(token);
      if (!vt) return res.status(400).json({ message: "Invalid or expired verification link. Please request a new one." });

      await storage.updateUser(vt.userId, { emailVerified: true });
      await storage.deleteVerificationToken(vt.id);

      // Promote admin owner account automatically after verification
      const user = await storage.getUserById(vt.userId);
      if (user && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        await storage.updateUser(vt.userId, { planType: "pro", isAdmin: true });
      }

      // Send welcome email
      const verifyBaseUrl = getBaseUrl(req);
      if (user) {
        try { await sendWelcomeEmail(user.email, verifyBaseUrl); } catch {}
      }

      return res.json({ message: "Email verified successfully! Welcome to Recoonlytics." });
    } catch (err) {
      return res.status(500).json({ message: "Server error during verification" });
    }
  });

  // POST /api/auth/resend-verification
  app.post("/api/auth/resend-verification", async (req: Request, res: Response) => {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    try {
      const user = await storage.getUserById(auth.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (user.emailVerified) return res.status(400).json({ message: "Email is already verified" });

      const vt = await storage.createVerificationToken(user.id);
      await sendVerificationEmail(user.email, vt.token, getBaseUrl(req));
      return res.json({ message: "Verification email sent" });
    } catch (err) {
      return res.status(500).json({ message: "Failed to send verification email" });
    }
  });

  // POST /api/auth/forgot-password
  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email is required" });

      const user = await storage.getUserByEmail(email);
      // Always return success to avoid user enumeration
      if (user) {
        const rt = await storage.createResetToken(user.id);
        try { await sendResetEmail(user.email, rt.token, getBaseUrl(req)); } catch {}
      }

      return res.json({ message: "If an account exists with this email, a reset link has been sent." });
    } catch (err) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // POST /api/auth/reset-password
  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) return res.status(400).json({ message: "Token and password are required" });
      if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

      const rt = await storage.getResetToken(token);
      if (!rt) return res.status(400).json({ message: "Invalid or expired reset link. Please request a new one." });

      const passwordHash = await bcrypt.hash(password, 12);
      await storage.updateUser(rt.userId, { passwordHash });
      await storage.markResetTokenUsed(rt.id);

      return res.json({ message: "Password reset successfully. You can now log in with your new password." });
    } catch (err) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // POST /api/auth/record-usage
  app.post("/api/auth/record-usage", async (req: Request, res: Response) => {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    try {
      const user = await storage.getUserById(auth.userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Admin owner has unlimited access — skip all limit checks
      if (user.isAdmin) {
        const usage = await storage.recordUsage(auth.userId);
        return res.json({
          uploadsToday: usage.uploadsToday,
          uploadsMonth: usage.uploadsMonth,
          limitReached: false,
          remaining: null,
        });
      }

      // Check limits
      const isPremium = user.planType !== "free";
      if (!isPremium) {
        // Free: check daily limit (after reset)
        const now = Date.now();
        const lastDaily = user.lastDailyReset?.getTime() || 0;
        const resetElapsed = now - lastDaily;
        const currentDaily = resetElapsed > 24 * 60 * 60 * 1000 ? 0 : user.uploadsUsedToday;

        if (currentDaily >= DAILY_FREE_LIMIT) {
          return res.status(429).json({
            message: `You've reached your free limit of ${DAILY_FREE_LIMIT} analyses today. Upgrade or come back tomorrow.`,
            limitReached: true,
            limitType: "daily",
          });
        }
      } else {
        // Premium: check monthly limit
        const now = Date.now();
        const lastMonthly = user.lastMonthlyReset?.getTime() || 0;
        const monthlyElapsed = now - lastMonthly;
        const currentMonthly = monthlyElapsed > 30 * 24 * 60 * 60 * 1000 ? 0 : user.uploadsUsedMonth;

        if (currentMonthly >= MONTHLY_PREMIUM_LIMIT) {
          return res.status(429).json({
            message: `You've reached your monthly limit of ${MONTHLY_PREMIUM_LIMIT} analyses.`,
            limitReached: true,
            limitType: "monthly",
          });
        }
      }

      const usage = await storage.recordUsage(auth.userId);
      const limitForPlan = isPremium ? MONTHLY_PREMIUM_LIMIT : DAILY_FREE_LIMIT;
      const usedCount = isPremium ? usage.uploadsMonth : usage.uploadsToday;

      return res.json({
        uploadsToday: usage.uploadsToday,
        uploadsMonth: usage.uploadsMonth,
        limitReached: false,
        remaining: Math.max(0, limitForPlan - usedCount),
      });
    } catch (err) {
      log(`Record usage error: ${err}`);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // GET /api/config/spots
  app.get("/api/config/spots", async (_req: Request, res: Response) => {
    try {
      const config = await storage.getPlanConfig();
      return res.json({
        founderSpotsRemaining: Math.max(0, config.founderSpotsTotal - config.founderSpotsUsed),
        founderSpotsTotal: config.founderSpotsTotal,
        earlySpotsRemaining: Math.max(0, config.earlySpotsTotal - config.earlySpotsUsed),
        earlySpotsTotal: config.earlySpotsTotal,
      });
    } catch (err) {
      return res.json({ founderSpotsRemaining: 300, founderSpotsTotal: 300, earlySpotsRemaining: 300, earlySpotsTotal: 300 });
    }
  });

  // POST /api/payment/initiate-gumroad  ──  mark pending payment, return Gumroad URL
  app.post("/api/payment/initiate-gumroad", async (req: Request, res: Response) => {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    try {
      const user = await storage.getUserById(auth.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (!user.emailVerified) return res.status(403).json({ message: "Please verify your email before purchasing." });
      if (user.planType !== "free") return res.status(400).json({ message: "You already have an active plan." });

      await storage.setPendingPayment(auth.userId, "gumroad", "PRO");

      return res.json({
        gumroadUrl: "https://recoonlytics.gumroad.com/l/bfkkx",
        message: "Pending payment recorded. Redirecting to Gumroad.",
      });
    } catch (err) {
      log(`Gumroad initiate error: ${err}`);
      return res.status(500).json({ message: "Server error. Please try again." });
    }
  });

  // POST /api/payment/confirm-gumroad  ──  user confirms they completed Gumroad payment
  app.post("/api/payment/confirm-gumroad", async (req: Request, res: Response) => {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    try {
      const user = await storage.getUserById(auth.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (!user.pendingPayment) return res.status(400).json({ message: "No pending payment found." });
      if (user.planType !== "free") return res.status(400).json({ message: "You already have an active plan." });

      const updatedUser = await storage.activateGumroadPlan(auth.userId);

      return res.json({
        success: true,
        message: "Pro activated successfully",
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          planType: updatedUser.planType,
          emailVerified: updatedUser.emailVerified,
          uploadsUsedToday: updatedUser.uploadsUsedToday,
          uploadsUsedMonth: updatedUser.uploadsUsedMonth,
          lifetimeFreeUsed: updatedUser.lifetimeFreeUsed,
          pendingPayment: updatedUser.pendingPayment,
          pendingPlan: updatedUser.pendingPlan,
          paymentProvider: updatedUser.paymentProvider,
          planStartDate: updatedUser.planStartDate,
          planEndDate: updatedUser.planEndDate,
        },
      });
    } catch (err) {
      log(`Gumroad confirm error: ${err}`);
      return res.status(500).json({ message: "Failed to activate plan. Please contact support." });
    }
  });

  // POST /api/payment/create-order  ──  create a Cashfree order for Pro plan
  app.post("/api/payment/create-order", async (req: Request, res: Response) => {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    try {
      const user = await storage.getUserById(auth.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (!user.emailVerified) return res.status(403).json({ message: "Please verify your email before purchasing." });
      if (user.planType !== "free") return res.status(400).json({ message: "You already have an active plan." });

      const orderId = `RCO-${user.id}-${Date.now()}`;
      const baseUrl = getBaseUrl(req);
      const returnUrl = `${baseUrl}/payment-success?order_id={order_id}`;

      const cfOrder = await createCashfreeOrder({
        orderId,
        amount: 2999,
        currency: "INR",
        userId: String(user.id),
        userEmail: user.email,
        returnUrl,
        orderNote: "Recoonlytics Pro Plan",
      });

      await storage.createPayment({
        userId: user.id,
        orderId,
        amount: 2999,
        currency: "INR",
      });

      return res.json({
        orderId,
        paymentSessionId: cfOrder.payment_session_id,
        orderStatus: cfOrder.order_status,
      });
    } catch (err) {
      log(`Payment create-order error: ${err}`);
      return res.status(500).json({ message: "Failed to create payment order. Please try again." });
    }
  });

  // POST /api/payment/verify  ──  verify a completed Cashfree payment
  app.post("/api/payment/verify", async (req: Request, res: Response) => {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    try {
      const { orderId } = req.body;
      if (!orderId) return res.status(400).json({ message: "orderId is required" });

      const payment = await storage.getPaymentByOrderId(orderId);
      if (!payment) return res.status(404).json({ message: "Payment record not found" });
      if (payment.userId !== auth.userId) return res.status(403).json({ message: "Forbidden" });

      if (payment.status === "success") {
        const user = await storage.getUserById(auth.userId);
        return res.json({ success: true, planType: payment.planType, message: "Payment already verified", user });
      }

      const cfStatus = await getCashfreeOrderStatus(orderId);
      log(`Cashfree order status for ${orderId}: ${cfStatus.order_status}`);

      if (cfStatus.order_status === "PAID") {
        const paidCount = await storage.countSuccessfulPayments();
        let planType: string;
        let durationDays: number;

        const config = await storage.getPlanConfig();
        if (config.founderSpotsUsed < config.founderSpotsTotal) {
          planType = "founder";
          durationDays = 365;
          await storage.incrementFounderSpot();
        } else if (config.earlySpotsUsed < config.earlySpotsTotal) {
          planType = "early";
          durationDays = 180;
          await storage.incrementEarlySpot();
        } else {
          planType = "pro";
          durationDays = 30;
        }

        await storage.updatePaymentStatus(orderId, "success", {
          planType,
          planDurationDays: durationDays,
          paidAt: new Date(),
        });

        const user = await storage.activateUserPlan(auth.userId, planType, durationDays);

        return res.json({
          success: true,
          planType,
          durationDays,
          message: `Welcome to Recoonlytics ${planType === "founder" ? "Founder" : planType === "early" ? "Early" : "Pro"} Plan!`,
          user,
        });
      }

      if (cfStatus.order_status === "EXPIRED" || cfStatus.order_status === "TERMINATED") {
        await storage.updatePaymentStatus(orderId, "failed");
        return res.json({ success: false, message: "Payment was not completed. Please try again." });
      }

      return res.json({ success: false, message: "Payment is still pending. Please complete payment.", status: cfStatus.order_status });
    } catch (err) {
      log(`Payment verify error: ${err}`);
      return res.status(500).json({ message: "Failed to verify payment. Please contact support." });
    }
  });

  return httpServer;
}
