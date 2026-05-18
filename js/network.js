// network.js — Network governance: BIP-110 signaling and Bitcoin Knots node distribution
import { state, BIP110_API, BITNODES_API } from './state.js';

export function updateBIP110Fallback() {
  const da         = state.liveDiffAdj;
  const progress   = da ? da.progressPercent    : 41.5;
  const remaining  = da ? da.remainingBlocks     : 1179;
  const retargetH  = da ? da.nextRetargetHeight  : 947520;
  const epochStart = retargetH - 2016;
  const blocksIn   = Math.round(progress / 100 * 2016);
  const periodNum  = Math.floor(epochStart / 2016);
  const daysLeft   = remaining * 10 / 60 / 24;

  document.getElementById('bip-signal-rate').textContent   = '0.00%';
  document.getElementById('bip-signal-blocks').textContent = '0';
  document.getElementById('bip-signal-of').textContent     = 'of ' + blocksIn.toLocaleString() + ' blocks this epoch';
  document.getElementById('bip-period').textContent        = periodNum;
  document.getElementById('bip-blocks-left').textContent   = remaining.toLocaleString() + ' left · ~' + daysLeft.toFixed(1) + ' days';
  document.getElementById('bip-signal-bar').style.width    = '0%';
  document.getElementById('bip-bar-label').textContent     = '0.00% · epoch ' + periodNum + ' · deploy on Start9 for live data';

  const sumEl = document.getElementById('bip110-summary');
  sumEl.className = 'info-box info-amber';
  sumEl.innerHTML = '<strong>Period ' + periodNum + ' (local mode):</strong> 0.00% signaling confirmed Apr 2026. ' +
    'Deploy on Start9 for live bip110monitor.com data via proxy. ' +
    'Voluntary deadline block 961,542 (~Aug 2026). Activation block 965,664 (~Sep 2026).';

  const history = [
    { period: periodNum, first: epochStart, last: epochStart + blocksIn - 1, tracked: blocksIn, sig: 0,  live: true  },
    { period: 468, first: 943488, last: 945503, tracked: 2016, sig: 2,  live: false },
    { period: 467, first: 941472, last: 943487, tracked: 2016, sig: 3,  live: false },
    { period: 466, first: 939456, last: 941471, tracked: 2016, sig: 0,  live: false },
    { period: 465, first: 937440, last: 939455, tracked: 2016, sig: 1,  live: false },
  ];
  document.getElementById('bip-history-body').innerHTML = history.map(p => {
    const pr    = p.tracked > 0 ? (p.sig / p.tracked * 100) : 0;
    const color = pr >= 55 ? '#3B6D11' : pr > 5 ? '#854F0B' : 'var(--text3)';
    const tag   = p.live ? ' <span style="font-size:10px;background:var(--amber-bg);color:var(--amber-text);padding:1px 5px;border-radius:3px;">est</span>' : '';
    return '<tr style="border-bottom:0.5px solid var(--border);">' +
      '<td style="padding:5px 6px;color:var(--text2);">' + p.period + tag + '</td>' +
      '<td style="padding:5px 6px;color:var(--text3);font-size:11px;">' + p.first.toLocaleString() + ' – ' + p.last.toLocaleString() + '</td>' +
      '<td style="text-align:right;padding:5px 6px;color:var(--text);">' + p.sig + ' / ' + p.tracked + '</td>' +
      '<td style="text-align:right;padding:5px 6px;font-weight:500;color:' + color + ';">' + pr.toFixed(2) + '%</td></tr>';
  }).join('');
}

