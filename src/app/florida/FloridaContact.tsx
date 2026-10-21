"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Phone, MessageSquare } from "lucide-react";
import { PHONE_NUMBERS } from "@/lib/constants";
import { attributionPayload, captureAttribution } from "@/lib/florida/attribution";
import { checkPhotos, loadForm, newAttempt, normalizePhone, photoLimit, readyForm, sendLead, trackFormActivity, type Attempt, type CrmConfig, type PublicForm } from "@/lib/florida/crm";
import { SMS_CONSENT } from "@/lib/florida/config";
const phone = PHONE_NUMBERS.MIAMI;
const services = ["Aluminum", "Stainless steel railings", "Structural steel", "Floating staircase"];
function track(name: string) { const w = window as Window & { gtag?: (...args: unknown[]) => void }; w.gtag?.("event", name, { page_location: window.location.href, service_area: "Florida" }); }
export function FloridaBar() {
  return <nav className="fl-bar" aria-label="Contact our Florida team"><a href={`tel:+${phone.tel}`}><Phone size={17}/>Call</a><a href={`sms:+${phone.tel}`}><MessageSquare size={17}/>Text</a><a href="#estimate" className="fl-button">Free estimate <ArrowUpRight size={16}/></a></nav>;
}
export default function FloridaContact() {
  const [status, setStatus] = useState<"idle"|"sending"|"success"|"error">("idle");
  const [error, setError] = useState("");
  const attempt = useRef<Attempt | null>(null);
  const setup = useRef<{config: CrmConfig; form: PublicForm} | null>(null);
  const [progress,setProgress] = useState("");
  const started = useRef(false);
  async function initialize() {
    if (setup.current) return setup.current;
    const response = await fetch("/api/florida-estimate", {signal: AbortSignal.timeout(15000)});
    if (!response.ok) throw Error("Online requests are temporarily unavailable. Please call or text our Florida team.");
    const {config} = await response.json() as {config: CrmConfig};
    const form = await loadForm(config,SMS_CONSENT);
    setup.current = {config,form};
    return setup.current;
  }
  const [files,setFiles] = useState<File[]>([]);
  useEffect(()=>{captureAttribution(); attempt.current=newAttempt("");
    void initialize().then(({config,form})=>trackFormActivity(config,form,attempt.current!.key,"view",0,attributionPayload())).catch(()=>{/* Submit provides a visible recovery message. */});
    const onClick = (event: MouseEvent) => { const link = (event.target as Element)?.closest?.("a"); const href = link?.getAttribute("href") || ""; if(href.startsWith("tel:"))track("click_to_call");if(href.startsWith("sms:"))track("click_to_text"); };
    document.addEventListener("click",onClick);return ()=>document.removeEventListener("click",onClick);
  },[]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();if(status==="sending")return;
    setStatus("sending");setError("");setProgress("");
    const data=new FormData(event.currentTarget);
    try {
      const values = {firstName:String(data.get("name")||"").trim(),phone:normalizePhone(String(data.get("phone")||"")),email:String(data.get("email")||""),projectType:String(data.get("service")||""),city:String(data.get("city")||"").trim(),message:String(data.get("message")||""),website:String(data.get("website")||"")};
      checkPhotos(files);
      const {config,form:loaded}=await initialize();
      const form=await readyForm(config,SMS_CONSENT,loaded);
      setup.current={config,form};
      if(files.length && photoLimit(config,form)===0)throw Error("Photos cannot be sent right now. Please text them to our Florida team, or remove the photos and send your request again.");
      const signature=JSON.stringify([values,data.get("smsConsent"),files.map(f=>[f.name,f.size,f.lastModified])]);
      if(!attempt.current||attempt.current.signature!==signature)attempt.current=newAttempt(signature);
      await sendLead(config,form,attempt.current,values,data.get("smsConsent")==="on",files,attributionPayload(),undefined,{onStatus:(index,state)=>setProgress(state==="throttled"?"Photos are uploading slowly. Please keep this page open.":state==="done"?`Photo ${index+1} of ${files.length} uploaded.`:`Uploading photo ${index+1} of ${files.length}…`)});
      setStatus("success");track("generate_lead");
    }catch(err){setError(err instanceof Error?err.message:"We couldn’t send your request. Please try again, call or text us.");setStatus("error");}
  }
  if(status==="success")return <div className="fl-form" role="status"><h3>Thank you. Your request is in.</h3><p>Our team will review your Florida project and follow up to discuss the details.</p><a className="fl-text-link" href={`tel:+${phone.tel}`}>Call {phone.display}</a></div>;
  return <form className="fl-form" onSubmit={submit} aria-label="Florida project estimate" onFocus={()=>{if(!started.current&&setup.current&&attempt.current){started.current=true;trackFormActivity(setup.current.config,setup.current.form,attempt.current.key,"start",0,attributionPayload());}}}><fieldset disabled={status==="sending"}>
    <label className="fl-field" htmlFor="fl-name">Your name<input id="fl-name" name="name" autoComplete="name" required maxLength={120}/></label>
    <label className="fl-field" htmlFor="fl-phone">Phone<input id="fl-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" required maxLength={40}/></label>
    <label className="fl-field" htmlFor="fl-email">Email <span className="fl-optional">(optional)</span><input id="fl-email" name="email" type="email" autoComplete="email" maxLength={254}/></label>
    <label className="fl-field" htmlFor="fl-service">What are you planning?<select id="fl-service" name="service" required defaultValue=""><option value="" disabled>Choose a service</option>{services.map(s=><option key={s}>{s}</option>)}</select></label>
    <label className="fl-field" htmlFor="fl-city">Project city<input id="fl-city" name="city" autoComplete="address-level2" required maxLength={150}/></label>
    <label className="fl-field" htmlFor="fl-message">Project details <span className="fl-optional">(optional)</span><textarea id="fl-message" name="message" rows={4} maxLength={4000}/></label>
    <label className="fl-field" htmlFor="fl-photos">Project photos <span className="fl-optional">(optional)</span><input id="fl-photos" name="photos" type="file" accept="image/jpeg,image/png,image/heic,image/heif,image/webp,.heic,.heif" multiple onChange={e=>setFiles(Array.from(e.target.files||[]))}/></label><p className="fl-help">JPEG, PNG, HEIC or WebP. Up to 10 photos, 10 MB each, 40 MB total.{files.length>0?` ${files.length} selected.`:""}</p>
    <label className="fl-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off"/></label>
    <label className="fl-consent"><input type="checkbox" name="smsConsent"/><span>By checking this box, I agree to receive text messages from King Iron Works about my estimate, appointments and project updates. Message frequency varies. Message &amp; data rates may apply. Reply STOP to opt out, HELP for help. See our <a href="/privacy">Privacy Policy</a> and <a href="/terms">Terms</a>. Optional; not required to request an estimate.</span></label>
    <button className="fl-button" type="submit">{status==="sending"?"Sending your request…":"Request my free estimate"}<ArrowUpRight size={18}/></button>
    {status==="sending"&&progress&&<p role="status" className="fl-help">{progress}</p>}
    {error&&<div role="alert" className="fl-error">{error}<br/><a href={`tel:+${phone.tel}`}>Call {phone.display}</a> or <a href={`sms:+${phone.tel}`}>text us</a>.</div>}
  </fieldset></form>;
}

export function FloridaLocalArea() {
 const [city,setCity]=useState<string|null>(null);
 useEffect(()=>{let active=true;async function load(){try{const key="kiw-florida-city";const saved=sessionStorage.getItem(key);if(saved!==null){if(active&&saved==="Miami")setCity(saved);return;}const res=await fetch("/api/florida-geo",{signal:AbortSignal.timeout(2500)});if(!res.ok)return;const data=await res.json();const value=data.city==="Miami"?"Miami":"";sessionStorage.setItem(key,value);if(active)setCity(value||null);}catch{}}void load();return()=>{active=false;};},[]);
 return <p className="fl-hero-note">{city?<a href="/miami">Serving Miami, Florida.</a>:"For homes, builders & commercial spaces."}</p>;
}
