const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL || '';

const CREATE_SQL = `
  CREATE TABLE IF NOT EXISTS punches (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    name TEXT NOT NULL,
    "inTime" TEXT DEFAULT '',
    "outTime" TEXT DEFAULT '',
    late INTEGER DEFAULT 0,
    "lateMinutes" INTEGER DEFAULT 0,
    "updatedAt" TEXT
  )
`;

const UNIQUE_SQL = `CREATE UNIQUE INDEX IF NOT EXISTS punches_date_name ON punches(date, name)`;

const HIDDEN_STAFF_SQL = `CREATE TABLE IF NOT EXISTS hidden_staff (name TEXT PRIMARY KEY)`;

function rowToPunch(row) {
  if (!row) return null;
  return {
    id: row.id,
    date: row.date || '',
    name: row.name || '',
    inTime: row.inTime || '',
    outTime: row.outTime || '',
    late: Boolean(Number(row.late)),
    lateMinutes: Number(row.lateMinutes) || 0,
    updatedAt: row.updatedAt || ''
  };
}

function normalizePunch(p) {
  return {
    id: p.id,
    date: p.date || '',
    name: p.name || '',
    inTime: p.inTime || '',
    outTime: p.outTime || '',
    late: p.late ? 1 : 0,
    lateMinutes: Number(p.lateMinutes) || 0,
    updatedAt: p.updatedAt || new Date().toISOString()
  };
}

