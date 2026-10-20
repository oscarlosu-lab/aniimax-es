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
    'Relámpago': '#facc15',
    'Hielo': '#38bdf8',
    'Viento': '#2dd4bf',
    'Oscuro': '#c084fc',
    'Luz': '#fef08a',
    'Neutro': '#94a3b8'
};

const ABILITY_ES_NAME = {
    'Fire': 'Fuego', 'Fuego': 'Fuego',
    'Grass': 'Hierba', 'Hierba': 'Hierba',
    'Water': 'Agua', 'Agua': 'Agua',
    'Earth': 'Tierra', 'Tierra': 'Tierra',
    'Lightning': 'Relámpago', 'Relámpago': 'Relámpago',
    'Ice': 'Hielo', 'Hielo': 'Hielo',
    'Wind': 'Viento', 'Viento': 'Viento',
    'Dark': 'Oscuro', 'Oscuro': 'Oscuro',
    'Light': 'Luz', 'Luz': 'Luz',
    'Hauling': 'Remolque', 'Remolque': 'Remolque',
    'Artisanship': 'Artesanía', 'Artesanía': 'Artesanía',
    'Leisure': 'Ocio', 'Ocio': 'Ocio',
    'Perfumery': 'Perfumería', 'Perfumería': 'Perfumería'
};

const DISPLAY_ABILITIES = ['Fuego', 'Hierba', 'Agua', 'Tierra', 'Relámpago', 'Hielo', 'Viento', 'Oscuro', 'Luz', 'Remolque', 'Artesanía', 'Ocio', 'Perfumería'];

export function isWildCreature(creature) {
    if (!creature || !creature.habitat) return false;
    const hab = creature.habitat.toLowerCase();
    if (hab.includes('no se encuentra en la naturaleza') || hab.includes('nacen de huevos') || hab.includes('crianza compartida')) {
        return false;
    }
    return true;
}

export function findAlternativeCreature(primaryCreature, canonicalAbility, rawAbility, requiredLevel, pool, preferWild = true) {
    let candidates = pool.filter(c => {
        if (c.name === primaryCreature.name || c.base_name === primaryCreature.base_name || c.id === primaryCreature.id) return false;
        const lvl = c.abilities[canonicalAbility] || c.abilities[rawAbility] || 0;
        return lvl >= requiredLevel;
    });

    if (preferWild) {
        const wildMatches = candidates.filter(isWildCreature);
        if (wildMatches.length) candidates = wildMatches;
    }

    if (!candidates.length) {
        candidates = pool.filter(c => {
            if (c.name === primaryCreature.name || c.base_name === primaryCreature.base_name || c.id === primaryCreature.id) return false;
            return (c.abilities[canonicalAbility] || c.abilities[rawAbility] || 0) > 0;
        });
        if (preferWild) {
            const wildMatches = candidates.filter(isWildCreature);
            if (wildMatches.length) candidates = wildMatches;
        }
    }

    if (!candidates.length) return null;

    candidates.sort((a, b) => {
        const wildA = isWildCreature(a) ? 1 : 0;
        const wildB = isWildCreature(b) ? 1 : 0;
        if (wildB !== wildA) return wildB - wildA;
        const lvlA = a.abilities[canonicalAbility] || a.abilities[rawAbility] || 0;
        const lvlB = b.abilities[canonicalAbility] || b.abilities[rawAbility] || 0;
        if (lvlB !== lvlA) return lvlB - lvlA;
        const haulA = a.abilities['Remolque'] || a.abilities['Hauling'] || 0;
        const haulB = b.abilities['Remolque'] || b.abilities['Hauling'] || 0;
        if (haulB !== haulA) return haulB - haulA;
        return Object.keys(b.abilities).length - Object.keys(a.abilities).length;
    });

    return candidates[0] || null;
}

/**
 * Calcula la recomendación de Aniimos óptimos para el plan actual
 * @param {Array} keptGroups Lista de grupos de tareas de renderAniimoSummary
 * @param {number|null} maxSlots Capacidad del RV actual
 * @param {Object} options Opciones de configuración { allowPrismana, onlyWild, swaps }
 */
