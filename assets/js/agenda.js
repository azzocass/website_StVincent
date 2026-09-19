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

    // Expose events in memory for iCal generation
    let cachedFutureEvents = [];

    function parseEventTime(timeStr) {
        if (!timeStr || typeof timeStr !== 'string') return null;
        const matches = [...timeStr.matchAll(/(\d{1,2})\s*(?:[hH:]\s*(\d{2})?)?/g)].filter(m => m[1] !== undefined);
        if (matches.length === 0) return null;

        const h1 = parseInt(matches[0][1], 10);
        const m1 = matches[0][2] ? parseInt(matches[0][2], 10) : 0;
        if (isNaN(h1) || h1 < 0 || h1 > 23) return null;

        let h2, m2;
        if (matches.length >= 2) {
            h2 = parseInt(matches[1][1], 10);
            m2 = matches[1][2] ? parseInt(matches[1][2], 10) : 0;
        } else {
            // Default duration 1 hour
            h2 = (h1 + 1) % 24;
            m2 = m1;
        }

        return {
            start: { h: h1, m: m1 },
            end: { h: h2, m: m2 }
        };
    }

    function getGoogleCalendarUrl(event) {
        const d = parseEventDate(event.Date);
        if (!d || isNaN(d.getTime())) return '#';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const datePrefix = `${year}${month}${day}`;

        const timeInfo = parseEventTime(event.Heure || event.Horaire);
        let datesParam = '';

        if (timeInfo) {
            const sh = String(timeInfo.start.h).padStart(2, '0');
            const sm = String(timeInfo.start.m).padStart(2, '0');
            const eh = String(timeInfo.end.h).padStart(2, '0');
            const em = String(timeInfo.end.m).padStart(2, '0');
            datesParam = `${datePrefix}T${sh}${sm}00/${datePrefix}T${eh}${em}00`;
        } else {
            const nextDay = new Date(d);
            nextDay.setDate(nextDay.getDate() + 1);
            const endStr = `${nextDay.getFullYear()}${String(nextDay.getMonth() + 1).padStart(2, '0')}${String(nextDay.getDate()).padStart(2, '0')}`;
            datesParam = `${datePrefix}/${endStr}`;
        }

        const locationStr = (event.Lieu || event.Lieux || '').trim() || 'École Saint Vincent, Sainte-Luce-sur-Loire';

        const params = new URLSearchParams({
            action: 'TEMPLATE',
            text: `École St Vincent : ${event.Titre || 'Événement'}`,
            dates: datesParam,
            details: event.Description || '',
            location: locationStr
        });
        return `https://calendar.google.com/calendar/render?${params.toString()}`;
    }

    function downloadIcs(title, description, dateStr, heureStr, lieuStr) {
        const d = parseEventDate(dateStr);
        if (!d || isNaN(d.getTime())) return;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const datePrefix = `${year}${month}${day}`;

        const timeInfo = parseEventTime(heureStr);
        let dtStart = '';
        let dtEnd = '';

        if (timeInfo) {
            const sh = String(timeInfo.start.h).padStart(2, '0');
            const sm = String(timeInfo.start.m).padStart(2, '0');
            const eh = String(timeInfo.end.h).padStart(2, '0');
            const em = String(timeInfo.end.m).padStart(2, '0');
            dtStart = `DTSTART:${datePrefix}T${sh}${sm}00`;
            dtEnd = `DTEND:${datePrefix}T${eh}${em}00`;
        } else {
            const nextDay = new Date(d);
            nextDay.setDate(nextDay.getDate() + 1);
            const endStr = `${nextDay.getFullYear()}${String(nextDay.getMonth() + 1).padStart(2, '0')}${String(nextDay.getDate()).padStart(2, '0')}`;
            dtStart = `DTSTART;VALUE=DATE:${datePrefix}`;
            dtEnd = `DTEND;VALUE=DATE:${endStr}`;
        }

        const location = (lieuStr || '').trim() || 'École Saint Vincent, Sainte-Luce-sur-Loire';
        const uid = `event-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@ecolesaintvincent.fr`;

        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Ecole Saint Vincent//FR',
            'CALSCALE:GREGORIAN',
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `SUMMARY:École St Vincent : ${(title || 'Événement').replace(/\n/g, ' ')}`,
            `DESCRIPTION:${(description || '').replace(/\n/g, '\\n')}`,
            `LOCATION:${location.replace(/,/g, '\\,')}`,
            dtStart,
            dtEnd,
            'STATUS:CONFIRMED',
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${(title || 'evenement').toLowerCase().replace(/[^a-z0-9]/gi, '_')}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }

    // Global listener for iCal buttons
    document.addEventListener('click', (e) => {
        const icsBtn = e.target.closest('.btn-download-ics');
        if (icsBtn) {
            e.preventDefault();
            const title = decodeURIComponent(icsBtn.getAttribute('data-title') || '');
            const desc = decodeURIComponent(icsBtn.getAttribute('data-desc') || '');
            const date = icsBtn.getAttribute('data-date') || '';
            const heure = decodeURIComponent(icsBtn.getAttribute('data-heure') || '');
            const lieu = decodeURIComponent(icsBtn.getAttribute('data-lieu') || '');
            downloadIcs(title, desc, date, heure, lieu);
        }
    });

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
                const gcalUrl = getGoogleCalendarUrl(event);
                const safeTitle = encodeURIComponent(event.Titre || '');
                const safeDesc = encodeURIComponent(event.Description || '');
                const heureVal = (event.Heure || event.Horaire || '').trim();
                const lieuVal = (event.Lieu || event.Lieux || '').trim();
                const safeHeure = encodeURIComponent(heureVal);
                const safeLieu = encodeURIComponent(lieuVal);

                html += `
            <div class="list-group-item py-2 px-3 border-0 ${index < events.length - 1 ? 'border-bottom' : ''}">
                <div class="d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center flex-grow-1 overflow-hidden me-2">
                        <div class="date-box ${colorClass} text-center py-1 px-2 me-3 shadow-sm rounded-3 flex-shrink-0" style="min-width: 55px;">
                            <span class="d-block fw-bold fs-5 m-0 lh-1">${day}</span>
                            <span class="d-block text-uppercase" style="font-size: 0.75rem; font-weight: 700;">${month}</span>
                        </div>
                        <div class="overflow-hidden">
                            <h6 class="fw-bold mb-1 text-royal text-truncate" style="font-size: 0.95rem;">${event.Titre}</h6>
                            <p class="small text-muted mb-1 text-truncate">${event.Description || ''}</p>
                            ${(heureVal || lieuVal) ? `
                                <div class="d-flex flex-wrap gap-1 mt-1">
                                    ${heureVal ? `<span class="badge bg-light text-royal border px-2 py-0" style="font-size:0.72rem;"><i class="bi bi-clock me-1 text-primary"></i>${heureVal}</span>` : ''}
                                    ${lieuVal ? `<span class="badge bg-light text-royal border px-2 py-0" style="font-size:0.72rem;"><i class="bi bi-geo-alt me-1 text-danger"></i>${lieuVal}</span>` : ''}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <!-- Bouton Ajouter à l'agenda -->
                    <div class="dropdown flex-shrink-0">
                        <button class="btn btn-sm btn-light border rounded-pill px-2 py-1 text-muted" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="Ajouter à mon agenda">
                            <i class="bi bi-calendar-plus text-primary"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0 py-1" style="font-size: 0.85rem;">
                            <li><a class="dropdown-item py-1" href="${gcalUrl}" target="_blank" rel="noopener"><i class="bi bi-google me-2 text-danger"></i>Google Calendar</a></li>
                            <li><button type="button" class="dropdown-item py-1 btn-download-ics" data-title="${safeTitle}" data-desc="${safeDesc}" data-date="${event.Date}" data-heure="${safeHeure}" data-lieu="${safeLieu}"><i class="bi bi-apple me-2 text-dark"></i>Apple / iCal (.ics)</button></li>
                        </ul>
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
                const gcalUrl = getGoogleCalendarUrl(event);
                const safeTitle = encodeURIComponent(event.Titre || '');
                const safeDesc = encodeURIComponent(event.Description || '');
                const heureVal = (event.Heure || event.Horaire || '').trim();
                const lieuVal = (event.Lieu || event.Lieux || '').trim();
                const safeHeure = encodeURIComponent(heureVal);
                const safeLieu = encodeURIComponent(lieuVal);

                html += `
                    <div class="list-group-item p-3 border-0 ${index < byMonth[month].length - 1 ? 'border-bottom' : ''}">
                        <div class="d-flex align-items-center justify-content-between">
                            <div class="d-flex align-items-start flex-grow-1 me-2">
                                <div class="date-box ${colorClass} text-center p-2 me-3 shadow-sm rounded-3 flex-shrink-0" style="min-width: 60px;">
                                    <span class="d-block fw-bold h5 m-0">${day}</span>
                                    <span class="d-block small text-uppercase">${monthShort}</span>
                                </div>
                                <div>
                                    <h6 class="fw-bold mb-1">${event.Titre}</h6>
                                    <p class="small text-muted mb-1">${event.Description || ''}</p>
                                    ${(heureVal || lieuVal) ? `
                                        <div class="d-flex flex-wrap gap-1 mt-1">
                                            ${heureVal ? `<span class="badge bg-light text-royal border px-2 py-0" style="font-size:0.72rem;"><i class="bi bi-clock me-1 text-primary"></i>${heureVal}</span>` : ''}
                                            ${lieuVal ? `<span class="badge bg-light text-royal border px-2 py-0" style="font-size:0.72rem;"><i class="bi bi-geo-alt me-1 text-danger"></i>${lieuVal}</span>` : ''}
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                            <!-- Bouton Ajouter à l'agenda -->
                            <div class="dropdown flex-shrink-0">
                                <button class="btn btn-sm btn-outline-secondary rounded-pill px-2 py-1" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="Ajouter à mon agenda">
                                    <i class="bi bi-calendar-plus text-primary me-1"></i><span class="d-none d-sm-inline" style="font-size:0.75rem;">Ajouter</span>
                                </button>
                                <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0 py-1" style="font-size: 0.85rem;">
                                    <li><a class="dropdown-item py-1" href="${gcalUrl}" target="_blank" rel="noopener"><i class="bi bi-google me-2 text-danger"></i>Google Calendar</a></li>
                                    <li><button type="button" class="dropdown-item py-1 btn-download-ics" data-title="${safeTitle}" data-desc="${safeDesc}" data-date="${event.Date}" data-heure="${safeHeure}" data-lieu="${safeLieu}"><i class="bi bi-apple me-2 text-dark"></i>Apple / iCal (.ics)</button></li>
                                </ul>
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
