// miner.js — My Stats: miner stats parsing, worker management, DATUM detection, block alerts
// Note: findBTC, findNum, findHashrate, scanAllHashrates, findHashrateNearLabel are
// inner functions nested inside parseMinerStats — they are not exported separately.
import { state, ON_START9 } from './state.js';
import { parseHashrateVal, fmtHashrate, isValidBTCAddress } from './utils.js';

export function addBlockAnnotation(height) {
  // Add a visual marker to the OCEAN hashrate chart
  if (!state.oceanHashChart2 || !state.oceanHashData.length) return;
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const existingNote = document.getElementById('ocean-block-found-note');
  if (existingNote) existingNote.remove();
  const note = document.createElement('div');
  note.id = 'ocean-block-found-note';
  note.style.cssText = 'font-size:11px;font-weight:500;padding:3px 8px;border-radius:4px;margin-top:4px;display:inline-block;' +
    (isDark ? 'background:#182c0a;color:#97C459' : 'background:var(--green-bg);color:var(--green-text)');
  note.textContent = '⬛ OCEAN found block #' + height.toLocaleString();
  const chart = document.getElementById('oceanHashChart');
  if (chart && chart.parentNode) chart.parentNode.appendChild(note);

  // Show global alert banner across all pages
  showBlockAlert(height);
}

export function showBlockAlert(height) {
  const banner = document.getElementById('block-alert-banner');
  const text   = document.getElementById('block-alert-text');
  if (!banner || !text) return;
  text.textContent = '⬛ OCEAN found block #' + height.toLocaleString() + ' — earnings incoming!';
  banner.style.display = 'flex';
  // Auto-dismiss after 5 minutes
  clearTimeout(state.blockAlertTimer);
  state.blockAlertTimer = setTimeout(dismissBlockAlert, 5 * 60 * 1000);
}

export function dismissBlockAlert() {
  const banner = document.getElementById('block-alert-banner');
  if (banner) banner.style.display = 'none';
  clearTimeout(state.blockAlertTimer);
}

export function viewRawHTML() {
  // Opens a new tab showing the raw HTML returned by the ocean.xyz proxy
  // This lets us see the actual structure to fix regex parsers
  const addr = document.getElementById('ocean-address-input').value.trim();
  if (!ON_START9) {
    alert('Raw HTML viewer only works on Start9 (requires nginx proxy).');
    return;
  }
  const target = addr && isValidBTCAddress(addr)
    ? '/proxy/ocean/stats/' + addr
    : '/proxy/ocean/dashboard';
  window.open(target, '_blank');
}

export function updateOceanLinks() {
  const raw = document.getElementById('ocean-address-input').value.trim();
  const btn = document.getElementById('ocean-go-btn');
  const msg = document.getElementById('ocean-addr-msg');

  if (!raw) {
    btn.style.opacity = '0.4'; btn.style.pointerEvents = 'none';
    msg.textContent = 'Enter your Bitcoin address to load live miner stats (Start9 only).';
    msg.style.color = 'var(--text3)';
    return;
  }
  if (!isValidBTCAddress(raw)) {
    btn.style.opacity = '0.4'; btn.style.pointerEvents = 'none';
    msg.textContent = '⚠ Address format not recognised — should start with bc1, 1, or 3.';
    msg.style.color = 'var(--amber-text)';
    return;
  }
  btn.style.opacity = '1'; btn.style.pointerEvents = 'auto';
  msg.textContent = '✓ Valid address — click Load Stats to fetch live data from ocean.xyz';
  msg.style.color = 'var(--green-text)';

  // Update quick links
  const base = 'https://ocean.xyz';
  document.getElementById('lnk-stats').href    = base + '/stats/' + raw;
  document.getElementById('lnk-workers').href  = base + '/stats/' + raw + '#workers';
  document.getElementById('lnk-payouts').href  = base + '/stats/' + raw + '#payouts';
  document.getElementById('lnk-blocks').href   = base + '/stats/' + raw + '#blocks';
  if (document.getElementById('ocean-addr-display'))
    document.getElementById('ocean-addr-display').textContent = raw;

  try { sessionStorage.setItem('ocean_btc_address', raw); } catch(_) {}
  try { localStorage.setItem('ocean_btc_address', raw); } catch(_) {}
}

