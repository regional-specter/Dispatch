# Dispatch
Terminal user interface for air freight dispatchers to predict engine failures, calculate cargo balance, forecast flight delays, and generate customs manifests

### **Application Features**

- **4 Core ML Engine Models:**
    - **Cargo Weight & Balance Optimization:** A deep reinforcement learning or heuristic model to balance cargo across plane pallets ($3D$ bin-packing) to optimize fuel burn.
    - **Flight Disruption & Delay Predictor:** Predicts ETA variance and delay risk based on incoming weather vectors, airport congestion levels, and air traffic data.
    - **Dynamic Freight Spot-Pricing Model:** Predicts freight rate spikes using historical seasonality, fuel price indices, and weight utilization metrics.
    - **Jet Engine Predictive Maintenance:** Analyzes streaming simulated IoT sensor feeds (vibration, thermal degradation) to forecast Remaining Useful Life (RUL) before mechanical failures.
- **Agentic Logistics Chatbot:** A TUI-embedded assistant using RAG linked to global customs regulations, hazardous material rules (IATA), and active manifests to answer complex routing questions.
- **Dual-Format Manifests:** Generates structured, high-density JSON/YAML manifests for customs automated clearance systems, alongside clean, terminal-styled Markdown briefings for the ground crew.
- **Real-Time Alerts:** Live notification system inside the TUI capturing critical fuel price changes or severe weather rerouting.

---

## Model 1: Jet Engine Predictive Maintenance (RUL)

- **Objective:** Predict the exact number of remaining operational flight cycles before an aircraft engine requires overhaul or risks mechanical failure.
- **The Math & Architecture:** This is formulated as a sequence-to-many regression problem. You feed rolling time-series windows of sensor data into an **LSTM (Long Short-Term Memory)** network or a **1D-CNN (Temporal Convolutional Network)**. The model learns features across a sliding historical cycle window ($T$) to output a continuous target variable:

```math
    $$
    RUL_t = \max(0, \text{Max\_Cycle}_i - t)
    $$
```
To improve model stability early in an engine's life cycle, a piecewise linear RUL target function is typically applied, capping maximum healthy RUL at a fixed threshold (e.g., $125$ cycles).
    
- **Dataset to Use:** **NASA C-MAPSS Turbofan Engine Degradation Simulation Dataset**. It tracks $21$ simulated sensor outputs (including total temperature, pressure, compressor speeds, and fuel flow) running from a completely healthy state down to operational failure across multiple operating conditions.
- **TUI Representation:** Rendered as a real-time system health grid. As you cycle through tail numbers in the terminal dashboard, it maps current sensor outputs onto a custom progress bar component that flashes red when predicted $RUL < 15$ cycles, prompting immediate ground maintenance logs.

## Model 2: Flight Disruption & Delay Predictor

- **Objective:** Classify whether an upcoming flight route will face a critical delay (greater than $15$ minutes) and predict the exact duration of the delay vector.
- **The Math & Architecture:** A dual-stage ensemble framework using **LightGBM** or **XGBoost**.
    - *Stage 1:* Binary classification estimating the probability of a delay ($P(\text{Delay}) \ge \theta$).
    - *Stage 2:* If a delay is triggered, a gradient-boosted regression tree estimates the exact duration in minutes.
        
        Feature engineering is the heavy lifter here: cyclic encodings (using sine and cosine transformations) must be applied to time parameters like `day_of_week` and `scheduled_dep_hour` to capture temporal continuity.
        
- **Dataset to Use:** **Flight Delay Dataset (2024 / Bureau of Transportation Statistics)** on Kaggle. This gives you over 7 million rows of real-world domestic flight records with exact breakdowns of delay root causes (e.g., `carrier_delay`, `weather_delay`, `nas_delay`).
- **TUI Representation:** Integrated directly into a dynamic flight scheduling viewport. Delayed routes are highlighted with amber warnings, displaying a breakdown of the structural cause of the delay (e.g., `[WX]` for weather, `[EQ]` for equipment) alongside the model's prediction confidence score.

## Model 3: Cargo Weight & Balance Optimization

- **Objective:** Automate the placement of physical cargo pallets (Unit Load Devices - ULDs) across an aircraft's main and lower decks to ensure total center of gravity (CG) boundaries fall strictly within certified structural flight limits.
- **The Math & Architecture:** This is a multi-constrained **3D Bin Packing Problem** solved via a hybrid heuristic approach or a **Deep Reinforcement Learning (DRL)** agent using a Proximal Policy Optimization (PPO) framework. The action space is the coordinate placement grid within the aircraft hold. The reward function penalizes violations of structural constraints and rewards tighter alignment with the target Zero-Fuel Center of Gravity (ZFCG) position:
    
```math
    \text{Reward} = -(\alpha \cdot \vert{}\text{Target CG} - \text{Current CG}\vert{} + \beta \cdot \text{Volume Wastage})
```
    
- **Dataset to Use:** **IATA Cargo 2000 (Cargo iQ Case Study Dataset)** combined with synthetic aircraft structural limit blueprints (e.g., Boeing 777F maximum weight limits per compartment zone). The Cargo 2000 data tracks physical shipping leg volumes, process tracking milestones, and cargo dimensions.
- **TUI Representation:** Uses a scannable ASCII text matrix rendering a schematic top-down structural blueprint of the aircraft deck layouts. It visually maps out density zones using varying block intensities (`█`, `▓`, `▒`), flashing warning indicators if a cargo configuration shifts the CG into a dangerous tail-heavy or nose-heavy threshold.

## Model 4: Dynamic Freight Spot-Pricing Engine

- **Objective:** Generate real-time spot price estimations per kilogram for incoming cargo requests based on active market capacity, route history, and fuel index trends.
- **The Math & Architecture:** An automated time-series forecasting pipeline using **Prophet** or **CatBoost Regression** to handle sparse, high-cardinality categorical inputs (like airline codes, destination airport pairs, and cargo categories). The optimization loop factors in short-term exponential smoothing of jet fuel spot prices alongside historical seasonal peaks (e.g., Q4 peak shipping seasons).
- **Dataset to Use:** **Air Traffic Cargo Statistics Dataset** or **Air Cargo Resource Allocation Data** on Kaggle. These datasets capture historical metrics on airline freight performance, volume fluctuations, regional distribution, and operational metrics in metric tonnes over multi-year periods.
- **TUI Representation:** Displayed as a responsive, real-time telemetry line graph inside the terminal viewport (rendered using braille Unicode patterns via the `Rich` console package). Dispatchers can input custom dimensions and instantly see the predicted price spread, complete with lower and upper confidence intervals.

---
