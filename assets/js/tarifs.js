/**
 * Dynamic Tarifs Loader
 * Loads pricing information from CSV and displays in modal
 */
document.addEventListener('DOMContentLoaded', async () => {
    const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQcCUH9nb_MQuxaPOsXVS65dhj4RhjSDgsIJCGbWitnBp7EdXmjDe_9WdqDQ2Fo074-q9mS08hf7Muo/pub?gid=1223231267&single=true&output=csv';

    const tarifsModalBody = document.querySelector('#tarifsModal .modal-body');

    if (!tarifsModalBody) return;

    try {
        const tarifs = await CsvLoader.fetchCsv(CSV_URL);

        if (!tarifs || tarifs.length === 0) {
            console.warn('No tarifs data found');
            return;
        }

        // Group by category
        const byCategory = {};
        tarifs.forEach(tarif => {
            const cat = tarif.Categorie || 'Autre';
            if (!byCategory[cat]) byCategory[cat] = [];
            byCategory[cat].push(tarif);
        });

        // Render tarifs
        let html = '';

        // Contribution
        if (byCategory['Contribution']) {
            html += `
                <h6 class="fw-bold text-royal mb-3">Contribution Familiale</h6>
                <ul class="list-unstyled small mb-4">
            `;
            byCategory['Contribution'].forEach(t => {
                html += `<li class="mb-2"><strong>${t.Libelle} :</strong> ${t.Prix}`;
                if (t.Commentaire) html += ` <span class="text-muted fst-italic">(${t.Commentaire})</span>`;
                html += `</li>`;
            });
            html += `</ul>`;
        }

        // Restauration
        if (byCategory['Restauration']) {
            html += `
                <h6 class="fw-bold text-royal mb-3 mt-4">Restauration</h6>
                <ul class="list-unstyled small mb-4">
            `;
            byCategory['Restauration'].forEach(t => {
                html += `<li class="mb-2"><strong>${t.Libelle} :</strong> ${t.Prix}`;
                if (t.Commentaire) html += ` <span class="text-muted fst-italic">(${t.Commentaire})</span>`;
                html += `</li>`;
            });
            html += `</ul>`;
        }

        // Périscolaire
        if (byCategory['Periscolaire']) {
            html += `
                <h6 class="fw-bold text-royal mb-3 mt-4">Périscolaire</h6>
                <ul class="list-unstyled small mb-4">
            `;
            byCategory['Periscolaire'].forEach(t => {
                html += `<li class="mb-2"><strong>${t.Libelle} :</strong> ${t.Prix}`;
                if (t.Commentaire) html += ` <span class="text-muted fst-italic">(${t.Commentaire})</span>`;
                html += `</li>`;
            });
            html += `</ul>`;
        }

        // Other categories
        Object.keys(byCategory).forEach(cat => {
            if (cat !== 'Contribution' && cat !== 'Restauration' && cat !== 'Periscolaire') {
                html += `
                    <h6 class="fw-bold text-royal mb-3 mt-4">${cat}</h6>
                    <ul class="list-unstyled small mb-4">
                `;
                byCategory[cat].forEach(t => {
                    html += `<li class="mb-2"><strong>${t.Libelle} :</strong> ${t.Prix}`;
                    if (t.Commentaire) html += ` <span class="text-muted fst-italic">(${t.Commentaire})</span>`;
                    html += `</li>`;
                });
                html += `</ul>`;
            }
        });

        html += `
            <div class="alert alert-light border-start border-4 border-primary mt-4">
                <small><i class="bi bi-info-circle me-2"></i>Pour toute question sur les tarifs, contactez le secrétariat.</small>
            </div>
        `;

        tarifsModalBody.innerHTML = html;

    } catch (error) {
        console.error('Error loading tarifs:', error);
    }
});