export function updateWorkerLinks() {
  const addr   = document.getElementById('ocean-address-input').value.trim();
  const worker = document.getElementById('ocean-worker-input').value.trim();
  const btn    = document.getElementById('worker-go-btn');
  const msg    = document.getElementById('worker-msg');
  const panel  = document.getElementById('worker-links-panel');

  if (!worker) {
    btn.style.opacity = '0.4'; btn.style.pointerEvents = 'none';
    msg.textContent = ''; panel.style.display = 'none'; return;
  }
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(worker)) {
    btn.style.opacity = '0.4'; btn.style.pointerEvents = 'none';
    msg.textContent = '⚠ Worker name: letters, numbers, hyphens, underscores only.';
    msg.style.color = 'var(--amber-text)';
    panel.style.display = 'none'; return;
  }
  btn.style.opacity = '1'; btn.style.pointerEvents = 'auto';
  msg.textContent = '✓ Worker "' + worker + '" links ready.';
  msg.style.color = 'var(--green-text)';

  const fullId = addr + '.' + worker;
  const base   = 'https://ocean.xyz';
  document.getElementById('lnk-worker-stats').href    = base + '/stats/' + fullId;
  document.getElementById('lnk-worker-payouts').href  = base + '/stats/' + fullId + '#payouts';
  document.getElementById('lnk-worker-hashrate').href = base + '/stats/' + fullId + '#hashrate';
  document.getElementById('lnk-worker-blocks').href   = base + '/stats/' + fullId + '#blocks';
  document.getElementById('worker-full-id').textContent = fullId;
  panel.style.display = 'block';
  try { sessionStorage.setItem('ocean_worker_name', worker); } catch(_) {}
  try { localStorage.setItem('ocean_worker_name', worker); } catch(_) {}
}

export function openOceanStats() {
  const raw = document.getElementById('ocean-address-input').value.trim();
  if (isValidBTCAddress(raw)) window.open('https://ocean.xyz/stats/' + raw, '_blank');
}

export function openWorkerStats() {
  const addr   = document.getElementById('ocean-address-input').value.trim();
  const worker = document.getElementById('ocean-worker-input').value.trim();
  if (addr && worker) window.open('https://ocean.xyz/stats/' + addr + '.' + worker, '_blank');
}

export function clearOceanAddress() {
  document.getElementById('ocean-address-input').value = '';
  document.getElementById('ocean-worker-input').value  = '';
  document.getElementById('miner-stats-panel').style.display = 'none';
  if (state.minerStatsInterval) { clearInterval(state.minerStatsInterval); state.minerStatsInterval = null; }
  try { sessionStorage.removeItem('ocean_btc_address'); sessionStorage.removeItem('ocean_worker_name'); } catch(_) {}
  try { localStorage.removeItem('ocean_btc_address');   localStorage.removeItem('ocean_worker_name');   } catch(_) {}
  updateOceanLinks();
  updateWorkerLinks();
}

export async function fetchMinerStats(addr) {
  try {
    const resp = await fetch('/proxy/ocean/stats/' + addr);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const html = await resp.text();

    parseMinerStats(html, addr);

    const now = new Date();
    document.getElementById('miner-last-updated').textContent =
      '— updated ' + now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});
    document.getElementById('ocean-addr-msg').textContent = '✓ Live data loaded from ocean.xyz';
    document.getElementById('ocean-addr-msg').style.color = 'var(--green-text)';

  } catch(e) {
    console.warn('fetchMinerStats:', e.message);
    document.getElementById('ocean-addr-msg').textContent = '⚠ Fetch failed: ' + e.message;
    document.getElementById('ocean-addr-msg').style.color = 'var(--amber-text)';
  }
}

