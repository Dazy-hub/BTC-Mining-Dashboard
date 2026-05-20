// charts.js — Hash chart (3-day network hashrate) and Hash Ribbon
import { state } from './state.js';

export function drawHashChart(labels, values) {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const lineColor = '#185FA5';
  const fillColor = isDark ? 'rgba(24,95,165,0.15)' : 'rgba(24,95,165,0.08)';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textColor = isDark ? '#6a6a66' : '#9a9a96';

  const canvas = document.getElementById('state.hashChart');
  if (state.hashChart) { state.hashChart.destroy(); state.hashChart = null; }

  state.hashChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Network hashrate (EH/s)',
        data: values,
        borderColor: lineColor,
        backgroundColor: fillColor,
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { display: false },
          grid: { color: gridColor }
        },
        y: {
          ticks: {
            color: textColor,
            font: { size: 11 },
            callback: v => v + ' EH/s',
            maxTicksLimit: 4
          },
          grid: { color: gridColor }
        }
      }
    }
  });
}

export function computeSMA(data, days) {
  const result = [];
  for (let i = days - 1; i < data.length; i++) {
    const slice = data.slice(i - days + 1, i + 1);
    const avg   = slice.reduce((s, d) => s + d.avgHashrate, 0) / days;
    result.push({ timestamp: data[i].timestamp, sma: avg });
  }
  return result;
}

