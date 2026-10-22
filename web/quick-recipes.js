import { FACILITIES, simpleSetup } from './facility-config.js';
import { translate, isBilingual, setBilingual } from './i18n.js';

// State
let allRecipes = [];
let filteredRecipes = [];
let selectedRecipe = null;
let selectedQuantity = 1;
let currentRvLevel = 20;
let filterCategory = 'all';
let searchQuery = '';
let filterFacility = 'all';
let filterByRv = true;
let isSolving = false;
let aniimoDatabase = null;

// Worker Instance
let worker = null;
let nextRequestId = 0;
const pendingRequests = new Map();

function initWorker() {
    worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (event) => {
        const { id, ok, result, error, type } = event.data;
        if (type === 'progress') {
            return; // Ignore intermediate progress notifications
        }
        const pending = pendingRequests.get(id);
        if (pending) {
            pendingRequests.delete(id);
            if (ok) pending.resolve(result);
            else pending.reject(new Error(error || 'Worker error'));
        }
    };
    worker.onerror = (err) => {
        console.error('Worker error:', err);
    };
}

function callWorker(type, payload) {
    return new Promise((resolve, reject) => {
        if (!worker) initWorker();
        const id = ++nextRequestId;
        pendingRequests.set(id, { resolve, reject });
        worker.postMessage({ id, type, payload });
    });
}

// Format duration
function formatSeconds(secs) {
    if (!secs || !Number.isFinite(secs)) return '0s';
    const total = Math.round(secs);
    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0 || parts.length === 0) parts.push(`${s}s`);
    return parts.join(' ');
}

const ITEM_NAMES = {
    coins: 'Home Coins',
    wood_block: 'Wood Blocks',
    mineral_sand: 'Mineral Sand',
    coarse_sifted_ore: 'Coarse-Sifted Ore',
    river_washed_stones: 'River-Washed Stones',
    premium_river_washed_stones: 'Premium River-Washed Stones',
    sugar_roasted_chestnuts: 'Sugar-Roasted Chestnuts',
    flowers_in_a_bottle: 'Flowers in a Bottle',
};

// Pretty item name helper
function prettyItemName(key) {
    if (!key) return '';
    const formatted = ITEM_NAMES[key] || key.split('_').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ');
    const translated = translate(formatted);
    if (isBilingual() && translated !== formatted) {
        return `${translated} (${formatted})`;
    }
    return translated;
}

// Format reason with translated item names
function formatReason(reason) {
    if (!reason) return 'Usado para la receta';
    return reason
        .replace(/^Usado para ([^;]+)/i, (_, list) => 'Usado para ' + list.split(', ').map(k => prettyItemName(k.trim())).join(', '))
        .replace(/^Used for ([^;]+)/i, (_, list) => 'Usado para ' + list.split(', ').map(k => prettyItemName(k.trim())).join(', '))
        .replace(/; the rest sells directly$/i, '; el resto se vende')
        .replace(/Sells directly$/i, 'Se vende directamente');
}

// Pretty facility helper
function prettyFacilityName(name) {
    if (!name) return '';
    return translate(name);
}

// Category mappings
const RECIPE_CATEGORIES = [
    { id: 'all', name: '🌟 Todas', emoji: '🌟' },
    { id: 'cooking', name: '🍽️ Cocina y Platos', emoji: '🍽️', facilities: ['Blazing Stove', 'Claw Game Cooker', 'Simmering Pot'] },
    { id: 'pickling', name: '🏺 Encurtidos y Bebidas', emoji: '🏺', facilities: ['Pickling Jar', 'Bouncy Brew Keg'] },
    { id: 'incense', name: '🌸 Inciensos y Esencias', emoji: '🌸', facilities: ['Phonolfactory Table'] },
    { id: 'milling', name: '🌾 Molino y Granos', emoji: '🌾', facilities: ['Carousel Mill', 'Jukebox Dryer'] },
    { id: 'crafting', name: '🛠️ Artesanía y Tejidos', emoji: '🛠️', facilities: ['Crafting Table', 'Joy Wheel Loom', 'Dance Pad Polisher', 'Aniipod Maker'] },
    { id: 'materials', name: '🪵 Carpintería y Horno', emoji: '🪵', facilities: ['Woodworking Bench', 'Chimney Kiln'] },
    { id: 'season', name: '🌸 Temporada', emoji: '🌸', seasonOnly: true }
];

