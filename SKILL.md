---
name: investment-report
description: Generate a personalized periodic investment report (docx, Markdown or HTML) for the user's own watchlist, with per-asset price, weekly change, news, macro context and an entry signal adapted to their risk profile and goals. On first run it interviews the user (risk profile, short/long-term goals, assets to track, optional portfolio weights, language, currency, output format) and saves a profile; later runs reuse it. Use when the user asks for their investment report, portfolio report, weekly market recap on their assets, "rapport d'investissement", or wants to set up, edit, add or remove assets from their investment report profile.
---

# /investment-report

Produce a periodic investment report on the user's own watchlist, adapted to their risk profile and goals. The skill has three modes:

| Invocation | Mode |
|---|---|
| `/investment-report` with no saved profile | **Onboarding**, then a first report |
| `/investment-report` with a saved profile | **Report** |
| `/investment-report setup` | Redo onboarding from scratch (overwrite after confirmation) |
| `/investment-report edit`, `add <asset>`, `remove <asset>`, `show` | **Edit profile** (or display it) |

The user may also phrase these in natural language ("ajoute l'uranium à mon rapport", "change my risk profile").

## Step 0 — Locate the profile

The profile is a JSON file (schema: `profile.example.json` in this skill's directory). Look for it in this order and use the first one found:

1. A profile JSON block the user pasted in this conversation, or present in project instructions / memory (claude.ai and other environments without a persistent filesystem).
2. `$INVESTMENT_REPORT_HOME/profile.json` if that env var is set.
3. `~/.investment-report/profile.json`.

If none exists → **Onboarding**. If one exists but `version` is older than the schema's, migrate missing fields with defaults and tell the user.

Persistence check: if `~` is writable and survives sessions (Claude Code, local agents), save there. Otherwise (e.g. claude.ai sandbox), after onboarding print the full profile JSON in a fenced block and tell the user to keep it (paste it at the next run, or add it to their project instructions).

## Mode A — Onboarding

Follow `references/onboarding.md` exactly. In short:

1. Language & currency
2. Risk profile (self-assessment + 3 calibration questions → computed profile, shown to the user to confirm)
3. Goals: short term (< 2 years), long term (each with a horizon), optional target amounts and milestones; then a consistency check against the horizon answer from step 2
4. Assets to track: free text → resolve each to a precise instrument (ticker, ISIN, exchange, type) → confirm the list
5. Optional: current portfolio weights
6. Output: format (docx / md / html), reference weekday, timezone, output directory

Use `AskUserQuestion` for multiple-choice questions when the tool is available (load it via ToolSearch if deferred); otherwise ask in plain conversation, one block at a time. Never ask more than 4 questions in one turn.

Then show a summary of the profile, ask for confirmation, save it (see Step 0), and continue straight to **Mode B** to produce the first report.

## Mode B — Report

### B1. Research

Load WebSearch (via ToolSearch if deferred). Send independent searches in parallel. Budget: about **2 searches per asset + 4 macro searches** (minimum 8 in total). Search in English and in the profile language.

For each asset:
- Current price (in its quote currency) and weekly % change
- News from the last 7 days that could move it
- Macro / fundamental context relevant to the asset type (rates for equities and gold, supply/demand for commodities, on-chain/flows/regulation for crypto, sector policy for thematics)
- Technical levels if analysts mention them (supports/resistances, RSI, moving averages)

Global: central banks and inflation, employment/growth data, geopolitics, plus one search per dominant theme in the watchlist (e.g. commodities, emerging markets, crypto regulation).

**Price pass (mandatory).** Search snippets often miss today's quote. After the searches, for every asset (or theme proxy) still missing a verified price or weekly change, load WebFetch (via ToolSearch if deferred) and read a quote page directly, in this order:
1. The asset's `quote_url` from the profile, if set.
2. A quote page built from the ticker/ISIN, in parallel when possible:
   - Euronext Paris ETFs and stocks: `https://www.boursorama.com/bourse/trackers/cours/1r<TICKER>/` (trackers) or `https://www.google.com/finance/quote/<TICKER>:EPA`
   - US-listed: `https://www.google.com/finance/quote/<TICKER>:<NYSEARCA|NASDAQ|NYSE>` or `https://stockanalysis.com/etf/<ticker>/`
   - Other exchanges: `https://www.google.com/finance/quote/<TICKER>:<EXCHANGE CODE>`
   - Crypto: `https://www.coingecko.com/en/coins/<id>` (gives price and 7-day change)
   - Gold / commodities: `https://goldprice.org/` style spot pages, LME or the issuer page of a tracking ETF
   - Funds: the issuer's product page (NAV and date)
3. A historical-data page (e.g. Investing.com "historical data") to compute the weekly change: `(last close / close 5 trading days earlier) − 1`.

When a quote page works, write its URL back to the asset's `quote_url` in the profile at the end of the run (tell the user in one line), so the next run goes straight to it. Only when all of this fails, use `n/a` (FR: `n.d.`). In the summary table, an estimated change must be labelled as such (e.g. "≈ −4 % (estimé)").

Rules:
- Record source and as-of date for every figure. If a number cannot be found or verified, write `n/a` (FR: `n.d.`) and say so — never invent prices.
- Prefer primary or market-data sources: exchanges, issuers, Reuters, Bloomberg, FT, Investing.com, Boursorama, CoinGecko/CoinMarketCap, official statistics.
- For thematic assets with no single ticker (e.g. "defense sector"), use the reference instruments stored in the profile, or name the proxy you used.

### B2. Signals

For each asset, assign one signal — `buy`, `neutral` or `wait` — using `references/signals.md`: an asset-level score, then thresholds that depend on the user's risk profile, then a check against their goals and (if provided) their weights. The rationale must be 1–3 sentences grounded in the research and should mention the profile when it changed the outcome.

### B3. Build the data file

Write a JSON data file in the scratchpad following the schema in `references/report-structure.md` (all prose in the profile language). Then render it with the bundled script:

```bash
node <skill-dir>/scripts/build_report.js <data.json> <output-path>
```

The format is taken from the output extension (`.docx`, `.md`, `.html`). For docx, the script needs the `docx` npm package: if `node -e "require('docx')"` fails, run `npm install --prefix <scratchpad> docx` and prefix the command with `NODE_PATH=<scratchpad>/node_modules`. Markdown and HTML have no dependencies.

Report sections (the script lays them out; you provide the content):
1. Cover — title, long-format date, profile summary line
2. Macro view of the week — 2–3 paragraphs
3. Market news — bullets
4. Asset-by-asset analysis — price + weekly change, context, recent news, signal + rationale
5. Alignment with your goals — 1–3 paragraphs: how the watchlist/portfolio fits the risk profile and each goal, concentration, short-term goals exposed to volatile assets. Always state explicitly whether the goals changed any signal this week (which ones and why) or not (one sentence saying none did, and why — e.g. no deadline within 12 months)
6. Signal summary table — Asset | Price | Change | Signal
7. Sources and disclaimer

### B4. Save

- Report date = the profile's `report_day` of the current week (Monday–Sunday) in the profile's timezone; compute it with `date`/`TZ=...`.
- Filename: `investment-report-YYYY-MM-DD.<ext>` (FR profile: `rapport-investissement-YYYY-MM-DD.<ext>`).
- Directory: the profile's `output.directory` if set and writable, otherwise the current working directory, otherwise the environment's outputs directory.

### B5. Verify and deliver

- Check the file: all assets appear in section 4 and in the summary table, text is in the profile language, no placeholder left. For docx, if LibreOffice is available, convert to PDF to confirm it renders.
- Deliver the file (SendUserFile or the environment's file-sharing mechanism, otherwise give the path).
- End the reply with a 3–5 line summary in the profile language: which assets are buy / neutral / wait and the main macro driver, then one line saying this is not investment advice.

## Mode C — Edit profile

- `show`: print the current profile as a readable summary (and the JSON on request).
- `add <asset>`: resolve the instrument as in onboarding step 4, confirm, append.
- `remove <asset>`: match by name or ticker, confirm, remove.
- `edit`: ask which section to change (language/currency, risk, goals, assets, weights, output), re-run only that part of `references/onboarding.md`.
- Always show a diff-like summary and save after confirmation. Bump `updated_at`.

## Guardrails

- Every report and the final reply carry the disclaimer from `references/report-structure.md`. Signals are informational, generated from public information and a self-declared profile; they are not personalized investment advice.
- Do not ask for or store account numbers, broker credentials, or position amounts. Portfolio weights are percentages only. The only amounts allowed are goal targets the user gives (e.g. "50K for a down payment"), stored as the user wrote them.
- Do not execute or suggest specific trade sizes.
