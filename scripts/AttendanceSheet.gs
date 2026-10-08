const DEFAULT_STAFF = [
  'Mrs.Nirmala', 'Ms.Kaushalya', 'Ms.Sajini', 'Mr.Denuwan', 'Mrs.Sumudu', 'Ms.Bhagya',
  'Ms.Dinithi', 'Ms.Tharusha', 'Ms.Dilini', 'Mr.Lahiru',
  'Mrs.Karthika', 'Mr.Rehan', 'Mr.Maliq', 'Mr.Dilan', 'Mr.Asjath', 'Mrs.Ruchira',
  'Ms.Miloshi', 'Mrs.Dilrukshi', 'Mr.Charith'
];
const PUNCH_HEADERS = ['Date', 'Name', 'InTime', 'OutTime', 'Late', 'Late by'];
const LATE_BG = '#F5D6CF';
const ON_TIME_BG = '#DCEEE4';
const OUT_BG = '#E8F1F8';

function doGet() {
  return jsonOutput({ ok: true, punches: readRecords(getPunchSheet()) });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const data = JSON.parse(raw);
    const action = String(data.action || '').toLowerCase();
    const names = Array.isArray(data.names) ? data.names : [];
    if (data.name) names.push(data.name);
    ensureStaff(names);

    if (action === 'checkin') {
      upsertCheckin(data);
      writeMonthTime(data.date, data.name, 'in', data.inTime, data.late);
    } else if (action === 'checkout') {
      upsertCheckout(data);
      writeMonthTime(data.date, data.name, 'out', data.outTime, false);
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

function getPunchSheet() {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName('Punches');
  if (!sheet) sheet = ss.insertSheet('Punches');
  ensureHeaders(sheet, PUNCH_HEADERS);
  return sheet;
}

function getStaffSheet() {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName('Staff');
  if (!sheet) {
    sheet = ss.insertSheet('Staff');
    sheet.getRange(1, 1).setValue('Name');
    sheet.getRange(2, 1, DEFAULT_STAFF.length, 1).setValues(DEFAULT_STAFF.map((n) => [n]));
  }
  return sheet;
}

function ensureStaff(names) {
  const sheet = getStaffSheet();
  const existing = getStaffNames();
  const seen = {};
  existing.forEach((n) => { seen[n] = true; });
  const add = [];
  names.forEach((raw) => {
    const name = String(raw || '').trim();
    if (name && !seen[name]) {
      seen[name] = true;
      add.push([name]);
    }
  });
  if (add.length) sheet.getRange(sheet.getLastRow() + 1, 1, add.length, 1).setValues(add);
}

function getStaffNames() {
  const sheet = getStaffSheet();
  const last = sheet.getLastRow();
  if (last < 2) return DEFAULT_STAFF.slice();
  return sheet.getRange(2, 1, last - 1, 1).getValues()
    .map((row) => String(row[0] || '').trim())
    .filter(Boolean);
}

function ensureHeaders(sheet, headers) {
  const range = sheet.getRange(1, 1, 1, headers.length);
  if (String(range.getValues()[0][0] || '') !== headers[0]) {
    range.setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, sheet.getMaxRows(), 1).setNumberFormat('@');
  }
}

function readRecords(sheet) {
  const last = sheet.getLastRow();
  if (last < 2) return [];
  return sheet.getRange(2, 1, last - 1, PUNCH_HEADERS.length).getValues()
    .filter((row) => String(row[0] || '') && String(row[1] || ''))
    .map((row) => ({
      Date: cellDate(row[0]),
      Name: String(row[1] || ''),
      InTime: cellStr(row[2]),
      OutTime: cellStr(row[3]),
      Late: isTruthy(row[4]),
      LateBy: cellStr(row[5])
    }));
}

function formatLate(minutes) {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  if (!total) return '';
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours && mins) return hours + 'h ' + mins + 'm';
  if (hours) return hours + 'h';
  return mins + 'm';
}

function upsertCheckin(data) {
  const sheet = getPunchSheet();
  const date = String(data.date || '');
  const name = String(data.name || '');
  if (!date || !name) throw new Error('date and name are required');
  const inTime = String(data.inTime || '');
  const late = isTruthy(data.late);
  const lateBy = late ? formatLate(data.lateMinutes) : '';
  const row = findRow(sheet, date, name);
  if (row === -1) {
    sheet.appendRow([date, name, inTime, '', late, lateBy]);
    return;
  }
  sheet.getRange(row, 3, 1, 4).setValues([[inTime, sheet.getRange(row, 4).getValue() || '', late, lateBy]]);
}

