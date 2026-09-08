// =============================================================
//  CONFIGURATION ANNUELLE DES BANDEAUX — events-config.js
//  Ce fichier est le SEUL à modifier chaque année.
//  Le HTML se génère automatiquement depuis cette config.
// =============================================================
//
//  THÈMES :
//    apel        → Événements APEL  (apéros, soirée familles…)
//    ogec        → Kermesse
//    fournitures → Rentrée scolaire / Fournitures
//
//  Pour AFFICHER un bandeau  → visible: true
//  Pour MASQUER  un bandeau  → visible: false
//
//  URL :
//    "https://..."    → lien externe (nouvel onglet automatique)
//    "page.html"      → lien interne (même onglet)
//    "#monModal"      → ouvre une modale Bootstrap
// =============================================================

const BANNERS_CONFIG = {

    // -------------------------------------------------------
    //  APEL — Événements & ventes
    // -------------------------------------------------------
    apel: {
        visible:     true,
        heading:     "Événements APEL",
        headingIcon: "bi-bag-heart-fill",
        style:       { bg: "#f6ebd9", text: "#5c4018", border: "#d4a942" },
        events: [
            {
                visible: true,
                label:   "Apéro des Papas",
                icon:    "🍻",
                color:   "#5c8c42ff",
                url:     "https://www.helloasso.com/associations/apel-st-vincent-ste-luce-sur-loire/evenements/apero-des-papas-2026"
            },
            {
                visible: true,
                label:   "Apéro des Mamans",
                icon:    "🍸",
                color:   "#f39e36ff",
                url:     "https://www.helloasso.com/associations/apel-st-vincent-ste-luce-sur-loire/evenements/apero-des-mamans-2026-1"
            },
            {
                visible: true,
                label:   "Vente Gâteaux Bijou",
                icon:    "🍪",
                color:   "#d721a9ff",
                url:     "https://www.helloasso.com/associations/apel-st-vincent-ste-luce-sur-loire/boutiques/vente-gateaux-bijou-rentree-2026-2027"
            },
            {
                visible: false,
                label:   "Soirée des Familles",
                icon:    "🎉",
                color:   "#8b5cf6",
                url:     "soiree.html"
            },
        ]
    },

    // -------------------------------------------------------
    //  OGEC — Kermesse et autres événements
    // -------------------------------------------------------
    ogec: {
        visible:     false,
        heading:     "OGEC",
        headingIcon: "bi-ticket-perforated-fill",
        style:       { bg: "#ffe8a1", text: "#856404", border: "#f59e0b" },
        events: [
            {
                visible: false,
                label:   "Kermesse de l'École",
                icon:    "🎪",
                color:   "#3cbdecff",
                url:     "kermesse.html"
            },
        ]
    },

    // -------------------------------------------------------
    //  FOURNITURES — Rentrée scolaire
    // -------------------------------------------------------
    fournitures: {
        visible:     false,
        heading:     "Préparation de la rentrée !",
        headingIcon: "bi-pencil-fill",
        style:       { bg: "#dcfce7", text: "#166534", border: "#22c55e" },
        events: [
            {
                visible: false,
                label:   "Voir les listes",
                icon:    "✏️",
                color:   "#16a34a",
                url:     "#fournituresModal"
            },
            {
                visible: true,
                label:   "Commander en ligne (Code : 26RH1H3)",
                icon:    "🛒",
                color:   "#166534",
                url:     "https://www.rentreediscount.com/etablissement/SAINT-VINCENT-51836691.html"
            },
        ]
    }

};


// =============================================================
//  MOTEUR DE RENDU — ne pas modifier
// =============================================================

(function () {

    // Génère un bouton selon le type d'URL
    function renderButton(ev) {
        const isExternal = ev.url.startsWith('http');
        const isModal    = ev.url.startsWith('#');
        const style = 'background-color:' + ev.color + '; color:#fff; border:none; font-size:.8rem;';
        const cls   = 'btn btn-sm rounded-pill fw-bold px-3';
        const inner = ev.icon + ' ' + ev.label;

        if (isModal) {
            return '<button class="' + cls + '" style="' + style + '"'
                + ' data-bs-toggle="modal" data-bs-target="' + ev.url + '">'
                + inner + '</button>';
        }
        return '<a href="' + ev.url + '" class="' + cls + '" style="' + style + '"'
            + (isExternal ? ' target="_blank" rel="noopener"' : '')
            + '>' + inner + '</a>';
    }

    function buildBannerHTML() {
        const groups = [];
        let activeStyle = null;

        Object.values(BANNERS_CONFIG).forEach(function (section) {
            if (!section.visible) return;
            const visibleEvents = (section.events || []).filter(function (ev) { return ev.visible; });
            if (!visibleEvents.length) return;

            if (!activeStyle && section.style) {
                activeStyle = section.style;
            }

            const s = section.style || {};
            const icon = '<i class="bi ' + (section.headingIcon || 'bi-info-circle')
                + ' me-1" style="color:' + (s.border || 'currentColor') + ';"></i>';
            const label = '<strong>' + icon + section.heading + '&thinsp;:&thinsp;</strong>';
            const buttons = visibleEvents.map(renderButton).join('');

            groups.push('<span class="d-inline-flex align-items-center flex-wrap gap-2">'
                + label + buttons + '</span>');
        });

        if (!groups.length) return '';

        // Style dynamique depuis la section active (ex: apel.style.bg)
        const bg          = (activeStyle && activeStyle.bg)     ? activeStyle.bg     : '#ffe58f';
        const textColor   = (activeStyle && activeStyle.text)   ? activeStyle.text   : '#4a2c00';
        const borderColor = (activeStyle && activeStyle.border) ? activeStyle.border : '#d97706';

        // Tous les groupes dans UNE seule barre, séparés par un | discret
        const inner = groups.join(
            '<span class="mx-2 opacity-25" style="border-left:1px solid currentColor; height:1.2em; display:inline-block; vertical-align:middle;"></span>'
        );

        return '<div class="alert alert-dismissible fade show text-center rounded-0 mb-0 py-2 border-0"'
            + ' role="alert"'
            + ' style="position:relative; background-color:' + bg + '; color:' + textColor + ';'
            + ' border-top:3px solid ' + borderColor + ' !important; box-shadow:0 2px 8px rgba(0,0,0,0.08);">'
            + '<span class="d-inline-flex flex-wrap justify-content-center align-items-center gap-3">'
            + inner
            + '</span>'
            + '<button type="button" class="btn-close" data-bs-dismiss="alert"'
            + ' aria-label="Fermer" style="position:absolute; right:.75rem; top:50%; transform:translateY(-50%); font-size:.75rem;"></button>'
            + '</div>';
    }

    function injectBanners() {
        const container = document.getElementById('banners-container');
        if (!container) return;
        container.innerHTML = buildBannerHTML();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectBanners);
    } else {
        injectBanners();
    }

})();
