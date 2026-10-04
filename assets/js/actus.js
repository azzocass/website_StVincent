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

        // Vérifier s'il y a un nouvel article non vu
        checkNewArticleNotification(allNews);

    } catch (error) {
        console.error('Erreur lors du chargement des actualités:', error);
        renderEmptyState();
    }

    // ============================================================
    // NOTIFICATION NOUVEL ARTICLE & LIGHTBOX
    // ============================================================

    // Vérifie si un article date de moins de 14 jours
    function isRecentArticle(dateObj) {
        if (!dateObj || isNaN(dateObj.getTime()) || dateObj.getTime() === 0) return false;
        const now = new Date();
        const diffDays = (now.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays >= -1 && diffDays <= 14;
    }

    // Lightbox plein écran pour agrandir les images au clic
    window.openLightboxImage = function (src, caption) {
        if (!src) return;
        const lbModalEl = document.getElementById('imageLightboxModal');
        const lbImg = document.getElementById('lightboxImage');
        const lbCap = document.getElementById('lightboxCaption');
        if (lbImg) lbImg.src = src;
        if (lbCap) lbCap.textContent = caption || '';
        if (lbModalEl && window.bootstrap && bootstrap.Modal) {
            const modal = bootstrap.Modal.getOrCreateInstance(lbModalEl);
            modal.show();
        }
    };

    function checkNewArticleNotification(newsList) {
        if (!newsList || newsList.length === 0) return;

        const STORAGE_KEY = 'esv_last_seen_article_date';
        const latestArticle = newsList[0]; // déjà trié par date desc
        const latestDateMs = latestArticle.date ? latestArticle.date.getTime() : 0;
        if (!latestDateMs) return;

        const lastSeenMs = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
        const isRecent = isRecentArticle(latestArticle.date);

        // Afficher la pastille/toast si l'article est plus récent que la dernière visite OU récent (< 14j)
        if (latestDateMs > lastSeenMs || (isRecent && lastSeenMs === 0)) {
            showNewArticleBadge(latestArticle, STORAGE_KEY, latestDateMs);
        }
    }

    function showNewArticleBadge(article, storageKey, latestDateMs) {
        // 1. Pastille rouge « Nouveau » bien visible sur le lien Actualités dans la navbar
        const navActu = document.querySelector('a[href="#actualites"].nav-link');
        if (navActu && !document.getElementById('new-article-badge')) {
            navActu.style.position = 'relative';
            const badge = document.createElement('span');
            badge.id = 'new-article-badge';
            badge.className = 'badge rounded-pill bg-danger ms-1 align-middle';
            badge.style.fontSize = '0.65rem';
            badge.style.padding = '3px 7px';
            badge.style.boxShadow = '0 0 8px rgba(239,68,68,0.6)';
            badge.innerHTML = '<i class="bi bi-bell-fill me-1"></i>Nouveau';
            navActu.appendChild(badge);

            // Injecter animation pulse discrète
            if (!document.getElementById('pulse-style')) {
                const s = document.createElement('style');
                s.id = 'pulse-style';
                s.textContent = `@keyframes pulse-dot{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.08);opacity:.85}} #new-article-badge{animation:pulse-dot 2s infinite;}`;
                document.head.appendChild(s);
            }

            // Supprimer badge au clic sur "Actualités"
            navActu.addEventListener('click', () => markAsSeen(storageKey, latestDateMs), { once: true });
        }

        // 2. Toast Bootstrap en bas à droite
        const toastContainer = document.getElementById('toast-container-notif') || createToastContainer();
        const toastId = 'toast-new-article-' + Date.now();
        const prettyDate = article.date ? article.date.toLocaleDateString('fr-FR', { day:'numeric', month:'long' }) : '';
        toastContainer.insertAdjacentHTML('beforeend', `
            <div id="${toastId}" class="toast align-items-center border-0 shadow-lg rounded-4" role="alert" aria-live="polite" data-bs-autohide="false" style="background:#1e3a5f;color:#fff;min-width:290px">
                <div class="d-flex">
                    <div class="toast-body py-3 px-3">
                        <div class="d-flex align-items-center mb-1">
                            <span class="badge bg-danger rounded-pill px-2 py-1 me-2" style="font-size:0.7rem">Nouveau</span>
                            <strong style="font-size:.9rem">Nouvelle actualité</strong>
                        </div>
                        <div style="font-size:.82rem;opacity:.92;margin-bottom:8px">
                            ${article.titre.substring(0, 60)}${article.titre.length > 60 ? '…' : ''}
                            ${prettyDate ? '<br><span style="opacity:.7;font-size:.78rem">' + prettyDate + '</span>' : ''}
                        </div>
                        <a href="#actualites" class="btn btn-sm rounded-pill fw-bold" style="background:#f5a623;color:#1e3a5f;border:none;font-size:.78rem;padding:4px 14px;" onclick="markActuAsSeen_${toastId}()">
                            Voir l'article →
                        </a>
                    </div>
                    <button type="button" class="btn-close btn-close-white me-3 mt-3 align-self-start" data-bs-dismiss="toast" onclick="markActuAsSeen_${toastId}()" aria-label="Fermer"></button>
                </div>
            </div>`);

        window['markActuAsSeen_' + toastId] = () => {
            markAsSeen(storageKey, latestDateMs);
            const toastEl = document.getElementById(toastId);
            if (toastEl) bootstrap.Toast.getOrCreateInstance(toastEl).hide();
        };

        setTimeout(() => {
            const toastEl = document.getElementById(toastId);
            if (toastEl) bootstrap.Toast.getOrCreateInstance(toastEl).show();
        }, 1500);
    }

    function createToastContainer() {
        const el = document.createElement('div');
        el.id = 'toast-container-notif';
        el.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        el.style.zIndex = '1090';
        document.body.appendChild(el);
        return el;
    }

    function markAsSeen(storageKey, dateMs) {
        localStorage.setItem(storageKey, String(dateMs));
        const badge = document.getElementById('new-article-badge');
        if (badge) badge.remove();
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
        let fileId = null;
        if (url.includes('drive.google.com/file/d/')) {
            fileId = url.match(/\/d\/([^/]+)/)?.[1];
        } else if (url.includes('drive.google.com/open?id=')) {
            fileId = url.match(/id=([^&]+)/)?.[1];
        } else if (url.includes('googleusercontent.com/d/')) {
            fileId = url.match(/\/d\/([^/]+)/)?.[1];
        }

        if (fileId) {
            // Utiliser l'API Thumbnail Google Drive pour un affichage instantané sans délai CDN
            return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;
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

        // Media (Photo de couverture et/ou Vidéo principale)
        const bottomMediaContainer = document.getElementById('modal-article-bottom-media');
        if (bottomMediaContainer) {
            bottomMediaContainer.innerHTML = '';
            bottomMediaContainer.classList.add('d-none');
        }

        if (mediaContainer) {
            mediaContainer.innerHTML = '';
            let hasTopMedia = false;

            const imgUrl = resolveImageUrl(news);
            const videoUrl = news.video;

            if (imgUrl && videoUrl) {
                // Photo d'accueil en haut ET vidéo en bas de l'article
                mediaContainer.innerHTML = `
                    <div class="position-relative overflow-hidden rounded-3 shadow-sm bg-light mb-2">
                        <img src="${imgUrl}" alt="${news.titre}" class="img-fluid w-100 d-block" 
                            style="max-height: 280px; object-fit: cover; object-position: center;" 
                            onerror="if(!this.dataset.retry){this.dataset.retry=true; const fid=this.src.match(/id=([^&]+)/)?.[1]; if(fid) this.src='https://lh3.googleusercontent.com/d/'+fid; else this.style.display='none';}else{this.style.display='none';}">
                    </div>
                `;
                mediaContainer.classList.remove('d-none');
                hasTopMedia = true;

                if (bottomMediaContainer) {
                    bottomMediaContainer.innerHTML = `
                        <div class="pt-3 border-top mt-4">
                            <h6 class="fw-bold text-royal mb-2"><i class="bi bi-camera-reels-fill text-primary me-2"></i>Vidéo associée :</h6>
                            ${buildVideoEmbedHtml(videoUrl)}
                        </div>
                    `;
                    bottomMediaContainer.classList.remove('d-none');
                }
            } else if (imgUrl) {
                // Photo seule
                mediaContainer.innerHTML = `
                    <div class="position-relative overflow-hidden rounded-3 shadow-sm bg-light mb-2">
                        <img src="${imgUrl}" alt="${news.titre}" class="img-fluid w-100 d-block" 
                            style="max-height: 280px; object-fit: cover; object-position: center;" 
                            onerror="if(!this.dataset.retry){this.dataset.retry=true; const fid=this.src.match(/id=([^&]+)/)?.[1]; if(fid) this.src='https://lh3.googleusercontent.com/d/'+fid; else this.style.display='none';}else{this.style.display='none';}">
                    </div>
                `;
                mediaContainer.classList.remove('d-none');
                hasTopMedia = true;
            } else if (videoUrl) {
                // Vidéo seule en haut
                mediaContainer.innerHTML = buildVideoEmbedHtml(videoUrl);
                mediaContainer.classList.remove('d-none');
                hasTopMedia = true;
            }

            if (!hasTopMedia) {
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
