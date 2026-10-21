"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Building2,
  Check,
  CircleAlert,
  CircleCheck,
  Clock,
  FileText,
  LayoutGrid,
  Loader2,
  ScrollText,
  Stamp,
  UserRound,
  X,
} from "lucide-react";
import { QuorumLogo } from "@/components/quorum/logo";
import { SearchSelect, type SelectOption } from "@/components/quorum/org/search-select";
import { COUNTRIES, SUGGESTED_COUNTRIES, findCountry, type Country } from "@/lib/countries";
import { LEGAL_FORMS, LEGAL_FORM_GROUPS, LEGAL_FORM_OTHER } from "@/lib/legal-forms";
import type { PublicOrg } from "@/lib/org-auth";
import { cn } from "@/lib/utils";

/**
 * The organization console — the supplier's desk. Four surfaces: Overview
 * (what the desk sees), Profile (the legal identity, editable), Opportunities
 * (the open tenders, with apply) and Applications (what this organization has
 * on the record). Every application it files is attested org:<name> and lands
 * in the same audit spine the officers read.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

type Tender = {
  ref: string;
  title: string;
  buyer: string;
  sector: string;
  currency: string;
  budget: string;
  format: string;
  closingDate?: string;
  closingKnown: boolean;
  status: "OPEN" | "CLOSED";
  daysLeft?: number;
  applications: number;
};

type Application = {
  id: string;
  tenderId: string;
  orgName: string;
  amount: number;
  currency?: string;
  coverNote?: string;
  receivedAt: string;
  status: string;
};

type Tab = "overview" | "profile" | "opportunities" | "applications";

const inputCls =
  "h-11 w-full rounded-xl border border-ink-200 bg-white px-3.5 text-[14px] text-ink-950 outline-none transition-all placeholder:text-ink-300 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/10 dark:border-ink-800 dark:bg-night-2 dark:text-white dark:placeholder:text-ink-500";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="font-code text-[9.5px] font-semibold uppercase tracking-[0.16em] text-ink-500 dark:text-ink-400">{label}</span>
      {children}
      {hint ? <span className="block text-[11.5px] text-ink-400 dark:text-ink-500">{hint}</span> : null}
    </label>
  );
}

function money(amount: number, currency?: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: currency && currency.length === 3 ? "currency" : "decimal",
      currency: currency && currency.length === 3 ? currency : undefined,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency ?? ""} ${amount.toLocaleString()}`.trim();
  }
}

function fmtDate(iso: string | Date | undefined): string {
  if (!iso) return "—";
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function completeness(o: PublicOrg): { filled: number; total: number; missing: string[] } {
  const checks: [string, unknown][] = [
    ["legal name", o.name],
    ["registration no", o.registrationNo],
    ["country", o.country],
    ["legal form", o.legalForm],
    ["tax PIN", o.taxPin],
    ["tax clearance", o.taxClearanceNo],
    ["clearance expiry", o.taxClearanceExpiry],
    ["sector regulator", o.regulator],
    ["contact person", o.contactName],
    ["phone", o.phone],
    ["address", o.address],
    ["description", o.description],
    ["categories", o.categories.length > 0],
  ];
  const missing = checks.filter(([, v]) => !v).map(([k]) => k);
  return { filled: checks.length - missing.length, total: checks.length, missing };
}

/* ── Apply dialog ────────────────────────────────────────────────────────── */

