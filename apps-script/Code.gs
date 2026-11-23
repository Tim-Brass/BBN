/**
 * Brass Band Nuenen – Meerjarenplanning
 * Opslag voor de planner in deze Google Sheet.
 *
 * INSTELLEN (eenmalig):
 *  1. Pas hieronder de wachtwoorden aan.
 *  2. Kies bovenin de functie "installeer" en klik op Uitvoeren (geef toestemming).
 *  3. Implementeren > Nieuwe implementatie > Type: Web-app
 *       Uitvoeren als: Ik      Wie heeft toegang: Iedereen
 *     Kopieer de URL van de web-app naar config.js van de website.
 */

// Wachtwoord om te mogen BEWERKEN. Kies iets eigens en deel het alleen met wie mag bewerken.
const BEWERK_WACHTWOORD = 'verander-dit-wachtwoord';

// Wachtwoord om te mogen BEKIJKEN. Laat leeg ('') als iedereen met de link mag kijken.
const LEES_WACHTWOORD = '';

// ----------------------------------------------------------------------------

const DATA_SHEET = 'data';          // ruwe opslag (niet handmatig wijzigen)
const OVERZICHT_SHEET = 'Overzicht'; // leesbaar overzicht, wordt bij elke wijziging ververst
const CHUNK = 40000;                 // max. tekens per cel (Google-limiet is 50.000)

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (LEES_WACHTWOORD && p.key !== LEES_WACHTWOORD) return json_({ error: 'key' });
  const d = lees_();
  return json_({ version: d.version, state: d.state });
}

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ error: 'bad_request' }); }
  if (body.pw !== BEWERK_WACHTWOORD) return json_({ ok: false, error: 'auth' });
  if (body.action === 'check') return json_({ ok: true });
  if (body.action !== 'save' || !body.state || !Array.isArray(body.state.events)) return json_({ error: 'bad_request' });

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const cur = lees_();
    if (cur.version && Number(body.base) !== cur.version) {
      return json_({ ok: false, error: 'conflict', version: cur.version, state: cur.state });
    }
    const version = schrijf_(body.state);
    return json_({ ok: true, version: version });
  } finally {
    lock.releaseLock();
  }
}

/** Eenmalig uitvoeren: maakt de tabbladen aan en een maandelijkse controle op nieuwe schoolvakanties. */
function installeer() {
  sheet_(DATA_SHEET);
  sheet_(OVERZICHT_SHEET);
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'werkVakantiesBij')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('werkVakantiesBij').timeBased().onMonthDay(1).atHour(9).create();
  werkVakantiesBij();
}

/**
 * Haalt de schoolvakanties (regio zuid) op bij de open data van Rijksoverheid
 * en voegt alleen ontbrekende vakanties toe. Bestaande invoer blijft ongemoeid.
 */
