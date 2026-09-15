import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m=vi.hoisted(()=>({worker:vi.fn(),upload:vi.fn()}));
vi.mock("@/lib/shop/session",()=>({getSessionWorker:m.worker}));
vi.mock("@/lib/shop/db",()=>({PRICE_CATEGORY:"Approved Estimate",getJob:async()=>({id:"job"}),uploadPhotoObject:m.upload,insertPhoto:async()=>({id:"photo"}),audit:async()=>{}}));
import { POST } from "./route";
beforeEach(()=>{vi.clearAllMocks();m.worker.mockResolvedValue({id:"crew",is_admin:true,can_see_prices:false});});
it.each(["Approved Estimate","Original Estimate"])("blocks financial upload category %s without owner permissions",async category=>{
  const form=new FormData();form.set("jobId","job");form.set("category",category);form.set("file",new Blob(["image"],{type:"image/png"}),"test.png");
  const response=await POST({formData:async()=>form} as NextRequest);
  expect(response.status).toBe(403);expect(m.upload).not.toHaveBeenCalled();
});
