(function () {
  const EMPLOYEES = [
    'Mrs.Nirmala', 'Ms.Kaushalya', 'Ms.Sajini', 'Mr.Denuwan', 'Mrs.Sumudu', 'Ms.Bhagya',
    'Ms.Dinithi', 'Ms.Tharusha', 'Ms.Ayeshka', 'Ms.Minoshi', 'Ms.Dilini', 'Mr.Lahiru',
    'Mrs.Karthika', 'Mr.Rehan', 'Mr.Maliq', 'Mr.Dilan', 'Mr.Asjath', 'Mrs.Ruchira',
    'Mr.Rukshan', 'Ms.Miloshi', 'Mrs.Dilrukshi', 'Mr.Charith'
  ];

  const employeeSelect = document.getElementById('employeeSelect');
  const checkInBtn = document.getElementById('checkInBtn');
  const checkOutBtn = document.getElementById('checkOutBtn');
  const statusLine = document.getElementById('statusLine');
  const feedList = document.getElementById('feedList');
  const feedCount = document.getElementById('feedCount');
  const summaryBody = document.getElementById('summaryBody');
  const summaryMonth = document.getElementById('summaryMonth');
  const summaryStats = document.getElementById('summaryStats');
  const summaryMonthSelect = document.getElementById('summaryMonthSelect');
  const summaryDownload = document.getElementById('summaryDownload');
  const clockTime = document.getElementById('clockTime');
  const clockDate = document.getElementById('clockDate');
  const combo = document.getElementById('employeeCombo');
  const comboTrigger = document.getElementById('comboTrigger');
  const comboMenu = document.getElementById('comboMenu');
  const comboSearch = document.getElementById('comboSearch');
  const comboList = document.getElementById('comboList');
  const selectedAvatar = document.getElementById('selectedAvatar');
  const comboBackdrop = document.getElementById('comboBackdrop');
  const comboChevron = document.getElementById('comboChevron');

  let employeeNames = EMPLOYEES.slice();
  let highlightIndex = 0;

  function pad(n) { return n.toString().padStart(2, '0'); }
  function timeLabel(d) { return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function initials(name) {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function avatarHue(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    return hash % 360;
  }

  function avatarStyle(name) {
    const hue = avatarHue(name);
    return `background: linear-gradient(180deg, hsl(${hue} 42% 46%), hsl(${hue} 48% 32%))`;
  }

  function normalizeName(raw) {
    return String(raw || '').trim().replace(/\s+/g, ' ');
  }

  function isValidName(name) {
    return name.length >= 2 && name.length <= 48 && /^[\p{L}\p{M}0-9][\p{L}\p{M}0-9 .'-]*$/u.test(name);
  }

  function matchingNames() {
    const query = normalizeName(comboSearch.value).toLowerCase();
    if (!query) return employeeNames.slice();
    return employeeNames.filter((name) => name.toLowerCase().includes(query));
  }

  function customTypedName() {
    const typed = normalizeName(comboSearch.value);
    if (!isValidName(typed)) return '';
    const exists = employeeNames.some((name) => name.toLowerCase() === typed.toLowerCase());
    return exists ? '' : typed;
  }

  function comboItems() {
    const custom = customTypedName();
    const matches = matchingNames();
    const items = [];
    if (custom) items.push({ name: custom, isNew: true });
    matches.forEach((name) => items.push({ name, isNew: false }));
    return items;
  }

  function pickFromQuery() {
    const items = comboItems();
    return (items[highlightIndex] || items[0] || {}).name || null;
  }

  function rememberName(name) {
    if (employeeNames.some((item) => item.toLowerCase() === name.toLowerCase())) return;
    employeeNames.push(name);
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    employeeSelect.appendChild(opt);
  }

  function chooseName(name) {
    const clean = normalizeName(name);
    if (!isValidName(clean)) return false;
    rememberName(clean);
    employeeSelect.value = clean;
    comboSearch.value = clean;
    syncTrigger();
    setComboOpen(false);
    return true;
  }

  function setComboOpen(open) {
    comboMenu.hidden = !open;
    if (comboBackdrop) comboBackdrop.hidden = !open;
    comboTrigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.classList.toggle('combo-open', open);
    if (open) {
      renderComboList();
      comboSearch.focus();
    }
  }

  function syncTrigger() {
    const name = employeeSelect.value || '';
    comboTrigger.classList.toggle('is-placeholder', !name);
    if (name) {
      selectedAvatar.hidden = false;
      selectedAvatar.textContent = initials(name);
      selectedAvatar.style.cssText = avatarStyle(name);
      if (document.activeElement !== comboSearch) comboSearch.value = name;
    } else {
      selectedAvatar.hidden = true;
      selectedAvatar.textContent = '?';
      selectedAvatar.style.cssText = '';
      if (document.activeElement !== comboSearch) comboSearch.value = '';
    }
  }

  function renderComboList() {
    const selected = employeeSelect.value;
    const items = comboItems();
    if (!items.length) {
      highlightIndex = 0;
      comboList.innerHTML = '<div class="combo-empty">Type a name, then press Enter.</div>';
      return;
    }
    if (highlightIndex >= items.length) highlightIndex = 0;
    if (highlightIndex < 0) highlightIndex = items.length - 1;
    comboList.innerHTML = items.map((item, index) => `
      <button type="button" class="combo-option${index === highlightIndex ? ' is-active' : ''}${item.isNew ? ' is-new' : ''}" role="option" data-name="${escapeHtml(item.name)}" aria-selected="${item.name === selected}">
        <span class="avatar" style="${avatarStyle(item.name)}">${item.isNew ? '+' : escapeHtml(initials(item.name))}</span>
        <span>${item.isNew ? 'Add <strong>' + escapeHtml(item.name) + '</strong>' : escapeHtml(item.name)}</span>
      </button>
    `).join('');
  }

  function fillEmployees(names) {
    const incoming = Array.isArray(names) && names.length ? names.slice() : EMPLOYEES.slice();
    const extras = employeeNames.filter((name) => !incoming.some((item) => item.toLowerCase() === name.toLowerCase()));
    const list = incoming.concat(extras);
    employeeNames = list;
    const current = employeeSelect.value;
    employeeSelect.innerHTML = '';
    const blank = document.createElement('option');
    blank.value = '';
    blank.textContent = 'Select name';
    employeeSelect.appendChild(blank);
    list.forEach((name) => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      employeeSelect.appendChild(opt);
    });
    employeeSelect.value = current && list.includes(current) ? current : '';
    syncTrigger();
    renderComboList();
  }

  fillEmployees(EMPLOYEES);

  function tickClock() {
    const now = new Date();
    const [hh, mm, ss] = timeLabel(now).split(':');
    clockTime.innerHTML = `${hh}<span class="colon">:</span>${mm}<span class="colon">:</span>${ss}`;
    clockDate.textContent = now.toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }
  tickClock();
  setInterval(tickClock, 1000);

  async function apiGet(path) {
    const res = await fetch(path, { credentials: 'include' });
    if (!res.ok) throw new Error('Request failed');
    return res.json();
  }

  async function apiPost(path, payload) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || 'Request failed');
      err.status = res.status;
      throw err;
    }
    return data;
  }

  function renderFeed(records) {
    const todays = Array.isArray(records) ? records.slice() : [];
    todays.sort((a, b) => String(a.inTime || '').localeCompare(String(b.inTime || '')) * -1);
    feedCount.textContent = String(todays.length);
    if (!todays.length) {
      feedList.innerHTML = '<div class="empty-note">No punches yet today.</div>';
      return;
    }
    feedList.innerHTML = todays.map((r) => `
      <div class="ticket ${r.late ? 'late-ticket' : ''}">
        <div class="ticket-main">
          <span class="avatar" style="${avatarStyle(r.name)}">${escapeHtml(initials(r.name))}</span>
          <div>
            <div class="ticket-name">${escapeHtml(r.name)}</div>
            <div class="ticket-meta">IN ${escapeHtml(r.inTime || '-')}${r.outTime ? '  ·  OUT ' + escapeHtml(r.outTime) : ''}</div>
          </div>
        </div>
        <div class="ticket-badge ${r.late ? 'late' : ''}">${r.late ? (Number(r.lateMinutes) || 0) + ' min late' : 'On time'}</div>
      </div>
    `).join('');
  }

  function monthLabel(value) {
    if (!value || !/^\d{4}-\d{2}$/.test(value)) return 'This month';
    const [year, month] = value.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }

  function setSummaryDownload(month) {
    const prefix = month || '';
    if (summaryDownload) {
      summaryDownload.href = '/api/export-summary.xlsx' + (prefix ? ('?month=' + encodeURIComponent(prefix)) : '');
    }
  }

  function fillMonthSelect(months, current) {
    if (!summaryMonthSelect) return;
    const list = Array.isArray(months) && months.length ? months : [current].filter(Boolean);
    const selected = summaryMonthSelect.value || current || list[0];
    summaryMonthSelect.innerHTML = '';
    list.forEach((month) => {
      const opt = document.createElement('option');
      opt.value = month;
      opt.textContent = monthLabel(month);
      summaryMonthSelect.appendChild(opt);
    });
    if (selected && list.includes(selected)) summaryMonthSelect.value = selected;
    else if (current && list.includes(current)) summaryMonthSelect.value = current;
    setSummaryDownload(summaryMonthSelect.value);
  }

  async function loadSummary(month) {
    const query = month ? ('?month=' + encodeURIComponent(month)) : '';
    renderSummary(await apiGet('/api/summary' + query));
    setSummaryDownload(month || (summaryMonthSelect && summaryMonthSelect.value) || '');
  }

  function renderSummary(data) {
    const rows = (data && data.rows) || [];
    if (summaryMonth) summaryMonth.textContent = monthLabel(data && data.month);
    if (data && data.month && summaryMonthSelect && !summaryMonthSelect.value) {
      summaryMonthSelect.value = data.month;
    }
    const present = rows.reduce((sum, row) => sum + (Number(row.present) || 0), 0);
    const late = rows.reduce((sum, row) => sum + (Number(row.late) || 0), 0);
    const lateMinutes = rows.reduce((sum, row) => sum + (Number(row.lateMinutes) || 0), 0);
    summaryStats.innerHTML = `
      <div class="kpi"><span>Check-ins</span><strong>${present}</strong></div>
      <div class="kpi warn"><span>Late arrivals</span><strong>${late}</strong></div>
      <div class="kpi"><span>Late minutes</span><strong>${lateMinutes}</strong></div>
    `;
    if (!rows.length) {
      summaryBody.innerHTML = '<tr><td colspan="4">No summary data yet.</td></tr>';
      return;
    }
    summaryBody.innerHTML = rows.map((r) => `
      <tr>
        <td>${escapeHtml(r.name)}</td>
        <td class="num">${Number(r.present) || 0}</td>
        <td class="num late-num">${Number(r.late) || 0}</td>
        <td class="num">${Number(r.lateMinutes) || 0}</td>
      </tr>
    `).join('');
  }

  async function refreshFeed() {
    try {
      const records = await apiGet('/api/punches');
      renderFeed(records);
    } catch (e) {
      feedCount.textContent = '0';
      feedList.innerHTML = '<div class="empty-note">Could not load punches.</div>';
    }
  }

  async function withBusy(button, fn) {
    const buttons = [checkInBtn, checkOutBtn];
    buttons.forEach((btn) => { btn.disabled = true; });
    button.classList.add('is-busy');
    try {
      await fn();
    } finally {
      buttons.forEach((btn) => { btn.disabled = false; });
      button.classList.remove('is-busy');
    }
  }

  function clearSelection() {
    employeeSelect.value = '';
    comboSearch.value = '';
    syncTrigger();
  }

  function selectedName() {
    return employeeSelect.value || pickFromQuery() || '';
  }

  async function handleCheckIn() {
    const name = selectedName();
    if (!name) { statusLine.textContent = 'Select your name first.'; return; }
    if (employeeSelect.value !== name) chooseName(name);
    await withBusy(checkInBtn, async () => {
      try {
        const saved = await apiPost('/api/punches/checkin', { name });
        statusLine.textContent = saved.late
          ? `Checked in — ${saved.lateMinutes} min late.`
          : 'Checked in on time.';
        statusLine.className = 'status-line ' + (saved.late ? 'late' : 'ontime');
        clearSelection();
        refreshFeed();
      } catch (e) {
        statusLine.textContent = e.message || 'Could not check in.';
        statusLine.className = 'status-line late';
      }
    });
  }

  async function handleCheckOut() {
    const name = selectedName();
    if (!name) { statusLine.textContent = 'Select your name first.'; return; }
    if (employeeSelect.value !== name) chooseName(name);
    await withBusy(checkOutBtn, async () => {
      try {
        const saved = await apiPost('/api/punches/checkout', { name });
        statusLine.textContent = `Checked out at ${saved.outTime}.`;
        statusLine.className = 'status-line ontime';
        clearSelection();
        refreshFeed();
      } catch (e) {
        statusLine.textContent = e.message || 'Could not check out.';
        statusLine.className = 'status-line late';
      }
    });
  }

  checkInBtn.addEventListener('click', handleCheckIn);
  checkOutBtn.addEventListener('click', handleCheckOut);

  comboSearch.addEventListener('focus', () => setComboOpen(true));
  comboSearch.addEventListener('input', () => {
    highlightIndex = 0;
    employeeSelect.value = '';
    setComboOpen(true);
    renderComboList();
    syncTrigger();
  });
  comboSearch.addEventListener('keydown', (event) => {
    const items = comboItems();
    if (event.key === 'Enter') {
      event.preventDefault();
      const name = pickFromQuery();
      if (name) chooseName(name);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setComboOpen(true);
      highlightIndex += 1;
      if (highlightIndex >= items.length) highlightIndex = 0;
      renderComboList();
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setComboOpen(true);
      highlightIndex -= 1;
      if (highlightIndex < 0) highlightIndex = Math.max(items.length - 1, 0);
      renderComboList();
    }
  });
  if (comboChevron) {
    comboChevron.addEventListener('click', () => {
      setComboOpen(comboMenu.hidden);
      if (!comboMenu.hidden) comboSearch.focus();
    });
  }
  if (comboBackdrop) {
    comboBackdrop.addEventListener('click', () => setComboOpen(false));
  }
  comboList.addEventListener('click', (event) => {
    const option = event.target.closest('.combo-option');
    if (!option) return;
    chooseName(option.dataset.name);
  });
  document.addEventListener('click', (event) => {
    if (!combo.contains(event.target)) setComboOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setComboOpen(false);
  });

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach((item) => {
        const on = item === btn;
        item.classList.toggle('active', on);
        item.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      document.getElementById('checkinPanel').classList.toggle('is-hidden', tab !== 'checkin');
      document.getElementById('summaryPanel').classList.toggle('is-hidden', tab !== 'summary');
      if (tab === 'summary') {
        try {
          const monthData = await apiGet('/api/months');
          fillMonthSelect(monthData.months, monthData.current);
          await loadSummary(summaryMonthSelect.value || monthData.current);
        } catch (e) {
          summaryStats.innerHTML = '';
          summaryBody.innerHTML = '<tr><td colspan="4">Could not load summary.</td></tr>';
        }
      }
    });
  });

  (async function start() {
    try {
      const users = await apiGet('/api/users');
      const names = (users || [])
        .filter((u) => u.role === 'entry')
        .map((u) => u.name);
      fillEmployees(names);
    } catch (e) {
      fillEmployees(EMPLOYEES);
    }
    refreshFeed();
  })();

  if (summaryMonthSelect) {
    summaryMonthSelect.addEventListener('change', async () => {
      try {
        await loadSummary(summaryMonthSelect.value);
      } catch (e) {
        summaryBody.innerHTML = '<tr><td colspan="4">Could not load summary.</td></tr>';
      }
    });
  }
})();