export function drawHashRibbon() {
  const el    = document.getElementById('hr-signal-label');
  const desc  = document.getElementById('hr-signal-desc');
  const badge = document.getElementById('hr-action-badge');
  if (!el) return; // panel not visible

  if (!state.networkHashrateHistory || state.networkHashrateHistory.length < 61) {
    if (!ON_START9) {
      el.textContent   = 'Deploy on Start9 for Hash Ribbon';
      el.style.color   = 'var(--amber-text)';
      desc.textContent = 'Needs 60+ days of hashrate data from /v1/mining/hashrate/2y — CORS-blocked from local files.';
      badge.textContent = 'Start9 required'; badge.className = 'badge bb';
    } else {
      el.textContent   = 'Loading hashrate history...';
      el.style.color   = 'var(--text)';
      desc.textContent = 'Fetching 2 years of daily hashrate data...';
      badge.textContent = 'Loading'; badge.className = 'badge bb';
    }
    return;
  }

  const data   = state.networkHashrateHistory;
  const sma30  = computeSMA(data, 30);
  const sma60  = computeSMA(data, 60);
  const sma60Map = new Map(sma60.map(d => [d.timestamp, d.sma]));
  const aligned  = sma30.filter(d => sma60Map.has(d.timestamp))
                        .map(d => ({ timestamp: d.timestamp, sma30: d.sma, sma60: sma60Map.get(d.timestamp) }));
  if (aligned.length < 2) return;

  const last    = aligned[aligned.length - 1];
  const prev    = aligned[aligned.length - 2];
  const curr30  = last.sma30 / 1e18;
  const curr60  = last.sma60 / 1e18;
  const above   = last.sma30 > last.sma60;
  const wasAbove = prev.sma30 > prev.sma60;
  const crossUp  = above && !wasAbove;
  const crossDn  = !above && wasAbove;
  const gapPct   = ((last.sma30 - last.sma60) / last.sma60 * 100);
  let daysInPhase = 1;
  for (let i = aligned.length - 2; i >= 0; i--) {
    if ((aligned[i].sma30 > aligned[i].sma60) === above) daysInPhase++;
    else break;
  }

  const dot = document.getElementById('hr-signal-dot');
  if (crossUp) {
    dot.style.background = '#185FA5'; dot.style.boxShadow = '0 0 8px #185FA5';
    el.textContent = '⬆ Buy Signal — 30D just crossed above 60D'; el.style.color = 'var(--blue-text)';
    desc.textContent = 'Miner capitulation officially ended. Strongest signal to rent and accumulate.';
    badge.textContent = 'Rent aggressively'; badge.className = 'badge bb';
  } else if (crossDn) {
    dot.style.background = '#A32D2D'; dot.style.boxShadow = '0 0 8px #A32D2D';
    el.textContent = '⬇ Capitulation Beginning — 30D crossed below 60D'; el.style.color = 'var(--red-text)';
    desc.textContent = 'Hashrate declining. Monitor hashprice vs rental cost. Difficulty drops ahead.';
    badge.textContent = 'Monitor closely'; badge.className = 'badge ba';
  } else if (above) {
    dot.style.background = '#639922'; dot.style.boxShadow = 'none';
    el.textContent = '● Recovery / Growth — 30D above 60D'; el.style.color = 'var(--green-text)';
    desc.textContent = '30D MA above 60D MA for ' + daysInPhase + ' days. Favourable conditions.';
    badge.textContent = 'Maintain rental'; badge.className = 'badge bg';
  } else {
    dot.style.background = '#A32D2D'; dot.style.boxShadow = 'none';
    el.textContent = '● Active Capitulation — 30D below 60D (' + Math.abs(gapPct).toFixed(2) + '% below)';
    el.style.color = 'var(--red-text)';
    desc.textContent = '30D below 60D for ' + daysInPhase + ' days. Watch for 30D to cross back above 60D as recovery signal.';
    badge.textContent = daysInPhase > 30 ? 'Recovery approaching' : 'Pause if unprofitable'; badge.className = 'badge ba';
  }

  document.getElementById('hr-30d').textContent       = curr30.toFixed(2) + ' EH/s';
  document.getElementById('hr-60d').textContent       = curr60.toFixed(2) + ' EH/s';
  document.getElementById('hr-gap').textContent       = (gapPct >= 0 ? '+' : '') + gapPct.toFixed(2) + '%';
  document.getElementById('hr-gap').style.color       = gapPct >= 0 ? '#3B6D11' : '#A32D2D';
  document.getElementById('hr-gap-sub').textContent   = gapPct >= 0 ? '30D above 60D' : '30D below 60D';
  document.getElementById('hr-duration').textContent  = daysInPhase;
  document.getElementById('hr-duration-sub').textContent = 'days in ' + (above ? 'recovery' : 'capitulation');

  // Store state for combined signal
  window._ribbonAbove = above;

  const cutoff  = (Date.now() / 1000) - 180 * 86400;
  const visible = aligned.filter(d => d.timestamp >= cutoff);
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const fmtD = ts => { const d = new Date(ts*1000); return M[d.getMonth()] + ' ' + d.getDate(); };
  const labels = visible.map(d => fmtD(d.timestamp));
  if (visible.length > 0) document.getElementById('hr-chart-start').textContent = fmtD(visible[0].timestamp);

  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const gridClr = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const txtClr  = isDark ? '#6a6a66' : '#9a9a96';
  const canvas = document.getElementById('state.hashRibbonChart');
  if (!canvas) return;
  if (state.hashRibbonChart) { state.hashRibbonChart.destroy(); state.hashRibbonChart = null; }
  state.hashRibbonChart = new Chart(canvas, {
    type: 'line',
    data: { labels, datasets: [
      { label: '30D MA', data: visible.map(d => (d.sma30/1e18).toFixed(3)),
        borderColor: '#185FA5', backgroundColor: 'transparent', borderWidth: 2, tension: 0.3, pointRadius: 0 },
      { label: '60D MA', data: visible.map(d => (d.sma60/1e18).toFixed(3)),
        borderColor: '#9a9a96', backgroundColor: 'transparent', borderWidth: 1.5, borderDash: [4,3], tension: 0.3, pointRadius: 0 }
    ]},
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false },
        tooltip: { backgroundColor: isDark ? '#272724' : '#fff', titleColor: isDark ? '#e6e6e2' : '#1a1a18',
          bodyColor: isDark ? '#9e9e9a' : '#5c5c58', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)', borderWidth: 1,
          callbacks: { label: ctx => ' ' + ctx.dataset.label + ': ' + parseFloat(ctx.raw).toFixed(2) + ' EH/s' }}},
      scales: { x: { ticks: { display: false }, grid: { color: gridClr } },
        y: { ticks: { color: txtClr, font: { size: 11 }, callback: v => v + ' EH', maxTicksLimit: 4 }, grid: { color: gridClr }}}
    }
  });
}
