const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const HEADER_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFECE7D9' }
};
const LATE_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF5D6CF' }
};
const ONTIME_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFDCEEE4' }
};
const IN_HEADER_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFDCEEE4' }
};
const OUT_HEADER_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFD6E3F0' }
};
const OUT_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFE8F1F8' }
};
const HEADER_FONT = { bold: true, color: { argb: 'FF1B2430' } };
const TITLE_FONT = { bold: true, size: 14, color: { argb: 'FF1B2430' } };

function dataDir() {
  const dir = process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.join(__dirname, 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function filePath() {
  return path.join(dataDir(), 'attendance.xlsx');
}

function syncCopyPath() {
  const extra = String(process.env.EXCEL_SYNC_PATH || '').trim();
  if (extra) return path.resolve(extra);
  return path.join(__dirname, 'StaffTrack-Attendance.xlsx');
}

async function saveWorkbook(wb, target) {
  const tmp = `${target}.${process.pid}.tmp`;
  await wb.xlsx.writeFile(tmp);
  try {
    fs.copyFileSync(tmp, target);
    fs.unlinkSync(tmp);
  } catch (err) {
    console.error('Excel file busy or locked. Latest copy:', tmp, err.message);
  }
  if (target === filePath()) {
    const extra = syncCopyPath();
    if (extra && extra !== target) {
      try {
        const source = fs.existsSync(target) ? target : tmp;
        if (fs.existsSync(source)) fs.copyFileSync(source, extra);
      } catch (err) {
        console.error('Excel sync copy failed:', err.message);
      }
    }
  }
  return fs.existsSync(target) ? target : tmp;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatLate(minutes) {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  if (!total) return '';
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours && mins) return `${hours}h ${mins}m`;
  if (hours) return `${hours}h`;
  return `${mins}m`;
}

function currentMonthPrefix() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit'
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get('year')}-${get('month')}`;
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function monthLabel(prefix) {
  const [year, month] = String(prefix).split('-').map(Number);
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function punchKey(date, name) {
  return `${date}|${name}`;
}

function timeHHMM(value) {
  return value ? String(value).slice(0, 5) : '';
}

function staffList(punches, names) {
  const listed = Array.isArray(names) ? names.slice() : [];
  const extra = [...new Set((punches || []).map((p) => p.name).filter(Boolean))]
    .filter((name) => !listed.includes(name))
    .sort((a, b) => a.localeCompare(b));
  return listed.concat(extra);
}

function monthPrefixes(punches) {
  const set = new Set();
  set.add(currentMonthPrefix());
  for (const punch of punches || []) {
    const prefix = String(punch.date || '').slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(prefix)) set.add(prefix);
  }
  return [...set].sort();
}

function styleHeaderRow(row) {
  row.font = HEADER_FONT;
  row.fill = HEADER_FILL;
  row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
}

function addMonthSheet(wb, prefix, punches, names) {
  const [year, month] = prefix.split('-').map(Number);
  const days = daysInMonth(year, month);
  const lookup = new Map();
  for (const punch of punches || []) {
    if (String(punch.date || '').startsWith(prefix)) {
      lookup.set(punchKey(punch.date, punch.name), punch);
    }
  }

  const ws = wb.addWorksheet(prefix, {
    views: [{ state: 'frozen', xSplit: 1, ySplit: 3 }]
  });

  const presentCol = 2 + days * 2;
  const lateCol = presentCol + 1;
  const lateMinCol = presentCol + 2;

  ws.mergeCells(1, 1, 1, lateMinCol);
  const title = ws.getCell(1, 1);
  title.value = `Attendance — ${monthLabel(prefix)}  (IN = Check in, OUT = Check out)`;
  title.font = TITLE_FONT;
  title.alignment = { vertical: 'middle' };
  ws.getRow(1).height = 22;

  ws.mergeCells(2, 1, 3, 1);
  ws.getCell(2, 1).value = 'Employee';
  ws.getCell(2, 1).font = HEADER_FONT;
  ws.getCell(2, 1).fill = HEADER_FILL;
  ws.getCell(2, 1).alignment = { vertical: 'middle', horizontal: 'left' };

  for (let day = 1; day <= days; day += 1) {
    const inCol = 2 + (day - 1) * 2;
    const outCol = inCol + 1;
    ws.mergeCells(2, inCol, 2, outCol);
    const dayCell = ws.getCell(2, inCol);
    dayCell.value = day;
    dayCell.font = HEADER_FONT;
    dayCell.fill = HEADER_FILL;
    dayCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(2, outCol).fill = HEADER_FILL;

    const inHead = ws.getCell(3, inCol);
    inHead.value = 'IN';
    inHead.font = { bold: true, color: { argb: 'FF0A5640' }, size: 9 };
    inHead.fill = IN_HEADER_FILL;
    inHead.alignment = { horizontal: 'center' };

    const outHead = ws.getCell(3, outCol);
    outHead.value = 'OUT';
    outHead.font = { bold: true, color: { argb: 'FF1B2430' }, size: 9 };
    outHead.fill = OUT_HEADER_FILL;
    outHead.alignment = { horizontal: 'center' };

    ws.getColumn(inCol).width = 9;
    ws.getColumn(outCol).width = 9;
  }

  for (const [col, label] of [[presentCol, 'Present'], [lateCol, 'Late'], [lateMinCol, 'Late by']]) {
    ws.mergeCells(2, col, 3, col);
    const cell = ws.getCell(2, col);
    cell.value = label;
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  }

  ws.getRow(2).height = 18;
  ws.getRow(3).height = 18;
  ws.getColumn(1).width = 24;
  ws.getColumn(presentCol).width = 11;
  ws.getColumn(lateCol).width = 10;
  ws.getColumn(lateMinCol).width = 12;

  staffList(punches, names).forEach((name, index) => {
    const rowNumber = 4 + index;
    const row = ws.getRow(rowNumber);
    row.getCell(1).value = name;
    row.getCell(1).font = { bold: true };

    let present = 0;
    let late = 0;
    let lateMinutes = 0;

    for (let day = 1; day <= days; day += 1) {
      const date = `${year}-${pad(month)}-${pad(day)}`;
      const punch = lookup.get(punchKey(date, name));
      const inCol = 2 + (day - 1) * 2;
      const outCol = inCol + 1;
      const inCell = row.getCell(inCol);
      const outCell = row.getCell(outCol);
      inCell.alignment = { horizontal: 'center', vertical: 'middle' };
      outCell.alignment = { horizontal: 'center', vertical: 'middle' };

      if (punch && punch.inTime) {
        inCell.value = timeHHMM(punch.inTime);
        present += 1;
        if (punch.late) {
          late += 1;
          lateMinutes += Number(punch.lateMinutes) || 0;
          inCell.fill = LATE_FILL;
          inCell.font = { color: { argb: 'FF7A2221' }, bold: true };
        } else {
          inCell.fill = ONTIME_FILL;
          inCell.font = { color: { argb: 'FF0A5640' }, bold: true };
        }
      }

      if (punch && punch.outTime) {
        outCell.value = timeHHMM(punch.outTime);
        outCell.fill = OUT_FILL;
        outCell.font = { color: { argb: 'FF1B2430' }, bold: true };
      }
    }

    row.getCell(presentCol).value = present;
    row.getCell(lateCol).value = late;
    row.getCell(lateMinCol).value = formatLate(lateMinutes);
    row.getCell(lateCol).font = late ? { color: { argb: 'FF7A2221' }, bold: true } : undefined;
  });
}

function summaryFilePath(prefix) {
  return path.join(dataDir(), `summary-${prefix}.xlsx`);
}

function summaryRowsForMonth(punches, names, prefix) {
  const monthPunches = (punches || []).filter((p) => String(p.date || '').startsWith(prefix) && p.inTime);
  return staffList(monthPunches, names).map((name) => {
    const mine = monthPunches.filter((p) => p.name === name);
    return {
      name,
      present: mine.length,
      late: mine.filter((p) => p.late).length,
      lateMinutes: mine.reduce((sum, p) => sum + (Number(p.lateMinutes) || 0), 0)
    };
  });
}

function addSummarySheet(wb, prefix, punches, names) {
  const rows = summaryRowsForMonth(punches, names, prefix);
  const ws = wb.addWorksheet(`${prefix} Summary`, { views: [{ state: 'frozen', ySplit: 3 }] });
  ws.getColumn(1).width = 26;
  ws.getColumn(2).width = 14;
  ws.getColumn(3).width = 12;
  ws.getColumn(4).width = 14;

  ws.mergeCells(1, 1, 1, 4);
  const title = ws.getCell(1, 1);
  title.value = `Monthly Summary — ${monthLabel(prefix)}`;
  title.font = TITLE_FONT;
  title.alignment = { vertical: 'middle' };
  ws.getRow(1).height = 24;

  const totals = rows.reduce((acc, row) => {
    acc.present += row.present;
    acc.late += row.late;
    acc.lateMinutes += row.lateMinutes;
    return acc;
  }, { present: 0, late: 0, lateMinutes: 0 });

  ws.mergeCells(2, 1, 2, 4);
  ws.getCell(2, 1).value = `Present days: ${totals.present}    Late days: ${totals.late}    Late by: ${formatLate(totals.lateMinutes) || '0m'}`;
  ws.getCell(2, 1).font = { color: { argb: 'FF4A4A46' } };
  ws.getRow(2).height = 18;

  ['Employee', 'Present', 'Late', 'Late by'].forEach((label, i) => {
    const cell = ws.getCell(3, i + 1);
    cell.value = label;
    cell.font = HEADER_FONT;
    cell.fill = HEADER_FILL;
    cell.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle' };
  });

  rows.forEach((row, index) => {
    const r = ws.getRow(4 + index);
    r.getCell(1).value = row.name;
    r.getCell(2).value = row.present;
    r.getCell(3).value = row.late;
    r.getCell(4).value = formatLate(row.lateMinutes);
    r.getCell(2).alignment = { horizontal: 'center' };
    r.getCell(3).alignment = { horizontal: 'center' };
    r.getCell(4).alignment = { horizontal: 'center' };
    if (row.late) {
      r.getCell(3).font = { color: { argb: 'FF7A2221' }, bold: true };
      r.getCell(4).font = { color: { argb: 'FF7A2221' } };
    }
  });

  const totalRow = ws.getRow(4 + rows.length);
  totalRow.font = { bold: true };
  totalRow.getCell(1).value = 'Total';
  totalRow.getCell(2).value = totals.present;
  totalRow.getCell(3).value = totals.late;
  totalRow.getCell(4).value = formatLate(totals.lateMinutes);
  totalRow.getCell(2).alignment = { horizontal: 'center' };
  totalRow.getCell(3).alignment = { horizontal: 'center' };
  totalRow.getCell(4).alignment = { horizontal: 'center' };
  totalRow.fill = HEADER_FILL;
}

async function writeMonthSummary(punches, names, prefix) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'StaffTrack';
  addSummarySheet(wb, prefix, punches, names);
  const target = summaryFilePath(prefix);
  await saveWorkbook(wb, target);
  return target;
}

function addLogSheet(wb, punches) {
  const ws = wb.addWorksheet('All Punches', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Name', key: 'name', width: 24 },
    { header: 'Check In', key: 'inTime', width: 12 },
    { header: 'Check Out', key: 'outTime', width: 12 },
    { header: 'Late', key: 'late', width: 10 },
    { header: 'Late by', key: 'lateMinutes', width: 12 }
  ];
  styleHeaderRow(ws.getRow(1));
  ws.getCell(1, 1).alignment = { horizontal: 'left' };

  const list = (punches || []).slice().sort((a, b) => {
    const dateCmp = String(a.date || '').localeCompare(String(b.date || ''));
    if (dateCmp) return dateCmp;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });

  for (const punch of list) {
    const row = ws.addRow({
      date: punch.date || '',
      name: punch.name || '',
      inTime: punch.inTime || '',
      outTime: punch.outTime || '',
      late: punch.late ? 'TRUE' : 'FALSE',
      lateMinutes: formatLate(punch.lateMinutes)
    });
    if (punch.late) {
      row.getCell(5).font = { color: { argb: 'FF7A2221' }, bold: true };
    }
  }
}

async function writePunches(punches, names) {
  const list = Array.isArray(punches) ? punches : [];
  const wb = new ExcelJS.Workbook();
  wb.creator = 'StaffTrack';
  wb.created = new Date();

  const prefixes = monthPrefixes(list);
  for (const prefix of prefixes) {
    addSummarySheet(wb, prefix, list, names);
  }
  for (const prefix of prefixes) {
    addMonthSheet(wb, prefix, list, names);
  }
  addLogSheet(wb, list);

  const target = await saveWorkbook(wb, filePath());
  for (const prefix of prefixes) {
    await writeMonthSummary(list, names, prefix);
  }
  return target;
}

let queue = Promise.resolve();

function rebuild(punches, names) {
  queue = queue
    .then(() => writePunches(punches, names))
    .catch((err) => {
      console.error('Excel write failed:', err.message);
    });
  return queue;
}

async function rebuildMonthSummary(punches, names, prefix) {
  const month = /^\d{4}-\d{2}$/.test(prefix) ? prefix : currentMonthPrefix();
  try {
    return await writeMonthSummary(punches, names, month);
  } catch (err) {
    console.error('Summary Excel write failed:', err.message);
    return null;
  }
}

module.exports = {
  filePath,
  summaryFilePath,
  currentMonthPrefix,
  rebuild,
  rebuildMonthSummary
};
