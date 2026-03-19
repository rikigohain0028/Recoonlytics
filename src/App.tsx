import React from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { UsageProvider } from "./context/UsageContext";
import { DataProvider } from "./context/DataContext";
import { AuthModal } from "./components/auth/AuthModal";
import { PricingModal } from "./components/auth/PricingModal";
import { PendingPaymentBanner } from "./components/PendingPaymentBanner";
import NotFound from "@/pages/not-found";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Pricing from "./pages/Pricing";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Security from "./pages/Security";
import Contact from "./pages/Contact";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailed from "./pages/PaymentFailed";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/security" component={Security} />
      <Route path="/contact" component={Contact} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/payment-success" component={PaymentSuccess} />
      <Route path="/payment-failed" component={PaymentFailed} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <DataProvider>
              <UsageProvider>
                <Toaster />
                <AuthModal />
                <PricingModal />
                <PendingPaymentBanner />
                <Router />
              </UsageProvider>
            </DataProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
