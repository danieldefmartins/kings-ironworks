/**
 * Go High Level Form Placeholder
 * Replace the content of this component with your GHL form embed code
 * 
 * To integrate:
 * 1. Go to your GHL dashboard
 * 2. Create/copy your form
 * 3. Get the embed code
 * 4. Replace the placeholder div below with the GHL iframe/script
 */

interface GHLFormPlaceholderProps {
  service?: string;
  variant?: "default" | "compact";
}

export default function GHLFormPlaceholder({ service, variant = "default" }: GHLFormPlaceholderProps) {
  if (variant === "compact") {
    return (
      <div className="bg-accent text-accent-foreground p-6 rounded-lg border-4 border-accent-foreground/20">
        <h3 className="text-xl font-black mb-4">Get Free Quote</h3>
        
        {/* REPLACE THIS DIV WITH YOUR GHL FORM EMBED CODE */}
        <div className="ghl-form-container min-h-[300px] flex items-center justify-center bg-background/10 rounded">
          <div className="text-center p-6">
            <p className="font-bold mb-2">GHL Form Placeholder</p>
            <p className="text-sm opacity-80">
              Replace this with your Go High Level form embed code
            </p>
            <p className="text-xs mt-2 opacity-60">
              Service: {service || "General"}
            </p>
          </div>
        </div>
        {/* END GHL FORM PLACEHOLDER */}
        
        <p className="text-xs text-center opacity-80 mt-4">
          Response within 2 hours • No obligation
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card text-card-foreground p-8 rounded-lg border-4 border-primary shadow-2xl">
      <div className="text-center mb-6">
        <h3 className="text-3xl font-black mb-2">Get Your Free Quote</h3>
        <p className="text-muted-foreground">
          Response within 2 hours • Licensed & Insured • No Obligation
        </p>
      </div>

      {/* REPLACE THIS DIV WITH YOUR GHL FORM EMBED CODE */}
      <div className="ghl-form-container min-h-[500px] flex items-center justify-center bg-muted/20 rounded-lg">
        <div className="text-center p-8">
          <p className="text-xl font-bold mb-3">GHL Form Placeholder</p>
          <p className="text-muted-foreground mb-4">
            Replace this with your Go High Level form embed code
          </p>
          <div className="bg-primary/10 p-4 rounded max-w-md mx-auto">
            <p className="text-sm font-mono text-left">
              Service: {service || "General"}<br/>
              Variant: {variant}
            </p>
          </div>
        </div>
      </div>
      {/* END GHL FORM PLACEHOLDER */}
    </div>
  );
}
