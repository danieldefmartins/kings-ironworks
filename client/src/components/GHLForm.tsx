import { useState } from "react";

const GHL_LOCATION_ID = "rJsKSnzzxWdCgDCq21rI";

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
    firstName: "",
    lastName: "",
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
          locationId: GHL_LOCATION_ID,
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          email: form.email,
          serviceType: form.serviceType,
          projectAddress: form.projectAddress,
          projectDescription: form.projectDescription,
          timeline: form.timeline,
          source: form.source,
        }),
      });

      if (res.ok) {
        setStatus("success");
        setForm({
          firstName: "", lastName: "", phone: "", email: "",
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
        <div className="py-16 text-center">
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
      </div>
    );
  }

  return (
    <div className="ghl-form-container">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="form-label">First Name *</label>
            <input
              id="firstName" name="firstName" type="text" required
              value={form.firstName} onChange={handleChange}
              className="form-input"
              placeholder="John"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="form-label">Last Name *</label>
            <input
              id="lastName" name="lastName" type="text" required
              value={form.lastName} onChange={handleChange}
              className="form-input"
              placeholder="Smith"
            />
          </div>
        </div>

        {/* Contact Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="phone" className="form-label">Phone *</label>
            <input
              id="phone" name="phone" type="tel" required
              value={form.phone} onChange={handleChange}
              className="form-input"
              placeholder="(617) 555-1234"
            />
          </div>
          <div>
            <label htmlFor="email" className="form-label">Email *</label>
            <input
              id="email" name="email" type="email" required
              value={form.email} onChange={handleChange}
              className="form-input"
              placeholder="john@example.com"
            />
          </div>
        </div>

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
            id="projectAddress" name="projectAddress" type="text"
            value={form.projectAddress} onChange={handleChange}
            className="form-input"
            placeholder="123 Main St, Boston, MA"
          />
        </div>

        {/* Project Description */}
        <div>
          <label htmlFor="projectDescription" className="form-label">Tell us about your project *</label>
          <textarea
            id="projectDescription" name="projectDescription" required
            value={form.projectDescription} onChange={handleChange}
            className="form-input min-h-[120px] resize-y"
            placeholder="Describe your project, include dimensions if possible. You can also text us photos at (617) 404-2589."
            rows={4}
          />
        </div>

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

        {/* SMS Consent */}
        <div className="flex items-start gap-3">
          <input
            id="consent" name="consent" type="checkbox" required
            checked={form.consent} onChange={handleChange}
            className="mt-1 w-4 h-4 accent-[oklch(0.66_0.12_75)]"
          />
          <label htmlFor="consent" className="text-xs text-muted-foreground leading-relaxed">
            By checking this box, I consent to receive non-marketing text messages from King Iron Works LLC
            including appointment reminders, project updates, and follow-ups. Message frequency varies.
            Reply STOP to opt out. Standard message and data rates may apply.
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={status === "sending"}
          className="w-full bg-accent text-sidebar font-bold text-lg py-4 px-8 hover:opacity-90 transition-opacity disabled:opacity-50 tracking-wide uppercase"
        >
          {status === "sending" ? "Sending..." : "Get Your Free Quote"}
        </button>

        {status === "error" && (
          <p className="text-center text-red-500 text-sm">
            Something went wrong. Please try again or call us at (617) 404-2589.
          </p>
        )}

        <p className="text-center text-xs text-muted-foreground">
          We respond within 1 hour during business hours (Mon-Fri 7AM-5PM)
        </p>
      </form>

      <style>{`
        .ghl-form-container {
          background: oklch(0.99 0.003 90);
          border: 8px solid oklch(0.15 0.005 280);
          padding: 2rem;
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