export async function loadMinerStats() {
  const raw = document.getElementById('ocean-address-input').value.trim();
  if (!isValidBTCAddress(raw)) return;

  if (!ON_START9) {
    document.getElementById('ocean-addr-msg').textContent =
      '⚠ Live stats require Start9 — the nginx proxy at /proxy/ocean/ is needed to fetch ocean.xyz data.';
    document.getElementById('ocean-addr-msg').style.color = 'var(--amber-text)';
    return;
  }

  document.getElementById('miner-stats-panel').style.display = 'block';
  document.getElementById('ocean-addr-msg').textContent = 'Loading live stats from ocean.xyz...';
  document.getElementById('ocean-addr-msg').style.color = 'var(--text3)';

  await fetchMinerStats(raw);

  // Auto-refresh every 60s
  if (state.minerStatsInterval) clearInterval(state.minerStatsInterval);
  state.minerStatsInterval = setInterval(() => fetchMinerStats(raw), 60000);
}

export function parseMinerStats(html, addr) {
  const btcP = state.liveBTCPrice || 94000;

  // ── DEBUG: store raw HTML for inspection ─────────────────────────────────
  window._lastMinerHTML = html;

  // ── Helper: find value after a label anywhere in the page ─────────────────
  // Tries multiple strategies to find numeric values near label text
  function findBTC(labelPatterns) {
    for (const pat of labelPatterns) {
      // Strategy 1: label then BTC value within 300 chars
      const m1 = html.match(new RegExp(pat + '[\\s\\S]{0,300}?([\\d]+\\.?[\\d]*(?:\\.[\\d]+)?)\\s*(?:BTC|btc)', 'i'));
      if (m1 && parseFloat(m1[1]) >= 0) return parseFloat(m1[1]);
      // Strategy 2: BTC value then label within 200 chars
      const m2 = html.match(new RegExp('([\\d]+\\.?[\\d]*)\\s*(?:BTC|btc)[\\s\\S]{0,200}?' + pat, 'i'));
      if (m2 && parseFloat(m2[1]) >= 0) return parseFloat(m2[1]);
    }
    return null;
  }

  function findNum(labelPatterns) {
    for (const pat of labelPatterns) {
      const m = html.match(new RegExp(pat + '[\\s\\S]{0,200}?([\\d,]+\\.?[\\d]*)', 'i'));
      if (m) return m[1].replace(/,/g, '');
    }
    return null;
  }

  // ── Enhanced hashrate finder: tries label→value AND value←label, wide window ──
  function findHashrate(labelPatterns) {
    for (const pat of labelPatterns) {
      // Strategy 1: label then hashrate (up to 800 chars — handles deeply nested tables)
      const m1 = html.match(new RegExp(pat + '[\\s\\S]{0,800}?([\\d.]+)\\s*([TPEGMtpegm])h\\/s', 'i'));
      if (m1) return fmtHashrate(parseHashrateVal(m1[1] + ' ' + m1[2] + 'h/s'));
      // Strategy 2: hashrate then label (value appears before label in DOM)
      const m2 = html.match(new RegExp('([\\d.]+)\\s*([TPEGMtpegm])h\\/s[\\s\\S]{0,400}?' + pat, 'i'));
      if (m2) return fmtHashrate(parseHashrateVal(m2[1] + ' ' + m2[2] + 'h/s'));
    }
    return null;
  }

  // ── Full-page hashrate scan: collects ALL (position, value) pairs ──────────
  // Used as fallback when label patterns don't match — maps positions to time labels
  function scanAllHashrates() {
    const results = [];
    const re = /([\d.]+)\s*([TPEGMtpegm])h\/s/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      const ths = parseHashrateVal(m[1] + ' ' + m[2] + 'h/s');
      if (ths > 0) results.push({ pos: m.index, ths, fmt: fmtHashrate(ths) });
    }
    return results;
  }

  // Find nearest hashrate to a label pattern within the page
  function findHashrateNearLabel(labelPatterns, allRates) {
    for (const pat of labelPatterns) {
      const re = new RegExp(pat, 'i');
      const lm = re.exec(html);
      if (!lm) continue;
      const labelPos = lm.index;
      // Find closest hashrate value by character distance
      let best = null, bestDist = Infinity;
      for (const r of allRates) {
        const dist = Math.abs(r.pos - labelPos);
        if (dist < bestDist) { bestDist = dist; best = r; }
      }
      if (best && bestDist < 1500) return best.fmt;
    }
    return null;
  }

  // ── Earnings ──────────────────────────────────────────────────────────────
  const unpaidBTC   = findBTC(['unpaid', 'Unpaid Earnings', 'unpaid_earnings']) ?? 0;
  const nextBlkBTC  = findBTC(['next block', 'Next Block', 'estimated.*next', 'payout.*next']) ?? 0;
  const dailyBTC    = findBTC(['per day', 'Per Day', 'daily', 'est.*day', 'earnings.*day']) ?? 0;
  const lifetimeBTC = findBTC(['lifetime', 'Lifetime', 'total.*earned', 'all.*time']) ?? 0;
  const sharesVal   = findNum(['shares.*window', 'reward window', 'Shares in']) ?? '—';

  const fmt6 = v => v.toFixed(6) + ' BTC';
  const fmtU = v => '~$' + (v * btcP).toFixed(2);

  document.getElementById('ms-unpaid').textContent     = unpaidBTC > 0 ? fmt6(unpaidBTC) : '—';
  document.getElementById('ms-unpaid-usd').textContent  = unpaidBTC > 0 ? fmtU(unpaidBTC) : 'not yet loaded';
  document.getElementById('ms-next-block').textContent  = nextBlkBTC > 0 ? fmt6(nextBlkBTC) : 'Below threshold';
  document.getElementById('ms-daily').textContent      = dailyBTC > 0 ? fmt6(dailyBTC) : '—';
  document.getElementById('ms-daily-usd').textContent   = dailyBTC > 0 ? fmtU(dailyBTC) : '—';
  document.getElementById('ms-lifetime').textContent   = lifetimeBTC > 0 ? fmt6(lifetimeBTC) : '—';
  document.getElementById('ms-lifetime-usd').textContent = lifetimeBTC > 0 ? fmtU(lifetimeBTC) : '—';
  document.getElementById('ms-shares').textContent     = sharesVal;

  // ── Payout progress bar ───────────────────────────────────────────────────
  const threshold = 0.01048576;
  const pct = Math.min((unpaidBTC / threshold) * 100, 100);
  document.getElementById('payout-bar').style.width = pct.toFixed(1) + '%';
  document.getElementById('pb-unpaid').textContent  = unpaidBTC > 0 ? fmt6(unpaidBTC) : '—';
  document.getElementById('pb-pct').textContent     = pct.toFixed(1) + '%';
  document.getElementById('pb-eta').textContent     = dailyBTC > 0 && unpaidBTC < threshold
    ? '~' + ((threshold - unpaidBTC) / dailyBTC).toFixed(1) + ' days to threshold'
    : unpaidBTC >= threshold ? 'Threshold reached!' : 'Waiting for data';

  // ── Hashrate ──────────────────────────────────────────────────────────────
  // ocean.xyz uses labels like "60s", "10m", "3h", "24h" — try label-proximity first,
  // then fall back to nearest-hashrate scan across the full page.
  const allRates = scanAllHashrates();

  const hr60  = findHashrate(['60\\s*s', '1\\s*min', '1m\\b', '60\\b'])
             || findHashrateNearLabel(['60\\s*s', '1\\s*min', '1m\\b', '\\b60\\b'], allRates);
  const hr10m = findHashrate(['10\\s*m(?:in)?\\b', '10m\\b'])
             || findHashrateNearLabel(['10\\s*m(?:in)?\\b', '10m\\b'], allRates);
  const hr3h  = findHashrate(['3\\s*h(?:r|our)?\\b', '3hr\\b', '180\\s*m'])
             || findHashrateNearLabel(['3\\s*h(?:r|our)?\\b', '3\\s*hour', '3hr'], allRates);
  const hr24h = findHashrate(['24\\s*h(?:r|our)?\\b', '24hr\\b', '1\\s*day\\b'])
             || findHashrateNearLabel(['24\\s*h(?:r|our)?\\b', '24\\s*hour', '1\\s*day'], allRates);

  document.getElementById('ms-hr-60').textContent  = hr60  || '—';
  document.getElementById('ms-hr-10m').textContent = hr10m || '—';
  document.getElementById('ms-hr-3h').textContent  = hr3h  || '—';
  document.getElementById('ms-hr-24h').textContent = hr24h || '—';

  // Log to console for debugging
  console.log('[MinerStats] hashrates found:', { hr60, hr10m, hr3h, hr24h });
  console.log('[MinerStats] all hashrate values on page:', allRates.map(r => r.fmt + ' @pos' + r.pos));

  // ── DATUM detection ───────────────────────────────────────────────────────
  // Primary: use blocktemplate scrape result (window._oceanDATUMActive)
  // Secondary: look for DATUM signals in the miner stats page HTML
  const datumFromTemplate = window._oceanDATUMActive === true;
  const datumInHTML = !!(html.match(/datum[^<]{0,100}(1%|connected|active|gateway)/i)
                      || html.match(/fee[^<]{0,50}1%[^<]{0,100}datum/i)
                      || html.match(/\b1%\s*fee\b/i));
  const datumConnected = datumFromTemplate || datumInHTML;
  const datumDot   = document.getElementById('datum-dot');
  const datumSt    = document.getElementById('datum-status');
  const datumBadge = document.getElementById('datum-fee-badge');

  // Fee savings in dollars — read from calculator daily revenue tile
  const dailyRev   = parseFloat(document.getElementById('r-rev')?.textContent?.replace(/[^0-9.]/g,'')) || 0;
  const saving1pct = dailyRev * 0.01;
  document.getElementById('datum-daily-rev').textContent      = dailyRev.toFixed(2);
  document.getElementById('datum-daily-saving').textContent   = saving1pct.toFixed(2);
  document.getElementById('datum-monthly-saving').textContent = (saving1pct * 30).toFixed(0);

  if (datumConnected) {
    datumDot.style.background  = '#639922';
    datumSt.textContent        = 'DATUM connected — 1% fee active (saving 50% vs standard)';
    datumBadge.textContent     = '1% fee (DATUM)';
    datumBadge.className       = 'badge bg';
    document.getElementById('datum-install-cta').style.display = 'none';
    document.getElementById('datum-active-note').style.display = 'block';
    document.getElementById('datum-cta-text').innerHTML        = '<strong>DATUM active</strong> — your node is constructing block templates locally. Transaction policy is yours.';
    document.getElementById('datum-sub').textContent           = 'DATUM gateway connected · 1% fee active';
  } else {
    // DATUM installed on server but miner may not be routing through it
    const datumPresent = html.match(/datum/i);
    datumDot.style.background  = datumPresent ? '#BA7517' : '#A32D2D';
    datumSt.textContent        = datumPresent
      ? 'DATUM present but not confirmed active — check miner is connecting via DATUM gateway'
      : 'Standard connection — 2% fee. Install DATUM on Start9 to save 50%.';
    datumBadge.textContent     = '2% fee';
    datumBadge.className       = 'badge ba';
    document.getElementById('datum-install-cta').style.display = 'block';
    document.getElementById('datum-active-note').style.display = 'none';
    document.getElementById('datum-sub').textContent           = 'Detecting template policy from ocean.xyz/blocktemplate';
  }

  // ── Workers ───────────────────────────────────────────────────────────────
  // Try multiple table structures — ocean.xyz worker table varies
  const workerRows = [];

  // Pattern A: <tr> with address link + hashrate
  const reA = /href="\/stats\/[^"]+\.([^"]+)"[^>]*>[^<]*<\/a>[\s\S]{0,400}?([\d.]+\s*[TPEGMtpegm]h\/s)/gi;
  let m;
  while ((m = reA.exec(html)) !== null && workerRows.length < 20) {
    workerRows.push({ name: m[1], hashrate: m[2] });
  }

  // Pattern B: td containing worker name text + nearby hashrate
  if (workerRows.length === 0) {
    const reB = /<td[^>]*>\s*([\w.-]+)\s*<\/td>[\s\S]{0,200}?<td[^>]*>\s*([\d.]+\s*[TPEGMtpegm]h\/s)/gi;
    while ((m = reB.exec(html)) !== null && workerRows.length < 20) {
      if (m[1].length > 1 && m[1].length < 40) workerRows.push({ name: m[1], hashrate: m[2] });
    }
  }

  if (workerRows.length > 0) {
    document.getElementById('workers-loading').style.display = 'none';
    document.getElementById('workers-table-wrap').style.display = 'block';
    document.getElementById('workers-tbody').innerHTML = workerRows.map(w => {
      const ths = parseHashrateVal(w.hashrate);
      const online = ths > 0;
      return '<tr style="border-bottom:0.5px solid var(--border);">' +
        '<td style="padding:7px 8px;color:var(--text);font-family:monospace;font-size:12px;">' + w.name + '</td>' +
        '<td style="text-align:right;padding:7px 8px;"><span style="font-size:11px;font-weight:500;padding:2px 7px;border-radius:4px;' +
          (online ? 'background:var(--green-bg);color:var(--green-text)' : 'background:var(--red-bg);color:var(--red-text)') +
          '">' + (online ? 'Online' : 'Offline') + '</span></td>' +
        '<td style="text-align:right;padding:7px 8px;color:var(--text);font-weight:500;">' + fmtHashrate(ths) + '</td>' +
        '<td style="text-align:right;padding:7px 8px;color:var(--text3);">—</td>' +
        '</tr>';
    }).join('');
  } else {
    document.getElementById('workers-loading').textContent =
      'Worker data not parsed — use View Raw button below to inspect HTML structure';
  }

  // ── Payout history ────────────────────────────────────────────────────────
  const payoutRows = [];
  // Pattern: date near BTC amount near block height
  const reP = /(\d{4}[-\/]\d{2}[-\/]\d{2}|\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})[\s\S]{0,200}?([\d]+\.[\d]{6,8})\s*BTC[\s\S]{0,100}?#?(\d{6,7})/gi;
  while ((m = reP.exec(html)) !== null && payoutRows.length < 10) {
    payoutRows.push({ date: m[1], btc: parseFloat(m[2]), block: m[3] });
  }

  if (payoutRows.length > 0) {
    document.getElementById('payouts-loading').style.display = 'none';
    document.getElementById('payouts-table-wrap').style.display = 'block';
    document.getElementById('payouts-tbody').innerHTML = payoutRows.map(p =>
      '<tr style="border-bottom:0.5px solid var(--border);">' +
      '<td style="padding:5px 8px;color:var(--text2);">' + p.date + '</td>' +
      '<td style="text-align:right;padding:5px 8px;color:var(--text);font-weight:500;">' + p.btc.toFixed(6) + '</td>' +
      '<td style="text-align:right;padding:5px 8px;color:var(--text2);">~$' + (p.btc * btcP).toFixed(0) + '</td>' +
      '<td style="text-align:right;padding:5px 8px;color:var(--text3);font-size:11px;">#' + p.block + '</td>' +
      '</tr>'
    ).join('');
    const tot = payoutRows.reduce((s, p) => s + p.btc, 0);
    document.getElementById('payouts-summary').style.display = 'block';
    document.getElementById('payouts-summary').textContent =
      payoutRows.length + ' payouts shown: ' + tot.toFixed(6) + ' BTC (~$' + (tot * btcP).toFixed(0) + ')';
  } else {
    document.getElementById('payouts-loading').textContent =
      'No payout history parsed — may not have received a payout yet';
  }

  // ── Block annotation ──────────────────────────────────────────────────────
  const newBlkM = html.match(/LAST BLOCK:\s*(\d+)/i);
  if (newBlkM && parseInt(newBlkM[1]) !== window._lastAnnotatedBlock) {
    window._lastAnnotatedBlock = parseInt(newBlkM[1]);
    addBlockAnnotation(window._lastAnnotatedBlock);
  }

  // ── Show debug info ───────────────────────────────────────────────────────
  // Counts of parsed values shown in status line
  const parsed = [unpaidBTC, nextBlkBTC, dailyBTC, lifetimeBTC].filter(v => v > 0).length;
  const hrParsed = [hr60, hr10m, hr3h, hr24h].filter(Boolean).length;
  document.getElementById('miner-last-updated').textContent =
    '— ' + parsed + '/4 earnings · ' +
    hrParsed + '/4 hashrates · ' +
    allRates.length + ' rates found on page · ' +
    workerRows.length + ' workers · ' +
    payoutRows.length + ' payouts · ' +
    new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});
}

