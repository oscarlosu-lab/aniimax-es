// Aniimax Facilities Reference Page
//
// A static reference table of every recipe in the game data, grouped by facility. Unlike the
// optimizer page, this isn't tied to owned facility counts or levels; it just lists what's
// possible to unlock. Recipe data comes from `get_all_items()` (see wasm.rs), which dumps every
// `ProductionItem` unfiltered.

import init, { get_all_items, get_version } from './pkg/aniimax.js';
import { FACILITIES, FACILITY_CATEGORIES } from './facility-config.js';

const MODULE_LABELS = {
    ecological_module: 'Ecological Module',
    kitchen_module: 'Kitchen Module',
    mineral_detector: 'Mineral Detector',
    crafting_module: 'Crafting Module',
};

function formatCurrency(currency) {
    return currency === 'bud_tickets' ? 'Bud Tickets' : 'Coins';
}

// Mirrors the Rust `format_time` helper in wasm.rs (hours/minutes/seconds, dropping leading
// zero units) so times read the same way here as they would in-game.
function formatTime(seconds) {
    const total = Math.round(seconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
}

function formatInputs(recipe) {
    if (recipe.raw_materials && recipe.raw_materials.length > 0) {
        const amounts = recipe.required_amount || [];
        return recipe.raw_materials
            .map((mat, i) => `${amounts[i] ?? '?'}x ${mat}`)
            .join(', ');
    }
    if (recipe.cost && recipe.cost > 0) {
        return `Plant cost: ${recipe.cost}`;
    }
    return '—';
}

function formatYield(recipe) {
    let text = `${recipe.yield_amount}`;
    if (recipe.byproduct) {
        const [name, amount] = recipe.byproduct;
        text += ` <span class="hint small">(+${amount} ${name})</span>`;
    }
    return text;
}

function formatModule(recipe) {
    if (!recipe.module_requirement) return '—';
    const [name, level] = recipe.module_requirement;
    const label = MODULE_LABELS[name] || name;
    return `${label} Lv.${level}`;
}

// Renders one table per facility (grouped into category sections, same grouping/order as the
// optimizer page's facility cards), each listing every recipe available at that facility sorted
// by required level then name.
function renderRecipeTables(recipes) {
    const container = document.getElementById('recipes-container');

    const byFacility = new Map();
    recipes.forEach(r => {
        if (!byFacility.has(r.facility)) byFacility.set(r.facility, []);
        byFacility.get(r.facility).push(r);
    });
    byFacility.forEach(list => {
        list.sort((a, b) => a.facility_level - b.facility_level || a.name.localeCompare(b.name));
    });

    container.innerHTML = FACILITY_CATEGORIES.map(category => {
        const facilitiesInCategory = FACILITIES.filter(f => f.category === category && byFacility.has(f.name));
        if (facilitiesInCategory.length === 0) return '';

        const tables = facilitiesInCategory.map(f => {
            const rows = byFacility.get(f.name).map(r => `
                <tr>
                    <td>${r.name}</td>
                    <td>${r.facility_level}</td>
                    <td>${formatInputs(r)}</td>
                    <td>${formatYield(r)}</td>
                    <td>${formatTime(r.production_time)}</td>
                    <td>${r.sell_value} ${formatCurrency(r.sell_currency)}</td>
                    <td>${formatModule(r)}</td>
                </tr>
            `).join('');

            return `
                <div class="facility-recipe-table">
                    <h4>${f.name}</h4>
                    <div class="table-wrapper">
                        <table class="recipe-table">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Level</th>
                                    <th>Inputs</th>
                                    <th>Yield</th>
                                    <th>Time</th>
                                    <th>Sell</th>
                                    <th>Module</th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="facility-category">
                <h4 class="facility-category-title">${category}</h4>
                ${tables}
            </div>
        `;
    }).join('');
}

async function main() {
    try {
        await init();
        document.getElementById('version').textContent = get_version();

        const recipes = JSON.parse(get_all_items());
        renderRecipeTables(recipes);

        document.getElementById('loading-hint').style.display = 'none';
        document.getElementById('recipes-section').style.display = 'block';
    } catch (error) {
        console.error('Failed to load recipe data:', error);
        document.getElementById('loading-hint').textContent = 'Failed to load recipe data. Please refresh the page.';
    }
}

document.addEventListener('DOMContentLoaded', main);
