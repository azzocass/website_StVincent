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
            const tiers = [];
            const tierMap = {};
            let useTable = true;

            byCategory['Contribution'].forEach(t => {
                const libelle = t.Libelle || '';
                const isSpecial = libelle.toLowerCase().includes('spécial') || libelle.toLowerCase().includes('special');
                const type = isSpecial ? 'special' : 'ordinaire';
                
                // Extract tier inside parentheses
                const match = libelle.match(/\(([^)]+)\)/);
                if (!match) {
                    useTable = false;
                    return;
                }
                const tier = match[1].replace(/^RFR\s+/i, '').trim();
                
                if (!tierMap[tier]) {
                    tierMap[tier] = { tier, ordinaire: null, special: null };
                    tiers.push(tierMap[tier]);
                }
                
                tierMap[tier][type] = {
                    prix: t.Prix || '',
                    commentaire: t.Commentaire || ''
                };
            });

            if (useTable && tiers.length > 0) {
                html += `
                    <div class="mb-4">
                        <div class="d-flex align-items-center mb-3">
                            <i class="bi bi-piggy-bank text-primary fs-4 me-2"></i>
                            <h6 class="fw-bold text-royal mb-0">Contribution des familles (sur 10 mois)</h6>
                        </div>
                        
                        <div class="alert alert-primary border-0 bg-primary bg-opacity-10 text-primary py-2 px-3 mb-3" style="font-size: 0.85rem; color: var(--color-royal) !important;">
                            <i class="bi bi-info-circle-fill me-2"></i>
                            Déterminée en fonction du <strong>revenu fiscal de référence</strong> divisé par le <strong>nombre de parts</strong> (disponible sur votre avis d'imposition).
                        </div>

                        <div class="table-responsive rounded-3 border">
                            <table class="table table-hover align-middle mb-0" style="font-size: 0.88rem;">
                                <thead>
                                    <tr>
                                        <th class="py-3 px-3 border-0 text-white fw-semibold" style="background-color: var(--color-royal) !important;">Revenu fiscal de référence / parts</th>
                                        <th class="py-3 text-center border-0 text-white fw-semibold" style="background-color: var(--color-royal) !important; width: 25%;">Ordinaire</th>
                                        <th class="py-3 text-center border-0 text-white fw-semibold" style="background-color: var(--color-royal) !important; width: 25%;">Spéciale</th>
                                    </tr>
                                </thead>
                                <tbody>
                `;
                
                tiers.forEach(row => {
                    const ordPrix = row.ordinaire ? row.ordinaire.prix : '-';
                    const ordComm = row.ordinaire && row.ordinaire.commentaire ? row.ordinaire.commentaire : '';
                    const specPrix = row.special ? row.special.prix : '-';
                    const specComm = row.special && row.special.commentaire ? row.special.commentaire : '';
                    
                    html += `
                        <tr>
                            <td class="fw-semibold py-3 px-3">${row.tier}</td>
                            <td class="text-center py-3">
                                <span class="fw-bold text-dark fs-6">${ordPrix}</span>
                                ${ordComm ? `<div class="text-muted small" style="font-size: 0.72rem;">${ordComm}</div>` : ''}
                            </td>
                            <td class="text-center py-3">
                                <span class="fw-bold text-primary fs-6">${specPrix}</span>
                                ${specComm ? `<div class="text-muted small" style="font-size: 0.72rem;">${specComm}</div>` : ''}
                            </td>
                        </tr>
                    `;
                });
                
                html += `
                                </tbody>
                            </table>
                        </div>
                        
                        <div class="d-flex flex-column flex-sm-row justify-content-between gap-2 mt-2 px-1 text-muted" style="font-size: 0.78rem;">
                            <span><i class="bi bi-gift me-1"></i>Soutien facultatif : <strong>+5€/mois</strong>, <strong>+10€/mois</strong> ou au choix.</span>
                            <span><i class="bi bi-people-fill me-1"></i>Réduction de 50% pour le 3ème enfant.</span>
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div class="mb-4">
                        <div class="d-flex align-items-center mb-3">
                            <i class="bi bi-piggy-bank text-primary fs-4 me-2"></i>
                            <h6 class="fw-bold text-royal mb-0">Contribution des familles</h6>
                        </div>
                        <div class="list-group rounded-3 border mb-3">
                `;
                byCategory['Contribution'].forEach(t => {
                    html += `
                        <div class="list-group-item d-flex justify-content-between align-items-center py-2 px-3" style="font-size: 0.88rem;">
                            <div>
                                <span class="fw-medium">${t.Libelle}</span>
                                ${t.Commentaire ? `<div class="text-muted small" style="font-size: 0.72rem;">${t.Commentaire}</div>` : ''}
                            </div>
                            <span class="badge bg-primary rounded-pill fs-6">${t.Prix}</span>
                        </div>
                    `;
                });
                html += `</div></div>`;
            }
        }

        // Restauration
        if (byCategory['Restauration']) {
            html += `
                <div class="mb-4 mt-4">
                    <div class="d-flex align-items-center mb-3">
                        <i class="bi bi-egg-fried text-success fs-4 me-2"></i>
                        <h6 class="fw-bold text-royal mb-0">Restauration Scolaire (Repas)</h6>
                    </div>
                    
                    <div class="row g-2">
            `;
            
            byCategory['Restauration'].forEach(t => {
                let icon = 'bi-egg';
                let colorClass = 'text-success';
                let borderClass = 'border-success-subtle';
                
                if (t.Libelle.toLowerCase().includes('standard') || t.Libelle.toLowerCase().includes('ordinaire')) {
                    icon = 'bi-check-circle-fill';
                    colorClass = 'text-success';
                    borderClass = 'border-success-subtle';
                } else if (t.Libelle.toLowerCase().includes('allergique') || t.Libelle.toLowerCase().includes('panier')) {
                    icon = 'bi-heart-pulse-fill';
                    colorClass = 'text-warning';
                    borderClass = 'border-warning-subtle';
                } else if (t.Libelle.toLowerCase().includes('spécial') || t.Libelle.toLowerCase().includes('special')) {
                    icon = 'bi-star-fill';
                    colorClass = 'text-primary';
                    borderClass = 'border-primary-subtle';
                }
                
                html += `
                    <div class="col-sm-4">
                        <div class="card h-100 border shadow-sm rounded-3">
                            <div class="card-body p-3 text-center">
                                <div class="rounded-circle mx-auto mb-2 d-flex align-items-center justify-content-center bg-light" style="width: 40px; height: 40px;">
                                    <i class="bi ${icon} ${colorClass} fs-5"></i>
                                </div>
                                <div class="small fw-semibold text-muted mb-1">${t.Libelle}</div>
                                <h5 class="fw-bold text-dark mb-0">${t.Prix}</h5>
                                ${t.Commentaire ? `<div class="text-muted small mt-1" style="font-size: 0.75rem;">${t.Commentaire}</div>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }

        // Périscolaire
        if (byCategory['Periscolaire']) {
            html += `
                <div class="mb-3 mt-4">
                    <div class="d-flex align-items-center mb-3">
                        <i class="bi bi-clock text-info fs-4 me-2"></i>
                        <h6 class="fw-bold text-royal mb-0">Accueil Périscolaire &amp; Étude</h6>
                    </div>
                    
                    <div class="list-group rounded-3 border">
            `;
            
            byCategory['Periscolaire'].forEach(t => {
                let icon = 'bi-clock-fill';
                if (t.Libelle.toLowerCase().includes('matin')) {
                    icon = 'bi-brightness-high-fill text-warning';
                } else if (t.Libelle.toLowerCase().includes('soir')) {
                    icon = 'bi-moon-stars-fill text-primary';
                } else if (t.Libelle.toLowerCase().includes('étude') || t.Libelle.toLowerCase().includes('etude')) {
                    icon = 'bi-pencil-square text-info';
                }
                
                html += `
                    <div class="list-group-item d-flex justify-content-between align-items-center py-3 px-3">
                        <div class="d-flex align-items-center">
                            <i class="bi ${icon} fs-5 me-3"></i>
                            <div>
                                <span class="fw-semibold text-dark" style="font-size: 0.92rem;">${t.Libelle}</span>
                                ${t.Commentaire ? `<span class="text-muted ms-2 small" style="font-size: 0.8rem;">(${t.Commentaire})</span>` : ''}
                            </div>
                        </div>
                        <span class="badge bg-light text-royal border fw-bold fs-6 py-2 px-3">${t.Prix}</span>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }

        // Other categories
        Object.keys(byCategory).forEach(cat => {
            if (cat !== 'Contribution' && cat !== 'Restauration' && cat !== 'Periscolaire') {
                html += `
                    <div class="mb-4 mt-4">
                        <div class="d-flex align-items-center mb-3">
                            <div class="bg-secondary bg-opacity-10 rounded-3 p-2 me-2 d-flex align-items-center justify-content-center" style="width: 36px; height: 36px;">
                                <i class="bi bi-gear-fill text-secondary fs-5"></i>
                            </div>
                            <h6 class="fw-bold text-royal mb-0">${cat}</h6>
                        </div>
                        <div class="list-group rounded-3 border">
                `;
                byCategory[cat].forEach(t => {
                    html += `
                        <div class="list-group-item d-flex justify-content-between align-items-center py-2 px-3" style="font-size: 0.88rem;">
                            <div>
                                <span class="fw-semibold">${t.Libelle}</span>
                                ${t.Commentaire ? `<div class="text-muted small" style="font-size: 0.72rem;">${t.Commentaire}</div>` : ''}
                            </div>
                            <span class="badge bg-light text-dark border py-2 px-3 fw-bold fs-6">${t.Prix}</span>
                        </div>
                    `;
                });
                html += `</div></div>`;
            }
        });

        tarifsModalBody.innerHTML = html;

    } catch (error) {
        console.error('Error loading tarifs:', error);
        tarifsModalBody.innerHTML = '<div class="alert alert-danger"><i class="bi bi-exclamation-triangle-fill me-2"></i>Erreur lors du chargement des tarifs. Veuillez réessayer ultérieurement.</div>';
    }
});
