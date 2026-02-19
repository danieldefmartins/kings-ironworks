/**
 * King Iron Works - Business Constants
 */

export const PHONE_NUMBERS = {
  BOSTON: {
    display: "+1 617-404-2589",
    tel: "16174042589",
    label: "Boston"
  },
  CAPE_COD: {
    display: "+1 508-955-5006",
    tel: "15089555006",
    label: "Cape Cod"
  },
  WORCESTER: {
    display: "+1 508-955-5006",
    tel: "15089555006",
    label: "Worcester"
  },
  MIAMI: {
    display: "+1 754-240-0082",
    tel: "17542400082",
    label: "Miami"
  },
  // Main/default number (Boston)
  MAIN: {
    display: "+1 617-404-2589",
    tel: "16174042589",
    label: "Main"
  }
} as const;

export const LOCATIONS = [
  {
    name: "Everett, MA",
    subtitle: "Headquarters & Fabrication Shop",
    address: "69 Norman St, Unit 20\nEverett, MA 02149",
    phone: PHONE_NUMBERS.BOSTON,
    hours: "Monday - Friday: 7:00 AM - 5:00 PM\nSaturday: By Appointment\nSunday: Closed",
    description: "Our state-of-the-art fabrication facility houses all our custom ironwork operations. Visit our shop to see our capabilities and discuss your project in person.",
    image: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800&h=600&fit=crop"
  },
  {
    name: "Cape Cod, MA",
    subtitle: "Residential & Commercial Services",
    address: "Cape Cod, Massachusetts",
    phone: PHONE_NUMBERS.CAPE_COD,
    hours: "By Appointment",
    description: "Serving all of Cape Cod with custom ironwork, fire escape services, and historic restoration for coastal properties.",
    image: "https://images.unsplash.com/photo-1499092346589-b9b6be3e94b2?w=800&h=600&fit=crop"
  },
  {
    name: "Worcester, MA",
    subtitle: "Central Massachusetts Coverage",
    address: "Worcester, Massachusetts",
    phone: PHONE_NUMBERS.WORCESTER,
    hours: "By Appointment",
    description: "Full-service ironwork and fire escape solutions for Worcester and surrounding Central Massachusetts communities.",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop"
  },
  {
    name: "Miami, FL",
    subtitle: "Florida Operations",
    address: "Miami, Florida",
    phone: PHONE_NUMBERS.MIAMI,
    hours: "By Appointment",
    description: "Bringing our 20+ years of ironwork expertise to South Florida with custom fabrication and installation services.",
    image: "https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?w=800&h=600&fit=crop"
  }
] as const;

export const EMAIL = "info@kingirongroup.com";

export const GHL_FORM_ID = "aTeL51mSBGXtZGmEcsex";
export const GHL_CHAT_WIDGET_ID = "699737916e6009b3eccf3dff";
