// init.js — bootstrap: initial data loads, setInterval registrations, page restore
//
// ES modules don't pollute the global scope, so every function referenced by
// an inline HTML event handler (onclick, oninput) must be explicitly assigned
// to window.* here before the DOM fires any events.

// ── Imports ──────────────────────────────────────────────────────────────────
import { ON_START9 } from './state.js';

import { calc, loadScenario }                                    from './calc.js';
import { fetchAll, fetchHashrate, fetchHashrateHistory }         from './fetch.js';
import { fetchOceanLive, fetchOceanHashrateHistory, setOceanRange } from './ocean.js';
import { fetchKnotsDistribution }                                from './network.js';
import { showPage, restoreLastPage }                             from './nav.js';
import {
  loadMinerStats, clearOceanAddress,
  openWorkerStats, dismissBlockAlert,
  viewRawHTML, updateOceanLinks, updateWorkerLinks,
  restoreOceanAddress,
} from './miner.js';
import { pnlPrefill, pnlLogDay, pnlClear, pnlRender } from './pnl.js';
import { hpSetSpan, hpUpdateMargin, hpDrawChart }      from './hashprice.js';

// ── Expose to global scope for inline HTML event handlers ─────────────────────
// Navigation
window.showPage          = showPage;

// Live / calculator
window.calc              = calc;
window.loadScenario      = loadScenario;
window.fetchAll          = fetchAll;

// OCEAN tab
window.setOceanRange     = setOceanRange;

// My Stats / miner
window.loadMinerStats    = loadMinerStats;
window.clearOceanAddress = clearOceanAddress;
window.openWorkerStats   = openWorkerStats;
window.dismissBlockAlert = dismissBlockAlert;
window.viewRawHTML       = viewRawHTML;
window.updateOceanLinks  = updateOceanLinks;
window.updateWorkerLinks = updateWorkerLinks;

// P&L tracker
window.pnlPrefill        = pnlPrefill;
window.pnlLogDay         = pnlLogDay;
window.pnlClear          = pnlClear;

// Hashprice tab
window.hpSetSpan         = hpSetSpan;
window.hpUpdateMargin    = hpUpdateMargin;
window.hpDrawChart       = hpDrawChart;

// ── Initial data loads ───────────────────────────────────────────────────────
calc();
fetchAll();
fetchHashrate();
fetchHashrateHistory();
fetchOceanLive().finally(() => fetchOceanHashrateHistory());
pnlRender();
restoreOceanAddress();  // re-populate address input + auto-load stats if saved

// ── Refresh intervals ────────────────────────────────────────────────────────
setInterval(fetchAll, 60000);                  // difficulty + price every 60s
setInterval(fetchHashrate, 300000);            // hashrate every 5 min (rate limit safe)
setInterval(fetchHashrateHistory, 3600000);    // ribbon history once per hour
setInterval(() => fetchOceanLive().finally(() => fetchOceanHashrateHistory()), 60000);
if (ON_START9) setInterval(fetchKnotsDistribution, 86400000); // bitnodes once per day

// ── Restore last visited page ────────────────────────────────────────────────
restoreLastPage();
