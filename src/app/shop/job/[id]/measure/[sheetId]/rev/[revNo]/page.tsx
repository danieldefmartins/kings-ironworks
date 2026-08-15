import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSessionWorker } from "@/lib/shop/session";
import { getJob, getMeasureSheet, getMeasureRevision, listWorkers } from "@/lib/shop/db";
import { normalizeMeasureData, type MeasureShape, type MeasureSheet } from "@/lib/shop/measure";
import { runChecks, orderedPosts } from "@/lib/shop/measure-checks";
import { mt } from "@/lib/shop/measure-i18n";
import ShopTopBar from "../../../../../../ShopTopBar";
import RevisionPrintButton, { RevisionSheet } from "./RevisionClient";

export const dynamic = "force-dynamic";

// The immutable record fabrication works from. Read-only: renders the
// approved revision's snapshot, never the live (editable) sheet data.
export default async function RevisionPage({
  params,
}: {
  params: Promise<{ id: string; sheetId: string; revNo: string }>;
}) {
  const worker = await getSessionWorker();
  if (!worker) redirect("/shop/login");
  const lang = worker.lang || "en";

  const { id, sheetId, revNo } = await params;
  const revN = parseInt(revNo, 10);
  if (!Number.isFinite(revN) || revN < 1) notFound();

  const [job, sheet, revision, workers] = await Promise.all([
    getJob(id),
    getMeasureSheet(sheetId),
    getMeasureRevision(sheetId, revN),
    listWorkers(),
  ]);
  if (!job || !sheet || sheet.job_id !== id || !revision) notFound();

  const nameById: Record<string, string> = {};
  for (const w of workers) nameById[w.id] = w.name;

  const data = normalizeMeasureData(revision.data);
  const checks = runChecks(data, revision.shape as MeasureShape);

  // Render the snapshot as an approved sheet frozen at this revision.
  const frozen: MeasureSheet = {
    ...sheet,
    name: revision.name,
    shape: revision.shape as MeasureShape,
    data,
    status: "approved",
    approved_by: revision.approved_by,
    approved_at: revision.approved_at,
    current_rev: revision.rev_no,
  };

  return (
    <div>
      <div className="print:hidden">
        <ShopTopBar
          workerName={worker.name}
          title={`${job.customer_name} · ${mt(lang, "revLabel")} ${revision.rev_no}`}
          back={`/shop/job/${id}/measure/${sheetId}`}
          lang={lang}
          adminLink={!!worker.is_admin}
        />
        <div className="px-4 pt-4 max-w-4xl mx-auto flex items-center gap-3 flex-wrap">
          <span
            className={`text-xs font-bold rounded-full px-3 py-2 border ${
              revision.superseded
                ? "bg-neutral-800 border-neutral-600 text-neutral-300"
                : "bg-green-600/20 border-green-500 text-green-300"
            }`}
          >
            🔒 {mt(lang, "lockedRevTitle")} · {mt(lang, "revLabel")} {revision.rev_no}
            {revision.superseded ? ` · ${mt(lang, "supersededMark")}` : ""}
          </span>
          <RevisionPrintButton lang={lang} />
          <Link
            href={`/shop/job/${id}/measure/${sheetId}`}
            className="text-xs font-bold rounded-full px-3 py-2 border bg-neutral-800 border-neutral-600 text-neutral-200"
          >
            ← {mt(lang, "backToSheet")}
          </Link>
        </div>
      </div>
      <div className="max-w-4xl mx-auto my-4 rounded-xl overflow-hidden print:my-0 print:rounded-none">
        <RevisionSheet
          job={job}
          sheet={frozen}
          data={data}
          lang={lang}
          workerName={worker.name}
          posts={orderedPosts(data)}
          nameById={nameById}
          checks={checks}
          superseded={revision.superseded}
          qrUrl={`https://kingsironworks.com/shop/job/${id}/measure/${sheetId}/rev/${revision.rev_no}`}
        />
      </div>
    </div>
  );
}
