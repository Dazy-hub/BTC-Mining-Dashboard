// hashprice.js — Hashprice page: calculation, chart rendering, UI updates
import { state } from './state.js';

export function hpCompute(btcUSD, hashEH) {
  // hashprice = (subsidy + avg_fees) × BTC_price × 144 blocks/day ÷ hashrate_THS
  const hashrateTHS = hashEH * 1e6;
  return ((3.125 + (state.liveAvgFeesPerBlock || 0)) * btcUSD * 144) / hashrateTHS;
}

export function hpUpdateMargin() {
  const hpEl = document.getElementById('hp2-hashprice');
  const hp   = hpEl ? parseFloat(hpEl.textContent.replace('$','')) : 0;
  if (!hp) return;
  const cost    = parseFloat(document.getElementById('hp2-cost-input').value) || 0;
  const margin  = hp - cost;
  const el      = document.getElementById('hp2-margin');
  const verdict = document.getElementById('hp2-verdict');
  el.textContent      = (margin >= 0 ? '+$' : '−$') + Math.abs(margin).toFixed(4);
  el.style.color      = margin >= 0 ? 'var(--green-text)' : 'var(--red-text)';
  verdict.textContent = margin >= 0 ? '✓ Profitable at this cost' : '✗ Unprofitable at this cost';
  verdict.style.color = margin >= 0 ? 'var(--green-text)' : 'var(--red-text)';
}

export function hpRefresh() {
  // Live tile — uses globals set by fetchHashrate() and
  if (!state.liveBTCPrice || !state.liveNetHashEH) return;
  const hp = hpCompute(state.liveBTCPrice, state.liveNetHashEH);
  document.getElementById('hp-live-price').textContent = '$' + hp.toFixed(4);
  document.getElementById('hp-btc-val').textContent    = '$' + state.liveBTCPrice.toLocaleString();
  document.getElementById('hp-hr-val').textContent     = state.liveNetHashEH.toFixed(1) + ' EH/s';
  document.getElementById('hp2-hashprice').textContent = '$' + hp.toFixed(4);
  document.getElementById('hp-status').textContent     = 'Updated · ' + new Date().toLocaleTimeString();
  hpUpdateMargin();
  hpDrawChart();
}

export function hpDrawChart() {
  // state.networkHashrateHistory = [{timestamp (unix s), avgHashrate (H/s)}]
  // loaded by fetchHashrateHistory() using MEMPOOL + '/v1/mining/hashrate/2y'
  if (!state.networkHashrateHistory || state.networkHashrateHistory.length < 2) {
    // Data not loaded yet — show loading state, retry in 2s
    document.getElementById('hp-loading').style.display = 'flex';
    document.getElementById('hp-chart-wrap').style.display = 'none';
    setTimeout(() => { if (document.getElementById('page-hashprice').classList.contains('active')) hpDrawChart(); }, 2000);
    return;
  }

  const now     = Date.now() / 1000;
  const cutoff  = now - state.hpDays * 86400;
  const btc     = state.liveBTCPrice || 94000;
  const cost    = parseFloat(document.getElementById('hp2-cost-input').value) || 0;

  const slice = state.networkHashrateHistory.filter(p => p.timestamp >= cutoff);
  if (slice.length < 2) {
    document.getElementById('hp-loading').style.display = 'none';
    document.getElementById('hp-chart-wrap').style.display = 'block';

  }

  const labels = slice.map(p => {
    const d = new Date(p.timestamp * 1000);
    if (state.hpDays <= 7)  return d.toLocaleDateString([], {weekday:'short', month:'short', day:'numeric'});
    if (state.hpDays <= 90) return d.toLocaleDateString([], {month:'short', day:'numeric'});
    return d.toLocaleDateString([], {month:'short', year:'2-digit'});
  });

  const vals = slice.map(p => {
    const hrEH = p.avgHashrate / 1e18;
    return hrEH > 0 ? +hpCompute(btc, hrEH).toFixed(5) : null;
  });

  // Period change
  const validVals = vals.filter(v => v !== null);
  if (validVals.length >= 2) {
    const chgPct = ((validVals[validVals.length-1] - validVals[0]) / validVals[0]) * 100;
    const chgEl  = document.getElementById('hp-chg-val');
    chgEl.textContent = (chgPct >= 0 ? '+' : '') + chgPct.toFixed(1) + '%';
    chgEl.style.color = chgPct >= 0 ? 'var(--green-text)' : 'var(--red-text)';
  }

  const datasets = [{
    label: 'Hashprice (USD/TH/day)',
    data: vals,
    borderColor: '#0F6E56',
    backgroundColor: 'rgba(15,110,86,0.07)',
    fill: true, tension: 0.3, pointRadius: 0, pointHoverRadius: 4, borderWidth: 1.5,
    spanGaps: true,
  }];
  if (cost > 0) {
    datasets.push({
      label: 'Your cost/TH/day',
      data: slice.map(() => cost),
      borderColor: '#BA7517',
      backgroundColor: 'transparent',
      fill: false, tension: 0, pointRadius: 0, borderWidth: 1.5, borderDash: [5,4],
    });
  }

  if (state.hpChartInstance) state.hpChartInstance.destroy();
  const ctx = document.getElementById('hp-canvas').getContext('2d');
  state.hpChartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: c => {
              if (c.dataset.label === 'Your cost/TH/day') return ' Cost: $' + c.parsed.y.toFixed(4) + '/TH/day';
              return ' Hashprice: $' + c.parsed.y.toFixed(4) + '/TH/day';
            },
            footer: () => ['', '⚠ Hashprice uses live BTC price (@$' + (state.liveBTCPrice ? state.liveBTCPrice.toLocaleString() : '—') + ')', 'applied to historical hashrate'],
          },
          backgroundColor: 'var(--surface)', borderColor: 'var(--border2)', borderWidth: 1,
          titleColor: 'var(--text)', bodyColor: 'var(--text2)',
          footerColor: '#BA7517', footerFont: { size: 10, style: 'italic' },
          padding: 12, cornerRadius: 8,
        }
      },
      scales: {
        x: { grid:{color:'var(--border)'}, ticks:{color:'var(--text3)',font:{size:11},maxTicksLimit:7,maxRotation:0}, border:{display:false} },
        y: { grid:{color:'var(--border)'}, ticks:{color:'var(--text3)',font:{size:11},callback:v=>'$'+v.toFixed(4),maxTicksLimit:6}, border:{display:false} }
      }
    }
  });

  document.getElementById('hp-loading').style.display = 'none';
  document.getElementById('hp-chart-wrap').style.display = 'block';
}

export function hpSetSpan(d) {
  state.hpDays = d;
  document.querySelectorAll('.hp-sb').forEach(b => b.classList.toggle('hp-sb-on', b.dataset.span === String(d)));
  hpDrawChart();
}
