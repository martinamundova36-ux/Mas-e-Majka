/**
 * Masáže Majka — Gmail delivery bridge, staging.
 * Supabase is the ONLY bookings database. This script never stores bookings.
 * Test first with Martina's Google account; run the production copy only
 * from Majka's Google account after approving permissions.
 *
 * Script Properties (private, never commit):
 *   MAJKA_SHARED_SECRET = random 32+ character high-entropy secret
 *
 * Deploy as Web App: execute as the owner, access Anyone, ONLY after the
 * signed Supabase dispatcher is configured. Unauthenticated requests
 * cannot send emails; signed messages expire after 5 minutes.
 */
const MAJKA = Object.freeze({
  productionOwner:'majahulmanova@gmail.com',
  testOwner:'martinamundova36@gmail.com',
  maxBody:6000,maxSubject:180
});
function activeMajkaSender_() {
  const current=Session.getEffectiveUser().getEmail().toLowerCase();
  if(current!==MAJKA.productionOwner&&current!==MAJKA.testOwner){
    throw new Error('Schválené účty: '+MAJKA.testOwner+' alebo '+MAJKA.productionOwner);
  }
  return current;
}
function setupMajkaMailer() {
  const current=activeMajkaSender_();
  const secret=PropertiesService.getScriptProperties().getProperty('MAJKA_SHARED_SECRET');
  if(!secret||secret.length<32)throw new Error('Najprv v Script Properties nastavte bezpečný MAJKA_SHARED_SECRET (min. 32 znakov).');
  Logger.log('Gmail mailer pripravený pre '+current+'. Tajný kľúč nezapisovať do logov.');
}
function sendMajkaTestEmail() {
  const current=activeMajkaSender_();
  MailApp.sendEmail({
    to:current,
    subject:'TEST – Masáže Majka · e-mailové upozornenie',
    body:'TESTOVACIA SPRÁVA (žiadna skutočná rezervácia)\n\nZákazník: Testovací zákazník\nMasáž: Klasická masáž, 60 minút\nTermín: testovací termín\n\nToto je kontrola Google autorizácie a odoslania e-mailu. Žiadny zákaznícky údaj sa neposlal.',
    name:'Masáže Majka – test',replyTo:current
  });
}
function base64url_(bytes){return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/,'');}
function equalSafe_(a,b){
  if(typeof a!=='string'||typeof b!=='string')return false;
  let diff=a.length^b.length;
  for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);
  return diff===0;
}
function reply_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
function doGet(){return reply_({ok:false,error:'POST only'});}
function doPost(e) {
  try {
    const sender=activeMajkaSender_();
    const raw=e&&e.postData&&e.postData.contents;
    if(!raw||raw.length>10000)throw new Error('Invalid payload');
    const p=JSON.parse(raw);
    const timestamp=Number(p.timestamp);
    const nonce=String(p.nonce||'');
    const to=String(p.to||'').trim();
    const subject=String(p.subject||'').trim();
    const body=String(p.body||'');
    const signature=String(p.signature||'');
    if(!Number.isInteger(timestamp)||Math.abs(Date.now()-timestamp)>300000)throw new Error('Expired request');
    if(!/^[a-f0-9-]{30,50}$/i.test(nonce))throw new Error('Invalid nonce');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)||to.length>150)throw new Error('Invalid address');
    // Martina's temporary test project can never send mail to customers.
    if(sender===MAJKA.testOwner&&to.toLowerCase()!==MAJKA.testOwner)throw new Error('Test recipient only');
    if(subject.length<1||subject.length>MAJKA.maxSubject||body.length<1||body.length>MAJKA.maxBody)throw new Error('Invalid message');
    const secret=PropertiesService.getScriptProperties().getProperty('MAJKA_SHARED_SECRET');
    if(!secret||secret.length<32)throw new Error('Not configured');
    const canonical=[timestamp,nonce,to,subject,body].join('\n');
    const expected=base64url_(Utilities.computeHmacSha256Signature(canonical,secret));
    if(!equalSafe_(expected,signature))throw new Error('Unauthorised');
    const cache=CacheService.getScriptCache();
    const key='nonce-'+nonce;
    const lock=LockService.getScriptLock();lock.waitLock(10000);
    try {
      if(cache.get(key))throw new Error('Duplicate request');
      cache.put(key,'used',360);
    } finally {lock.releaseLock();}
    if(MailApp.getRemainingDailyQuota()<1)throw new Error('Gmail quota exhausted');
    MailApp.sendEmail({to,subject,body,name:'Masáže Majka',replyTo:sender});
    return reply_({ok:true});
  } catch(err) {
    // Apps Script ContentService returns HTTP 200 even for application errors.
    // The Supabase dispatcher MUST inspect body.ok, never status alone.
    console.error('Mailer request failed: '+String(err&&err.message||err));
    return reply_({ok:false,error:'Delivery rejected'});
  }
}
