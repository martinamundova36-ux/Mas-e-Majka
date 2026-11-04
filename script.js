(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const en = document.documentElement.lang === 'en';
  const tr = (sk, english) => en ? english : sk;
  const locale = en ? 'en-GB' : 'sk-SK';
  if ($('year')) $('year').textContent = new Date().getFullYear();
  const menu = $('menuToggle'), nav = $('navigation');
  if (menu && nav) {
    const close = () => { nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); menu.textContent = '☰'; };
    menu.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menu.setAttribute('aria-expanded', String(open)); menu.textContent = open ? '✕' : '☰';
      menu.setAttribute('aria-label', open ? tr('Zavrieť menu', 'Close menu') : tr('Otvoriť menu', 'Open menu'));
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }
  document.querySelectorAll('[data-video]').forEach(button => button.addEventListener('click', () => {
    const frame = document.createElement('iframe');
    frame.src = 'https://www.youtube-nocookie.com/embed/' + button.dataset.video;
    frame.title = tr('Ukážka masážnej techniky – YouTube', 'Massage technique demonstration – YouTube');
    frame.allowFullscreen = true; frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.style.cssText = 'display:block;width:100%;height:100%;min-height:220px;border:0';
    button.closest('.video-consent').replaceWith(frame);
  }));
  document.querySelectorAll('a[data-service]').forEach(a => {
    const url = new URL(a.href); url.searchParams.set('service', a.dataset.service); a.href = url.href;
  });
  if ($('contactForm')) $('contactForm').addEventListener('submit', e => {
    e.preventDefault(); if (!e.currentTarget.reportValidity()) return;
    const body = tr('Meno: ', 'Name: ') + $('contactName').value.trim() + '\n' + tr('E-mail: ', 'Email: ') + $('contactEmail').value.trim() + '\n\n' + $('contactNote').value.trim();
    $('contactFormStatus').textContent = tr('Správu odošlite vo svojej e-mailovej aplikácii. Web nepotvrdzuje jej doručenie.', 'Send the message in your email app. This website cannot confirm delivery.');
    window.location.href = 'mailto:majahulmanova@gmail.com?subject=' + encodeURIComponent(tr('Otázka – Masáže Majka', 'Enquiry – Masáže Majka')) + '&body=' + encodeURIComponent(body);
  });
  if (!$('bookingForm')) return;
  const form = $('bookingForm'), service = $('service'), date = $('date'), time = $('time'), message = $('formMessage');
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => [d.getFullYear(), pad(d.getMonth()+1), pad(d.getDate())].join('-');
  const localToday = new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/Bratislava', year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const startDay = new Date(localToday + 'T00:00:00');
  // One calendar month, clamped at the last day of the following month.
  const maxDay = new Date(startDay.getFullYear(), startDay.getMonth()+2, 0);
  maxDay.setDate(Math.min(startDay.getDate(), maxDay.getDate()));
  date.min = fmt(startDay); date.max = fmt(maxDay);
  let viewYear = startDay.getFullYear(), viewMonth = startDay.getMonth(), version = 0, activeRequest;
  const duration = () => Number(service.value.match(/(\d+) min/)?.[1] || 30);
  const validDay = d => !Number.isNaN(d.getTime()) && d >= startDay && d <= maxDay && d.getDay() > 0 && d.getDay() < 6;
  function renderCalendar() {
    const days = $('calDays'); if (!days) return;
    days.replaceChildren(); $('calMonth').textContent = new Date(viewYear,viewMonth,1).toLocaleDateString(locale,{month:'long',year:'numeric'});
    for (let i=0; i<(new Date(viewYear,viewMonth,1).getDay()+6)%7; i++) { const empty=document.createElement('span'); empty.className='calendar-empty'; days.append(empty); }
    for (let n=1; n<=new Date(viewYear,viewMonth+1,0).getDate(); n++) {
      const d = new Date(viewYear,viewMonth,n), b=document.createElement('button');
      b.type='button'; b.textContent=n; b.disabled=!validDay(d);
      b.className='calendar-day'+(b.disabled?' unavailable':'')+(date.value===fmt(d)?' selected':'');
      b.setAttribute('aria-label',d.toLocaleDateString(locale,{weekday:'long',day:'numeric',month:'long',year:'numeric'}));
      b.setAttribute('aria-pressed',String(date.value===fmt(d)));
      b.addEventListener('click',()=>{date.value=fmt(d); $('chosenDate').textContent=' – '+d.toLocaleDateString(locale); renderCalendar(); refreshTimes();});
      days.append(b);
    }
    $('calPrev').disabled = viewYear===startDay.getFullYear() && viewMonth===startDay.getMonth();
    $('calNext').disabled = new Date(viewYear,viewMonth+1,1)>maxDay;
  }
  $('calPrev').addEventListener('click',()=>{const d=new Date(viewYear,viewMonth-1,1); viewYear=d.getFullYear();viewMonth=d.getMonth();renderCalendar();});
  $('calNext').addEventListener('click',()=>{const d=new Date(viewYear,viewMonth+1,1); viewYear=d.getFullYear();viewMonth=d.getMonth();renderCalendar();});
  async function refreshTimes() {
    const requestVersion=++version; activeRequest?.abort();
    time.replaceChildren(new Option(tr('Vyberte čas','Select time'),''));
    $('timeSlots').replaceChildren(); $('timeSummary').textContent='';
    if (!service.value || !date.value || !validDay(new Date(date.value+'T00:00:00'))) return;
    $('timeSummary').textContent=tr('Overujem voľné termíny…','Checking available times…');
    let verified=false, available=[];
    activeRequest=new AbortController(); const timer=setTimeout(()=>activeRequest.abort(),10000);
    try {
      const endpoint='https://zjwoqtyxsmafpfyobbgo.supabase.co/functions/v1/majka-availability?date='+encodeURIComponent(date.value)+'&service_id='+service.selectedOptions[0].dataset.serviceId;
      const response=await fetch(endpoint,{cache:'no-store',signal:activeRequest.signal});
      if(!response.ok) throw Error('Availability unavailable');
      const result=await response.json();
      if(!Array.isArray(result.slots))throw Error('Invalid availability');
      available=result.slots; verified=result.configured===true;
    } catch (_) { /* Request remains available as an explicitly unverified email enquiry. */ }
    finally { clearTimeout(timer); }
    if(requestVersion!==version)return;
    const minutes=duration();
    $('timeSummary').textContent=verified
      ? tr('Dostupnosť podľa online evidencie: sivé časy nie sú dostupné. E-mailová žiadosť čas neblokuje; termín potvrdí Majka.','Online availability: grey times are unavailable. An email request does not hold a slot; Majka confirms the appointment.')
      : tr('Dostupnosť sa nepodarilo overiť. Časy sú orientačné; dostupnosť musí potvrdiť Majka.','Availability could not be verified. Times are indicative; Majka must confirm availability.');
    for(let t=9*60;t+minutes<=17*60+30;t+=30){
      const label=pad(Math.floor(t/60))+':'+pad(t%60);
      const unavailable=verified&&!available.includes(label);
      const b=document.createElement('button');b.type='button';b.className='time-slot';b.textContent=label;b.disabled=unavailable;
      b.setAttribute('aria-pressed','false');b.setAttribute('aria-label',label+(unavailable?tr(' – nedostupné',' – unavailable'):''));
      if(!unavailable)time.add(new Option(label,label));
      b.addEventListener('click',()=>{time.value=label; document.querySelectorAll('.time-slot').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b));});
        $('timeSummary').textContent=tr('Vybraný čas: ','Selected time: ')+label+' – '+pad(Math.floor((t+minutes)/60))+':'+pad((t+minutes)%60)+' ('+minutes+' min). '+tr('Termín potvrdí Majka.','Majka must confirm the appointment.');});
      $('timeSlots').append(b);
    }
    if(verified&&!available.length)$('timeSummary').textContent=tr('Na tento dátum a masáž nie je v online evidencii voľný termín.','No available time for this date and treatment in the online schedule.');
  }
  function updatePayment(){
    const el=$('paymentSummary');if(!el)return;
    const price=Number(service.value.match(/(\d+) €/)?.[1]||0);
    const full=document.querySelector('input[name="paymentChoice"]:checked')?.value==='full';
    el.textContent=!price?tr('Vyberte masáž a zobrazí sa cena.','Select a treatment to see the price.'):
      full?tr('Celá cena: ','Full price: ')+price+' €.':tr('Záloha: 10 €. Doplatok na mieste: ','Deposit: €10. Balance at your appointment: €')+(price-10)+(en?'.':' €.');
  }
  service.addEventListener('change',()=>{refreshTimes();updatePayment();});
  date.addEventListener('change',()=>{renderCalendar();refreshTimes();});
  document.querySelectorAll('input[name="paymentChoice"]').forEach(r=>r.addEventListener('change',updatePayment));
  const requested=new URLSearchParams(location.search).get('service');
  const ids={klasicka:1,makke:5,bankovanie:6};
  if(ids[requested])service.selectedIndex=ids[requested];
  renderCalendar();refreshTimes();updatePayment();
  form.addEventListener('submit',e=>{
    e.preventDefault(); message.textContent='';
    if(!form.reportValidity())return;
    if(!date.value||!validDay(new Date(date.value+'T00:00:00'))){message.textContent=tr('Vyberte pracovný deň najviac mesiac dopredu.','Choose a weekday within the next month.');return;}
    if(!time.value){message.textContent=tr('Vyberte čas masáže.','Select a treatment time.');return;}
    const val=id=>$(id).value.trim();
    const body=[tr('Dobrý deň,','Hello,'),'',tr('chcem požiadať o termín masáže.','I would like to request a massage appointment.'),'',tr('Masáž: ','Treatment: ')+service.selectedOptions[0].textContent,tr('Dátum: ','Date: ')+val('date'),tr('Preferovaný čas: ','Preferred time: ')+val('time'),tr('Meno: ','Name: ')+val('name'),tr('Telefón: ','Phone: ')+val('phone'),tr('E-mail: ','Email: ')+val('email'),tr('Poznámka: ','Note: ')+(val('note')||'—'),'',tr('Prosím o potvrdenie dostupnosti termínu.','Please confirm whether this appointment is available.')].join('\n');
    message.textContent=tr('Otvára sa e-mailová aplikácia. Žiadosť sa odošle až po stlačení Odoslať v e-maile. Termín zatiaľ nie je rezervovaný ani potvrdený.','Opening your email app. Send the prepared email to submit your request. The appointment is not reserved or confirmed yet.');
    window.location.href='mailto:majahulmanova@gmail.com?subject='+encodeURIComponent(tr('Žiadosť o termín – Masáže Majka','Appointment request – Masáže Majka'))+'&body='+encodeURIComponent(body);
  });
})();
;(()=>{document.querySelectorAll('.article-share').forEach(box=>{const native=box.querySelector('.share-native'),copy=box.querySelector('.share-copy'),status=box.querySelector('.share-feedback');if(native)native.addEventListener('click',async()=>{const data={title:document.title,text:document.title,url:location.href};if(navigator.share){try{await navigator.share(data)}catch(e){if(e.name!=='AbortError')status.textContent=(document.documentElement.lang==='en'?'Sharing failed.':'Zdieľanie sa nepodarilo.')}}else{status.textContent=(document.documentElement.lang==='en'?'Use Copy link and paste it into your chosen app.':'Použite Kopírovať odkaz a vložte ho do Instagramu alebo inej aplikácie.')}});if(copy)copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);status.textContent=(document.documentElement.lang==='en'?'Link copied.':'Odkaz bol skopírovaný.')}catch(e){status.textContent=(document.documentElement.lang==='en'?'Copy the address from your browser address bar.':'Skopírujte odkaz z adresného riadka prehliadača.')}})})})();

