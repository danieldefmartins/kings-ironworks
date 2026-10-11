import type {MeasureData} from '@/lib/shop/measure';
import {steelTakeoff} from '@/lib/shop/measure-steel';
export default function SteelTakeoffPrint({data}:{data:MeasureData}){
 if(!data.steelPlan?.rows.length)return null;
 const result=steelTakeoff(data);
 return <section className="mt-6 break-before-page text-black" data-steel-print><h2 className="text-lg font-bold">Material takeoff · DRAFT</h2><p className="text-xs">Assigned members only. Review before ordering. No inventory reservation. Saw kerf: {data.steelPlan.kerf||'?'}″ · Trim each stock end: {data.steelPlan.trim||'?'}″</p>
  {result.issues.length>0&&<div className="my-3 border border-black p-2"><strong>INCOMPLETE TAKEOFF</strong>{result.issues.map((s,i)=><p key={i} className="text-xs">{s}</p>)}</div>}
  {result.groups.map(g=><div key={g.key} className="my-4"><h3 className="font-bold">{g.bars.length} × {g.stock/12}′ · {g.item.display} · {g.item.grade}</h3><p className="text-xs">{g.item.sku} · Total stock: {g.feet.toFixed(2)} ft</p><table className="mt-2 w-full text-left text-xs"><thead><tr><th>Bar</th><th>Cuts · inches</th><th>Remaining</th></tr></thead><tbody>{g.bars.map((b,i)=><tr key={i} className="border-t border-gray-300"><td className="py-2">{i+1}</td><td className="py-2">{b.cuts.map(c=>`${c.mark}: ${c.length.toFixed(4)}″`).join('; ')}</td><td>{b.remaining.toFixed(4)}″</td></tr>)}</tbody></table></div>)}
 </section>;
}
