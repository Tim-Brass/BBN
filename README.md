# Meerjarenplanning – Brass Band Nuenen

Een webpagina met de meerjarenplanning van Brass Band Nuenen: repetities, concerten, projecten, voorbereidingstijd, schoolvakanties (regio zuid) en organisatieteams.

- **Website**: gehost via GitHub Pages (gratis).
- **Gegevens**: staan in een Google Sheet van de vereniging. De website leest en bewaart via een klein script (Google Apps Script).
- **Kijken** kan iedereen met de link (of met een leeswachtwoord, als je dat instelt). **Bewerken** kan alleen met het bewerkwachtwoord.
- Op het tabblad **Overzicht** in de Google Sheet staat altijd een leesbare lijst van alle evenementen.
- Nieuwe schoolvakanties worden elke maand automatisch opgehaald bij de open data van Rijksoverheid.

## Inrichten (eenmalig, ±10 minuten)

### 1. Google Sheet en script
1. Maak met het Google-account van de band een nieuwe, lege Google Sheet, bijvoorbeeld *BBN Meerjarenplanning*.
2. Kies in het menu **Extensies → Apps Script**.
3. Verwijder de voorbeeldcode en plak de volledige inhoud van [`apps-script/Code.gs`](apps-script/Code.gs).
4. Pas bovenaan **`BEWERK_WACHTWOORD`** aan, en eventueel `LEES_WACHTWOORD` als je de planning niet openbaar wilt maken. Klik op **Opslaan**.
5. Kies bovenin de functie **`installeer`** en klik op **Uitvoeren**. Geef toestemming als Google daarom vraagt (bij "Google heeft deze app niet geverifieerd": *Geavanceerd → Ga naar … (onveilig)*; dat is normaal voor je eigen script).
6. Klik rechtsboven op **Implementeren → Nieuwe implementatie**, kies type **Web-app** en stel in:
   - *Uitvoeren als*: **Ik**
   - *Wie heeft toegang*: **Iedereen**
7. Klik op **Implementeren** en kopieer de **URL van de web-app** (eindigt op `/exec`).

### 2. Website koppelen
1. Open in deze repository het bestand [`config.js`](config.js) en plak de URL tussen de aanhalingstekens bij `api`.
2. Ga naar **Settings → Pages**, kies bij *Source* **Deploy from a branch**, branch **main**, map **/ (root)**, en klik op **Save**.
3. Na een minuut staat de planning op `https://<gebruikersnaam>.github.io/<repository>/`.

### 3. Back-ups
De planning staat in de Google Sheet. Een eerdere stand terugzetten kan via **Bestand → Versiegeschiedenis** in de sheet.

## Later iets aanpassen aan het script?
Na elke wijziging in Apps Script: **Implementeren → Implementaties beheren → bewerken (potlood) → Versie: Nieuwe versie → Implementeren**. De URL blijft dan hetzelfde.

## Privacy
De gegevens staan niet in deze repository maar alleen in de Google Sheet. Iedereen met de link van de website kan de planning wel bekijken, tenzij je een `LEES_WACHTWOORD` instelt.
