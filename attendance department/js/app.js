(function () {
  const EMPLOYEES = [
    'Mrs.Nirmala', 'Ms.Kaushalya', 'Ms.Sajini', 'Mr.Denuwan', 'Mrs.Sumudu', 'Ms.Bhagya',
    'Ms.Dinithi', 'Ms.Tharusha', 'Ms.Dilini', 'Mr.Lahiru',
    'Mrs.Karthika', 'Mr.Rehan', 'Mr.Maliq', 'Mr.Dilan', 'Mr.Asjath', 'Mrs.Ruchira',
    'Ms.Miloshi', 'Mrs.Dilrukshi', 'Mr.Charith'
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
  const excelDownload = document.getElementById('excelDownload');
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
  const correctionLock = document.getElementById('correctionLock');
  const correctionLogin = document.getElementById('correctionLogin');
  const correctionPin = document.getElementById('correctionPin');
  const correctionLoginBtn = document.getElementById('correctionLoginBtn');
  const correctionLogout = document.getElementById('correctionLogout');
  const correctionWho = document.getElementById('correctionWho');
  const missedPanel = document.getElementById('missedPanel');
  const missedDate = document.getElementById('missedDate');
  const missedIn = document.getElementById('missedIn');
  const missedOut = document.getElementById('missedOut');
  const missedSaveBtn = document.getElementById('missedSaveBtn');
  const missedClearBtn = document.getElementById('missedClearBtn');
  const missingDate = document.getElementById('missingDate');
  const missingTitle = document.getElementById('missingTitle');
  const missingInCount = document.getElementById('missingInCount');
  const missingOutCount = document.getElementById('missingOutCount');
  const missingInList = document.getElementById('missingInList');
  const missingOutList = document.getElementById('missingOutList');

  let employeeNames = EMPLOYEES.slice();
  let highlightIndex = 0;
  let clockToday = localDateKey(new Date());
  let clockStart = '2026-10-08';
  let officeUnlocked = false;
  let lastFeedRecords = [];

  function pad(n) { return n.toString().padStart(2, '0'); }
  function localDateKey(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  function setupMissedDates() {
    if (!missedDate) return;
    missedDate.max = clockToday;
    missedDate.min = clockStart;
    if (!missedDate.value || missedDate.value < clockStart) missedDate.value = clockToday;
  }
  function setupMissingDate() {
    if (!missingDate) return;
    missingDate.max = clockToday;
    missingDate.min = clockStart;
    if (!missingDate.value || missingDate.value < clockStart) missingDate.value = clockToday;
  }
  function missingDayLabel(value) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'today';
    if (value === clockToday) return 'today';
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
      day: 'numeric', month: 'short'
    });
  }
  function punchForName(records, name) {
    const key = String(name || '').toLowerCase();
    return (records || []).find((row) => String(row.name || '').toLowerCase() === key) || null;
  }
  function renderNameChips(target, names, records, kind) {
    if (!target) return;
    if (!names.length) {
      target.innerHTML = `<p class="missing-empty">${kind === 'in' ? 'Everyone has checked in.' : 'Everyone who checked in has checked out.'}</p>`;
      return;
    }
    target.innerHTML = names.map((name) => {
      const punch = punchForName(records, name);
      const meta = kind === 'out' && punch && punch.inTime
        ? `<span class="missing-chip-meta">IN ${escapeHtml(String(punch.inTime).slice(0, 5))}</span>`
        : '';
      return `
        <button class="missing-chip" type="button" data-name="${escapeHtml(name)}">
          <span class="avatar" style="${avatarStyle(name)}">${escapeHtml(initials(name))}</span>
          <span class="missing-chip-name">${escapeHtml(name)}</span>
          ${meta}
        </button>`;
    }).join('');
  }
  function renderMissing(records) {
    const date = missingDate && missingDate.value ? missingDate.value : localDateKey(new Date());
    if (missingTitle) missingTitle.textContent = 'Not marked ' + missingDayLabel(date);
    const listed = employeeNames.slice();
    const missingIn = listed.filter((name) => {
      const punch = punchForName(records, name);
      return !punch || !punch.inTime;
    });
    const listedOut = listed.filter((name) => {
      const punch = punchForName(records, name);
      return punch && punch.inTime && !punch.outTime;
    });
    const extrasOut = (records || [])
      .filter((row) => row.inTime && !row.outTime)
      .map((row) => row.name)
      .filter((name) => !listed.some((item) => item.toLowerCase() === String(name || '').toLowerCase()));
    const missingOut = listedOut.concat(extrasOut);
    if (missingInCount) missingInCount.textContent = String(missingIn.length);
    if (missingOutCount) missingOutCount.textContent = String(missingOut.length);
    renderNameChips(missingInList, missingIn, records, 'in');
    renderNameChips(missingOutList, missingOut, records, 'out');
  }
  async function refreshMissing() {
    if (!missingInList && !missingOutList) return;
    setupMissingDate();
    const date = missingDate && missingDate.value ? missingDate.value : localDateKey(new Date());
    try {
      const records = await apiGet('/api/punches?date=' + encodeURIComponent(date));
      renderMissing(records);
    } catch (e) {
      if (missingInCount) missingInCount.textContent = '0';
      if (missingOutCount) missingOutCount.textContent = '0';
      const fail = '<p class="missing-empty">Could not load this day.</p>';
      if (missingInList) missingInList.innerHTML = fail;
      if (missingOutList) missingOutList.innerHTML = fail;
    }
  }
  function formatLate(minutes) {
    const total = Math.max(0, Math.round(Number(minutes) || 0));
    if (!total) return '0m';
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    if (hours && mins) return `${hours}h ${mins}m`;
    if (hours) return `${hours}h`;
    return `${mins}m`;
  }
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
    apiPost('/api/users', { name }).catch(() => {});
  }

  async function removeName(name) {
    const clean = normalizeName(name);
    if (!isValidName(clean)) return;
    if (!window.confirm('Remove ' + clean + ' from the name list?')) return;
    try {
      await apiDelete('/api/users', { name: clean });
      const selected = employeeSelect.value;
      employeeNames = employeeNames.filter((item) => item.toLowerCase() !== clean.toLowerCase());
      fillEmployees(employeeNames);
      if (selected && selected.toLowerCase() === clean.toLowerCase()) clearSelection();
      setComboOpen(false);
      statusLine.textContent = clean + ' removed from the name list.';
      statusLine.className = 'status-line ontime';
    } catch (e) {
      statusLine.textContent = e.message || 'Could not remove name.';
      statusLine.className = 'status-line late';
    }
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
      <div class="combo-option${index === highlightIndex ? ' is-active' : ''}${item.isNew ? ' is-new' : ''}" role="option" data-name="${escapeHtml(item.name)}" aria-selected="${item.name === selected}">
        <span class="avatar" style="${avatarStyle(item.name)}">${item.isNew ? '+' : escapeHtml(initials(item.name))}</span>
        <span class="combo-option-label">${item.isNew ? 'Add <strong>' + escapeHtml(item.name) + '</strong>' : escapeHtml(item.name)}</span>
        ${item.isNew ? '' : `<button type="button" class="combo-delete" data-name="${escapeHtml(item.name)}" aria-label="Remove ${escapeHtml(item.name)}">
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M5 6h10M8 6V5h4v1m-5 2v6m3-6v6M6.5 6.5l.5 9h6l.5-9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>`}
      </div>
    `).join('');
  }

  function fillEmployees(names) {
    const incoming = Array.isArray(names) ? names.slice() : EMPLOYEES.slice();
    const extras = employeeNames.filter((name) => {
      const already = incoming.some((item) => item.toLowerCase() === name.toLowerCase());
      if (already) return false;
      const builtin = EMPLOYEES.some((item) => item.toLowerCase() === name.toLowerCase());
      return !builtin;
    });
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
    refreshMissing();
  }

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

  async function apiSend(path, payload, method) {
    const res = await fetch(path, {
      method,
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

  function apiPost(path, payload) {
    return apiSend(path, payload, 'POST');
  }

  function apiDelete(path, payload) {
    const name = payload && payload.name ? ('?name=' + encodeURIComponent(payload.name)) : '';
    return apiSend(path + name, payload, 'DELETE');
  }

  function renderFeed(records) {
    const todays = Array.isArray(records) ? records.slice() : [];
    lastFeedRecords = todays;
    todays.sort((a, b) => String(a.inTime || '').localeCompare(String(b.inTime || '')) * -1);
    feedCount.textContent = String(todays.length);
    if (!todays.length) {
      feedList.innerHTML = '<div class="empty-note">No punches yet today.</div>';
      return;
    }
    feedList.innerHTML = todays.map((r) => `
      <div class="ticket ${r.late ? 'late-ticket' : ''}" data-id="${escapeHtml(r.id || '')}">
        <div class="ticket-main">
          <span class="avatar" style="${avatarStyle(r.name)}">${escapeHtml(initials(r.name))}</span>
          <div>
            <div class="ticket-name">${escapeHtml(r.name)}</div>
            <div class="ticket-meta">IN ${escapeHtml(r.inTime || '-')}${r.outTime ? '  ·  OUT ' + escapeHtml(r.outTime) : ''}</div>
          </div>
        </div>
        <div class="ticket-side">
          <div class="ticket-badge ${r.late ? 'late' : ''}">${r.late ? formatLate(r.lateMinutes) + ' late' : 'On time'}</div>
          ${officeUnlocked ? `
            <div class="ticket-fix">
              ${r.outTime ? `<button class="ticket-fix-btn" type="button" data-action="undo-out" data-id="${escapeHtml(r.id)}" data-name="${escapeHtml(r.name)}">Undo out</button>` : ''}
              <button class="ticket-fix-btn danger" type="button" data-action="remove" data-id="${escapeHtml(r.id)}" data-name="${escapeHtml(r.name)}">Remove</button>
            </div>` : ''}
        </div>
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
      summaryDownload.href = '/api/export-summary.xlsx' +
        (prefix ? ('?month=' + encodeURIComponent(prefix) + '&') : '?') +
        't=' + Date.now();
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
      <div class="kpi"><span>Late by</span><strong>${formatLate(lateMinutes)}</strong></div>
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
        <td class="num">${formatLate(r.lateMinutes)}</td>
      </tr>
    `).join('');
  }

  async function refreshFeed() {
    try {
      const records = await apiGet('/api/punches');
      renderFeed(records);
      const today = clockToday;
      if (missingDate && missingDate.value && missingDate.value !== today) {
        await refreshMissing();
      } else {
        setupMissingDate();
        renderMissing(records);
      }
    } catch (e) {
      feedCount.textContent = '0';
      feedList.innerHTML = '<div class="empty-note">Could not load punches.</div>';
    }
  }

  async function withBusy(button, fn) {
    const buttons = [checkInBtn, checkOutBtn, missedSaveBtn, missedClearBtn, correctionLoginBtn].filter(Boolean);
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
          ? `Checked in — ${formatLate(saved.lateMinutes)} late.`
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

  function setCorrectionView(mode, user) {
    const unlocked = mode === 'unlocked';
    const pinOpen = mode === 'pin';
    officeUnlocked = unlocked;
    if (correctionLogin) correctionLogin.hidden = !pinOpen;
    if (missedPanel) missedPanel.hidden = !unlocked;
    if (correctionLock) {
      correctionLock.hidden = unlocked;
      correctionLock.setAttribute('aria-expanded', pinOpen ? 'true' : 'false');
    }
    if (unlocked) {
      setupMissedDates();
      if (correctionWho) {
        correctionWho.textContent = user && user.name
          ? 'Signed in as ' + user.name + '. Fix a wrong punch below, or add a missed one.'
          : 'Fix a wrong punch below, or add a missed one.';
      }
    }
    renderFeed(lastFeedRecords);
  }

  async function refreshCorrection() {
    try {
      const me = await apiGet('/api/me');
      setCorrectionView(me && me.canCorrect ? 'unlocked' : 'locked', me);
    } catch (e) {
      setCorrectionView('locked');
    }
  }

  async function handleCorrectionLogin() {
    const pin = correctionPin ? correctionPin.value.trim() : '';
    if (!pin) {
      statusLine.textContent = 'Enter the office PIN.';
      statusLine.className = 'status-line late';
      return;
    }
    await withBusy(correctionLoginBtn, async () => {
      try {
        const me = await apiPost('/api/correction/login', { pin });
        if (correctionPin) correctionPin.value = '';
        setCorrectionView('unlocked', me);
        statusLine.textContent = 'Office login unlocked. You can remove a wrong check-in or check-out.';
        statusLine.className = 'status-line ontime';
      } catch (e) {
        statusLine.textContent = e.message || 'Wrong PIN.';
        statusLine.className = 'status-line late';
      }
    });
  }

  async function handleCorrectionLogout() {
    try {
      await apiPost('/api/logout', {});
    } catch (e) { /* ignore */ }
    if (correctionPin) correctionPin.value = '';
    setCorrectionView('locked');
    statusLine.textContent = '';
    statusLine.className = 'status-line';
  }

  if (correctionLock) {
    correctionLock.addEventListener('click', () => {
      const open = correctionLogin && correctionLogin.hidden;
      setCorrectionView(open ? 'pin' : 'locked');
      if (open && correctionPin) correctionPin.focus();
    });
  }
  if (correctionLoginBtn) correctionLoginBtn.addEventListener('click', handleCorrectionLogin);
  if (feedList) {
    feedList.addEventListener('click', async (event) => {
      const btn = event.target.closest('.ticket-fix-btn');
      if (!btn || !officeUnlocked) return;
      const id = btn.dataset.id;
      const name = btn.dataset.name || 'this punch';
      const action = btn.dataset.action;
      if (action === 'undo-out') {
        if (!window.confirm('Remove the check-out for ' + name + '? Check-in will stay.')) return;
        try {
          await apiPost('/api/punches/item/' + encodeURIComponent(id) + '/undo-out', {});
          statusLine.textContent = 'Removed check-out for ' + name + '.';
          statusLine.className = 'status-line ontime';
          refreshFeed();
        } catch (e) {
          statusLine.textContent = e.message || 'Could not undo check-out.';
          statusLine.className = 'status-line late';
        }
        return;
      }
      if (action === 'remove') {
        if (!window.confirm('Remove the whole punch for ' + name + '?')) return;
        try {
          await apiDelete('/api/punches/item/' + encodeURIComponent(id), {});
          statusLine.textContent = 'Removed punch for ' + name + '.';
          statusLine.className = 'status-line ontime';
          refreshFeed();
        } catch (e) {
          statusLine.textContent = e.message || 'Could not remove punch.';
          statusLine.className = 'status-line late';
        }
      }
    });
  }
  if (correctionLogout) correctionLogout.addEventListener('click', handleCorrectionLogout);
  if (correctionPin) {
    correctionPin.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleCorrectionLogin();
      }
    });
  }

  async function handleMissedSave() {
    const name = selectedName();
    if (!name) { statusLine.textContent = 'Select your name first.'; return; }
    if (employeeSelect.value !== name) chooseName(name);
    const date = missedDate && missedDate.value;
    const inTime = missedIn && missedIn.value;
    const outTime = missedOut && missedOut.value;
    if (!date) { statusLine.textContent = 'Pick the missed date.'; return; }
    if (!inTime && !outTime) {
      statusLine.textContent = 'Enter a check-in or check-out time.';
      return;
    }
    await withBusy(missedSaveBtn, async () => {
      try {
        const saved = await apiPost('/api/punches/missed', { name, date, inTime, outTime });
        const bits = [];
        if (saved.inTime) bits.push('IN ' + saved.inTime.slice(0, 5));
        if (saved.outTime) bits.push('OUT ' + saved.outTime.slice(0, 5));
        statusLine.textContent = `Saved ${date} for ${saved.name} — ${bits.join(' · ')}.`;
        statusLine.className = 'status-line ' + (saved.late ? 'late' : 'ontime');
        if (missedIn) missedIn.value = '';
        if (missedOut) missedOut.value = '';
        clearSelection();
        refreshFeed();
      } catch (e) {
        statusLine.textContent = e.message || 'Could not save missed punch.';
        statusLine.className = 'status-line late';
        if (e.status === 401 || e.status === 403) setCorrectionView('pin');
      }
    });
  }
  if (missedSaveBtn) missedSaveBtn.addEventListener('click', handleMissedSave);

  async function handleMissedClear() {
    const date = missedDate && missedDate.value;
    if (!date) { statusLine.textContent = 'Pick the date to clear.'; return; }
    if (!window.confirm('Delete every punch for ' + date + '? This cannot be undone.')) return;
    await withBusy(missedClearBtn, async () => {
      try {
        const result = await apiDelete('/api/punches?date=' + encodeURIComponent(date), {});
        statusLine.textContent = 'Cleared ' + (result.removed || 0) + ' punch(es) for ' + date + '.';
        statusLine.className = 'status-line ontime';
        refreshFeed();
      } catch (e) {
        statusLine.textContent = e.message || 'Could not clear that day.';
        statusLine.className = 'status-line late';
        if (e.status === 401 || e.status === 403) setCorrectionView('pin');
      }
    });
  }
  if (missedClearBtn) missedClearBtn.addEventListener('click', handleMissedClear);

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
    const removeBtn = event.target.closest('.combo-delete');
    if (removeBtn) {
      event.preventDefault();
      event.stopPropagation();
      removeName(removeBtn.dataset.name);
      return;
    }
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
      const clock = await apiGet('/api/clock');
      if (clock && clock.today) clockToday = clock.today;
      if (clock && clock.startDate) clockStart = clock.startDate;
    } catch (e) { /* use local today */ }
    setupMissingDate();
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
    refreshCorrection();
  })();

  setupMissingDate();
  if (missingDate) {
    missingDate.addEventListener('change', refreshMissing);
  }
  function pickMissingName(event) {
    const chip = event.target.closest('.missing-chip');
    if (!chip) return;
    chooseName(chip.dataset.name);
    if (missedDate && missingDate && missingDate.value && !missedPanel.hidden) {
      missedDate.value = missingDate.value;
    }
  }
  if (missingInList) missingInList.addEventListener('click', pickMissingName);
  if (missingOutList) missingOutList.addEventListener('click', pickMissingName);

  if (excelDownload) {
    excelDownload.addEventListener('click', () => {
      excelDownload.href = '/api/export.xlsx?t=' + Date.now();
    });
  }
  if (summaryDownload) {
    summaryDownload.addEventListener('click', () => {
      setSummaryDownload(summaryMonthSelect && summaryMonthSelect.value);
    });
  }
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