function addBlockAnnotation(height) {
  // Add a visual marker to the OCEAN hashrate chart
  if (!state.oceanHashChart2 || !state.oceanHashData.length) return;
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const existingNote = document.getElementById('ocean-block-found-note');
  if (existingNote) existingNote.remove();
  const note = document.createElement('div');
  note.id = 'ocean-block-found-note';
  note.style.cssText = 'font-size:11px;font-weight:500;padding:3px 8px;border-radius:4px;margin-top:4px;display:inline-block;' +
    (isDark ? 'background:#182c0a;color:#97C459' : 'background:var(--green-bg);color:var(--green-text)');
  note.textContent = '⬛ OCEAN found block #' + height.toLocaleString();
  const chart = document.getElementById('oceanHashChart');
  if (chart && chart.parentNode) chart.parentNode.appendChild(note);

  // Show global alert banner across all pages
  showBlockAlert(height);
}

let state.blockAlertTimer = null;
function showBlockAlert(height) {
  const banner = document.getElementById('block-alert-banner');
  const text   = document.getElementById('block-alert-text');
  if (!banner || !text) return;
  text.textContent = '⬛ OCEAN found block #' + height.toLocaleString() + ' — earnings incoming!';
  banner.style.display = 'flex';
  // Auto-dismiss after 5 minutes
  clearTimeout(state.blockAlertTimer);
  state.blockAlertTimer = setTimeout(dismissBlockAlert, 5 * 60 * 1000);
}

