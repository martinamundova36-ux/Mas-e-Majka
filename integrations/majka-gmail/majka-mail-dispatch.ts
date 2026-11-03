// STAGING ONLY: Deploy after Majka's Google authorization and secrets.
// Bearer token protects this internal Supabase scheduler function.
import { createClient } from "npm:@supabase/supabase-js@2.57.0";
const json=(v:unknown,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{"content-type":"application/json","cache-control":"no-store"}});
const enc=new TextEncoder();
async function signature(secret:string,value:string){
 const key=await crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const raw=new Uint8Array(await crypto.subtle.sign("HMAC",key,enc.encode(value)));
 return btoa(String.fromCharCode(...raw)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
Deno.serve(async req=>{
 if(req.method!=="POST")return json({error:"Method"},405);
 const token=Deno.env.get("MAJKA_DISPATCH_TOKEN"),secret=Deno.env.get("MAJKA_SHARED_SECRET"),url=Deno.env.get("MAJKA_GOOGLE_SCRIPT_URL");
 if(!token||!secret||!url||secret.length<32)return json({error:"Not configured"},503);
 if(req.headers.get("authorization")!=="Bearer "+token)return json({error:"Unauthorized"},401);
 const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
 const {data:jobs,error}=await db.from("majka_email_notifications").select("id,booking_id,kind,recipient_email,attempts").eq("status","queued").lte("scheduled_at",new Date().toISOString()).order("scheduled_at").limit(20);
 if(error)return json({error:"Queue unavailable"},503);
 let sent=0,failed=0;
 for(const job of jobs||[]){
  const {data:claim}=await db.from("majka_email_notifications").update({status:"sending",attempts:job.attempts+1}).eq("id",job.id).eq("status","queued").select("id").maybeSingle();
  if(!claim)continue;
  try{
   const {data:b,error:e}=await db.from("majka_bookings").select("customer_name,starts_at,status,service_id").eq("id",job.booking_id).single();
   if(e||!b)throw Error("Missing booking");
   if(job.kind!=="cancellation"&&b.status!=="confirmed"){
    await db.from("majka_email_notifications").update({status:"cancelled"}).eq("id",job.id);continue;
   }
   const {data:svc}=await db.from("majka_services").select("name_sk").eq("id",b.service_id).single();
   const when=new Intl.DateTimeFormat("sk-SK",{timeZone:"Europe/Bratislava",dateStyle:"full",timeStyle:"short"}).format(new Date(b.starts_at));
   const names:Record<string,string>={
    confirmation:"Potvrdenie rezervácie",reminder_24h:"Pripomienka termínu zajtra",
    reminder_2h:"Pripomienka masáže",cancellation:"Zrušenie rezervácie",
    change:"Zmena rezervácie",thank_you:"Ďakujeme za návštevu"
   };
   const subject=(names[job.kind]||"Informácia o rezervácii")+" – Masáže Majka";
   const body="Dobrý deň, "+b.customer_name+",\n\n"+(names[job.kind]||"Informácia")+
     "\nMasáž: "+(svc?.name_sk||"Masáž")+"\nTermín: "+when+
     "\n\nKontakt: majahulmanova@gmail.com\nMasáže Majka";
   const payload={timestamp:Date.now(),nonce:crypto.randomUUID(),to:job.recipient_email,subject,body};
   const canonical=[payload.timestamp,payload.nonce,payload.to,payload.subject,payload.body].join("\n");
   const signed=await signature(secret,canonical);
   const response=await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...payload,signature:signed})});
   const result=await response.json().catch(()=>null);
   if(!response.ok||result?.ok!==true)throw Error("Gmail rejected delivery");
   const {error:finish}=await db.from("majka_email_notifications").update({status:"sent",sent_at:new Date().toISOString(),last_error:null}).eq("id",job.id);
   if(finish)throw finish;
   sent++;
  }catch(e){
   failed++;
   await db.from("majka_email_notifications").update({status:job.attempts+1>=3?"failed":"queued",last_error:String(e).slice(0,250)}).eq("id",job.id);
  }
 }
 return json({sent,failed});
});
