import { redirect } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import { listJobs } from "@/lib/shop/db";
import { mt } from "@/lib/shop/measure-i18n";
import ShopTopBar from "../ShopTopBar";
import NewFieldMeasure from "../NewFieldMeasure";

export const dynamic = "force-dynamic";

// Seller entry point: capture basic project info, then measure.
export default async function NewMeasurePage() {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  const lang = worker.lang || "en";
  const existing = (await listJobs()).map((j) => ({
    id: j.id,
    jobNumber: j.job_number,
    customer: j.customer_name,
    address: j.address || "",
  }));

  return (
    <div>
      <ShopTopBar
        workerName={worker.name}
        title={mt(lang, "newFieldMeasure")}
        back="/shop"
        lang={lang}
        adminLink={!!worker.is_admin}
      />
      <div className="p-4 max-w-2xl mx-auto">
        <NewFieldMeasure lang={lang} startOpen existing={existing} />
      </div>
    </div>
  );
}