function getCategoryForRecipe(recipe) {
    if (recipe.isSeason) return 'season';
    for (const cat of RECIPE_CATEGORIES) {
        if (cat.facilities && cat.facilities.includes(recipe.facility)) {
            return cat.id;
        }
    }
    return 'crafting';
}

// Calculate unlock RV for a recipe
function getMinRvForRecipe(facilityName, facilityLevel) {
    const fac = FACILITIES.find(f => f.name === facilityName);
    if (!fac || !fac.unlocks) return 1;
    let minRv = 1;
    for (let lvl = 1; lvl <= (facilityLevel || 1); lvl++) {
        if (fac.unlocks[lvl] && fac.unlocks[lvl] > minRv) {
            minRv = fac.unlocks[lvl];
        }
    }
    return minRv;
}

// Initialize Page
async function initQuickRecipes() {
    initWorker();
    
    // Load saved RV level
    try {
        const saved = localStorage.getItem('aniimax-home-level');
        if (saved) currentRvLevel = parseInt(saved, 10) || 20;
    } catch (_) {}

    // Load Aniimo database
    try {
        const resp = await fetch('aniimo_creatures.json');
        if (resp.ok) aniimoDatabase = await resp.json();
    } catch (e) {
        console.warn('Could not load aniimo_creatures.json:', e);
    }

    // Populate RV select
    const rvSelect = document.getElementById('quick-rv-select');
    if (rvSelect) {
        rvSelect.innerHTML = '';
        for (let lvl = 1; lvl <= 20; lvl++) {
            const opt = document.createElement('option');
            opt.value = lvl;
            opt.textContent = `Nivel ${lvl}${lvl === 20 ? ' (Máximo)' : ''}`;
            if (lvl === currentRvLevel) opt.selected = true;
            rvSelect.appendChild(opt);
        }
        rvSelect.addEventListener('change', (e) => {
            currentRvLevel = parseInt(e.target.value, 10) || 20;
            try { localStorage.setItem('aniimax-home-level', currentRvLevel); } catch (_) {}
            applyFilters();
            if (selectedRecipe) calculateOptimalPlan();
        });
    }

    // Load all items from Worker WASM
    try {
        const itemsJson = await callWorker('get_all_items');
        const rawItems = JSON.parse(itemsJson);

        // Filter only craftable recipes (has ingredients or is produced in a workshop)
        const workshopFacilities = new Set([
            'Blazing Stove', 'Claw Game Cooker', 'Simmering Pot', 'Pickling Jar',
            'Bouncy Brew Keg', 'Phonolfactory Table', 'Carousel Mill', 'Jukebox Dryer',
            'Crafting Table', 'Joy Wheel Loom', 'Dance Pad Polisher', 'Aniipod Maker',
            'Woodworking Bench', 'Chimney Kiln'
        ]);

        allRecipes = rawItems.filter(it => {
            if (!it.name) return false;
            if (workshopFacilities.has(it.facility)) return true;
            return it.raw_materials && it.raw_materials.length > 0;
        }).map(it => {
            const minRv = getMinRvForRecipe(it.facility, it.facility_level);
            const isSeason = (it.season_seed_cost && it.season_seed_cost > 0) ||
                             ['harvest_platter', 'umbral_pickle', 'umbral_hot_pot', 'umbral_sweet_and_spicy_sauce', 'moondew_radish_slices', 'roasted_waxing_moon_pepper'].includes(it.name);
            return {
                ...it,
                minRv,
                isSeason,
                category: isSeason ? 'season' : (getCategoryForRecipe({ ...it, isSeason })),
                nameEn: it.name.split('_').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ')
            };
        }).sort((a, b) => a.facility.localeCompare(b.facility) || a.name.localeCompare(b.name));

        // Populate facility select
        populateFacilitySelect();

        // Render category pills
        renderCategoryPills();

        // Attach search & filters
        setupFilterListeners();

        // Initial filter & render
        applyFilters();

        // Auto select first recipe if available
        if (filteredRecipes.length > 0) {
            selectRecipe(filteredRecipes[0]);
        }

    } catch (err) {
        console.error('Failed to load recipes from worker:', err);
        const container = document.getElementById('recipes-list-container');
        if (container) {
            container.innerHTML = `<p class="error-msg">Error al cargar recetas del motor: ${err.message}</p>`;
        }
    }

    // Bilingual Toggle
    const bilingualBtn = document.getElementById('bilingualToggle');
    if (bilingualBtn) {
        bilingualBtn.addEventListener('click', () => {
            setBilingual(!isBilingual());
            bilingualBtn.classList.toggle('active', isBilingual());
            applyFilters();
            if (selectedRecipe) renderActiveRecipeCard();
        });
        if (isBilingual()) bilingualBtn.classList.add('active');
    }

    // Theme Toggle
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            themeBtn.textContent = newTheme === 'dark' ? 'Claro' : 'Oscuro';
            try { localStorage.setItem('theme', newTheme); } catch (_) {}
        });
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        themeBtn.textContent = savedTheme === 'dark' ? 'Claro' : 'Oscuro';
    }
}

