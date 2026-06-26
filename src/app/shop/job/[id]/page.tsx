import { redirect, notFound } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import { getJob, getCutItems, getMaterials, getQc } from "@/lib/shop/db";
import ShopTopBar from "../../ShopTopBar";
import TravelerClient from "./TravelerClient";

export const dynamic = "force-dynamic";

export default async function JobTravelerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");

  const { id } = await params;
  const job = await getJob(id);
  if (!job) notFound();

  const [cut, materials, qc] = await Promise.all([
    getCutItems(id),
    getMaterials(id),
    getQc(id),
  ]);

  return (
    <div>
      <ShopTopBar
        workerName={worker.name}
        title={job.customer_name}
        back="/shop"
      />
      <TravelerClient job={job} cut={cut} materials={materials} qc={qc} />
    </div>
  );
}
