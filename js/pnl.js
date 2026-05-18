// pnl.js — P&L tracker: localStorage persistence and rendering
import { PNL_KEY } from './state.js';

export function pnlLoad() {
  try { return JSON.parse(localStorage.getItem(PNL_KEY) || '[]'); } catch(_) { return []; }
}

export function pnlSave(entries) {
  try { localStorage.setItem(PNL_KEY, JSON.stringify(entries)); } catch(_) {}
}

export function pnlToday() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export function pnlPrefill() {
  const profitEl = document.getElementById('r-profit');
  if (!profitEl) return;
  const raw = profitEl.textContent.replace(/[^0-9.\-]/g, '');
  const val = parseFloat(raw) * (profitEl.textContent.includes('-') ? -1 : 1);
  if (!isNaN(val)) {
    document.getElementById('pnl-input').value = val.toFixed(2);
  }
}


export function pnlLogDay() {
  const input = document.getElementById('pnl-input');
  const val   = parseFloat(input.value);
  if (isNaN(val)) {
    input.style.borderColor = 'var(--red-text)';
    setTimeout(() => input.style.borderColor = '', 1200);
    return;
  }
  const entries = pnlLoad();
  const today   = pnlToday();
  // Replace existing entry for today if it exists
  const idx = entries.findIndex(e => e.date === today);
  if (idx >= 0) entries[idx].usd = val;
  else entries.push({ date: today, usd: val });
  pnlSave(entries);
  input.value = '';
  pnlRender();
}

export function pnlClear() {
  if (!confirm('Clear all P&L history? This cannot be undone.')) return;
  try { localStorage.removeItem(PNL_KEY); } catch(_) {}
  pnlRender();
}

export function pnlRender() {
  const entries = pnlLoad();
  const today   = new Date();
  const todayStr = pnlToday();

  // Week: last 7 days including today
  const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 6);
  const weekStr = weekAgo.toISOString().slice(0, 10);
  const weekEntries  = entries.filter(e => e.date >= weekStr && e.date <= todayStr);
  const weekTotal    = weekEntries.reduce((s, e) => s + e.usd, 0);

  // Month: current calendar month
  const monthPrefix  = todayStr.slice(0, 7); // YYYY-MM
  const monthEntries = entries.filter(e => e.date.startsWith(monthPrefix));
  const monthTotal   = monthEntries.reduce((s, e) => s + e.usd, 0);

  const fmt = v => (v >= 0 ? '+$' : '-$') + Math.abs(v).toFixed(2);
  const col = v => v >= 0 ? 'var(--green-text)' : 'var(--red-text)';

  const weekEl = document.getElementById('pnl-week');
  const monthEl = document.getElementById('pnl-month');
  if (weekEl) {
    weekEl.textContent = weekEntries.length ? fmt(weekTotal) : '—';
    weekEl.style.color = weekEntries.length ? col(weekTotal) : '';
  }
  if (monthEl) {
    monthEl.textContent = monthEntries.length ? fmt(monthTotal) : '—';
    monthEl.style.color = monthEntries.length ? col(monthTotal) : '';
  }
  const wdEl = document.getElementById('pnl-week-days');
  const mdEl = document.getElementById('pnl-month-days');
  if (wdEl) wdEl.textContent = weekEntries.length + ' day' + (weekEntries.length !== 1 ? 's' : '') + ' logged';
  if (mdEl) mdEl.textContent = monthEntries.length + ' day' + (monthEntries.length !== 1 ? 's' : '') + ' logged';

  // Log table — most recent 10 entries
  const logEl = document.getElementById('pnl-log');
  if (logEl) {
    const recent = [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
    if (!recent.length) {
      logEl.innerHTML = '<div style="color:var(--text3);padding:6px 0;">No entries yet — log your first day above.</div>';
    } else {
      logEl.innerHTML = recent.map(e => {
        const isToday = e.date === todayStr;
        const label   = isToday ? 'Today' : e.date;
        const v       = e.usd;
        return `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:0.5px solid var(--border);">
          <span style="color:var(--text2);">${label}</span>
          <span style="font-family:monospace;color:${col(v)};font-weight:600;">${fmt(v)}</span>
        </div>`;
      }).join('');
    }
  }
}