export async function recommendAniimos(keptGroups, maxSlots = 26, options = {}) {
    const allowPrismana = options.allowPrismana ?? true;
    const onlyWild = options.onlyWild ?? false;
    const manualSwaps = options.swaps || {};

    const db = await loadCreaturesDatabase();
    if (!db || !db.length || !keptGroups || !keptGroups.length) {
        return { recommendations: [], totalAssigned: 0, maxSlots: maxSlots || 26, freeSlots: maxSlots || 26 };
    }

    let availablePool = db.filter(c => allowPrismana ? true : !c.is_prismana);
    if (onlyWild) {
        availablePool = availablePool.filter(isWildCreature);
    }

    const rawRecommendations = [];
    let totalAssigned = 0;

    for (const group of keptGroups) {
        const rawAbility = group.ability;
        const canonicalAbility = ABILITY_ES_NAME[rawAbility] || rawAbility;
        const requiredLevel = group.level || 1;
        const count = group.count || 1;
        
        let whereDesc = '';
        if (group.where && group.where.size) {
            whereDesc = [...group.where.entries()]
                .map(([place, n]) => n > 1 ? `${place} ×${n}` : place)
                .join(', ');
        } else if (group.jobs && group.jobs.size) {
            const trJobs = {
                'Sowing': 'Siembra',
                'Collecting': 'Recolección',
                'Reaping': 'Cosecha',
                'Logging': 'Tala',
                'Reclaiming': 'Preparación'
            };
            whereDesc = [...group.jobs.keys()].map(j => trJobs[j] || j).join(' y ') + ' de cultivos';
        } else {
            whereDesc = 'Labores generales del Hogar';
        }

        // Buscar en el pool criaturas que cumplan con la habilidad requerida
        const candidates = availablePool.filter(c => {
            const lvl = c.abilities[canonicalAbility] || c.abilities[rawAbility] || 0;
            return lvl >= requiredLevel;
        });

        // Si no hay candidatos para ese nivel exacto, buscar las de mayor nivel disponible
        const sorted = candidates.length ? candidates : availablePool.filter(c => {
            return (c.abilities[canonicalAbility] || c.abilities[rawAbility] || 0) > 0;
        });

        sorted.sort((a, b) => {
            // Si no estamos en modo onlyWild estricto, preferir criaturas salvajes si los niveles empatan
            const wildA = isWildCreature(a) ? 1 : 0;
            const wildB = isWildCreature(b) ? 1 : 0;
            const lvlA = a.abilities[canonicalAbility] || a.abilities[rawAbility] || 0;
            const lvlB = b.abilities[canonicalAbility] || b.abilities[rawAbility] || 0;
            if (lvlB !== lvlA) return lvlB - lvlA;
            if (wildB !== wildA) return wildB - wildA;
            // Desempate 1: mayor nivel de Remolque / Transporte secundario
            const haulA = a.abilities['Remolque'] || a.abilities['Hauling'] || 0;
            const haulB = b.abilities['Remolque'] || b.abilities['Hauling'] || 0;
            if (haulB !== haulA) return haulB - haulA;
            // Desempate 2: más habilidades generales para polivalencia
            return Object.keys(b.abilities).length - Object.keys(a.abilities).length;
        });

        let chosenCreature = sorted[0];

        // Verificar si el usuario pidió un reemplazo manual para esta criatura
        if (chosenCreature && manualSwaps[chosenCreature.id]) {
            const swapTarget = db.find(c => c.id === manualSwaps[chosenCreature.id]);
            if (swapTarget) chosenCreature = swapTarget;
        }

        if (chosenCreature) {
            const provLvl = chosenCreature.abilities[canonicalAbility] || chosenCreature.abilities[rawAbility] || requiredLevel;
            
            // Buscar una alternativa (preferiblemente salvaje y fácil de capturar)
            const alternative = findAlternativeCreature(chosenCreature, canonicalAbility, rawAbility, requiredLevel, db, true);

            rawRecommendations.push({
                creature: chosenCreature,
                alternative: alternative,
                isWild: isWildCreature(chosenCreature),
                count: count,
                ability: canonicalAbility,
                requiredLevel: requiredLevel,
                providedLevel: provLvl,
                where: whereDesc,
                personalityBonus: group.bonus,
                haulingBonus: chosenCreature.abilities['Remolque'] || 0
            });
            totalAssigned += count;
        }
    }

    // Asegurar siempre 1+ transportista dedicado para la fila de Remolque
    const hasDedicatedHauler = rawRecommendations.some(r => r.ability === 'Remolque');
    if (!hasDedicatedHauler) {
        const bestHaulers = availablePool
            .filter(c => (c.abilities['Remolque'] || c.abilities['Hauling'] || 0) >= 1)
            .sort((a, b) => {
                const wildA = isWildCreature(a) ? 1 : 0;
                const wildB = isWildCreature(b) ? 1 : 0;
                const hA = a.abilities['Remolque'] || a.abilities['Hauling'] || 0;
                const hB = b.abilities['Remolque'] || b.abilities['Hauling'] || 0;
                if (hB !== hA) return hB - hA;
                return wildB - wildA;
            });
        
        if (bestHaulers[0]) {
            let h = bestHaulers[0];
            if (manualSwaps[h.id]) {
                const swapTarget = db.find(c => c.id === manualSwaps[h.id]);
                if (swapTarget) h = swapTarget;
            }
            const hLvl = h.abilities['Remolque'] || h.abilities['Hauling'] || 1;
            const altHauler = findAlternativeCreature(h, 'Remolque', 'Hauling', 1, db, true);
            rawRecommendations.push({
                creature: h,
                alternative: altHauler,
                isWild: isWildCreature(h),
                count: 1,
                ability: 'Remolque',
                requiredLevel: 1,
                providedLevel: hLvl,
                where: 'Transporte continuo al Almacén',
                personalityBonus: false,
                haulingBonus: hLvl
            });
            totalAssigned += 1;
        }
    }

    // Agrupar inteligentemente por criatura para presentar una lista limpia y profesional
    const groupedMap = new Map();
    for (const r of rawRecommendations) {
        const key = r.creature.id || r.creature.name;
        if (!groupedMap.has(key)) {
            groupedMap.set(key, {
                creature: r.creature,
                alternative: r.alternative,
                isWild: r.isWild,
                totalCount: 0,
                roles: [],
                primaryAbility: r.ability,
                providedLevel: r.providedLevel
            });
        }
        const item = groupedMap.get(key);
        item.totalCount += r.count;
        item.roles.push({
            count: r.count,
            ability: r.ability,
            level: r.providedLevel,
            where: r.where,
            bonus: r.personalityBonus
        });
    }

    const consolidatedRecommendations = [...groupedMap.values()];

    const effectiveMax = maxSlots || 26;
    const freeSlots = Math.max(0, effectiveMax - totalAssigned);

    return {
        recommendations: consolidatedRecommendations,
        totalAssigned,
        maxSlots: effectiveMax,
        freeSlots,
        allowPrismana,
        onlyWild
    };
}

