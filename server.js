const express = require('express');
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
  const cutoffSeconds = SHIFT_HOUR * 3600 + SHIFT_MIN * 60;
  const late = punchSeconds > cutoffSeconds;
  const lateMinutes = late ? Math.round((punchSeconds - cutoffSeconds) / 60) : 0;
  return { late, lateMinutes };
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
    db: dbHealth,
    sheet: sheet.configured(),
    excel: excel.filePath()
  });
}));

app.get('/api/users', (req, res) => {
  res.json(auth.publicUsers());
});

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

function staffNameFromBody(req) {
  const name = String((req.body || {}).name || '').trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 48) return null;
  if (!/^[\p{L}\p{M}0-9][\p{L}\p{M}0-9 .'-]*$/u.test(name)) return null;
  return name;
}

app.get('/api/punches', asyncHandler(async (req, res) => {
  const date = String(req.query.date || todayKey());
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
    await excel.rebuild(await db.getAllPunches(), auth.entryNames());
    await sheet.syncCheckIn(saved);
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
  await excel.rebuild(await db.getAllPunches(), auth.entryNames());
  await sheet.syncCheckOut(saved);
  res.json(saved);
}));

app.get('/api/summary', asyncHandler(async (req, res) => {
  const prefix = String(req.query.month || monthPrefix());
  const records = await db.getPunchesByMonth(prefix);
  const listed = auth.entryNames();
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

app.get('/api/export-summary.xlsx', asyncHandler(async (req, res) => {
  const requested = String(req.query.month || monthPrefix());
  const prefix = /^\d{4}-\d{2}$/.test(requested) ? requested : monthPrefix();
  const file = await excel.rebuildMonthSummary(
    await db.getAllPunches(),
    auth.entryNames(),
    prefix
  );
  if (!file) return res.status(500).json({ error: 'Could not build summary Excel' });
  res.download(file, `attendance-summary-${prefix}.xlsx`);
}));

app.get('/api/export.xlsx', asyncHandler(async (req, res) => {
  const file = await excel.rebuild(await db.getAllPunches(), auth.entryNames());
  if (!file) return res.status(500).json({ error: 'Could not build Excel file' });
  res.download(file, 'attendance.xlsx');
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
