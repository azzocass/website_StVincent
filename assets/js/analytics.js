/**
 * Google Analytics 4 — Custom Event Tracking
 * Tracks user interactions across index.html and kermesse.html
 * 
 * GA4 Property: G-TLTNC3EDD4
 * 
 * Events fired:
 *   INDEX.HTML
 *   ─ click_kermesse_banner    → Clic sur bannière Kermesse (S'inscrire)
 *   ─ click_apel_banner        → Clic sur bannière APEL/Soirée
 *   ─ click_ecole_directe      → Clic sur bouton École Directe
 *   ─ click_tab                → Clic sur un onglet (Présentation / Projet / Infos)
 *   ─ click_tarifs             → Clic sur Consulter les prix
 *   ─ click_reglements         → Clic sur Voir les détails (règlements)
 *   ─ click_fournitures        → Clic sur Liste du matériel
 *   ─ click_agenda_complet     → Clic sur Voir tout l'agenda
 *   ─ click_menu_complet       → Clic sur Voir le Menu complet
 *   ─ click_lire_la_suite      → Clic sur Lire la suite (présentation)
 *   ─ click_itineraire         → Clic sur Itinéraire Google Maps
 *   ─ click_telephone          → Clic sur un numéro de téléphone
 *   ─ click_helloasso_footer   → Clic sur HelloAsso dans le footer
 *   ─ click_helloasso_modal    → Clic sur HelloAsso dans le modal APEL
 *   ─ click_facebook           → Clic sur Facebook
 *   ─ click_dark_mode          → Clic sur toggle dark mode
 *
 *   KERMESSE.HTML
 *   ─ kermesse_submit_click    → Clic sur le bouton Envoyer inscription
 *   ─ kermesse_submit_success  → Inscription validée avec succès
 *   ─ kermesse_lookup          → Clic sur Vérifier inscription
 *   ─ kermesse_retour_site     → Clic sur Retour au site
 *   ─ click_fab_contact        → Clic sur le bouton flottant Contact
 */

(function () {
    'use strict';

    // Safety: don't crash if gtag is not loaded
    function track(eventName, params) {
        if (typeof gtag === 'function') {
            gtag('event', eventName, params || {});
        }
    }

    // Helper: attach click tracker to element(s) matching a CSS selector
    function trackClick(selector, eventName, params) {
        document.querySelectorAll(selector).forEach(function (el) {
            el.addEventListener('click', function () {
                track(eventName, params || {});
            });
        });
    }

    // Helper: attach click tracker by element ID
    function trackById(id, eventName, params) {
        var el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', function () {
                track(eventName, params || {});
            });
        }
    }

    // ─────────────────────────────────────────────
    // INDEX.HTML — Bannières
    // ─────────────────────────────────────────────

    // Bannière Kermesse → lien "S'inscrire"
    trackClick(
        '.alert-warning a[href="kermesse.html"]',
        'click_kermesse_banner',
        { link_text: 'S\'inscrire Kermesse' }
    );

    // Bannière APEL → lien boutique/soirée
    trackClick(
        '.alert-info a[href*="helloasso"]',
        'click_apel_banner',
        { link_text: 'Bannière APEL' }
    );

    // ─────────────────────────────────────────────
    // INDEX.HTML — Navigation & Boutons
    // ─────────────────────────────────────────────

    // École Directe
    trackClick(
        'a[href*="ecoledirecte.com"]',
        'click_ecole_directe',
        { link_text: 'École Directe' }
    );

    // Tabs : Présentation / Projet Éducatif / Infos Pratiques
    trackById('pills-home-tab', 'click_tab', { tab_name: 'Présentation' });
    trackById('pills-projet-tab', 'click_tab', { tab_name: 'Projet Éducatif' });
    trackById('pills-infos-tab', 'click_tab', { tab_name: 'Infos Pratiques' });

    // Tarifs
    trackClick(
        'button[data-bs-target="#tarifsModal"]',
        'click_tarifs',
        { link_text: 'Consulter les prix' }
    );

    // Règlements
    trackClick(
        'button[data-bs-target="#reglementModal"]',
        'click_reglements',
        { link_text: 'Voir les détails' }
    );

    // Fournitures
    trackClick(
        'button[data-bs-target="#fournituresModal"]',
        'click_fournitures',
        { link_text: 'Liste du matériel' }
    );

    // Agenda complet (offcanvas)
    trackClick(
        'button[data-bs-target="#offcanvasAgenda"]',
        'click_agenda_complet',
        { link_text: 'Voir tout l\'agenda' }
    );

    // Menu cantine complet (offcanvas)
    trackClick(
        'button[data-bs-target="#offcanvasCantine"]',
        'click_menu_complet',
        { link_text: 'Voir le Menu complet' }
    );

    // Lire la suite (présentation)
    trackClick(
        '#pres-fade button',
        'click_lire_la_suite',
        { link_text: 'Lire la suite' }
    );

    // Itinéraire Google Maps
    trackClick(
        'a[href*="google.com/maps/dir"]',
        'click_itineraire',
        { link_text: 'Itinéraire' }
    );

    // ─────────────────────────────────────────────
    // INDEX.HTML — Footer
    // ─────────────────────────────────────────────

    // HelloAsso — footer
    trackClick(
        'footer a[href*="helloasso"]',
        'click_helloasso_footer',
        { link_text: 'HelloAsso Footer' }
    );

    // HelloAsso — modal APEL
    trackClick(
        '.modal a[href*="helloasso"]',
        'click_helloasso_modal',
        { link_text: 'HelloAsso Modal APEL' }
    );

    // Facebook
    trackClick(
        'a[href*="facebook.com"]',
        'click_facebook',
        { link_text: 'Facebook' }
    );

    // Numéros de téléphone
    trackClick(
        'a[href^="tel:"]',
        'click_telephone',
        { link_text: 'Téléphone' }
    );

    // Dark mode
    trackById('theme-toggle', 'click_dark_mode', { link_text: 'Dark Mode Toggle' });

    // ─────────────────────────────────────────────
    // KERMESSE.HTML
    // ─────────────────────────────────────────────

    // Bouton Envoyer inscription (clic)
    trackById('btnSubmit', 'kermesse_submit_click', { link_text: 'Envoyer inscription' });

    // Bouton Vérifier inscription
    trackClick(
        'button[onclick*="chargerMesInscriptions"]',
        'kermesse_lookup',
        { link_text: 'Vérifier inscription' }
    );

    // Retour au site (kermesse navbar)
    trackClick(
        'a.btn-outline-primary[href="index.html"]',
        'kermesse_retour_site',
        { link_text: 'Retour au site' }
    );

    // FAB Contact
    trackById('fabContact', 'click_fab_contact', { link_text: 'FAB Contact Email' });

})();
