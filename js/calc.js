// calc.js — profitability calculator, scenario loader, combined signal, timing signals
import { state, scenarios } from './state.js';

export function updateTimingSignals(pct, avgMin, etaStr, daysLeft) {
  const sign = pct >= 0 ? '+' : '';
  const rows = [];
  if (pct <= -3) {
    rows.push(['dg', 'Difficulty dropping ' + pct.toFixed(2) + '% on ' + etaStr + ' — strong conditions to rent now', 'bg', 'Rent aggressively']);
  } else if (pct < -0.5) {
    rows.push(['dg', 'Difficulty dropping ' + pct.toFixed(2) + '% — favorable epoch ahead', 'bg', 'Rent now']);
  } else if (pct < 0.5) {
    rows.push(['db', 'Difficulty flat (' + sign + pct.toFixed(2) + '%) — neutral timing signal', 'bb', 'Neutral']);
  } else if (pct < 3) {
    rows.push(['da', 'Difficulty rising ' + sign + pct.toFixed(2) + '% on ' + etaStr + ' — yields compressing', 'ba', 'Rent with caution']);
  } else {
    rows.push(['dr', 'Difficulty surging ' + sign + pct.toFixed(2) + '% on ' + etaStr + ' — significant yield compression', 'br', 'Consider pausing']);
  }
  const blockNote = avgMin > 10.5
    ? ['dg', 'Block interval ' + avgMin.toFixed(2) + ' min — blocks slow, difficulty likely to drop', 'bg', 'Favorable']
    : avgMin < 9.5
    ? ['dr', 'Block interval ' + avgMin.toFixed(2) + ' min — blocks fast, difficulty will rise', 'br', 'Unfavorable']
    : ['db', 'Block interval ' + avgMin.toFixed(2) + ' min — near target (10 min)', 'bb', 'On target'];
  rows.push(blockNote);
  rows.push(['db', '~' + daysLeft.toFixed(1) + ' days until adjustment fires on ' + etaStr, 'bb', daysLeft.toFixed(1) + ' days']);

  document.getElementById('timing-signals').innerHTML = rows.map(r =>
    '<div class="sr"><div class="dot ' + r[0] + '"></div><div class="sl2">' + r[1] + '</div><span class="badge ' + r[2] + '">' + r[3] + '</span></div>'
  ).join('');
}