;(()=>{const copy=document.getElementById('copyContact'),messenger=document.getElementById('shareMessenger'),status=document.getElementById('contactShareStatus');const card='Masáže Majka – Mária Hulmanová\nTelefón: +421 948 669 477\nE-mail: majahulmanova@gmail.com\nAdresa: Tomášikova 34, 821 01 Bratislava\nWeb: https://martinamundova36-ux.github.io/Mas-e-Majka/kontakt.html';if(copy)copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(card);status.textContent=(document.documentElement.lang==='en'?'Contact details copied.':'Vizitka bola skopírovaná.')}catch(e){status.textContent=(document.documentElement.lang==='en'?'Copying failed.':'Kopírovanie sa nepodarilo.')}});if(messenger)messenger.addEventListener('click',async()=>{if(navigator.share){try{await navigator.share({title:'Masáže Majka – kontakt',text:card,url:location.href})}catch(e){if(e.name!=='AbortError')status.textContent=(document.documentElement.lang==='en'?'Sharing failed.':'Zdieľanie sa nepodarilo.')}}else{try{await navigator.clipboard.writeText(card);status.textContent=document.documentElement.lang==='en'?'Contact details copied. Paste them into Messenger.':'Vizitka bola skopírovaná. Vložte ju do Messengera.'}catch(e){status.textContent=document.documentElement.lang==='en'?'Use Copy contact details.':'Použite Kopírovať vizitku.'}}})})();