function ApplyDialog({
  tender,
  onClose,
  onFiled,
}: {
  tender: Tender;
  onClose: () => void;
  onFiled: (a: Application) => void;
}) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(tender.currency || "");
  const [coverNote, setCoverNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [filed, setFiled] = useState<Application | null>(null);

  const submit = async () => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Enter the bid amount — a positive number.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/org/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenderRef: tender.ref, amount: amt, currency: currency.trim() || undefined, coverNote: coverNote.trim() || undefined }),
      });
      const j = (await res.json().catch(() => ({}))) as { application?: Application; error?: string };
      if (!res.ok || !j.application) {
        setError(j.error ?? "The application could not be filed.");
        return;
      }
      setFiled(j.application);
      onFiled(j.application);
    } catch {
      setError("The portal is unreachable — try again shortly.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-ink-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Apply to ${tender.ref}`}>
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.26, ease: EASE }}
        className="w-full max-w-[520px] overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-[0_36px_90px_rgba(0,0,0,0.4)] dark:border-ink-800 dark:bg-night-2"
      >
        {filed ? (
          <div className="space-y-4 p-7 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border-2 border-brand-600/60 bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300">
              <CircleCheck className="h-7 w-7" aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-[18px] font-bold text-ink-950 dark:text-white">Application on the record</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-500 dark:text-ink-400">
                Filed as <span className="font-code text-[12px] font-semibold text-brand-700 dark:text-brand-300">app · {filed.id}</span> and appended
                to the procurement audit log for {tender.ref}. The desk sees it the moment it certifies the opening.
              </p>
            </div>
            <button type="button" onClick={onClose} className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-ink-950 text-[14px] font-semibold text-white transition-all hover:bg-brand-600">
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="border-b border-ink-100 px-6 py-4 dark:border-ink-800">
              <p className="font-code text-[9.5px] font-semibold tracking-[0.18em] text-brand-700 dark:text-brand-400">FILE AN APPLICATION</p>
              <h3 className="mt-1 text-[15.5px] font-bold leading-snug text-ink-950 dark:text-white">{tender.title}</h3>
              <p className="mt-1 font-code text-[10px] tracking-[0.12em] text-ink-400">
                {tender.ref} · {tender.buyer} · {tender.closingKnown ? `closes ${fmtDate(tender.closingDate)}` : "closing date not stated on the notice"}
              </p>
            </div>
            <div className="space-y-3.5 p-6">
              <div className="grid gap-3.5 sm:grid-cols-[1.4fr_1fr]">
                <Field label="Bid amount">
                  <input className={inputCls} type="number" min="1" step="any" placeholder="e.g. 7500000" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </Field>
                <Field label="Currency">
                  <input className={inputCls} placeholder={tender.currency || "ZMW"} value={currency} onChange={(e) => setCurrency(e.target.value)} maxLength={8} />
                </Field>
              </div>
              <Field label="Cover note (optional)" hint="What the desk should know about this bid — 1200 characters at most.">
                <textarea
                  className={cn(inputCls, "h-24 resize-none py-2.5")}
                  placeholder="Delivery period, references, anything the notice asks to be told."
                  value={coverNote}
                  onChange={(e) => setCoverNote(e.target.value)}
                  maxLength={1200}
                />
              </Field>
              {error ? (
                <div className="flex items-start gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-2.5 text-[13px] text-brand-800 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-200">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {error}
                </div>
              ) : null}
              <p className="rounded-xl border border-ink-100 bg-sand px-3.5 py-2.5 text-[12px] leading-relaxed text-ink-600 dark:border-ink-800 dark:bg-night dark:text-ink-400">
                Filing is a real act: the application is refused after the closing date, refused if this organization
                already has one on record for {tender.ref}, and your identity is attested by the portal — never typed in.
              </p>
              <div className="flex items-center justify-between gap-3 pt-1">
                <button type="button" onClick={onClose} className="inline-flex h-11 items-center gap-1.5 rounded-xl px-4 text-[13.5px] font-semibold text-ink-600 transition-colors hover:bg-ink-50 dark:text-ink-300 dark:hover:bg-ink-900">
                  Cancel
                </button>
                <button type="button" onClick={submit} disabled={busy} className="inline-flex h-11 items-center gap-2 rounded-xl bg-ink-950 px-5 text-[13.5px] font-semibold text-white shadow-[0_8px_20px_rgba(11,12,15,0.18)] transition-all hover:bg-brand-600 disabled:opacity-60">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Stamp className="h-4 w-4" aria-hidden="true" />}
                  File application
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

/* ── Profile editor ──────────────────────────────────────────────────────── */

const CATEGORY_SUGGESTIONS = [
  "Medical supplies", "Laboratory equipment", "Solar energy", "Water & boreholes",
  "ICT & software", "Furniture", "Construction", "Transport & logistics",
];

/* The same dropdown registers as the registration wizard — the profile
   editor and the door speak one language. */
const toCountryOption = (c: Country, group: string): SelectOption => ({
  value: c.name,
  hint: `${c.code} · ${c.dial}`,
  group,
  keywords: `${c.code} ${c.dial} ${c.keywords ?? ""}`,
});

const COUNTRY_OPTIONS: SelectOption[] = [
  ...SUGGESTED_COUNTRIES.flatMap((n) => {
    const c = COUNTRIES.find((x) => x.name === n);
    return c ? [toCountryOption(c, "Commonly used here")] : [];
  }),
  ...COUNTRIES.filter((c) => !(SUGGESTED_COUNTRIES as readonly string[]).includes(c.name)).map((c) =>
    toCountryOption(c, "All countries"),
  ),
];

const LEGAL_FORM_OPTIONS: SelectOption[] = [
  ...LEGAL_FORM_GROUPS.flatMap((g) => g.options.map((v) => ({ value: v, group: g.group }))),
  { value: LEGAL_FORM_OTHER, group: "Other" },
];

function ProfileEditor({ org, onSaved }: { org: PublicOrg; onSaved: (o: PublicOrg) => void }) {
  const [form, setForm] = useState({
    name: org.name,
    country: org.country,
    legalForm: org.legalForm ?? "",
    taxPin: org.taxPin ?? "",
    taxClearanceNo: org.taxClearanceNo ?? "",
    taxClearanceExpiry: org.taxClearanceExpiry ?? "",
    regulator: org.regulator ?? "",
    regulatorNo: org.regulatorNo ?? "",
    contactName: org.contactName ?? "",
    phone: org.phone ?? "",
    address: org.address ?? "",
    website: org.website ?? "",
    description: org.description ?? "",
    categories: org.categories,
  });
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [categoryDraft, setCategoryDraft] = useState("");
  /* A listed legal form selects directly; a value saved outside the list
     (or "Other") opens the specify field. */
  const [legalFormChoice, setLegalFormChoice] = useState(() =>
    org.legalForm ? (LEGAL_FORMS.includes(org.legalForm) ? org.legalForm : LEGAL_FORM_OTHER) : "",
  );

  const set = (k: keyof typeof form, v: string | string[]) => {
    setForm((p) => ({ ...p, [k]: v }));
    setStatus("idle");
  };

  const addCategory = (raw: string) => {
    const v = raw.trim().slice(0, 80);
    if (!v || form.categories.includes(v) || form.categories.length >= 12) return;
    set("categories", [...form.categories, v]);
  };

  const setLegalForm = (choice: string) => {
    setLegalFormChoice(choice);
    set("legalForm", choice === LEGAL_FORM_OTHER || choice === "" ? "" : choice);
  };

  /* Same country-driven intuition as the door: dial code for the phone field. */
  const selectedCountry = form.country ? findCountry(form.country) : undefined;
  const phonePlaceholder = selectedCountry ? `${selectedCountry.dial} …` : "+ country code …";

  const save = async () => {
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/org/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = (await res.json().catch(() => ({}))) as { org?: PublicOrg; error?: string };
      if (!res.ok || !j.org) {
        setError(j.error ?? "The profile could not be saved.");
        setStatus("error");
        return;
      }
      onSaved(j.org);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2500);
    } catch {
      setError("The portal is unreachable — try again shortly.");
      setStatus("error");
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3.5">
        <Field label="Legal name">
          <input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Country of registration">
          <SearchSelect
            value={form.country}
            onChange={(v) => set("country", v)}
            options={COUNTRY_OPTIONS}
            placeholder="Select the country…"
            searchPlaceholder={`Search ${COUNTRIES.length} countries…`}
            emptyText="No country matches — try the ISO code or dial digits."
            label="Country of registration"
          />
        </Field>
      </div>

      <div className="rounded-2xl border border-ink-100 bg-white p-5 dark:border-ink-800 dark:bg-night-2">
        <p className="mb-3.5 flex items-center gap-2 font-code text-[9.5px] font-semibold tracking-[0.18em] text-ink-500 dark:text-ink-400">
          <FileText className="h-3.5 w-3.5" aria-hidden="true" /> LEGAL IDENTITY — FIXED
        </p>
        <div className="space-y-3.5">
          <div>
            <p className="text-[12px] text-ink-500 dark:text-ink-400">Registration number</p>
            <p className="font-code text-[13px] font-semibold text-ink-950 dark:text-white">{org.registrationNo}</p>
          </div>
          <div>
            <p className="text-[12px] text-ink-500 dark:text-ink-400">Login email</p>
            <p className="font-code text-[13px] font-semibold text-ink-950 dark:text-white">{org.email}</p>
          </div>
        </div>
        <p className="mt-3 text-[11.5px] leading-relaxed text-ink-400 dark:text-ink-500">
          The registration number and login email are the account&apos;s identity — they cannot be edited here. Ask the
          procurement desk if they must change.
        </p>
      </div>

      <p className="font-code text-[9.5px] font-semibold tracking-[0.18em] text-ink-500 dark:text-ink-400">
        STATUTORY RECORD — WHAT THE DESK VERIFIES
      </p>
      <div className="space-y-3.5">
        <Field label="Tax PIN">
          <input className={inputCls} value={form.taxPin} onChange={(e) => set("taxPin", e.target.value)} />
        </Field>
        <Field label="Tax clearance number">
          <input className={inputCls} value={form.taxClearanceNo} onChange={(e) => set("taxClearanceNo", e.target.value)} />
        </Field>
        <Field label="Tax clearance expiry">
          <input className={inputCls} type="date" value={form.taxClearanceExpiry} onChange={(e) => set("taxClearanceExpiry", e.target.value)} />
        </Field>
        <Field label="Legal form">
          <SearchSelect
            value={legalFormChoice}
            onChange={setLegalForm}
            options={LEGAL_FORM_OPTIONS}
            placeholder="Select the legal form…"
            searchPlaceholder="Search legal forms…"
            emptyText="No legal form matches — choose Other (not listed)."
            clearable
            label="Legal form"
          />
          {legalFormChoice === LEGAL_FORM_OTHER ? (
            <input
              className={cn(inputCls, "mt-2")}
              placeholder="Describe the legal form"
              value={form.legalForm}
              maxLength={80}
              onChange={(e) => set("legalForm", e.target.value)}
            />
          ) : null}
        </Field>
        <Field label="Sector regulator">
          <input className={inputCls} placeholder="NCC · NHCC · ERB · ZPPA…" value={form.regulator} onChange={(e) => set("regulator", e.target.value)} />
        </Field>
        <Field label="Regulator registration no">
          <input className={inputCls} value={form.regulatorNo} onChange={(e) => set("regulatorNo", e.target.value)} />
        </Field>
      </div>

      <p className="font-code text-[9.5px] font-semibold tracking-[0.18em] text-ink-500 dark:text-ink-400">
        CONTACT &amp; PRESENCE — HOW THE DESK REACHES YOU
      </p>
      <div className="space-y-3.5">
        <Field label="Contact person">
          <input className={inputCls} value={form.contactName} onChange={(e) => set("contactName", e.target.value)} />
        </Field>
        <Field label="Phone">
          <input className={inputCls} placeholder={phonePlaceholder} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="Address">
          <input className={inputCls} value={form.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <Field label="Website">
          <input className={inputCls} value={form.website} onChange={(e) => set("website", e.target.value)} />
        </Field>
      </div>

      <Field label="What the organization supplies">
        <textarea
          className={cn(inputCls, "h-24 resize-none py-2.5")}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          maxLength={1200}
        />
      </Field>

      <Field label="Supply categories">
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              className={inputCls}
              placeholder="Type a category and press Enter"
              value={categoryDraft}
              onChange={(e) => setCategoryDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCategory(categoryDraft);
                  setCategoryDraft("");
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                addCategory(categoryDraft);
                setCategoryDraft("");
              }}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-ink-200 text-ink-600 transition-colors hover:border-brand-600 hover:text-brand-700 dark:border-ink-800"
              aria-label="Add category"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          {form.categories.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {form.categories.map((c) => (
                <span key={c} className="inline-flex items-center gap-1 rounded-full bg-ink-950 px-2.5 py-1 text-[12px] font-medium text-white dark:bg-white dark:text-night">
                  {c}
                  <button type="button" onClick={() => set("categories", form.categories.filter((x) => x !== c))} aria-label={`Remove ${c}`}>
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_SUGGESTIONS.filter((s) => !form.categories.includes(s)).map((s) => (
              <button key={s} type="button" onClick={() => addCategory(s)} className="rounded-full border border-dashed border-ink-300 px-2.5 py-1 text-[11.5px] text-ink-500 transition-colors hover:border-brand-600 hover:text-brand-700 dark:border-ink-700 dark:text-ink-400">
                + {s}
              </button>
            ))}
          </div>
        </div>
      </Field>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-2.5 text-[13px] text-brand-800 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-200">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={status === "saving"} className="inline-flex h-11 items-center gap-2 rounded-xl bg-ink-950 px-5 text-[13.5px] font-semibold text-white shadow-[0_8px_20px_rgba(11,12,15,0.18)] transition-all hover:bg-brand-600 disabled:opacity-60">
          {status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
          Save profile
        </button>
        <AnimatePresence>
          {status === "saved" ? (
            <motion.span initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-950 dark:text-white">
              <CircleCheck className="h-4 w-4 text-brand-600" aria-hidden="true" /> Saved
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── The console ─────────────────────────────────────────────────────────── */

export function OrgConsole({ initialOrg }: { initialOrg: PublicOrg }) {
  const router = useRouter();
  const [org, setOrg] = useState<PublicOrg>(initialOrg);
  const [tab, setTab] = useState<Tab>("overview");
  const [tenders, setTenders] = useState<Tender[] | null>(null);
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [tenderError, setTenderError] = useState<string | null>(null);
  const [applying, setApplying] = useState<Tender | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const loadTenders = useCallback(async () => {
    try {
      const res = await fetch("/api/org/tenders", { cache: "no-store" });
      const j = (await res.json().catch(() => ({}))) as { tenders?: Tender[]; error?: string };
      if (!res.ok) {
        setTenderError(j.error ?? "The opportunities board is not reachable.");
        return;
      }
      setTenderError(null);
      setTenders(j.tenders ?? []);
    } catch {
      setTenderError("The opportunities board is not reachable.");
    }
  }, []);

  const loadApplications = useCallback(async () => {
    try {
      const res = await fetch("/api/org/applications", { cache: "no-store" });
      const j = (await res.json().catch(() => ({}))) as { applications?: Application[] };
      if (res.ok) setApplications(j.applications ?? []);
    } catch {
      /* keep the last snapshot */
    }
  }, []);

  useEffect(() => {
    /* Deferred kick (never setState synchronously inside an effect) plus the
       same 5s poll the officer desk runs — both surfaces stay live. */
    const kick = () => {
      void loadTenders();
      void loadApplications();
    };
    const t = setTimeout(kick, 0);
    const id = setInterval(kick, 5000);
    return () => {
      clearTimeout(t);
      clearInterval(id);
    };
  }, [loadTenders, loadApplications]);

  const signOut = async () => {
    await fetch("/api/org/auth/logout", { method: "POST" }).catch(() => undefined);
    router.push("/org");
    router.refresh();
  };

  const appliedTenderIds = useMemo(() => new Set((applications ?? []).map((a) => a.tenderId)), [applications]);
  const openTenders = useMemo(() => (tenders ?? []).filter((t) => t.status === "OPEN"), [tenders]);
  const profile = useMemo(() => completeness(org), [org]);

  const titleOf = useCallback(
    (ref: string) => (tenders ?? []).find((t) => t.ref === ref)?.title ?? ref,
    [tenders],
  );

  const TABS: { id: Tab; label: string; icon: typeof LayoutGrid; badge?: number }[] = [
    { id: "overview", label: "Overview", icon: LayoutGrid },
    { id: "profile", label: "Profile", icon: Building2, badge: profile.missing.length > 0 ? profile.missing.length : undefined },
    { id: "opportunities", label: "Opportunities", icon: ScrollText, badge: openTenders.length || undefined },
    { id: "applications", label: "Applications", icon: FileText, badge: applications?.length || undefined },
  ];

  const onFiled = (a: Application) => {
    setApplications((p) => [a, ...(p ?? [])]);
    setFlash(`Application ${a.id} is on the record for ${a.tenderId}.`);
    setTimeout(() => setFlash(null), 5000);
    void loadTenders();
  };

  return (
    <div className="min-h-screen bg-paper dark:bg-night">
      {/* header */}
      <header className="sticky top-0 z-40 border-b border-ink-100 bg-paper/85 backdrop-blur-xl dark:border-ink-800 dark:bg-night/85">
        <div className="mx-auto flex h-[68px] w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <span className="hidden dark:inline-flex">
              <QuorumLogo variant="light" tagline={false} />
            </span>
            <span className="dark:hidden">
              <QuorumLogo tagline={false} />
            </span>
            <span className="hidden h-7 w-px bg-ink-200 sm:block dark:bg-ink-800" />
            <div className="hidden sm:block">
              <p className="font-code text-[9px] font-semibold tracking-[0.2em] text-brand-700 dark:text-brand-400">SUPPLIER PORTAL</p>
              <p className="max-w-[260px] truncate text-[14px] font-bold text-ink-950 dark:text-white">{org.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "rounded-full px-2.5 py-1 font-code text-[9px] font-bold tracking-[0.16em]",
                org.status === "ACTIVE" ? "bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200" : "bg-brand-600/10 text-brand-700 dark:text-brand-300",
              )}
            >
              {org.status}
            </span>
            <Link href="/" className="hidden h-9 items-center rounded-full border border-ink-200 px-3.5 text-[12.5px] font-semibold text-ink-600 transition-colors hover:border-brand-600 hover:text-brand-700 sm:inline-flex dark:border-ink-700 dark:text-ink-300">
              Officer desk <ArrowUpRight className="ml-1 h-3 w-3" aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-ink-200 px-3.5 text-[12.5px] font-semibold text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-700 dark:border-ink-700 dark:text-ink-200"
            >
              <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* tab rail */}
      <div className="sticky top-[68px] z-30 border-b border-ink-100 bg-paper/90 backdrop-blur-lg dark:border-ink-800 dark:bg-night/90">
        <nav aria-label="Console sections" className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "relative flex items-center gap-2 whitespace-nowrap px-3.5 py-3.5 text-[13px] font-semibold transition-colors",
                tab === t.id ? "text-ink-950 dark:text-white" : "text-ink-500 hover:text-ink-900 dark:hover:text-white",
              )}
            >
              <t.icon className="h-4 w-4" aria-hidden="true" />
              {t.label}
              {t.badge !== undefined ? (
                <span className="rounded-full bg-ink-100 px-1.5 py-0.5 font-code text-[9px] font-bold text-ink-700 dark:bg-ink-800 dark:text-ink-200">{t.badge}</span>
              ) : null}
              {tab === t.id ? <motion.span layoutId="org-tab-underline" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-500" transition={{ duration: 0.24, ease: EASE }} /> : null}
            </button>
          ))}
        </nav>
      </div>

      <AnimatePresence>
        {flash ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-auto mt-4 flex w-full max-w-6xl items-center gap-2 rounded-xl border border-ink-950 bg-ink-950 px-4 py-2.5 text-[13px] font-semibold text-white dark:border-white dark:bg-white dark:text-night"
          >
            <CircleCheck className="h-4 w-4 shrink-0" aria-hidden="true" /> {flash}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: EASE }}
          >
            {tab === "overview" ? (
              <div className="grid gap-4 lg:grid-cols-3">
                {/* profile completeness */}
                <div className="rounded-2xl border border-ink-100 bg-white p-5 dark:border-ink-800 dark:bg-night-2 lg:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-[15.5px] font-bold text-ink-950 dark:text-white">Profile completeness</h2>
                    <span className="font-code text-[11px] font-bold text-ink-950 dark:text-white">
                      {profile.filled}/{profile.total}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                    <div className="h-full rounded-full bg-ink-950 transition-all duration-700" style={{ width: `${Math.round((profile.filled / profile.total) * 100)}%` }} />
                  </div>
                  {profile.missing.length > 0 ? (
                    <>
                      <p className="mt-3 text-[13px] text-ink-500 dark:text-ink-400">
                        The desk reads a complete profile when your first application lands. Still missing:
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {profile.missing.map((m) => (
                          <button key={m} type="button" onClick={() => setTab("profile")} className="rounded-full border border-dashed border-ink-300 px-2.5 py-1 text-[11.5px] text-ink-500 transition-colors hover:border-brand-600 hover:text-brand-700 dark:border-ink-700 dark:text-ink-400">
                            {m} — add
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="mt-3 flex items-center gap-1.5 text-[13px] font-semibold text-ink-950 dark:text-white">
                      <CircleCheck className="h-4 w-4 text-brand-600" aria-hidden="true" /> Complete — the register sees everything it asks for.
                    </p>
                  )}
                  <p className="mt-4 border-t border-ink-100 pt-3 text-[12px] leading-relaxed text-ink-400 dark:border-ink-800 dark:text-ink-500">
                    Registered {fmtDate(org.createdAt)} · applications are attested as{" "}
                    <span className="font-code text-[11px] text-brand-700 dark:text-brand-300">org:{org.name}</span> and refused after each tender&apos;s closing date.
                  </p>
                </div>

                {/* quick stats */}
                <div className="space-y-4">
                  <div className="rounded-2xl border border-ink-100 bg-white p-5 dark:border-ink-800 dark:bg-night-2">
                    <p className="font-code text-[9.5px] font-semibold tracking-[0.18em] text-ink-500 dark:text-ink-400">OPEN OPPORTUNITIES</p>
                    <p className="mt-1.5 text-[34px] font-black leading-none text-ink-950 dark:text-white">{tenders === null ? "…" : openTenders.length}</p>
                    <button type="button" onClick={() => setTab("opportunities")} className="mt-2 text-[12.5px] font-semibold text-brand-700 hover:underline dark:text-brand-300">
                      Browse the board →
                    </button>
                  </div>
                  <div className="rounded-2xl border border-ink-100 bg-white p-5 dark:border-ink-800 dark:bg-night-2">
                    <p className="font-code text-[9.5px] font-semibold tracking-[0.18em] text-ink-500 dark:text-ink-400">APPLICATIONS ON RECORD</p>
                    <p className="mt-1.5 text-[34px] font-black leading-none text-ink-950 dark:text-white">{applications === null ? "…" : applications.length}</p>
                    <button type="button" onClick={() => setTab("applications")} className="mt-2 text-[12.5px] font-semibold text-brand-700 hover:underline dark:text-brand-300">
                      Track them →
                    </button>
                  </div>
                </div>

                {/* recent applications */}
                <div className="rounded-2xl border border-ink-100 bg-white p-5 dark:border-ink-800 dark:bg-night-2 lg:col-span-3">
                  <h2 className="text-[15.5px] font-bold text-ink-950 dark:text-white">Latest applications</h2>
                  {applications === null ? (
                    <p className="mt-3 text-[13px] text-ink-400">Loading…</p>
                  ) : applications.length === 0 ? (
                    <div className="mt-3 rounded-xl border border-dashed border-ink-200 px-4 py-6 text-center dark:border-ink-700">
                      <p className="text-[13.5px] font-semibold text-ink-700 dark:text-ink-200">Nothing filed yet</p>
                      <p className="mt-1 text-[12.5px] text-ink-400">The first application lands on the register the moment you file it.</p>
                      <button type="button" onClick={() => setTab("opportunities")} className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-xl bg-ink-950 px-4 text-[12.5px] font-semibold text-white transition-all hover:bg-brand-600">
                        <ScrollText className="h-3.5 w-3.5" aria-hidden="true" /> Browse opportunities
                      </button>
                    </div>
                  ) : (
                    <ul className="mt-3 divide-y divide-ink-50 dark:divide-ink-900">
                      {applications.slice(0, 3).map((a) => (
                        <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                          <div className="min-w-0">
                            <p className="truncate text-[13.5px] font-semibold text-ink-950 dark:text-white">{titleOf(a.tenderId)}</p>
                            <p className="font-code text-[10px] tracking-[0.1em] text-ink-400">
                              {a.tenderId} · filed {fmtDate(a.receivedAt)} · {a.id}
                            </p>
                          </div>
                          <p className="shrink-0 text-[13.5px] font-bold text-ink-950 dark:text-white">{money(a.amount, a.currency)}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : null}

            {tab === "profile" ? (
              <div className="mx-auto max-w-3xl space-y-4">
                <div className="rounded-2xl border border-ink-100 bg-white p-6 dark:border-ink-800 dark:bg-night-2">
                  <h2 className="text-[15.5px] font-bold text-ink-950 dark:text-white">Organization profile</h2>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-500 dark:text-ink-400">
                    This is the profile the desk and the supplier register see. Keep it true — the statutory fields are
                    what public procurement asks bidders to hold.
                  </p>
                  <div className="mt-5">
                    <ProfileEditor
                      org={org}
                      onSaved={(o) => {
                        setOrg(o);
                        router.refresh();
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {tab === "opportunities" ? (
              <div className="space-y-4">
                {tenderError ? (
                  <div className="flex items-start gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-[13px] text-brand-800 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-200">
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {tenderError}
                  </div>
                ) : null}
                {tenders === null ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="h-[172px] animate-pulse rounded-2xl border border-ink-100 bg-ink-50/60 dark:border-ink-800 dark:bg-ink-900/40" />
                    ))}
                  </div>
                ) : tenders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-ink-200 px-6 py-14 text-center dark:border-ink-700">
                    <p className="text-[14px] font-semibold text-ink-700 dark:text-ink-200">No tender packs are staged on the desk yet</p>
                    <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-ink-400">
                      Opportunities appear here the moment the procurement desk stages a tender pack. Nothing is invented
                      to fill this board — the empty state is the honest state.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {tenders.map((t) => {
                      const applied = appliedTenderIds.has(t.ref);
                      const closed = t.status === "CLOSED";
                      return (
                        <div key={t.ref} className={cn("flex flex-col rounded-2xl border bg-white p-5 transition-shadow hover:shadow-[0_12px_36px_rgba(11,12,15,0.1)] dark:bg-night-2", closed ? "border-ink-100 opacity-75 dark:border-ink-800" : "border-ink-100 dark:border-ink-800")}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-code text-[9.5px] font-semibold tracking-[0.16em] text-brand-700 dark:text-brand-400">{t.ref}</p>
                              <h3 className="mt-1 text-[14.5px] font-bold leading-snug text-ink-950 dark:text-white">{t.title}</h3>
                              <p className="mt-1 truncate text-[12.5px] text-ink-500 dark:text-ink-400">{t.buyer}</p>
                            </div>
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-2.5 py-1 font-code text-[9px] font-bold tracking-[0.14em]",
                                closed ? "bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400" : "bg-ink-950 text-white dark:bg-white dark:text-night",
                              )}
                            >
                              {closed ? "CLOSED" : "OPEN"}
                            </span>
                          </div>

                          <div className="mt-3.5 space-y-1.5 text-[12.5px]">
                            <p className="flex items-center gap-2 text-ink-600 dark:text-ink-300">
                              <Clock className="h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden="true" />
                              {t.closingKnown ? (
                                <>
                                  Closes <strong className="font-semibold text-ink-900 dark:text-white">{fmtDate(t.closingDate)}</strong>
                                  {t.status === "OPEN" && t.daysLeft !== undefined ? <span className="text-ink-400">· {t.daysLeft} {t.daysLeft === 1 ? "day" : "days"} left</span> : null}
                                </>
                              ) : (
                                <span className="italic text-ink-400">closing date not stated on the notice</span>
                              )}
                            </p>
                            <p className="flex items-center gap-2 text-ink-600 dark:text-ink-300">
                              <FileText className="h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden="true" />
                              {t.budget} · {t.format}
                            </p>
                            <p className="flex items-center gap-2 text-ink-600 dark:text-ink-300">
                              <Building2 className="h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden="true" />
                              {t.sector} · {t.applications} {t.applications === 1 ? "application" : "applications"} on record
                            </p>
                          </div>

                          <div className="mt-auto pt-4">
                            {applied ? (
                              <div className="flex h-10 items-center justify-center gap-2 rounded-xl bg-ink-100 text-[13px] font-bold text-ink-900 dark:bg-ink-800 dark:text-ink-100">
                                <CircleCheck className="h-4 w-4 text-brand-600" aria-hidden="true" /> Application on record
                              </div>
                            ) : closed ? (
                              <div className="flex h-10 items-center justify-center rounded-xl border border-ink-100 text-[12.5px] font-semibold text-ink-400 dark:border-ink-800">
                                Closed — late applications are refused
                              </div>
                            ) : (
                              <button type="button" onClick={() => setApplying(t)} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-ink-950 text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(11,12,15,0.18)] transition-all hover:bg-brand-600">
                                <Stamp className="h-3.5 w-3.5" aria-hidden="true" /> Apply
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}

            {tab === "applications" ? (
              <div className="space-y-3.5">
                {applications === null ? (
                  <div className="h-40 animate-pulse rounded-2xl border border-ink-100 bg-ink-50/60 dark:border-ink-800 dark:bg-ink-900/40" />
                ) : applications.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-ink-200 px-6 py-14 text-center dark:border-ink-700">
                    <p className="text-[14px] font-semibold text-ink-700 dark:text-ink-200">No applications on record yet</p>
                    <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-ink-400">
                      File one from the opportunities board. Every application carries your organization&apos;s attested
                      identity and lands in the procurement audit log.
                    </p>
                  </div>
                ) : (
                  applications.map((a) => (
                    <div key={a.id} className="rounded-2xl border border-ink-100 bg-white p-5 dark:border-ink-800 dark:bg-night-2">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-code text-[9.5px] font-semibold tracking-[0.16em] text-brand-700 dark:text-brand-400">{a.tenderId}</p>
                          <h3 className="mt-0.5 text-[14.5px] font-bold leading-snug text-ink-950 dark:text-white">{titleOf(a.tenderId)}</h3>
                        </div>
                        <div className="text-right">
                          <p className="text-[15px] font-black text-ink-950 dark:text-white">{money(a.amount, a.currency)}</p>
                          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-ink-100 px-2.5 py-0.5 font-code text-[9px] font-bold tracking-[0.14em] text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                            {a.status}
                          </span>
                        </div>
                      </div>
                      {a.coverNote ? <p className="mt-3 border-t border-ink-50 pt-3 text-[13px] leading-relaxed text-ink-600 dark:border-ink-900 dark:text-ink-300">{a.coverNote}</p> : null}
                      <p className="mt-3 font-code text-[9.5px] tracking-[0.14em] text-ink-400">
                        {a.id} · filed {fmtDate(a.receivedAt)} · attested as org:{a.orgName}
                      </p>
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </main>

      {applying ? <ApplyDialog tender={applying} onClose={() => setApplying(null)} onFiled={onFiled} /> : null}
    </div>
  );
}