export function updateCombinedSignal() {
  if (!document.getElementById('cs-headline')) return; // panel not in DOM

  const diffPct   = state.liveDiffAdj ? state.liveDiffAdj.difficultyChange : 0;
  const rentDay   = parseFloat(document.getElementById('sl-rent').value) || 36;
  const netEH     = state.liveNetHashEH || 800;
  const btcPrice  = state.liveBTCPrice  || 94000;
  const hashTH    = parseFloat(document.getElementById('sl-hash').value) || 1000;
  const feePct    = parseFloat(document.getElementById('sl-fee').value)  || 2;
  const dailyBTC  = (hashTH / (netEH * 1e6)) * 144 * 3.125 * (1 - feePct / 100);
  const dailyRev  = dailyBTC * btcPrice;
  const blockRewardCS = 3.125 + state.liveAvgFeesPerBlock;
  const hpUSD     = (144 * blockRewardCS * btcPrice) / (netEH * 1e6);
  const hpUSDperPH = hpUSD * 1000;
  const marginPct = dailyRev > 0 ? ((dailyRev - rentDay) / dailyRev * 100) : -100;
  const hpMargin  = hpUSDperPH > 0 ? ((hpUSDperPH - rentDay) / hpUSDperPH * 100) : -100;
  const above30v60 = window._ribbonAbove !== undefined ? window._ribbonAbove : null;

  // Score each signal
  const diffScore = diffPct <= 0 ? 2 : diffPct < 5 ? 1 : 0;
  const hpScore   = hpMargin >= 15 ? 2 : hpMargin >= 0 ? 1 : 0;
  const ribScore  = above30v60 === true ? 2 : above30v60 === null ? 1 : 0;
  const mScore    = marginPct >= 15 ? 2 : marginPct >= 0 ? 1 : 0;
  const total     = diffScore + hpScore + ribScore + mScore;

  // Sub-signal rows
  const setRow = (dotId, txtId, badgeId, dotClass, text, badgeText, badgeClass) => {
    const d = document.getElementById(dotId); if (d) d.className = 'dot ' + dotClass;
    const t = document.getElementById(txtId); if (t) t.textContent = text;
    const b = document.getElementById(badgeId); if (b) { b.textContent = badgeText; b.className = badgeClass; }
  };
  setRow('cs-dot-diff','cs-diff-text','cs-diff-badge',
    diffPct<=0?'dg':diffPct<5?'da':'dr',
    (diffPct<=0?diffPct.toFixed(2)+'% dropping':'+'+diffPct.toFixed(2)+'% rising'),
    diffPct<=0?'Favourable':diffPct<5?'Caution':'Unfavourable',
    diffPct<=0?'badge bg':diffPct<5?'badge ba':'badge br');
  setRow('cs-dot-hp','cs-hp-text','cs-hp-badge',
    hpMargin>=15?'dg':hpMargin>=0?'da':'dr',
    '$'+hpUSDperPH.toFixed(2)+'/PH vs $'+rentDay.toFixed(0)+' cost — '+hpMargin.toFixed(0)+'% margin',
    hpMargin>=15?'Profitable':hpMargin>=0?'Thin':'Loss',
    hpMargin>=15?'badge bg':hpMargin>=0?'badge ba':'badge br');
  setRow('cs-dot-ribbon','cs-ribbon-text','cs-ribbon-badge',
    above30v60===true?'dg':above30v60===null?'db':'da',
    above30v60===true?'30D above 60D — recovery':above30v60===null?'Loading...':'30D below 60D — capitulation',
    above30v60===true?'Recovery':above30v60===null?'Loading':'Capitulation',
    above30v60===true?'badge bg':above30v60===null?'badge bb':'badge ba');
  setRow('cs-dot-margin','cs-margin-text','cs-margin-badge',
    marginPct>=15?'dg':marginPct>=0?'da':'dr',
    (marginPct>=0?'+':'')+marginPct.toFixed(1)+'% margin on $'+rentDay.toFixed(0)+'/day rental',
    marginPct>=15?'Strong':marginPct>=0?'Thin':'Loss',
    marginPct>=15?'badge bg':marginPct>=0?'badge ba':'badge br');

  const sb = document.getElementById('cs-score-bar');
  if (sb) { sb.style.width=(total/8*100).toFixed(0)+'%'; sb.style.background=total>=6?'#639922':total>=4?'#BA7517':'#A32D2D'; }
  const sl = document.getElementById('cs-score-label'); if (sl) sl.textContent = total+' of 8 signal points';

  const tG=document.getElementById('tl-green'), tA=document.getElementById('tl-amber'), tR=document.getElementById('tl-red');
  const hl=document.getElementById('cs-headline'), rs=document.getElementById('cs-reason'), ab=document.getElementById('cs-action-badge');
  if (!hl) return;
  [tG,tA,tR].forEach(t=>{if(t){t.style.background='var(--surface2)';t.style.boxShadow='none';}});
  if (total >= 6) {
    if(tG){tG.style.background='#639922';tG.style.boxShadow='0 0 12px rgba(99,153,34,0.6)';}
    hl.textContent='Optimal — rent and accumulate'; hl.style.color='var(--green-text)';
    rs.textContent=(diffPct<=0?'Difficulty dropping '+diffPct.toFixed(2)+'%':'+'+diffPct.toFixed(2)+'% rising')+' · hashprice '+hpMargin.toFixed(0)+'% above rental cost'+(above30v60===true?' · Hash Ribbon in recovery':'')+ '.';
    ab.textContent='Rent aggressively · HODL output'; ab.className='badge bg'; ab.style.fontSize='13px'; ab.style.padding='5px 14px';
  } else if (total >= 4) {
    if(tA){tA.style.background='#BA7517';tA.style.boxShadow='0 0 12px rgba(186,117,23,0.6)';}
    hl.textContent='Proceed with awareness'; hl.style.color='var(--amber-text)';
    rs.textContent='Mixed signals — '+total+' of 8 points. Monitor daily. '+(diffPct>3?'Difficulty rising fast.':'')+(hpMargin<10?' Margin thin.':'');
    ab.textContent='Rent — monitor daily'; ab.className='badge ba'; ab.style.fontSize='13px'; ab.style.padding='5px 14px';
  } else {
    if(tR){tR.style.background='#A32D2D';tR.style.boxShadow='0 0 12px rgba(163,45,45,0.6)';}
    hl.textContent=dailyRev-rentDay<0?'Pause — unprofitable':'Poor conditions — consider pausing'; hl.style.color='var(--red-text)';
    rs.textContent='Only '+total+' of 8 signal points positive. '+(dailyRev-rentDay<0?'Currently losing $'+Math.abs(dailyRev-rentDay).toFixed(2)+'/day.':'Margin too thin.');
    ab.textContent=dailyRev-rentDay<0?'Stop rental now':'Pause or reduce'; ab.className='badge br'; ab.style.fontSize='13px'; ab.style.padding='5px 14px';
  }
}

