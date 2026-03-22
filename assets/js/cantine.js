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
    const allMeals = await CsvLoader.fetchCsv(CSV_URL);

    // 2. Filter for Current Week using the "Date" column
    const today = new Date();
    // Reset time to avoid mismatch
    today.setHours(0, 0, 0, 0);

    // Determine "Effective Date" for display
    // If it's Saturday (6) or Sunday (0), we want to show the NEXT week.
    let effectiveDate = new Date(today);
    const dayOfWeek = today.getDay(); // 0-6

    if (dayOfWeek === 6) { // Saturday
        effectiveDate.setDate(today.getDate() + 2); // Jump to Monday
    } else if (dayOfWeek === 0) { // Sunday
        effectiveDate.setDate(today.getDate() + 1); // Jump to Monday
    }

    // Find Monday of the "Effective Week"
    const eDay = effectiveDate.getDay();
    // eDay should be 1 (Monday) if we just jumped, but rely on standard math:
    const diff = effectiveDate.getDate() - eDay + (eDay === 0 ? -6 : 1);
    const monday = new Date(effectiveDate.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    // Friday
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    // Update Title
    if (weekTitle) {
        const options = { day: 'numeric', month: 'long' };
        weekTitle.textContent = `Semaine du ${monday.toLocaleDateString('fr-FR', options)} au ${friday.toLocaleDateString('fr-FR', options)}`;
    }

    // Helper to get Date from meal object (robust fallback)
    const getMealDate = (meal) => {
        // Try exact key "Date"
        if (meal.Date) return CsvLoader.parseDate(meal.Date);
        // Fallback: Try the first key in the object (usually the Date column, even if header is messy)
        const keys = Object.keys(meal);
        if (keys.length > 0) return CsvLoader.parseDate(meal[keys[0]]);
        return null;
    };

    // Filter meals falling between Monday and Friday (inclusive)
    const currentWeekMeals = allMeals.filter(meal => {
        const mealDate = getMealDate(meal);
        if (!mealDate) return false;
        return mealDate >= monday && mealDate <= friday;
    });

    // 3. Render
    container.innerHTML = '';

    if (currentWeekMeals.length === 0) {
        container.innerHTML = `
            <div class="alert alert-warning border-0 text-center">
                <i class="bi bi-calendar-x display-4 text-warning mb-2"></i>
                <p class="mb-0 fw-bold">Aucun menu renseigné pour cette semaine.</p>
            </div>`;
        return;
    }

    currentWeekMeals.forEach(meal => {
        // Parse date for display
        const dateObj = getMealDate(meal);
        const dayName = dateObj.toLocaleDateString('fr-FR', { weekday: 'long' });

        const html = `
            <div class="mb-4 fade-in-up">
                <span class="badge bg-royal-light text-primary mb-2 text-capitalize">${dayName}</span>
                <ul class="list-unstyled small ps-2">
                    <li class="mb-1"><strong class="text-dark">Entrée :</strong> ${meal.Entree || '-'}</li>
                    <li class="mb-1"><strong class="text-dark">Plat :</strong> ${meal.Plat || '-'} <span class="text-muted fst-italic">(${meal.Accompagnement || ''})</span></li>
                    <li><strong class="text-dark">Dessert :</strong> ${meal.Dessert || '-'}</li>
                </ul>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });

    // --- Dynamic Home Widget Logic ---
    const homeWidgetDate = document.getElementById('cantine-home-date');
    const homeWidgetList = document.getElementById('cantine-home-list');

    if (homeWidgetDate && homeWidgetList) {
        const now = new Date();
        const currentDay = now.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

        // Calculate Target Date based on rules
        let targetDate = new Date(now);
        let prefix = "Au menu ce";
        let suffix = "";

        if (currentDay === 3) {
            // Wednesday -> Show Thursday
            targetDate.setDate(now.getDate() + 1);
            prefix = "Au menu";
            suffix = " prochain";
        } else if (currentDay === 6) {
            // Saturday -> Show Monday
            targetDate.setDate(now.getDate() + 2);
            prefix = "Au menu";
            suffix = " prochain";
        } else if (currentDay === 0) {
            // Sunday -> Show Monday
            targetDate.setDate(now.getDate() + 1);
            prefix = "Au menu";
            suffix = " prochain";
        }

        // Reset time for comparison
        targetDate.setHours(0, 0, 0, 0);

        // Find meal matching targetDate
        let targetMeal = allMeals.find(m => {
            const d = getMealDate(m);
            return d && d.getDate() === targetDate.getDate() && d.getMonth() === targetDate.getMonth();
        });

        // Fallback: If target meal not found (e.g. next week Monday not in current CSV), 
        // try to show *any* meal from the list to avoid empty box? 
        // User logic implies we SHOULD show the specific day. 
        // If data is missing, we show "Menu non disponible".

        if (targetMeal) {
            const dateObj = getMealDate(targetMeal);
            const dayName = dateObj.toLocaleDateString('fr-FR', { weekday: 'long' });

            // Construct Label
            // If it's a standard day: "Au menu ce Vendredi"
            // If it's Wed/Sat/Sun: "Au menu Jeudi prochain" / "Au menu Lundi prochain"
            homeWidgetDate.textContent = `${prefix} ${dayName}${suffix} :`;

            // Update List
            homeWidgetList.innerHTML = `
                <ul class="list-unstyled mt-2 mb-0 small fw-bold">
                    <li><i class="bi bi-circle-fill small me-2" style="font-size: 6px;"></i>Entrée : ${targetMeal.Entree || '-'}</li>
                    <li><i class="bi bi-circle-fill small me-2" style="font-size: 6px;"></i>Plat : ${targetMeal.Plat || '-'}</li>
                    <li><i class="bi bi-circle-fill small me-2" style="font-size: 6px;"></i>Accompagnement : ${targetMeal.Accompagnement || '-'}</li>
                    <li><i class="bi bi-circle-fill small me-2" style="font-size: 6px;"></i>Dessert : ${targetMeal.Dessert || '-'}</li>
                </ul>
            `;
        } else {
            // Friendly fallback if the "Next Monday" is not in the loaded CSV (which is likely if CSV is only current week)
            // We can just say "Menu de la semaine prochaine" and link to full menu.
            homeWidgetList.innerHTML = '<p class="small mb-0 opacity-75">Le menu pour ce jour n\'est pas encore affiché.<br>Cliquez ci-dessous pour voir la semaine</p>';
            homeWidgetDate.textContent = "Prochainement...";
        }
    }
});
