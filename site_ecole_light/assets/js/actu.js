/**
 * Actu Logic
 * Loads news from CSV and displays them in the offcanvas.
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Configuration
    const CSV_URL = 'assets/csv_templates/modele_actu.csv';

    const container = document.getElementById('actu-offcanvas-container');
    if (!container) return; // Should allow missing containers if script is global

    // 1. Fetch Data
    const allNews = await CsvLoader.fetchCsv(CSV_URL);

    // Sort by Date Descending (Newest first)
    allNews.sort((a, b) => {
        const dateA = CsvLoader.parseDate(a.Date);
        const dateB = CsvLoader.parseDate(b.Date);
        return dateB - dateA;
    });

    // 2. Render
    container.innerHTML = '';

    if (allNews.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">Aucune actualité pour le moment.</p>';
        return;
    }

    allNews.forEach(news => {
        const dateObj = CsvLoader.parseDate(news.Date);
        const dateStr = dateObj ? dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

        // Image handling: if path starts with assets, use it. If http, use it.
        // If empty, don't show image.
        let imageHtml = '';
        if (news.Image && news.Image.trim() !== '') {
            imageHtml = `<img src="${news.Image}" loading="lazy" class="img-fluid rounded-3 mb-3 w-100" style="max-height: 200px; object-fit: cover;" alt="${news.Titre}">`;
        }

        const html = `
            <article class="mb-5 fade-in-up">
                <h6 class="fw-bold text-primary mb-2">${news.Titre}</h6>
                <p class="text-muted small mb-3"><i class="bi bi-clock me-1"></i>${dateStr}</p>
                ${imageHtml}
                <p>${news.Description || ''}</p>
                ${news.Lien ? `<a href="${news.Lien}" target="_blank" class="btn btn-sm btn-outline-primary rounded-pill mt-2">En savoir plus</a>` : ''}
            </article>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });
});