function dismissBlockAlert() {
  const banner = document.getElementById('block-alert-banner');
  if (banner) banner.style.display = 'none';
  clearTimeout(state.blockAlertTimer);
}

function viewRawHTML() {
  // Opens a new tab showing the raw HTML returned by the ocean.xyz proxy
  // This lets us see the actual structure to fix regex parsers
  const addr = document.getElementById('ocean-address-input').value.trim();
  if (!ON_START9) {
    alert('Raw HTML viewer only works on Start9 (requires nginx proxy).');
    return;
  }
  const target = addr && isValidBTCAddress(addr)
    ? '/proxy/ocean/stats/' + addr
    : '/proxy/ocean/dashboard';
  window.open(target, '_blank');
}

function openOceanStats() {
  const raw = document.getElementById('ocean-address-input').value.trim();
  if (isValidBTCAddress(raw)) window.open('https://ocean.xyz/stats/' + raw, '_blank');
}

function updateWorkerLinks() {
  const addr   = document.getElementById('ocean-address-input').value.trim();
  const worker = document.getElementById('ocean-worker-input').value.trim();
  const btn    = document.getElementById('worker-go-btn');
  const msg    = document.getElementById('worker-msg');
  const panel  = document.getElementById('worker-links-panel');

  if (!worker) {
    btn.style.opacity = '0.4'; btn.style.pointerEvents = 'none';
    msg.textContent = ''; panel.style.display = 'none'; return;
  }
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(worker)) {
    btn.style.opacity = '0.4'; btn.style.pointerEvents = 'none';
    msg.textContent = '⚠ Worker name: letters, numbers, hyphens, underscores only.';
    msg.style.color = 'var(--amber-text)';
    panel.style.display = 'none'; return;
  }
  btn.style.opacity = '1'; btn.style.pointerEvents = 'auto';
  msg.textContent = '✓ Worker "' + worker + '" links ready.';
  msg.style.color = 'var(--green-text)';

  const fullId = addr + '.' + worker;
  const base   = 'https://ocean.xyz';
  document.getElementById('lnk-worker-stats').href    = base + '/stats/' + fullId;
  document.getElementById('lnk-worker-payouts').href  = base + '/stats/' + fullId + '#payouts';
  document.getElementById('lnk-worker-hashrate').href = base + '/stats/' + fullId + '#hashrate';
  document.getElementById('lnk-worker-blocks').href   = base + '/stats/' + fullId + '#blocks';
  document.getElementById('worker-full-id').textContent = fullId;
  panel.style.display = 'block';
  try { sessionStorage.setItem('ocean_worker_name', worker); } catch(_) {}
  try { localStorage.setItem('ocean_worker_name', worker); } catch(_) {}
}

