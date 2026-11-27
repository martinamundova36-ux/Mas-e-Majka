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


})();
;(()=>{document.querySelectorAll('.article-share').forEach(box=>{const native=box.querySelector('.share-native'),copy=box.querySelector('.share-copy'),status=box.querySelector('.share-feedback');if(native)native.addEventListener('click',async()=>{const data={title:document.title,text:document.title,url:location.href};if(navigator.share){try{await navigator.share(data)}catch(e){if(e.name!=='AbortError')status.textContent=(document.documentElement.lang==='en'?'Sharing failed.':'Zdieľanie sa nepodarilo.')}}else{status.textContent=(document.documentElement.lang==='en'?'Use Copy link and paste it into your chosen app.':'Použite Kopírovať odkaz a vložte ho do Instagramu alebo inej aplikácie.')}});if(copy)copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);status.textContent=(document.documentElement.lang==='en'?'Link copied.':'Odkaz bol skopírovaný.')}catch(e){status.textContent=(document.documentElement.lang==='en'?'Copy the address from your browser address bar.':'Skopírujte odkaz z adresného riadka prehliadača.')}})})})();

;(()=>{const copy=document.getElementById('copyContact'),messenger=document.getElementById('shareMessenger'),status=document.getElementById('contactShareStatus');const card=document.documentElement.lang==='en'?'Masáže Majka – Mária Hulmanová\nPhone: +421 948 669 477\nEmail: majahulmanova@gmail.com\nAddress: Tomášikova 34, 821 01 Bratislava\nWeb: https://martinamundova36-ux.github.io/Mas-e-Majka/en/kontakt.html':'Masáže Majka – Mária Hulmanová\nTelefón: +421 948 669 477\nE-mail: majahulmanova@gmail.com\nAdresa: Tomášikova 34, 821 01 Bratislava\nWeb: https://martinamundova36-ux.github.io/Mas-e-Majka/kontakt.html';if(copy)copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(card);status.textContent=(document.documentElement.lang==='en'?'Contact details copied.':'Vizitka bola skopírovaná.')}catch(e){status.textContent=(document.documentElement.lang==='en'?'Copying failed.':'Kopírovanie sa nepodarilo.')}});if(messenger)messenger.addEventListener('click',async()=>{if(navigator.share){try{await navigator.share({title:'Masáže Majka – kontakt',text:card,url:location.href})}catch(e){if(e.name!=='AbortError')status.textContent=(document.documentElement.lang==='en'?'Sharing failed.':'Zdieľanie sa nepodarilo.')}}else{try{await navigator.clipboard.writeText(card);status.textContent=document.documentElement.lang==='en'?'Contact details copied. Paste them into Messenger.':'Vizitka bola skopírovaná. Vložte ju do Messengera.'}catch(e){status.textContent=document.documentElement.lang==='en'?'Use Copy contact details.':'Použite Kopírovať vizitku.'}}})})();

;(()=>{if(new URLSearchParams(location.search).get('lang')!=='en')return;document.querySelectorAll('a[href]').forEach(a=>{const h=a.getAttribute('href');if(!h||h.startsWith('#')||h.startsWith('mailto:')||h.startsWith('tel:')||h.startsWith('http')||h.startsWith('data:')||a.closest('.language-switch'))return;try{const u=new URL(h,location.href);if(u.origin===location.origin){u.searchParams.set('lang','en');a.href=u.href}}catch(e){}})})();



/* Accessible gallery lightbox for existing gallery photos */
;(()=>{if(!document.body.classList.contains('inner-luxury'))return;const imgs=[...document.querySelectorAll('.luxury-gallery .luxury-photo img')];if(!imgs.length)return;const overlay=document.createElement('div');overlay.className='gallery-lightbox';overlay.hidden=true;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',document.documentElement.lang==='en'?'Enlarged gallery photo':'Zväčšená fotografia');const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label',document.documentElement.lang==='en'?'Close photo':'Zavrieť fotografiu');const large=document.createElement('img');overlay.append(close,large);document.body.append(overlay);let previous=null;const hide=()=>{overlay.hidden=true;document.body.style.overflow='';large.removeAttribute('src');if(previous)previous.focus()};close.addEventListener('click',hide);overlay.addEventListener('click',e=>{if(e.target===overlay)hide()});document.addEventListener('keydown',e=>{if(overlay.hidden)return;if(e.key==='Escape')hide();if(e.key==='Tab'){e.preventDefault();close.focus()}});imgs.forEach(img=>{const trigger=document.createElement('button');trigger.type='button';trigger.className='gallery-lightbox-trigger';trigger.setAttribute('aria-label',(document.documentElement.lang==='en'?'Enlarge photo: ':'Zväčšiť fotografiu: ')+img.alt);img.parentNode.insertBefore(trigger,img);trigger.append(img);trigger.addEventListener('click',()=>{previous=trigger;large.src=img.src;large.alt=img.alt;overlay.hidden=false;document.body.style.overflow='hidden';close.focus()})})})();