function upsertCheckout(data) {
  const sheet = getPunchSheet();
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

function writeMonthTime(dateStr, name, kind, time, late) {
  const date = String(dateStr || '');
  const person = String(name || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !person) return;
  const prefix = date.slice(0, 7);
  const day = Number(date.slice(8, 10));
  const sheet = getMonthSheet(prefix);
  const row = ensureNameRow(sheet, person);
  const inCol = 2 + (day - 1) * 2;
  const outCol = inCol + 1;
  const value = String(time || '').slice(0, 5);
  if (kind === 'in') {
    const cell = sheet.getRange(row, inCol);
    cell.setValue(value);
    cell.setHorizontalAlignment('center');
    if (isTruthy(late)) {
      cell.setBackground(LATE_BG).setFontColor('#7A2221').setFontWeight('bold');
    } else {
      cell.setBackground(ON_TIME_BG).setFontColor('#0A5640').setFontWeight('bold');
    }
  } else {
    const cell = sheet.getRange(row, outCol);
    cell.setValue(value);
    cell.setBackground(OUT_BG).setFontColor('#1B2430').setFontWeight('bold');
    cell.setHorizontalAlignment('center');
  }
}

function getMonthSheet(prefix) {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(prefix);
  if (!sheet) sheet = ss.insertSheet(prefix);
  const [year, month] = prefix.split('-').map(Number);
  const days = new Date(year, month, 0).getDate();
  if (String(sheet.getRange(3, 1).getValue() || '') !== 'Employee') {
    buildMonthHeaders(sheet, prefix, days);
    const staff = getStaffNames();
    if (staff.length) {
      sheet.getRange(4, 1, staff.length, 1).setValues(staff.map((n) => [n]));
    }
  }
  return sheet;
}

function buildMonthHeaders(sheet, prefix, days) {
  const lastCol = 1 + days * 2;
  sheet.clear();
  sheet.getRange(1, 1, 1, lastCol).merge();
  sheet.getRange(1, 1).setValue('Attendance — ' + prefix + '  (IN / OUT auto-update)')
    .setFontWeight('bold').setFontSize(14);
  sheet.getRange(2, 1, 2, 1).merge();
  sheet.getRange(2, 1).setValue('Employee').setFontWeight('bold');
  for (let day = 1; day <= days; day += 1) {
    const inCol = 2 + (day - 1) * 2;
    const outCol = inCol + 1;
    sheet.getRange(2, inCol, 1, 2).merge();
    sheet.getRange(2, inCol).setValue(day).setHorizontalAlignment('center').setFontWeight('bold');
    sheet.getRange(3, inCol).setValue('IN').setHorizontalAlignment('center').setBackground('#DCEEE4');
    sheet.getRange(3, outCol).setValue('OUT').setHorizontalAlignment('center').setBackground('#D6E3F0');
    sheet.setColumnWidth(inCol, 54);
    sheet.setColumnWidth(outCol, 54);
  }
  sheet.setFrozenRows(3);
  sheet.setFrozenColumns(1);
  sheet.setColumnWidth(1, 160);
}

function ensureNameRow(sheet, name) {
  const last = Math.max(sheet.getLastRow(), 3);
  if (last >= 4) {
    const values = sheet.getRange(4, 1, last - 3, 1).getValues();
    for (let i = 0; i < values.length; i += 1) {
      if (String(values[i][0] || '').trim() === name) return i + 4;
    }
  }
  const row = last + 1;
  sheet.getRange(row, 1).setValue(name);
  return row;
}

function findRow(sheet, date, name) {
  const last = sheet.getLastRow();
  if (last < 2) return -1;
  const values = sheet.getRange(2, 1, last - 1, 2).getValues();
  for (let i = 0; i < values.length; i += 1) {
    if (cellDate(values[i][0]) === date && String(values[i][1] || '') === name) return i + 2;
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
  return value == null ? '' : String(value);
}

function isTruthy(value) {
  if (value === true || value === 1) return true;
  const s = String(value || '').trim().toLowerCase();
  return s === 'true' || s === 'yes' || s === '1';
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