export async function fetchBIP110Live() {
  try {
    const resp = await fetch(BIP110_API);
    const d    = await resp.json();

    const rate      = d.current_period ? (d.current_period.signal_rate * 100) : 0;
    const sigBlocks = d.current_period ? d.current_period.signaling_blocks    : 0;
    const tracked   = d.current_period ? d.current_period.blocks_tracked      : 0;
    const periodNum = d.current_period ? d.current_period.period              : '—';
    const blocksLeft = d.current_period ? (2016 - tracked) : 0;
    const daysLeft  = blocksLeft * 10 / 60 / 24;

    document.getElementById('bip-signal-rate').textContent   = rate.toFixed(2) + '%';
    document.getElementById('bip-signal-blocks').textContent = sigBlocks.toLocaleString();
    document.getElementById('bip-signal-of').textContent     = 'of ' + tracked.toLocaleString() + ' blocks this period';
    document.getElementById('bip-period').textContent        = periodNum;
    document.getElementById('bip-blocks-left').textContent   =
      blocksLeft.toLocaleString() + ' blocks left · ~' + daysLeft.toFixed(1) + ' days';

    const barW = Math.min((rate / 55) * 100, 100);
    document.getElementById('bip-signal-bar').style.width = barW.toFixed(2) + '%';
    document.getElementById('bip-bar-label').textContent  =
      rate.toFixed(2) + '% · ' + sigBlocks + ' of ' + tracked + ' blocks · epoch ' + periodNum;

    const sumEl = document.getElementById('bip110-summary');
    if (rate === 0) {
      sumEl.className = 'info-box info-amber';
      sumEl.innerHTML = '<strong>Period ' + periodNum + ' (live):</strong> 0.00% miner signaling · ' +
        sigBlocks + ' of ' + tracked + ' blocks carry bit 4. Deadline block 961,542 (~Aug 2026). Activation block 965,664 (~Sep 2026).';
    } else if (rate < 55) {
      sumEl.className = 'info-box info-amber';
      sumEl.innerHTML = '<strong>Period ' + periodNum + ' (live):</strong> ' + rate.toFixed(2) +
        '% signaling · needs ' + (55 - rate).toFixed(2) + '% more to lock in.';
    } else {
      sumEl.className = 'info-box info-green';
      sumEl.innerHTML = '<strong>LOCK-IN REACHED ' + rate.toFixed(2) + '%</strong> — activates after one grace period.';
    }

    if (d.period_history && d.period_history.length) {
      document.getElementById('bip-history-body').innerHTML = d.period_history.slice(0, 6).map((p, i) => {
        const pr    = ((p.signal_rate || 0) * 100);
        const color = pr >= 55 ? '#3B6D11' : pr > 5 ? '#854F0B' : 'var(--text3)';
        const tag   = i === 0 ? ' <span style="font-size:10px;background:var(--green-bg);color:var(--green-text);padding:1px 5px;border-radius:3px;font-weight:500;">LIVE</span>' : '';
        return '<tr style="border-bottom:0.5px solid var(--border);">' +
          '<td style="padding:5px 6px;color:var(--text2);">' + p.period + tag + '</td>' +
          '<td style="padding:5px 6px;color:var(--text3);font-size:11px;">' + (p.first_block || '—') + ' – ' + (p.last_block || '—') + '</td>' +
          '<td style="text-align:right;padding:5px 6px;color:var(--text);">' + (p.signaling_blocks || 0) + ' / ' + (p.blocks_tracked || 2016) + '</td>' +
          '<td style="text-align:right;padding:5px 6px;font-weight:500;color:' + color + ';">' + pr.toFixed(2) + '%</td></tr>';
      }).join('');
    }

  } catch(e) {
    console.warn('fetchBIP110Live error:', e);
    updateBIP110Fallback();
  }
}

