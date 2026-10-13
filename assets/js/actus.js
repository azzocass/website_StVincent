/**
 * News / Actualités Logic
 * Loads news from Google Sheet CSV, renders modern interactive cards,
 * category filters, pinned articles, automatic photo carousels, and rich modal viewer.
 */
document.addEventListener('DOMContentLoaded', async () => {
    // URL de publication CSV du Google Sheet (onglet Actualités)
    const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQcCUH9nb_MQuxaPOsXVS65dhj4RhjSDgsIJCGbWitnBp7EdXmjDe_9WdqDQ2Fo074-q9mS08hf7Muo/pub?gid=136575323&single=true&output=csv';

    const sectionContent = document.getElementById('news-section-content');
    const offcanvasBody = document.getElementById('news-offcanvas-body');
    const previewCard = document.getElementById('news-preview');
    const filterButtons = document.querySelectorAll('.news-filter-btn');

    let allNews = [];
    let currentCategory = 'all';

    try {
        const rawData = await CsvLoader.fetchCsvStrict(CSV_URL, 1);

        if (!rawData || rawData.length === 0) {
            renderErrorState();
            return;
        }

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

        allNews.sort((a, b) => b.date - a.date);

        if (allNews.length === 0) {
            renderEmptyState();
            return;
        }

        renderNewsSection(allNews);
        renderNewsOffcanvas(allNews);
        if (previewCard) renderNewsPreview(allNews[0]);

        setupCategoryFilters();
        checkNewArticleNotification(allNews);

    } catch (error) {
        console.error('Erreur lors du chargement des actualités:', error);
        renderEmptyState();
    }

    // ============================================================
    // NOTIFICATION NOUVEL ARTICLE & LIGHTBOX
    // ============================================================

    function isRecentArticle(dateObj) {
        if (!dateObj || isNaN(dateObj.getTime()) || dateObj.getTime() === 0) return false;
        const now = new Date();
        const diffDays = (now.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays >= -1 && diffDays <= 14;
    }

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

    function articleKey(a) {
        return (a.titre || '').trim().toLowerCase() + '|' + (a.date ? a.date.getTime() : 0);
    }

    function checkNewArticleNotification(newsList) {
        if (!newsList || newsList.length === 0) return;

        const STORAGE_KEY = 'esv_seen_articles';
        let seen = null;
        try { seen = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (e) { }

        const allKeys = newsList.map(articleKey);
        const firstVisit = !Array.isArray(seen);

        const unseen = newsList.find(a =>
            firstVisit ? isRecentArticle(a.date) : !seen.includes(articleKey(a))
        );

        if (unseen) showNewArticleBadge(unseen, STORAGE_KEY, allKeys);
    }

    function showNewArticleBadge(article, storageKey, latestDateMs) {
        const navActu = document.querySelector('a[href="#actualites"].nav-link');
        if (navActu) navActu.addEventListener('click', () => markAsSeen(storageKey, latestDateMs));

        if (navActu && !document.getElementById('new-article-badge')) {
            navActu.style.position = 'relative';
            const badge = document.createElement('span');
            badge.id = 'new-article-badge';
            badge.className = 'badge rounded-pill bg-danger ms-3 align-middle';
            badge.style.fontSize = '0.75rem';
            badge.style.padding = '5px 8px';
            badge.style.boxShadow = '0 0 10px rgba(239,68,68,0.7)';
            badge.innerHTML = '<i class="bi bi-bell-fill"></i>';
            navActu.appendChild(badge);
        }

        if (!document.getElementById('esv-toast-style')) {
            const st = document.createElement('style');
            st.id = 'esv-toast-style';
            st.textContent = `
                #esv-custom-toast {
                    position: fixed; z-index: 10999; right: 30px; bottom: 30px; width: 340px; box-sizing: border-box;
                    background: linear-gradient(135deg, #1e3a5f, #00618a); color: #fff; border-radius: 16px; padding: 1.2rem;
                    box-shadow: 0 10px 30px rgba(0,52,89,.4); display: flex; align-items: flex-start; gap: 12px;
                    opacity: 0; transform: translateY(20px); transition: opacity .4s ease, transform .4s ease;
                }
                #esv-custom-toast.show { opacity: 1; transform: translateY(0); }
                @media (max-width: 767px) {
                    #esv-custom-toast { left: 12px; right: 12px; width: auto; bottom: calc(env(safe-area-inset-bottom, 0px) + 16px); }
                }
            `;
            document.head.appendChild(st);
        }

        const old = document.getElementById('esv-custom-toast');
        if (old) old.remove();

        const esc = (s) => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        const prettyDate = article.date ? article.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '';

        const toastEl = document.createElement('div');
        toastEl.id = 'esv-custom-toast';
        toastEl.setAttribute('role', 'status');
        toastEl.innerHTML = `
            <div style="flex-grow:1;min-width:0;">
                <div style="display:flex;align-items:center;margin-bottom:8px;">
                    <span style="background:#e63946;color:#fff;padding:2px 8px;border-radius:12px;font-size:.7rem;font-weight:bold;margin-right:8px;">Nouveau</span>
                    <strong style="font-size:.95rem;">Nouvelle actualité</strong>
                </div>
                <div style="font-size:.85rem;margin-bottom:12px;line-height:1.4;color:#f8fafc;overflow-wrap:anywhere;">
                    ${esc(article.titre)}
                    ${prettyDate ? `<br><span style="opacity:.7;font-size:.75rem;">${prettyDate}</span>` : ''}
                </div>
                <a href="#actualites" data-esv-close style="background:#f5a623;color:#1e3a5f;text-decoration:none;padding:8px 16px;border-radius:20px;font-size:.8rem;font-weight:bold;display:inline-block;">Voir l'article →</a>
            </div>
            <button type="button" data-esv-close aria-label="Fermer" style="background:transparent;border:none;color:#fff;font-size:1.6rem;cursor:pointer;padding:4px 8px;margin:-4px -8px 0 0;line-height:1;opacity:.8;">&times;</button>
        `;
        document.body.appendChild(toastEl);

        const closeToast = (markSeen) => {
            if (markSeen) markAsSeen(storageKey, latestDateMs);
            toastEl.classList.remove('show');
            setTimeout(() => toastEl.remove(), 400);
        };
        toastEl.querySelectorAll('[data-esv-close]').forEach(el => el.addEventListener('click', () => closeToast(true)));

        requestAnimationFrame(() => requestAnimationFrame(() => toastEl.classList.add('show')));
        setTimeout(() => { if (document.body.contains(toastEl)) closeToast(false); }, 60000);
    }

    function markAsSeen(storageKey, value) {
        try { localStorage.setItem(storageKey, JSON.stringify(value)); } catch (e) { }
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
        return dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    // Extraction et conversion propre des URL Google Drive
    function convertDriveUrl(url) {
        if (!url || typeof url !== 'string' || url.trim() === '') return '';
        if (url.startsWith('data:image')) return url;

        const cleanUrl = url.replace(/&amp;/g, '&');

        // Si c'est déjà un lien direct de thumbnail Google, on le renvoie proprement
        if (cleanUrl.includes('drive.google.com/thumbnail') || cleanUrl.includes('googleusercontent.com/d/')) {
            return cleanUrl;
        }

        // Sinon, extraction de l'ID
        let fileId = null;
        if (cleanUrl.includes('drive.google.com/file/d/')) {
            fileId = cleanUrl.match(/\/d\/([^/]+)/)?.[1];
        } else if (cleanUrl.includes('id=')) {
            fileId = cleanUrl.match(/id=([^&]+)/)?.[1];
        }

        if (fileId) {
            return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;
        }
        
        return cleanUrl;
    }

    // Version ultra robuste : cherche d'abord dans la colonne Image, 
    // et si vide, prend AUTOMATIQUEMENT la première image du contenu HTML !
    function resolveImageUrl(news) {
        // 1. Si le champ "Image" est rempli dans le Sheet
        if (news.image && news.image.trim() !== '' && !news.image.startsWith('http') === false) {
            // Si c'est juste l'URL brute collée en bas de ton message :
            if (news.image.startsWith('http')) return convertDriveUrl(news.image);
        }

        // 2. Sinon, on va piocher directement la première image <img> dans le texte HTML de l'article
        if (news.contenu) {
            const match = news.contenu.match(/<img[^>]+src=["']([^"']+)["']/i);
            if (match && match[1]) {
                return convertDriveUrl(match[1]);
            }
        }

        // 3. Secours ultime si l'URL est texte brut à la fin comme dans ton exemple
        if (news.image && news.image.includes('drive.google.com')) {
            return convertDriveUrl(news.image);
        }

        return null;
    }

    function buildVideoEmbedHtml(videoUrl) {
        if (!videoUrl) return '';

        if (videoUrl.includes('drive.google.com/file/d/')) {
            const fileId = videoUrl.match(/\/d\/([\w-]+)/)?.[1];
            if (fileId) {
                return `
                    <div class="ratio ratio-16x9 w-100 rounded-3 overflow-hidden shadow-sm mb-4" style="min-height: 250px;">
                        <iframe src="https://drive.google.com/file/d/${fileId}/preview" allow="autoplay; encrypted-media" allowfullscreen style="border:none; width:100%; height:100%;"></iframe>
                    </div>
                `;
            }
        }

        const ytMatch = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
        if (ytMatch && ytMatch[1]) {
            return `
                <div class="ratio ratio-16x9 w-100 rounded-3 overflow-hidden shadow-sm mb-4" style="min-height: 250px;">
                    <iframe src="https://www.youtube-nocookie.com/embed/${ytMatch[1]}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border:none; width:100%; height:100%;"></iframe>
                </div>
            `;
        }

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
        if (cat.includes('classe') || cat.includes('maternelle') || cat.includes('élémentaire') || cat.includes('cm') || cat.includes('ce') || cat.includes('cp')) return 'badge-cat-classe';
        if (cat.includes('événe') || cat.includes('evene') || cat.includes('fête') || cat.includes('matinée') || cat.includes('kermesse')) return 'badge-cat-evenement';
        if (cat.includes('sport') || cat.includes('course') || cat.includes('sortie') || cat.includes('voyage')) return 'badge-cat-sport';
        if (cat.includes('pastoral') || cat.includes('célébration') || cat.includes('noël') || cat.includes('pâques')) return 'badge-cat-pastoral';
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
    // RENDU DE LA SECTION ACTUALITÉS
    // ============================================================

    function renderNewsSection(items) {
        if (!sectionContent) return;

        const filtered = currentCategory === 'all'
            ? items
            : items.filter(item => item.categorie.toLowerCase() === currentCategory.toLowerCase());
     
        if (filtered.length === 0) {
            sectionContent.innerHTML = `
                <div class="text-center py-5">
                    <div class="mb-3 text-muted display-4"><i class="bi bi-inbox"></i></div>
                    <h5 class="text-muted fw-bold">Aucune actualité dans cette catégorie pour l'instant.</h5>
                </div>
            `;
            return;
        }

        let html = '';
        const pinnedIndex = filtered.findIndex(n => n.isPinned);
        let pinnedArticle = null;
        let regularArticles = [...filtered];

        if (pinnedIndex !== -1) {
            pinnedArticle = regularArticles.splice(pinnedIndex, 1)[0];
        }

        if (pinnedArticle) {
            const heroImg = resolveImageUrl(pinnedArticle);
            const badgeClass = getCategoryBadgeClass(pinnedArticle.categorie);
            const catIcon = getCategoryIcon(pinnedArticle.categorie);
            const formattedDate = formatDisplayDate(pinnedArticle.date);
            const cleanDesc = (pinnedArticle.description || '').trim();
            const cleanContent = (pinnedArticle.contenu || '').replace(/<[^>]*>?/gm, '').trim();
            const showReadMoreHero = cleanContent.length > cleanDesc.length && cleanContent !== cleanDesc;

            html += `
                <div class="row mb-5">
                    <div class="col-12">
                        <div class="news-hero-card">
                            <div class="row g-0 align-items-center">
                                <div class="col-lg-6">
                                    <div class="news-hero-img-wrapper">
                                        ${heroImg ? `<img src="${heroImg}" alt="${pinnedArticle.titre}" loading="lazy" onerror="this.outerHTML='<div class=\\'news-card-placeholder d-flex align-items-center justify-content-center h-100 bg-light\\'><i class=\\'bi ${catIcon} display-1 opacity-25\\'></i></div>'">` : `<div class="news-card-placeholder"><i class="bi ${catIcon} display-1 opacity-25"></i></div>`}    
                                    </div>
                                </div>
                                <div class="col-lg-6">
                                    <div class="p-4 p-md-5">
                                        <div class="d-flex align-items-center gap-2 mb-3 flex-wrap">
                                            <span class="badge bg-danger rounded-pill px-3 py-1 fw-bold"><i class="bi bi-pin-angle-fill me-1"></i>À la une</span>
                                            <span class="badge ${badgeClass} rounded-pill px-3 py-1 fw-bold"><i class="bi ${catIcon} me-1"></i>${pinnedArticle.categorie}</span>
                                            ${formattedDate ? `<span class="text-muted small"><i class="bi bi-clock me-1"></i>${formattedDate}</span>` : ''}
                                        </div>
                                        <h3 class="fw-bold text-royal mb-3 font-heading">${pinnedArticle.titre}</h3>
                                        <p class="text-muted mb-4" style="line-height: 1.6;">${pinnedArticle.description || cleanContent}</p>
                                        ${showReadMoreHero ? `<button class="btn btn-primary rounded-pill px-4 py-2 fw-bold shadow-sm btn-open-news-modal" data-news-id="${pinnedArticle.id}">Lire l'article complet <i class="bi bi-arrow-right ms-1"></i></button>` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        const displayList = regularArticles.slice(0, 6);
        if (displayList.length > 0) {
            html += '<div class="row g-4">';
            displayList.forEach(news => {
                const imgUrl = resolveImageUrl(news);
                const badgeClass = getCategoryBadgeClass(news.categorie);
                const catIcon = getCategoryIcon(news.categorie);
                const formattedDate = formatDisplayDate(news.date);
                const cleanDesc = (news.description || '').trim();
                const cleanContent = (news.contenu || '').replace(/<[^>]*>?/gm, '').trim();
                const showReadMore = cleanContent.length > cleanDesc.length && cleanContent !== cleanDesc;

                html += `
                    <div class="col-12 col-md-6 col-lg-4">
                        <div class="news-card shadow-sm">
                            <div class="news-card-img-wrapper">
                                ${imgUrl ? `<img src="${imgUrl}" alt="${news.titre}" loading="lazy" onerror="this.outerHTML='<div class=\\'news-card-placeholder d-flex align-items-center justify-content-center h-100 bg-light\\'><i class=\\'bi ${catIcon} display-2 opacity-25\\'></i></div>'">` : `<div class="news-card-placeholder"><i class="bi ${catIcon} display-2 opacity-25"></i></div>`}
                                <div class="position-absolute top-0 start-0 m-3">
                                    <span class="badge ${badgeClass} rounded-pill px-3 py-1 shadow-sm"><i class="bi ${catIcon} me-1"></i>${news.categorie}</span>
                                </div>
                            </div>
                            <div class="card-body p-4 d-flex flex-column justify-content-between flex-grow-1">
                                <div>
                                    <div class="d-flex align-items-center gap-2 text-muted small mb-2">
                                        ${formattedDate ? `<span><i class="bi bi-calendar3 me-1"></i>${formattedDate}</span>` : ''}
                                    </div>
                                    <h5 class="fw-bold text-royal mb-2 font-heading" style="font-size: 1.15rem;">${news.titre}</h5>
                                    <p class="text-muted small mb-3" style="line-height: 1.5;">${news.description || cleanContent.substring(0, 120) + '...'}</p>
                                </div>
                                <div>
                                    ${showReadMore ? `<button class="btn btn-link text-primary fw-bold text-decoration-none p-0 small btn-open-news-modal" data-news-id="${news.id}">Lire la suite <i class="bi bi-arrow-right"></i></button>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }

        sectionContent.innerHTML = html;
        attachModalOpeners();
    }

    // ============================================================
    // GESTION DE LA MODALE D'ARTICLE AVEC CARROUSEL
    // ============================================================

    function attachModalOpeners() {
        document.querySelectorAll('.btn-open-news-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const id = parseInt(btn.getAttribute('data-news-id'), 10);
                const news = allNews.find(n => n.id === id);
                if (news) openNewsModal(news);
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
        const bottomMediaContainer = document.getElementById('modal-article-bottom-media');
        const externalLinkBtn = document.getElementById('modal-article-external-link');

        // En-tête
        if (titleEl) titleEl.textContent = news.titre;
        if (dateEl) dateEl.innerHTML = `<i class="bi bi-calendar3 me-1"></i>${formatDisplayDate(news.date)}`;
        if (authorEl) {
            if (news.auteur) { authorEl.innerHTML = `<i class="bi bi-person me-1"></i>${news.auteur}`; authorEl.classList.remove('d-none'); }
            else { authorEl.classList.add('d-none'); }
        }
        if (badgeEl) {
            badgeEl.className = `badge ${getCategoryBadgeClass(news.categorie)} rounded-pill px-3 py-1 fw-bold`;
            badgeEl.innerHTML = `<i class="bi ${getCategoryIcon(news.categorie)} me-1"></i>${news.categorie}`;
        }

        // 1. EXTRACTION DE TOUTES LES PHOTOS ET NETTOYAGE DU TEXTE
        let articleImages = [];

        // Photo de couverture (champ Image du Sheet)
        if (news.image && news.image.trim() !== '') {
            const coverUrl = convertDriveUrl(news.image);
            if (coverUrl) articleImages.push(coverUrl);
        }

        // Extraction des photos insérées dans le contenu HTML
        let rawHtml = news.contenu && news.contenu.trim() !== ''
            ? news.contenu
            : `<p>${(news.description || '').replace(/\n/g, '<br>')}</p>`;

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = rawHtml;

        tempDiv.querySelectorAll('img').forEach(img => {
            const src = img.getAttribute('src');
            if (src) {
                const formattedUrl = convertDriveUrl(src);
                if (formattedUrl && !articleImages.includes(formattedUrl)) {
                    articleImages.push(formattedUrl);
                }
            }
            img.remove(); // Retire l'image du corps du texte
        });

        // Nettoyage des paragraphes vides laissés après retrait des images
        tempDiv.querySelectorAll('p').forEach(p => {
            if (!p.textContent.trim() && !p.querySelector('*')) {
                p.remove();
            }
        });

        if (contentEl) {
            contentEl.innerHTML = tempDiv.innerHTML;
        }

        // 2. RENDU DU MÉDIA EN HAUT (IMAGE UNIQUE OU CARROUSEL)
        if (mediaContainer) {
            mediaContainer.innerHTML = '';

            if (articleImages.length === 0) {
                mediaContainer.classList.add('d-none');
            } else if (articleImages.length === 1) {
                // 1 seule photo -> Bannière élégante
                mediaContainer.innerHTML = `
                    <div class="position-relative overflow-hidden rounded-4 shadow-sm bg-light mb-4 text-center">
                        <img src="${articleImages[0]}" alt="${news.titre}" class="img-fluid rounded-4 w-100 modal-zoomable-img" style="max-height: 380px; object-fit: cover; cursor: zoom-in;">
                    </div>
                `;
                mediaContainer.classList.remove('d-none');
            } else {
                // 2+ photos -> Carrousel interactif Bootstrap
                const carouselId = `carousel-news-${news.id}`;
                let indicatorsHtml = '';
                let itemsHtml = '';

                articleImages.forEach((imgUrl, idx) => {
                    const activeClass = idx === 0 ? 'active' : '';
                    const ariaCurrent = idx === 0 ? 'aria-current="true"' : '';

                    indicatorsHtml += `
                        <button type="button" data-bs-target="#${carouselId}" data-bs-slide-to="${idx}" class="${activeClass}" ${ariaCurrent} aria-label="Photo ${idx + 1}"></button>
                    `;

                    itemsHtml += `
                        <div class="carousel-item ${activeClass}">
                            <img src="${imgUrl}" alt="${news.titre} - Photo ${idx + 1}" class="d-block w-100 modal-zoomable-img" style="max-height: 400px; object-fit: cover; cursor: zoom-in;">
                        </div>
                    `;
                });

                mediaContainer.innerHTML = `
                    <div id="${carouselId}" class="carousel slide rounded-4 overflow-hidden shadow-sm mb-4" data-bs-ride="carousel">
                        <div class="carousel-indicators mb-2">
                            ${indicatorsHtml}
                        </div>
                        <div class="carousel-inner">
                            ${itemsHtml}
                        </div>
                        <button class="carousel-control-prev" type="button" data-bs-target="#${carouselId}" data-bs-slide="prev">
                            <span class="carousel-control-prev-icon rounded-circle bg-dark bg-opacity-50 p-3" aria-hidden="true"></span>
                            <span class="visually-hidden">Précédent</span>
                        </button>
                        <button class="carousel-control-next" type="button" data-bs-target="#${carouselId}" data-bs-slide="next">
                            <span class="carousel-control-next-icon rounded-circle bg-dark bg-opacity-50 p-3" aria-hidden="true"></span>
                            <span class="visually-hidden">Suivant</span>
                        </button>
                    </div>
                `;
                mediaContainer.classList.remove('d-none');
            }
        }

        // 3. RENDU DE LA VIDÉO EN BAS
        if (bottomMediaContainer) {
            if (news.video) {
                bottomMediaContainer.innerHTML = `
                    <div class="mt-4 pt-3 border-top">
                        <h6 class="fw-bold text-royal mb-3"><i class="bi bi-camera-reels-fill text-primary me-2"></i>Vidéo associée :</h6>
                        ${buildVideoEmbedHtml(news.video)}
                    </div>
                `;
                bottomMediaContainer.classList.remove('d-none');
            } else {
                bottomMediaContainer.innerHTML = '';
                bottomMediaContainer.classList.add('d-none');
            }
        }

        if (externalLinkBtn) {
            if (news.lien && news.lien.trim() !== '') {
                externalLinkBtn.href = news.lien;
                externalLinkBtn.classList.remove('d-none');
            } else {
                externalLinkBtn.classList.add('d-none');
            }
        }

        // Activation du zoom Lightbox sur les images (y compris celles du carrousel)
        modalEl.querySelectorAll('img').forEach(img => {
            if (img.closest('.modal-footer') || img.id === 'lightboxImage') return;
            img.style.cursor = 'zoom-in';
            img.addEventListener('click', (e) => {
                e.stopPropagation();
                window.openLightboxImage(img.src, news.titre);
            });
        });

        if (window.bootstrap && bootstrap.Modal) {
            const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
            modal.show();
        }
    }

    // ============================================================
    // FILTRES & OFFCANVAS
    // ============================================================

    function setupCategoryFilters() {
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                filterButtons.forEach(b => { b.classList.remove('active', 'btn-primary'); b.classList.add('btn-outline-primary'); });
                btn.classList.add('active', 'btn-primary'); btn.classList.remove('btn-outline-primary');
                currentCategory = btn.getAttribute('data-category') || 'all';
                renderNewsSection(allNews);
            });
        });
    }

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
                        ${imgUrl ? `<img src="${imgUrl}" alt="${news.titre}" class="rounded-3 flex-shrink-0" style="width: 75px; height: 75px; object-fit: cover;" onerror="this.style.display='none'">` : ''}
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
        offcanvasBody.querySelectorAll('.btn-open-news-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const id = parseInt(btn.getAttribute('data-news-id'), 10);
                const news = allNews.find(n => n.id === id);
                if (news) {
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

    function renderNewsPreview(news) {
        if (!previewCard) return;
        previewCard.innerHTML = `
            <div class="d-flex">
                <div class="me-3"><i class="bi bi-newspaper fs-1 text-royal"></i></div>
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

    function renderErrorState() {
        const html = `
            <div class="text-center py-5">
                <i class="bi bi-wifi-off fs-1 text-muted"></i>
                <h5 class="fw-bold text-muted mt-2">Impossible de charger les actualités</h5>
                <button type="button" class="btn btn-primary rounded-pill px-4" onclick="location.reload()"><i class="bi bi-arrow-clockwise me-1"></i>Réessayer</button>
            </div>`;
        if (sectionContent) sectionContent.innerHTML = html;
        if (offcanvasBody) offcanvasBody.innerHTML = html;
    }

    function renderEmptyState() {
        if (sectionContent) {
            sectionContent.innerHTML = `<div class="text-center py-5"><i class="bi bi-newspaper fs-1 text-muted"></i><h5 class="fw-bold text-muted mt-2">Aucune actualité pour le moment</h5></div>`;
        }
        if (offcanvasBody) {
            offcanvasBody.innerHTML = `<div class="alert alert-info border-0 rounded-3"><i class="bi bi-info-circle me-2"></i>Aucune actualité disponible pour le moment.</div>`;
        }
    }
});