function populateFacilitySelect() {
    const sel = document.getElementById('quick-facility-select');
    if (!sel) return;
    const facilities = Array.from(new Set(allRecipes.map(r => r.facility))).sort();
    sel.innerHTML = '<option value="all">🏭 Todas las instalaciones</option>';
    facilities.forEach(fac => {
        const opt = document.createElement('option');
        opt.value = fac;
        opt.textContent = `${prettyFacilityName(fac)} (${fac})`;
        sel.appendChild(opt);
    });
}

function renderCategoryPills() {
    const bar = document.getElementById('quick-category-pills');
    if (!bar) return;
    bar.innerHTML = RECIPE_CATEGORIES.map(cat => `
        <button type="button" class="category-pill ${filterCategory === cat.id ? 'active' : ''}" data-cat="${cat.id}">
            ${cat.name}
        </button>
    `).join('');

    bar.querySelectorAll('.category-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            filterCategory = btn.dataset.cat;
            bar.querySelectorAll('.category-pill').forEach(b => b.classList.toggle('active', b === btn));
            applyFilters();
        });
    });
}

function setupFilterListeners() {
    const searchInput = document.getElementById('quick-recipe-search');
    const clearBtn = document.getElementById('quick-search-clear');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            if (clearBtn) clearBtn.hidden = !searchQuery.trim();
            applyFilters();
        });
    }
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            searchQuery = '';
            clearBtn.hidden = true;
            applyFilters();
            if (searchInput) searchInput.focus();
        });
    }

    const facSelect = document.getElementById('quick-facility-select');
    if (facSelect) {
        facSelect.addEventListener('change', (e) => {
            filterFacility = e.target.value;
            applyFilters();
        });
    }

    const rvCheck = document.getElementById('quick-filter-rv-check');
    if (rvCheck) {
        rvCheck.addEventListener('change', (e) => {
            filterByRv = e.target.checked;
            applyFilters();
        });
    }

    // Quantity buttons
    const qtyInput = document.getElementById('recipe-qty-input');
    const btnMinus = document.getElementById('qty-btn-minus');
    const btnPlus = document.getElementById('qty-btn-plus');
    if (qtyInput) {
        qtyInput.addEventListener('change', (e) => {
            selectedQuantity = Math.max(1, parseInt(e.target.value, 10) || 1);
            qtyInput.value = selectedQuantity;
            updateQuickQtyPills();
            renderActiveRecipeCard();
            calculateOptimalPlan();
        });
    }
    if (btnMinus) {
        btnMinus.addEventListener('click', () => {
            selectedQuantity = Math.max(1, selectedQuantity - 1);
            if (qtyInput) qtyInput.value = selectedQuantity;
            updateQuickQtyPills();
            renderActiveRecipeCard();
            calculateOptimalPlan();
        });
    }
    if (btnPlus) {
        btnPlus.addEventListener('click', () => {
            selectedQuantity += 1;
            if (qtyInput) qtyInput.value = selectedQuantity;
            updateQuickQtyPills();
            renderActiveRecipeCard();
            calculateOptimalPlan();
        });
    }

    // Quick quantity pills
    document.querySelectorAll('.quick-qty-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            selectedQuantity = parseInt(pill.dataset.qty, 10) || 1;
            if (qtyInput) qtyInput.value = selectedQuantity;
            updateQuickQtyPills();
            renderActiveRecipeCard();
            calculateOptimalPlan();
        });
    });

    // Solve button
    const solveBtn = document.getElementById('btn-calculate-recipe');
    if (solveBtn) {
        solveBtn.addEventListener('click', () => {
            calculateOptimalPlan();
        });
    }
}

