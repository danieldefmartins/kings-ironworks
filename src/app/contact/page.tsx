import type { Metadata } from "next";
import ContactClient from "@/components/ContactClient";

export const metadata: Metadata = {
  title: "Contact King Iron Works — Free Assessment",
  description:
    "Get a free consultation and quote for your ironwork project. Call (617) 404-2589 or fill out our form. Serving Boston, Cape Cod, Worcester, Miami, and the entire Northeast.",
  alternates: {
    canonical: "https://www.kingsironworks.com/contact",
  },
  openGraph: {
    title: "Contact King Iron Works — Free Assessment",
    description:
      "Get a free consultation and quote for your ironwork project. Call (617) 404-2589 or fill out our form. Serving Boston, Cape Cod, Worcester, Miami, and the entire Northeast.",
    url: "https://www.kingsironworks.com/contact",
    siteName: "King Iron Works",
    type: "website",
  },
};

export default function ContactPage() {
  return <ContactClient />;
}
