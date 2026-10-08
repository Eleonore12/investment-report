# investment-report — a Claude skill

A [Claude skill](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview) that writes you a **personalized weekly investment report** on the assets *you* follow — price, weekly change, news, macro context and an entry signal (Buy / Neutral / Wait) adapted to **your risk profile and goals**.

The first time you run it, it interviews you (≈ 3 minutes). After that, one command gives you the report.

```
/investment-report
```

> ⚠️ **Not investment advice.** Reports are generated automatically from public web sources and a self-declared profile. Figures can be wrong or stale; every report lists its sources. Do your own research.

## What you get

- **Macro view of the week**: central banks, inflation, growth, geopolitics
- **Market news** of the last 7 days
- **Asset-by-asset analysis**: price, weekly change, context, recent news, signal + rationale
- **Alignment with your goals**: is your watchlist consistent with your risk profile, are short-term goals exposed to volatile assets, any concentration issues (if you gave weights)?
- **Signal summary table**, then dated sources and a disclaimer

Output as **Word (.docx)**, **Markdown** or **HTML**, in **English, French, Spanish or German**.

## First run: the onboarding

| Step | What it asks |
|---|---|
| 1 | Report language and reference currency |
| 2 | Risk profile: a self-assessment plus 3 calibration questions (drawdown reaction, horizon, share of wealth) |
| 3 | Short-term (< 2 years) and long-term goals, with horizons |
| 4 | Assets to track, in free text ("MSCI World PEA, bitcoin, Boliden, defense sector"). Claude resolves each one to a precise instrument (ticker, exchange, ISIN) and asks you to confirm |
| 5 | *Optional*: current portfolio weights, as percentages only |
| 6 | Output format, report day, timezone, output folder |

Your answers are saved as plain JSON in `~/.investment-report/profile.json` (see [`profile.example.json`](profile.example.json)). You can edit it by hand.

**Nothing sensitive is collected:** no account numbers, no broker credentials, no amounts.

## Commands

| Command | Effect |
|---|---|
| `/investment-report` | Generate the report (or start onboarding if there is no profile) |
| `/investment-report show` | Display your profile |
| `/investment-report add <asset>` | Add an asset to track |
| `/investment-report remove <asset>` | Stop tracking an asset |
| `/investment-report edit` | Change one part of the profile (risk, goals, weights, format…) |
| `/investment-report setup` | Start the onboarding over |

Natural language works too: *"add uranium to my report"*, *"switch my report to HTML"*.

## How signals are computed

The signals are deterministic rules, not vibes. Full detail is in [`references/signals.md`](references/signals.md).

1. **Asset score** (−4 … +4): the sum of trend/technicals, fundamentals/valuation, 7-day catalysts and macro fit, each scored −1 / 0 / +1.
2. **Profile thresholds**: a conservative profile needs a higher score to reach *Buy*. Very volatile assets (crypto, junior miners…) are capped for conservative and balanced profiles.
3. **Goal checks**: a short-term goal within 12 months, a concentrated position or a horizon mismatch can downgrade a signal, never upgrade it.

## Installation

### Claude Code

```bash
git clone https://github.com/Eleonore12/investment-report ~/.claude/skills/investment-report
```

Then run `/investment-report` in any session. Requirements:
- **Node.js ≥ 18**
- Web search enabled
- For `.docx` output, the `docx` npm package. The skill installs it on the fly if it is missing, or you can install it yourself:

```bash
npm install -g docx
```

### Claude.ai (web / desktop)

1. Zip the folder (`investment-report/` with `SKILL.md` at its root).
2. Upload it under **Settings → Capabilities → Skills**.
3. Enable code execution and web search.

The claude.ai sandbox doesn't keep files between conversations. At the end of onboarding, the skill prints your profile as JSON; paste it at your next run, or put it in a Project's instructions so it's always available.

### Scheduling

In Claude Code or the Claude desktop app, you can schedule it, e.g. *"run /investment-report every Saturday at 9am"*.

## Repository layout

```
SKILL.md                      # entry point: routing between onboarding / report / edit
references/onboarding.md      # the questionnaire and risk scoring
references/signals.md         # signal rules
references/report-structure.md# data-file schema and writing guidelines
scripts/build_report.js       # renders the data file to .docx / .md / .html
profile.example.json          # example profile
examples/                     # sample data and rendered outputs (fictitious figures)
```

To preview the renderer without running the skill:

```bash
node scripts/build_report.js examples/sample-data.json /tmp/sample.html
```

## Privacy

The profile stays on your machine (or in your own Claude Project). Reports are built from web searches run by Claude. The searches contain asset names, never your weights or goals.

## License

MIT
