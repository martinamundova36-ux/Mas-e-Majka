# Nasadzovací plán – Masáže Majka

## Zistený skutočný stav k 3. 11. 2026

Supabase projekt `Masaze-Majka` (Frankfurt, `eu-central-1`) **už existuje**. Obsahuje:
- `majka_services` – 7 služieb s cenami;
- `majka_working_hours` – pondelok až piatok 08:00–17:30;
- `majka_bookings` – rezervácie s databázovou blokáciou kolidujúcich aktívnych intervalov;
- `majka_blocked_times` – blokované časy;
- `majka_email_notifications` – front e-mailových udalostí;
- `majka_report_settings` – denný report pre Majku, zatiaľ vypnutý;
- `majka_request_limits` – priestor pre limity.

Nasadené Edge Functions: `majka-availability` a `majka-create-booking`.
Druhá funkcia má bezpečnostnú poistku `MAJKA_BOOKING_NOTIFICATIONS_READY !== true`, ktorá odmietne rezerváciu, pokiaľ e-mailový proces nie je pripravený.

Databázové tabuľky majú zapnuté RLS bez verejných politík. Verejný klient **nesmie** obsahovať servisný kľúč. Vytváranie rezervácií patrí výhradne serverovej funkcii.

## Záväzná architektúra

- **Zdroj pravdy je Supabase**, nie tabuľka Google Sheets.
- Google Apps Script bude po autorizácii pod účtom Majky slúžiť ako **odosielateľ Gmail správ**; plánovanie reportov zostáva úlohou serverového scheduleru.
- `Code.gs` z tejto zložky je interný izolovaný prototyp na otestovanie Gmail oprávnení a šablón, NIE druhá produkčná evidencia! Pred nasadením treba nahradiť jeho `bookingSheet_` čítanie bezpečným načítaním správ zo Supabase. Dve databázy rezervácií sú zakázané.
- Gmail nesmie dostať údaje o rezerváciách bez overeného serverového spojenia. Žiadne servisné tokeny ani tajomstvá v GitHube alebo v JS klienta.
- `booking-supabase-staging.js` je pripravený adaptér, ktorý **nie je** načítaný na webe; `ready:false` musí ostať až do úspešných testov.

## Pred zapnutím dokončiť

1. Majka autorizuje Google Apps Script zo svojho vlastného účtu.
2. Implementovať overený server-to-server most medzi Supabase frontom e-mailov a Gmail Apps Script, s rotovateľným tajomstvom v chránených nastaveniach a idempotentným odoslaním.
3. Zabezpečiť notifikáciu Majke pre každú novú požiadavku, potvrdenie zákazníkovi po schválení/úhrade, zrušenie a pripomienky.
4. Zaviesť rozumnú ochranu verejného formulára pred automatickými požiadavkami (Turnstile a rate limit), platnú aj pre požiadavky bez hlavičky Origin.
5. Dokončiť administračné potvrdenie platby a spracovanie storna; neaktivovať QR platby bez IBAN.
6. Zjednotiť horizont termínov. Web aj Supabase funkcie už povoľujú 365 dní. Otestovať okrajové dni a prestupný rok.
7. Upraviť používateľské rozhranie na serverovú dostupnosť; pri chybe ukázať bezpečný fallback, nikdy neoznačiť rezerváciu za potvrdenú bez odpovede backendu.
8. Overiť GDPR a slovenské storno podmienky, potom urobiť end-to-end testy, až následne povoliť funkciu.

## Overené bezpečnostné nastavenia

- RLS na siedmich tabuľkách;
- žiadne verejné role `anon` / `authenticated` s priamymi oprávneniami k týmto tabuľkám;
- GiST exclusion constraint zamedzuje prekrývaniu `pending` a `confirmed` rezervácií;
- poznámka: database advisor upozorňuje na `btree_gist` extension v public schéme, vhodné riešiť oddelene.

Toto je **staging checklist**. Nie je to potvrdenie ostrého spustenia.
