// fetch.js — Core network data: difficulty, hashrate, price, fees
import { state, ON_START9, MEMPOOL } from './state.js';
import { drawHashChart } from './charts.js';
import { calc, updateTimingSignals, updateCombinedSignal } from './calc.js';
import { hpRefresh } from './hashprice.js';
import { fetchOceanLive, updateOceanFallback } from './ocean.js';
import { fetchKnotsDistribution } from './network.js';

export async function fetchDifficultyAdjustment() {
  const r = await fetch(MEMPOOL + '/v1/difficulty-adjustment');
  const d = await r.json();
  state.liveDiffAdj = d;

  const pct = d.difficultyChange;
  const progress = d.progressPercent;
  const remaining = d.remainingBlocks;
  const prevPct = d.previousRetarget;
  const avgMin = d.timeAvg / 60000;
  const retargetHeight = d.nextRetargetHeight;

  // Compute ETA from remainingTime (ms) added to now — avoids all timezone issues
  // remainingTime is in milliseconds per the mempool.space API spec
  const remainingMs = d.remainingTime;
  const etaMs = Date.now() + remainingMs;
  const eta = new Date(etaMs);
  const daysLeft = remainingMs / 1000 / 60 / 60 / 24;

  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const etaStr = M[eta.getMonth()] + ' ' + eta.getDate() + ', ' + eta.getFullYear();

  // Big arrow + percent
  const arrow = pct > 0.5 ? '↑' : pct < -0.5 ? '↓' : '→';
  const arrowClass = pct > 0.5 ? 'diff-up' : pct < -0.5 ? 'diff-down' : 'diff-flat';
  const sign = pct >= 0 ? '+' : '';
  document.getElementById('diff-arrow').textContent = arrow;
  document.getElementById('diff-arrow').className = 'diff-arrow ' + arrowClass;
  document.getElementById('diff-pct-big').innerHTML =
    '<span class="' + arrowClass + '">' + sign + pct.toFixed(2) + '%</span> projected difficulty change';
  document.getElementById('diff-description').textContent =
    'Blocks averaging ' + avgMin.toFixed(2) + ' min (target 10.00 min). ' +
    'Previous adjustment: ' + (prevPct >= 0 ? '+' : '') + prevPct.toFixed(2) + '%.';

  document.getElementById('diff-eta').textContent = etaStr;
  document.getElementById('diff-blocks-remain').textContent = remaining.toLocaleString() + ' blocks · ~' + daysLeft.toFixed(1) + ' days';

  // Epoch bar
  document.getElementById('epoch-bar').style.width = Math.min(progress,100).toFixed(1) + '%';
  document.getElementById('epoch-bar2').style.width = Math.min(progress,100).toFixed(1) + '%';
  const mined = Math.round(2016 * progress / 100);
  document.getElementById('epoch-progress-label').textContent = mined.toLocaleString() + ' of 2,016 blocks mined this epoch';
  document.getElementById('epoch-pct-label').textContent = progress.toFixed(1) + '%';
  document.getElementById('epoch-label2').textContent = mined.toLocaleString() + ' of 2,016 blocks mined';
  document.getElementById('epoch-eta2').textContent = '~' + daysLeft.toFixed(1) + ' days remaining';

  // Detail metrics
  document.getElementById('da-progress').textContent = progress.toFixed(1) + '%';
  document.getElementById('da-remaining').textContent = remaining.toLocaleString();
  document.getElementById('da-prev').textContent = (prevPct >= 0 ? '+' : '') + prevPct.toFixed(2) + '%';
  document.getElementById('da-height').textContent = retargetHeight ? retargetHeight.toLocaleString() : '—';

  // Signal box
  let sigClass, sigMsg;
  if (pct <= -3) {
    sigClass = 'info-green';
    sigMsg = 'Strong buy signal: difficulty dropping ' + pct.toFixed(2) + '% in ~' + daysLeft.toFixed(1) + ' days. Your same rental will produce significantly more BTC after adjustment. Rent now and consider increasing hashrate.';
  } else if (pct < -0.5) {
    sigClass = 'info-green';
    sigMsg = 'Favorable: difficulty dropping ' + pct.toFixed(2) + '% on ' + etaStr + '. Good time to rent — your BTC yield will improve after the adjustment.';
  } else if (pct < 0.5) {
    sigClass = 'info-blue';
    sigMsg = 'Neutral: difficulty essentially flat (' + sign + pct.toFixed(2) + '%). No timing advantage — focus on BTC price vs your breakeven.';
  } else if (pct < 3) {
    sigClass = 'info-amber';
    sigMsg = 'Caution: difficulty rising +' + pct.toFixed(2) + '% on ' + etaStr + '. Each dollar of rental buys slightly less BTC. Consider waiting for the next epoch if the increase is large.';
  } else {
    sigClass = 'info-box'; sigClass += ' info-amber';
    sigMsg = 'Unfavorable: difficulty surging +' + pct.toFixed(2) + '%. Each dollar buys significantly less BTC than today. Consider pausing the rental and waiting for the adjustment to pass.';
  }
  const sigEl = document.getElementById('diff-signal');
  sigEl.className = 'info-box ' + sigClass;
  sigEl.textContent = sigMsg;

  // Timing signals section
  updateTimingSignals(pct, avgMin, etaStr, daysLeft);
}

