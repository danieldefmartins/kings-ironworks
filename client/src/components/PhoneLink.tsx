/**
 * PhoneLink - A wrapper component for phone number links that automatically
 * fires Google Ads conversion tracking (AW-817727428/xe4zCLWS9IIcEMSP9oUD)
 * when a visitor clicks to call.
 *
 * Usage:
 *   <PhoneLink tel="16174042589" className="...">Call Us</PhoneLink>
 *   <PhoneLink tel="16174042589">{children}</PhoneLink>
 */

import React from "react";

interface PhoneLinkProps {
  tel: string;
  className?: string;
  children: React.ReactNode;
  [key: string]: unknown;
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    gtag_report_conversion?: (url: string) => boolean;
  }
}

export function PhoneLink({ tel, className, children, ...rest }: PhoneLinkProps) {
  const href = `tel:${tel}`;

  const handleClick = () => {
    // Fire Google Ads phone call conversion
    if (typeof window.gtag_report_conversion === "function") {
      window.gtag_report_conversion(href);
    }
    // Allow the default tel: link behavior to proceed
  };

  return (
    <a href={href} className={className} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}

export default PhoneLink;
