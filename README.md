# Aniimaster (Aniimax ES) — Base Optimizer, Homeland Calculator & Aniimo Recommender

**[🇬🇧 English](README.md) · [🇪🇸 Español](README_ES.md)**

[![License](https://img.shields.io/badge/License-Non--Commercial%20(oscarlosu--lab)%20%2B%20Upstream%20MIT-f59e0b?style=flat-square)](LICENSE)
[![GitHub Pages](https://img.shields.io/github/deployments/oscarlosu-lab/aniimax-es/github-pages?label=GitHub%20Pages&style=flat-square&logo=github)](https://oscarlosu-lab.github.io/aniimax-es/)
[![Last Commit](https://img.shields.io/github/last-commit/oscarlosu-lab/aniimax-es?style=flat-square&color=10b981)](https://github.com/oscarlosu-lab/aniimax-es/commits/main)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support%20Project-FF5E5B?style=flat-square&logo=ko-fi&logoColor=white)](https://ko-fi.com/oscarlosu)

> 🚀 **[LAUNCH THE LIVE WEB CALCULATOR!](https://oscarlosu-lab.github.io/aniimax-es/)**  
> *Free, mobile- and desktop-responsive web app (PWA), zero downloads, no ads, 100% client-side in your browser.*

---

## 🎯 What is Aniimaster (Aniimax ES)?

**Aniimaster** is a **mathematical planning and optimization tool for Homeland / Base management in *Aniimo***. Powered by a **Mixed-Integer Linear Programming (MIP)** solver compiled from **Rust to WebAssembly (HiGHS)**, it computes:

- 💰 **Fastest Home Coin Route:** Maximizes hourly coin income by crafting and selling the most profitable recipes for your available facilities.
- 🚐 **Optimal RV Level-Up Plan:** Breaks down exact material requirements and minimum time to reach your next RV level.
- 🐾 **Optimal Aniimo Assignment:** Automatically picks the best creatures for each workstation based on aptitude levels (Lv.1–Lv.4), hauling (`Trailer`), and **personality bonuses (+20% speed)**.
- 📦 **Smart Base Layout:** Organizes plots, workshops, and storage units to minimize hauling distance and bottlenecks.

---

## 🧬 MBTI Personality Algorithm (+20% Speed)

Each *Aniimo* has a 4-axis MBTI-inspired personality (`I/E`, `N/S`, `F/T`, `P/J` — 16 combinations):

| Axis | Letters | Traits | Focus |
| :---: | :---: | :--- | :--- |
| **Axis 1** | **I / E** | **Instinctive** / **Energetic** | Instant reflexes vs physical stamina |
| **Axis 2** | **N / S** | **Nimble** / **Practical** | Faster tasks vs zero material waste |
| **Axis 3** | **F / T** | **Faithful** / **Tenacious** | Consistency vs fatigue resistance |
| **Axis 4** | **P / J** | **Playful** / **Judicious** | Creativity vs crafting precision |

Assigning an Aniimo with a facility's preferred trait grants an automatic **+20% production or gathering speed bonus**. The recommender resolves trait conflicts across multiple stations and suggests the ideal 4-letter profile (e.g. `E·N·T·J`), plus wild-catchable alternatives with map locations if you don't own an evolved creature yet.

---

## 💻 Running Locally

```bash
git clone https://github.com/oscarlosu-lab/aniimax-es.git
cd aniimax-es
python -m http.server 8080 --directory web
```

Open `http://localhost:8080` in your browser. Optional WebAssembly rebuild (requires Rust & `wasm-pack`):

```bash
wasm-pack build --target web --out-dir web/pkg
```

---

## 🤝 Credits & License

- **Original solver & math model:** [**@ae-bii**](https://github.com/ae-bii) ([Aniimax](https://github.com/ae-bii/aniimax)).
- **Spanish/Bilingual Edition, Recommender v2.2 & Personality Optimization:** [**@oscarlosu-lab**](https://github.com/oscarlosu-lab).
- **License:** `oscarlosu-lab` contributions & adaptations are under **Non-Commercial Source-Available + Mandatory Attribution**; upstream components remain under **MIT**. See [LICENSE](LICENSE).
