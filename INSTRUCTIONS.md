# BTC Mining Dashboard

Real-time Bitcoin mining dashboard for OCEAN pool miners.

## Tabs

| Tab | Contents |
|-----|----------|
| **Live** | Network hashrate · Difficulty · BTC price · Your operation · Profitability calculator · Daily checklist |
| **OCEAN** | Pool hashrate · Network share · TIDES payout model · Links |
| **Network** | Block height · Epoch progress · Next halving · BIP-110 signaling |
| **My Stats** | Enter your Bitcoin address to access your OCEAN miner dashboard, workers, and payouts |
| **Hashprice** | USD/TH/day index · Historical chart · Your cost overlay · Profitability margin |

## Hashprice tab

The Hashprice tab shows the expected USD revenue per terahash per day.
Your cost per TH/day (from the calculator on the Live tab) is overlaid as
a dashed line — when hashprice is above your cost line, you're profitable.

Formula: `(3.125 BTC subsidy + avg fees) × BTC price × 144 blocks/day ÷ network hashrate`

## Data sources

- `mempool.space` — hashrate, difficulty, BTC price, block data
- `api.coingecko.com` — BTC price history for the hashprice chart
- `blockchain.info` — historical hashrate for the hashprice chart

All free, no API keys required. Your Start9 server needs outbound internet access to these domains.

## Profitability calculator

Set your hashrate (PH/s), rental cost ($/PH/day), and pool fee on the Live tab.
The Hashprice tab will show your exact margin vs the network hashprice.
