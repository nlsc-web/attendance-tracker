const HEADERS = ['Date', 'Name', 'InTime', 'OutTime', 'Late', 'LateMinutes'];

function doGet() {
  const sheet = getSheet();
  const records = readRecords(sheet);
  return jsonOutput(records);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const data = JSON.parse(raw);
    const action = String(data.action || '').toLowerCase();
    const sheet = getSheet();

    if (action === 'checkin') {
      upsertCheckin(sheet, data);
    } else if (action === 'checkout') {
      upsertCheckout(sheet, data);
    } else {
      return jsonOutput({ error: 'Unknown action' });
    }

    return jsonOutput({ ok: true });
  } catch (err) {
    return jsonOutput({ error: String(err && err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

function getSheet() {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName('Punches');
  if (!sheet) sheet = ss.insertSheet('Punches');
  ensureHeaders(sheet);
  return sheet;
}

function ensureHeaders(sheet) {
  const range = sheet.getRange(1, 1, 1, HEADERS.length);
  const values = range.getValues()[0];
  if (String(values[0] || '') !== 'Date') {
    range.setValues([HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, sheet.getMaxRows(), 1).setNumberFormat('@');
  }
}

function readRecords(sheet) {
  const last = sheet.getLastRow();
  if (last < 2) return [];
  const rows = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  return rows
    .filter((row) => String(row[0] || '') && String(row[1] || ''))
    .map((row) => ({
      Date: cellDate(row[0]),
      Name: String(row[1] || ''),
      InTime: cellStr(row[2]),
      OutTime: cellStr(row[3]),
      Late: isTruthy(row[4]),
      LateMinutes: Number(row[5]) || 0
    }));
}

function upsertCheckin(sheet, data) {
  const date = String(data.date || '');
  const name = String(data.name || '');
  if (!date || !name) throw new Error('date and name are required');
  const inTime = String(data.inTime || '');
  const late = isTruthy(data.late);
  const lateMinutes = late ? (Number(data.lateMinutes) || 0) : 0;
  const row = findRow(sheet, date, name);
  if (row === -1) {
    sheet.appendRow([date, name, inTime, '', late, lateMinutes]);
    return;
  }
  sheet.getRange(row, 3, 1, 4).setValues([[inTime, sheet.getRange(row, 4).getValue() || '', late, lateMinutes]]);
}

function upsertCheckout(sheet, data) {
  const date = String(data.date || '');
  const name = String(data.name || '');
  if (!date || !name) throw new Error('date and name are required');
  const outTime = String(data.outTime || '');
  const row = findRow(sheet, date, name);
  if (row === -1) {
    sheet.appendRow([date, name, '', outTime, false, 0]);
    return;
  }
  sheet.getRange(row, 4).setValue(outTime);
}

function findRow(sheet, date, name) {
  const last = sheet.getLastRow();
  if (last < 2) return -1;
  const values = sheet.getRange(2, 1, last - 1, 2).getValues();
  for (let i = 0; i < values.length; i++) {
    if (cellDate(values[i][0]) === date && String(values[i][1] || '') === name) {
      return i + 2;
    }
  }
  return -1;
}

function cellDate(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(value || '').slice(0, 10);
}

function cellStr(value) {
  if (value == null) return '';
  return String(value);
}

function isTruthy(value) {
  if (value === true || value === 1) return true;
  const s = String(value || '').trim().toLowerCase();
  return s === 'true' || s === 'yes' || s === '1';
}

function jsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
