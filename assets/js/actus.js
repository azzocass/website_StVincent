/**
 * News / Actualités Logic
 * Loads news from Google Sheet CSV, renders modern interactive cards,
 * category filters, pinned articles, and rich modal viewer (HTML, images, videos).
 */
document.addEventListener('DOMContentLoaded', async () => {
    // URL de publication CSV du Google Sheet (onglet Actualités)
    const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQcCUH9nb_MQuxaPOsXVS65dhj4RhjSDgsIJCGbWitnBp7EdXmjDe_9WdqDQ2Fo074-q9mS08hf7Muo/pub?gid=136575323&single=true&output=csv';

    const sectionContent = document.getElementById('news-section-content');
    const offcanvasBody = document.getElementById('news-offcanvas-body');
    const previewCard = document.getElementById('news-preview'); // optional legacy widget
    const filterButtons = document.querySelectorAll('.news-filter-btn');

    let allNews = [];
    let currentCategory = 'all';

    try {
        const rawData = await CsvLoader.fetchCsv(CSV_URL);

        if (!rawData || rawData.length === 0) {
            renderEmptyState();
            return;
        }

        // Nettoyer et normaliser les données du Sheet (supporte tout ordre de colonnes)
        allNews = rawData.map((item, index) => {
            const dateStr = item.Date || '';
            const titre = item.Titre || 'Actualité';
            const description = item.Description || '';
            const contenu = item.Contenu || '';
            const auteur = item.Auteur || '';
            const categorie = (item.Categorie || 'Vie de classe').trim();
            const epingle = (item.Epingle || '').trim().toLowerCase();
            const isPinned = epingle === 'oui' || epingle === 'true' || epingle === '1';
            const image = (item.Image || '').trim();
            const video = (item.Video || '').trim();
            const lien = (item.Lien || '').trim();

            return {
                id: index,
                date: parseNewsDate(dateStr),
                rawDate: dateStr,
                titre,
                description,
                contenu,
                auteur,
                categorie,
                isPinned,
                image,
                video,
                lien
            };
        }).filter(item => item.titre.trim() !== '');

        // Trier par date décroissante (les plus récentes en premier)
        allNews.sort((a, b) => b.date - a.date);

        if (allNews.length === 0) {
            renderEmptyState();
            return;
        }

        // Rendu initial
        renderNewsSection(allNews);
        renderNewsOffcanvas(allNews);
        if (previewCard) renderNewsPreview(allNews[0]);

        // Configuration des boutons de filtre par catégorie
        setupCategoryFilters();

    } catch (error) {
        console.error('Erreur lors du chargement des actualités:', error);
        renderEmptyState();
    }

    // ============================================================
    // HELPERS & PARSERS
    // ============================================================

    function parseNewsDate(dateStr) {
        if (!dateStr) return new Date(0);
        const parts = dateStr.split('/');
        if (parts.length !== 3) return new Date(0);
        return new Date(parts[2], parts[1] - 1, parts[0]);
    }

    function formatDisplayDate(dateObj) {
        if (!dateObj || isNaN(dateObj.getTime()) || dateObj.getTime() === 0) return '';
        return dateObj.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }

    // Résolution d'image (Google Drive direct / extraction HTML / fallback)
    function resolveImageUrl(news) {
        if (news.image) {
            return convertDriveUrl(news.image);
        }
        // Chercher une balise <img> dans le Contenu HTML
        if (news.contenu) {
            const match = news.contenu.match(/<img[^>]+src=["']([^"']+)["']/i);
            if (match && match[1]) {
                return convertDriveUrl(match[1]);
            }
        }
        return null;
    }

    function convertDriveUrl(url) {
        if (!url) return '';
        if (url.includes('drive.google.com/file/d/')) {
            const fileId = url.match(/\/d\/([^/]+)/)?.[1];
            if (fileId) {
                return `https://lh3.googleusercontent.com/d/${fileId}`;
            }
        }
        if (url.includes('drive.google.com/open?id=')) {
            const fileId = url.match(/id=([^&]+)/)?.[1];
            if (fileId) {
                return `https://lh3.googleusercontent.com/d/${fileId}`;
            }
        }
        return url;
    }

    // Résolution vidéo (Google Drive preview / YouTube embed / HTML5)
    function buildVideoEmbedHtml(videoUrl) {
        if (!videoUrl) return '';

        // Google Drive Video
        if (videoUrl.includes('drive.google.com/file/d/')) {
            const fileId = videoUrl.match(/\/d\/([^/]+)/)?.[1];
            if (fileId) {
                return `
                    <div class="ratio ratio-16x9 rounded-3 overflow-hidden shadow-sm my-3 border">
                        <iframe src="https://drive.google.com/file/d/${fileId}/preview" allow="autoplay; encrypted-media" allowfullscreen></iframe>
                    </div>
                `;
            }
        }

        // YouTube
        const ytMatch = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
        if (ytMatch && ytMatch[1]) {
            return `
                <div class="ratio ratio-16x9 rounded-3 overflow-hidden shadow-sm my-3">
                    <iframe src="https://www.youtube-nocookie.com/embed/${ytMatch[1]}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                </div>
            `;
        }

        // Direct video (mp4, webm)
        if (videoUrl.match(/\.(mp4|webm|ogg)($|\?)/i)) {
            return `
                <div class="my-3 rounded-3 overflow-hidden shadow-sm">
                    <video controls class="w-100 d-block">
                        <source src="${videoUrl}">
                        Votre navigateur ne supporte pas la lecture de cette vidéo.
                    </video>
                </div>
            `;
        }

        // Lien générique
        return `
            <div class="my-3">
                <a href="${videoUrl}" target="_blank" rel="noopener" class="btn btn-outline-primary rounded-pill">
                    <i class="bi bi-play-circle-fill me-1"></i>Regarder la vidéo
                </a>
            </div>
        `;
    }

    function getCategoryBadgeClass(category) {
        const cat = (category || '').toLowerCase();
        if (cat.includes('classe') || cat.includes('maternelle') || cat.includes('élémentaire') || cat.includes('cm') || cat.includes('ce') || cat.includes('cp')) {
            return 'badge-cat-classe';
        }
        if (cat.includes('événe') || cat.includes('evene') || cat.includes('fête') || cat.includes('matinée') || cat.includes('kermesse')) {
            return 'badge-cat-evenement';
        }
        if (cat.includes('sport') || cat.includes('course') || cat.includes('sortie') || cat.includes('voyage')) {
            return 'badge-cat-sport';
        }
        if (cat.includes('pastoral') || cat.includes('célébration') || cat.includes('noël') || cat.includes('pâques')) {
            return 'badge-cat-pastoral';
        }
        return 'badge-cat-default';
    }

    function getCategoryIcon(category) {
        const cat = (category || '').toLowerCase();
        if (cat.includes('classe')) return 'bi-mortarboard-fill';
        if (cat.includes('événe') || cat.includes('evene')) return 'bi-calendar-event-fill';
        if (cat.includes('sport') || cat.includes('course')) return 'bi-trophy-fill';
        if (cat.includes('pastoral')) return 'bi-heart-fill';
        return 'bi-bookmark-star-fill';
    }

    // ============================================================
    // RENDU DE LA SECTION DÉDIÉE ACTUALITÉS
    // ============================================================

    function renderNewsSection(items) {
        if (!sectionContent) return;

        // Filtrer selon la catégorie sélectionnée
        const filtered = currentCategory === 'all'
            ? items
            : items.filter(item => item.categorie.toLowerCase() === currentCategory.toLowerCase());

        if (filtered.length === 0) {
            sectionContent.innerHTML = `
                <div class="text-center py-5">
                    <div class="mb-3 text-muted display-4"><i class="bi bi-inbox"></i></div>
                    <h5 class="text-muted fw-bold">Aucune actualité dans cette catégorie pour l'instant.</h5>
                    <p class="small text-muted">Sélectionnez une autre catégorie ci-dessus.</p>
                </div>
            `;
            return;
        }

        let html = '';

        // Détection d'un article épinglé (priorité si on est sur 'all' ou si l'épinglé correspond au filtre)
        const pinnedIndex = filtered.findIndex(n => n.isPinned);
        let pinnedArticle = null;
        let regularArticles = [...filtered];

        if (pinnedIndex !== -1) {
            pinnedArticle = regularArticles.splice(pinnedIndex, 1)[0];
        }

        // 1. Article Épinglé / Hero (si présent)
        if (pinnedArticle) {
            const heroImg = resolveImageUrl(pinnedArticle);
            const badgeClass = getCategoryBadgeClass(pinnedArticle.categorie);
            const catIcon = getCategoryIcon(pinnedArticle.categorie);
            const formattedDate = formatDisplayDate(pinnedArticle.date);

            html += `
                <div class="row mb-5">
                    <div class="col-12">
                        <div class="news-hero-card">
                            <div class="row g-0 align-items-center">
                                <div class="col-lg-6">
                                    <div class="news-hero-img-wrapper">
                                        ${heroImg
                                            ? `<img src="${heroImg}" alt="${pinnedArticle.titre}" loading="lazy" onerror="this.src='assets/images/banner1.jpg'">`
                                            : `<div class="news-card-placeholder"><i class="bi ${catIcon} display-1 opacity-25"></i></div>`
                                        }
                                    </div>
                                </div>
                                <div class="col-lg-6">
                                    <div class="p-4 p-md-5">
                                        <div class="d-flex align-items-center gap-2 mb-3 flex-wrap">
                                            <span class="badge bg-danger rounded-pill px-3 py-1 fw-bold">
                                                <i class="bi bi-pin-angle-fill me-1"></i>À la une
                                            </span>
                                            <span class="badge ${badgeClass} rounded-pill px-3 py-1 fw-bold">
                                                <i class="bi ${catIcon} me-1"></i>${pinnedArticle.categorie}
                                            </span>
                                            ${formattedDate ? `<span class="text-muted small"><i class="bi bi-clock me-1"></i>${formattedDate}</span>` : ''}
                                            ${pinnedArticle.auteur ? `<span class="text-muted small"><i class="bi bi-person me-1"></i>${pinnedArticle.auteur}</span>` : ''}
                                        </div>
                                        <h3 class="fw-bold text-royal mb-3 font-heading">${pinnedArticle.titre}</h3>
                                        <p class="text-muted mb-4" style="line-height: 1.6; color: #475569 !important;">
                                            ${pinnedArticle.description || pinnedArticle.contenu.replace(/<[^>]*>?/gm, '').substring(0, 200) + '...'}
                                        </p>
                                        <button class="btn btn-primary rounded-pill px-4 py-2 fw-bold shadow-sm btn-open-news-modal" data-news-id="${pinnedArticle.id}">
                                            Lire l'article complet <i class="bi bi-arrow-right ms-1"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        // 2. Grille des autres articles (jusqu'à 6 articles récents)
        const displayList = regularArticles.slice(0, 6);

        if (displayList.length > 0) {
            html += '<div class="row g-4">';
            displayList.forEach(news => {
                const imgUrl = resolveImageUrl(news);
                const badgeClass = getCategoryBadgeClass(news.categorie);
                const catIcon = getCategoryIcon(news.categorie);
                const formattedDate = formatDisplayDate(news.date);

                html += `
                    <div class="col-12 col-md-6 col-lg-4">
                        <div class="news-card shadow-sm">
                            <div class="news-card-img-wrapper">
                                ${imgUrl
                                    ? `<img src="${imgUrl}" alt="${news.titre}" loading="lazy" onerror="this.src='assets/images/banner1.jpg'">`
                                    : `<div class="news-card-placeholder"><i class="bi ${catIcon} display-2 opacity-25"></i></div>`
                                }
                                <div class="position-absolute top-0 start-0 m-3">
                                    <span class="badge ${badgeClass} rounded-pill px-3 py-1 shadow-sm">
                                        <i class="bi ${catIcon} me-1"></i>${news.categorie}
                                    </span>
                                </div>
                            </div>
                            <div class="card-body p-4 d-flex flex-direction-column flex-grow-1">
                                <div class="d-flex flex-column h-100 justify-content-between w-100">
                                    <div>
                                        <div class="d-flex align-items-center gap-2 text-muted small mb-2">
                                            ${formattedDate ? `<span><i class="bi bi-calendar3 me-1"></i>${formattedDate}</span>` : ''}
                                            ${news.auteur ? `<span>• <i class="bi bi-person me-1"></i>${news.auteur}</span>` : ''}
                                        </div>
                                        <h5 class="fw-bold text-royal mb-2 font-heading" style="font-size: 1.15rem;">${news.titre}</h5>
                                        <p class="text-muted small mb-3" style="line-height: 1.5; color: #475569 !important;">
                                            ${news.description || news.contenu.replace(/<[^>]*>?/gm, '').substring(0, 120) + '...'}
                                        </p>
                                    </div>
                                    <div>
                                        <button class="btn btn-link text-primary fw-bold text-decoration-none p-0 small btn-open-news-modal" data-news-id="${news.id}">
                                            Lire la suite <i class="bi bi-arrow-right"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }

        sectionContent.innerHTML = html;

        // Attacher les écouteurs sur les boutons d'ouverture de modal
        attachModalOpeners();
    }

    // ============================================================
    // GESTION DU MODAL DE DÉTAIL D'ARTICLE
    // ============================================================

    function attachModalOpeners() {
        document.querySelectorAll('.btn-open-news-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const id = parseInt(btn.getAttribute('data-news-id'), 10);
                const news = allNews.find(n => n.id === id);
                if (news) {
                    openNewsModal(news);
                }
            });
        });
    }

    function openNewsModal(news) {
        const modalEl = document.getElementById('newsArticleModal');
        if (!modalEl) return;

        const titleEl = document.getElementById('modal-article-title');
        const dateEl = document.getElementById('modal-article-date');
        const authorEl = document.getElementById('modal-article-author');
        const badgeEl = document.getElementById('modal-article-badge');
        const mediaContainer = document.getElementById('modal-article-media');
        const contentEl = document.getElementById('modal-article-content');
        const externalLinkBtn = document.getElementById('modal-article-external-link');

        if (titleEl) titleEl.textContent = news.titre;
        if (dateEl) dateEl.innerHTML = `<i class="bi bi-calendar3 me-1"></i>${formatDisplayDate(news.date)}`;

        if (authorEl) {
            if (news.auteur) {
                authorEl.innerHTML = `<i class="bi bi-person me-1"></i>${news.auteur}`;
                authorEl.classList.remove('d-none');
            } else {
                authorEl.classList.add('d-none');
            }
        }

        if (badgeEl) {
            badgeEl.className = `badge ${getCategoryBadgeClass(news.categorie)} rounded-pill px-3 py-1 fw-bold`;
            badgeEl.innerHTML = `<i class="bi ${getCategoryIcon(news.categorie)} me-1"></i>${news.categorie}`;
        }

        // Media (Vidéo ou Image)
        if (mediaContainer) {
            mediaContainer.innerHTML = '';
            let hasMedia = false;

            if (news.video) {
                mediaContainer.innerHTML = buildVideoEmbedHtml(news.video);
                mediaContainer.classList.remove('d-none');
                hasMedia = true;
            } else {
                const imgUrl = resolveImageUrl(news);
                if (imgUrl) {
                    mediaContainer.innerHTML = `
                        <img src="${imgUrl}" alt="${news.titre}" class="img-fluid rounded-3 shadow-sm w-100" style="max-height: 450px; object-fit: cover;" onerror="this.style.display='none'">
                    `;
                    mediaContainer.classList.remove('d-none');
                    hasMedia = true;
                }
            }

            if (!hasMedia) {
                mediaContainer.classList.add('d-none');
            }
        }

        // Contenu : Utilise Contenu (HTML ou texte) ou fallback sur Description
        if (contentEl) {
            if (news.contenu && news.contenu.trim() !== '') {
                contentEl.innerHTML = news.contenu;
            } else {
                contentEl.innerHTML = `<p>${news.description.replace(/\n/g, '<br>')}</p>`;
            }
        }

        // Lien externe (si configuré)
        if (externalLinkBtn) {
            if (news.lien && news.lien.trim() !== '') {
                externalLinkBtn.href = news.lien;
                externalLinkBtn.classList.remove('d-none');
            } else {
                externalLinkBtn.classList.add('d-none');
            }
        }

        // Afficher la modale Bootstrap
        if (window.bootstrap && bootstrap.Modal) {
            const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
            modal.show();
        }
    }

    // ============================================================
    // FILTRES PAR CATÉGORIE
    // ============================================================

    function setupCategoryFilters() {
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                filterButtons.forEach(b => {
                    b.classList.remove('active', 'btn-primary');
                    b.classList.add('btn-outline-primary');
                });
                btn.classList.add('active', 'btn-primary');
                btn.classList.remove('btn-outline-primary');

                currentCategory = btn.getAttribute('data-category') || 'all';
                renderNewsSection(allNews);
            });
        });
    }

    // ============================================================
    // OFFCANVAS ARCHIVE HISTORIQUE
    // ============================================================

    function renderNewsOffcanvas(newsArray) {
        if (!offcanvasBody) return;

        let html = '<div class="list-group list-group-flush">';

        newsArray.forEach(news => {
            const formattedDate = formatDisplayDate(news.date);
            const badgeClass = getCategoryBadgeClass(news.categorie);
            const imgUrl = resolveImageUrl(news);

            html += `
                <div class="list-group-item px-0 py-3 border-bottom">
                    <div class="d-flex align-items-start gap-3">
                        ${imgUrl ? `
                            <img src="${imgUrl}" alt="${news.titre}" class="rounded-3 flex-shrink-0" style="width: 75px; height: 75px; object-fit: cover;" onerror="this.style.display='none'">
                        ` : ''}
                        <div class="flex-grow-1">
                            <div class="d-flex align-items-center gap-2 mb-1 flex-wrap">
                                <span class="badge ${badgeClass} rounded-pill px-2 py-0" style="font-size: 0.72rem;">${news.categorie}</span>
                                <span class="text-muted small" style="font-size: 0.75rem;">${formattedDate}</span>
                            </div>
                            <h6 class="fw-bold text-royal mb-1" style="font-size: 0.95rem;">${news.titre}</h6>
                            <p class="small text-muted mb-2 text-truncate-2" style="font-size: 0.85rem;">${news.description || ''}</p>
                            <button class="btn btn-sm btn-outline-primary rounded-pill px-3 py-1 btn-open-news-modal" data-news-id="${news.id}" style="font-size: 0.78rem;">
                                Voir l'article
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        offcanvasBody.innerHTML = html;

        // Écouteurs dans l'offcanvas
        offcanvasBody.querySelectorAll('.btn-open-news-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const id = parseInt(btn.getAttribute('data-news-id'), 10);
                const news = allNews.find(n => n.id === id);
                if (news) {
                    // Fermer l'offcanvas si ouvert
                    const offcanvasEl = document.getElementById('offcanvasActu');
                    if (offcanvasEl && window.bootstrap && bootstrap.Offcanvas) {
                        const offcanvasInstance = bootstrap.Offcanvas.getInstance(offcanvasEl);
                        if (offcanvasInstance) offcanvasInstance.hide();
                    }
                    setTimeout(() => openNewsModal(news), 300);
                }
            });
        });
    }

    // ============================================================
    // PREVIEW CARD (COMPATIBILITÉ)
    // ============================================================

    function renderNewsPreview(news) {
        if (!previewCard) return;
        previewCard.innerHTML = `
            <div class="d-flex">
                <div class="me-3">
                    <i class="bi bi-newspaper fs-1 text-royal"></i>
                </div>
                <div>
                    <h5 class="fw-bold text-royal">Dernières Actualités</h5>
                    <p class="mb-2">${news.titre} : ${news.description}</p>
                    <a href="#actualites" class="btn btn-link small fw-bold text-decoration-none p-0">
                        Voir les actualités <i class="bi bi-arrow-right"></i>
                    </a>
                </div>
            </div>
        `;
    }

    // ============================================================
    // ÉTAT VIDE
    // ============================================================

    function renderEmptyState() {
        if (sectionContent) {
            sectionContent.innerHTML = `
                <div class="text-center py-5">
                    <i class="bi bi-newspaper fs-1 text-muted"></i>
                    <h5 class="fw-bold text-muted mt-2">Aucune actualité pour le moment</h5>
                    <p class="small text-muted">Les prochains événements et projets de l'école seront affichés ici très bientôt.</p>
                </div>
            `;
        }
        if (offcanvasBody) {
            offcanvasBody.innerHTML = `
                <div class="alert alert-info border-0 rounded-3">
                    <i class="bi bi-info-circle me-2"></i>
                    Aucune actualité disponible pour le moment.
                </div>
            `;
        }
    }
});
