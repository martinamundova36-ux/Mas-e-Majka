# Masáže Majka – Gmail bridge (pripravené na autorizáciu)

**Jediná databáza rezervácií je Supabase.** Skript `Code.gs` nezapisuje rezervácie ani nevytvára druhú evidenciu.

## Čo je už hotové
- Supabase (Frankfurt) obsahuje služby, pracovný čas, blokácie a databázovú ochranu proti prekrytiu rezervácií.
- Funkcie `majka-availability` a `majka-create-booking` umožňujú termíny 365 dní dopredu.
- Verejný kalendár číta aktuálne voľné časy zo Supabase. Požiadavku však stále odosiela cez e-mail a netvári sa ako potvrdená rezervácia.
- `Code.gs` je pripravený na autorizované odosielanie Gmail správ podpísaným serverovým volaním.

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
