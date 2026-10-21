/**
 * contracts-manager.js
 * Módulo de Gestión y Optimización de Contratos Diarios, Urgentes y de Evento para Aniimax.
 * Basado en la ingeniería inversa del sistema HomeOrder de Aniimo (NetEase).
 */

import { translate } from './i18n.js';

// Catálogo de Contratos Predefinidos (Extraídos del Datamine Oficial de HomeOrder)
export const PRESET_CONTRACTS = [
    {
        id: 'astra_bakery',
        name: 'Comerciantes de Astra: Pan y Harina',
        type: 'urgent',
        badge: '🔥 Urgente x2.0',
        multiple: 2.0,
        rewardCoins: 65000,
        rewardExp: 4200,
        items: [
            { item: 'premium_bread', amount: 30, stock: 0 },
            { item: 'wheatmeal', amount: 50, stock: 0 },
            { item: 'quick_wheat', amount: 80, stock: 0 }
        ]
    },
    {
        id: 'gogohomes_construction',
        name: 'Fannie GoGoHomes: Componentes de Caravana',
        type: 'urgent',
        badge: '🔥 Urgente x3.0',
        multiple: 3.0,
        rewardCoins: 85000,
        rewardExp: 5000,
        items: [
            { item: 'wood_block', amount: 100, stock: 0 },
            { item: 'rough_lumber', amount: 40, stock: 0 },
            { item: 'mineral_sand', amount: 80, stock: 0 }
        ]
    },
    {
        id: 'perfume_alchemy',
        name: 'Alquimia de Floralia: Perfumes Prémium',
        type: 'urgent',
        badge: '🔥 Urgente x2.5',
        multiple: 2.5,
        rewardCoins: 72000,
        rewardExp: 4800,
        items: [
            { item: 'premium_mixed_perfume', amount: 25, stock: 0 },
            { item: 'advanced_lemon_incense', amount: 40, stock: 0 }
        ]
    },
    {
        id: 'fentuft_textiles',
        name: 'Demanda Textil de Fentuft',
        type: 'urgent',
        badge: '🔥 Urgente x2.0',
        multiple: 2.0,
        rewardCoins: 54000,
        rewardExp: 3600,
        items: [
            { item: 'quick_wool', amount: 75, stock: 0 },
            { item: 'quick_aromathyst', amount: 50, stock: 0 }
        ]
    },
    {
        id: 'oasis_banquet',
        name: 'Festín del Oasis: Sirope y Patatas',
        type: 'urgent',
        badge: '🔥 Urgente x2.2',
        multiple: 2.2,
        rewardCoins: 60000,
        rewardExp: 4000,
        items: [
            { item: 'quick_maple_syrup', amount: 60, stock: 0 },
            { item: 'quick_potato', amount: 90, stock: 0 }
        ]
    },
    {
        id: 'season_flower_sea',
        name: 'Pase de Temporada: Mar de Flores',
        type: 'season',
        badge: '🌸 Evento / Pase',
        multiple: 1.5,
        rewardCoins: 30000,
        rewardSeasonStamps: 450,
        items: [
            { item: 'lavender_powder', amount: 40, stock: 0 },
            { item: 'quick_fresh_water', amount: 80, stock: 0 }
        ]
    },
    {
        id: 'season_summer_harvest',
        name: 'Pase del Hogar: Cosecha Estival',
        type: 'season',
        badge: '🌸 Evento / Pase',
        multiple: 1.5,
        rewardCoins: 35000,
        rewardSeasonStamps: 600,
        items: [
            { item: 'quick_rice', amount: 100, stock: 0 },
            { item: 'quick_coconut', amount: 50, stock: 0 }
        ]
    },
    {
        id: 'season_delight_pudding',
        name: 'Gran Festín: Pudin de Fresa Prémium',
        type: 'season',
        badge: '🌸 Evento / Pase',
        multiple: 1.8,
        rewardCoins: 45000,
        rewardSeasonStamps: 750,
        items: [
            { item: 'premium_berry_chocolate_coconut_pudding', amount: 25, stock: 0 },
            { item: 'quick_deep_rock_spring_water', amount: 60, stock: 0 }
        ]
    }
];