function updateQuickQtyPills() {
    document.querySelectorAll('.quick-qty-pill').forEach(pill => {
        const q = parseInt(pill.dataset.qty, 10);
        pill.classList.toggle('active', q === selectedQuantity);
    });
}

function applyFilters() {
    let list = [...allRecipes];

    // Filter by Category
    if (filterCategory !== 'all') {
        if (filterCategory === 'season') {
            list = list.filter(r => r.isSeason);
        } else {
            const catObj = RECIPE_CATEGORIES.find(c => c.id === filterCategory);
            if (catObj && catObj.facilities) {
                list = list.filter(r => catObj.facilities.includes(r.facility) && !r.isSeason);
            }
        }
    }

    // Filter by Facility
    if (filterFacility !== 'all') {
        list = list.filter(r => r.facility === filterFacility);
    }

    // Filter by RV Level
    if (filterByRv) {
        list = list.filter(r => r.minRv <= currentRvLevel);
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        list = list.filter(r => {
            const nameEs = prettyItemName(r.name).toLowerCase();
            const nameEn = (r.nameEn || '').toLowerCase();
            const rawKey = r.name.toLowerCase();
            const fac = prettyFacilityName(r.facility).toLowerCase();
            const ingr = (r.raw_materials || []).map(m => prettyItemName(m).toLowerCase()).join(' ');
            return nameEs.includes(q) || nameEn.includes(q) || rawKey.includes(q) || fac.includes(q) || ingr.includes(q);
        });
    }

    filteredRecipes = list;
    renderRecipeGrid();
}

