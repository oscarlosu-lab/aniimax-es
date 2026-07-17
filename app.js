// Aniimax Web Application

import init, { find_plan, time_to_reach, get_version } from './pkg/aniimax.js';
import { FACILITIES, FACILITY_CATEGORIES, FACILITY_CATEGORY_BY_NAME } from './facility-config.js';

let wasmReady = false;

// The most recently computed plan (the full JS object returned by find_plan, including
// `success`/`error`) — held in memory so changing the goal amount can call time_to_reach directly
// without re-running the facility-allocation solve. Cleared whenever facilities/currency/modules
// change, since those invalidate the plan.
let lastPlan = null;

// Display name and per-second unit label for each optimizable currency.
const CURRENCY_LABELS = {
    coins: 'Coins',
    bud_tickets: 'Bud Tickets',
};

// Build the facility-card inputs, grouped into a labeled section per category. Runs before other
// DOM setup so the Enter-key listener attachment (which queries all inputs) picks up these
// generated fields too.
function renderFacilityCards() {
    const grid = document.getElementById('facilities-grid');
    grid.innerHTML = FACILITY_CATEGORIES.map(category => {
        const cards = FACILITIES.filter(f => f.category === category).map(f => `
            <div class="facility-card">
                <h4>${f.name} <span class="info-icon" data-tooltip="${f.tooltip}">?</span></h4>
                <div class="facility-inputs">
                    <div class="input-field">
                        <label for="facility-${f.slug}-count">Count</label>
                        <input type="number" id="facility-${f.slug}-count" value="${f.defaultCount}" min="0" max="20">
                    </div>
                    ${f.hasLevels === false ? '' : `
                    <div class="input-field">
                        <label for="facility-${f.slug}-level">Level</label>
                        <input type="number" id="facility-${f.slug}-level" value="1" min="1" max="10">
                    </div>
                    `}
                </div>
            </div>
        `).join('');
        return `
            <div class="facility-category">
                <h4 class="facility-category-title">${category}</h4>
                <div class="facilities-grid">${cards}</div>
            </div>
        `;
    }).join('');
}

// --- Local persistence -----------------------------------------------------------------
// Saves/restores form inputs via localStorage so values survive a page reload. Purely
// client-side (no account, no server) — works identically on localhost and once this is
// hosted on GitHub Pages, since localStorage is scoped to the page's own origin.
const STORAGE_KEY = 'aniimax-config-v1';

// Every input ID whose value should be persisted. Facility inputs are derived from
// FACILITIES so newly added facilities are covered automatically. Both currency radios are
// listed (only the checked one actually restores anything, per the type === 'radio' branch
// below) since they share a name but not an id.
function getPersistedFieldIds() {
    const staticIds = [
        'currency-coins', 'currency-bud-tickets',
        'target-amount', 'current-amount',
        'prioritize-byproducts', 'exclude-wheat',
        'ecological-module-level', 'kitchen-module-level',
        'mineral-detector-level', 'crafting-module-level'
    ];
    const facilityIds = FACILITIES.flatMap(f => f.hasLevels === false
        ? [`facility-${f.slug}-count`]
        : [`facility-${f.slug}-count`, `facility-${f.slug}-level`]);
    return [...staticIds, ...facilityIds];
}

function saveInputsToStorage() {
    const data = {};
    getPersistedFieldIds().forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        data[id] = (el.type === 'checkbox' || el.type === 'radio') ? el.checked : el.value;
    });
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('Could not save inputs to localStorage:', e);
    }
}

function loadInputsFromStorage() {
    let data;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        data = JSON.parse(raw);
    } catch (e) {
        console.warn('Could not load saved inputs from localStorage:', e);
        return;
    }
    getPersistedFieldIds().forEach(id => {
        if (!(id in data)) return;
        const el = document.getElementById(id);
        if (!el) return;
        if (el.type === 'checkbox' || el.type === 'radio') {
            el.checked = !!data[id];
        } else {
            el.value = data[id];
        }
    });
}

// Auto-save on every change to a persisted field.
function attachAutoSave() {
    getPersistedFieldIds().forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const eventName = (el.type === 'checkbox' || el.type === 'radio') ? 'change' : 'input';
        el.addEventListener(eventName, saveInputsToStorage);
    });
}

