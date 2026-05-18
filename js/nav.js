// nav.js — page navigation, tab management, session state restore
import { state, PAGE_MAP, ON_START9 } from './state.js';
import { fetchKnotsDistribution } from './network.js';
import { hpRefresh } from './hashprice.js';

export function showPage(name, btn) {
  Object.values(PAGE_MAP).flat().forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });
  (PAGE_MAP[name] || []).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  });
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  try { sessionStorage.setItem('btc_page', name); } catch(_) {}
  if (name === 'ocean' && state.oceanHashChart2) setTimeout(() => state.oceanHashChart2.resize(), 50);
  if (name === 'live' && state.hashChart) setTimeout(() => state.hashChart.resize(), 50);
  if (name === 'calc') {
    // Scroll to calculator section after a brief render delay
    setTimeout(() => {
      const el = document.getElementById('page-live-2');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    // Highlight the Live tab as active since calc is part of Live
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.nav-tab[onclick*="live"]')?.classList.add('active');
  }
  if (name === 'hashprice') {
    hpRefresh(); // always refresh live numbers from globals
    if (state.hpChartInstance) setTimeout(() => state.hpChartInstance.resize(), 50);
  }
  if (name === 'network' && ON_START9) {
    // Fetch knots if never loaded or data is stale (older than 23hrs)
    if (!state.knotsLastFetched || (Date.now() - state.knotsLastFetched) > 23 * 3600 * 1000) fetchKnotsDistribution();
  }
  window.scrollTo(0, 0);
}

// Restore last visited page on load
export function restoreLastPage() {
  try {
    const saved = sessionStorage.getItem('btc_page');
    if (saved && PAGE_MAP[saved]) {
      const btn = document.querySelector('.nav-tab[onclick*="' + saved + '"]');
      showPage(saved, btn);
    }
  } catch(_) {}
}