function renderRecipeGrid() {
    const container = document.getElementById('recipes-list-container');
    const countBadge = document.getElementById('recipe-results-count');
    if (countBadge) {
        countBadge.textContent = `${filteredRecipes.length} receta${filteredRecipes.length === 1 ? '' : 's'}`;
    }

    if (!container) return;

    if (filteredRecipes.length === 0) {
        container.innerHTML = `
            <div class="empty-recipes-state">
                <span class="empty-icon">🔍</span>
                <p>No se encontraron recetas con estos filtros.</p>
                <button type="button" class="btn-clear-filters" id="btn-reset-filters">Limpiar filtros</button>
            </div>
        `;
        const resetBtn = container.querySelector('#btn-reset-filters');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                searchQuery = '';
                filterCategory = 'all';
                filterFacility = 'all';
                const sInp = document.getElementById('quick-recipe-search');
                if (sInp) sInp.value = '';
                const facSel = document.getElementById('quick-facility-select');
                if (facSel) facSel.value = 'all';
                renderCategoryPills();
                applyFilters();
            });
        }
        return;
    }

    container.innerHTML = filteredRecipes.map(r => {
        const isSelected = selectedRecipe && selectedRecipe.name === r.name;
        const displayName = prettyItemName(r.name);
        const facilityTitle = prettyFacilityName(r.facility);
        const cycleStr = formatSeconds(r.cycle_time);
        const matsPreview = (r.raw_materials || []).map((m, idx) => {
            const amt = r.required_amount ? r.required_amount[idx] : 1;
            return `<span class="mat-badge">${amt}× ${prettyItemName(m)}</span>`;
        }).join('');

        return `
            <div class="recipe-card ${isSelected ? 'selected' : ''}" data-name="${r.name}">
                <div class="recipe-card-top">
                    <div class="recipe-title-wrap">
                        <span class="recipe-icon">${r.isSeason ? '🌸' : '⚡'}</span>
                        <h4 class="recipe-name">${displayName}</h4>
                    </div>
                    <span class="recipe-facility-badge">${facilityTitle} Nv.${r.facility_level || 1}</span>
                </div>
                <div class="recipe-meta-row">
                    <span class="meta-item">⏱️ Ciclo: <strong>${cycleStr}</strong></span>
                    <span class="meta-item">📦 Rend.: <strong>${r.yield_amount || 1}</strong></span>
                    ${r.sell_value ? `<span class="meta-item coins">🪙 <strong>${r.sell_value.toLocaleString()}</strong></span>` : ''}
                </div>
                <div class="recipe-mats-wrap">
                    ${matsPreview || '<span class="hint small">Sin ingredientes</span>'}
                </div>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.recipe-card').forEach(card => {
        card.addEventListener('click', () => {
            const name = card.dataset.name;
            const target = allRecipes.find(r => r.name === name);
            if (target) selectRecipe(target);
        });
    });
}

function selectRecipe(recipe) {
    selectedRecipe = recipe;
    document.querySelectorAll('.recipe-card').forEach(c => {
        c.classList.toggle('selected', c.dataset.name === recipe.name);
    });
    renderActiveRecipeCard();
    calculateOptimalPlan();
}

function renderActiveRecipeCard() {
    const banner = document.getElementById('selected-recipe-banner');
    if (!banner || !selectedRecipe) return;

    const r = selectedRecipe;
    const displayName = prettyItemName(r.name);
    const facilityTitle = prettyFacilityName(r.facility);
    const cycleStr = formatSeconds(r.cycle_time);

    const ingrHtml = (r.raw_materials || []).map((m, idx) => {
        const amt = (r.required_amount ? r.required_amount[idx] : 1) * selectedQuantity;
        return `<span class="active-ingr-pill"><strong>${amt}×</strong> ${prettyItemName(m)}</span>`;
    }).join('');

    banner.innerHTML = `
        <div class="active-banner-content">
            <div class="active-banner-header">
                <span class="active-banner-icon">${r.isSeason ? '🌸' : '🎯'}</span>
                <div>
                    <h3 class="active-banner-title">${selectedQuantity}× ${displayName}</h3>
                    <p class="active-banner-sub">Fabricado en <strong>${facilityTitle}</strong> (Nivel ${r.facility_level || 1}) · RV Mínimo: ${r.minRv}</p>
                </div>
            </div>
            <div class="active-banner-specs">
                <div class="spec-col">
                    <span class="spec-label">Tiempo base unitario:</span>
                    <span class="spec-val">${cycleStr}</span>
                </div>
                <div class="spec-col">
                    <span class="spec-label">Producción por lote:</span>
                    <span class="spec-val">${(r.yield_amount || 1) * selectedQuantity} uds</span>
                </div>
                ${r.aniimo ? `
                    <div class="spec-col">
                        <span class="spec-label">Aptitud requerida:</span>
                        <span class="spec-val aniimo-tag">🐾 ${translate(r.aniimo[0])} Nv.${r.aniimo[1]}+</span>
                    </div>
                ` : ''}
            </div>
            <div class="active-banner-ingredients">
                <span class="ingr-title">Ingredientes directos necesarios (${selectedQuantity}×):</span>
                <div class="active-ingr-list">${ingrHtml || '<span class="hint">Sin ingredientes</span>'}</div>
            </div>
        </div>
    `;
}

// Calculate optimal plan via HiGHS WASM worker
async function calculateOptimalPlan() {
    if (!selectedRecipe || isSolving) return;

    isSolving = true;
    const btn = document.getElementById('btn-calculate-recipe');
    const resultsContainer = document.getElementById('quick-results-container');

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner">⏳</span> Optimizando instalaciones con HiGHS...`;
    }

    if (resultsContainer) {
        resultsContainer.innerHTML = `
            <div class="solver-loading-state">
                <div class="pulse-loader"></div>
                <h4>Calculando la gestión óptima de instalaciones...</h4>
                <p class="hint">El solver matemático HiGHS está coordinando todas las parcelas de cultivo y máquinas intermedias para fabricar <strong>${selectedQuantity}x ${prettyItemName(selectedRecipe.name)}</strong> en el menor tiempo récord posible.</p>
            </div>
        `;
    }

    try {
        const setup = simpleSetup(currentRvLevel);
        const payload = JSON.stringify({
            currency: 'coins',
            priorities: [],
            prioritize_byproducts: false,
            level_up: {
                cost: [[selectedRecipe.name, selectedQuantity]],
                stock: []
            },
            exclude: [],
            season: selectedRecipe.isSeason,
            season_currency_per_day: selectedRecipe.isSeason ? 12000 : 0,
            facilities: setup.facilities,
            modules: setup.modules,
            aniimo: 'best',
            aniimo_levels: {}
        });

        const planJson = await callWorker('find_plan', payload);
        const plan = JSON.parse(planJson);

        if (!plan.success) {
            throw new Error(plan.error || 'No se pudo encontrar una asignación válida para esta receta.');
        }

        renderOptimalResults(plan);

    } catch (err) {
        console.error('Error solving recipe plan:', err);
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="solver-error-state">
                    <span class="error-icon">⚠️</span>
                    <h4>No se pudo completar el cálculo</h4>
                    <p class="error-msg">${err.message}</p>
                    <p class="hint">Verifica que tu nivel de Casa Rodante (RV ${currentRvLevel}) tenga desbloqueada esta instalación y sus cultivos requeridos.</p>
                </div>
            `;
        }
    } finally {
        isSolving = false;
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `🚀 Calcular Producción Óptima (Lo más rápido posible)`;
        }
    }
}

// Render the results breakdown
function renderOptimalResults(plan) {
    const container = document.getElementById('quick-results-container');
    if (!container) return;

    const totalSeconds = plan.level_up?.seconds || 0;
    const timeFormatted = formatSeconds(totalSeconds);
    const producingItems = (plan.coin_items || []).filter(c => c.status === 'producing');

    // Split between Farm/Woodland crops and Workshop facilities
    const farmProducers = producingItems.filter(c => c.facility === 'Farmland' || c.facility === 'Woodland');
    const workshopProducers = producingItems.filter(c => c.facility !== 'Farmland' && c.facility !== 'Woodland' && c.item_name !== selectedRecipe.name);
    const finalProducer = producingItems.find(c => c.item_name === selectedRecipe.name) || {
        facility: selectedRecipe.facility,
        item_name: selectedRecipe.name,
        cycle_time: selectedRecipe.cycle_time,
        busy_units: 1.0,
        aniimo: selectedRecipe.aniimo ? { ability: selectedRecipe.aniimo[0], level: selectedRecipe.aniimo[1] } : null
    };

    // Calculate total Aniimo tasks needed
    const allAniimoTasks = [];
    producingItems.forEach(item => {
        (item.aniimo_tasks || []).forEach(task => {
            allAniimoTasks.push({
                ability: task.ability,
                level: task.level,
                busy: task.busy || 1.0,
                item: item.item_name,
                facility: item.facility,
                jobs: task.jobs || []
            });
        });
        if (item.aniimo && (!item.aniimo_tasks || item.aniimo_tasks.length === 0)) {
            allAniimoTasks.push({
                ability: item.aniimo.ability,
                level: item.aniimo.level,
                busy: item.busy_units || 1.0,
                item: item.item_name,
                facility: item.facility,
                jobs: []
            });
        }
    });

    // Best Aniimo creature recommendation from database
    const recommendCreature = (ability, minLvl) => {
        if (!aniimoDatabase || !Array.isArray(aniimoDatabase)) return null;
        const targetLvl = minLvl || 1;
        const matches = aniimoDatabase.filter(a => {
            if (!a.abilities) return false;
            const lvl = a.abilities[ability] ?? a.abilities[translate(ability)] ?? 0;
            return lvl >= targetLvl;
        });
        if (matches.length === 0) return null;
        // Sort highest level first, then wild/catchable first
        matches.sort((a, b) => {
            const lvlA = a.abilities[ability] ?? a.abilities[translate(ability)] ?? 0;
            const lvlB = b.abilities[ability] ?? b.abilities[translate(ability)] ?? 0;
            if (lvlB !== lvlA) return lvlB - lvlA;
            return (a.is_prismana ? 1 : 0) - (b.is_prismana ? 1 : 0);
        });
        return matches[0];
    };

    container.innerHTML = `
        <div class="results-kpi-banner">
            <div class="kpi-banner-item main-kpi">
                <span class="kpi-label">⏱️ Tiempo Récord de Fabricación</span>
                <span class="kpi-value time-highlight">${timeFormatted}</span>
                <span class="kpi-sub">Desde 0 hasta entregar ${selectedQuantity}x ${prettyItemName(selectedRecipe.name)}</span>
            </div>
            <div class="kpi-banner-item">
                <span class="kpi-label">🏭 Talleres Activos</span>
                <span class="kpi-value">${workshopProducers.length + 1}</span>
                <span class="kpi-sub">Trabajando en paralelo</span>
            </div>
            <div class="kpi-banner-item">
                <span class="kpi-label">🌱 Parcelas de Cultivo</span>
                <span class="kpi-value">${farmProducers.length} tipos</span>
                <span class="kpi-sub">Suministro de materias primas</span>
            </div>
            <div class="kpi-banner-item">
                <span class="kpi-label">🐾 Cuadrilla Aniimo</span>
                <span class="kpi-value">${allAniimoTasks.length} puestos</span>
                <span class="kpi-sub">Operarios asignados</span>
            </div>
        </div>

        <!-- TALLER PRINCIPAL -->
        <div class="plan-card-section target-section">
            <div class="section-title-wrap">
                <span class="section-badge main-badge">🎯 Taller Final</span>
                <h4>${prettyFacilityName(finalProducer.facility)} — Fabricando ${selectedQuantity}x ${prettyItemName(selectedRecipe.name)}</h4>
            </div>
            <div class="facility-spec-card">
                <div class="fac-info">
                    <span class="fac-name">🏭 ${prettyFacilityName(finalProducer.facility)}</span>
                    <span class="fac-action">Lote de <strong>${selectedQuantity}x</strong> a máxima velocidad</span>
                </div>
                <div class="fac-staff">
                    ${finalProducer.aniimo ? `
                        <span class="staff-badge">
                            🐾 ${translate(finalProducer.aniimo.ability)} Lv.${finalProducer.aniimo.level}+
                            ${recommendCreature(finalProducer.aniimo.ability, finalProducer.aniimo.level) ? `(Sugerido: <strong>${recommendCreature(finalProducer.aniimo.ability, finalProducer.aniimo.level).name}</strong>)` : ''}
                        </span>
                    ` : '<span class="hint small">Autónomo / Sin operador fijo</span>'}
                </div>
            </div>
        </div>

        <!-- HUERTO Y CULTIVOS -->
        ${farmProducers.length > 0 ? `
            <div class="plan-card-section farm-section">
                <div class="section-title-wrap">
                    <span class="section-badge farm-badge">🌱 Huerto y Parcelas Requeridas</span>
                    <h4>Campos de Cultivo y Arboleda Asignados</h4>
                </div>
                <p class="hint">Siembra estos cultivos en tus parcelas para abastecer la receta sin que falten ingredientes:</p>
                <div class="table-responsive">
                    <table class="plan-table">
                        <thead>
                            <tr>
                                <th>Instalación</th>
                                <th>Cultivo</th>
                                <th>Tiempo de Crecimiento</th>
                                <th>Misión en el Plan</th>
                                <th>Cuadrilla de Cuidado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${farmProducers.map(f => `
                                <tr>
                                    <td><strong>${prettyFacilityName(f.facility)}</strong></td>
                                    <td><strong>🌱 ${prettyItemName(f.item_name)}</strong></td>
                                    <td>${formatSeconds(f.cycle_time)}</td>
                                    <td><span class="reason-tag">${formatReason(f.reason)}</span></td>
                                    <td>
                                        ${(f.aniimo_tasks || []).map(t => `
                                            <span class="task-pill">
                                                ${translate(t.ability)} Lv.${t.level} (${(t.jobs || []).map(j => translate(j)).join(', ')})
                                            </span>
                                        `).join('') || '-'}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        ` : ''}

        <!-- TALLERES INTERMEDIOS -->
        ${workshopProducers.length > 0 ? `
            <div class="plan-card-section workshop-section">
                <div class="section-title-wrap">
                    <span class="section-badge workshop-badge">⚙️ Procesamiento Intermedio</span>
                    <h4>Máquinas Transformando Ingredientes</h4>
                </div>
                <p class="hint">Estas instalaciones deben encenderse en paralelo para procesar los ingredientes intermedios:</p>
                <div class="table-responsive">
                    <table class="plan-table">
                        <thead>
                            <tr>
                                <th>Instalación</th>
                                <th>Producto Intermedio</th>
                                <th>Ciclo Unitario</th>
                                <th>Destino</th>
                                <th>Operario Aniimo Requerido</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${workshopProducers.map(w => `
                                <tr>
                                    <td><strong>${prettyFacilityName(w.facility)}</strong></td>
                                    <td><strong>⚙️ ${prettyItemName(w.item_name)}</strong></td>
                                    <td>${formatSeconds(w.cycle_time)}</td>
                                    <td><span class="reason-tag">${formatReason(w.reason)}</span></td>
                                    <td>
                                        ${w.aniimo ? `
                                            <span class="task-pill">
                                                🐾 ${translate(w.aniimo.ability)} Lv.${w.aniimo.level}
                                                ${recommendCreature(w.aniimo.ability, w.aniimo.level) ? `(ej. <strong>${recommendCreature(w.aniimo.ability, w.aniimo.level).name}</strong>)` : ''}
                                            </span>
                                        ` : '-'}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        ` : ''}

        <!-- RESUMEN DE REQUISITOS DEL SOLVER -->
        <div class="plan-card-section summary-section">
            <div class="section-title-wrap">
                <span class="section-badge summary-badge">📦 Balance de Materiales</span>
                <h4>Cadencia y Requisitos Finales</h4>
            </div>
            <div class="summary-details-box">
                <p>✔ El solver lineal HiGHS calculó la solución matemática óptima. Con esta configuración, tus instalaciones producirán <strong>${selectedQuantity}x ${prettyItemName(selectedRecipe.name)}</strong> en exactamente <strong>${timeFormatted}</strong> sin acumular cuellos de botella.</p>
                ${(plan.level_up?.requirements || []).length > 0 ? `
                    <div class="req-tags-wrap">
                        ${plan.level_up.requirements.map(r => `
                            <span class="req-tag">
                                <strong>${r.need}x ${prettyItemName(r.name)}</strong>: listo en ${formatSeconds(r.seconds)} (${(r.per_second * 60).toFixed(2)} uds/min)
                            </span>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Auto init on DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initQuickRecipes);
} else {
    initQuickRecipes();
}