;(()=>{if(new URLSearchParams(location.search).get('lang')!=='en')return;document.querySelectorAll('a[href]').forEach(a=>{const h=a.getAttribute('href');if(!h||h.startsWith('#')||h.startsWith('mailto:')||h.startsWith('tel:')||h.startsWith('http')||h.startsWith('data:')||a.closest('.language-switch'))return;try{const u=new URL(h,location.href);if(u.origin===location.origin){u.searchParams.set('lang','en');a.href=u.href}}catch(e){}})})();

;(()=>{const b=document.getElementById('shareBookingMessenger');if(!b)return;const status=document.getElementById('shareBookingStatus');const url='https://martinamundova36-ux.github.io/Mas-e-Majka/rezervacia.html';b.addEventListener('click',async()=>{if(navigator.share){try{await navigator.share({title:'Masáže Majka – rezervácie',text:'Vyberte si termín masáže Masáže Majka',url});return}catch(e){if(e.name==='AbortError')return}}try{await navigator.clipboard.writeText(url);status.textContent=(document.documentElement.lang==='en'?'Link copied. Paste it into a Messenger message.':'Odkaz bol skopírovaný. Vložte ho do správy v Messengeri.')}catch(e){status.textContent=(document.documentElement.lang==='en'?'Link to share: ':'Odkaz na zdieľanie: ')+url}})})();