export function loadScenario(key, btn) {
  // scenarios are data objects — apply overrides to sliders then recalc
  if (key === 'live') {
    // restore live values from state
    const p = document.getElementById('sl-price');
    const n = document.getElementById('sl-net');
    const f = document.getElementById('sl-fee');
    if (p) { p.value = state.liveBTCPrice; }
    if (n) { n.value = state.liveNetHashEH; }
    if (f) { f.value = 0; }
  } else {
    const s = scenarios[key];
    if (!s) { console.warn('loadScenario: unknown key', key); return; }
    if (s.btc      != null) { const el = document.getElementById('sl-price'); if (el) el.value = s.btc; }
    if (s.netEH    != null) { const el = document.getElementById('sl-net');   if (el) el.value = s.netEH; }
    if (s.diffPct  != null) {
      const base = parseFloat(document.getElementById('sl-net').value) || state.liveNetHashEH;
      const el = document.getElementById('sl-net');
      if (el) el.value = (base * (1 + s.diffPct / 100)).toFixed(0);
    }
    if (s.fee      != null) { const el = document.getElementById('sl-fee');   if (el) el.value = s.fee; }
  }
  document.querySelectorAll('.scen-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  calc();
}

export function calc() {
  const hashTH = parseFloat(document.getElementById('sl-hash').value);
  const rentDay = parseFloat(document.getElementById('sl-rent').value);
  const netEH = parseFloat(document.getElementById('sl-net').value);
  const btcPrice = parseFloat(document.getElementById('sl-price').value);
  const feePct = parseFloat(document.getElementById('sl-fee').value);

  document.getElementById('lbl-hash').textContent = hashTH.toLocaleString() + ' TH/s';
  document.getElementById('lbl-rent').textContent = '$' + rentDay.toFixed(0) + '/day';
  document.getElementById('lbl-net').textContent = netEH.toFixed(0) + ' EH/s';
  document.getElementById('lbl-price').textContent = '$' + btcPrice.toLocaleString();
  document.getElementById('lbl-fee').textContent = feePct + '% ' + (feePct === 1 ? '(DATUM)' : '(standard)');

  const netTH = netEH * 1e6;
  const dailyBTC = (hashTH / netTH) * 144 * 3.125 * (1 - feePct / 100);
  const dailyRev = dailyBTC * btcPrice;
  const dailyProfit = dailyRev - rentDay;
  const monthlyProfit = dailyProfit * 30;
  const bePriceBTC = rentDay / dailyBTC;
  const daysToThreshold = 0.01048576 / dailyBTC;

  document.getElementById('r-btc').textContent = dailyBTC.toFixed(6);
  document.getElementById('r-rev').textContent = '$' + Math.round(dailyRev);
  document.getElementById('r-cost').textContent = '$' + rentDay.toFixed(0);

  const fmtProfit = (el, v) => {
    el.textContent = (v >= 0 ? '+$' : '-$') + Math.abs(Math.round(v)).toLocaleString();
    el.style.color = v >= 0 ? '#3B6D11' : '#A32D2D';
  };
  fmtProfit(document.getElementById('r-profit'), dailyProfit);
  fmtProfit(document.getElementById('r-monthly'), monthlyProfit);
  fmtProfit(document.getElementById('m-profit'), dailyProfit);
  fmtProfit(document.getElementById('t-net'), monthlyProfit);

  document.getElementById('r-be').textContent = '$' + Math.round(bePriceBTC).toLocaleString();
  document.getElementById('r-threshold').textContent = '~' + Math.ceil(daysToThreshold) + ' days';

  document.getElementById('m-btc').textContent = dailyBTC.toFixed(6);
  document.getElementById('m-usd').textContent = '~$' + Math.round(dailyRev) + ' at $' + (btcPrice/1000).toFixed(0) + 'K BTC';
  const marginPct = dailyRev > 0 ? (dailyProfit / dailyRev) * 100 : -100;
  document.getElementById('m-margin').textContent = (marginPct >= 0 ? '+' : '') + marginPct.toFixed(1) + '% margin';

  document.getElementById('header-sub').textContent =
    hashTH.toLocaleString() + ' TH/s rented · $' + rentDay.toFixed(2) + '/day · mempool.space API · auto-refreshes every 60s';
  document.getElementById('m-be').textContent = '$' + Math.round(bePriceBTC).toLocaleString();
  document.getElementById('m-be-sub').textContent = 'to cover $' + rentDay.toFixed(2) + '/day rental';

  // Hashprice — USD per PH/s per day from live network data
  // Uses state.liveNetHashEH (from mempool.space) as denominator — more accurate than slider.
  // Block reward = subsidy (3.125) + avg tx fees over last 24h from mempool.space.
  const hpNetTH       = state.liveNetHashEH > 0 ? state.liveNetHashEH * 1e6 : networkTH;
  const avgBlockMin   = state.liveDiffAdj ? state.liveDiffAdj.timeAvg / 60000 : 10;
  const blkPerDay     = (10 / avgBlockMin) * 144;
  const blockReward   = 3.125 + state.liveAvgFeesPerBlock;
  const hpUSDperTH    = (blkPerDay * blockReward * btcPrice) / hpNetTH;
  const hpUSDperPH    = hpUSDperTH * 1000;
  const feeContribPct = state.liveAvgFeesPerBlock > 0
    ? (state.liveAvgFeesPerBlock / blockReward * 100).toFixed(1) + '% fees'
    : 'subsidy only';
  document.getElementById('m-hashprice').textContent     = '$' + hpUSDperPH.toFixed(2);
  document.getElementById('m-hashprice-sub').textContent =
    '$' + hpUSDperTH.toFixed(4) + '/TH · ' + blkPerDay.toFixed(1) + ' blk/day · ' + feeContribPct;

  document.getElementById('t-cost').textContent = '$' + Math.round(rentDay * 30).toLocaleString();
  document.getElementById('t-btc').textContent = (dailyBTC * 30).toFixed(5) + ' BTC';
  document.getElementById('t-rev').textContent = '$' + Math.round(dailyRev * 30).toLocaleString();
  document.getElementById('t-basis').textContent = '~$' + Math.round(bePriceBTC).toLocaleString() + '/BTC';
  document.getElementById('ocean-threshold-days').textContent = '~' + Math.ceil(daysToThreshold) + ' days';

  // Update OCEAN blocks/day and share using live values if available
  if (window._oceanHashEH && state.liveNetHashEH > 0) {
    const liveBPD = (window._oceanHashEH / state.liveNetHashEH) * 144;
    document.getElementById('ocean-bpd').textContent = '~' + liveBPD.toFixed(1) + ' / day';
    const liveShare = (window._oceanHashEH / state.liveNetHashEH * 100).toFixed(2);
    document.getElementById('ocean-share').textContent = liveShare + '%';
    document.getElementById('ocean-share-sub').textContent = 'of ' + state.liveNetHashEH.toFixed(1) + ' EH/s network';
  }
  const dec = document.getElementById('dec-out');
  const decBanner = document.getElementById('dec-banner');
  if (dailyProfit < 0) {
    dec.innerHTML = '<div class="dec dc"><div class="dt2">Pause rental — unprofitable at current BTC price</div><div class="db3">BTC needs to reach $' + Math.round(bePriceBTC).toLocaleString() + ' to break even on your $' + rentDay.toFixed(0) + '/day rental. Stop now — zero stranded cost. Restart when price recovers. Factor in OCEAN\'s 8-block onboarding window when you reconnect.</div></div>';
  } else if (marginPct < 20) {
    dec.innerHTML = '<div class="dec dw"><div class="dt2">Caution — thin margin, manage carefully</div><div class="db3">Profitable but margin below 20%. Consider selling BTC daily to lock in fiat profit rather than accumulating. Watch the difficulty forecast above closely — a drop will improve yield, a rise will compress it further.</div></div>';
  } else {
    dec.innerHTML = '<div class="dec dm"><div class="dt2">Mine and accumulate — solid conditions</div><div class="db3">Strong ' + marginPct.toFixed(0) + '% margin. Cost basis ~$' + Math.round(bePriceBTC).toLocaleString() + '/BTC is well below spot. OCEAN\'s TIDES passes full transaction fees — any fee spikes are an additional bonus. Monitor difficulty forecast for timing decisions.</div></div>';
  }
  updateCombinedSignal();
  if (decBanner) decBanner.innerHTML = dec.innerHTML; // mirror to top-of-page banner
  if (typeof hpRefresh === 'function') hpRefresh();

  // Update P&L tracker today estimate and re-render log
  const pnlTodayEl = document.getElementById('pnl-today-est');
  if (pnlTodayEl) {
    pnlTodayEl.textContent = (dailyProfit >= 0 ? '+$' : '-$') + Math.abs(dailyProfit).toFixed(2);
    pnlTodayEl.style.color = dailyProfit >= 0 ? 'var(--green-text)' : 'var(--red-text)';
  }
  if (typeof pnlRender === 'function') pnlRender();
}
