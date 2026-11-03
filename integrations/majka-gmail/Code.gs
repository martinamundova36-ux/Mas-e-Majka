/**
 * Masáže Majka — Gmail automation (staging).
 * Runs ONLY in the Google account of majahulmanova@gmail.com.
 * No public web endpoint is exposed in this file.
 * Timezone: Europe/Bratislava.
 */
const CONFIG = Object.freeze({
  owner: 'majahulmanova@gmail.com',
  zone: 'Europe/Bratislava',
  tab: 'Rezervacie',
  headers: ['id','createdAt','date','time','duration','service','priceEur','name','email','phone','note','status','paymentStatus','reminderSentAt','confirmationSentAt','cancelSentAt'],
  statuses: ['REQUESTED','CONFIRMED','CANCELLED'],
});

function setupMajka() {
  if (Session.getEffectiveUser().getEmail().toLowerCase() !== CONFIG.owner) {
    throw new Error('Spustite v Google účte Majky: ' + CONFIG.owner);
  }
  let id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.create('Masáže Majka – rezervácie');
  if (!id) PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());
  let sheet = ss.getSheetByName(CONFIG.tab);
  if (!sheet) sheet = ss.insertSheet(CONFIG.tab);
  if (sheet.getLastRow() === 0) sheet.appendRow(CONFIG.headers);
  sheet.setFrozenRows(1);
  const triggers = ScriptApp.getProjectTriggers();
  for (const t of triggers) {
    if (['sendTomorrowReminders','sendDailySummary'].includes(t.getHandlerFunction())) ScriptApp.deleteTrigger(t);
  }
  ScriptApp.newTrigger('sendTomorrowReminders').timeBased().everyDays(1).atHour(8).inTimezone(CONFIG.zone).create();
  // Google time-based triggers run approximately within the specified hour.
  ScriptApp.newTrigger('sendDailySummary').timeBased().everyDays(1).atHour(21).inTimezone(CONFIG.zone).create();
  Logger.log('Spreadsheet: ' + ss.getUrl());
}

function bookingSheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Najprv spustite setupMajka.');
  return SpreadsheetApp.openById(id).getSheetByName(CONFIG.tab);
}
function rows_() {
  const s=bookingSheet_(), values=s.getDataRange().getValues();
  return values.slice(1).filter(r=>r[0]).map((r,i)=>Object.fromEntries(CONFIG.headers.map((h,j)=>[h,r[j]]).concat([['_row',i+2]])));
}
function localDate_(value) {
  if (Object.prototype.toString.call(value)==='[object Date]') return Utilities.formatDate(value,CONFIG.zone,'yyyy-MM-dd');
  return String(value).slice(0,10);
}
function mail_(to, subject, body) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(to))) throw new Error('Neplatná e-mailová adresa');
  if (MailApp.getRemainingDailyQuota() < 1) throw new Error('Denný limit e-mailov je vyčerpaný');
  MailApp.sendEmail({to,subject,body,name:'Masáže Majka',replyTo:CONFIG.owner});
}
function details_(b) {
  return 'Masáž: '+b.service+'\nTermín: '+localDate_(b.date)+' o '+b.time+
    '\nTrvanie: '+b.duration+' min\nCena: '+b.priceEur+' €\nReferenčné číslo: '+b.id;
}
function valid_(b) {
  if(!b||!/^\d{4}-\d{2}-\d{2}$/.test(b.date)||!/^\d{2}:\d{2}$/.test(b.time)) throw new Error('Neplatný dátum alebo čas');
  if(![30,45,60,90].includes(Number(b.duration))) throw new Error('Neplatné trvanie');
  if(!b.name||!b.email||!b.service||!b.phone) throw new Error('Chýbajú údaje rezervácie');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) throw new Error('Neplatný e-mail');
  const d=new Date(b.date+'T12:00:00+01:00'), weekday=d.getUTCDay();
  if(weekday===0||weekday===6) throw new Error('Víkend nie je dostupný');
  const mins=Number(b.time.slice(0,2))*60+Number(b.time.slice(3));
  if(mins<9*60||mins+Number(b.duration)>17*60+30||mins%30!==0) throw new Error('Čas mimo pracovnej doby');
  const start=new Date();start.setHours(0,0,0,0);
  if(d<start) throw new Error('Minulý dátum');
}
function overlaps_(a,b) {
  const mins=t=>Number(t.slice(0,2))*60+Number(t.slice(3));
  return localDate_(a.date)===localDate_(b.date)&&mins(a.time)<mins(b.time)+Number(b.duration)&&mins(b.time)<mins(a.time)+Number(a.duration);
}
/** Internal/admin-only test entry. Do not expose directly as doPost without auth and spam protection. */
function createBookingInternal(b) {
  valid_(b);
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try {
    if(rows_().some(r=>r.status!=='CANCELLED'&&overlaps_(r,b))) throw new Error('Termín je obsadený');
    const id=Utilities.getUuid(), now=new Date().toISOString();
    bookingSheet_().appendRow([id,now,b.date,b.time,Number(b.duration),String(b.service).slice(0,120),Number(b.priceEur)||0,
      String(b.name).slice(0,100),String(b.email).slice(0,120),String(b.phone).slice(0,30),
      String(b.note||'').slice(0,500),'REQUESTED','UNPAID','','','']);
    return id;
  } finally {lock.releaseLock();}
}
function setCell_(row,key,val){bookingSheet_().getRange(row._row,CONFIG.headers.indexOf(key)+1).setValue(val);}
function confirmBookingInternal(id) {
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try {
    const b=rows_().find(r=>r.id===id);
    if(!b||b.status!=='REQUESTED') throw new Error('Rezervácia neexistuje alebo nemá stav REQUESTED');
    if(b.paymentStatus!=='PAID'&&b.paymentStatus!=='PAY_ON_SITE') throw new Error('Najprv overte platbu alebo povoľte platbu na mieste');
    if(rows_().some(r=>r.id!==id&&r.status==='CONFIRMED'&&overlaps_(r,b))) throw new Error('Termín bol obsadený');
    // Send first. On mail failure, reservation remains REQUESTED.
    mail_(b.email,'Potvrdenie rezervácie – Masáže Majka',
      'Dobrý deň,\n\npotvrdzujeme váš termín masáže.\n\n'+details_(b)+
      '\n\nAk potrebujete termín zmeniť, kontaktujte nás na '+CONFIG.owner+'.\n\nMasáže Majka');
    setCell_(b,'status','CONFIRMED');setCell_(b,'confirmationSentAt',new Date().toISOString());
    mail_(CONFIG.owner,'Nová potvrdená rezervácia – '+b.date+' '+b.time,
      'Zákazník: '+b.name+'\nE-mail: '+b.email+'\nTelefón: '+b.phone+'\n\n'+details_(b));
  } finally {lock.releaseLock();}
}
function cancelBookingInternal(id) {
  const lock=LockService.getScriptLock();lock.waitLock(20000);
  try {
    const b=rows_().find(r=>r.id===id);
    if(!b||b.status==='CANCELLED') throw new Error('Rezervácia nenájdená alebo už zrušená');
    setCell_(b,'status','CANCELLED');
    // Cancellation is recorded even if notification fails; next manual retry can use the log.
    mail_(b.email,'Zrušenie termínu – Masáže Majka',
      'Dobrý deň,\n\nváš termín bol zrušený.\n\n'+details_(b)+
      '\n\nAk bola zaplatená záloha, jej vysporiadanie sa riadi podmienkami rezervácie a platnými právnymi predpismi.\n\nMasáže Majka');
    setCell_(b,'cancelSentAt',new Date().toISOString());
    mail_(CONFIG.owner,'Zrušená rezervácia – '+b.date+' '+b.time,'Zrušenie: '+b.name+'\n'+details_(b));
  } finally {lock.releaseLock();}
}
function sendTomorrowReminders() {
  const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);
  const target=Utilities.formatDate(tomorrow,CONFIG.zone,'yyyy-MM-dd');
  for(const b of rows_()) {
    if(b.status!=='CONFIRMED'||localDate_(b.date)!==target||b.reminderSentAt) continue;
    mail_(b.email,'Pripomienka masáže zajtra – Masáže Majka',
      'Dobrý deň,\n\npripomíname vám zajtrajšiu masáž.\n\n'+details_(b)+
      '\n\nTešíme sa na vás!\nMasáže Majka');
    setCell_(b,'reminderSentAt',new Date().toISOString());
  }
}
function sendDailySummary() {
  const date=Utilities.formatDate(new Date(),CONFIG.zone,'yyyy-MM-dd');
  const items=rows_().filter(b=>localDate_(b.date)===date);
  const lines=items.map(b=>b.time+' | '+b.name+' | '+b.service+' | '+b.status+' | '+b.paymentStatus);
  const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);
  const next=Utilities.formatDate(tomorrow,CONFIG.zone,'yyyy-MM-dd');
  const nextCount=rows_().filter(b=>localDate_(b.date)===next&&b.status!=='CANCELLED').length;
  mail_(CONFIG.owner,'Denný prehľad rezervácií – '+date,
    'Masáže Majka – '+date+'\n\nDnešné termíny: '+items.length+'\n'+(lines.join('\n')||'Žiadne.')+
    '\n\nZajtrajšie aktívne termíny: '+nextCount+'\n\nAutomatický prehľad.');
}
/** Manual smoke test: creates a future REQUESTED booking, sends no client email. */
function testBookingInternal() {
  const d=new Date();d.setDate(d.getDate()+7);
  while([0,6].includes(d.getDay())) d.setDate(d.getDate()+1);
  const date=Utilities.formatDate(d,CONFIG.zone,'yyyy-MM-dd');
  const id=createBookingInternal({date,time:'09:00',duration:30,service:'TEST – klasická masáž',priceEur:20,
    name:'TEST REZERVÁCIA',email:CONFIG.owner,phone:'TEST',note:'Test – vymazať po kontrole'});
  Logger.log('Test booking id: '+id);
}
