# Signal rules

Signals are informational labels for an **entry point**, not trade instructions. They must be reproducible: two runs on the same news and the same profile should give the same signal. Apply the three stages below in order.

## Stage 1 — Asset score (independent of the user)

Score each dimension from −1 to +1 using only what the research found this week:

| Dimension | +1 | 0 | −1 |
|---|---|---|---|
| **Trend / technicals** | Holding above key moving averages or bouncing on support; RSI not overbought | Range-bound or mixed | Breaking supports, clear downtrend; or RSI > 75 after a sharp run-up (stretched entry) |
| **Fundamentals / valuation** | Improving earnings/flows/supply-demand; valuation at or below historical average | Stable or unclear | Deteriorating fundamentals or valuation clearly stretched |
| **Catalysts / news (7 days)** | Positive catalyst with lasting impact | Nothing material | Negative catalyst or major pending risk (earnings, vote, central-bank decision) within days |
| **Macro fit** | Current macro regime favours this asset type | Neutral | Regime works against it |

`asset_score = sum` (range −4 … +4). If a dimension has no reliable data, score it 0 and say so in the rationale.

## Stage 2 — Profile thresholds

Thresholds depend on the user's risk profile and on the asset's `volatility_class`:

| Risk profile | `buy` if score ≥ | `wait` if score ≤ | Extra rule |
|---|---|---|---|
| conservative | +3 | 0 | `very_high` assets: never `buy`; `high`: `buy` only if score = +4 |
| balanced | +2 | −1 | `very_high` assets: `buy` only if score ≥ +3 |
| growth | +2 | −2 | — |
| aggressive | +1 | −2 | A score of −1 or −2 driven mainly by a price drop with intact fundamentals (fundamentals ≥ 0) may be `neutral` rather than `wait` |

Anything between the two thresholds is `neutral`.

## Stage 3 — Goals and weights adjustments

Apply at most one downgrade per asset (`buy` → `neutral`, or `neutral` → `wait`), and explain it:

- **Short-term goal exposure**: the user has a short-term goal within 12 months and the asset is `high` or `very_high` volatility → downgrade a `buy` to `neutral`.
- **Concentration** (only when weights exist): asset weight > 25 % (conservative/balanced) or > 35 % (growth/aggressive), or a `very_high` asset > 10 % for conservative / > 20 % for balanced → downgrade a `buy` to `neutral` and flag it in the "Alignment" section.
- **Horizon mismatch**: every goal is under 2 years and the asset is `very_high` → `wait`.

No upgrades in stage 3: the profile can only make signals more prudent. Milestones (`goals.milestones`, no deadline) never trigger an adjustment.

Keep track of the stage 3 outcome for the whole report: the list of assets downgraded, with the rule that applied, or "none". The "Alignment" section must report it explicitly, including when nothing was adjusted (say why, e.g. "No goal falls within the next 12 months, so no signal was made more prudent this week.").

## Writing the rationale

- 1–3 sentences in the profile language.
- Mention the main driver(s) of the score, and, if stage 2 or 3 changed the outcome, say so plainly (e.g. "Strong setup (+3), but kept neutral given your 8-month down-payment goal.").
- Never phrase as an order ("buy now"). Use "entry conditions look favourable / mixed / unfavourable".

## Signal labels

| Key | fr | en | es | de | Cell colour |
|---|---|---|---|---|---|
| `buy` | Achat | Buy | Compra | Kaufen | `C6EFCE` |
| `neutral` | Neutre | Neutral | Neutral | Neutral | `FFEB9C` |
| `wait` | Attendre | Wait | Esperar | Abwarten | `FFCC99` |

The build script handles labels and colours from the key; the data file only stores the key.