function clearSavedInputs() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.warn('Could not clear saved inputs from localStorage:', e);
    }
    window.location.reload();
}

// Initialize WASM module
async function initWasm() {
    try {
        await init();
        wasmReady = true;

        // Display version
        const version = get_version();
        document.getElementById('version').textContent = version;

        console.log(`Aniimax v${version} loaded successfully`);
    } catch (error) {
        console.error('Failed to initialize WASM:', error);
        showError('Failed to load the optimizer. Please refresh the page.');
    }
}

function getCurrency() {
    const checked = document.querySelector('input[name="currency"]:checked');
    return checked ? checked.value : 'coins';
}

// Get plan-level input values from the form (facilities/currency/modules/exclude-wheat/
// prioritize-byproducts — nothing goal-related, since find_plan doesn't need a target).
function getPlanInputValues() {
    const facilities = {};
    FACILITIES.forEach(f => {
        facilities[f.name] = {
            // NaN-safe (not `|| fallback`): 0 is a legitimate "I don't own this facility" value,
            // but `0 || f.defaultCount` would silently replace it with the default (often 1).
            count: numberOrDefault(document.getElementById(`facility-${f.slug}-count`).value, f.defaultCount),
            // Facilities that don't level up (hasLevels: false) have no Level input at all; always
            // send level 1, which is what the game data assumes for them regardless.
            level: f.hasLevels === false ? 1 : numberOrDefault(document.getElementById(`facility-${f.slug}-level`).value, 1)
        };
    });

    const modules = {
        ecological_module: numberOrDefault(document.getElementById('ecological-module-level').value, 0),
        kitchen_module: numberOrDefault(document.getElementById('kitchen-module-level').value, 0),
        mineral_detector: numberOrDefault(document.getElementById('mineral-detector-level').value, 0),
        crafting_module: numberOrDefault(document.getElementById('crafting-module-level').value, 0)
    };

    return {
        currency: getCurrency(),
        exclude_wheat: document.getElementById('exclude-wheat').checked,
        prioritize_byproducts: document.getElementById('prioritize-byproducts').checked,
        facilities,
        modules
    };
}

// parseInt/parseFloat that fall back to `fallback` only when the input doesn't parse to a number
// at all (blank/invalid) — unlike `value || fallback`, these correctly keep a legitimate 0 (e.g.
// "I own zero of this facility"), which `||` would silently discard since 0 is falsy in JS.
function numberOrDefault(value, fallback) {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
}

function floatOrDefault(value, fallback) {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? fallback : parsed;
}

