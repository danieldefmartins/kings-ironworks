export interface EstimateItem { description: string; quantity: number; unit_price: number }
export interface JobEstimate {
  id: string; estimate_number: string; title: string; issued_on: string | null;
  is_original: boolean; items: EstimateItem[]; total_amount: number | string;
}
export interface VisibleEstimate {
  id: string; number: string; title: string; issuedOn: string | null; original: boolean;
  items: { description: string; quantity: number; unitPrice?: number; amount?: number }[];
  total?: number;
}
// An allowlist prevents amounts or future private fields leaking in a crew RSC payload.
export function estimateForViewer(estimate: JobEstimate, owner: boolean): VisibleEstimate {
  return {
    id: estimate.id, number: estimate.estimate_number, title: estimate.title,
    issuedOn: estimate.issued_on, original: estimate.is_original,
    items: estimate.items.map(item => ({ description: item.description, quantity: item.quantity,
      ...(owner ? { unitPrice: Number(item.unit_price), amount: Math.round(item.quantity * Number(item.unit_price) * 100) / 100 } : {}),
    })),
    ...(owner ? { total: Number(estimate.total_amount) } : {}),
  };
}