function createSqliteStore() {
  const { DatabaseSync } = require('node:sqlite');
  const DATA_DIR = process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.join(__dirname, 'data');
  const DB_FILE = path.join(DATA_DIR, 'tracker.db');

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log(`SQLite database: ${DB_FILE}`);

  const db = new DatabaseSync(DB_FILE);
  db.exec(CREATE_SQL.replace(/"inTime"/g, 'inTime').replace(/"outTime"/g, 'outTime').replace(/"lateMinutes"/g, 'lateMinutes').replace(/"updatedAt"/g, 'updatedAt'));
  db.exec(UNIQUE_SQL);
  db.exec(HIDDEN_STAFF_SQL);

  return {
    async getPunchesByDate(date) {
      return db
        .prepare('SELECT * FROM punches WHERE date = ? ORDER BY inTime DESC')
        .all(date)
        .map(rowToPunch);
    },
    async getPunchByDateName(date, name) {
      return rowToPunch(
        db.prepare('SELECT * FROM punches WHERE date = ? AND name = ?').get(date, name)
      );
    },
    async getPunchesByMonth(monthPrefix) {
      return db
        .prepare('SELECT * FROM punches WHERE date LIKE ? ORDER BY date ASC, name ASC')
        .all(`${monthPrefix}%`)
        .map(rowToPunch);
    },
    async getAllPunches() {
      return db
        .prepare('SELECT * FROM punches ORDER BY date ASC, name ASC')
        .all()
        .map(rowToPunch);
    },
    async getMonths() {
      return db
        .prepare("SELECT DISTINCT substr(date, 1, 7) AS month FROM punches WHERE date != '' ORDER BY month DESC")
        .all()
        .map((row) => row.month)
        .filter(Boolean);
    },
    async insertPunch(punch) {
      const p = normalizePunch(punch);
      db.prepare(`
        INSERT INTO punches
        (id, date, name, inTime, outTime, late, lateMinutes, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(p.id, p.date, p.name, p.inTime, p.outTime, p.late, p.lateMinutes, p.updatedAt);
      return rowToPunch(db.prepare('SELECT * FROM punches WHERE id = ?').get(p.id));
    },
    async updatePunch(punch) {
      const p = normalizePunch(punch);
      db.prepare(`
        UPDATE punches SET
          inTime = ?,
          outTime = ?,
          late = ?,
          lateMinutes = ?,
          updatedAt = ?
        WHERE id = ?
      `).run(p.inTime, p.outTime, p.late, p.lateMinutes, p.updatedAt, p.id);
      return rowToPunch(db.prepare('SELECT * FROM punches WHERE id = ?').get(p.id));
    },
    async health() {
      return { driver: 'sqlite', file: DB_FILE };
    },
    async listHiddenStaff() {
      return db.prepare('SELECT name FROM hidden_staff ORDER BY name').all().map((row) => row.name);
    },
    async hideStaff(name) {
      db.prepare('DELETE FROM hidden_staff WHERE lower(name) = lower(?)').run(name);
      db.prepare('INSERT INTO hidden_staff (name) VALUES (?)').run(name);
    },
    async unhideStaff(name) {
      db.prepare('DELETE FROM hidden_staff WHERE lower(name) = lower(?)').run(name);
    },
    async deletePunchesByDate(date) {
      const info = db.prepare('DELETE FROM punches WHERE date = ?').run(date);
      return Number(info.changes) || 0;
    },
    async deletePunchesBefore(date) {
      const info = db.prepare('DELETE FROM punches WHERE date < ?').run(date);
      return Number(info.changes) || 0;
    }
  };
}

async function createPostgresStore(connectionString) {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  console.log('Postgres database: DATABASE_URL');
  await pool.query(CREATE_SQL);
  await pool.query(UNIQUE_SQL);
  await pool.query(HIDDEN_STAFF_SQL);

  return {
    async getPunchesByDate(date) {
      const res = await pool.query(
        'SELECT * FROM punches WHERE date = $1 ORDER BY "inTime" DESC',
        [date]
      );
      return res.rows.map(rowToPunch);
    },
    async getPunchByDateName(date, name) {
      const res = await pool.query(
        'SELECT * FROM punches WHERE date = $1 AND name = $2',
        [date, name]
      );
      return rowToPunch(res.rows[0]);
    },
    async getPunchesByMonth(monthPrefix) {
      const res = await pool.query(
        'SELECT * FROM punches WHERE date LIKE $1 ORDER BY date ASC, name ASC',
        [`${monthPrefix}%`]
      );
      return res.rows.map(rowToPunch);
    },
    async getAllPunches() {
      const res = await pool.query(
        'SELECT * FROM punches ORDER BY date ASC, name ASC'
      );
      return res.rows.map(rowToPunch);
    },
    async getMonths() {
      const res = await pool.query(
        `SELECT DISTINCT substring(date from 1 for 7) AS month
         FROM punches
         WHERE date IS NOT NULL AND date != ''
         ORDER BY month DESC`
      );
      return res.rows.map((row) => row.month).filter(Boolean);
    },
    async insertPunch(punch) {
      const p = normalizePunch(punch);
      await pool.query(
        `INSERT INTO punches
          (id, date, name, "inTime", "outTime", late, "lateMinutes", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [p.id, p.date, p.name, p.inTime, p.outTime, p.late, p.lateMinutes, p.updatedAt]
      );
      const res = await pool.query('SELECT * FROM punches WHERE id = $1', [p.id]);
      return rowToPunch(res.rows[0]);
    },
    async updatePunch(punch) {
      const p = normalizePunch(punch);
      await pool.query(
        `UPDATE punches SET
          "inTime" = $1,
          "outTime" = $2,
          late = $3,
          "lateMinutes" = $4,
          "updatedAt" = $5
         WHERE id = $6`,
        [p.inTime, p.outTime, p.late, p.lateMinutes, p.updatedAt, p.id]
      );
      const res = await pool.query('SELECT * FROM punches WHERE id = $1', [p.id]);
      return rowToPunch(res.rows[0]);
    },
    async health() {
      await pool.query('SELECT 1');
      return { driver: 'postgres' };
    },
    async listHiddenStaff() {
      const res = await pool.query('SELECT name FROM hidden_staff ORDER BY name');
      return res.rows.map((row) => row.name);
    },
    async hideStaff(name) {
      await pool.query('DELETE FROM hidden_staff WHERE lower(name) = lower($1)', [name]);
      await pool.query('INSERT INTO hidden_staff (name) VALUES ($1)', [name]);
    },
    async unhideStaff(name) {
      await pool.query('DELETE FROM hidden_staff WHERE lower(name) = lower($1)', [name]);
    },
    async deletePunchesByDate(date) {
      const res = await pool.query('DELETE FROM punches WHERE date = $1', [date]);
      return Number(res.rowCount) || 0;
    },
    async deletePunchesBefore(date) {
      const res = await pool.query('DELETE FROM punches WHERE date < $1', [date]);
      return Number(res.rowCount) || 0;
    }
  };
}

let storePromise;

function getStore() {
  if (!storePromise) {
    storePromise = DATABASE_URL
      ? createPostgresStore(DATABASE_URL)
      : Promise.resolve(createSqliteStore());
  }
  return storePromise;
}

module.exports = {
  ready: () => getStore(),
  getPunchesByDate: async (date) => (await getStore()).getPunchesByDate(date),
  getPunchByDateName: async (date, name) => (await getStore()).getPunchByDateName(date, name),
  getPunchesByMonth: async (prefix) => (await getStore()).getPunchesByMonth(prefix),
  getAllPunches: async () => (await getStore()).getAllPunches(),
  getMonths: async () => (await getStore()).getMonths(),
  insertPunch: async (punch) => (await getStore()).insertPunch(punch),
  updatePunch: async (punch) => (await getStore()).updatePunch(punch),
  health: async () => (await getStore()).health(),
  listHiddenStaff: async () => (await getStore()).listHiddenStaff(),
  hideStaff: async (name) => (await getStore()).hideStaff(name),
  unhideStaff: async (name) => (await getStore()).unhideStaff(name),
  deletePunchesByDate: async (date) => (await getStore()).deletePunchesByDate(date),
  deletePunchesBefore: async (date) => (await getStore()).deletePunchesBefore(date)
};
