# Report data file

`scripts/build_report.js` renders a single JSON data file to docx, Markdown or HTML. You write the content; the script handles layout, styling, section titles, signal labels and colours.

## Schema

```json
{
  "language": "fr",                       // fr | en | es | de — selects built-in labels
  "date_iso": "2026-10-10",
  "date_long": "samedi 10 octobre 2026",  // written in the profile language
  "profile_line": "Profil dynamique · EUR · 12 actifs suivis",
  "title": null,                          // optional override of the default title
  "macro": ["Paragraph 1", "Paragraph 2"],
  "news": ["Bullet 1", "Bullet 2"],
  "assets": [
    {
      "name": "MSCI World (Amundi PEA, CW8)",
      "price": "512,34 €",                // formatted string, or "n.d." / "n/a"
      "change": "+1,2 %",                 // weekly change, formatted string
      "context": "Paragraph on macro and fundamentals.",
      "news": ["Recent news 1", "Recent news 2"],
      "signal": "neutral",                // buy | neutral | wait
      "rationale": "1–3 sentences.",
      "weight": "30 %"                    // optional, shown only if present
    }
  ],
  "alignment": ["Paragraph on fit with risk profile and goals"],
  "sources": [
    { "title": "Reuters — Fed holds rates", "url": "https://…", "date": "2026-10-07" }
  ],
  "labels": {}                            // optional overrides of any built-in label
}
```

All fields except `labels`, `title` and per-asset `weight` are required. Keep `price` and `change` in the number format of the profile language (FR: `1 234,56 €`, `+1,2 %`; EN: `$1,234.56`, `+1.2%`).

## Section content guidelines

- **Macro**: 2–3 paragraphs, 60–120 words each: central banks, inflation, growth, geopolitics; tie to the asset types in the watchlist.
- **News**: 5–10 bullets, one sentence each, most market-moving first.
- **Asset context**: 60–120 words. **Asset news**: 1–4 bullets, dated if possible.
- **Alignment**: 1–3 paragraphs. Cover: overall risk level of the watchlist vs. the profile; each short-term goal (is money for it exposed to volatile assets?); each long-term goal (is the watchlist diversified enough for it?); concentration if weights exist. Neutral, descriptive tone — no orders.
- **Sources**: every figure in the report should trace to one of them.

## Disclaimer (built into the script per language)

- fr: « Ce rapport est fourni à titre informatif et ne constitue pas un conseil en investissement. Les signaux sont générés automatiquement à partir d'informations publiques et d'un profil auto-déclaré. »
- en: "This report is for informational purposes only and does not constitute investment advice. Signals are generated automatically from public information and a self-declared profile."

## Styling (docx and HTML)

Arial, body 11 pt; title 20 pt bold `#1F3864`; H1 16 pt bold `#1F3864`; H2 13 pt bold `#002060`; A4 with 1-inch margins; footer with date and page number (docx); summary table header `#1F3864` with white text; signal cells coloured per `signals.md`.
