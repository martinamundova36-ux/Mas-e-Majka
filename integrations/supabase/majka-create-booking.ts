import {createClient} from "npm:@supabase/supabase-js@2.57.0";
const origin="https://martinamundova36-ux.github.io";
const headers={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Methods":"POST,OPTIONS","Access-Control-Allow-Headers":"content-type,apikey,authorization","Content-Type":"application/json","Cache-Control":"no-store"};
const json=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers});
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 if(req.headers.get("origin")!==origin)return json({error:"Origin not allowed"},403);
 if(Number(req.headers.get("content-length")||0)>4096)return json({error:"Payload too large"},413);
 try{
  const body=await req.json();
  if(JSON.stringify(body).length>4096)return json({error:"Payload too large"},413);
  if(body.website)return json({error:"Invalid request"},400);
  const name=String(body.name||"").trim(),email=String(body.email||"").trim(),phone=String(body.phone||"").trim(),note=String(body.note||"").trim();
  if(name.length<2||name.length>100||!/^\S+@\S+\.\S+$/.test(email)||email.length>120||phone.length<7||phone.length>30||note.length>500)return json({error:"Invalid contact details"},400);
  const day=String(body.date||""),clock=String(body.time||""),serviceId=Number(body.service_id);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(clock)||!Number.isInteger(serviceId))return json({error:"Invalid appointment"},400);
  const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
  const {data:service,error:se}=await db.from("majka_services").select("id,duration_minutes").eq("id",serviceId).eq("active",true).maybeSingle();
  if(se||!service)return json({error:"Unknown service"},400);
  const date=new Date(day+"T12:00:00Z");if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==day)return json({error:"Invalid date"},400);
  const today=new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Bratislava",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const max=new Date(today+"T12:00:00Z");const targetDay=max.getUTCDate();max.setUTCMonth(max.getUTCMonth()+2,0);max.setUTCDate(Math.min(targetDay,max.getUTCDate()));
  if(day<today||day>max.toISOString().slice(0,10))return json({error:"Date unavailable"},409);
  const weekday=(date.getUTCDay()+6)%7+1;
  const {data:hours,error:he}=await db.from("majka_working_hours").select("opens_at,closes_at,enabled").eq("weekday",weekday).single();
  if(he||!hours?.enabled)return json({error:"Closed"},409);
  const minutes=(v:string)=>{const [h,m]=v.split(":").map(Number);return h*60+m};
  const t=minutes(clock),duration=service.duration_minutes;
  // A 45-minute massage can be followed immediately at :15 or :45.
  if(t<minutes(hours.opens_at)||t+duration>minutes(hours.closes_at)||t%15!==0)return json({error:"Time unavailable"},409);
  const tz=new Intl.DateTimeFormat("en-US",{timeZone:"Europe/Bratislava",timeZoneName:"shortOffset"}).formatToParts(date).find(p=>p.type==="timeZoneName")?.value||"GMT+1";
  const offset=Number(tz.replace("GMT",""))||1;
  const startsAt=new Date(Date.parse(day+"T00:00:00Z")+(t-offset*60)*60000);
  const endsAt=new Date(startsAt.getTime()+duration*60000);
  if(startsAt.getTime()<Date.now()+3600000)return json({error:"Too soon"},409);
  const {data:blocked,error:be}=await db.from("majka_blocked_times").select("id").lt("starts_at",endsAt.toISOString()).gt("ends_at",startsAt.toISOString()).limit(1);
  if(be)throw be;if(blocked?.length)return json({error:"Time unavailable"},409);
  // Do not accept reservations until a reliable notification mechanism is configured.
  if(Deno.env.get("MAJKA_BOOKING_NOTIFICATIONS_READY")!=="true")return json({error:"Online booking is not activated yet; please use the email request form."},503);
  const {data:created,error:ce}=await db.from("majka_bookings").insert({service_id:serviceId,customer_name:name,customer_email:email,customer_phone:phone,note,starts_at:startsAt.toISOString(),ends_at:endsAt.toISOString(),status:"pending"}).select("id").single();
  if(ce){if(ce.code==="23P01")return json({error:"This slot has just been taken"},409);throw ce}
  return json({ok:true,booking_id:created.id,status:"pending"},201);
 }catch(e){console.error(e);return json({error:"Booking temporarily unavailable"},503)}
});
