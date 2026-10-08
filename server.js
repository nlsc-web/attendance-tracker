const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('./db');
const auth = require('./auth');
const sheet = require('./sheet');
const excel = require('./excel');

const app = express();
const PORT = process.env.PORT || 5700;
const STATIC_DIR = path.join(__dirname, 'attendance department');
const TZ = 'Asia/Colombo';
const SHIFT_HOUR = 8;
const SHIFT_MIN = 30;
const START_DATE = '2026-10-08';
const LATE_HOUR = 8;
const LATE_MIN = 35;

app.use(express.json({ limit: '32kb' }));
app.use(express.static(STATIC_DIR, {
  setHeaders(res, filePath) {
    if (/\.(html|js|css|webmanifest)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function nowParts() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type).value;
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    second: Number(get('second'))
  };
}

function todayKey() {
  const n = nowParts();
  return `${n.year}-${pad(n.month)}-${pad(n.day)}`;
}

function timeLabel() {
  const n = nowParts();
  return `${pad(n.hour)}:${pad(n.minute)}:${pad(n.second)}`;
}

function monthPrefix() {
  const n = nowParts();
  return `${n.year}-${pad(n.month)}`;
}

function lateInfo(timeStr) {
  const [h, m, s] = String(timeStr).split(':').map((x) => Number(x) || 0);
  const punchSeconds = h * 3600 + m * 60 + s;
  const cutoffSeconds = LATE_HOUR * 3600 + LATE_MIN * 60;
  const late = punchSeconds > cutoffSeconds;
  const lateMinutes = late ? Math.round((punchSeconds - cutoffSeconds) / 60) : 0;
  return { late, lateMinutes };
}

function parseDateKey(raw) {
  const date = String(raw || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [year, month, day] = date.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function parseClockTime(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  const match = value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] || 0);
  if (hour > 23 || minute > 59 || second > 59) return null;
  return `${pad(hour)}:${pad(minute)}:${pad(second)}`;
}

function shiftDateKey(date, days) {
  const [year, month, day] = date.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return `${utc.getUTCFullYear()}-${pad(utc.getUTCMonth() + 1)}-${pad(utc.getUTCDate())}`;
}

function timeToSeconds(timeStr) {
  const [h, m, s] = String(timeStr).split(':').map((x) => Number(x) || 0);
  return h * 3600 + m * 60 + s;
}

async function afterPunch(saved, names, { inChanged, outChanged }) {
  await excel.rebuild(await db.getAllPunches(), names);
  if (inChanged) await sheet.syncCheckIn(saved, names);
  if (outChanged) await sheet.syncCheckOut(saved, names);
}

function newId() {
  return 'p' + Date.now() + Math.random().toString(36).slice(2, 7);
}

function isUniqueError(err) {
  const msg = String(err && err.message || '');
  return err && (err.code === '23505' || /UNIQUE constraint failed/i.test(msg));
}

app.get('/api/health', asyncHandler(async (req, res) => {
  const dbHealth = await db.health();
  res.json({
    ok: true,
    time: new Date().toISOString(),
    today: todayKey(),
    startDate: START_DATE,
    db: dbHealth,
    sheet: sheet.configured(),
    excel: excel.filePath()
  });
}));

app.get('/api/clock', (req, res) => {
  res.json({
    today: todayKey(),
    startDate: START_DATE,
    time: timeLabel()
  });
});

async function staffRoster() {
  const hidden = new Set(
    (await db.listHiddenStaff()).map((name) => String(name).toLowerCase())
  );
  const extra = await db.listExtraStaff();
  const seen = new Set();
  const users = [];
  for (const user of auth.publicUsers()) {
    const key = String(user.name).toLowerCase();
    if (hidden.has(key) || seen.has(key)) continue;
    seen.add(key);
    users.push(user);
  }
  extra
    .slice()
    .sort((a, b) => String(a).localeCompare(String(b)))
    .forEach((name) => {
      const key = String(name).toLowerCase();
      if (hidden.has(key) || seen.has(key)) return;
      seen.add(key);
      users.push({ name, role: 'entry' });
    });
  return users;
}

async function listedEntryNames() {
  return (await staffRoster())
    .filter((user) => user.role === 'entry')
    .map((user) => user.name);
}

app.get('/api/users', asyncHandler(async (req, res) => {
  res.json(await staffRoster());
}));

app.post('/api/users', asyncHandler(async (req, res) => {
  const name = staffNameFromBody(req);
  if (!name) return res.status(400).json({ error: 'Select a valid name.' });
  await db.unhideStaff(name);
  await db.addExtraStaff(name);
  res.json({ ok: true, name });
}));

app.delete('/api/users', asyncHandler(async (req, res) => {
  const name = staffNameFromBody(req);
  if (!name) return res.status(400).json({ error: 'Select a valid name.' });
  await db.removeExtraStaff(name);
  await db.hideStaff(name);
  res.json({ ok: true, name });
}));

app.get('/api/me', (req, res) => {
  const user = auth.readSession(req);
  if (!user) return res.status(401).json({ error: 'Login required' });
  res.json(user);
});

app.post('/api/login', asyncHandler(async (req, res) => {
  const name = String((req.body || {}).name || '').trim();
  const pin = String((req.body || {}).pin || '');
  if (!name || !pin) {
    return res.status(400).json({ error: 'Name and PIN are required' });
  }
  if (auth.tooManyFails(req, name)) {
    return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
  }
  const user = await auth.login(name, pin);
  if (!user) {
    auth.recordFail(req, name);
    return res.status(401).json({ error: 'Wrong PIN. Try again.' });
  }
  auth.clearFails(req, name);
  res.setHeader('Set-Cookie', auth.cookieHeader(auth.createSession(user)));
  res.json(user);
}));

app.post('/api/logout', (req, res) => {
  res.setHeader('Set-Cookie', auth.clearCookieHeader());
  res.json({ ok: true });
});

app.post('/api/correction/login', asyncHandler(async (req, res) => {
  const name = auth.correctorName();
  const pin = String((req.body || {}).pin || '');
  if (!pin) return res.status(400).json({ error: 'PIN is required' });
  if (auth.tooManyFails(req, name)) {
    return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
  }
  const user = await auth.login(name, pin);
  if (!user || !user.canCorrect) {
    auth.recordFail(req, name);
    return res.status(401).json({ error: 'Wrong PIN. Try again.' });
  }
  auth.clearFails(req, name);
  const ttl = auth.CORRECTION_TTL_MS;
  res.setHeader(
    'Set-Cookie',
    auth.cookieHeader(auth.createSession(user, ttl), ttl / 1000)
  );
  res.json(user);
}));

function staffNameFromBody(req) {
  const name = String((req.body || {}).name || (req.query || {}).name || '').trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 48) return null;
  if (!/^[\p{L}\p{M}0-9][\p{L}\p{M}0-9 .'-]*$/u.test(name)) return null;
  return name;
}

app.get('/api/punches', asyncHandler(async (req, res) => {
  const date = String(req.query.date || todayKey());
  if (date < START_DATE) return res.json([]);
  res.json(await db.getPunchesByDate(date));
}));

app.post('/api/punches/checkin', asyncHandler(async (req, res) => {
  const name = staffNameFromBody(req);
  if (!name) return res.status(400).json({ error: 'Select a valid name.' });
  const date = todayKey();
  const inTime = timeLabel();
  const existing = await db.getPunchByDateName(date, name);
  if (existing && existing.inTime) {
    return res.status(409).json({ error: 'Already checked in today.' });
  }

  const { late, lateMinutes } = lateInfo(inTime);
  const punch = {
    id: existing ? existing.id : newId(),
    date,
    name,
    inTime,
    outTime: existing ? existing.outTime : '',
    late,
    lateMinutes,
    updatedAt: new Date().toISOString()
  };

  try {
    const saved = existing
      ? await db.updatePunch(punch)
      : await db.insertPunch(punch);
    const names = await listedEntryNames();
    await afterPunch(saved, names, { inChanged: true, outChanged: false });
    res.status(existing ? 200 : 201).json(saved);
  } catch (err) {
    if (isUniqueError(err)) {
      return res.status(409).json({ error: 'Already checked in today.' });
    }
    throw err;
  }
}));

app.post('/api/punches/checkout', asyncHandler(async (req, res) => {
  const name = staffNameFromBody(req);
  if (!name) return res.status(400).json({ error: 'Select a valid name.' });
  const date = todayKey();
  const existing = await db.getPunchByDateName(date, name);
  if (!existing || !existing.inTime) {
    return res.status(409).json({ error: 'Check in first today.' });
  }
  if (existing.outTime) {
    return res.status(409).json({ error: 'Already checked out today.' });
  }

  const saved = await db.updatePunch({
    ...existing,
    outTime: timeLabel(),
    updatedAt: new Date().toISOString()
  });
  const names = await listedEntryNames();
  await afterPunch(saved, names, { inChanged: false, outChanged: true });
  res.json(saved);
}));

app.post('/api/punches/missed', auth.requireCorrect, asyncHandler(async (req, res) => {
  const name = staffNameFromBody(req);
  if (!name) return res.status(400).json({ error: 'Select a valid name.' });
  const date = parseDateKey((req.body || {}).date);
  if (!date) return res.status(400).json({ error: 'Pick a valid date.' });
  const today = todayKey();
  if (date > today) return res.status(400).json({ error: 'Cannot mark a future date.' });
  if (date < START_DATE) {
    return res.status(400).json({ error: 'Attendance starts from ' + START_DATE + '.' });
  }

  const inTime = parseClockTime((req.body || {}).inTime);
  const outTime = parseClockTime((req.body || {}).outTime);
  if (inTime === null) return res.status(400).json({ error: 'Enter a valid check-in time.' });
  if (outTime === null) return res.status(400).json({ error: 'Enter a valid check-out time.' });
  if (!inTime && !outTime) {
    return res.status(400).json({ error: 'Enter a check-in or check-out time.' });
  }
  if (inTime && outTime && timeToSeconds(outTime) < timeToSeconds(inTime)) {
    return res.status(400).json({ error: 'Check-out cannot be before check-in.' });
  }

  const existing = await db.getPunchByDateName(date, name);
  if (!existing && !inTime) {
    return res.status(400).json({ error: 'Enter the check-in time for that day.' });
  }
  if (
    existing &&
    existing.inTime &&
    inTime &&
    String(existing.inTime).slice(0, 5) !== String(inTime).slice(0, 5)
  ) {
    return res.status(409).json({ error: 'Already checked in that day.' });
  }
  if (existing && existing.outTime && outTime) {
    return res.status(409).json({ error: 'Already checked out that day.' });
  }

  const nextIn = (existing && existing.inTime) || inTime;
  const nextOut = outTime || (existing ? existing.outTime : '') || '';
  const { late, lateMinutes } = lateInfo(nextIn);
  const punch = {
    id: existing ? existing.id : newId(),
    date,
    name,
    inTime: nextIn,
    outTime: nextOut,
    late,
    lateMinutes,
    updatedAt: new Date().toISOString()
  };

  try {
    const saved = existing
      ? await db.updatePunch(punch)
      : await db.insertPunch(punch);
    const names = await listedEntryNames();
    await afterPunch(saved, names, {
      inChanged: !existing || !existing.inTime,
      outChanged: Boolean(outTime)
    });
    res.status(existing ? 200 : 201).json(saved);
  } catch (err) {
    if (isUniqueError(err)) {
      return res.status(409).json({ error: 'Already marked for that day.' });
    }
    throw err;
  }
}));

function punchIdFromParam(raw) {
  const id = String(raw || '').trim();
  if (!/^p[a-z0-9]+$/i.test(id)) return null;
  return id;
}

app.delete('/api/punches/item/:id', auth.requireCorrect, asyncHandler(async (req, res) => {
  const id = punchIdFromParam(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid punch.' });
  const existing = await db.getPunchById(id);
  if (!existing) return res.status(404).json({ error: 'Punch not found.' });
  if (existing.date < START_DATE) {
    return res.status(400).json({ error: 'Attendance starts from ' + START_DATE + '.' });
  }
  await db.deletePunchById(id);
  await excel.rebuild(await db.getAllPunches(), await listedEntryNames());
  res.json({ ok: true, id, name: existing.name, date: existing.date });
}));

app.post('/api/punches/item/:id/undo-out', auth.requireCorrect, asyncHandler(async (req, res) => {
  const id = punchIdFromParam(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid punch.' });
  const existing = await db.getPunchById(id);
  if (!existing) return res.status(404).json({ error: 'Punch not found.' });
  if (!existing.outTime) {
    return res.status(409).json({ error: 'No check-out to remove.' });
  }
  const saved = await db.updatePunch({
    ...existing,
    outTime: '',
    updatedAt: new Date().toISOString()
  });
  await excel.rebuild(await db.getAllPunches(), await listedEntryNames());
  res.json(saved);
}));

app.delete('/api/punches', auth.requireCorrect, asyncHandler(async (req, res) => {
  const date = parseDateKey(req.query.date || (req.body || {}).date);
  if (!date) return res.status(400).json({ error: 'Pick a valid date.' });
  if (date < START_DATE) {
    return res.status(400).json({ error: 'Attendance starts from ' + START_DATE + '.' });
  }
  const removed = await db.deletePunchesByDate(date);
  await excel.rebuild(await db.getAllPunches(), await listedEntryNames());
  res.json({ ok: true, date, removed });
}));

app.get('/api/summary', asyncHandler(async (req, res) => {
  const prefix = String(req.query.month || monthPrefix());
  const records = await db.getPunchesByMonth(prefix);
  const listed = await listedEntryNames();
  const extra = [...new Set(records.map((r) => r.name).filter(Boolean))]
    .filter((name) => !listed.includes(name))
    .sort((a, b) => a.localeCompare(b));
  const rows = listed.concat(extra).map((name) => {
    const mine = records.filter((r) => r.name === name && r.inTime);
    return {
      name,
      present: mine.length,
      late: mine.filter((r) => r.late).length,
      lateMinutes: mine.reduce((sum, r) => sum + (Number(r.lateMinutes) || 0), 0)
    };
  });
  res.json({ month: prefix, rows });
}));

app.get('/api/months', asyncHandler(async (req, res) => {
  const found = await db.getMonths();
  const current = monthPrefix();
  const months = [...new Set([current, ...found])].sort().reverse();
  res.json({ months, current });
}));

function sendExcel(res, file, filename) {
  if (!file || !fs.existsSync(file)) {
    return res.status(500).json({ error: 'Could not build Excel file' });
  }
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.download(file, filename);
}

app.get('/api/export-summary.xlsx', asyncHandler(async (req, res) => {
  const requested = String(req.query.month || monthPrefix());
  const prefix = /^\d{4}-\d{2}$/.test(requested) ? requested : monthPrefix();
  const file = await excel.rebuildMonthSummary(
    await db.getAllPunches(),
    await listedEntryNames(),
    prefix
  );
  sendExcel(res, file, `StaffTrack-summary-${prefix}.xlsx`);
}));

app.get('/api/export.xlsx', asyncHandler(async (req, res) => {
  const file = await excel.rebuild(await db.getAllPunches(), await listedEntryNames());
  sendExcel(res, file, `StaffTrack-${todayKey()}.xlsx`);
}));

app.get('*', (req, res) => {
  res.sendFile(path.join(STATIC_DIR, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

async function start() {
  await db.ready();
  const removed = await db.deletePunchesBefore(START_DATE);
  if (removed) console.log(`Cleared ${removed} punches before ${START_DATE}`);
  excel.rebuild(await db.getAllPunches(), await listedEntryNames()).catch((err) => {
    console.error('Initial Excel build failed:', err.message);
  });
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Attendance tracker running at http://localhost:${PORT}`);
    console.log(`Excel workbook: ${excel.filePath()}`);
    if (sheet.configured()) console.log('Google Sheet sync: on');
    else console.log('Google Sheet sync: off (set SHEET_WEBAPP_URL to enable)');
  });
}

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