function werkVakantiesBij() {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const cur = lees_();
    if (!cur.state) return; // nog geen planning opgeslagen
    const res = UrlFetchApp.fetch('https://opendata.rijksoverheid.nl/v1/infotypes/schoolholidays?output=json&rows=200', { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return;
    const data = JSON.parse(res.getContentText());
    const items = Array.isArray(data) ? data : [data];
    const namen = ['Herfstvakantie', 'Kerstvakantie', 'Voorjaarsvakantie', 'Meivakantie', 'Zomervakantie'];
    const vac = (cur.state.settings && cur.state.settings.vac) || [];
    const bekend = new Set(vac.map(v => v.n + '|' + v.a));
    let toegevoegd = 0;
    items.forEach(item => (item.content || []).forEach(c => (c.vacations || []).forEach(v => {
      const naam = String(v.type || '').trim();
      if (namen.indexOf(naam) < 0) return;
      const r = (v.regions || []).find(x => /zuid/i.test(x.region)) || (v.regions || []).find(x => /heel/i.test(x.region));
      if (!r) return;
      const a = dag_(r.startdate), b = dag_(r.enddate);
      if (!bekend.has(naam + '|' + a)) { vac.push({ n: naam, a: a, b: b }); bekend.add(naam + '|' + a); toegevoegd++; }
    })));
    if (toegevoegd) {
      vac.sort((x, y) => x.a < y.a ? -1 : 1);
      cur.state.settings = cur.state.settings || {};
      cur.state.settings.vac = vac;
      schrijf_(cur.state);
    }
    console.log('Schoolvakanties toegevoegd: ' + toegevoegd);
  } finally {
    lock.releaseLock();
  }
}

// ---------- intern ----------

function lees_() {
  const sh = sheet_(DATA_SHEET);
  const version = Number(sh.getRange('B1').getValue()) || 0;
  const n = sh.getLastRow();
  if (!n) return { version: 0, state: null };
  const txt = sh.getRange(1, 1, n, 1).getValues().map(r => r[0]).join('');
  return { version: version, state: txt ? JSON.parse(txt) : null };
}

function schrijf_(state) {
  const sh = sheet_(DATA_SHEET);
  const txt = JSON.stringify(state);
  const parts = [];
  for (let i = 0; i < txt.length; i += CHUNK) parts.push([txt.slice(i, i + CHUNK)]);
  sh.getRange('A:A').clearContent();
  sh.getRange(1, 1, parts.length, 1).setNumberFormat('@').setValues(parts);
  const version = Date.now();
  sh.getRange('B1').setValue(version);
  overzicht_(state);
  return version;
}

function overzicht_(state) {
  const sh = sheet_(OVERZICHT_SHEET);
  const ORG = { none: 'Nog geen team', forming: 'Team in vorming', ok: 'Team staat' };
  const SOORT = { concert: 'Concert', concours: 'Concours / NK', project: 'Project', evenement: 'Optreden / evenement', vereniging: 'Vereniging', nietmuz: 'Niet-muzikale activiteit', reces: 'Geen repetitie (reces)' };
  const HER = { '0': 'Eenmalig', '1': 'Elk jaar', '2': 'Om de 2 jaar', '3': 'Om de 3 jaar', '5': 'Om de 5 jaar' };
  const rows = [['Evenement', 'Soort', 'Datum (eerste keer)', 'Datum nog plannen', 'Herhaling', 'Voorbereiding (weken)', 'Organisatie', 'Aanspreekpunt', 'Teamleden', 'Notitie']];
  (state.events || []).slice().sort((a, b) => a.date < b.date ? -1 : 1).forEach(e => {
    let org = ORG[e.org] || '', contact = e.contact || '', team = e.team || '';
    if (Number(e.recur) > 0 && e.yr) {
      const ys = Object.keys(e.yr).sort();
      org = ys.map(y => y + ': ' + (ORG[e.yr[y].org] || '?')).join('\n');
      contact = ys.filter(y => e.yr[y].contact).map(y => y + ': ' + e.yr[y].contact).join('\n');
      team = ys.filter(y => e.yr[y].team).map(y => y + ': ' + e.yr[y].team).join('\n');
    }
    rows.push([e.name, SOORT[e.cat] || e.cat, e.unplanned ? 'nog in te plannen' + (e.wishYear ? ' (' + e.wishYear + ')' : '') : e.date, e.tbd ? 'ja' : '', HER[String(e.recur || 0)] || '', Number(e.prepWeeks) || 0, org, contact, team, e.note || '']);
  });
  sh.clearContents();
  sh.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  sh.getRange(1, 1, 1, rows[0].length).setFontWeight('bold').setBackground('#0076BE').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, 1).setNote('Dit tabblad wordt automatisch ververst. Wijzig de planning via de website.');
}

function sheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function dag_(iso) {
  return Utilities.formatDate(new Date(iso), 'Europe/Amsterdam', 'yyyy-MM-dd');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
