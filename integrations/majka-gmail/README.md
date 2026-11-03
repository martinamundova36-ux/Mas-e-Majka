# Masáže Majka – pripravená automatizácia Gmailu (STAGING)

Tento priečinok je **pripravený na aktiváciu**, nie je nasadený ani prepojený s verejným rezervačným formulárom. Aktuálne GitHub Pages naďalej pripravuje e-mail pomocou `mailto:`. Zákazníkom sa nesmie zobrazovať automatické potvrdenie, kým sa neprejde akceptačným testom.

## Čo je pripravené

- `Code.gs` – evidovanie požiadaviek v súkromnej tabuľke Google Sheets, jedinečné ID rezervácie, kontrola kolízie termínov pod zámkom, stavy `REQUESTED / CONFIRMED / CANCELLED`.
- Potvrdzovací e-mail zákazníkovi **až po overení platby a potvrdení rezervácie**.
- Oznámenie Majke o potvrdení, e-mail pri zrušení, pripomienka deň pred masážou.
- Denný prehľad majke približne medzi 21:00 a 22:00 (Google Apps Script spúšťa časové triggery približne v určenej hodine, nie garantovane o 21:00:00).
- Kontrola pracovných dní, intervalov 30 minút a ukončenia masáže najneskôr o 17:30.
- Žiadne verejné API ani tajné kľúče na GitHub Pages.

## Aktivácia, keď bude Majka pri počítači

1. Majka sa prihlási do `majahulmanova@gmail.com`, otvorí https://script.google.com/home/start a vytvorí projekt `Masáže Majka – rezervácie`.
2. Do súboru `Code.gs` vloží obsah rovnomenného súboru z tohto priečinka.
3. V Project Settings nastaví časové pásmo `Europe/Bratislava` (ak je dostupné). Spustí `setupMajka` a v Google schváli potrebné oprávnenia.
4. V Execution log sa zobrazí URL súkromnej tabuľky. Majka skontroluje hlavičky a zdieľanie (tabuľka nemá byť verejná).
5. Spustí `testBookingInternal`. V tabuľke pribudne testovací riadok `REQUESTED`. Tento test sám zákazníkovi nič neodosiela.
6. Pri ďalšom kontrolovanom teste nastaví ručne v stĺpci `paymentStatus` hodnotu `PAY_ON_SITE` (iba test), zoberie `id` riadka a z editoru vyvolá `confirmBookingInternal(id)` cez dočasnú testovaciu funkciu. Overí prijatie správy.
7. Spustí `sendDailySummary` a `sendTomorrowReminders` v testovacom režime s výhradne vlastnou e-mailovou adresou. Skontroluje chybové logy a kvóty.
8. Testovacie rezervácie zruší alebo označí ako `CANCELLED` pred produkciou.

**Dôležité:** Bez účtu Majky nemôžeme udeliť Google oprávnenia, vytvoriť jej súkromnú tabuľku ani potvrdiť, že e-maily odchádzajú.

## Čo ešte chýba pred ostrým zapnutím

- Bezpečné serverové API medzi verejným formulárom a úložiskom – s ochranou proti botom, limitovaním požiadaviek, validáciou a kontrolou duplicitných rezervácií. **Nikdy nezverejniť Apps Script `doPost` s oprávnením odosielať e-maily bez ochrany.**
- Prepojenie so skutočným zoznamom voľných/obsadených termínov, aby zákazník nemohol vybrať obsadený interval.
- Majkin administračný proces na potvrdenie platby, rezervácie, zrušenie a evidenciu storna; dokumentovať účtovnú kontrolu.
- Platobné údaje/IBAN a QR platba až po dodaní a overení; zálohu 10 € nesľubovať ako uskutočnenú platbu.
- Rozhodnutie, či potvrdenie vyžaduje úspešne zaplatenú zálohu alebo explicitne schválenú platbu na mieste.
- GDPR: aktualizácia informačných povinností o Google Sheets/Apps Script, retenčnej lehote a prístupe k údajom; neposielať zdravotné údaje.
- Úplné integračné testy s testovacími adresami, časovou zónou, letným časom, výpadkami e-mailovej služby a opakovanými požiadavkami.

## Bezpečnostné pravidlá

- Heslo a Google OAuth token sa **nikdy** nevkladajú do verejného repozitára.
- Google Sheets s menami, telefónmi a e-mailmi zostáva v Majkinom účte a prístup je obmedzený.
- Neposielať automatické e-maily na adresy zákazníkov, kým sa nevyskúša izolované testovanie.
- Apps Script na bezplatnom Gmail účte má denný limit počtu príjemcov; pred spustením sledovať `MailApp.getRemainingDailyQuota()`.
- Zrušenie zálohy 10 € je právne citlivé; automatizácia nevyhlasuje každú zálohu za nevratnú a sporné prípady rieši Majka.

## Technické poznámky

Apps Script time-driven trigger môže spustiť proces s odchýlkou v rámci hodiny. V kóde sú termíny ukladané ako ISO `YYYY-MM-DD` a čas `HH:mm` v lokálnom kontexte Bratislavy. Automatické pripomienky sa odosielajú len pri stave `CONFIRMED`, raz na záznam podľa poľa `reminderSentAt`. Kontrola konfliktov je chránená `LockService`; plnohodnotný verejný backend musí túto kontrolu vykonávať transakčne aj pri viacerých súčasných návštevníkoch.

Aktuálny súbor slúži ako interný servis. Sám o sebe **nie je produkčným rezervačným backendom**.