/* Accessible gallery lightbox for existing gallery photos */
;(()=>{if(!document.body.classList.contains('inner-luxury'))return;const imgs=[...document.querySelectorAll('.luxury-gallery .luxury-photo img')];if(!imgs.length)return;const overlay=document.createElement('div');overlay.className='gallery-lightbox';overlay.hidden=true;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',document.documentElement.lang==='en'?'Enlarged gallery photo':'Zväčšená fotografia');const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label',document.documentElement.lang==='en'?'Close photo':'Zavrieť fotografiu');const large=document.createElement('img');overlay.append(close,large);document.body.append(overlay);let previous=null;const hide=()=>{overlay.hidden=true;document.body.style.overflow='';large.removeAttribute('src');if(previous)previous.focus()};close.addEventListener('click',hide);overlay.addEventListener('click',e=>{if(e.target===overlay)hide()});document.addEventListener('keydown',e=>{if(overlay.hidden)return;if(e.key==='Escape')hide();if(e.key==='Tab'){e.preventDefault();close.focus()}});imgs.forEach(img=>{const trigger=document.createElement('button');trigger.type='button';trigger.className='gallery-lightbox-trigger';trigger.setAttribute('aria-label',(document.documentElement.lang==='en'?'Enlarge photo: ':'Zväčšiť fotografiu: ')+img.alt);img.parentNode.insertBefore(trigger,img);trigger.append(img);trigger.addEventListener('click',()=>{previous=trigger;large.src=img.currentSrc||img.src;large.alt=img.alt;overlay.hidden=false;document.body.style.overflow='hidden';close.focus()})})})();
