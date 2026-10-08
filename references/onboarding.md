# Onboarding

Goal: build a complete profile in 5–6 short turns. Speak in the user's language from the first message (detect it from how they invoked the skill; confirm in step 1). Keep a friendly, efficient tone and explain in one sentence why each block is asked.

Open with: one sentence explaining that this is a one-time setup (≈ 3 minutes), that answers are stored locally in a plain JSON file they can edit, and that no account numbers or position amounts are collected.

## Step 1 — Language & currency

Ask together:
- Report language (options: Français, English, Español, Deutsch; "Other" allowed)
- Reference currency (EUR, USD, GBP, CHF; "Other" allowed)

Prices are still reported in each instrument's quote currency; the reference currency is used for context (FX impact mentioned when relevant).

## Step 2 — Risk profile

Ask the self-assessment and three calibration questions (use one `AskUserQuestion` call with 4 questions if available).

**Q0 — Self-assessment.** "How would you describe yourself as an investor?"
1. Conservative — capital preservation first
2. Balanced — moderate growth, moderate swings
3. Growth — accepts large swings for higher returns
4. Aggressive — maximum growth, accepts very large drawdowns

**Q1 — Drawdown reaction.** "Your portfolio falls 20 % in a month. You…"
1. Sell most of it
2. Sell part of it
3. Hold and wait
4. Buy more

**Q2 — Main horizon.** "When will you need most of this money?"
1. < 2 years
2. 2–5 years
3. 5–10 years
4. > 10 years

**Q3 — Weight in total wealth.** "What share of your total savings does this portfolio represent?"
1. > 75 %
2. 50–75 %
3. 25–50 %
4. < 25 %

**Scoring.** Each answer is worth 1–4 points. Compute `calibrated = round(mean(Q1, Q2, Q3))`. Final profile:
- If `|Q0 − calibrated| ≤ 1` → use Q0 (respect the user's own view).
- Otherwise → use `calibrated`, and tell the user in one sentence why their answers point to a different profile; let them override.

Map 1→`conservative`, 2→`balanced`, 3→`growth`, 4→`aggressive`. Store the raw answers in `risk.answers` for transparency.

## Step 3 — Goals

Ask in free text (or offer examples as options):
- **Short-term goals** (< 2 years): e.g. emergency fund, down payment, planned purchase. For each: label, horizon (months or a date), optional target amount, optional priority.
- **Long-term goals**: e.g. retirement, wealth growth, children's education, financial independence. For each: label, horizon (years), optional target amount, optional priority.

"None" is a valid answer for either. Users often answer loosely; normalise as follows and ask at most one follow-up turn:

| The user gives… | Do |
|---|---|
| An amount only ("50K") | Ask what it is for and by when. If they give a deadline, it becomes a goal with `target`. If they say there is no deadline, store it in `goals.milestones` (`label`, `target`, `horizon: "none"`): milestones are shown in the report but never change signals. |
| An age ("independence at 50") | Ask their current age (or birth year) and convert to `horizon_years` and `target_year`. Do not store the age itself. |
| A vague horizon ("soon", "later") | Offer ranges: < 12 months, 1–2 years, 2–5 years, 5–10 years, > 10 years. |

Store amounts exactly as written, with the currency (default: the reference currency), e.g. `"target": "50K USD"`. Reformulate each goal in one line and confirm.

**Consistency check with step 2.** Compare Q2 (main horizon) with the goals:
- Let `goal_horizon` = the horizon of the highest-priority goal that holds most of the money (if unclear, the longest long-term goal when there are no short-term goals, otherwise the nearest short-term goal).
- If the bucket for `goal_horizon` (< 2 y → 1, 2–5 y → 2, 5–10 y → 3, > 10 y → 4) differs from Q2 by 2 or more, or by 1 when Q2 = 1, point it out in one sentence and ask which is right (e.g. "You answered 2–5 years earlier, but your main goal is 19 years away. Which horizon should I use?").
- If the answer changes Q2, recompute the risk score with the step 2 rules, show the before/after in one line, and store a short `risk.note` describing the correction.

## Step 4 — Assets to track

Ask: "Which assets do you want to follow? List them freely: names, tickers, ISINs, sectors or themes."

Then for **each** item:
1. Resolve it to a precise instrument with a quick WebSearch if there is any doubt: name, ticker, exchange, ISIN (if any), type (`stock`, `etf`, `crypto`, `commodity`, `index`, `bond`, `fund`, `theme`), quote currency.
2. When several instruments match (e.g. "MSCI World" → CW8 (PEA, EUR), IWDA (Amsterdam, USD), SWDA (London, GBP)), offer the 2–4 most likely choices, favouring the user's reference currency and country-specific wrappers.
3. For a theme or sector without a single ticker (e.g. "defense", "energy transition metals"), store `type: "theme"` with 1–3 reference instruments in `proxies`, and a one-line `scope`.
4. If the resolution search surfaced a reliable quote page for the instrument (issuer, Boursorama, Google Finance, CoinGecko…), store it as `quote_url`. Optional: the report fills it in later otherwise.
5. Never pick a leveraged or inverse product (e.g. names containing 2X, 3X, Bull, Bear, Ultra, Daily) as an instrument or a theme proxy unless the user explicitly asks for one.
6. Give each asset a `volatility_class`: `low` (money market, short bonds, broad bond ETFs), `medium` (broad equity indices, gold, large caps), `high` (single stocks, sector/thematic ETFs, emerging/frontier markets, small caps, industrial metals, miners), `very_high` (crypto, leveraged products, uranium miners, junior miners). This is used by the signal rules.

Show the resolved list as a table (Name | Ticker | Exchange | Type | Volatility class) and ask for confirmation or corrections. No hard limit on count, but above 20 assets warn that the report will be long and research slower.

## Step 5 — Portfolio weights (optional)

Ask: "Do you want to give the current weight of each asset in your portfolio? It lets the report flag concentration and goal mismatches. Percentages only, never amounts. You can skip."

Options: "Yes, I'll give weights" / "Skip".

If yes: collect `asset → %`. Allow an `other` bucket (cash, assets not tracked). If the total isn't 100 % ± 2, show the total and ask whether to normalise or fix. Store weights as decimals in `assets[].weight` and `portfolio.other_weight`; set `portfolio.weights_as_of` to today.

## Step 6 — Output preferences

Ask together:
- Format: Word (.docx), Markdown (.md), HTML (.html). Default: docx.
- Report reference day: the date printed on the report (default: Saturday of the current week). Options: Friday, Saturday, Sunday, "Day of the run".
- Timezone: propose the one matching the language/currency (e.g. Europe/Paris for FR+EUR) and let the user correct.
- Output directory (only in environments with a persistent filesystem): default = the current working directory; let them give a path.

## Step 7 — Confirm & save

Show a compact summary (language, currency, risk profile with one-line description, goals, asset table, weights if any, output). Ask "Save this profile?" On yes:
- Fill `version`, `created_at`, `updated_at` (ISO dates).
- Save as described in SKILL.md Step 0 (create the directory if needed), or print the JSON block if there is no persistent filesystem.
- Tell the user where it lives and that `/investment-report edit` changes it.

Then go straight to the first report (SKILL.md Mode B).