const STORAGE_KEY = 'aniimax_active_contracts';

/**
 * Carga los contratos activos guardados en LocalStorage.
 */
export function getActiveContracts() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch (e) {
        console.warn('Error al cargar contratos de localStorage:', e);
    }
    // Por defecto, iniciamos con 2 contratos sugeridos (1 urgente y 1 de temporada)
    return [
        JSON.parse(JSON.stringify(PRESET_CONTRACTS[0])),
        JSON.parse(JSON.stringify(PRESET_CONTRACTS[5]))
    ];
}

/**
 * Guarda los contratos activos en LocalStorage.
 */
export function saveActiveContracts(contracts) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts));
    } catch (e) {
        console.warn('Error al guardar contratos en localStorage:', e);
    }
}

/**
 * Formatea un nombre de ítem snake_case a título legible.
 */
export function formatItemTitle(name) {
    if (!name) return '';
    const map = {
        'coins': 'Monedas del Hogar',
        'wood_block': 'Bloques de Madera',
        'rough_lumber': 'Madera en Bruto',
        'mineral_sand': 'Arena Mineral',
        'wheatmeal': 'Harina de Trigo',
        'premium_bread': 'Pan Prémium',
        'quick_wheat': 'Trigo Rápido',
        'quick_potato': 'Patata Rápida',
        'quick_rice': 'Arroz Rápido',
        'quick_coconut': 'Coco Rápido',
        'quick_wool': 'Lana Rápida',
        'quick_aromathyst': 'Aromatista Rápida',
        'quick_maple_syrup': 'Sirope de Arce Rápido',
        'quick_fresh_water': 'Agua Dulce Rápida',
        'quick_deep_rock_spring_water': 'Agua de Roca Profunda Rápida',
        'lavender_powder': 'Polvo de Lavanda',
        'premium_mixed_perfume': 'Perfume Mixto Prémium',
        'advanced_lemon_incense': 'Incienso de Limón Avanzado',
        'premium_berry_chocolate_coconut_pudding': 'Pudin de Fresa Prémium',
        'apple_tart': 'Tarta de Manzana',
        'candied_strawberries': 'Fresas Confitadas'
    };
    if (map[name]) return translate(map[name]);
    const formatted = name.split('_').map(w => w ? w[0].toUpperCase() + w.slice(1) : '').join(' ');
    return translate(formatted);
}

/**
 * Formato de duración en horas y minutos.
 */
function formatHoursMins(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return '0m';
    const totalMinutes = Math.ceil(seconds / 60);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const mins = totalMinutes % 60;
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
}

/**
 * Calcula el progreso, tasa de producción, tiempo restante y ganancias de los contratos activos
 * a partir de un plan de producción de Aniimax.
 */
