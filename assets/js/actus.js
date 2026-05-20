/**
 * News/Actualités Logic
 * Loads news from CSV and displays them dynamically.
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Configuration
    const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQcCUH9nb_MQuxaPOsXVS65dhj4RhjSDgsIJCGbWitnBp7EdXmjDe_9WdqDQ2Fo074-q9mS08hf7Muo/pub?gid=136575323&single=true&output=csv';

    const previewCard = document.getElementById('news-preview');
    const offcanvasBody = document.getElementById('news-offcanvas-body');

    if (!previewCard || !offcanvasBody) return;

    try {
        // Fetch news data
        const newsData = await CsvLoader.fetchCsv(CSV_URL);

        if (!newsData || newsData.length === 0) {
            renderNoNews();
            return;
        }

        // Sort by date (most recent first)
        const sortedNews = newsData.sort((a, b) => {
            const dateA = parseNewsDate(a.Date);
            const dateB = parseNewsDate(b.Date);
            return dateB - dateA;
        });

        // Render preview (first/most recent news)
        renderNewsPreview(sortedNews[0]);

        // Render all news in offcanvas
        renderNewsOffcanvas(sortedNews);

    } catch (error) {
        console.error('Error loading news:', error);
        renderNoNews();
    }

    // Helper: Parse date from DD/MM/YYYY format
    function parseNewsDate(dateStr) {
        if (!dateStr) return new Date(0);
        const parts = dateStr.split('/');
        if (parts.length !== 3) return new Date(0);
        // DD/MM/YYYY -> new Date(YYYY, MM-1, DD)
        return new Date(parts[2], parts[1] - 1, parts[0]);
    }

    // Render preview card
    function renderNewsPreview(news) {
        const html = `
            <div class="d-flex">
                <div class="me-3">
                    <i class="bi bi-newspaper fs-1 text-royal"></i>
                </div>
                <div>
                    <h5 class="fw-bold text-royal">Dernières Actualités</h5>
                    <p class="mb-2">${news.Titre} : ${news.Description}</p>
                    <button class="btn btn-link small fw-bold text-decoration-none p-0"
                        data-bs-toggle="offcanvas" data-bs-target="#offcanvasActu">Lire la suite <i
                            class="bi bi-arrow-right"></i></button>
                </div>
            </div>
        `;
        previewCard.innerHTML = html;
    }

    // Render all news in offcanvas
    function renderNewsOffcanvas(newsArray) {
        let html = '';

        newsArray.forEach(news => {
            const dateObj = parseNewsDate(news.Date);
            const formattedDate = dateObj.toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });

            html += `
                <article class="mb-5">
                    <h6 class="fw-bold text-primary mb-2">${news.Titre}</h6>
                    <p class="text-muted small mb-3">${formattedDate}</p>
            `;

            // Add image if available (will fail gracefully if not found)
            if (news.Image && news.Image.trim() !== '') {
                // Convert Google Drive sharing URL to direct image URL
                let imageUrl = news.Image;
                if (imageUrl.includes('drive.google.com/file/d/')) {
                    const fileId = imageUrl.match(/\/d\/([^/]+)/)?.[1];
                    if (fileId) {
                        imageUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
                    }
                }

                html += `
                    <img src="${imageUrl}" loading="lazy" class="img-fluid rounded-3 mb-3" 
                        alt="${news.Titre}" onerror="this.style.display='none'">
                `;
            }

            html += `
                    <p>${news.Description}</p>
            `;

            // Add link if available
            if (news.Lien && news.Lien.trim() !== '') {
                html += `
                    <a href="${news.Lien}" class="btn btn-sm btn-outline-primary rounded-pill" target="_blank">
                        En savoir plus <i class="bi bi-arrow-right"></i>
                    </a>
                `;
            }

            html += `</article>`;
        });

        offcanvasBody.innerHTML = html;
    }

    // Fallback when no news available
    function renderNoNews() {
        previewCard.innerHTML = `
            <div class="d-flex">
                <div class="me-3">
                    <i class="bi bi-newspaper fs-1 text-muted"></i>
                </div>
                <div>
                    <h5 class="fw-bold text-muted">Actualités</h5>
                    <p class="mb-0 small">Aucune actualité disponible pour le moment.</p>
                </div>
            </div>
        `;
        offcanvasBody.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle me-2"></i>
                Aucune actualité disponible pour le moment.
            </div>
        `;
    }
});
