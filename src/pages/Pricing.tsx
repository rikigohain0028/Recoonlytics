import { useState, useEffect } from "react";
import {
  CheckCircle2,
  X,
  Zap,
  ArrowLeft,
  Lock,
  Zap as ZapIcon,
  Loader2,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Link, useLocation } from "wouter";
import Footer from "@/components/Footer";

interface SpotData {
  founderSpotsRemaining: number;
  founderSpotsTotal: number;
  earlySpotsRemaining: number;
  earlySpotsTotal: number;
}

const GUMROAD_URL = "https://recoonlytics.gumroad.com/l/bfkkx";

export default function Pricing() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { token, isAuthenticated, user } = useAuth();
  const [, navigate] = useLocation();
  const [spots, setSpots] = useState<SpotData>({
    founderSpotsRemaining: 300,
    founderSpotsTotal: 300,
    earlySpotsRemaining: 300,
    earlySpotsTotal: 300,
  });
  const [buying, setBuying] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch("/api/config/spots")
      .then((r) => r.json())
      .then(setSpots)
      .catch(() => {});
  }, []);

  const founderUsed = spots.founderSpotsTotal - spots.founderSpotsRemaining;
  const founderPct = Math.min(
    100,
    (founderUsed / spots.founderSpotsTotal) * 100,
  );
  const earlyUsed = spots.earlySpotsTotal - spots.earlySpotsRemaining;
  const earlyPct = Math.min(100, (earlyUsed / spots.earlySpotsTotal) * 100);

  const handleBuyPro = async () => {
    setErrorMsg("");
    if (!isAuthenticated || !token) {
      navigate("/");
      return;
    }
    if (user && user.planType !== "free") {
      setErrorMsg("You already have an active plan.");
      return;
    }

    setBuying(true);
    try {
      const res = await fetch("/api/payment/initiate-gumroad", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(
          data.message || "Failed to start payment. Please try again.",
        );
        setBuying(false);
        return;
      }
      window.location.href = data.gumroadUrl || GUMROAD_URL;
    } catch {
      setErrorMsg("Could not initiate payment. Please try again.");
      setBuying(false);
    }
  };

  const freeFeatures = [
    { label: "3 analyses per day", included: true },
    { label: "Upload CSV & XLSX (up to 20MB)", included: true },
    { label: "Data preview & exploration", included: true },
    { label: "Basic data cleaning (dedupe, trim, capitalize)", included: true },
    { label: "Statistics (min, max, avg, median, sum)", included: true },
    { label: "Interactive charts", included: true },
    { label: "AI Report", included: false },
    { label: "AI Assistant Chat", included: false },
    { label: "Combine & merge files", included: false },
    { label: "PDF data extraction", included: false },
    { label: "Advanced cleaning engine", included: false },
    { label: "Fuzzy duplicate detection", included: false },
  ];

  const proFeatures = [
    { label: "300 analyses per month", included: true },
    { label: "Upload CSV, XLSX, PDF (up to 20MB)", included: true },
    { label: "Advanced data cleaning engine", included: true },
    { label: "All statistics & analytics", included: true },
    { label: "AI Report (Recoonlytics Analyst AI)", included: true },
    { label: "AI Assistant Chat", included: true },
    { label: "Combine & merge up to 4 files", included: true },
    { label: "PDF data extraction", included: true },
    { label: "Fuzzy duplicate detection", included: true },
    { label: "Priority email support", included: true },
  ];

  const buyButtonLabel = !isAuthenticated
    ? "Sign In to Buy"
    : user && user.planType !== "free"
      ? "Plan Active"
      : buying
        ? "Redirecting to Payment…"
       : "Pay $34 (Global 🌍)";

  const buyDisabled = buying || (!!user && user.planType !== "free");

  return (
    <div
      className={`min-h-screen flex flex-col ${isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}
    >
      {/* Nav */}
      <header
        className={`border-b ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <span className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-[#1e3a8a] flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span
                className={`font-bold text-lg ${isDark ? "text-slate-100" : "text-[#1e3a8a]"}`}
              >
                Recoonlytics
              </span>
            </span>
          </Link>
          <Link href="/">
            <span
              className={`flex items-center gap-2 text-sm font-medium cursor-pointer ${isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900"}`}
            >
              <ArrowLeft className="w-4 h-4" /> Back to App
            </span>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-6 py-16 w-full">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1
            className={`text-4xl font-bold mb-4 ${isDark ? "text-slate-100" : "text-slate-900"}`}
          >
            Recoonlytics Pricing
          </h1>
          <p
            className={`text-lg max-w-xl mx-auto ${isDark ? "text-slate-400" : "text-slate-600"}`}
          >
            Start free. Upgrade when needed.
          </p>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="max-w-3xl mx-auto mb-6">
            <div className="bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl px-4 py-3 text-sm text-center">
              {errorMsg}
            </div>
          </div>
        )}

        {/* Limited Founder Offer Banner */}
        <div className="mb-12 max-w-3xl mx-auto">
          <div
            className={`relative rounded-2xl p-8 border-2 overflow-hidden ${
              isDark
                ? "border-amber-600/60 bg-gradient-to-br from-amber-900/20 to-amber-950/10"
                : "border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100/50"
            }`}
            style={{
              boxShadow: isDark
                ? "0 0 30px rgba(217, 119, 6, 0.15), inset 0 0 30px rgba(217, 119, 6, 0.05)"
                : "0 0 30px rgba(217, 119, 6, 0.2), inset 0 0 30px rgba(217, 119, 6, 0.08)",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5 pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6">
                <span className="px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5">
                  <ZapIcon className="w-3.5 h-3.5" /> Early Adopter Pricing
                </span>
              </div>

              <h2
                className={`text-2xl font-bold mb-2 ${isDark ? "text-amber-300" : "text-amber-700"}`}
              >
                Limited Founder Offer
              </h2>
              <p
                className={`text-sm mb-6 ${isDark ? "text-amber-200/80" : "text-amber-600"}`}
              >
                Be among the first to get Pro features at special founding
                prices. Limited spots remaining.
              </p>

              {/* Two offers side-by-side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                {/* Founder Spots */}
                <div
                  className={`rounded-xl p-4 border ${
                    isDark
                      ? "bg-amber-900/20 border-amber-700/40"
                      : "bg-amber-100/40 border-amber-300"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-bold mb-1 ${
                          isDark
                            ? "bg-amber-700/40 text-amber-300"
                            : "bg-amber-200 text-amber-700"
                        }`}
                      >
                        Early Founder Access
                      </span>
                      <p
                        className={`text-xs mt-1 ${isDark ? "text-amber-200/60" : "text-amber-600"}`}
                      >
                        First 300 users
                      </p>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span
                      className={`text-sm line-through ${isDark ? "text-amber-300/50" : "text-amber-600/50"}`}
                    >
                      ₹3,999
                    </span>
                    <span
                      className={`text-2xl font-bold ${isDark ? "text-amber-400" : "text-amber-600"}`}
                    >
                      ₹2,999
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">
                      25% OFF
                    </span>
                  </div>
                  <p
                    className={`text-xs mb-3 ${isDark ? "text-amber-200/70" : "text-amber-600"}`}
                  >
                    1 year Pro access — Price locked forever
                  </p>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-xs font-semibold ${isDark ? "text-amber-300" : "text-amber-700"}`}
                    >
                      {spots.founderSpotsRemaining} spots remaining
                    </span>
                    <span
                      className={`text-xs ${isDark ? "text-amber-400" : "text-amber-600"}`}
                    >
                      {spots.founderSpotsTotal}
                    </span>
                  </div>
                  <div
                    className={`w-full h-2 rounded-full overflow-hidden mb-4 ${isDark ? "bg-amber-900/40" : "bg-amber-200"}`}
                  >
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all"
                      style={{ width: `${founderPct}%` }}
                    />
                  </div>
                  <button 
className="w-full py-2 rounded-lg font-semibold text-sm mb-2 bg-yellow-500 hover:bg-yellow-600 text-black"
onClick={() => window.open("https://recoonlytics.gumroad.com/l/bxxuze","_blank")}
>
Pay ₹2999 (India)
</button>
                  <button
                    data-testid="buy-founder"
                    onClick={handleBuyPro}
                    disabled={buyDisabled || spots.founderSpotsRemaining <= 0}
                    className={`w-full py-2 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                      !buyDisabled && spots.founderSpotsRemaining > 0
                        ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:shadow-lg hover:shadow-amber-500/30"
                        : "bg-slate-400 text-slate-600 cursor-not-allowed opacity-50"
                    }`}
                  >
                    {buying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {spots.founderSpotsRemaining <= 0
                      ? "Sold Out"
                      : buyButtonLabel}
                  </button>
                </div>

                {/* Early Spots */}
                <div
                  className={`rounded-xl p-4 border ${
                    isDark
                      ? "bg-amber-900/20 border-amber-700/40"
                      : "bg-amber-100/40 border-amber-300"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-bold mb-1 ${
                          isDark
                            ? "bg-amber-700/40 text-amber-300"
                            : "bg-amber-200 text-amber-700"
                        }`}
                      >
                        Early Launch Offer
                      </span>
                      <p
                        className={`text-xs mt-1 ${isDark ? "text-amber-200/60" : "text-amber-600"}`}
                      >
                        Next 300 users
                      </p>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <span
                      className={`text-sm line-through ${isDark ? "text-amber-300/50" : "text-amber-600/50"}`}
                    >
                      ₹3,999
                    </span>
                    <span
                      className={`text-2xl font-bold ${isDark ? "text-amber-400" : "text-amber-600"}`}
                    >
                      ₹2,999
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">
                      25% OFF
                    </span>
                  </div>
                  <p
                    className={`text-xs mb-3 ${isDark ? "text-amber-200/70" : "text-amber-600"}`}
                  >
                    6 months Pro access — Price locked for early users
                  </p>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-xs font-semibold ${isDark ? "text-amber-300" : "text-amber-700"}`}
                    >
                      {spots.earlySpotsRemaining} spots remaining
                    </span>
                    <span
                      className={`text-xs ${isDark ? "text-amber-400" : "text-amber-600"}`}
                    >
                      {spots.earlySpotsTotal}
                    </span>
                  </div>
                  <div
                    className={`w-full h-2 rounded-full overflow-hidden mb-4 ${isDark ? "bg-amber-900/40" : "bg-amber-200"}`}
                  >
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all"
                      style={{ width: `${earlyPct}%` }}
                    />
                  </div>
                 <button
className="w-full py-2 rounded-lg font-semibold text-sm mb-2 bg-yellow-500 hover:bg-yellow-600 text-black"
onClick={() => window.open("https://recoonlytics.gumroad.com/l/bxxuze","_blank")}
>
Pay ₹2999 (India 🇮🇳)
</button> 
                  <button
                    data-testid="buy-early"
                    onClick={handleBuyPro}
                    disabled={buyDisabled || spots.earlySpotsRemaining <= 0}
                    className={`w-full py-2 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                      !buyDisabled && spots.earlySpotsRemaining > 0
                        ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:shadow-lg hover:shadow-amber-500/30"
                        : "bg-slate-400 text-slate-600 cursor-not-allowed opacity-50"
                    }`}
                  >
                    {buying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {spots.earlySpotsRemaining <= 0
                      ? "Sold Out"
                      : buyButtonLabel}
                  </button>
                </div>
              </div>

              <div
                className={`text-center text-sm font-semibold ${isDark ? "text-amber-300" : "text-amber-700"}`}
              >
                🔥 Limited spots remaining.
              </div>
            </div>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16 max-w-3xl mx-auto">
          {/* Free */}
          <div
            className={`rounded-2xl p-7 border flex flex-col ${isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}
          >
            <div className="mb-5">
              <h2
                className={`text-xl font-bold mb-1 ${isDark ? "text-slate-100" : "text-slate-900"}`}
              >
                Free
              </h2>
              <div className="flex items-baseline gap-1">
                <span
                  className={`text-4xl font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}
                >
                  ₹0
                </span>
              </div>
              <p
                className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}
              >
                Forever. No credit card needed.
              </p>
            </div>
            <ul className="space-y-3 flex-1 mb-6">
              {freeFeatures.map((f) => (
                <li key={f.label} className="flex items-start gap-2.5">
                  {f.included ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  )}
                  <span
                    className={`text-sm ${f.included ? (isDark ? "text-slate-300" : "text-slate-700") : isDark ? "text-slate-600" : "text-slate-400"}`}
                  >
                    {!f.included && (
                      <Lock className="inline w-3 h-3 mr-1 opacity-50" />
                    )}
                    {f.label}
                  </span>
                </li>
              ))}
            </ul>
            <Link href="/">
              <span
                className={`block w-full py-3 rounded-xl border text-center font-semibold text-sm cursor-pointer transition-colors ${
                  isDark
                    ? "border-slate-600 text-slate-300 hover:bg-slate-800"
                    : "border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Get Started Free
              </span>
            </Link>
          </div>

          {/* Pro */}
          <div
            className="rounded-2xl p-7 border-2 border-[#1e3a8a] bg-gradient-to-b from-blue-950/60 to-slate-900/80 flex flex-col relative"
            style={{
              boxShadow: "0 0 20px rgba(30, 58, 138, 0.2)",
            }}
          >
            <div className="mb-5">
              <span className="inline-block px-2 py-1 rounded text-xs font-bold mb-2 bg-blue-700/40 text-blue-300">
                Standard Pro
              </span>
              <h2 className="text-xl font-bold mb-1 text-white">Pro</h2>
              <div className="flex items-baseline gap-2">
                <span className="text-sm line-through text-blue-300/50">
                  ₹3,999
                </span>
                <span className="text-4xl font-bold text-white">₹2,999</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">
                  25% OFF
                </span>
              </div>
              <p className="text-xs mt-2 text-blue-300">
                /month · cancel anytime
              </p>
            </div>
            <ul className="space-y-3 flex-1 mb-6">
              {proFeatures.map((f) => (
                <li key={f.label} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-slate-200">{f.label}</span>
                </li>
              ))}
            </ul>
            <button
className="w-full py-2 rounded-lg font-semibold text-sm mb-2 bg-yellow-500 hover:bg-yellow-600 text-black"
onClick={() => window.open("https://recoonlytics.gumroad.com/l/bxxuze","_blank")}
>
Pay ₹2999 (India 🇮🇳)
</button>
            <button
              data-testid="buy-pro-card"
              onClick={handleBuyPro}
              disabled={buyDisabled}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${
                buyDisabled
                  ? "bg-slate-600 text-slate-400 cursor-not-allowed opacity-60"
                  : "bg-[#1e3a8a] hover:bg-[#1e40af] text-white"
              }`}
            >
              {buying && <Loader2 className="w-4 h-4 animate-spin" />}
              {buyButtonLabel}
            </button>
            <p className="text-xs text-slate-400 mt-2 text-center">
              Secure payment via Gumroad
            </p>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h3
            className={`text-2xl font-bold text-center mb-8 ${isDark ? "text-slate-100" : "text-slate-900"}`}
          >
            Frequently Asked Questions
          </h3>
          <div className="space-y-4">
            {[
              {
                q: "What counts as an analysis?",
                a: "Each time you upload and analyze a file counts as one analysis. The dashboard lets you clean, visualize, and export without extra charges.",
              },
              {
                q: "Can I use Recoonlytics without signing up?",
                a: "Yes! You get 2 free full analyses without signing up. After that, create a free account for 3 analyses per day.",
              },
              {
                q: "What happens if I reach my daily limit?",
                a: "Free users can come back the next day. Your counter resets every 24 hours. Or upgrade for 300 analyses per month.",
              },
              {
                q: "Is my data safe?",
                a: "All file processing happens in your browser — your data never reaches our servers. We take privacy seriously.",
              },
              {
                q: "How does the payment work?",
                a: 'We use Gumroad, a secure checkout platform. Click "Get Pro", complete payment on Gumroad ($34/month), then return here and click "I have completed payment" to activate your Pro plan instantly.',
              },
            ].map((item) => (
              <div
                key={item.q}
                className={`rounded-xl p-5 border ${isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}
              >
                <h4
                  className={`font-semibold mb-2 ${isDark ? "text-slate-100" : "text-slate-900"}`}
                >
                  {item.q}
                </h4>
                <p
                  className={`text-sm leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}
                >
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