export function calculateContractsAnalysis(plan, contracts = getActiveContracts()) {
    if (!contracts || contracts.length === 0) {
        return {
            contracts: [],
            totalCoins: 0,
            totalSeasonStamps: 0,
            maxCompletionHours: 0,
            allDone: false,
            contractItems: new Set(),
            contractFacilities: new Set()
        };
    }

    // Mapear tasas de producción de cada ítem en el plan (unidades/segundo)
    const productionRates = new Map(); // item_name -> units_per_second
    const itemFacilities = new Map();  // item_name -> facility_name

    // 1. Productos finales vendidos
    if (plan && plan.income_streams) {
        plan.income_streams.forEach(stream => {
            const current = productionRates.get(stream.item_name) || 0;
            productionRates.set(stream.item_name, current + (stream.units_per_second || 0));
            if (stream.facility) itemFacilities.set(stream.item_name, stream.facility);
        });
    }

    // 2. Pasos de instalaciones (incluye productos intermedios y cosechas)
    if (plan && plan.coin_items) {
        plan.coin_items.forEach(step => {
            if (step.item_name && step.cycle_time && step.cycle_time > 0 && step.facility_count > 0) {
                // Tasa = cantidad_instalaciones / cycle_time
                const rate = step.facility_count / step.cycle_time;
                const current = productionRates.get(step.item_name) || 0;
                if (rate > current) {
                    productionRates.set(step.item_name, rate);
                }
                if (step.facility) itemFacilities.set(step.item_name, step.facility);
            }
        });
    }

    let totalCoins = 0;
    let totalSeasonStamps = 0;
    let maxCompletionSeconds = 0;
    const allContractItems = new Set();
    const allContractFacilities = new Set();

    const evaluatedContracts = contracts.map(contract => {
        const mult = contract.multiple || 1.0;
        const rewardCoinsEffective = Math.round((contract.rewardCoins || 0) * (contract.type === 'urgent' ? mult : 1.0));
        const rewardSeasonStamps = contract.rewardSeasonStamps || 0;

        totalCoins += rewardCoinsEffective;
        totalSeasonStamps += rewardSeasonStamps;

        let contractMaxSeconds = 0;
        let contractAllDone = true;
        let bottleneckItem = null;

        const evaluatedItems = (contract.items || []).map(entry => {
            allContractItems.add(entry.item);
            const fac = itemFacilities.get(entry.item) || 'Instalación correspondiente';
            allContractFacilities.add(fac);

            const required = entry.amount || 0;
            const stock = entry.stock || 0;
            const pending = Math.max(0, required - stock);
            const unitsPerSec = productionRates.get(entry.item) || 0;
            const unitsPerHour = unitsPerSec * 3600;

            let secondsNeeded = 0;
            let status = 'done'; // done, in_progress, no_production

            if (pending <= 0) {
                status = 'done';
                secondsNeeded = 0;
            } else if (unitsPerSec > 0) {
                status = 'in_progress';
                secondsNeeded = pending / unitsPerSec;
                contractAllDone = false;
            } else {
                status = 'no_production';
                secondsNeeded = Infinity;
                contractAllDone = false;
            }

            if (secondsNeeded > contractMaxSeconds) {
                contractMaxSeconds = secondsNeeded;
                bottleneckItem = entry.item;
            }

            return {
                item: entry.item,
                name: formatItemTitle(entry.item),
                facility: fac,
                required,
                stock,
                pending,
                unitsPerHour,
                status,
                secondsNeeded,
                etaText: status === 'done' ? '✅ En almacén' : status === 'in_progress' ? formatHoursMins(secondsNeeded) : '⚠️ Sin producción activa'
            };
        });

        if (contractMaxSeconds > maxCompletionSeconds) {
            maxCompletionSeconds = contractMaxSeconds;
        }

        return {
            ...contract,
            rewardCoinsEffective,
            rewardSeasonStamps,
            items: evaluatedItems,
            contractMaxSeconds,
            contractAllDone,
            bottleneckItem,
            etaFormatted: contractAllDone ? '¡Listo para entregar!' : Number.isFinite(contractMaxSeconds) ? formatHoursMins(contractMaxSeconds) : 'Requiere instalaciones'
        };
    });

    return {
        contracts: evaluatedContracts,
        totalCoins,
        totalSeasonStamps,
        maxCompletionHours: maxCompletionSeconds / 3600,
        maxCompletionSeconds,
        maxCompletionEtaFormatted: formatHoursMins(maxCompletionSeconds),
        allDone: evaluatedContracts.every(c => c.contractAllDone),
        contractItems: allContractItems,
        contractFacilities: allContractFacilities
    };
}

/**
 * Renderiza el panel de configuración de contratos en la barra izquierda.
 */
