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

    // Find Monday of current week
    const day = today.getDay(); // 0 (Sun) to 6 (Sat)
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(today.setDate(diff));
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
                <p class="mb-0 fw-bold">Aucun menu trouvé pour cette semaine.</p>
                <p class="small">Veuillez vérifier que les dates dans le fichier Excel sont correctes (JJ/MM/AAAA).</p>
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
                <ul class="list-unstyled small">
                    <li class="mb-1"><strong class="text-secondary">Entrée :</strong> ${meal.Entree || '-'}</li>
                    <li class="mb-1"><strong class="text-primary">Plat :</strong> ${meal.Plat || '-'} <span class="text-muted fst-italic">(${meal.Accompagnement || ''})</span></li>
                    <li><strong class="text-success">Dessert :</strong> ${meal.Dessert || '-'}</li>
                </ul>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });
});
