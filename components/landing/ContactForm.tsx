"use client";

import { useState } from "react";
import { CheckCircle } from "lucide-react";

export function ContactForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not send message");
        return;
      }
      setSent(true);
      setName("");
      setPhone("");
      setEmail("");
      setMessage("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[1.75rem] bg-white p-8 text-center shadow-[var(--shadow-card)] ring-1 ring-chocolate/6">
        <CheckCircle size={40} className="text-gold" />
        <h3 className="mt-4 font-display text-xl font-semibold text-chocolate">
          Message sent!
        </h3>
        <p className="mt-2 text-sm text-chocolate/60">
          Thank you for reaching out. We&apos;ll get back to you soon.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-5 text-sm font-medium text-chocolate underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[1.75rem] bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-chocolate/6 md:p-8"
    >
      <h3 className="font-display text-xl font-semibold text-chocolate">
        Send us a message
      </h3>
      <p className="mt-1 text-sm text-chocolate/55">
        Kitty parties, pre-orders, or any questions — we&apos;re here to help.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label className="text-xs text-chocolate/55">Your name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-chocolate/10 bg-cream/30 px-3 py-3 text-sm outline-none focus:border-chocolate/25"
          />
        </div>
        <div>
          <label className="text-xs text-chocolate/55">Phone</label>
          <input
            required
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-xl border border-chocolate/10 bg-cream/30 px-3 py-3 text-sm outline-none focus:border-chocolate/25"
          />
        </div>
        <div>
          <label className="text-xs text-chocolate/55">Email (optional)</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-chocolate/10 bg-cream/30 px-3 py-3 text-sm outline-none focus:border-chocolate/25"
          />
        </div>
        <div>
          <label className="text-xs text-chocolate/55">Message</label>
          <textarea
            required
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us about your order, event, or question..."
            className="mt-1 w-full resize-none rounded-xl border border-chocolate/10 bg-cream/30 px-3 py-3 text-sm outline-none focus:border-chocolate/25"
          />
        </div>
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 w-full rounded-full bg-chocolate py-3.5 text-sm font-medium text-cream transition hover:bg-chocolate-dark disabled:opacity-50"
      >
        {submitting ? "Sending..." : "Send message"}
      </button>
    </form>
  );
}
