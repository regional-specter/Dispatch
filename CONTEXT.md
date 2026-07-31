# Dispatch — Product Context

Web dashboard for air freight dispatchers to predict engine failures, calculate cargo balance, forecast flight delays, and generate customs manifests.

---

## Ground Rules

- **Notebooks are research only.** Kaggle notebooks stay in `notebooks/`. Production logic lives in `src/dispatch/` (Python).
- **Frontend is Next.js.** Minimal white-mode UI. Deployed on Vercel.
- **Backend is Python.** FastAPI for inference and training scripts. Deployed separately (Railway or Render).
- **One model at a time.** Ship Phase 1 fully before expanding. No half-wired features in the live app.
- **Prove the models work.** Every live model shows holdout metrics in the UI (ROC-AUC, MAE, etc.) with a link to the source notebook.
- **Demo without Kaggle.** Committed sample data in `data/samples/` so the app runs without external downloads.
- **Artifacts are versioned, not retrained in CI.** Trained weights live in `models/artifacts/` or GitHub Releases. CI only tests inference on fixtures.

---

## Tech Stack

| Layer | Choice | Deploy |
|-------|--------|--------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS | Vercel |
| API | FastAPI, Pydantic | Railway / Render |
| ML | LightGBM, PyTorch (later), scikit-learn | Runs in API container |
| Data | CSV fixtures + optional Kaggle download scripts | `data/samples/` |

---

## UI Direction

**White-mode minimalism.** Clean, data-forward, lots of breathing room. No dark mode in Phase 1.

### Reference Designs

Three reference images define the Dispatch look. Store copies in `docs/design/` when added to the repo.

| Reference | What to borrow | Dispatch use |
|-----------|----------------|----------------|
| **Tableau Pulse** | Greeting header, AI-style summary bullets, metric card grid, sparkline area charts, green/red trend deltas, one-line natural-language insights per card | Main dashboard (`/`) — four model tiles as pulse-style metric cards |
| **123done / Universal Data Visualization** | White cards on cool grey canvas, thin horizontal bar charts, large bold hero numbers, small grey labels, minimal shadows (borders only), `...` menu per card | Model detail pages — delay probability, RUL, pricing metrics, cargo CG status |
| **Unriddle (split-pane chat)** | Left panel = document/content viewer, right panel = chat; rounded input, orange accent CTA, context chips in input, clean sans-serif | Phase 3 logistics chatbot — manifest viewer left, RAG assistant right |

### Design Tokens

| Token | Value | Notes |
|-------|-------|-------|
| Page background | `#F7F8FA` | Cool light grey behind cards |
| Card background | `#FFFFFF` | Pure white |
| Card border | `#E8EAED` | Thin, 1px — depth via border, not shadow |
| Card radius | `12px` (`rounded-xl`) | Consistent on all cards |
| Primary text | `#111827` | Headings, hero metrics |
| Secondary text | `#6B7280` | Labels, timestamps, captions |
| Accent (primary) | `#2563EB` | Active tabs, chart lines, links |
| Positive trend | `#16A34A` | On-time, healthy RUL, price down |
| Negative trend | `#DC2626` | Delayed, critical RUL, risk alerts |
| Accent (chat CTA) | `#F97316` | Send button, pro prompts (Phase 3 only) |

### Typography

- **Font:** Inter or system sans-serif (`font-sans`).
- **Hero metric:** Large, bold (e.g. `text-3xl font-semibold`).
- **Card title:** Medium weight (`text-sm font-medium text-gray-500` label → `text-base font-semibold` title).
- **Insight line:** Small body text at card bottom — one sentence explaining the number.

### Layout Patterns

- **Dashboard grid:** `grid-cols-1 md:grid-cols-2 lg:grid-cols-2` for four model cards (2×2), or 3-col when more metrics ship.
- **Card padding:** `p-6`, grid gap `gap-6`.
- **Page header:** Greeting → bold title → date/subtitle → optional AI summary block → text tabs with blue underline on active.
- **Charts:** Recharts or Tremor — simple area sparklines (Tableau Pulse style) or thin horizontal bars (123done style). No heavy grid lines.
- **Sparse chrome:** Logo top-left, minimal nav, no gradients or glassmorphism.

### Metric Card Template (per model)

Each model card on the dashboard follows this structure:

1. Small grey period label (e.g. "Live model" / "Coming soon")
2. Model name (bold)
3. Hero value (e.g. delay probability, RUL cycles, $/kg)
4. Trend or status chip (green / amber / red)
5. Mini sparkline or bar chart (when data available)
6. One-line insight at the bottom (e.g. "ROC-AUC 0.89 on BTS 2024 holdout")

### Page Mapping

| Page | Primary reference | Content |
|------|-------------------|---------|
| `/` | Tableau Pulse | 4 model cards, summary, "Live" / "Soon" badges |
| `/delays` | 123done + Pulse | Flight form + prediction card + model metrics |
| `/engines` | 123done | Engine health bars, RUL countdown (Phase 2) |
| `/cargo` | 123done + existing 3D loader | CG metrics sidebar + embedded `cargo-loader` (Phase 2) |
| `/pricing` | Pulse sparklines | Rate forecast chart (Phase 3) |
| `/chat` | Unriddle | Manifest/doc left, RAG chat right (Phase 3) |

### Trust Signals

- Model metrics (ROC-AUC, MAE, F1) visible on every prediction screen.
- Link to source Kaggle notebook from each model page.
- "Showing results as of [date]" subtitle on dashboard.

---

## Repository Layout

