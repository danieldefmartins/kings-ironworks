import { useEffect } from "react";
import { GHL_FORM_ID } from "@/lib/constants";

/**
 * Go High Level Contact Form
 * A2P compliant form with SMS opt-in for lead capture
 */
export default function GHLForm() {
  useEffect(() => {
    // Load GHL form script
    const script = document.createElement("script");
    script.src = "https://link.msgsndr.com/js/form_embed.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup script on unmount
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return (
    <div className="ghl-form-container">
      {/* GHL Form Embed */}
      <iframe
        src={`https://api.leadconnectorhq.com/widget/form/${GHL_FORM_ID}`}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          minHeight: "600px",
        }}
        id="inline-${GHL_FORM_ID}"
        data-layout="{'id':'INLINE'}"
        data-trigger-type="alwaysShow"
        data-trigger-value=""
        data-activation-type="alwaysActivated"
        data-activation-value=""
        data-deactivation-type="neverDeactivate"
        data-deactivation-value=""
        data-form-name="Form 5"
        data-height="628"
        data-layout-iframe-id="inline-${GHL_FORM_ID}"
        data-form-id={GHL_FORM_ID}
        title="Kings Ironworks Contact Form"
      />

      {/* Custom styling to match Industrial Heritage Brutalism design */}
      <style>{`
        .ghl-form-container {
          background: hsl(var(--sidebar));
          border: 8px solid hsl(var(--border));
          padding: 1.5rem;
          max-width: 100%;
          margin: 0 auto;
        }
        
        @media (min-width: 640px) {
          .ghl-form-container {
            padding: 2.5rem;
          }
        }
        
        @media (min-width: 768px) {
          .ghl-form-container {
            max-width: 800px;
            padding: 3rem;
          }
        }
        
        /* Override GHL form styles to match website design */
        iframe#inline-${GHL_FORM_ID} {
          background: transparent;
          width: 100% !important;
        }
      `}</style>
    </div>
  );
}
