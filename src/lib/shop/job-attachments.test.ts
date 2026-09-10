import { expect, it } from "vitest";
import { partitionJobAttachments, type Photo } from "./shared";
const attachment = (id: string, url: string, category = "Other", kind = "image") => ({ id, url, category, kind, caption: "private financial details" } as Photo);
it("removes PDF paths, metadata and estimate images from crew payloads", () => {
  const rows = [attachment("site", "job/site.jpg"), attachment("original", "job/first.pdf", "Original Estimate", "document"), attachment("wrong-category", "job/estimate.PDF"), attachment("approved", "job/price.jpg", "Approved Estimate"), attachment("first-image", "job/original.png", "Original Estimate")];
  expect(partitionJobAttachments(rows, false)).toEqual({ photos: [rows[0]], documents: [] });
  expect(partitionJobAttachments(rows, true).documents.map(p => p.id)).toEqual(["original", "wrong-category"]);
});
it("does not treat an original document as an approved estimate photo", () => {
  const result = partitionJobAttachments([attachment("original", "job/first.pdf", "Original Estimate", "document")], true);
  expect(result.photos).toEqual([]);
  expect(result.documents).toHaveLength(1);
});
