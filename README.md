# Attendance Tracker (StaffTrack)

Company attendance clock (Express + SQLite locally, Postgres in production).

Same server pattern as the [marketing tracker](https://marketing-tracker-0qiu.onrender.com/) and [accounts tracker](https://accounts-tracker-as1h.onrender.com/): one Node app on Render, Neon for lifetime data.

Live app: [https://attendance-tracker-d48e.onrender.com](https://attendance-tracker-d48e.onrender.com)

## Use on a laptop or kiosk (staff)

1. Open the **live URL** in Chrome (office PC, tablet, or phone).
2. Chrome menu → **Install StaffTrack** (or the install icon in the address bar). A desktop shortcut appears.
3. Select your name, then Check In or Check Out. Shift starts 8:30 AM. On time until 8:35 AM; late from 8:36 AM (Asia/Colombo).
4. **Download Excel** builds the workbook from the database (not from this laptop’s `data` folder).
5. Month end: **Monthly summary** → pick the month → **Download summary**.

Render’s free plan sleeps after idle time. The first open in the morning can take 30–60 seconds (same as the other trackers).

After go-live, do **not** treat `localhost:5700` or `data/tracker.db` as the real records.

To add a staff name, type it in the dropdown and choose **Add**. To remove one, use the delete button on the right of the name.

## Lifetime data (production)

Render free disk is temporary. Excel files on that disk can disappear on redeploy. Punches must live in Postgres:

1. Create a free Postgres DB at [Neon](https://neon.tech) (or Supabase).
2. Copy the connection string (`postgresql://...`).
3. In [Render Dashboard](https://dashboard.render.com) → this web service → **Environment**:
   - `DATABASE_URL` = that connection string
   - `SESSION_SECRET` = a long random string
4. Save → service redeploys. Empty DB auto-creates the `punches` table.

Excel is generated on download from Neon (`/api/export.xlsx` and `/api/export-summary.xlsx`).

## Deploy (same as marketing tracker)

1. This repo: `nlsc-web/attendance-tracker`.
2. Render → New Web Service from that GitHub repo (or Blueprint from `render.yaml`).
3. Set `DATABASE_URL` and `SESSION_SECRET` as above.
4. Health check: `/api/health`.
5. Paste the live URL at the top of this README.

## Excel layout

The downloaded workbook has:

- **YYYY-MM Summary** tabs first (Present, Late, Late minutes)
- Daily grid tabs with **IN** and **OUT** columns per day
- **All Punches** log

## Auto-update Excel / Google Sheet

Every check-in and check-out rewrites `data/attendance.xlsx` and `StaffTrack-Attendance.xlsx` with IN/OUT times.

For a live Google Sheet that updates by itself:

1. Create a Google Sheet.
2. Extensions → Apps Script → paste [scripts/AttendanceSheet.gs](scripts/AttendanceSheet.gs) → Save.
3. Deploy → New deployment → Web app. Execute as **Me**. Who has access: **Anyone**.
4. Copy the `/exec` URL.
5. Local: create `.env` with `SHEET_WEBAPP_URL=that-url` then restart `npm start`.
6. Production: add the same key in Render → Environment.

After that, each punch writes the time into the month tab (IN / OUT columns) and the Punches log.

## Run locally (development)

```bash
npm install
npm start
```

Open http://localhost:5700

Local mode uses SQLite in `data/tracker.db` (no `DATABASE_URL`). For the office kiosk, double-click `start-kiosk.bat` — it opens the live app at [https://attendance-tracker-d48e.onrender.com/](https://attendance-tracker-d48e.onrender.com/).
