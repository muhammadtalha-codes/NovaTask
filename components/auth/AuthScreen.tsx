"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Sparkles, Mail, Lock, User, ArrowLeft, Loader2, Brain, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";

type Mode = "login" | "signup" | "forgot";

export function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center p-4 sm:p-6">
      {/* Ambient orbs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute -top-32 -left-24 h-96 w-96 rounded-full blur-3xl opacity-50 animate-float-slow"
          style={{ background: "radial-gradient(circle, var(--brand), transparent 70%)" }}
        />
        <div
          className="absolute top-1/3 -right-24 h-96 w-96 rounded-full blur-3xl opacity-40 animate-float-delayed"
          style={{ background: "radial-gradient(circle, var(--brand-2), transparent 70%)" }}
        />
        <div
          className="absolute -bottom-32 left-1/3 h-96 w-96 rounded-full blur-3xl opacity-40 animate-float"
          style={{ background: "radial-gradient(circle, var(--brand-3), transparent 70%)" }}
        />
      </div>

      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-2 items-center">
        {/* Left: brand / pitch */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="hidden lg:flex flex-col gap-6"
        >
          <div className="flex items-center gap-3">
            <LogoMark />
            <div>
              <div className="text-2xl font-semibold tracking-tight text-gradient">
                NovaTask
              </div>
              <div className="text-sm text-muted-foreground">
                AI-powered 3D productivity
              </div>
            </div>
          </div>

          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Talk to your tasks. <br />
            <span className="text-gradient">Nova organizes the rest.</span>
          </h1>
          <p className="text-muted-foreground leading-relaxed max-w-md">
            Just tell Nova what you have to do in plain English. It creates your
            tasks, sets priorities, deadlines and reminders, and builds a
            sensible plan — all in a smooth 3D workspace.
          </p>

          <ul className="space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-[var(--brand-3)]" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Right: auth card */}
        <motion.div
          initial={{ opacity: 0, y: 24, rotateX: 6 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="perspective-1000"
        >
          <Card className="glass-strong card-3d gradient-border relative overflow-hidden rounded-2xl">
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-3 lg:hidden">
                <LogoMark />
                <div className="text-xl font-semibold text-gradient">NovaTask</div>
              </div>
              <AnimatePresence mode="wait">
                {mode === "login" && (
                  <Header
                    key="login"
                    title="Welcome back"
                    desc="Sign in to continue to your dashboard."
                  />
                )}
                {mode === "signup" && (
                  <Header
                    key="signup"
                    title="Create your account"
                    desc="Join Nova in seconds. No credit card required."
                  />
                )}
                {mode === "forgot" && (
                  <Header
                    key="forgot"
                    title="Reset your password"
                    desc="We'll send reset instructions to your email."
                  />
                )}
              </AnimatePresence>
            </CardHeader>

            <CardContent>
              <AnimatePresence mode="wait">
                {mode === "login" && (
                  <LoginForm
                    key="login"
                    onSwap={(m) => setMode(m)}
                    onDone={() => router.refresh()}
                  />
                )}
                {mode === "signup" && (
                  <SignupForm key="signup" onSwap={(m) => setMode(m)} onDone={() => router.refresh()} />
                )}
                {mode === "forgot" && (
                  <ForgotForm key="forgot" onBack={() => setMode("login")} />
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function Header({ title, desc }: { title: string; desc: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25 }}
    >
      <CardTitle className="text-2xl">{title}</CardTitle>
      <CardDescription>{desc}</CardDescription>
    </motion.div>
  );
}

function LoginForm({
  onSwap,
  onDone,
}: {
  onSwap: (m: Mode) => void;
  onDone: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (!res || res.error) {
        toast.error(res?.error ?? "Invalid credentials. Please try again.");
        setLoading(false);
        return;
      }
      toast.success("Welcome back! Redirecting...");
      onDone();
      setTimeout(() => window.location.reload(), 400);
    } catch (e: any) {
      toast.error(e?.message ?? "Sign in failed.");
      setLoading(false);
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      onSubmit={submit}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="pl-9"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <button
            type="button"
            onClick={() => onSwap("forgot")}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Forgot password?
          </button>
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className="pl-9"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Sign in
          </>
        )}
      </Button>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/60" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={async () => {
          setLoading(true);
          const r = await signIn("credentials", {
            email: "demo@novatask.app",
            password: "demo1234",
            redirect: false,
          });
          if (!r || r.error) {
            toast.error("Demo account not available yet. Please sign up first.");
            setLoading(false);
            return;
          }
          window.location.reload();
        }}
        disabled={loading}
      >
        <Brain className="h-4 w-4" />
        Try the demo account
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <button
          type="button"
          onClick={() => onSwap("signup")}
          className="font-medium text-foreground hover:text-[var(--brand)] transition-colors"
        >
          Create an account
        </button>
      </p>
    </motion.form>
  );
}

function SignupForm({
  onSwap,
  onDone,
}: {
  onSwap: (m: Mode) => void;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      const res = await api("/api/auth/register", {
        method: "POST",
        json: { name, email, password },
      });
      if (!res.ok) throw new Error(res.error ?? "Signup failed");
      const r = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (!r || r.error) throw new Error(r?.error ?? "Could not sign you in.");
      toast.success("Account created. Welcome to NovaTask!");
      onDone();
      setTimeout(() => window.location.reload(), 400);
    } catch (e: any) {
      toast.error(e?.message ?? "Signup failed.");
      setLoading(false);
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      onSubmit={submit}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Full name</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="name"
            placeholder="Ada Lovelace"
            className="pl-9"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="su-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="pl-9"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="su-password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 6 characters"
            className="pl-9"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Create account
          </>
        )}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <button
          type="button"
          onClick={() => onSwap("login")}
          className="font-medium text-foreground hover:text-[var(--brand)] transition-colors"
        >
          Sign in
        </button>
      </p>
    </motion.form>
  );
}

function ForgotForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email.");
      return;
    }
    setLoading(true);
    try {
      await api("/api/auth/forgot-password", { method: "POST", json: { email } });
      setSent(true);
    } catch (e: any) {
      toast.error(e?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      {sent ? (
        <div className="rounded-lg border border-[var(--brand-3)]/40 bg-[color-mix(in_oklch,var(--brand-3)_12%,transparent)] p-4 text-sm">
          <p className="font-medium">Check your inbox</p>
          <p className="text-muted-foreground mt-1">
            If an account exists for {email}, you'll receive reset instructions.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fp-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="fp-email"
                type="email"
                placeholder="you@example.com"
                className="pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>
      )}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </button>
    </motion.div>
  );
}

function LogoMark() {
  return (
    <div className="relative h-10 w-10">
      <div
        className="absolute inset-0 rounded-xl glow-ring animate-pulse-glow"
        style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-2))" }}
      />
      <div className="absolute inset-0 flex items-center justify-center text-white">
        <Brain className="h-5 w-5" />
      </div>
    </div>
  );
}

const FEATURES = [
  "Natural-language task creation",
  "Smart priority & deadline detection",
  "Plan My Day — AI-built schedules",
  "3D glass dashboard & calendar",
  "Reminders, analytics & dark mode",
];
