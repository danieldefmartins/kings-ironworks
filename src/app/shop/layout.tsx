import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop Floor — King Iron Works",
  robots: { index: false, follow: false },
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-body select-none">
      {children}
    </div>
  );
}