export function renderContractsConfigUI(container, onContractsChanged, onOptimizeForContracts) {
    if (!container) return;
    const contracts = getActiveContracts();

    container.innerHTML = `
        <div class="contracts-header">
            <div class="contracts-title-wrap">
                <span class="contracts-icon">📜</span>
                <div>
                    <h4 class="contracts-title">Contratos del Hogar (Urgentes y Evento)</h4>
                    <p class="hint small">Registra tus pedidos activos de la Tierra Natal para que el planificador los calcule y optimice tu base.</p>
                </div>
            </div>
        </div>

        <div class="contracts-presets-section">
            <span class="preset-label">Añadir pedidos del datamine:</span>
            <div class="preset-chips-wrap" id="preset-chips-container"></div>
        </div>

        <div class="active-contracts-list" id="active-contracts-list"></div>

        <div class="custom-contract-adder">
            <details class="explain custom-contract-details">
                <summary>➕ Crear Pedido Personalizado</summary>
                <div class="custom-contract-form">
                    <div class="input-row">
                        <div class="input-field" style="flex: 2;">
                            <label for="custom-c-name">Nombre del encargo</label>
                            <input type="text" id="custom-c-name" placeholder="Ej. Pedido Urgente Especial" value="Pedido Urgente de Astra">
                        </div>
                        <div class="input-field" style="flex: 1;">
                            <label for="custom-c-type">Tipo</label>
                            <select id="custom-c-type">
                                <option value="urgent">🔥 Urgente (x2.5)</option>
                                <option value="season">🌸 Evento / Pase</option>
                            </select>
                        </div>
                    </div>
                    <div class="input-row">
                        <div class="input-field" style="flex: 2;">
                            <label for="custom-c-item">Producto requerido</label>
                            <select id="custom-c-item"></select>
                        </div>
                        <div class="input-field" style="flex: 1;">
                            <label for="custom-c-amount">Cantidad</label>
                            <input type="number" id="custom-c-amount" min="1" max="1000" value="50">
                        </div>
                        <div class="input-field" style="flex: 1;">
                            <label for="custom-c-stock">Stock actual</label>
                            <input type="number" id="custom-c-stock" min="0" max="1000" value="0">
                        </div>
                    </div>
                    <button type="button" id="btn-add-custom-contract" class="skip-add-btn" style="margin-top: 0.5rem; width: 100%;">
                        ➕ Añadir este encargo a la lista
                    </button>
                </div>
            </details>
        </div>

        <div class="contracts-actions-bar">
            <button type="button" id="btn-optimize-contracts" class="optimize-btn contracts-btn">
                <span class="btn-text">🎯 Optimizar Plan para estos Contratos</span>
            </button>
        </div>
    `;

    // 1. Renderizar chips de presets
    const chipsContainer = container.querySelector('#preset-chips-container');
    PRESET_CONTRACTS.forEach(preset => {
        const isAdded = contracts.some(c => c.id === preset.id);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `contract-preset-chip ${isAdded ? 'active' : ''}`;
        btn.innerHTML = `${preset.badge.split(' ')[0]} ${preset.name}`;
        btn.title = `${preset.badge} - ${preset.items.map(i => `${formatItemTitle(i.item)} x${i.amount}`).join(', ')}`;
        btn.addEventListener('click', () => {
            const current = getActiveContracts();
            const existsIndex = current.findIndex(c => c.id === preset.id);
            if (existsIndex >= 0) {
                current.splice(existsIndex, 1);
            } else {
                current.push(JSON.parse(JSON.stringify(preset)));
            }
            saveActiveContracts(current);
            renderContractsConfigUI(container, onContractsChanged, onOptimizeForContracts);
            if (onContractsChanged) onContractsChanged(current);
        });
        chipsContainer.appendChild(btn);
    });

    // 2. Poblar selector de ítems para contrato personalizado
    const itemSelect = container.querySelector('#custom-c-item');
    const availableItems = [
        'wheatmeal', 'premium_bread', 'quick_wheat', 'wood_block', 'rough_lumber',
        'mineral_sand', 'premium_mixed_perfume', 'advanced_lemon_incense', 'quick_wool',
        'quick_aromathyst', 'quick_maple_syrup', 'quick_potato', 'quick_rice',
        'quick_coconut', 'lavender_powder', 'premium_berry_chocolate_coconut_pudding',
        'apple_tart', 'candied_strawberries', 'quick_fresh_water', 'quick_deep_rock_spring_water'
    ];
    availableItems.sort((a, b) => formatItemTitle(a).localeCompare(formatItemTitle(b))).forEach(itemKey => {
        const opt = document.createElement('option');
        opt.value = itemKey;
        opt.textContent = formatItemTitle(itemKey);
        itemSelect.appendChild(opt);
    });

    // 3. Listener añadir contrato personalizado
    const btnAddCustom = container.querySelector('#btn-add-custom-contract');
    btnAddCustom.addEventListener('click', () => {
        const name = container.querySelector('#custom-c-name').value.trim() || 'Encargo Personalizado';
        const type = container.querySelector('#custom-c-type').value;
        const item = container.querySelector('#custom-c-item').value;
        const amount = Math.max(1, parseInt(container.querySelector('#custom-c-amount').value, 10) || 50);
        const stock = Math.max(0, parseInt(container.querySelector('#custom-c-stock').value, 10) || 0);

        const newContract = {
            id: 'custom_' + Date.now(),
            name,
            type,
            badge: type === 'urgent' ? '🔥 Urgente x2.5' : '🌸 Evento / Pase',
            multiple: type === 'urgent' ? 2.5 : 1.5,
            rewardCoins: type === 'urgent' ? amount * 900 : amount * 500,
            rewardSeasonStamps: type === 'season' ? Math.round(amount * 8) : 0,
            items: [{ item, amount, stock }]
        };

        const current = getActiveContracts();
        current.push(newContract);
        saveActiveContracts(current);
        renderContractsConfigUI(container, onContractsChanged, onOptimizeForContracts);
        if (onContractsChanged) onContractsChanged(current);
    });

    // 4. Renderizar lista de contratos activos
    const listEl = container.querySelector('#active-contracts-list');
    if (contracts.length === 0) {
        listEl.innerHTML = `<p class="hint small" style="text-align: center; padding: 0.75rem;">No tienes contratos seleccionados. Elige uno arriba o añade uno personalizado.</p>`;
    } else {
        listEl.innerHTML = contracts.map((c, idx) => `
            <div class="contract-active-card ${c.type}">
                <div class="contract-card-top">
                    <span class="contract-badge ${c.type}">${c.badge}</span>
                    <strong class="contract-name">${c.name}</strong>
                    <button type="button" class="btn-remove-contract" data-index="${idx}" title="Eliminar contrato">✕</button>
                </div>
                <div class="contract-items-table">
                    ${c.items.map((it, itIdx) => `
                        <div class="contract-item-row">
                            <span class="c-item-name">${formatItemTitle(it.item)}:</span>
                            <span class="c-item-req"><b>${it.amount}</b> requeridos</span>
                            <div class="c-stock-wrap">
                                <label>Tengo en almacén:</label>
                                <input type="number" class="c-stock-input" data-cindex="${idx}" data-iindex="${itIdx}" min="0" max="${it.amount}" value="${it.stock || 0}">
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');

        // Listeners para eliminar contrato
        listEl.querySelectorAll('.btn-remove-contract').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.index, 10);
                const current = getActiveContracts();
                current.splice(idx, 1);
                saveActiveContracts(current);
                renderContractsConfigUI(container, onContractsChanged, onOptimizeForContracts);
                if (onContractsChanged) onContractsChanged(current);
            });
        });

        // Listeners para actualizar stock
        listEl.querySelectorAll('.c-stock-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const cIdx = parseInt(e.target.dataset.cindex, 10);
                const iIdx = parseInt(e.target.dataset.iindex, 10);
                const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                const current = getActiveContracts();
                if (current[cIdx] && current[cIdx].items[iIdx]) {
                    current[cIdx].items[iIdx].stock = val;
                    saveActiveContracts(current);
                    if (onContractsChanged) onContractsChanged(current);
                }
            });
        });
    }

    // 5. Botón de Optimización
    const btnOptimize = container.querySelector('#btn-optimize-contracts');
    if (btnOptimize) {
        btnOptimize.addEventListener('click', () => {
            if (onOptimizeForContracts) onOptimizeForContracts(contracts);
        });
    }
}

