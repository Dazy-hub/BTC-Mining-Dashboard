// ocean.js — OCEAN pool: live data scraping, hashrate chart, DATUM detection
import { state, ON_START9, MEMPOOL } from './state.js';

export function renderOceanPanel(oceanEH, lastBlockHeight, lastBlockAgo, sourceNote) {
  const sharePct = state.liveNetHashEH > 0 ? (oceanEH / state.liveNetHashEH * 100) : 2.3;
  const bpd      = (sharePct / 100) * 144;

  window._oceanHashEH   = oceanEH;
  window._oceanSharePct = sharePct;

  const now = new Date();
  const M   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  document.getElementById('ocean-panel-time').textContent =
    '— ' + M[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear() +
    ' · ' + now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'});

  document.getElementById('ocean-hashrate').textContent      = oceanEH.toFixed(2) + ' EH/s';
  document.getElementById('ocean-hashrate-sub').textContent  = (oceanEH * 1000).toFixed(0) + ' PH/s · ' + sourceNote;
  document.getElementById('ocean-bpd').textContent           = bpd.toFixed(1) + ' / day';
  document.getElementById('ocean-bpd-sub').textContent       = sharePct.toFixed(2) + '% of ' + state.liveNetHashEH.toFixed(1) + ' EH/s network';
  document.getElementById('ocean-share').textContent         = sharePct.toFixed(2) + '%';
  document.getElementById('ocean-share-sub').textContent     = 'of ' + state.liveNetHashEH.toFixed(1) + ' EH/s network';
  document.getElementById('ocean-last-block').textContent    = lastBlockHeight;
  document.getElementById('ocean-last-block-sub').textContent = lastBlockAgo;

  const barEl = document.getElementById('ocean-share-bar');
  barEl.style.width = Math.min(sharePct * 3, 40) + '%';
  barEl.textContent = sharePct.toFixed(2) + '%';
  document.getElementById('ocean-share-bar-label').textContent = 'OCEAN ' + sharePct.toFixed(2) + '% of network';
  document.getElementById('ocean-method-note').textContent = sourceNote;
}

export function parseOceanHTML(html) {
  // Banner: "HASHRATE: 18.32 Eh/s • LAST BLOCK: 946453 (26H AGO)"
  const hrMatch  = html.match(/HASHRATE:\s*([\d.]+)\s*(Eh\/s|Ph\/s|Th\/s)/i);
  const blkMatch = html.match(/LAST BLOCK:\s*(\d+)\s*\(([^)]+)\)/i);

  if (!hrMatch) {
    // Log the first 300 chars so we can see what came back (error page, Cloudflare, etc.)
    const preview = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
    console.warn('[parseOceanHTML] no hashrate found. Response preview:', preview);
    throw new Error('Hashrate not found — response: ' + preview.slice(0, 80));
  }

  const val  = parseFloat(hrMatch[1]);
  const unit = hrMatch[2].toLowerCase();
  const oceanEH = unit.startsWith('e') ? val
                : unit.startsWith('p') ? val / 1000
                : val / 1e6;

  const lastBlockHeight = blkMatch ? '#' + parseInt(blkMatch[1]).toLocaleString() : '—';
  const lastBlockAgo    = blkMatch ? blkMatch[2].trim() : '—';

  // DATUM template detection — blocktemplate page shows which template policy is active
  // "DATUM" in the page indicates miner-constructed template is in use
  const isDATUM = /datum/i.test(html);
  const templateType = isDATUM ? 'DATUM template' : 'Pool template';

  // Store DATUM state for the DATUM panel
  window._oceanDATUMActive = isDATUM;

  renderOceanPanel(oceanEH, lastBlockHeight, lastBlockAgo,
    '3hr avg · ' + templateType + ' · ocean.xyz/blocktemplate');
}

export function updateOceanFallback() {
  const share   = window._oceanSharePct || 2.3;
  const oceanEH = state.liveNetHashEH * (share / 100);
  renderOceanPanel(oceanEH, 'See ocean.xyz', 'proxy not active',
    'Estimated from ~' + share.toFixed(1) + '% avg share · deploy on Start9 for live ocean.xyz data');
}

