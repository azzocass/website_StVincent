/**
 * Dynamic Agenda Loader
 * Loads agenda events from CSV and displays future events
 */
document.addEventListener('DOMContentLoaded', async () => {
    const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQcCUH9nb_MQuxaPOsXVS65dhj4RhjSDgsIJCGbWitnBp7EdXmjDe_9WdqDQ2Fo074-q9mS08hf7Muo/pub?gid=1588801524&single=true&output=csv';

    const agendaPreview = document.getElementById('agenda-preview');
    const agendaOffcanvas = document.getElementById('agenda-offcanvas-body');

    if (!agendaPreview && !agendaOffcanvas) return;

    try {
        const events = await CsvLoader.fetchCsv(CSV_URL);

        // Filter future events only
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const futureEvents = events.filter(event => {
            const eventDate = parseEventDate(event.Date);
            return eventDate >= today;
        }).sort((a, b) => {
            return parseEventDate(a.Date) - parseEventDate(b.Date);
        });

        // Render preview (next 3 events)
        if (agendaPreview) {
            renderAgendaPreview(futureEvents.slice(0, 4));
        }

        // Render full agenda in offcanvas
        if (agendaOffcanvas) {
            renderAgendaOffcanvas(futureEvents);
        }

    } catch (error) {
        console.error('Error loading agenda:', error);
        if (agendaPreview) agendaPreview.innerHTML = '<div class="alert text-center text-muted border-0">Aucun événement ou erreur de chargement.</div>';
        if (agendaOffcanvas) agendaOffcanvas.innerHTML = '<div class="alert text-center text-muted border-0">Erreur de chargement de l\'agenda.</div>';
    }

    function parseEventDate(dateStr) {
        if (!dateStr) return new Date(0);
        const parts = dateStr.split('/');
        if (parts.length !== 3) return new Date(0);
        return new Date(parts[2], parts[1] - 1, parts[0]);
    }

    function renderAgendaPreview(events) {
        let html = '<div class="list-group shadow-sm rounded-4 overflow-hidden mb-4">';

        if (events.length === 0) {
            html += '<div class="list-group-item p-3 text-center text-muted">Aucun événement à venir</div>';
        } else {
            const colors = ['primary', 'secondary', 'accent', 'success'];
            events.forEach((event, index) => {
                const date = parseEventDate(event.Date);
                const month = date.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase();
                const day = date.getDate();
                const colorClass = colors[index % colors.length];

                html += `
            <div class="list-group-item py-2 px-3 border-0 ${index < events.length - 1 ? 'border-bottom' : ''}">
                
                <div class="d-flex align-items-center">
                    
                    <div class="date-box ${colorClass} text-center py-1 px-2 me-3 shadow-sm rounded-3" style="min-width: 55px;">
                        <span class="d-block fw-bold fs-5 m-0 lh-1">${day}</span>
                        <span class="d-block text-uppercase" style="font-size: 0.75rem; font-weight: 700;">${month}</span>
                    </div>
                    
                    <div class="flex-grow-1">
                <h6 class="fw-bold mb-1 text-royal" style="font-size: 0.95rem;">${event.Titre}</h6>
                        <p class="small text-muted mb-0 text-truncate" style="max-width: 220px;">${event.Description}</p>
                    </div>
                </div>
            </div>
        `;
            });
        }

        html += '</div>';
        agendaPreview.innerHTML = html;
    }

    function renderAgendaOffcanvas(events) {
        if (events.length === 0) {
            agendaOffcanvas.innerHTML = '<div class="alert alert-info">Aucun événement à venir pour le moment.</div>';
            return;
        }

        let html = '';

        // Group by month
        const byMonth = {};
        events.forEach(event => {
            const date = parseEventDate(event.Date);
            const monthKey = date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
            if (!byMonth[monthKey]) byMonth[monthKey] = [];
            byMonth[monthKey].push(event);
        });

        // Render each month
        const colors = ['primary', 'secondary', 'accent', 'success'];
        let colorIndex = 0;

        Object.keys(byMonth).forEach(month => {
            html += `
                <h6 class="fw-bold text-primary mb-3 mt-4 text-capitalize">${month}</h6>
                <div class="list-group shadow-sm rounded-4 overflow-hidden mb-4">
            `;

            byMonth[month].forEach((event, index) => {
                const date = parseEventDate(event.Date);
                const day = date.getDate();
                const monthShort = date.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase();
                const colorClass = colors[colorIndex % colors.length];
                colorIndex++;

                html += `
                    <div class="list-group-item p-3 border-0 ${index < byMonth[month].length - 1 ? 'border-bottom' : ''}">
                        <div class="d-flex align-items-start">
                            <div class="date-box ${colorClass} text-center p-2 me-3 shadow-sm" style="min-width: 60px;">
                                <span class="d-block fw-bold h5 m-0">${day}</span>
                                <span class="d-block small text-uppercase">${monthShort}</span>
                            </div>
                            <div class="flex-grow-1">
                                <h6 class="fw-bold mb-1">${event.Titre}</h6>
                                <p class="small text-muted mb-0">${event.Description}</p>
                            </div>
                        </div>
                    </div>
                `;
            });

            html += '</div>';
        });

        agendaOffcanvas.innerHTML = html;
    }
});