export async function fetchKnotsDistribution() {
  // Bitnodes free tier: 50 requests per IP per 24 hours.
  // Guard: skip if fetched successfully within last 23 hours.
  const now = Date.now();
  if (state.knotsLastFetched && (now - state.knotsLastFetched) < 23 * 3600 * 1000) {
    console.log('[fetchKnotsDistribution] skipped — fetched', Math.round((now - state.knotsLastFetched)/3600000), 'hr ago');
    return;
  }
  try {
    // Step 1: get the snapshots list to find the latest snapshot timestamp.
    // '/api/v1/snapshots/latest/' is NOT a valid endpoint — must use the list.
    const listR = await fetch(BITNODES_API + '/snapshots/?page=1');
    if (!listR.ok) throw new Error('bitnodes snapshots list HTTP ' + listR.status);
    const listD = await listR.json();

    // The first result is the most recent snapshot
    const results = listD.results || [];
    if (!results.length) throw new Error('no snapshots in bitnodes response');
    const latestUrl = results[0].url; // e.g. https://bitnodes.io/api/v1/snapshots/1764325181/
    const totalNodes = results[0].total_nodes || 0;
    const snapTs = results[0].timestamp ? new Date(results[0].timestamp * 1000) : null;

    // Step 2: fetch user_agents for that snapshot.
    // Extract just the timestamp portion and build the proxy path.
    const tsMatch = latestUrl.match(/\/snapshots\/(\d+)\//);
    if (!tsMatch) throw new Error('could not parse snapshot timestamp from: ' + latestUrl);
    const ts = tsMatch[1];

    const snapR = await fetch(BITNODES_API + '/snapshots/' + ts + '/?field=user_agents');
    if (!snapR.ok) throw new Error('bitnodes snapshot HTTP ' + snapR.status);
    const snapD = await snapR.json();

    // Defensive: log actual response keys if user_agents is missing
    if (!snapD.user_agents) {
      console.warn('[fetchKnotsDistribution] user_agents not in response. Keys:', Object.keys(snapD));
      throw new Error('user_agents field missing — got: ' + Object.keys(snapD).join(', '));
    }

    const agents = snapD.user_agents;

    // Classify each user agent string
    let knotsCount = 0, coreCount = 0, otherCount = 0;
    const rows = [];

    for (const [ua, count] of Object.entries(agents)) {
      const isKnots = /knots/i.test(ua);
      const isCore  = /satoshi/i.test(ua) && !isKnots;
      if (isKnots) knotsCount += count;
      else if (isCore) coreCount += count;
      else otherCount += count;
      rows.push({ ua, count, isKnots, isCore });
    }

    const knotsPct = (knotsCount / totalNodes * 100);
    const corePct  = (coreCount  / totalNodes * 100);
    const otherPct = (otherCount / totalNodes * 100);

    // Update stat tiles
    document.getElementById('knots-pct').textContent   = knotsPct.toFixed(1) + '%';
    document.getElementById('knots-count').textContent = knotsCount.toLocaleString();
    document.getElementById('knots-total').textContent = totalNodes.toLocaleString();

    // Update bar chart
    document.getElementById('knots-bar-core').style.width   = corePct.toFixed(1) + '%';
    document.getElementById('knots-bar-core').textContent   = corePct >= 8 ? 'Core ' + corePct.toFixed(0) + '%' : '';
    document.getElementById('knots-bar-knots').style.width  = knotsPct.toFixed(1) + '%';
    document.getElementById('knots-bar-knots').textContent  = knotsPct >= 5 ? 'Knots ' + knotsPct.toFixed(0) + '%' : '';
    document.getElementById('knots-bar-other').style.width  = otherPct.toFixed(1) + '%';

    // Update "Now" timeline entry
    document.getElementById('knots-now-label').textContent =
      knotsCount.toLocaleString() + ' Knots nodes (' + knotsPct.toFixed(1) + '% of ' +
      totalNodes.toLocaleString() + ' reachable nodes) — snapshot ' +
      (snapTs ? snapTs.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) + ' ' + snapTs.toLocaleDateString([], {month:'short', day:'numeric'}) : '');

    // Update source tag
    document.getElementById('knots-source-tag').textContent =
      'LIVE · bitnodes.io' + (snapTs ? ' · ' + snapTs.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '');

    state.knotsLastFetched = Date.now();

    // Version breakdown table — top 12, Knots first then Core then other by count
    rows.sort((a, b) => {
      if (a.isKnots !== b.isKnots) return a.isKnots ? -1 : 1;
      if (a.isCore  !== b.isCore)  return a.isCore  ? -1 : 1;
      return b.count - a.count;
    });

    const tbody = document.getElementById('knots-version-body');
    const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    tbody.innerHTML = rows.slice(0, 12).map(row => {
      const pct   = (row.count / totalNodes * 100).toFixed(2);
      const color = row.isKnots ? '#0F6E56' : row.isCore ? '#185FA5' : 'var(--text3)';
      const label = esc(row.ua.replace(/^\/|\/$/g, '') || 'Unknown');
      return `<tr style="border-bottom:0.5px solid var(--border);">
      <td style="padding:5px 6px;color:${color};font-family:monospace;font-size:11px;">${label}</td>
      <td style="text-align:right;padding:5px 6px;color:var(--text);">${row.count.toLocaleString()}</td>
      <td style="text-align:right;padding:5px 6px;color:var(--text3);">${pct}%</td>
    </tr>`;
    }).join('');

  } catch(e) {
    console.warn('[fetchKnotsDistribution] failed:', e.message);
    document.getElementById('knots-source-tag').textContent = 'bitnodes.io — fetch failed';
    document.getElementById('knots-pct').textContent   = '—';
    document.getElementById('knots-count').textContent = '—';
    document.getElementById('knots-total').textContent = '—';
    document.getElementById('knots-version-body').innerHTML =
      '<tr><td colspan="3" style="padding:8px 6px;color:var(--red-text);font-size:12px;">⚠ ' +
      e.message + '</td></tr>';
  }
}
