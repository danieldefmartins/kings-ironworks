import { useEffect } from "react";

const FORM_ID = "GW0G3fMp5NzwuNLOy7sW";
const SCRIPT_URL = "https://links.360forbusiness.com/js/form_embed.js";

interface GHLFormPlaceholderProps {
  service?: string;
  variant?: "default" | "compact";
}

export default function GHLFormPlaceholder({ variant = "default" }: GHLFormPlaceholderProps) {
  useEffect(() => {
    // Load GHL form script once
    if (!document.querySelector(`script[src="${SCRIPT_URL}"]`)) {
      const script = document.createElement("script");
      script.src = SCRIPT_URL;
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const iframeHeight = variant === "compact" ? "450px" : "543px";

  return (
    <div className="w-full">
      <iframe
        src={`https://links.360forbusiness.com/widget/form/${FORM_ID}`}
        style={{
          width: "100%",
          height: iframeHeight,
          border: "none",
          borderRadius: "3px",
        }}
        id={`inline-${FORM_ID}`}
        data-layout="{'id':'INLINE'}"
        data-trigger-type="alwaysShow"
        data-trigger-value=""
        data-activation-type="alwaysActivated"
        data-activation-value=""
        data-deactivation-type="neverDeactivate"
        data-deactivation-value=""
        data-form-name="King Iron Group - Copy"
        data-height="543"
        data-layout-iframe-id={`inline-${FORM_ID}`}
        data-form-id={FORM_ID}
        title="King Iron Group - Contact Form"
      />
    </div>
  );
}
