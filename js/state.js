// state.js — single source of truth for all shared mutable state and config.
//
// ES modules import bindings are live but read-only from the importer's side.
// The solution: export a single mutable `state` object. Every module reads AND
// writes through it: state.liveBTCPrice = 95000; const p = state.liveBTCPrice;

// ── Environment detection ────────────────────────────────────────────────────
export const IS_ONION  = location.hostname.endsWith('.onion');
export const ON_START9 = (location.protocol === 'https:') || IS_ONION;

// ── API base URLs ────────────────────────────────────────────────────────────
// nginx: /proxy/mempool/v1/... → https://mempool.space/api/v1/...
export const MEMPOOL = ON_START9
  ? '/proxy/mempool'
  : 'https://mempool.space/api';

// bip110monitor.com has no CORS headers — proxy on Start9 only.
export const BIP110_API = ON_START9 ? '/proxy/bip110' : null;

// bitnodes.io — nginx: /proxy/bitnodes/ → https://bitnodes.io/api/v1/
export const BITNODES_API = ON_START9
  ? '/proxy/bitnodes'
  : 'https://bitnodes.io/api/v1';

// ── Mutable state object ─────────────────────────────────────────────────────
// All cross-module state lives here. Import `state` and use state.foo = bar.
export const state = {
  // Live network data
  liveNetHashEH:       800,
  liveBTCPrice:        94000,
  liveAvgFeesPerBlock: 0,
  liveDiffAdj:         null,

  // Chart instances
  hashChart:           null,
  hashRibbonChart:     null,
  oceanHashChart2:     null,
  hpChartInstance:     null,

  // Data stores
  networkHashrateHistory: [],
  oceanHashData:          [],
  oceanChartRange:        '1m',

  // Rate limiting
  knotsLastFetched: 0,

  // Miner stats
  minerStatsInterval: null,
  blockAlertTimer:    null,

  // Hashprice page
  hpDays: 7,
};

// ── Static config ────────────────────────────────────────────────────────────
export const PNL_KEY = 'btc_dashboard_pnl_v1';

export const PAGE_MAP = {
  live:      ['page-live', 'page-live-2'],
  calc:      ['page-live', 'page-live-2'],
  ocean:     ['page-ocean-pool'],
  network:   ['page-network'],
  mystats:   ['page-mystats'],
  hashprice: ['page-hashprice'],
};

export const scenarios = {
  bull:     { btc: 150000, label: 'Bull ($150K)' },
  bear:     { btc: 50000,  label: 'Bear ($50K)' },
  highhash: { netEH: 1000, label: 'High network (1000 EH)' },
  diffdrop: { diffPct: -5, label: 'Diff drop −5%' },
  datum:    { fee: 1,      label: 'With DATUM (1% fee)' },
};
