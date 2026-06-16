# Zoé Axon — Interactive System-Design Explainer

A single-page, static, interactive website that explains **how the Zoé Axon autonomous IT-support system works** — in plain language, with animation. It's the system-design twin of a product demo.

The centrepiece is a **Playground**: pick any IT problem (password reset, licence expired, VPN down…), press **Play**, and watch the whole system resolve it step by step — what the agent understood, which recipe (SOP) it ran, which systems it touched, what it checked, where a human approved, and how it closed the ticket.

Everything runs on **mock data**. There is no backend, no build step, no framework, and no npm.

## What's inside

| Section | What it shows |
|---|---|
| **Overview** | The pitch + an always-running mini pipeline and illustrative stat counters |
| **60-second mental model** | The same five steps, every ticket |
| **Architecture** | Six clickable planes, plain-language side panel, Hybrid ↔ Full-cloud toggle |
| **Playground** ⭐ | The interactive engine — conversation, the Brain, the outcome, a live architecture mini-map, and a synced JSON view |
| **How SOPs work** | The `license_expired` recipe as annotated JSON |
| **Modularity** | One core, pluggable rings (channels · recipes · connectors) |
| **Outcomes** | A small mock exec dashboard |

### Seven scenarios
1. **Password reset** — fully automatic
2. **Licence expired** — automatic, pauses for a manager's approval (HITL)
3. **VPN keeps dropping** — three AI workers triage in parallel, then fix
4. **Software request** — approval, then auto-install
5. **New joiner setup** — a multi-step saga that can undo itself
6. **Slow laptop** — self-heal (+ a proactive note)
7. **Laptop won't boot** — a remote fix fails → compensation → handed to a human

## Run it locally

It's pure static files, so just open `index.html` — or serve the folder:

```bash
# option A: just open the file
open index.html

# option B: any static server (nicer for fonts/relative paths)
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Tech

- **HTML5 + CSS3 + vanilla JS** — zero dependencies required.
- Google Fonts (Plus Jakarta Sans, DM Sans, JetBrains Mono) and an optional **Chart.js** CDN for the one dashboard chart.
- All asset paths are **relative**, and a `.nojekyll` file is included, so it works both by opening `index.html` directly and when served from a `https://<user>.github.io/<repo>/` sub-path.
- Fully responsive, keyboard accessible, and respects `prefers-reduced-motion`.

To add a new scenario, append one object to `SCENARIOS` in [`js/data.js`](js/data.js) — the engine renders it generically; no code changes needed.

## Deploy to GitHub Pages

```bash
git init && git add -A && git commit -m "Zoé Axon interactive system-design explainer"
gh repo create zoe-axon-explainer --public --source=. --remote=origin --push
gh api -X POST repos/{owner}/zoe-axon-explainer/pages -f "source[branch]=main" -f "source[path]=/"
```

**Live site:** https://saswat-mishra.github.io/zoe-axon-explainer/

---

*Interactive system-design explainer · mock data · not a live system.*
