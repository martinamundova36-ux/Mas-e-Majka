import {createClient} from "npm:@supabase/supabase-js@2.57.0";
const h={"Access-Control-Allow-Origin":"https://martinamundova36-ux.github.io","Access-Control-Allow-Methods":"GET,OPTIONS","Access-Control-Allow-Headers":"content-type,apikey,authorization","Content-Type":"application/json","Cache-Control":"no-store"};
const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:h});
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:h});
 if(req.method!=="GET")return respond({error:"Method not allowed"},405);
 try{
  const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
  const {data:services,error:e}=await db.from("majka_services").select("id,name_sk,name_en,duration_minutes,price_eur").eq("active",true).order("id");
  if(e)throw e;
  const u=new URL(req.url),day=u.searchParams.get("date");
  if(!day)return respond({services,slots:[],configured:false});
  if(!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(day))return respond({error:"Invalid date"},400);
  const d=new Date(day+"T12:00:00Z");
  if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==day)return respond({error:"Invalid date"},400);
  const today=new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Bratislava",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const limit=new Date(today+"T12:00:00Z");limit.setUTCDate(limit.getUTCDate()+365);
  if(day<today||day>limit.toISOString().slice(0,10))return respond({services,slots:[],configured:false});
  const weekday=(d.getUTCDay()+6)%7+1;
  const {data:hours,error:he}=await db.from("majka_working_hours").select("opens_at,closes_at,enabled").eq("weekday",weekday).single();
  if(he)throw he;
  if(!hours.enabled)return respond({services,slots:[],configured:false,message:"Working hours not yet configured"});
  const id=Number(u.searchParams.get("service_id")),svc=services?.find(x=>x.id===id);
  if(!svc)return respond({services,slots:[],configured:true});
  const offsetParts=new Intl.DateTimeFormat("en-US",{timeZone:"Europe/Bratislava",timeZoneName:"shortOffset"}).formatToParts(d);
  const offsetName=offsetParts.find(p=>p.type==="timeZoneName")?.value||"GMT+1";
  const offset=Number(offsetName.replace("GMT",""))||1;
  const dayStart=Date.parse(day+"T00:00:00Z")-offset*3600000;
  const dayEnd=dayStart+86400000;
  const {data:busy,error:be}=await db.from("majka_bookings").select("starts_at,ends_at").in("status",["pending","confirmed"]).lt("starts_at",new Date(dayEnd).toISOString()).gt("ends_at",new Date(dayStart).toISOString());
  if(be)throw be;
  const {data:blocks,error:xe}=await db.from("majka_blocked_times").select("starts_at,ends_at").lt("starts_at",new Date(dayEnd).toISOString()).gt("ends_at",new Date(dayStart).toISOString());
  if(xe)throw xe;
  const mins=(v:string)=>{const [a,b]=v.split(":").map(Number);return a*60+b};
  const slots:string[]=[];
  for(let t=mins(hours.opens_at);t+svc.duration_minutes<=mins(hours.closes_at);t+=30){
   const start=dayStart+t*60000,end=start+svc.duration_minutes*60000;
   if(start<=Date.now())continue;
   if([...(busy||[]),...(blocks||[])].some(x=>Date.parse(x.starts_at)<end&&Date.parse(x.ends_at)>start))continue;
   slots.push(String(Math.floor(t/60)).padStart(2,"0")+":"+String(t%60).padStart(2,"0"));
  }
  return respond({services,slots,configured:true});
 }catch(err){console.error(err);return respond({error:"Availability unavailable"},503)}
});