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
  NEW_HAMPSHIRE: {
    display: "+1 603-691-3012",
    tel: "16036913012",
    label: "New Hampshire"
  },
  MAINE: {
    display: "+1 207-503-4700",
    tel: "12075034700",
    label: "Maine"
  },
  RHODE_ISLAND: {
    display: "+1 401-535-7979",
    tel: "14015357979",
    label: "Rhode Island"
  },
  NEW_YORK: {
    display: "+1 917-809-6492",
    tel: "19178096492",
    label: "New York"
  },
  CONNECTICUT: {
    display: "+1 860-740-4242",
    tel: "18607404242",
    label: "Connecticut"
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
  },
  {
    name: "New Hampshire",
    subtitle: "New Hampshire Operations",
    address: "New Hampshire",
    phone: PHONE_NUMBERS.NEW_HAMPSHIRE,
    hours: "By Appointment",
    description: "Professional ironwork services for New Hampshire homes and businesses. Custom fabrication, fire escapes, and structural steel.",
    image: "https://images.unsplash.com/photo-1605130284535-11dd9eedc58a?w=800&h=600&fit=crop"
  },
  {
    name: "Maine",
    subtitle: "Maine Operations",
    address: "Maine",
    phone: PHONE_NUMBERS.MAINE,
    hours: "By Appointment",
    description: "Serving Maine with expert ironwork, custom fabrication, and fire escape services built to withstand New England weather.",
    image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&h=600&fit=crop"
  },
  {
    name: "Rhode Island",
    subtitle: "Rhode Island Operations",
    address: "Rhode Island",
    phone: PHONE_NUMBERS.RHODE_ISLAND,
    hours: "By Appointment",
    description: "Expert ironwork services for Rhode Island properties. Custom gates, railings, fire escapes, and historic restoration.",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=600&fit=crop"
  },
  {
    name: "New York",
    subtitle: "New York Operations",
    address: "New York",
    phone: PHONE_NUMBERS.NEW_YORK,
    hours: "By Appointment",
    description: "Full-service ironwork solutions for New York. Fire escapes, structural steel, custom fabrication, and building restoration.",
    image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop"
  },
  {
    name: "Connecticut",
    subtitle: "Connecticut Operations",
    address: "Connecticut",
    phone: PHONE_NUMBERS.CONNECTICUT,
    hours: "By Appointment",
    description: "Trusted ironwork services for Connecticut. Custom gates, railings, fire escapes, and historic restoration for homes and businesses.",
    image: "https://images.unsplash.com/photo-1567157577867-05ccb1388e13?w=800&h=600&fit=crop"
  }
] as const;

export const EMAIL = "info@kingirongroup.com";

export const GHL_FORM_ID = "aTeL51mSBGXtZGmEcsex";
export const GHL_CHAT_WIDGET_ID = "699737916e6009b3eccf3dff";
