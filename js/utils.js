// utils.js — pure utility functions, no state, no DOM dependencies

export function parseHashrateVal(str) {
  // Converts "1.23 Th/s" / "456.7 Gh/s" / "0.89 Ph/s" → TH/s
  if (!str) return 0;
  const m = str.match(/([\d.]+)\s*(T|P|E|G|M)h\/s/i);
  if (!m) return 0;
  const v = parseFloat(m[1]);
  const u = m[2].toUpperCase();
  if (u === 'E') return v * 1e6;
  if (u === 'P') return v * 1000;
  if (u === 'T') return v;
  if (u === 'G') return v / 1000;
  if (u === 'M') return v / 1e6;
  return v;
}

export function fmtHashrate(ths) {
  if (ths >= 1e6) return (ths / 1e6).toFixed(2) + ' EH/s';
  if (ths >= 1000) return (ths / 1000).toFixed(2) + ' PH/s';
  if (ths >= 1) return ths.toFixed(2) + ' TH/s';
  return (ths * 1000).toFixed(1) + ' GH/s';
}

export function parseBTCVal(str) {
  if (!str) return 0;
  const m = str.match(/([\d.]+)\s*BTC/i) || str.match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}

export function isValidBTCAddress(addr) {
  if (!addr || addr.length < 25 || addr.length > 90) return false;
  return /^(bc1[a-z0-9]{25,89}|[13][a-zA-Z0-9]{24,33})$/.test(addr.trim());
}
