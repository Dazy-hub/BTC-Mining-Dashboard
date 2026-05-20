// init.js — bootstrap: initial data loads, setInterval registrations, page restore

// Initial data loads
import { ON_START9 } from './state.js';
import { calc } from './calc.js';
import { fetchAll, fetchHashrate, fetchHashrateHistory } from './fetch.js';
import { fetchOceanLive, fetchOceanHashrateHistory } from './ocean.js';
import { fetchKnotsDistribution } from './network.js';
import { pnlRender } from './pnl.js';
import { restoreLastPage } from './nav.js';
calc();
fetchAll();
fetchHashrate();
fetchHashrateHistory();
fetchOceanLive().finally(() => fetchOceanHashrateHistory());
pnlRender();

// Refresh intervals
setInterval(fetchAll, 60000);                  // difficulty + price every 60s
setInterval(fetchHashrate, 300000);            // hashrate every 5 min (rate limit safe)
setInterval(fetchHashrateHistory, 3600000);    // ribbon history once per hour
setInterval(() => fetchOceanLive().finally(() => fetchOceanHashrateHistory()), 60000);
if (ON_START9) setInterval(fetchKnotsDistribution, 86400000); // bitnodes once per day

// Restore last visited page
restoreLastPage();
