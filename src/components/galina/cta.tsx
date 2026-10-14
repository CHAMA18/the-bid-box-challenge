"use client";

import { useState } from "react";
import { Loader2, Send, Phone, Mail, Clock, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Eyebrow, Reveal } from "@/components/galina/reveal";

/** Big red conversion band with the merchant contact form. */
export function CallToAction() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, message }),
      });
      if (!res.ok) throw new Error();
      setSent(true);
      toast({
        title: "Message received",
        description: "A Galina specialist will reach out within 2 working hours.",
      });
    } catch {
      toast({
        title: "Something went wrong",
        description: "We couldn't send your message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <section id="contact" className="scroll-mt-24 bg-brand-600 py-20 sm:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Copy + channels */}
          <Reveal>
            <Eyebrow tone="light" className="text-white/80 [&>span]:bg-white">Start shipping</Eyebrow>
            <h2 className="mt-4 font-display text-[36px] font-black leading-[1.04] tracking-[-0.025em] text-white sm:text-[52px]">
              Ready to put your products in front of 45 million buyers?
            </h2>
            <p className="mt-5 max-w-md text-[16px] leading-relaxed text-white/85">
              Tell us your lanes and volumes. Within one working day you'll have a corridor plan,
              a rate card and a live tracking demo for your own storefront.
            </p>

            <dl className="mt-10 space-y-5">
              {[
                { icon: Phone, dt: "Call us", dd: "+964 775 448 4400 · +964 750 025 4400" },
                { icon: Mail, dt: "Email", dd: "customerservice@galinaexpress.com" },
                { icon: Clock, dt: "Hours", dd: "Saturday – Thursday · 9:00–17:00 (GMT+3)" },
                { icon: MapPin, dt: "Offices", dd: "Baghdad · Erbil · Istanbul · Dubai · London" },
              ].map((row) => (
                <div key={row.dt} className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/12 ring-1 ring-white/20">
                    <row.icon className="h-5 w-5 text-white" aria-hidden="true" />
                  </span>
                  <div>
                    <dt className="font-code text-[10px] tracking-[0.22em] text-white/60">{row.dt.toUpperCase()}</dt>
                    <dd className="mt-0.5 text-[15px] font-semibold text-white">{row.dd}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </Reveal>

          {/* Form */}
          <Reveal delay={0.12}>
            {sent ? (
              <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-3xl bg-white p-10 text-center shadow-2xl">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 ring-1 ring-brand-200">
                  <Send className="h-7 w-7 text-brand-600" aria-hidden="true" />
                </span>
                <h3 className="mt-6 font-display text-[26px] font-extrabold tracking-tight text-ink-950">
                  Message received.
                </h3>
                <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-ink-600">
                  Thanks, {name.split(" ")[0] || "there"} — a Galina specialist will contact you
                  within 2 working hours with your corridor plan.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSent(false);
                    setName("");
                    setEmail("");
                    setCompany("");
                    setMessage("");
                  }}
                  className="mt-8 text-[14px] font-semibold text-brand-600 underline-offset-4 hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="ct-name" className="mb-1.5 block font-code text-[10px] font-semibold tracking-[0.2em] text-ink-500">
                      FULL NAME *
                    </label>
                    <input
                      id="ct-name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ayla Yılmaz"
                      className="h-12 w-full rounded-xl border border-ink-200 bg-paper px-4 text-[15px] text-ink-900 placeholder:text-ink-300 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
                    />
                  </div>
                  <div>
                    <label htmlFor="ct-email" className="mb-1.5 block font-code text-[10px] font-semibold tracking-[0.2em] text-ink-500">
                      WORK EMAIL *
                    </label>
                    <input
                      id="ct-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ayla@company.com"
                      className="h-12 w-full rounded-xl border border-ink-200 bg-paper px-4 text-[15px] text-ink-900 placeholder:text-ink-300 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label htmlFor="ct-company" className="mb-1.5 block font-code text-[10px] font-semibold tracking-[0.2em] text-ink-500">
                    COMPANY
                  </label>
                  <input
                    id="ct-company"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Anadolu Electronics A.Ş."
                    className="h-12 w-full rounded-xl border border-ink-200 bg-paper px-4 text-[15px] text-ink-900 placeholder:text-ink-300 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
                  />
                </div>
                <div className="mt-4">
                  <label htmlFor="ct-message" className="mb-1.5 block font-code text-[10px] font-semibold tracking-[0.2em] text-ink-500">
                    YOUR LANES &amp; VOLUMES *
                  </label>
                  <textarea
                    id="ct-message"
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="We ship ~2 tonnes weekly from Istanbul to Baghdad and Erbil…"
                    className="w-full resize-none rounded-xl border border-ink-200 bg-paper px-4 py-3 text-[15px] text-ink-900 placeholder:text-ink-300 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-600/15"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending}
                  className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-ink-950 text-[15.5px] font-semibold text-white transition-all hover:bg-ink-900 disabled:opacity-60"
                >
                  {sending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Send className="h-4.5 w-4.5" aria-hidden="true" />}
                  Request my corridor plan
                </button>
                <p className="mt-3.5 text-center text-[12px] text-ink-400">
                  No spam, no obligation — a human replies within 2 working hours.
                </p>
              </form>
            )}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