export async function fetchOceanLive() {
  // Proxy only works on Start9 — skip entirely in local file mode
  if (!ON_START9) {
    updateOceanFallback();
    return;
  }
  try {
    // /blocktemplate is the correct page — it shows the HASHRATE banner,
    // LAST BLOCK, and DATUM template status.
    const resp = await fetch('/proxy/ocean/blocktemplate');
    if (!resp.ok) {
      // fallback to /dashboard
      const resp2 = await fetch('/proxy/ocean/dashboard');
      if (!resp2.ok) {
        // fallback to /stats
        const resp3 = await fetch('/proxy/ocean/stats');
        if (!resp3.ok) throw new Error('HTTP ' + resp3.status + ' on all ocean.xyz pages');
        const html3 = await resp3.text();
        return parseOceanHTML(html3);
      }
      const html2 = await resp2.text();
      return parseOceanHTML(html2);
    }
    const html = await resp.text();
    parseOceanHTML(html);

  } catch(e) {
    console.warn('fetchOceanLive scrape error:', e.message);
    // Fallback: mempool.space weekly average (CORS-safe on Start9/https)
    try {
      const [hrResp, poolsResp] = await Promise.all([
        fetch(MEMPOOL + '/v1/mining/pool/ocean/hashrate'),
        fetch(MEMPOOL + '/v1/mining/pools/1w')
      ]);
      const hrData    = await hrResp.json();
      const poolsData = await poolsResp.json();

      let oceanHashEH = 0;
      const raw = Array.isArray(hrData) ? hrData : (hrData.hashrates || []);
      if (raw.length > 0) oceanHashEH = raw[raw.length - 1].avgHashrate / 1e18;

      let oceanBlocks = 0, totalBlocks = 0;
      if (poolsData.pools) {
        totalBlocks = poolsData.pools.reduce((s, p) => s + (p.blockCount || 0), 0);
        const op = poolsData.pools.find(p =>
          (p.slug || '').toLowerCase().includes('ocean') ||
          (p.name || '').toLowerCase().includes('ocean'));
        if (op) oceanBlocks = op.blockCount || 0;
      }
      if (oceanHashEH === 0 && totalBlocks > 0)
        oceanHashEH = state.liveNetHashEH * (oceanBlocks / totalBlocks);

      renderOceanPanel(oceanHashEH, '—', 'see ocean.xyz',
        'weekly avg · mempool.space fallback (ocean.xyz scrape failed: ' + e.message + ')');

    } catch(e2) {
      console.warn('fetchOceanLive fallback error:', e2.message);
      updateOceanFallback();
    }
  }
}

export async function fetchOceanHashrateHistory() {
  if (!ON_START9) {
    // CORS-blocked from file:// — chart will show empty until deployed on Start9
    return;
  }
  try {
    const resp = await fetch(MEMPOOL + '/v1/mining/pool/ocean/hashrate');
    const data = await resp.json();
    const raw  = Array.isArray(data) ? data : (data.hashrates || []);

    if (!Array.isArray(data) && data.currentHashrate > 0) {
      window._oceanCurrentHashEH = data.currentHashrate / 1e18;
    }

    state.oceanHashData = raw
      .filter(d => d.avgHashrate > 0)
      .sort((a, b) => a.timestamp - b.timestamp);

    drawOceanHashChart(state.oceanChartRange);
  } catch(e) {
    console.warn('fetchOceanHashrateHistory:', e.message);
  }
}