// Format number with commas
function formatNumber(num) {
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

// Show an error in the results section (plan-level failures only — goal-level failures are rare
// and shown inline in the goal section instead, since the plan above it is still valid).
function showError(message) {
    const errorEl = document.getElementById('error-message');
    const resultsContent = document.getElementById('results-content');
    const resultsSection = document.getElementById('results-section');

    errorEl.textContent = message;
    errorEl.style.display = 'block';
    resultsContent.style.display = 'none';
    resultsSection.style.display = 'block';
}

// Updates the goal section's labels ("Target Coins"/"Coins Produced" etc.) to match the plan's
// currency, so the labels never drift out of sync with what's actually being calculated.
function updateCurrencyLabels(currency) {
    const label = CURRENCY_LABELS[currency] || currency;
    document.getElementById('target-amount-label').textContent = `Target ${label}`;
    document.getElementById('current-amount-label').textContent = `Current ${label}`;
    document.getElementById('amount-produced-label').textContent = `${label} Produced`;
}

// Renders the item-level production breakdown from `goalResult.products` — one row per income
// stream (a selected item, or the leftover-capacity portion of a split facility), already
// sorted by net profit descending by the solver. Wood Blocks/Mineral Sand byproducts
// (`goalResult.byproducts`) are appended as extra rows at the bottom, styled distinctly since
// they're a side effect of the plan above rather than something sold for the chosen currency.
function renderProductBreakdown(goalResult) {
    const section = document.getElementById('product-breakdown-section');
    const tbody = document.getElementById('product-breakdown-tbody');

    const products = goalResult.products || [];
    const byproducts = (goalResult.byproducts || []).filter(([, amount]) => Math.floor(amount) > 0);
    if (products.length === 0 && byproducts.length === 0) {
        section.style.display = 'none';
        return;
    }
    section.style.display = 'block';

    tbody.innerHTML = '';
    products.forEach(p => {
        const row = document.createElement('tr');
        // Amount is floored to a whole number — the underlying rate math is a continuous
        // approximation (same steady-state model used throughout this calculator), but you
        // can't actually receive a fractional item; whatever fraction is left over represents
        // a batch still in progress at the moment the goal is reached. Worth is then computed
        // from THAT same whole number (amount * sell price), not the unrounded rate total, so
        // the two columns always reconcile by hand-multiplication — Profit/sec stays net of
        // ingredient costs (matches Total Time/Amount Produced above), so it won't equal Worth
        // / time; they're intentionally different figures (gross vs. net).
        const wholeAmount = Math.floor(p.total_units);
        const worth = wholeAmount * p.sell_value;
        row.innerHTML = `
            <td>${p.item_name}</td>
            <td>${p.facility}</td>
            <td>${wholeAmount.toLocaleString()}</td>
            <td>${formatNumber(p.rate_per_second)}</td>
            <td>${formatNumber(worth)}</td>
        `;
        tbody.appendChild(row);
    });

    byproducts.forEach(([name, amount]) => {
        const row = document.createElement('tr');
        row.className = 'byproduct-row';
        row.innerHTML = `
            <td>${name} <span class="hint small">(bonus)</span></td>
            <td>&mdash;</td>
            <td>${Math.floor(amount).toLocaleString()}</td>
            <td>&mdash;</td>
            <td>not sold</td>
        `;
        tbody.appendChild(row);
    });
}

// Renders `goalResult.seed_requirements` — one row per grower crop actually being planted, how
// many times each of its dedicated plots needs replanting over the goal's total time, so a
// player can have enough seeds ready ahead of time. Never includes processor facilities; they
// aren't planted (see `SeedRequirement` in models.rs).
function renderSeedsNeeded(goalResult) {
    const section = document.getElementById('seeds-needed-section');
    const tbody = document.getElementById('seeds-needed-tbody');

    const requirements = goalResult.seed_requirements || [];
    if (requirements.length === 0) {
        section.style.display = 'none';
        return;
    }
    section.style.display = 'block';

    tbody.innerHTML = requirements.map(r => `
        <tr>
            <td>${r.item_name}</td>
            <td>${r.facility}</td>
            <td>${r.facility_count.toLocaleString()}</td>
            <td>${r.seeds_per_plot.toLocaleString()}</td>
            <td>${r.total_seeds.toLocaleString()}</td>
        </tr>
    `).join('');
}

// Fixed display order for environment groups — matches ENVIRONMENT_BUILDINGS's mode order in
// optimizer.rs (Heat Furnace's two modes, then Cooling Unit's two, then Sunlamp's one).
const ENVIRONMENT_MODE_ORDER = ['Warm', 'Scorching', 'Cool', 'Freeze', 'Adequate'];

function facilityPlanTable(rows) {
    return `
        <div class="table-wrapper">
            <table class="facility-plan-table">
                <thead>
                    <tr>
                        <th>Facility</th>
                        <th>Count</th>
                        <th>Producing</th>
                        <th>Why</th>
                    </tr>
                </thead>
                <tbody>${rows.map(step => `
                    <tr class="status-${step.status}">
                        <td>${step.facility}</td>
                        <td>${step.facility_count}</td>
                        <td>${step.item_name || '—'}</td>
                        <td>${step.reason}</td>
                    </tr>
                `).join('')}</tbody>
            </table>
        </div>
    `;
}

// Splits one environment mode's rows across its individual building units. Unlike the old
// preset-based version, each unit's exact facility-type capacity now comes straight from the
// solver's own geometric packing (`assignment.layouts[i]` — see `FacilityPlacement` in
// models.rs), not an evenly-divided share, since real per-building layouts aren't always
// identical (e.g. one Cooling Unit might host Farmland+Woodland while another hosts only
// Farmland). Still greedily fills each unit's per-facility-type capacity in row order, splitting
// a single row across units when its count exceeds one unit's remaining capacity — the exact
// split is arbitrary (any unit can host any plot of the crops sharing its mode), only the
// per-unit totals (and the diagram's exact positions) are load-bearing.
function splitByEnvironmentUnit(rows, assignmentsForMode) {
    const units = [];
    assignmentsForMode.forEach(a => {
        (a.layouts || []).forEach(layout => {
            const remaining = {};
            layout.forEach(p => {
                remaining[p.facility] = (remaining[p.facility] || 0) + 1;
            });
            units.push({ building: a.building, remaining, rows: [], layout });
        });
    });

    rows.forEach(step => {
        let remaining = step.facility_count;
        for (const unit of units) {
            if (remaining <= 0) break;
            const available = unit.remaining[step.facility] || 0;
            const take = Math.min(remaining, available);
            if (take <= 0) continue;
            unit.remaining[step.facility] -= take;
            unit.rows.push({ ...step, facility_count: take });
            remaining -= take;
        }
    });

    // A building's geometric layout is capacity, not a production guarantee — a facility type can
    // sit unused in a unit's coverage if there wasn't enough demand to fill every plot the fill
    // loop above offered it. Drawing that unused capacity in the diagram would show the player
    // squares they shouldn't actually place anything in (and that don't match this unit's own
    // table), so trim `layout` down to just the placements this unit's `rows` actually accounted
    // for, per facility type.
    units.forEach(unit => {
        const totalByFacility = {};
        unit.layout.forEach(p => {
            totalByFacility[p.facility] = (totalByFacility[p.facility] || 0) + 1;
        });
        const takenSoFar = {};
        unit.layout = unit.layout.filter(p => {
            const unused = unit.remaining[p.facility] || 0;
            const used = (totalByFacility[p.facility] || 0) - unused;
            takenSoFar[p.facility] = takenSoFar[p.facility] || 0;
            if (takenSoFar[p.facility] < used) {
                takenSoFar[p.facility]++;
                return true;
            }
            return false;
        });
    });

    return units.filter(u => u.rows.length > 0);
}

// Fixed color per environment-gated facility type, used by the layout diagram below — purely
// categorical (not theme-dependent), so it stays distinguishable in both light and dark mode.
const ENVIRONMENT_FACILITY_COLORS = {
    'Farmland': '#c9a24d',
    'Woodland': '#4caf50',
    'Starfall Hammock': '#42a5f5',
    'Tidewhisper Sandcastle': '#26c6da',
    'Grass Blossom Mat': '#ab47bc',
    'Dewy House': '#ef8a80',
};

// Matches the confirmed geometry in src/coverage.rs: every environment building is a 2x2
// footprint, radiating coverage as a square of side 2*radius centered on its own center.
const ENVIRONMENT_BUILDING_SIZE = 2.0;
const ENVIRONMENT_COVERAGE_RADIUS = 4.5;

// Renders a simple SVG diagram of one building instance's exact chosen layout (from
// `assignment.layouts[i]`) — literally the solver's own placements, not an invented
// illustration: a dashed square for the coverage zone, a solid square for the building itself,
// and one colored rectangle per hosted facility, with a small legend mapping color to facility
// name (there's no room for full labels at this scale).
function renderEnvironmentDiagram(layout) {
    if (!layout || layout.length === 0) return '';
    const margin = 5;
    const half = ENVIRONMENT_COVERAGE_RADIUS + margin;
    const buildingCenter = ENVIRONMENT_BUILDING_SIZE / 2;
    // Center the viewBox on the building's own center, not world origin (0,0) — the building sits
    // at (0,0)-(size,size), so its center (and the coverage zone centered on it) is offset from
    // the origin. Centering the viewBox on the origin instead made the whole diagram look
    // consistently shifted toward one corner.
    const viewMin = buildingCenter - half;
    const viewSize = half * 2;
    const coverageMin = buildingCenter - ENVIRONMENT_COVERAGE_RADIUS;
    const coverageSize = ENVIRONMENT_COVERAGE_RADIUS * 2;

    const rects = layout.map(p => {
        const color = ENVIRONMENT_FACILITY_COLORS[p.facility] || '#888888';
        return `<rect x="${p.x}" y="${p.y}" width="${p.size}" height="${p.size}" fill="${color}" fill-opacity="0.5" stroke="${color}" stroke-width="0.06" />`;
    }).join('');

    const usedFacilities = [...new Set(layout.map(p => p.facility))];
    const legend = usedFacilities.map(f => `
        <span class="env-legend-item">
            <span class="env-legend-swatch" style="background:${ENVIRONMENT_FACILITY_COLORS[f] || '#888888'}"></span>${f}
        </span>
    `).join('');

    return `
        <div class="env-diagram">
            <svg viewBox="${viewMin} ${viewMin} ${viewSize} ${viewSize}" width="150" height="150">
                <rect x="${coverageMin}" y="${coverageMin}" width="${coverageSize}" height="${coverageSize}"
                      fill="none" stroke="currentColor" stroke-opacity="0.4" stroke-dasharray="0.3,0.3" stroke-width="0.06" />
                <rect x="0" y="0" width="${ENVIRONMENT_BUILDING_SIZE}" height="${ENVIRONMENT_BUILDING_SIZE}" fill="currentColor" fill-opacity="0.6" />
                ${rects}
            </svg>
            <div class="env-legend">${legend}</div>
        </div>
    `;
}

// Renders `plan.coin_items` (one row per facility+product — see `PlanStep` in models.rs). Rows
// for a crop that needs a growing environment (Cool/Warm/Freeze/Scorching/Adequate) are pulled
// out into their own "Environment: X" group first — regardless of whether they're grown on
// Farmland or Woodland — so it's obvious at a glance which facilities share the same environment
// building, instead of that connection being spelled out in each row's own text. When a mode
// needs more than one building unit, that group splits into one table per unit (see
// `splitByEnvironmentUnit`) so it's clear which crops go in which physical building. Everything
// else falls back to the original per-facility-category grouping (FACILITY_CATEGORIES).
function renderFacilityPlan(plan) {
    const container = document.getElementById('facility-plan-container');
    const steps = plan.coin_items || [];

    if (steps.length === 0) {
        container.innerHTML = '<p class="hint">Nothing profitable to produce with the current facilities.</p>';
        return;
    }

    const envGroups = new Map();
    const ungatedSteps = [];
    steps.forEach(step => {
        if (step.environment) {
            if (!envGroups.has(step.environment)) envGroups.set(step.environment, []);
            envGroups.get(step.environment).push(step);
        } else {
            ungatedSteps.push(step);
        }
    });

    const assignments = plan.environment_assignments || [];
    const environmentSections = ENVIRONMENT_MODE_ORDER.filter(mode => envGroups.has(mode)).map(mode => {
        const assignmentsForMode = assignments.filter(a => a.mode === mode);
        const units = splitByEnvironmentUnit(envGroups.get(mode), assignmentsForMode);

        const unitTables = units.length === 0
            ? facilityPlanTable(envGroups.get(mode))
            : units.map((unit, i) => `
                ${units.length > 1 ? `<p class="hint small">${unit.building} ${i + 1}</p>` : ''}
                <div class="env-unit">
                    ${renderEnvironmentDiagram(unit.layout)}
                    <div class="env-unit-table">${facilityPlanTable(unit.rows)}</div>
                </div>
            `).join('');

        return `
            <div class="facility-category">
                <h4 class="facility-category-title">Environment: ${mode}</h4>
                ${unitTables}
            </div>
        `;
    }).join('');

    const byCategory = new Map(FACILITY_CATEGORIES.map(c => [c, []]));
    ungatedSteps.forEach(step => {
        const category = FACILITY_CATEGORY_BY_NAME.get(step.facility) || 'Materials Processing';
        byCategory.get(category).push(step);
    });

    const categorySections = FACILITY_CATEGORIES.map(category => {
        const categorySteps = byCategory.get(category);
        if (categorySteps.length === 0) return '';
        return `
            <div class="facility-category">
                <h4 class="facility-category-title">${category}</h4>
                ${facilityPlanTable(categorySteps)}
            </div>
        `;
    }).join('');

    container.innerHTML = environmentSections + categorySections;
}

// Render a successfully computed plan: rate summary + facility plan table. Goal-independent —
// called once per Calculate click (or facility/currency/module change), not on every goal
// keystroke.
function displayPlan(plan) {
    const resultsSection = document.getElementById('results-section');
    const errorEl = document.getElementById('error-message');
    const resultsContent = document.getElementById('results-content');
    const goalSection = document.getElementById('goal-section');

    resultsSection.style.display = 'block';

    if (!plan.success) {
        goalSection.style.display = 'none';
        showError(plan.error || 'An unknown error occurred.');
        return;
    }

    errorEl.style.display = 'none';
    resultsContent.style.display = 'block';
    goalSection.style.display = 'block';

    const label = CURRENCY_LABELS[plan.currency] || plan.currency;
    document.getElementById('plan-rate').textContent = `${formatNumber(plan.rate_per_second)} ${label}/sec`;
    updateCurrencyLabels(plan.currency);

    renderFacilityPlan(plan);

    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Render a time-to-goal result: Total Time / Amount Produced summary + Product Breakdown. Called
// live on every goal-field keystroke once a plan exists — cheap, no facility-allocation re-solve.
function displayGoal(goalResult) {
    if (!goalResult.success) {
        document.getElementById('total-time').textContent = '-';
        document.getElementById('amount-produced').textContent = '-';
        document.getElementById('product-breakdown-section').style.display = 'none';
        document.getElementById('seeds-needed-section').style.display = 'none';
        console.warn('Goal calculation failed:', goalResult.error);
        return;
    }

    document.getElementById('total-time').textContent = goalResult.total_time_formatted;
    document.getElementById('amount-produced').textContent = formatNumber(goalResult.amount_produced);

    renderProductBreakdown(goalResult);
    renderSeedsNeeded(goalResult);
}

// Solve for the best achievable plan (facilities + currency + modules) — the heavier computation,
// triggered explicitly by the Calculate button or Enter in a facility/module field.
async function runFindPlan() {
    if (!wasmReady) {
        showError('Optimizer not ready. Please wait...');
        return;
    }

    const btn = document.getElementById('optimize-btn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoading = btn.querySelector('.btn-loading');

    btn.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';

    try {
        const input = getPlanInputValues();
        const inputJson = JSON.stringify(input);

        // Run optimizer (async to not block UI)
        await new Promise(resolve => setTimeout(resolve, 10));
        const resultJson = find_plan(inputJson);
        const plan = JSON.parse(resultJson);

        lastPlan = plan;
        displayPlan(plan);
        if (plan.success) {
            runTimeToGoal();
        }
    } catch (error) {
        console.error('Plan calculation error:', error);
        lastPlan = null;
        showError(`Plan calculation failed: ${error.message}`);
    } finally {
        btn.disabled = false;
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
    }
}

// Compute time-to-goal against the already-computed `lastPlan` — cheap, safe to call on every
// keystroke of the goal-amount fields. No-op until a plan exists.
function runTimeToGoal() {
    if (!lastPlan || !lastPlan.success) return;

    const target = floatOrDefault(document.getElementById('target-amount').value, 0);
    const current = floatOrDefault(document.getElementById('current-amount').value, 0);

    try {
        const resultJson = time_to_reach(JSON.stringify({ plan: lastPlan, target, current }));
        displayGoal(JSON.parse(resultJson));
    } catch (error) {
        console.error('Goal calculation error:', error);
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    renderFacilityCards();
    loadInputsFromStorage();
    attachAutoSave();
    initWasm();

    document.getElementById('optimize-btn').addEventListener('click', runFindPlan);
    document.getElementById('clear-saved-btn').addEventListener('click', clearSavedInputs);

    // Goal fields update live — no need to re-run the facility-allocation solve just because the
    // goal amount changed.
    document.getElementById('target-amount').addEventListener('input', runTimeToGoal);
    document.getElementById('current-amount').addEventListener('input', runTimeToGoal);

    // Changing currency invalidates the last plan (it was solved for the other currency) — hide
    // the goal section until Calculate is pressed again rather than show a stale rate/plan.
    document.querySelectorAll('input[name="currency"]').forEach(radio => {
        radio.addEventListener('change', () => {
            lastPlan = null;
            document.getElementById('goal-section').style.display = 'none';
        });
    });

    // Allow Enter key to trigger a full plan recalculation — but not in the goal fields, which
    // already update live on every keystroke via the listeners above.
    document.querySelectorAll('input').forEach(input => {
        if (input.id === 'target-amount' || input.id === 'current-amount') return;
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                runFindPlan();
            }
        });
    });
});