```
dispatch/
├── CONTEXT.md              # This file — phases, rules, workflow
├── README.md               # Public-facing project overview
├── notebooks/              # Kaggle notebooks (reference)
├── data/
│   ├── raw/                # gitignored
│   └── samples/            # demo CSVs (committed)
├── models/
│   └── artifacts/          # trained weights + .meta.json
├── src/dispatch/
│   ├── features/           # feature engineering
│   ├── training/           # train scripts
│   └── inference/          # load + predict
├── api/
│   └── main.py             # FastAPI app
└── web/                    # Next.js dashboard
```

---

## Application Features (Full Vision)

- **4 Core ML Models:**
    - **Cargo Weight & Balance Optimization:** DRL/heuristic 3D bin-packing for pallet placement and CG limits.
    - **Flight Disruption & Delay Predictor:** Two-stage LightGBM — delay probability, then duration in minutes.
    - **Dynamic Freight Spot-Pricing Model:** Time-series forecasting for per-kg spot rates.
    - **Jet Engine Predictive Maintenance:** LSTM/CNN on C-MAPSS sensor streams for RUL.
- **Agentic Logistics Chatbot:** RAG over IATA/customs docs (later phase).
- **Dual-Format Manifests:** JSON/YAML for customs + Markdown briefings for ground crew.
- **Real-Time Alerts:** Weather, fuel, and maintenance thresholds (later phase).

---

## Phases

### Phase 1 — "It works" (current)

**Goal:** A live dashboard where visitors can score a flight for delay risk and see that the model is real.

| Deliverable | Status |
|-------------|--------|
| CONTEXT.md (this file) | ✅ |
| Python package: delay feature engineering + inference | 🔲 |
| Training script + sample data + saved artifacts | 🔲 |
| FastAPI: `GET /health`, `POST /predict/delay`, `GET /models/delay` | 🔲 |
| Next.js dashboard on Vercel | 🔲 |
| Delay predictor page: form → prediction + metrics | 🔲 |
| Placeholder tiles for Cargo, RUL, Pricing (coming soon) | 🔲 |

**Phase 1 model:** Flight Disruption & Delay Predictor

- *Stage 1:* LightGBM classifier → $P(\text{delay} > 15\text{ min})$
- *Stage 2:* LightGBM regressor → delay duration in minutes
- *Dataset:* BTS Flight Delay 2024 (notebook); demo uses `data/samples/flights_demo.csv`
- *UI:* Flight form (carrier, route, date, time, distance) → delay badge, minutes, confidence, model metrics

**Workflow:**

```
1. notebooks/flight-disruption-delay-predictor.ipynb  →  research & EDA
2. src/dispatch/training/train_delay.py               →  reproducible train
3. models/artifacts/delay_*.pkl + delay.meta.json     →  saved weights
4. api/main.py                                        →  serve predictions
5. web/                                               →  dashboard + delay page
6. Vercel (web) + Railway (api)                       →  live URLs in README
```

---

### Phase 2 — "It's a product"

- Wire **cargo-loader** 3D demo to Python API for model-backed auto-balance.
- Add **RUL** page with simulated C-MAPSS sensor replay.
- Manifest export (JSON) from cargo state.
- Model cards on dashboard with evaluation charts.

---

### Phase 3 — Full vision

- Freight spot-pricing page with live chart.
- RAG chatbot for routing / customs questions.
- Background alerts (WebSocket or polling).
- Optional auth for internal dispatcher use.

---

## Model Reference (from notebooks)

### Model 1: Jet Engine RUL

- **Objective:** Remaining useful life in flight cycles before overhaul.
- **Architecture:** LSTM or 1D-CNN on rolling sensor windows.
- **Dataset:** NASA C-MAPSS.
- **Web UI (planned):** Engine health grid, RUL bar, red alert when RUL &lt; 15.

### Model 2: Flight Delay Predictor ✅ Phase 1

- **Objective:** Binary delay (&gt;15 min) + regression on duration.
- **Architecture:** Two-stage LightGBM ensemble.
- **Dataset:** BTS 2024 domestic flights.
- **Web UI:** Schedule view, amber delay warnings, cause tags, confidence.

### Model 3: Cargo Weight & Balance

- **Objective:** 3D ULD placement within CG/certified limits.
- **Architecture:** PPO (DRL) or hybrid heuristic.
- **Dataset:** Cargo iQ + Boeing 777F limits.
- **Web UI:** Integrate existing `cargo-loader/` 3D view.

### Model 4: Freight Spot Pricing

- **Objective:** Per-kg spot rate from capacity, route, fuel index.
- **Architecture:** Prophet or CatBoost regression.
- **Dataset:** Air cargo statistics (Kaggle).
- **Web UI:** Input dimensions → price band + confidence interval.

---

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_API_URL` | web (Vercel) | FastAPI base URL |
| `CORS_ORIGINS` | api | Allowed frontend origins |
| `MODEL_DIR` | api | Path to `models/artifacts/` |

---

## Local Development

```bash
# Terminal 1 — API
cd api && pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 2 — Web
cd web && npm install && npm run dev

# Train models (once)
python -m dispatch.training.train_delay
```

Open **http://localhost:3000** (web) · API docs at **http://localhost:8000/docs**

---

## Deployment Checklist

- [ ] Push `web/` to Vercel — set `NEXT_PUBLIC_API_URL`
- [ ] Deploy `api/` to Railway/Render — set `CORS_ORIGINS` to Vercel URL
- [ ] Upload model artifacts or bake into Docker image
- [ ] Add "Try it live" link to README.md
- [ ] Verify `/delays` end-to-end on production URLs

---