export async function fetchHashrate() {
  const r = await fetch(MEMPOOL + '/v1/mining/hashrate/3d');
  const d = await r.json();

  state.liveNetHashEH = d.currentHashrate / 1e18;

  // Update live metric
  document.getElementById('live-hashrate').textContent = state.liveNetHashEH.toFixed(1) + ' EH/s';
  document.getElementById('live-hashrate-sub').textContent =
    (state.liveNetHashEH * 1000).toFixed(0) + ' PH/s total network';

  // Current difficulty
  const diff = d.currentDifficulty;
  document.getElementById('live-difficulty').textContent = (diff / 1e12).toFixed(2) + 'T';
  document.getElementById('live-diff-sub').textContent = diff.toExponential(2);

  // Draw 3-day chart
  const rates = d.hashrates;
  if (rates && rates.length > 1) {
    const chartMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const labels = rates.map(h => {
      const d2 = new Date(h.timestamp * 1000);
      const hh = String(d2.getUTCHours()).padStart(2,'0');
      const mm = String(d2.getUTCMinutes()).padStart(2,'0');
      return chartMonths[d2.getUTCMonth()] + ' ' + d2.getUTCDate() + ' ' + hh + ':' + mm + ' UTC';
    });
    const values = rates.map(h => (h.avgHashrate / 1e18).toFixed(2));
    drawHashChart(labels, values);
  }

  // Update slider
  const slNet = document.getElementById('sl-net');
  slNet.value = Math.round(state.liveNetHashEH / 10) * 10;
  document.getElementById('net-override-note').textContent =
    'Live value: ' + state.liveNetHashEH.toFixed(1) + ' EH/s (auto-set from mempool.space)';

  // Update OCEAN stats — use live scraped value or fall back to 2.3% share estimate
  const oceanEH = window._oceanHashEH || (state.liveNetHashEH * 0.023);
  const oceanNetShare = (oceanEH / state.liveNetHashEH * 100).toFixed(2);
  document.getElementById('ocean-share').textContent = '~' + oceanNetShare + '%';
  const oceanBPD = (oceanEH / state.liveNetHashEH) * 144;
  document.getElementById('ocean-bpd').textContent = '~' + oceanBPD.toFixed(1) + ' blocks/day';

  // Keep hashprice page live number in sync
  if (typeof hpRefresh === 'function') hpRefresh();
}

