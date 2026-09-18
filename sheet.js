const fs = require('fs');
const path = require('path');

loadDotEnv();

function loadDotEnv() {
  const file = path.join(__dirname, '.env');
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const i = trimmed.indexOf('=');
    if (i < 1) continue;
    const key = trimmed.slice(0, i).trim();
    let val = trimmed.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function sheetUrl() {
  return String(process.env.SHEET_WEBAPP_URL || '').trim();
}

function configured() {
  return Boolean(sheetUrl());
}

async function postJson(url, payload) {
  const body = JSON.stringify(payload);
  const headers = { 'Content-Type': 'text/plain;charset=utf-8' };
  const first = await fetch(url, {
    method: 'POST',
    headers,
    body,
    redirect: 'manual'
  });
  const loc = first.headers.get('location');
  if (loc && [301, 302, 303, 307, 308].includes(first.status)) {
    return fetch(loc, { method: 'POST', headers, body, redirect: 'follow' });
  }
  return first;
}

async function syncPunch(payload) {
  const url = sheetUrl();
  if (!url) return;
  try {
    const res = await postJson(url, payload);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('Sheet sync failed:', res.status, text.slice(0, 200));
    }
  } catch (err) {
    console.error('Sheet sync failed:', err.message);
  }
}

function syncCheckIn(punch) {
  return syncPunch({
    action: 'checkin',
    date: punch.date,
    name: punch.name,
    inTime: punch.inTime,
    late: Boolean(punch.late),
    lateMinutes: Number(punch.lateMinutes) || 0
  });
}

function syncCheckOut(punch) {
  return syncPunch({
    action: 'checkout',
    date: punch.date,
    name: punch.name,
    outTime: punch.outTime
  });
}

module.exports = {
  configured,
  syncCheckIn,
  syncCheckOut
};