function openWorkerStats() {
  const addr   = document.getElementById('ocean-address-input').value.trim();
  const worker = document.getElementById('ocean-worker-input').value.trim();
  if (addr && worker) window.open('https://ocean.xyz/stats/' + addr + '.' + worker, '_blank');
}

function clearOceanAddress() {
  document.getElementById('ocean-address-input').value = '';
  document.getElementById('ocean-worker-input').value  = '';
  document.getElementById('miner-stats-panel').style.display = 'none';
  if (state.minerStatsInterval) { clearInterval(state.minerStatsInterval); state.minerStatsInterval = null; }
  try { sessionStorage.removeItem('ocean_btc_address'); sessionStorage.removeItem('ocean_worker_name'); } catch(_) {}
  try { localStorage.removeItem('ocean_btc_address');   localStorage.removeItem('ocean_worker_name');   } catch(_) {}
  updateOceanLinks();
  updateWorkerLinks();
}

// Restore saved address on load
(function restoreOceanAddress() {
  try {
    // localStorage persists across tab closes and server restarts — preferred for a private Start9 dashboard
    const savedAddr   = localStorage.getItem('ocean_btc_address')   || sessionStorage.getItem('ocean_btc_address');
    const savedWorker = localStorage.getItem('ocean_worker_name')    || sessionStorage.getItem('ocean_worker_name');    if (savedAddr) {
      document.getElementById('ocean-address-input').value = savedAddr;
      updateOceanLinks();
      // Auto-load stats if on Start9
      if (ON_START9) loadMinerStats();
    }
    if (savedWorker) {
      document.getElementById('ocean-worker-input').value = savedWorker;
      updateWorkerLinks();
    }
  } catch(_) {}
})();