/**
 * Renderiza la tarjeta de Resultados y Auditoría de Contratos en la columna derecha del plan.
 */
export function renderContractsResultCard(resultContainer, plan, contracts = getActiveContracts()) {
    if (!resultContainer) return;
    if (!contracts || contracts.length === 0) {
        resultContainer.style.display = 'none';
        return;
    }

    const analysis = calculateContractsAnalysis(plan, contracts);
    resultContainer.style.display = 'block';

    resultContainer.innerHTML = `
        <div class="card-head">
            <h3>📜 Cumplimiento y Ganancias de Contratos Diarios</h3>
            <span class="badge ${analysis.allDone ? 'badge-success' : 'badge-warning'}">
                ${analysis.allDone ? '✅ Todos listos para entregar' : `⏳ ETA Máximo: ${analysis.maxCompletionEtaFormatted}`}
            </span>
        </div>

        <div class="contracts-kpi-summary">
            <div class="contract-kpi-pill">
                <span class="kpi-label">Recompensa en Monedas</span>
                <span class="kpi-val text-gold">🪙 +${analysis.totalCoins.toLocaleString()}</span>
            </div>
            ${analysis.totalSeasonStamps > 0 ? `
            <div class="contract-kpi-pill">
                <span class="kpi-label">Sellos de Temporada</span>
                <span class="kpi-val text-season">🌸 +${analysis.totalSeasonStamps.toLocaleString()}</span>
            </div>` : ''}
            <div class="contract-kpi-pill">
                <span class="kpi-label">Pedidos Activos</span>
                <span class="kpi-val">${analysis.contracts.length} en seguimiento</span>
            </div>
        </div>

        <div class="contract-cards-breakdown">
            ${analysis.contracts.map(c => `
                <div class="contract-eval-card ${c.contractAllDone ? 'done' : ''}">
                    <div class="c-eval-header">
                        <span class="contract-badge ${c.type}">${c.badge}</span>
                        <strong>${c.name}</strong>
                        <span class="c-eval-eta ${c.contractAllDone ? 'text-green' : 'text-amber'}">${c.etaFormatted}</span>
                    </div>
                    <div class="c-eval-rewards">
                        <span>🪙 Recompensa: <b>+${c.rewardCoinsEffective.toLocaleString()} monedas</b></span>
                        ${c.rewardSeasonStamps > 0 ? `<span>🌸 <b>+${c.rewardSeasonStamps} Sellos</b></span>` : ''}
                    </div>
                    <div class="c-eval-items-grid">
                        ${c.items.map(it => {
                            const pct = it.required > 0 ? Math.min(100, Math.round((it.stock / it.required) * 100)) : 100;
                            return `
                                <div class="c-eval-item-box ${it.status}">
                                    <div class="c-eval-item-title">
                                        <span>${it.name}</span>
                                        <small class="c-fac-hint">${it.facility}</small>
                                    </div>
                                    <div class="c-progress-bar-bg">
                                        <div class="c-progress-bar-fill" style="width: ${pct}%;"></div>
                                    </div>
                                    <div class="c-eval-stats">
                                        <span>${it.stock} / ${it.required} (${it.pending} faltantes)</span>
                                        <span>${it.unitsPerHour > 0 ? `+${it.unitsPerHour.toFixed(1)}/h` : '0/h'}</span>
                                    </div>
                                    <div class="c-eval-eta-note">${it.etaText}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}
