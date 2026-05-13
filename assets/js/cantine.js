/**
 * Cantine Menu Logic
 * Loads menu from CSV and displays the current week's meals.
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Configuration
    // Configuration
    const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQcCUH9nb_MQuxaPOsXVS65dhj4RhjSDgsIJCGbWitnBp7EdXmjDe_9WdqDQ2Fo074-q9mS08hf7Muo/pub?gid=0&single=true&output=csv';

    const container = document.getElementById('cantine-content');
    const weekTitle = document.getElementById('cantine-week-title');

    if (!container) return;

    // Show Loading
    container.innerHTML = '<div class="text-center p-4"><div class="spinner-border text-primary" role="status"></div><p class="mt-2 small text-muted">Chargement du menu...</p></div>';

    // 1. Fetch Data
    let allMeals;
    try {
        allMeals = await CsvLoader.fetchCsv(CSV_URL);
    } catch (error) {
        console.error('Error loading cantine:', error);
        container.innerHTML = '<div class="alert alert-warning border-0 text-center"><p class="mb-0 fw-bold">Menu indisponible actuellement.</p></div>';
        const homeList = document.getElementById('cantine-home-list');
        if (homeList) homeList.innerHTML = '<p class="small mb-0 opacity-75">Le menu n\'est pas disponible.</p>';
        const homeDate = document.getElementById('cantine-home-date');
        if (homeDate) homeDate.textContent = 'Indisponible';
        return;
    }

    // 2. Filter for Current Week using the "Date" column
    const today = new Date();
    // Reset time to avoid mismatch
    today.setHours(0, 0, 0, 0);

    // Determine "Effective Date" for display
    let effectiveDate = new Date(today);
    const dayOfWeek = today.getDay(); // 0-6

    if (dayOfWeek === 6) { // Saturday
        effectiveDate.setDate(today.getDate() + 2); // Jump to Monday
    } else if (dayOfWeek === 0) { // Sunday
        effectiveDate.setDate(today.getDate() + 1); // Jump to Monday
    }

    // Find Monday of the "Effective Week"
    const eDay = effectiveDate.getDay();
    const diff = effectiveDate.getDate() - eDay + (eDay === 0 ? -6 : 1);
    let monday = new Date(effectiveDate.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    let friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    // Helper to get Date from meal object (robust fallback)
    const getMealDate = (meal) => {
        if (meal.Date) return CsvLoader.parseDate(meal.Date);
        const keys = Object.keys(meal);
        if (keys.length > 0) return CsvLoader.parseDate(meal[keys[0]]);
        return null;
    };

    // French Holiday Calculation
    function getEasterSunday(year) {
        const f = Math.floor, G = year % 19, C = f(year / 100),
            H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30,
            I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11)),
            J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7,
            L = I - J, month = 3 + f((L + 40) / 44), day = L + 28 - 31 * f(month / 4);
        return new Date(year, month - 1, day);
    }

    function isHoliday(meal, dateObj) {
        // Check if secretary explicitly wrote "férié" or "ferie"
        const text = ((meal.Entree || '') + ' ' + (meal.Plat || '')).toLowerCase();
        if (text.includes('férié') || text.includes('ferie')) return true;

        if (!dateObj) return false;
        const d = dateObj.getDate(), m = dateObj.getMonth() + 1, y = dateObj.getFullYear();

        // Fixed holidays
        if ((d===1 && m===1) || (d===1 && m===5) || (d===8 && m===5) || 
            (d===14 && m===7) || (d===15 && m===8) || (d===1 && m===11) || 
            (d===11 && m===11) || (d===25 && m===12)) return true;

        // Dynamic holidays (Easter Monday, Ascension, Pentecost)
        const easter = getEasterSunday(y);
        
        const easterMonday = new Date(easter); easterMonday.setDate(easter.getDate() + 1);
        if (d === easterMonday.getDate() && m === easterMonday.getMonth() + 1) return true;

        const ascension = new Date(easter); ascension.setDate(easter.getDate() + 39);
        if (d === ascension.getDate() && m === ascension.getMonth() + 1) return true;

        const pentecote = new Date(easter); pentecote.setDate(easter.getDate() + 50);
        if (d === pentecote.getDate() && m === pentecote.getMonth() + 1) return true;

        return false;
    }

    // Helper: get meals for a given Monday-Friday range
    function getMealsForWeek(mon, fri) {
        return allMeals.filter(meal => {
            const mealDate = getMealDate(meal);
            if (!mealDate) return false;
            return mealDate >= mon && mealDate <= fri;
        });
    }

    // Filter meals falling between Monday and Friday (inclusive)
    let currentWeekMeals = getMealsForWeek(monday, friday);

    // If current week has no meals, find the next week that does
    if (currentWeekMeals.length === 0) {
        const futureMeals = allMeals.filter(meal => getMealDate(meal) >= monday);
        if (futureMeals.length > 0) {
            futureMeals.sort((a, b) => getMealDate(a) - getMealDate(b));
            const nextMealDate = new Date(getMealDate(futureMeals[0]));
            
            const nmDay = nextMealDate.getDay();
            const nmDiff = nextMealDate.getDate() - nmDay + (nmDay === 0 ? -6 : 1);
            monday = new Date(nextMealDate);
            monday.setDate(nmDiff);
            monday.setHours(0, 0, 0, 0);
            
            friday = new Date(monday);
            friday.setDate(monday.getDate() + 4);
            
            currentWeekMeals = getMealsForWeek(monday, friday);
        }
    }

    // Also check for next week's meals
    const nextMonday = new Date(monday);
    nextMonday.setDate(monday.getDate() + 7);
    const nextFriday = new Date(nextMonday);
    nextFriday.setDate(nextMonday.getDate() + 4);
    const nextWeekMeals = getMealsForWeek(nextMonday, nextFriday);

    // Update Title now that Monday/Friday are final
    if (weekTitle) {
        const options = { day: 'numeric', month: 'long' };
        if (nextWeekMeals.length > 0) {
            weekTitle.textContent = `Semaines du ${monday.toLocaleDateString('fr-FR', options)} au ${nextFriday.toLocaleDateString('fr-FR', options)}`;
        } else {
            weekTitle.textContent = `Semaine du ${monday.toLocaleDateString('fr-FR', options)} au ${friday.toLocaleDateString('fr-FR', options)}`;
        }
    }

    // Helper: render a list of meals into a container
    function renderMeals(meals, targetEl) {
        meals.forEach(meal => {
            const dateObj = getMealDate(meal);
            const dayName = dateObj.toLocaleDateString('fr-FR', { weekday: 'long' });
            
            if (isHoliday(meal, dateObj)) {
                targetEl.insertAdjacentHTML('beforeend', `
                    <div class="mb-4 fade-in-up">
                        <span class="badge bg-royal-light text-primary mb-2 text-capitalize">${dayName}</span>
                        <div class="alert alert-light border-0 py-2 mt-1">
                            <i class="bi bi-calendar2-x me-2 text-muted"></i><span class="text-muted fst-italic">Jour férié (pas de cantine)</span>
                        </div>
                    </div>
                `);
            } else {
                targetEl.insertAdjacentHTML('beforeend', `
                    <div class="mb-4 fade-in-up">
                        <span class="badge bg-royal-light text-primary mb-2 text-capitalize">${dayName}</span>
                        <ul class="list-unstyled small ps-2">
                            <li class="mb-1"><strong class="text-dark">Entrée :</strong> ${meal.Entree || '-'}</li>
                            <li class="mb-1"><strong class="text-dark">Plat :</strong> ${meal.Plat || '-'} <span class="text-muted fst-italic">(${meal.Accompagnement || ''})</span></li>
                            <li><strong class="text-dark">Dessert :</strong> ${meal.Dessert || '-'}</li>
                        </ul>
                    </div>
                `);
            }
        });
    }

    // 3. Render
    container.innerHTML = '';

    if (currentWeekMeals.length === 0) {
        container.innerHTML = `
            <div class="alert alert-warning border-0 text-center">
                <i class="bi bi-calendar-x display-4 text-warning mb-2"></i>
                <p class="mb-0 fw-bold">Aucun menu renseigné à venir.</p>
            </div>`;
    } else {
        // Current week header
        const optW = { day: 'numeric', month: 'long' };
        container.insertAdjacentHTML('beforeend', `
            <h6 class="fw-bold text-royal mb-3"><i class="bi bi-calendar-week me-2"></i>Semaine du ${monday.toLocaleDateString('fr-FR', optW)} au ${friday.toLocaleDateString('fr-FR', optW)}</h6>
        `);
        renderMeals(currentWeekMeals, container);

        // Next week (if available)
        if (nextWeekMeals.length > 0) {
            container.insertAdjacentHTML('beforeend', `
                <hr class="my-4">
                <h6 class="fw-bold text-royal mb-3"><i class="bi bi-calendar-week me-2"></i>Semaine du ${nextMonday.toLocaleDateString('fr-FR', optW)} au ${nextFriday.toLocaleDateString('fr-FR', optW)}</h6>
            `);
            renderMeals(nextWeekMeals, container);
        }
    }

    // --- Dynamic Home Widget Logic ---
    const homeWidgetDate = document.getElementById('cantine-home-date');
    const homeWidgetList = document.getElementById('cantine-home-list');

    if (homeWidgetDate && homeWidgetList) {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        let targetMeal = null;
        let targetDateObj = null;

        // Sort all meals to find the next valid one chronologically
        const sortedMeals = [...allMeals].sort((a, b) => getMealDate(a) - getMealDate(b));

        for (const m of sortedMeals) {
            const d = getMealDate(m);
            if (!d || d < now) continue;

            // If we are looking at TODAY, and it's already past 14:00 (2 PM), 
            // skip to the next day's menu.
            if (d.getTime() === now.getTime() && new Date().getHours() >= 14) continue;

            // Skip holidays
            if (isHoliday(m, d)) continue;

            // Skip days with no actual food (just empty rows)
            if (!m.Entree && !m.Plat) continue;

            targetMeal = m;
            targetDateObj = d;
            break;
        }

        if (targetMeal && targetDateObj) {
            const dayName = targetDateObj.toLocaleDateString('fr-FR', { weekday: 'long' });
            
            let prefix = "Au menu";
            let suffix = "";
            const isToday = targetDateObj.getTime() === now.getTime();
            
            const tomorrow = new Date(now);
            tomorrow.setDate(now.getDate() + 1);
            const isTomorrow = targetDateObj.getTime() === tomorrow.getTime();

            if (isToday) {
                prefix = "Au menu ce";
                suffix = " (Aujourd'hui)";
            } else if (isTomorrow) {
                prefix = "Au menu ce";
                suffix = " (Demain)";
            } else {
                prefix = "Au menu";
                suffix = " prochain";
            }

            homeWidgetDate.textContent = `${prefix} ${dayName}${suffix} :`;

            homeWidgetList.innerHTML = `
                <ul class="list-unstyled mt-2 mb-0 small fw-bold">
                    <li><i class="bi bi-circle-fill small me-2" style="font-size: 6px;"></i>Entrée : ${targetMeal.Entree || '-'}</li>
                    <li><i class="bi bi-circle-fill small me-2" style="font-size: 6px;"></i>Plat : ${targetMeal.Plat || '-'}</li>
                    <li><i class="bi bi-circle-fill small me-2" style="font-size: 6px;"></i>Accompagnement : ${targetMeal.Accompagnement || '-'}</li>
                    <li><i class="bi bi-circle-fill small me-2" style="font-size: 6px;"></i>Dessert : ${targetMeal.Dessert || '-'}</li>
                </ul>
            `;
        } else {
            homeWidgetList.innerHTML = '<p class="small mb-0 opacity-75">Le menu pour les prochains jours n\'est pas encore disponible.<br>Cliquez ci-dessous pour voir la semaine</p>';
            homeWidgetDate.textContent = "Prochainement...";
        }
    }
});