export function setOceanRange(range, btn) {
  state.oceanChartRange = range;
  document.querySelectorAll('.ocean-range-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  drawOceanHashChart(range);
}

export function drawOceanHashChart(range) {
  if (!state.oceanHashData.length) return;

  const now   = Date.now() / 1000;
  const cutoffs = { '1m': 30*24*3600, '3m': 90*24*3600, '6m': 180*24*3600, '1y': 365*24*3600 };
  const filtered = range === 'all'
    ? state.oceanHashData
    : state.oceanHashData.filter(d => d.timestamp >= now - (cutoffs[range] || 30*24*3600));

  if (!filtered.length) return;

  const labels = filtered.map(d => {
    const dt = new Date(d.timestamp * 1000);
    return dt.toLocaleDateString('en-US', {month:'short', day:'numeric', year:'2-digit'});
  });
  const values = filtered.map(d => (d.avgHashrate / 1e18).toFixed(3));

  // Update axis labels
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const fmtDate = ts => { const d = new Date(ts*1000); return M[d.getMonth()] + ' ' + d.getDate() + ' \'' + String(d.getFullYear()).slice(2); };
  document.getElementById('ocean-chart-start').textContent = fmtDate(filtered[0].timestamp);
  const mid = filtered[Math.floor(filtered.length/2)];
  document.getElementById('ocean-chart-mid').textContent   = fmtDate(mid.timestamp);

  // Current — priority: 1) ocean.xyz 3hr scrape, 2) API currentHashrate (live estimate),
  // 3) latest weekly average. This matches what mempool.guide shows in its top template.
  const currentEH = (window._oceanHashEH && window._oceanHashEH > 0)
    ? window._oceanHashEH
    : (window._oceanCurrentHashEH && window._oceanCurrentHashEH > 0)
      ? window._oceanCurrentHashEH
      : state.oceanHashData[state.oceanHashData.length - 1].avgHashrate / 1e18;

  const currentSub = (window._oceanHashEH && window._oceanHashEH > 0)
    ? '3hr avg · live from ocean.xyz'
    : (window._oceanCurrentHashEH && window._oceanCurrentHashEH > 0)
      ? 'current · mempool.space/api (live estimate)'
      : 'weekly avg · mempool.space';
  const peakEntry  = state.oceanHashData.reduce((a,b) => a.avgHashrate > b.avgHashrate ? a : b);
  const avgEH      = filtered.reduce((s,d) => s + d.avgHashrate/1e18, 0) / filtered.length;

  // 30d trend
  const thirtyDaysAgo = now - 30*24*3600;
  const oldEntry = [...oceanHashData].reverse().find(d => d.timestamp <= thirtyDaysAgo);
  let trendStr = '—', trendColor = 'var(--text)';
  if (oldEntry) {
    const chg = ((currentEH - oldEntry.avgHashrate/1e18) / (oldEntry.avgHashrate/1e18)) * 100;
    trendStr  = (chg >= 0 ? '+' : '') + chg.toFixed(1) + '%';
    trendColor = chg >= 0 ? '#3B6D11' : '#A32D2D';
  }

  document.getElementById('ocg-current').textContent  = currentEH.toFixed(2) + ' EH/s';
  document.getElementById('ocg-current-sub').textContent = currentSub;
  document.getElementById('ocg-peak').textContent     = (peakEntry.avgHashrate/1e18).toFixed(2) + ' EH/s';
  document.getElementById('ocg-peak-date').textContent = fmtDate(peakEntry.timestamp);
  document.getElementById('ocg-avg').textContent      = avgEH.toFixed(2) + ' EH/s';
  document.getElementById('ocg-avg-label').textContent = range === 'all' ? 'all-time avg' : range + ' avg';
  document.getElementById('ocg-trend').textContent    = trendStr;
  document.getElementById('ocg-trend').style.color    = trendColor;
  document.getElementById('ocg-trend-sub').textContent = 'vs 30 days ago';

  // Draw Chart.js — hashrate (left y-axis, EH/s) + expected blocks/day (right y-axis)
  const isDark   = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const lineColor = '#0F6E56';
  const fillColor = isDark ? 'rgba(15,110,86,0.18)' : 'rgba(15,110,86,0.09)';
  const bpdColor  = '#BA7517';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const txtColor  = isDark ? '#6a6a66' : '#9a9a96';

  // Expected blocks/day = (OCEAN EH/s ÷ network EH/s) × 144 expected blocks per day.
  // Uses current state.liveNetHashEH as the divisor — a reasonable approximation since network
  // hashrate changes slowly relative to the weekly averaging period of state.oceanHashData.
  const netEH     = state.liveNetHashEH || 800;
  const bpdValues = filtered.map(d => +((d.avgHashrate / 1e18) / netEH * 144).toFixed(2));

  const canvas = document.getElementById('oceanHashChart');
  if (state.oceanHashChart2) { state.oceanHashChart2.destroy(); state.oceanHashChart2 = null; }

  state.oceanHashChart2 = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'OCEAN hashrate (EH/s)',
          data: values,
          borderColor: lineColor,
          backgroundColor: fillColor,
          fill: true,
          tension: 0.35,
          pointRadius: filtered.length > 60 ? 0 : 2,
          pointBackgroundColor: lineColor,
          borderWidth: 2,
          yAxisID: 'y',
        },
        {
          label: 'Blocks/day (expected)',
          data: bpdValues,
          borderColor: bpdColor,
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.35,
          pointRadius: 0,
          borderWidth: 1.5,
          borderDash: [4, 3],
          yAxisID: 'y2',
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? '#272724' : '#fff',
          titleColor: isDark ? '#e6e6e2' : '#1a1a18',
          bodyColor: isDark ? '#9e9e9a' : '#5c5c58',
          borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
          borderWidth: 1,
          callbacks: {
            label: ctx => ctx.datasetIndex === 0
              ? ' ' + parseFloat(ctx.raw).toFixed(3) + ' EH/s'
              : ' ~' + parseFloat(ctx.raw).toFixed(2) + ' blocks/day'
          }
        }
      },
      scales: {
        x: { ticks: { display: false }, grid: { color: gridColor } },
        y: {
          position: 'left',
          ticks: { color: txtColor, font: { size: 11 }, callback: v => v + ' EH', maxTicksLimit: 4 },
          grid: { color: gridColor }
        },
        y2: {
          position: 'right',
          ticks: { color: bpdColor, font: { size: 10 }, callback: v => v + ' blk/d', maxTicksLimit: 4 },
          grid: { drawOnChartArea: false }
        }
      }
    }
  });
}