/**
 * Renderiza el widget interactivo del recomendador de Aniimo
 */
export function renderRecommenderUI(recommendationData, containerEl, onUpdateOptions) {
    if (!containerEl) return;
    const { recommendations, totalAssigned, maxSlots, freeSlots, allowPrismana = true, onlyWild = false } = recommendationData;

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
        const iconSrc = c.icon || `assets/aniimo/${c.id}.webp`;
        const fallbackSrc = `https://raw.githubusercontent.com/oscarlosu-lab/aniimax-es/main/web/assets/aniimo/${c.id}.webp`;
        
        const elementColor = ELEMENT_COLORS[c.element] || '#94a3b8';
        const elementBadge = `<span class="recommender-elem-badge" style="background:${elementColor}22; color:${elementColor}; border:1px solid ${elementColor}66">${c.element}</span>`;
        const nonWildBadge = !rec.isWild
            ? `<span class="recommender-obtain-badge non-wild" title="No aparece libre en la naturaleza; se consigue mediante evolución o crianza">⚠️ No salvaje (evolución)</span>`
            : `<span class="recommender-obtain-badge wild" title="Se puede capturar directamente en estado salvaje">🌿 Salvaje</span>`;

        // Mostrar únicamente las aptitudes en español sin duplicados
        const abilitiesBadges = DISPLAY_ABILITIES
            .filter(ab => (c.abilities[ab] || 0) > 0)
            .map(ab => {
                const lvl = c.abilities[ab];
                const isPrimary = ab === rec.primaryAbility || rec.roles.some(r => r.ability === ab);
                return `<span class="recommender-skill-pill${isPrimary ? ' active-target' : ''}">${ab} Lv.${lvl}</span>`;
            }).join('');

        // Tareas desglosadas con claridad
        const tasksHtml = rec.roles.map(role => {
            const countStr = role.count > 1 ? `<strong>×${role.count}</strong> en ` : '';
            return `<div class="recommender-subtask">• ${countStr}<span>${role.where}</span> <small class="hint">(${role.ability} Lv.${role.level})</small></div>`;
        }).join('');

        const habitatText = c.habitat ? `📍 <strong>Hábitat:</strong> ${c.habitat}` : '';

        // Bloque de Alternativa (para Aniimos no salvajes como Inferlupa o por si no lo tienes)
        let altHtml = '';
        if (rec.alternative) {
            const alt = rec.alternative;
            const altIconSrc = alt.icon || `assets/aniimo/${alt.id}.webp`;
            const altFallbackSrc = `https://raw.githubusercontent.com/oscarlosu-lab/aniimax-es/main/web/assets/aniimo/${alt.id}.webp`;
            const altLvl = alt.abilities[rec.primaryAbility] || alt.abilities[ABILITY_ES_NAME[rec.primaryAbility]] || 1;
            const altIsWild = isWildCreature(alt);
            altHtml = `
                <div class="recommender-alt-box">
                    <div class="recommender-alt-header">
                        <span class="recommender-alt-title">🔄 <strong>Alternativa si no tienes a ${c.name}:</strong></span>
                        <button type="button" class="recommender-swap-btn" data-from="${c.id}" data-to="${alt.id}" title="Reemplazar ${c.name} por ${alt.name} en el equipo">Usar ${alt.name}</button>
                    </div>
                    <div class="recommender-alt-content">
                        <img class="recommender-alt-avatar" src="${altIconSrc}" onerror="this.onerror=null;this.src='${altFallbackSrc}';" alt="${alt.name}" loading="lazy" />
                        <div class="recommender-alt-text">
                            <div class="recommender-alt-name-row">
                                <span class="recommender-alt-dex">${alt.dex}</span>
                                <strong class="recommender-alt-name">${alt.name}</strong>
                                ${altIsWild ? '<span class="recommender-alt-wild-tag">🌿 Salvaje fácil</span>' : ''}
                                <span class="recommender-skill-pill active-target small">${rec.primaryAbility} Lv.${altLvl}</span>
                            </div>
                            <div class="recommender-alt-habitat">📍 ${alt.habitat || 'Naturaleza abierta'}</div>
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="recommender-card${!rec.isWild ? ' card-non-wild' : ''}">
                <div class="recommender-card-left">
                    <div class="recommender-avatar-wrap">
                        <img class="recommender-avatar" src="${iconSrc}" onerror="this.onerror=null;this.src='${fallbackSrc}';" alt="${c.name}" loading="lazy" />
                        <span class="recommender-count-badge">×${rec.totalCount}</span>
                    </div>
                </div>
                <div class="recommender-card-info">
                    <div class="recommender-header-line">
                        <span class="recommender-dex">${c.dex}</span>
                        <strong class="recommender-name">${c.name}</strong>
                        ${elementBadge}
                        ${nonWildBadge}
                    </div>
                    <div class="recommender-task-line">
                        🎯 <strong>Labor asignada:</strong>
                        <div class="recommender-tasks-container">
                            ${tasksHtml}
                        </div>
                    </div>
                    <div class="recommender-skills-list">
                        ${abilitiesBadges}
                    </div>
                    ${habitatText ? `<div class="recommender-habitat-line">${habitatText}</div>` : ''}
                    ${altHtml}
                </div>
            </div>
        `;
    }).join('');

    const isOver = totalAssigned > maxSlots;
    const slotsClass = isOver ? 'over-capacity' : 'optimal-capacity';
    const statusNote = isOver
        ? `⚠️ Supera por ${totalAssigned - maxSlots} el cupo de Casa rodante (máx. ${maxSlots})`
        : `✔ Capacidad óptima (${freeSlots} slots libres para transporte o reservas)`;

    containerEl.innerHTML = `
        <div class="recommender-container">
            <div class="recommender-header-bar">
                <div class="recommender-title-block">
                    <h3 class="recommender-title">✨ Aniimos recomendados para este plan</h3>
                    <p class="recommender-subtitle">Criaturas óptimas del datamine oficial seleccionadas según las necesidades de producción, con opciones alternativas si no dispones de ellos.</p>
                </div>
                <div class="recommender-stats-badge ${slotsClass}">
                    <strong>${totalAssigned}</strong> / ${maxSlots} slots usados
                    <span class="recommender-free-slots">(${freeSlots} libres)</span>
                </div>
            </div>

            <div class="recommender-status-bar ${slotsClass}">
                ${statusNote}
            </div>

            <div class="recommender-toolbar">
                <label class="recommender-toggle-label">
                    <input type="checkbox" id="recommender-prismana-toggle" ${allowPrismana ? 'checked' : ''}>
                    <span>Formas de Prismana (máxima eficiencia Lv.4)</span>
                </label>
                <label class="recommender-toggle-label">
                    <input type="checkbox" id="recommender-only-wild-toggle" ${onlyWild ? 'checked' : ''}>
                    <span>🌿 Priorizar Aniimos salvajes (fáciles de capturar)</span>
                </label>
                <button type="button" class="button small" id="recommender-copy-btn">📋 Copiar lista completa</button>
            </div>

            <div class="recommender-grid">
                ${cardsHtml}
            </div>
        </div>
    `;

    // Eventos interactivos
    const prismanaToggle = containerEl.querySelector('#recommender-prismana-toggle');
    if (prismanaToggle && onUpdateOptions) {
        prismanaToggle.addEventListener('change', (e) => {
            onUpdateOptions({ type: 'toggle-prismana', value: e.target.checked });
        });
    }

    const wildToggle = containerEl.querySelector('#recommender-only-wild-toggle');
    if (wildToggle && onUpdateOptions) {
        wildToggle.addEventListener('change', (e) => {
            onUpdateOptions({ type: 'toggle-wild', value: e.target.checked });
        });
    }

    containerEl.querySelectorAll('.recommender-swap-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const fromId = parseInt(e.target.dataset.from, 10);
            const toId = parseInt(e.target.dataset.to, 10);
            if (fromId && toId && onUpdateOptions) {
                onUpdateOptions({ type: 'swap', from: fromId, to: toId });
            }
        });
    });

    const copyBtn = containerEl.querySelector('#recommender-copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const lines = [];
            lines.push(`📋 EQUIPO RECOMENDADO DE ANIIMO (${totalAssigned}/${maxSlots} slots):`);
            recommendations.forEach(r => {
                const tasks = r.roles.map(rl => `${rl.where} (${rl.ability} Lv.${rl.level})`).join(', ');
                const wildMark = r.isWild ? '[Salvaje]' : '[Evolución]';
                lines.push(`• ${r.creature.name} (${r.creature.dex}) ${wildMark} ×${r.totalCount} -> ${tasks}`);
            });
            const textToCopy = lines.join('\n');
            navigator.clipboard.writeText(textToCopy).then(() => {
                copyBtn.textContent = '✓ ¡Lista copiada!';
                setTimeout(() => { copyBtn.textContent = '📋 Copiar lista completa'; }, 2000);
            });
        });
    }
}
