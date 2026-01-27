/**
 * Tarifs Logic
 * Loads tariffs from CSV and displays them.
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Configuration
    const CSV_URL = 'assets/csv_templates/modele_tarifs.csv';

    const container = document.getElementById('tarifs-container');
    if (!container) return;

    // 1. Fetch Data
    const tariffs = await CsvLoader.fetchCsv(CSV_URL);

    // 2. Group by Category
    const categories = {
        'Contribution': [],
        'Restauration': [],
        'Periscolaire': []
    };

    tariffs.forEach(t => {
        if (t.Categorie) {
            // Fuzzy match
            const cat = t.Categorie.toLowerCase();
            if (cat.includes('contribution')) categories['Contribution'].push(t);
            else if (cat.includes('restauration')) categories['Restauration'].push(t);
            else if (cat.includes('periscolaire') || cat.includes('périscolaire')) categories['Periscolaire'].push(t);
        }
    });

    // 3. Render
    let html = '';

    // Contribution
    if (categories['Contribution'].length > 0) {
        html += `<h6 class="fw-bold text-primary">Contribution des familles (10 mois)</h6><ul>`;
        categories['Contribution'].forEach(t => {
            // "Niveau A (mensuel)", "45.00 €", "450€ annuel"
            html += `<li>${t.Libelle} : <strong>${t.Prix}</strong> ${t.Commentaire ? `(${t.Commentaire})` : ''}</li>`;
        });
        html += `</ul><small class="text-muted">Réduction de 50% pour le 3ème enfant.</small><hr>`;
    }

    // Restauration
    if (categories['Restauration'].length > 0) {
        html += `<h6 class="fw-bold text-primary">Restauration</h6><ul>`;
        categories['Restauration'].forEach(t => {
            html += `<li>${t.Libelle} : <strong>${t.Prix}</strong></li>`;
        });
        html += `</ul><hr>`;
    }

    // Periscolaire
    if (categories['Periscolaire'].length > 0) {
        html += `<h6 class="fw-bold text-primary">Périscolaire</h6><ul>`;
        categories['Periscolaire'].forEach(t => {
            html += `<li>${t.Libelle} : ${t.Prix} ${t.Commentaire ? `<small class="text-muted">(${t.Commentaire})</small>` : ''}</li>`;
        });
        html += `</ul>`;
    }

    if (html === '') {
        container.innerHTML = '<p class="text-muted">Tarifs non disponibles.</p>';
    } else {
        container.innerHTML = html;
    }
});
