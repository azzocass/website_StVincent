/**
 * Agenda Logic
 * Loads agenda events from CSV and displays them.
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Configuration
    // For now, pointing to local dummy CSV. User will replace with Google Sheet URL.
    const CSV_URL = 'assets/csv_templates/modele_agenda.csv';

    const container = document.getElementById('agenda-container');
    const fullContainer = document.getElementById('agenda-full-container');

    if (!container) return;

    // 1. Fetch Data
    const allEvents = await CsvLoader.fetchCsv(CSV_URL);

    // Sort by Date (Ascending)
    allEvents.sort((a, b) => {
        const dateA = CsvLoader.parseDate(a.Date);
        const dateB = CsvLoader.parseDate(b.Date);
        return dateA - dateB;
    });

    // Filter Future Events (optional, but good practice)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureEvents = allEvents.filter(event => {
        const d = CsvLoader.parseDate(event.Date);
        return d && d >= today;
    });

    // Take top 3 for the homepage widget
    const upcomingEvents = futureEvents.slice(0, 3);

    // Helper to get color class based on type or just cycle through
    const getTypeColor = (type, index) => {
        const colors = ['primary', 'secondary', 'accent'];
        if (type) {
            type = type.toLowerCase();
            if (type.includes('reunion') || type.includes('ogec')) return 'primary';
            if (type.includes('travaux')) return 'secondary';
            if (type.includes('fete') || type.includes('kermesse')) return 'accent';
        }
        return colors[index % 3];
    };

    // 2. Render Widget
    container.innerHTML = '';
    if (upcomingEvents.length === 0) {
        container.innerHTML = `
            <div class="p-4 text-center">
                <i class="bi bi-calendar-check text-muted display-4 mb-2"></i>
                <p class="text-muted mb-0">Aucun événement à venir.</p>
            </div>`;
    } else {
        upcomingEvents.forEach((event, index) => {
            const dateObj = CsvLoader.parseDate(event.Date);
            const day = dateObj.getDate();
            const month = dateObj.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
            const colorClass = getTypeColor(event.Type, index);

            const isLast = index === upcomingEvents.length - 1;
            const borderClass = isLast ? '' : 'border-bottom';

            const html = `
                <div class="list-group-item p-4 d-flex align-items-center border-0 ${borderClass} fade-in-up" style="animation-delay: ${index * 100}ms">
                    <div class="date-box ${colorClass} text-center p-2 me-4 shadow-sm" style="min-width: 70px;">
                        <span class="d-block fw-bold h4 m-0">${day}</span>
                        <span class="d-block small text-uppercase">${month}</span>
                    </div>
                    <div class="flex-grow-1">
                        <h5 class="fw-bold mb-1">${event.Titre}</h5>
                        <p class="mb-0 text-muted small">${event.Description || ''}</p>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', html);
        });
    }

    // 3. Render Full List (Offcanvas)
    if (fullContainer) {
        fullContainer.innerHTML = '';
        if (futureEvents.length === 0) {
            fullContainer.innerHTML = '<div class="p-4 text-center text-muted">Aucun événement.</div>';
        } else {
            futureEvents.forEach((event, index) => {
                const dateObj = CsvLoader.parseDate(event.Date);
                const dateStr = dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
                const month = dateObj.toLocaleDateString('fr-FR', { month: 'long' });
                const type = event.Type || 'Autre';

                // Simple color logic
                let colorText = 'text-primary';
                if (index % 3 === 1) colorText = 'text-secondary';
                if (index % 3 === 2) colorText = 'text-danger'; // using danger as accent proxy

                const isLast = index === futureEvents.length - 1;
                const borderClass = isLast ? '' : 'border-bottom';

                const html = `
                    <div class="list-group-item p-3 border-0 ${borderClass}">
                        <div class="d-flex justify-content-between align-items-center">
                             <small class="${colorText} fw-bold text-uppercase">${month}</small>
                             <small class="text-muted">${dateStr}</small>
                        </div>
                        <h6 class="fw-bold mt-1 mb-0">${event.Titre}</h6>
                        <small class="text-muted">${event.Description || ''}</small>
                    </div>
                `;
                fullContainer.insertAdjacentHTML('beforeend', html);
            });
        }
    }
});
