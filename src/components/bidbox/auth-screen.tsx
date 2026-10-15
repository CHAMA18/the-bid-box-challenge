"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { ArrowLeft, ArrowRight, CircleAlert, Eye, EyeOff, Lock } from "lucide-react";
import { BidBoxLogo } from "@/components/bidbox/logo";
import { Eyebrow } from "@/components/bidbox/reveal";
import type { AuthMode, AuthUser } from "@/lib/auth-types";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const EASE = [0.22, 1, 0.36, 1] as const;

/*
 * Demo workspace credentials. Sign-in never blocks: empty or malformed
 * fields resolve to this identity, and if the cloud account doesn't exist
 * yet it is silently provisioned — so pressing "Sign in" always opens
 * Mission Control.
 */
const DEMO = {
  name: "Naledi Mokoena",
  email: "n.mokoena@procurement.gov",
  password: "gatekeeper-01",
  organization: "Public Procurement Authority",
};

function deriveName(email: string): string {
  if (email.trim().toLowerCase() === DEMO.email) return DEMO.name;
  const parts = email.split("@")[0].split(/[._-]+/).filter(Boolean);
  if (parts.length === 0) return "Procurement Officer";
  return parts
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

/* ── The looping access terminal (left panel) ────────────────────────────── */

type LineKind = "cmd" | "step" | "ok" | "gate";
const SCRIPT: { text: string; kind: LineKind }[] = [
  { text: "bidbox-agent run --tender KE-NCB-104293 --format ocds", kind: "cmd" },
  { text: "▸ ingesting 214 pages · 4 bids parsed", kind: "step" },
  { text: "▸ document checklist — 16/16 present", kind: "step" },
  { text: "▸ cross-checking the supplier registry", kind: "step" },
  { text: "▸ 3 findings flagged · every claim cited", kind: "step" },
  { text: "✓ run complete — 6 findings · 6 citations · 0 unsourced", kind: "ok" },
  { text: "⏸ human gate — the committee awards the tender", kind: "gate" },
];

function AccessTerminal({ grantedFirstName }: { grantedFirstName: string | null }) {
  const [step, setStep] = useState(0);
  const done = step >= SCRIPT.length;

  useEffect(() => {
    if (step >= SCRIPT.length) {
      const t = setTimeout(() => setStep(0), 4600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep((s) => s + 1), step === 0 ? 750 : 640);
    return () => clearTimeout(t);
  }, [step]);

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-night-2/90 shadow-[0_36px_90px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-600/90" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        </div>
        <p className="font-code text-[9px] font-semibold tracking-[0.22em] text-ink-400">
          BIDBOX-AGENT · LIVE
        </p>
      </div>
      <div
        className="min-h-[178px] px-4 py-4 font-code text-[10.5px] leading-[1.95] sm:text-[11.5px]"
        role="img"
        aria-label="Animated terminal: a Bid Box agent run ingesting a tender, checking documents, citing findings and stopping at the human gate"
      >
        {SCRIPT.slice(0, step).map((line) => (
          <p
            key={line.text}
            className={cn(
              "transition-colors",
              line.kind === "cmd" && "text-ink-200",
              line.kind === "step" && "text-ink-400",
              line.kind === "ok" && "font-semibold text-white",
              line.kind === "gate" && "text-brand-300"
            )}
          >
            {line.kind === "cmd" && <span className="mr-2 text-brand-400">$</span>}
            {line.text}
          </p>
        ))}
        {!done && (
          <span className="mt-1 inline-block h-3.5 w-[7px] animate-pulse bg-brand-500" aria-hidden="true" />
        )}
        {grantedFirstName && (
          <p className="mt-1 font-semibold text-brand-300">
            ✓ session issued — welcome, {grantedFirstName}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Brand panel (left, dark) ────────────────────────────────────────────── */

const FACTS = ["26 DAYS → 20 MIN", "100% CITED", "1 HUMAN GATE"];

function CornerTicks() {
  const tick = "pointer-events-none absolute h-4 w-4 border-white/25";
  return (
    <div aria-hidden="true">
      <span className={cn(tick, "left-5 top-5 border-l border-t")} />
      <span className={cn(tick, "right-5 top-5 border-r border-t")} />
      <span className={cn(tick, "bottom-5 left-5 border-b border-l")} />
      <span className={cn(tick, "bottom-5 right-5 border-b border-r")} />
    </div>
  );
}

function BrandPanel({ grantedFirstName }: { grantedFirstName: string | null }) {
  return (
    <aside className="relative hidden flex-col justify-between overflow-hidden bg-night lg:flex">
      <div className="bg-grid-dark pointer-events-none absolute inset-0" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -left-44 top-1/3 h-[420px] w-[420px] rounded-full bg-brand-600/10 blur-[130px]"
        aria-hidden="true"
      />
      <CornerTicks />

      <div className="relative p-10 xl:p-14">
        <p className="flex items-center gap-2.5 font-code text-[10px] font-semibold uppercase tracking-[0.3em] text-ink-400">
          <span className="inline-block h-[2px] w-6 bg-brand-500" aria-hidden="true" />
          FIG. 03 — Secure access
        </p>
        <h2 className="mt-6 max-w-md font-display text-[32px] font-black leading-[1.08] tracking-[-0.02em] text-white xl:text-[38px]">
          The agent reads the file.{" "}
          <span className="text-brand-500">You</span> still award the tender.
        </h2>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-300">
          Your account is the last mile of that promise — every run, every finding and every
          sign-off is tied to a named human. No ghost decisions.
        </p>
        <div className="mt-8">
          <AccessTerminal grantedFirstName={grantedFirstName} />
        </div>
      </div>

      <div className="relative p-10 pt-0 xl:p-14 xl:pt-0">
        <ul className="flex flex-wrap gap-2.5" aria-label="What a Bid Box run guarantees">
          {FACTS.map((fact) => (
            <li
              key={fact}
              className="rounded-full border border-white/15 px-3.5 py-1.5 font-code text-[9.5px] font-semibold tracking-[0.18em] text-ink-200"
            >
              {fact}
            </li>
          ))}
        </ul>
        <div className="mt-6 border-l-2 border-brand-600 pl-4">
          <p className="max-w-md font-code text-[10px] leading-[1.9] tracking-[0.16em] text-ink-400">
            BID BOX PREPARES THE FILE.
            <br />
            IT NEVER AWARDS THE TENDER.
          </p>
        </div>
      </div>
    </aside>
  );
}

/* ── Compact brand strip (mobile) ────────────────────────────────────────── */

function BrandStrip() {
  return (
    <div className="relative overflow-hidden bg-night px-5 py-7 lg:hidden">
      <div className="bg-grid-dark pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative">
        <p className="flex items-center gap-2.5 font-code text-[9px] font-semibold uppercase tracking-[0.28em] text-ink-400">
          <span className="inline-block h-[2px] w-5 bg-brand-500" aria-hidden="true" />
          FIG. 03 — Secure access
        </p>
        <p className="mt-3 font-display text-[21px] font-black leading-[1.12] tracking-[-0.015em] text-white">
          The agent reads. <span className="text-brand-500">You</span> award.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="What a Bid Box run guarantees">
          {FACTS.map((fact) => (
            <li
              key={fact}
              className="rounded-full border border-white/15 px-3 py-1 font-code text-[8.5px] font-semibold tracking-[0.16em] text-ink-200"
            >
              {fact}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ── Form primitives ─────────────────────────────────────────────────────── */

function inputCls(invalid?: boolean) {
  return cn(
    "h-12 w-full rounded-xl border bg-white px-4 text-[14.5px] text-ink-900 outline-none transition-all placeholder:text-ink-300",
    invalid
      ? "border-brand-500 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15"
      : "border-ink-200 hover:border-ink-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-600/15"
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-brand-700">
      <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

const PW_CHECKS: { label: string; test: (pw: string) => boolean }[] = [
  { label: "8+ CHARS", test: (pw) => pw.length >= 8 },
  { label: "NUMBER", test: (pw) => /\d/.test(pw) },
  { label: "UPPER + LOWER", test: (pw) => /[a-z]/.test(pw) && /[A-Z]/.test(pw) },
  { label: "SYMBOL", test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

const PW_META = [
  { label: "AWAITING INPUT", seg: "bg-ink-300" },
  { label: "WEAK", seg: "bg-brand-600" },
  { label: "FAIR", seg: "bg-brand-400" },
  { label: "GOOD", seg: "bg-ink-500" },
  { label: "STRONG", seg: "bg-ink-950" },
];

/* ── Success panel — the stamp ───────────────────────────────────────────── */

function SuccessPanel({
  user,
  mode,
  onClose,
  onEnterWorkspace,
}: {
  user: AuthUser;
  mode: AuthMode;
  onClose: () => void;
  onEnterWorkspace: () => void;
}) {
  const firstName = user.name.trim().split(/\s+/)[0];
  const autoEnter = mode === "login";
  const enteredRef = useRef(false);

  const enter = () => {
    if (enteredRef.current) return;
    enteredRef.current = true;
    onEnterWorkspace();
  };

  /* Sign-ins open Mission Control automatically — no extra click. */
  useEffect(() => {
    if (!autoEnter) return;
    const t = setTimeout(enter, 1900);
    return () => clearTimeout(t);
  }, [autoEnter]);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-[440px] text-center"
      aria-live="polite"
    >
      <motion.div
        initial={{ scale: 2.3, opacity: 0, rotate: -17 }}
        animate={{ scale: 1, opacity: 1, rotate: -6 }}
        transition={{ type: "spring", stiffness: 240, damping: 16, delay: 0.18 }}
        className="mx-auto inline-block rounded-lg border-[3px] border-brand-600 px-7 py-3.5 shadow-[0_20px_50px_rgba(217,38,22,0.28)]"
      >
        <p className="font-display text-[22px] font-black tracking-[0.1em] text-brand-600 sm:text-[25px]">
          ACCESS GRANTED
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.34, ease: EASE }}
      >
        <h1 className="mt-9 font-display text-[32px] font-black leading-[1.06] tracking-[-0.02em] text-ink-950 sm:text-[38px]">
          {mode === "register" ? (
            <>
              Account opened<span className="text-brand-600">.</span>
            </>
          ) : (
            <>
              Welcome back<span className="text-brand-600">,</span>
            </>
          )}{" "}
          {firstName}.
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-ink-600">
          {mode === "register"
            ? "Your workspace is live. Connect a portal, map your checklist — and remember: the committee still holds the pen."
            : "The file is where you left it. Every finding still cited, every gate still human."}
        </p>

        {autoEnter && (
          <div className="mx-auto mt-7 w-full max-w-sm" aria-hidden="true">
            <div className="flex items-center justify-between font-code text-[8.5px] tracking-[0.2em] text-ink-400">
              <span>OPENING MISSION CONTROL</span>
              <span>SESSION · HTTPONLY</span>
            </div>
            <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-ink-100">
              <motion.div
                initial={{ width: "4%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.85, ease: "linear" }}
                className="h-full rounded-full bg-brand-600"
              />
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={enter}
          className="group mt-8 inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-ink-950 px-7 text-[15px] font-semibold text-white transition-all hover:bg-brand-600"
        >
          Enter mission control
          <ArrowRight
            className="h-4.5 w-4.5 transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-3.5 text-[13px] font-semibold text-ink-500 underline decoration-ink-300 underline-offset-4 transition-colors hover:text-brand-700 hover:decoration-brand-400"
        >
          Back to the site
        </button>

        <dl className="mx-auto mt-7 grid max-w-sm grid-cols-3 divide-x divide-ink-100 rounded-2xl border border-ink-100 bg-white py-4">
          {[
            ["SESSION", "HTTPONLY"],
            ["PASSWORD", "SCRYPT"],
            ["GATE", "HUMAN"],
          ].map(([k, v]) => (
            <div key={k} className="px-2">
              <dt className="font-code text-[8.5px] tracking-[0.22em] text-ink-400">{k}</dt>
              <dd className="mt-1 font-code text-[11px] font-bold tracking-[0.06em] text-ink-950">
                {v}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 font-code text-[8.5px] tracking-[0.2em] text-ink-400">
          SIGNED IN AS {user.email.toUpperCase()}
        </p>
      </motion.div>
    </motion.div>
  );
}

/* ── The screen ──────────────────────────────────────────────────────────── */

interface AuthScreenProps {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onSuccess: (user: AuthUser) => void;
  onEnterWorkspace: () => void;
  onClose: () => void;
}

export function AuthScreen({ mode, onModeChange, onSuccess, onEnterWorkspace, onClose }: AuthScreenProps) {
  const [values, setValues] = useState({ name: "", email: "", organization: "", password: "" });
  const [remember, setRemember] = useState(true);
  const [terms, setTerms] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<"form" | "sending" | "success">("form");
  const [granted, setGranted] = useState<AuthUser | null>(null);
  const [memoOpen, setMemoOpen] = useState(false);
  const shake = useAnimationControls();

  const pwScore = PW_CHECKS.filter((c) => c.test(values.password)).length;
  const pwMeta = PW_META[pwScore];
  const firstName = granted?.name.trim().split(/\s+/)[0] ?? null;

  function set(field: keyof typeof values, v: string) {
    setValues((prev) => ({ ...prev, [field]: v }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  /* Pre-fill the demo credentials the first time the login form shows. */
  useEffect(() => {
    if (mode !== "login") return;
    const id = requestAnimationFrame(() => {
      setValues((prev) =>
        prev.email || prev.password ? prev : { ...prev, email: DEMO.email, password: DEMO.password }
      );
    });
    return () => cancelAnimationFrame(id);
  }, [mode]);

  function validate(): Record<string, string> {
    /* Registration validates; sign-in never blocks — see submit(). */
    const e: Record<string, string> = {};
    if (mode === "register") {
      if (values.name.trim().length < 2) e.name = "Enter your full name.";
      if (!terms) e.terms = "Please accept the terms to continue.";
      if (!EMAIL_RE.test(values.email.trim())) e.email = "Enter a valid work email.";
      if (values.password.length < 8) e.password = "Use at least 8 characters.";
    }
    return e;
  }

  function grant(u: AuthUser) {
    setGranted(u);
    setStatus("success");
    onSuccess(u);
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setFormError(null);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      await shake.start({ x: [0, -10, 10, -6, 6, 0], transition: { duration: 0.38 } });
      return;
    }

    setStatus("sending");

    /*
     * Sign-in resolves silently: empty or malformed input falls back to the
     * demo identity, and an unknown email is provisioned on the fly. The one
     * honest failure is a real account with the wrong passphrase.
     */
    if (mode === "login") {
      let email = values.email.trim();
      let password = values.password;
      if (!EMAIL_RE.test(email)) email = DEMO.email;
      if (password.length === 0) password = DEMO.password;
      setValues((prev) => ({ ...prev, email, password }));

      const openLocal = () =>
        grant({
          id: `local-${Date.now()}`,
          name: deriveName(email),
          email,
          organization: null,
        });

      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, remember }),
        });
        const data = (await res.json().catch(() => null)) as
          | { user?: AuthUser; error?: string }
          | null;
        if (res.ok && data?.user) {
          grant(data.user);
          return;
        }

        if (res.status === 401 && password.length >= 8) {
          /* No account (yet)? Provision one silently and continue. */
          const reg = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: deriveName(email),
              email,
              password,
              organization: email === DEMO.email ? DEMO.organization : undefined,
            }),
          });
          if (reg.ok) {
            const rd = (await reg.json().catch(() => null)) as { user?: AuthUser } | null;
            if (rd?.user) {
              grant(rd.user);
              return;
            }
          }
          if (reg.status === 409) {
            /* A real account exists and the passphrase didn't match. */
            setFormError(
              "Incorrect email or password. Check your credentials and try again."
            );
            await shake.start({ x: [0, -10, 10, -6, 6, 0], transition: { duration: 0.38 } });
            setStatus("form");
            return;
          }
        }

        /* Server unreachable, rate-limited, or validation refused — open the local workspace. */
        openLocal();
      } catch {
        openLocal();
      }
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim(),
          password: values.password,
          organization: values.organization.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { user?: AuthUser; error?: string; errors?: Record<string, string> }
        | null;

      if (!res.ok || !data?.user) {
        if (data?.errors) setErrors(data.errors);
        setFormError(data?.error ?? "Something went wrong on our side. Try again.");
        setStatus("form");
        return;
      }

      grant(data.user);
    } catch {
      setFormError("Cannot reach the server. Check your connection and try again.");
      setStatus("form");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper font-body text-ink-900 antialiased">
      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between gap-4 border-b border-white/10 bg-night px-4 py-3.5 sm:px-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back to the Bid Box site"
          className="rounded-lg outline-none transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <BidBoxLogo variant="light" />
        </button>
        <div className="flex items-center gap-4 sm:gap-6">
          <p className="hidden items-center gap-2.5 font-code text-[9px] tracking-[0.22em] text-ink-400 md:flex">
            <span className="relative flex h-1.5 w-1.5">
              <span
                className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-brand-500"
                aria-hidden="true"
              />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-600" aria-hidden="true" />
            </span>
            SECURE · SCRYPT-HASHED · HTTPONLY SESSION
          </p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-white/15 px-4 text-[12.5px] font-semibold text-ink-200 transition-all hover:border-white/40 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to site
          </button>
        </div>
      </header>

      <div className="grid flex-1 lg:grid-cols-2">
        <BrandPanel grantedFirstName={firstName} />

        {/* Form column */}
        <main className="relative flex flex-col bg-paper">
          <BrandStrip />

          <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-10 lg:py-16">
            <div className="w-full max-w-[440px]">
              <AnimatePresence mode="wait">
                {status === "success" && granted ? (
                  <SuccessPanel
                    key="success"
                    user={granted}
                    mode={mode}
                    onClose={onClose}
                    onEnterWorkspace={onEnterWorkspace}
                  />
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10, transition: { duration: 0.18 } }}
                    transition={{ duration: 0.45, ease: EASE }}
                  >
                    <Eyebrow>
                      {mode === "register" ? "FIG. 01 — Request access" : "FIG. 02 — Sign in"}
                    </Eyebrow>
                    <h1 className="mt-4 font-display text-[36px] font-black leading-[1.04] tracking-[-0.025em] text-ink-950 sm:text-[42px]">
                      {mode === "register" ? (
                        <>
                          Create your account<span className="text-brand-600">.</span>
                        </>
                      ) : (
                        <>
                          Welcome back<span className="text-brand-600">.</span>
                        </>
                      )}
                    </h1>
                    <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
                      {mode === "register"
                        ? "One account for your procurement team. The agent prepares the file — you keep the gavel."
                        : "Sign in to your Bid Box workspace. The file is waiting, every finding cited."}
                    </p>

                    {/* Mode switch */}
                    <div
                      className="mt-7 grid grid-cols-2 rounded-full border border-ink-200 bg-white p-1"
                      role="tablist"
                      aria-label="Choose register or sign in"
                    >
                      {(["register", "login"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          role="tab"
                          aria-selected={mode === m}
                          onClick={() => onModeChange(m)}
                          className="relative h-9 rounded-full text-[13px] font-semibold transition-colors"
                        >
                          {mode === m && (
                            <motion.span
                              layoutId="auth-mode-pill"
                              className="absolute inset-0 rounded-full bg-ink-950"
                              transition={{ type: "spring", stiffness: 520, damping: 42 }}
                              aria-hidden="true"
                            />
                          )}
                          <span className={cn("relative", mode === m ? "text-white" : "text-ink-500")}>
                            {m === "register" ? "New here" : "Sign in"}
                          </span>
                        </button>
                      ))}
                    </div>

                    {mode === "login" && (
                      <p className="mt-3 flex items-center justify-center gap-1.5 text-center font-code text-[8px] font-semibold tracking-[0.18em] text-ink-400">
                        <Lock className="h-3 w-3 text-brand-600" aria-hidden="true" />
                        DEMO BUILD — ANY CREDENTIALS OPEN THE WORKSPACE
                      </p>
                    )}

                    <motion.div animate={shake}>
                      <form onSubmit={submit} noValidate className="mt-6 space-y-4">
                        <AnimatePresence initial={false}>
                          {mode === "register" && (
                            <motion.div
                              key="name"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.28, ease: EASE }}
                              className="overflow-hidden"
                            >
                              <label
                                htmlFor="auth-name"
                                className="mb-1.5 block font-code text-[9px] font-semibold tracking-[0.18em] text-ink-500"
                              >
                                FULL NAME
                              </label>
                              <input
                                id="auth-name"
                                type="text"
                                value={values.name}
                                onChange={(e) => set("name", e.target.value)}
                                placeholder="Naledi Mokoena"
                                autoComplete="name"
                                autoFocus
                                aria-invalid={!!errors.name}
                                aria-describedby={errors.name ? "auth-name-error" : undefined}
                                className={inputCls(!!errors.name)}
                              />
                              <FieldError id="auth-name-error" message={errors.name} />
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div>
                          <label
                            htmlFor="auth-email"
                            className="mb-1.5 block font-code text-[9px] font-semibold tracking-[0.18em] text-ink-500"
                          >
                            WORK EMAIL
                          </label>
                          <input
                            id="auth-email"
                            type="email"
                            value={values.email}
                            onChange={(e) => set("email", e.target.value)}
                            placeholder="n.mokoena@procurement.gov"
                            autoComplete="email"
                            {...(mode === "login" ? { autoFocus: true } : {})}
                            aria-invalid={!!errors.email}
                            aria-describedby={errors.email ? "auth-email-error" : undefined}
                            className={inputCls(!!errors.email)}
                          />
                          <FieldError id="auth-email-error" message={errors.email} />
                        </div>

                        <AnimatePresence initial={false}>
                          {mode === "register" && (
                            <motion.div
                              key="org"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.28, ease: EASE }}
                              className="overflow-hidden"
                            >
                              <label
                                htmlFor="auth-org"
                                className="mb-1.5 block font-code text-[9px] font-semibold tracking-[0.18em] text-ink-500"
                              >
                                ORGANISATION <span className="text-ink-300">· OPTIONAL</span>
                              </label>
                              <input
                                id="auth-org"
                                type="text"
                                value={values.organization}
                                onChange={(e) => set("organization", e.target.value)}
                                placeholder="Public procurement authority"
                                autoComplete="organization"
                                aria-invalid={!!errors.organization}
                                aria-describedby={errors.organization ? "auth-org-error" : undefined}
                                className={inputCls(!!errors.organization)}
                              />
                              <FieldError id="auth-org-error" message={errors.organization} />
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div>
                          <div className="mb-1.5 flex items-baseline justify-between">
                            <label
                              htmlFor="auth-password"
                              className="font-code text-[9px] font-semibold tracking-[0.18em] text-ink-500"
                            >
                              PASSWORD
                            </label>
                            {mode === "register" && (
                              <span className="font-code text-[8.5px] tracking-[0.14em] text-ink-300">
                                MIN. 8 CHARACTERS
                              </span>
                            )}
                          </div>
                          <div className="relative">
                            <input
                              id="auth-password"
                              type={showPw ? "text" : "password"}
                              value={values.password}
                              onChange={(e) => set("password", e.target.value)}
                              placeholder={mode === "register" ? "Create a passphrase" : "Your passphrase"}
                              autoComplete={mode === "register" ? "new-password" : "current-password"}
                              aria-invalid={!!errors.password}
                              aria-describedby={errors.password ? "auth-password-error" : undefined}
                              className={cn(inputCls(!!errors.password), "pr-12")}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPw((v) => !v)}
                              aria-label={showPw ? "Hide password" : "Show password"}
                              className="absolute right-2.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-ink-50 hover:text-ink-700"
                            >
                              {showPw ? (
                                <EyeOff className="h-4.5 w-4.5" aria-hidden="true" />
                              ) : (
                                <Eye className="h-4.5 w-4.5" aria-hidden="true" />
                              )}
                            </button>
                          </div>
                          <FieldError id="auth-password-error" message={errors.password} />

                          {/* Strength meter */}
                          {mode === "register" && values.password.length > 0 && (
                            <div className="mt-3" aria-live="polite">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex gap-1.5" aria-hidden="true">
                                  {[0, 1, 2, 3].map((i) => (
                                    <span
                                      key={i}
                                      className={cn(
                                        "h-1.5 w-10 rounded-full transition-colors duration-300",
                                        i < pwScore ? pwMeta.seg : "bg-ink-100"
                                      )}
                                    />
                                  ))}
                                </div>
                                <p className="font-code text-[9px] font-bold tracking-[0.18em] text-ink-500">
                                  {pwMeta.label}
                                </p>
                              </div>
                              <ul className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Password requirements">
                                {PW_CHECKS.map((c) => {
                                  const ok = c.test(values.password);
                                  return (
                                    <li
                                      key={c.label}
                                      className={cn(
                                        "rounded-md px-2 py-1 font-code text-[8.5px] font-semibold tracking-[0.14em] transition-colors duration-300",
                                        ok ? "bg-ink-950 text-white" : "bg-ink-50 text-ink-400"
                                      )}
                                    >
                                      {ok ? "✓ " : ""}
                                      {c.label}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Mode-specific row */}
                        {mode === "register" ? (
                          <div>
                            <label className="flex cursor-pointer items-start gap-3 rounded-xl px-0.5 py-1">
                              <input
                                type="checkbox"
                                className="peer sr-only"
                                checked={terms}
                                onChange={(e) => {
                                  setTerms(e.target.checked);
                                  setErrors((prev) => {
                                    if (!prev.terms) return prev;
                                    const next = { ...prev };
                                    delete next.terms;
                                    return next;
                                  });
                                }}
                                aria-invalid={!!errors.terms}
                                aria-describedby={errors.terms ? "auth-terms-error" : undefined}
                              />
                              <span
                                aria-hidden="true"
                                className={cn(
                                  "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-all",
                                  terms
                                    ? "border-brand-600 bg-brand-600 text-white"
                                    : errors.terms
                                      ? "border-brand-500 bg-white"
                                      : "border-ink-300 bg-white"
                                )}
                              >
                                <svg
                                  viewBox="0 0 12 12"
                                  className="h-3 w-3"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.4"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="m2.5 6.5 2.4 2.4L9.5 4" />
                                </svg>
                              </span>
                              <span className="text-[13px] leading-snug text-ink-600">
                                I agree to the{" "}
                                <span className="font-semibold text-ink-900">terms of use</span> and
                                the <span className="font-semibold text-ink-900">acceptable-use policy</span>.
                              </span>
                            </label>
                            <FieldError id="auth-terms-error" message={errors.terms} />
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center justify-between">
                              <label className="flex cursor-pointer items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  className="peer sr-only"
                                  checked={remember}
                                  onChange={(e) => setRemember(e.target.checked)}
                                />
                                <span
                                  aria-hidden="true"
                                  className={cn(
                                    "grid h-5 w-5 place-items-center rounded-md border transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-brand-600/30",
                                    remember
                                      ? "border-brand-600 bg-brand-600 text-white"
                                      : "border-ink-300 bg-white"
                                  )}
                                >
                                  <svg
                                    viewBox="0 0 12 12"
                                    className="h-3 w-3"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.4"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="m2.5 6.5 2.4 2.4L9.5 4" />
                                  </svg>
                                </span>
                                <span className="text-[13px] font-medium text-ink-700">
                                  Keep me signed in
                                </span>
                              </label>
                              <button
                                type="button"
                                onClick={() => setMemoOpen((v) => !v)}
                                aria-expanded={memoOpen}
                                className="text-[13px] font-semibold text-ink-600 underline decoration-ink-300 underline-offset-4 transition-colors hover:text-brand-700 hover:decoration-brand-400"
                              >
                                Forgot access?
                              </button>
                            </div>
                            <AnimatePresence initial={false}>
                              {memoOpen && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.28, ease: EASE }}
                                  className="overflow-hidden"
                                >
                                  <div className="mt-3 rounded-xl border border-ink-200 bg-sand px-4 py-3.5" role="note">
                                    <p className="font-code text-[9px] font-semibold tracking-[0.2em] text-ink-500">
                                      MEMO — ACCESS RESET
                                    </p>
                                    <p className="mt-1.5 text-[13px] leading-relaxed text-ink-700">
                                      Password resets are issued by your organisation’s gate
                                      administrator — include your work email in the request. Pilot
                                      users: reply to your onboarding mail.
                                    </p>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}

                        {/* Form-level error */}
                        <AnimatePresence>
                          {formError && (
                            <motion.p
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              role="alert"
                              className="flex items-start gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-[13px] font-semibold leading-snug text-brand-800"
                            >
                              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                              {formError}
                            </motion.p>
                          )}
                        </AnimatePresence>

                        {/* Submit */}
                        <button
                          type="submit"
                          disabled={status === "sending"}
                          className="group inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-ink-950 text-[15px] font-semibold text-white transition-all hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {status === "sending" ? (
                            <>
                              <span
                                className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                                aria-hidden="true"
                              />
                              {mode === "register" ? "Opening account…" : "Verifying…"}
                            </>
                          ) : (
                            <>
                              {mode === "register" ? "Create account" : "Sign in"}
                              <ArrowRight
                                className="h-4.5 w-4.5 transition-transform group-hover:translate-x-1"
                                aria-hidden="true"
                              />
                            </>
                          )}
                        </button>
                      </form>
                    </motion.div>

                    {/* Switch mode */}
                    <p className="mt-5 text-center text-[13.5px] text-ink-500">
                      {mode === "register" ? "Already have access?" : "New to Bid Box?"}{" "}
                      <button
                        type="button"
                        onClick={() => onModeChange(mode === "register" ? "login" : "register")}
                        className="font-semibold text-brand-700 underline decoration-brand-300 underline-offset-4 transition-colors hover:text-brand-800 hover:decoration-brand-500"
                      >
                        {mode === "register" ? "Sign in" : "Create an account"}
                      </button>
                    </p>

                    <p className="mt-7 text-center font-code text-[8.5px] tracking-[0.22em] text-ink-400">
                      SCRYPT-HASHED PASSWORDS · HTTPONLY SESSIONS · NO TRACKERS
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right column footer */}
          <div className="border-t border-ink-100 px-4 py-4 text-center sm:px-10">
            <p className="font-code text-[8.5px] tracking-[0.24em] text-ink-400">
              THE BID BOX · AGENTIC PROCUREMENT · THE COMMITTEE SIGNS — THE AGENT NEVER DOES
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
