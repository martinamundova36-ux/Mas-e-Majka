# Masáže Majka – Gmail bridge (test Martina → ostrá prevádzka Majka)

**Jediná databáza rezervácií je Supabase.** Skript `Code.gs` nezapisuje rezervácie ani nevytvára druhú evidenciu.

## Čo je už hotové
- Supabase (Frankfurt) obsahuje služby, pracovný čas, blokácie a databázovú ochranu proti prekrytiu rezervácií.
- Funkcie `majka-availability` a `majka-create-booking` umožňujú termíny 365 dní dopredu.
- Verejný kalendár číta aktuálne voľné časy zo Supabase. Požiadavku však stále odosiela cez e-mail a netvári sa ako potvrdená rezervácia.
- `Code.gs` umožňuje otestovať Gmail odosielanie z účtu Martiny. Pri tomto teste sa posiela iba na jej vlastný e-mail, bez skutočných zákazníckych údajov. Ostrú prevádzku neskôr autorizuje Majka zo svojho Google účtu.

## Teraz: bezpečný test z Martininho Gmailu
1. Prihláste sa do `martinamundova36@gmail.com` a otvorte https://script.google.com/home/start.
2. Vytvorte nový Apps Script projekt `Masáže Majka – TEST Martina` a vložte celý obsah súboru `Code.gs`.
3. V zozname funkcií vyberte **`sendMajkaTestEmail`** a kliknite **Run / Spustiť**. Google požiada Martinu o povolenie odosielania e-mailov; musí ho odsúhlasiť sama.
4. Overte, že na `martinamundova36@gmail.com` prišiel e-mail **TEST – Masáže Majka · e-mailové upozornenie**. Obsahuje iba fiktívne testovacie údaje.
5. **Zatiaľ nenasadzujte Web App** ani nenastavujte ostré odosielanie. Týmto krokom sa testuje samotná autorizácia a Gmail doručenie, nie automatické potvrdzovanie rezervácií.
6. Keď príde Majka, vytvorí si samostatný Apps Script projekt z rovnakého súboru pod `majahulmanova@gmail.com`; Martinino testovacie nasadenie nesmie odosielať zákaznícke správy.

## Keď príde Majka
1. Prihlásiť sa do `majahulmanova@gmail.com` a otvoriť https://script.google.com/home/start.
2. Vytvoriť projekt `Masáže Majka – e-maily` a vložiť obsah `Code.gs`.
3. V `Project Settings → Script Properties` uložiť náhodné bezpečné tajomstvo `MAJKA_SHARED_SECRET` (min. 32 znakov), ktoré sa NIKDY nezapíše do verejného kódu. Rovnaké tajomstvo musí byť neskôr uložené medzi chránenými tajomstvami Supabase servera.
4. Spustiť `setupMajkaMailer`, povoliť oprávnenia a potom `sendMajkaTestEmail`. Overiť testovací e-mail v schránke.
5. Až keď je pripravený a otestovaný podpísaný serverový dispečer a limitovanie požiadaviek, nasadiť Apps Script ako Web App. URL uložiť medzi serverové tajomstvá Supabase; nikdy do klientského JS.
6. Testovať odoslanie, duplicity, výpadky a odpovede `ok:false`. Google Apps Script pri chybe aplikácie nemusí vrátiť HTTP chybový status, preto kontrolovať JSON.
7. Nakoniec dokončiť potvrdenie platieb, admin rozhranie, front e-mailových udalostí a až potom povoliť ostré online rezervácie.

Majka nemusí posielať heslo ani API kľúč do chatu. Bez jej prihlásenia nemožno odosielanie aktivovať.

**Nenasadzovať `Code.gs` verejne, kým chýba podpísaná serverová integrácia a testy.**
