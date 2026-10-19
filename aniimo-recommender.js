// aniimo-recommender.js - Recomendador inteligente de Aniimos basado en Datamine Oficial

let creaturesDatabase = null;
let databaseLoading = null;

export async function loadCreaturesDatabase() {
    if (creaturesDatabase) return creaturesDatabase;
    if (databaseLoading) return databaseLoading;
    databaseLoading = (async () => {
        try {
            const resp = await fetch(new URL('./aniimo_creatures.json', import.meta.url));
            if (!resp.ok) throw new Error('No se pudo cargar aniimo_creatures.json');
            creaturesDatabase = await resp.json();
            return creaturesDatabase;
        } catch (e) {
            console.error('Error cargando base de datos de Aniimos:', e);
            return [];
        } finally {
            databaseLoading = null;
        }
    })();
    return databaseLoading;
}

const ELEMENT_COLORS = {
    'Fuego': '#f87171',
    'Hierba': '#4ade80',
    'Agua': '#60a5fa',
    'Tierra': '#ca8a04',
    'Roca': '#ca8a04',
    'Relámpago': '#facc15',
    'Eléctrico': '#facc15',
    'Hielo': '#38bdf8',
    'Viento': '#2dd4bf',
    'Oscuro': '#c084fc',
    'Oscuridad': '#c084fc',
    'Luz': '#fef08a',
    'Sagrado': '#fef08a',
    'Neutro': '#94a3b8'
};

/**
 * Calcula la recomendación de Aniimos óptimos para el plan actual
 * @param {Array} keptGroups Lista de grupos de tareas de renderAniimoSummary
 * @param {number|null} maxSlots Capacidad del RV actual
 * @param {boolean} allowPrismana Si incluye o no formas de Prismana
 */
export async function recommendAniimos(keptGroups, maxSlots = 26, allowPrismana = true) {
    const db = await loadCreaturesDatabase();
    if (!db || !db.length || !keptGroups || !keptGroups.length) {
        return { recommendations: [], totalAssigned: 0, maxSlots: maxSlots || 26, freeSlots: maxSlots || 26 };
    }

    const availablePool = db.filter(c => allowPrismana ? true : !c.is_prismana);

    // Mapeo de necesidades
    const recommendations = [];
    let totalAssigned = 0;

    for (const group of keptGroups) {
        const ability = group.ability;
        const requiredLevel = group.level || 1;
        const count = group.count || 1;
        const whereDesc = [...group.where.entries()]
            .map(([place, n]) => n > 1 ? `${place} ×${n}` : place)
            .join(', ') || (group.jobs.size ? [...group.jobs.keys()].join(', ') : 'Labores generales');

        // Buscar el mejor Aniimo que cumpla con la habilidad y el nivel
        const candidates = availablePool.filter(c => (c.abilities[ability] || 0) >= requiredLevel);

        // Si no hay candidatos exactos para el nivel (ej. nivel 4 en pool sin prismana), tomar el mayor nivel disponible
        const sorted = candidates.length ? candidates : availablePool.filter(c => (c.abilities[ability] || 0) > 0);
        
        sorted.sort((a, b) => {
            const lvlA = a.abilities[ability] || 0;
            const lvlB = b.abilities[ability] || 0;
            if (lvlB !== lvlA) return lvlB - lvlA;
            // Preferir que tenga Transporte / Remolque adicional
            const haulA = a.abilities['Remolque'] || 0;
            const haulB = b.abilities['Remolque'] || 0;
            if (haulB !== haulA) return haulB - haulA;
            // Preferir mayor cantidad de habilidades útiles
            return Object.keys(b.abilities).length - Object.keys(a.abilities).length;
        });

        const bestMatch = sorted[0];

        if (bestMatch) {
            recommendations.push({
                creature: bestMatch,
                count: count,
                ability: ability,
                requiredLevel: requiredLevel,
                providedLevel: bestMatch.abilities[ability] || requiredLevel,
                where: whereDesc,
                personalityBonus: group.bonus,
                haulingBonus: bestMatch.abilities['Remolque'] || 0
            });
            totalAssigned += count;
        }
    }

    // Asegurar 1 transportista si no hay ninguno cubierto
    const hasHauler = recommendations.some(r => r.creature.abilities['Remolque'] >= 1);
    if (!hasHauler) {
        const bestHaulers = availablePool
            .filter(c => (c.abilities['Remolque'] || 0) >= 1)
            .sort((a, b) => (b.abilities['Remolque'] || 0) - (a.abilities['Remolque'] || 0));
        if (bestHaulers[0]) {
            recommendations.push({
                creature: bestHaulers[0],
                count: 1,
                ability: 'Remolque',
                requiredLevel: 1,
                providedLevel: bestHaulers[0].abilities['Remolque'],
                where: 'Transporte continuo al Almacén',
                personalityBonus: false,
                haulingBonus: bestHaulers[0].abilities['Remolque']
            });
            totalAssigned += 1;
        }
    }

    const freeSlots = Math.max(0, (maxSlots || 26) - totalAssigned);

    return {
        recommendations,
        totalAssigned,
        maxSlots: maxSlots || 26,
        freeSlots
    };
}