// ─── HASH RIBBON ─────────────────────────────────────────────────────────────
// Uses state.networkHashrateHistory data fetched by fetchHashrate()
// 30D MA = simple moving average of daily hashrate over 30 days
// 60D MA = simple moving average over 60 days
// Data comes from /v1/mining/hashrate/3d which gives daily data points



// ─── OCEAN HASHRATE HISTORY CHART ────────────────────────────────────────────
async function fetchOceanHashrateHistory() {
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

// ─── HASH RIBBON ─────────────────────────────────────────────────────────────
let state.hashRibbonChart = null;
let state.networkHashrateHistory = [];

function computeSMA(data, days) {
  const result = [];
  for (let i = days - 1; i < data.length; i++) {
    const slice = data.slice(i - days + 1, i + 1);
    const avg   = slice.reduce((s, d) => s + d.avgHashrate, 0) / days;
    result.push({ timestamp: data[i].timestamp, sma: avg });
  }
  return result;
}

function drawHashRibbon() {
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

async function fetchHashrateHistory() {
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

// ─── COMBINED SIGNAL ─────────────────────────────────────────────────────────
function updateCombinedSignal() {
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

function setOceanRange(range, btn) {
  state.oceanChartRange = range;
  document.querySelectorAll('.ocean-range-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  drawOceanHashChart(range);
}

function drawOceanHashChart(range) {
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
  const fmtDate = ts => { const d = new Date(ts*1000); return M[d.getMonth()] + ' ' + d.getDate() + ' \'' + String(d.getFullYear()).slice(2); }

export function restoreOceanAddress() {
  try {
    // localStorage persists across tab closes and server restarts — preferred for a private Start9 dashboard
    const savedAddr   = localStorage.getItem('ocean_btc_address')   || sessionStorage.getItem('ocean_btc_address');
    const savedWorker = localStorage.getItem('ocean_worker_name')    || sessionStorage.getItem('ocean_worker_name');    if (savedAddr) {
      document.getElementById('ocean-address-input').value = savedAddr;
      updateOceanLinks();
      // Auto-load stats if on Start9
      if (ON_START9) loadMinerStats();
    }
    if (savedWorker) {
      document.getElementById('ocean-worker-input').value = savedWorker;
      updateWorkerLinks();
    }
  } catch(_) {}
}