export async function fetchHashrateHistory() {
  if (!ON_START9) { drawHashRibbon(); return; }
  try {
    const r = await fetch(MEMPOOL + '/v1/mining/hashrate/2y');
    const d = await r.json();
    const raw = Array.isArray(d) ? d : (d.hashrates || []);
    if (raw.length > 0) {
      state.networkHashrateHistory = raw.filter(p => p.avgHashrate > 0).sort((a,b) => a.timestamp - b.timestamp);
      drawHashRibbon();
      updateCombinedSignal();
    }
  } catch(e) {
    console.warn('fetchHashrateHistory:', e.message);
    drawHashRibbon();
  }
}

export async function fetchPrice() {
  const r = await fetch(MEMPOOL + '/v1/prices');
  const d = await r.json();
  state.liveBTCPrice = d.USD;
  document.getElementById('live-price').textContent = '$' + state.liveBTCPrice.toLocaleString();
  document.getElementById('live-price-sub').textContent = 'Last updated live';

  // Update slider
  const slPrice = document.getElementById('sl-price');
  slPrice.value = Math.round(state.liveBTCPrice / 1000) * 1000;
  document.getElementById('price-override-note').textContent =
    'Live value: $' + state.liveBTCPrice.toLocaleString() + ' (auto-set from mempool.space)';

  // Block time from difficulty adj if available
  if (state.liveDiffAdj) {
    const avg = state.liveDiffAdj.timeAvg / 60000;
    document.getElementById('live-blocktime').textContent = avg.toFixed(2) + ' min';
  }

  calc(); // recalculate hashprice and all derived values at new BTC price
  if (typeof hpRefresh === 'function') hpRefresh(); // keep hashprice page in sync
}

export async function fetchAvgFees() {
  const r = await fetch(MEMPOOL + '/v1/mining/blocks/fees/24h');
  const d = await r.json();
  if (!Array.isArray(d) || d.length === 0) return;
  // avgFees field is in satoshis per block
  const totalSats = d.reduce((sum, b) => sum + (b.avgFees || 0), 0);
  state.liveAvgFeesPerBlock = (totalSats / d.length) / 1e8; // convert sats → BTC
  console.log('[fetchAvgFees] avg fees/block (24h):', state.liveAvgFeesPerBlock.toFixed(4), 'BTC (' + d.length + ' blocks)');
}

export async function fetchAll() {
  document.getElementById('last-updated').textContent = 'Updating...';
  document.getElementById('last-updated').style.color = '';

  const CORE_LABELS = ['difficulty', 'price', 'fees'];

  // Core fetches — always run (these three endpoints work everywhere)
  // NOTE: fetchHashrate runs on its own slower interval (every 5 min) to avoid
  // hitting the mempool.space rate limit of 100 req/hour on /v1/mining/hashrate/3d
  const coreResults = await Promise.allSettled([
    fetchDifficultyAdjustment(),
    fetchPrice(),
    fetchAvgFees()
  ]);

  // Extended fetches — only run on Start9 where proxy removes CORS
  if (ON_START9) {
    await Promise.allSettled([
      fetchOceanLive(),
      fetchBIP110Live(),
      fetchKnotsDistribution(),
    ]);
  } else {
    updateOceanFallback();
    updateBIP110Fallback();
  }

  const now = new Date();
  const ts  = now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});
  const el  = document.getElementById('last-updated');

  const failures = coreResults
    .map((r, i) => r.status === 'rejected' ? CORE_LABELS[i] : null)
    .filter(Boolean);

  if (failures.length === 0) {
    el.textContent = 'Updated ' + ts + (ON_START9 ? ' · Start9' : ' · local');
    el.style.color = '';
  } else {
    el.textContent = 'Partial update ' + ts + ' · failed: ' + failures.join(', ');
    el.style.color = 'var(--amber-text)';
    console.warn('fetchAll failures:', failures.map((label, i) =>
      label + ': ' + (coreResults[CORE_LABELS.indexOf(label)]?.reason?.message || 'unknown')
    ));
  }

  calc();
}