/**
 * Renderiza el widget interactivo del recomendador de Aniimo
 */
export function renderRecommenderUI(recommendationData, containerEl, onTogglePrismana, allowPrismana = true) {
    if (!containerEl) return;
    const { recommendations, totalAssigned, maxSlots, freeSlots } = recommendationData;

    if (!recommendations || recommendations.length === 0) {
        containerEl.innerHTML = `
            <div class="recommender-box empty">
                <p class="hint">No hay Aniimos requeridos en este plan.</p>
            </div>
        `;
        return;
    }

    const cardsHtml = recommendations.map(rec => {
        const c = rec.creature;
        const iconSrc = c.local_icon || c.icon_url || '';
        const fallbackSrc = c.icon_url || '';
        const elementBadges = (c.elements || []).map(elem => {
            const color = ELEMENT_COLORS[elem] || '#94a3b8';
            return `<span class="recommender-elem-badge" style="background:${color}22; color:${color}; border:1px solid ${color}66">${elem}</span>`;
        }).join('');

        const abilitiesBadges = Object.entries(c.abilities).map(([ab, lvl]) => {
            const isTarget = ab === rec.ability;
            return `<span class="recommender-skill-pill${isTarget ? ' active-target' : ''}">${ab} Lv.${lvl}</span>`;
        }).join('');

        const habitatText = c.habitat ? `📍 <strong>Hábitat:</strong> ${c.habitat}` : '';

        return `
            <div class="recommender-card">
                <div class="recommender-card-left">
                    <div class="recommender-avatar-wrap">
                        <img class="recommender-avatar" src="${iconSrc}" onerror="this.onerror=null;this.src='${fallbackSrc}';" alt="${c.name}" loading="lazy" />
                        <span class="recommender-count-badge">×${rec.count}</span>
                    </div>
                </div>
                <div class="recommender-card-info">
                    <div class="recommender-header-line">
                        <span class="recommender-dex">${c.dex}</span>
                        <strong class="recommender-name">${c.name}</strong>
                        ${elementBadges}
                    </div>
                    <div class="recommender-task-line">
                        🎯 <strong>Labor asignada:</strong> <span class="recommender-task-dest">${rec.where}</span>
                    </div>
                    <div class="recommender-skills-list">
                        ${abilitiesBadges}
                    </div>
                    ${habitatText ? `<div class="recommender-habitat-line">${habitatText}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');

    const slotsClass = totalAssigned > maxSlots ? 'over-capacity' : 'optimal-capacity';

    containerEl.innerHTML = `
        <div class="recommender-container">
            <div class="recommender-header-bar">
                <div class="recommender-title-block">
                    <h3 class="recommender-title">✨ Aniimos recomendados para este plan</h3>
                    <p class="recommender-subtitle">Criaturas óptimas del datamine oficial seleccionadas según las necesidades exactas de producción.</p>
                </div>
                <div class="recommender-stats-badge ${slotsClass}">
                    <strong>${totalAssigned}</strong> / ${maxSlots} slots usados
                    <span class="recommender-free-slots">(${freeSlots} libres)</span>
                </div>
            </div>

            <div class="recommender-toolbar">
                <label class="recommender-toggle-label">
                    <input type="checkbox" id="recommender-prismana-toggle" ${allowPrismana ? 'checked' : ''}>
                    <span>Incluir Formas de Prismana (máxima eficiencia Lv.4)</span>
                </label>
                <button type="button" class="button small" id="recommender-copy-btn">📋 Copiar lista</button>
            </div>

            <div class="recommender-grid">
                ${cardsHtml}
            </div>
        </div>
    `;

    // Eventos
    const toggle = containerEl.querySelector('#recommender-prismana-toggle');
    if (toggle && onTogglePrismana) {
        toggle.addEventListener('change', (e) => {
            onTogglePrismana(e.target.checked);
        });
    }

    const copyBtn = containerEl.querySelector('#recommender-copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const summary = recommendations.map(r => `• ${r.creature.name} (${r.creature.dex}) ×${r.count} -> ${r.where} [${r.ability} Lv.${r.providedLevel}]`).join('\n');
            const textToCopy = `Equipo Aniimo Recomendado (${totalAssigned}/${maxSlots} slots):\n${summary}`;
            navigator.clipboard.writeText(textToCopy).then(() => {
                copyBtn.textContent = '✓ ¡Copiado!';
                setTimeout(() => { copyBtn.textContent = '📋 Copiar lista'; }, 2000);
            });
        });
    }
}
