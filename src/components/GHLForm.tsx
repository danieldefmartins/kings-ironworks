"use client";

import { useState } from "react";



const SERVICE_TYPES = [
  "Fire Escape",
  "Stairs",
  "Railings",
  "Fences & Gates",
  "Structural Steel",
  "Welding & Repairs",
  "Balconies",
  "Custom Ironwork",
  "Other",
];

const TIMELINES = [
  "ASAP / Emergency",
  "Within 2 weeks",
  "Within 1 month",
  "Within 3 months",
  "Just getting quotes",
];

const SOURCES = [
  "Google Search",
  "Yelp",
  "Facebook / Instagram",
  "Referral",
  "Drove by our shop",
  "Other",
];

export default function GHLForm() {
  const [form, setForm] = useState({
    name: "",
    preferredContact: "phone",
    phone: "",
    email: "",
    serviceType: "",
    projectAddress: "",
    projectDescription: "",
    timeline: "",
    source: "",
    consent: false,
  });
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          preferredContact: form.preferredContact,
          phone: form.preferredContact === "phone" ? form.phone : "",
          email: form.preferredContact === "email" ? form.email : "",
          consent: form.preferredContact === "phone" && form.consent,
          serviceType: form.serviceType,
          projectAddress: form.projectAddress,
          projectDescription: form.projectDescription,
          timeline: form.timeline,
          source: form.source,
        }),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        setStatus("success");
        setForm({
          name: "", preferredContact: "phone", phone: "", email: "",
          serviceType: "", projectAddress: "", projectDescription: "",
          timeline: "", source: "", consent: false,
        });
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="ghl-form-container">
        <div role="status" className="py-16 text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-accent/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-heading text-2xl mb-4">Thank You!</h3>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            We received your request. A member of our team will contact you within the hour during business hours.
          </p>
          <p className="text-accent font-semibold mt-4">
            For urgent matters, call (617) 404-2589
          </p>
        </div>
        <style>{`
          .ghl-form-container {
            background: oklch(0.99 0.003 90);
            border: 2px solid oklch(0.15 0.005 280);
            padding: 1.25rem;
            width: 100%;
          }
          @media (min-width: 768px) {
            .ghl-form-container { padding: 3rem; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="ghl-form-container">
      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset disabled={status === "sending"} className="space-y-6">
        <div>
          <label htmlFor="name" className="form-label">Name *</label>
          <input id="name" name="name" type="text" required autoComplete="name"
            maxLength={120} value={form.name} onChange={handleChange}
            className="form-input" placeholder="Your name" />
        </div>

        <fieldset>
          <legend className="form-label">How should we contact you?</legend>
          <div className="flex gap-6">
            {[{ value: "phone", label: "Phone call" }, { value: "email", label: "Email" }].map(option => (
              <label key={option.value} className="flex items-center gap-2 min-h-11 cursor-pointer">
                <input type="radio" name="preferredContact" value={option.value}
                  checked={form.preferredContact === option.value} onChange={handleChange}
                  className="accent-[oklch(0.66_0.12_75)]" />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
        {form.preferredContact === "phone" ? (
          <div>
            <label htmlFor="phone" className="form-label">Phone *</label>
            <input id="phone" name="phone" type="tel" required autoComplete="tel"
              maxLength={40} pattern="[+()0-9 .-]{7,40}"
              value={form.phone} onChange={handleChange}
              className="form-input" placeholder="(617) 555-1234" />
          </div>
        ) : (
          <div>
            <label htmlFor="email" className="form-label">Email *</label>
            <input id="email" name="email" type="email" required autoComplete="email"
              maxLength={254} value={form.email} onChange={handleChange}
              className="form-input" placeholder="you@example.com" />
          </div>
        )}

        {/* Service & Timeline Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="serviceType" className="form-label">What do you need? *</label>
            <select
              id="serviceType" name="serviceType" required
              value={form.serviceType} onChange={handleChange}
              className="form-input"
            >
              <option value="">Select a service...</option>
              {SERVICE_TYPES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="timeline" className="form-label">Timeline</label>
            <select
              id="timeline" name="timeline"
              value={form.timeline} onChange={handleChange}
              className="form-input"
            >
              <option value="">When do you need this?</option>
              {TIMELINES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Project Address */}
        <div>
          <label htmlFor="projectAddress" className="form-label">Project Address</label>
          <input
            id="projectAddress" name="projectAddress" type="text" maxLength={300} autoComplete="street-address"
            value={form.projectAddress} onChange={handleChange}
            className="form-input"
            placeholder="123 Main St, Boston, MA"
          />
        </div>

        {/* Project Description */}
        <div>
          <label htmlFor="projectDescription" className="form-label">Tell us about your project *</label>
          <textarea
            id="projectDescription" name="projectDescription" required maxLength={5000}
            value={form.projectDescription} onChange={handleChange}
            className="form-input min-h-[120px] resize-y"
            placeholder="Describe your project, include dimensions if possible. You can also text us photos at (617) 404-2589."
            rows={4}
          />
        </div>

        <p className="text-sm text-muted-foreground">
          Have photos? You can <a href="sms:+16174042589" className="text-accent underline">text project photos to (617) 404-2589</a> or{' '}
          <a href="mailto:info@kingsironworks.com?subject=Ironwork%20project%20photos" className="text-accent underline">email them to our team</a>.
          Include your name so we can match them to your request.
        </p>

        {/* How did you find us */}
        <div>
          <label htmlFor="source" className="form-label">How did you find us?</label>
          <select
            id="source" name="source"
            value={form.source} onChange={handleChange}
            className="form-input"
          >
            <option value="">Select...</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Optional SMS permission, independent of requesting a phone call. */}
        {form.preferredContact === "phone" && <div className="flex items-start gap-3">
          <input
            id="consent" name="consent" type="checkbox"
            checked={form.consent} onChange={handleChange}
            className="mt-1 w-4 h-4 accent-[oklch(0.66_0.12_75)]"
          />
          <label htmlFor="consent" className="text-xs text-muted-foreground leading-relaxed">
            By checking this box, I consent to receive non-marketing text messages from King Iron Works LLC
            including appointment reminders, project updates, and follow-ups. Message frequency varies.
            Reply STOP to opt out. Standard message and data rates may apply.
          </label>
        </div>

        }

        {/* Submit */}
        <button
          type="submit"
          disabled={status === "sending"}
          className="w-full bg-accent text-sidebar font-bold text-lg py-4 px-8 hover:opacity-90 transition-opacity disabled:opacity-50 tracking-wide uppercase"
        >
          {status === "sending" ? "Sending..." : "Get a Free Quote"}
        </button>

        {status === "error" && (
          <p role="alert" className="text-center text-red-700 text-sm">
            Something went wrong. Please try again or call us at (617) 404-2589.
          </p>
        )}

        <p className="text-center text-xs text-muted-foreground">
          We respond within 1 hour during business hours (Mon-Fri 7AM-5PM)
        </p>
        </fieldset>
      </form>

      <style>{`
        .ghl-form-container {
          background: oklch(0.99 0.003 90);
          border: 2px solid oklch(0.15 0.005 280);
          padding: 1.25rem;
          width: 100%;
        }
        @media (min-width: 768px) {
          .ghl-form-container { padding: 3rem; }
        }
        .form-label {
          display: block;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600;
          font-size: 0.875rem;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          margin-bottom: 0.5rem;
          color: oklch(0.15 0.005 280);
        }
        .form-input {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 2px solid oklch(0.88 0.005 270);
          background: white;
          font-family: 'Inter', sans-serif;
          font-size: 1rem;
          color: oklch(0.15 0.005 280);
          transition: border-color 0.2s;
          outline: none;
        }
        .form-input:focus {
          border-color: oklch(0.66 0.12 75);
        }
        .form-input::placeholder {
          color: oklch(0.65 0.01 270);
        }
        select.form-input {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 1rem center;
          padding-right: 2.5rem;
        }
      `}</style>
    </div>
  );
}
