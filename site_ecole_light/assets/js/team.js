// team.js - Load and display team members from CSV
// CSV Structure: Cycle,Classe,Nom,Role,Email

const TEAM_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQcCUH9nb_MQuxaPOsXVS65dhj4RhjSDgsIJCGbWitnBp7EdXmjDe_9WdqDQ2Fo074-q9mS08hf7Muo/pub?gid=1154078992&single=true&output=csv&t=' + Date.now();

// Utility functions for CSV loading
async function loadCSV(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch CSV: ${response.statusText}`);
        }
        const text = await response.text();
        return parseCSV(text);
    } catch (error) {
        console.error('Error fetching CSV:', error);
        throw error;
    }
}

function parseCSV(csvText) {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    // Helper to parse a line respecting quotes
    const parseLine = (line) => {
        const result = [];
        let start = 0;
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            if (line[i] === '"') {
                inQuotes = !inQuotes;
            } else if (line[i] === ',' && !inQuotes) {
                let field = line.substring(start, i).trim();
                // Remove surrounding quotes if present
                if (field.startsWith('"') && field.endsWith('"')) {
                    field = field.slice(1, -1).replace(/""/g, '"');
                }
                result.push(field);
                start = i + 1;
            }
        }
        // Add last field
        let field = line.substring(start).trim();
        if (field.startsWith('"') && field.endsWith('"')) {
            field = field.slice(1, -1).replace(/""/g, '"');
        }
        result.push(field);
        return result;
    };

    // Parse headers
    const headers = parseLine(lines[0]);
    const result = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseLine(lines[i]);
        const obj = {};
        const len = Math.min(headers.length, values.length);

        for (let j = 0; j < len; j++) {
            const headerName = headers[j];
            if (headerName) {
                obj[headerName] = values[j];
            }
        }
        if (Object.keys(obj).length > 0) {
            result.push(obj);
        }
    }
    return result;
}


document.addEventListener('DOMContentLoaded', async function () {
    try {
        const teamData = await loadCSV(TEAM_CSV_URL);
        renderTeamSections(teamData);
        initializeAccordion();
    } catch (error) {
        console.error('Error loading team data:', error);
        document.getElementById('team-content').innerHTML =
            '<div class="alert alert-warning">Erreur lors du chargement des données de l\'équipe.</div>';
    }
});

function renderTeamSections(data) {
    // Group by Cycle
    const maternelle = data.filter(m => m.Cycle === 'Maternelle');
    const elementaire = data.filter(m => m.Cycle === 'Elementaire');
    const direction = data.filter(m => m.Cycle === 'Direction');
    const adminMembers = data.filter(m => m.Cycle === 'Administration');
    const serviceMembers = data.filter(m => m.Cycle === 'Services');
    const associations = data.filter(m => m.Cycle === 'Associations');

    let html = '';

    // Direction
    if (direction.length > 0) {
        html += renderDirectionSection(direction);
    }

    // Maternelle - Condensed style like Elementary
    if (maternelle.length > 0) {
        html += renderMaternelleCondensed(maternelle);
    }

    // Élémentaire
    if (elementaire.length > 0) {
        html += renderElementaireSection(elementaire);
    }

    // Services & Support (Accordion)
    if (adminMembers.length > 0 || serviceMembers.length > 0) {
        html += renderServicesAccordion(adminMembers, serviceMembers);
    }

    // Associations - Condensed style
    if (associations.length > 0) {
        html += renderAssociationsCondensed(associations);
    }

    document.getElementById('team-content').innerHTML = html;

    // Presentation Chef (Dynamic)
    if (direction.length > 0) {
        renderPresentationChef(direction);
    }

    // Refresh AOS to detect dynamically added elements
    if (typeof AOS !== 'undefined') {
        AOS.refresh();
    }
}

function renderPresentationChef(members) {
    const container = document.getElementById('presentation-chef-container');
    if (!container) return; // Only exists on home page

    const chef = members.find(m => m.Role && m.Role.toLowerCase().includes('chef'));
    if (!chef) {
        container.innerHTML = ''; // Clear loader if no chef found
        return;
    }

    // Director Card style (matches Snippet 1 design)
    const html = `
        <div class="director-card mt-3">
            <div class="director-avatar"><i class="bi bi-person-fill"></i></div>
            <div>
                <div class="fw-bold text-royal" style="font-size:.95rem;">${chef.Nom}</div>
                <div class="text-muted" style="font-size:.82rem;">${chef.Role}</div>
            </div>
            <a href="mailto:direction@ecolesaintvincent.fr" class="btn btn-sm btn-outline-primary rounded-pill ms-auto" style="font-size:.78rem; padding:.25rem .8rem;">
                <i class="bi bi-envelope me-1"></i>Contact
            </a>
        </div>
    `;

    container.innerHTML = html;
}

function renderDirectionSection(members) {
    const chef = members.find(m => m.Role && m.Role.toLowerCase().includes('chef'));
    if (!chef) return '';

    return `
        <div class="row justify-content-center mb-5">
            <div class="col-md-4" data-aos="zoom-in">
                <div class="text-center">
                    <div class="avatar mx-auto mb-3 bg-white shadow-lg rounded-circle"
                        style="width: 140px; height: 140px; display: flex; align-items: center; justify-content: center;">
                        <i class="bi bi-person-fill display-1 text-primary"></i>
                    </div>
                    <h4 class="fw-bold text-royal">${chef.Nom}</h4>
                    <p class="text-primary fw-bold mb-0">${chef.Role || 'Chef d\'Établissement'}</p>
                </div>
            </div>
        </div>
    `;
}

function renderMaternelleCondensed(members) {
    // Separate teachers from ASEM
    const teachers = members.filter(m => !m.Role || !m.Role.includes('ASEM'));
    const asemList = members.filter(m => m.Role && m.Role.includes('ASEM'));

    // Group teachers by level
    const levels = {
        'PS': [],
        'MS': [],
        'GS': []
    };

    teachers.forEach(m => {
        const cls = m.Classe || '';
        if (cls.includes('PS')) levels['PS'].push(m);
        else if (cls.includes('MS')) levels['MS'].push(m);
        else if (cls.includes('GS')) levels['GS'].push(m);
    });

    // Create a map of ASEM by class
    const asemByClass = {};
    asemList.forEach(asem => {
        const cls = asem.Classe || '';
        if (cls && cls !== 'ASEM') {
            if (!asemByClass[cls]) asemByClass[cls] = [];
            asemByClass[cls].push(asem);
        }
    });

    // Find polyvalent ASEM (those with Classe === 'ASEM')
    const polyvalentASEM = asemList.filter(a => a.Classe === 'ASEM');

    let html = `
        <div class="mb-5" data-aos="fade">
            <h4 class="fw-bold text-royal mb-4 ps-3 border-start border-4 border-primary">Maternelle</h4>
            <div class="row g-3">
    `;

    // Render one card per level
    const levelConfig = {
        'PS': { name: 'Petite Section', badge: 'PS' },
        'MS': { name: 'Moyenne Section', badge: 'MS' },
        'GS': { name: 'Grande Section', badge: 'GS' }
    };

    Object.keys(levelConfig).forEach(levelKey => {
        const config = levelConfig[levelKey];
        const levelTeachers = levels[levelKey];

        if (levelTeachers.length > 0) {
            html += `
                <div class="col-md-4">
                    <div class="card border-0 shadow-sm h-100 hover-lift" style="transition: all 0.3s ease;">
                        <div class="card-body p-3">
                            <div class="d-flex align-items-center mb-3">
                                <span class="material-icons text-info me-2">palette</span>
                                <h6 class="fw-bold text-info mb-0">${config.name}</h6>
                            </div>
            `;

            // List all classes for this level
            levelTeachers.forEach(teacher => {
                const teacherClass = teacher.Classe || '';
                const classASEM = asemByClass[teacherClass] || [];

                html += `<p class="mb-1"><strong>${teacherClass}</strong> : ${teacher.Nom}</p>`;

                // Add ASEM for this class
                if (classASEM.length > 0) {
                    classASEM.forEach(asem => {
                        html += `<p class="mb-2 small text-muted">ASEM : ${asem.Nom}</p>`;
                    });
                } else {
                    html += `<br>`;
                }
            });

            html += `
                        </div>
                    </div>
                </div>
            `;
        }
    });

    html += `
            </div>
    `;

    // ASEM Polyvalentes with smart separator logic
    if (polyvalentASEM.length > 0) {
        let asemNames;
        if (polyvalentASEM.length === 1) {
            asemNames = polyvalentASEM[0].Nom;
        } else if (polyvalentASEM.length === 2) {
            asemNames = polyvalentASEM.map(m => m.Nom).join(' & ');
        } else {
            // 3 or more: use commas and & for last two
            const names = polyvalentASEM.map(m => m.Nom);
            const lastTwo = names.slice(-2).join(' & ');
            const rest = names.slice(0, -2);
            asemNames = rest.length > 0 ? rest.join(', ') + ', ' + lastTwo : lastTwo;
        }

        html += `
            <div class="alert alert-info d-flex align-items-center mt-4 border-0 shadow-sm">
                <i class="bi bi-info-circle-fill me-2"></i>
                <span><strong>ASEM Polyvalentes</strong> : ${asemNames}</span>
            </div>
        `;
    }

    html += `</div>`;
    return html;
}

function renderElementaireSection(members) {
    // Group by level
    const levels = {
        'CP': [],
        'CE1': [],
        'CE2': [],
        'CM1': [],
        'CM2': []
    };

    members.forEach(m => {
        const cls = m.Classe || '';
        if (cls.includes('CP')) levels['CP'].push(m);
        else if (cls.includes('CE1')) levels['CE1'].push(m);
        else if (cls.includes('CE2')) levels['CE2'].push(m);
        else if (cls.includes('CM1')) levels['CM1'].push(m);
        else if (cls.includes('CM2')) levels['CM2'].push(m);
    });

    let html = `
        <div class="mb-5" data-aos="fade">
            <h4 class="fw-bold text-royal mb-4 ps-3 border-start border-4 border-primary">Élémentaire</h4>
            <div class="row g-3">
    `;

    // Render all levels in order
    const levelConfig = {
        'CP': { name: 'Cours Préparatoire', badge: 'CP' },
        'CE1': { name: 'Cours Élémentaire 1', badge: 'CE1' },
        'CE2': { name: 'Cours Élémentaire 2', badge: 'CE2' },
        'CM1': { name: 'Cours Moyen 1', badge: 'CM1' },
        'CM2': { name: 'Cours Moyen 2', badge: 'CM2' }
    };

    Object.keys(levelConfig).forEach(levelKey => {
        const config = levelConfig[levelKey];
        const levelMembers = levels[levelKey];

        if (levelMembers.length > 0) {
            html += `
                <div class="col-md-6 col-lg-4">
                    <div class="card border-0 shadow-sm h-100 hover-lift" style="transition: all 0.3s ease;">
                        <div class="card-body p-3">
                            <div class="d-flex align-items-center mb-2">
                                <span class="material-icons text-info me-2">school</span>
                                <h6 class="fw-bold text-info mb-0">${config.name}</h6>
                            </div>
            `;

            levelMembers.forEach(m => {
                html += `<p class="mb-1"><strong>${m.Classe}</strong> : ${m.Nom}</p>`;
            });

            html += `
                        </div>
                    </div>
                </div>
            `;
        }
    });

    html += `
            </div>
        </div>
    `;

    return html;
}

function renderServicesAccordion(adminMembers, serviceMembers) {
    // Split services into Restauration and Entretien
    const restauration = serviceMembers.filter(m => m.Classe && m.Classe.toLowerCase().includes('restauration'));
    const entretien = serviceMembers.filter(m => m.Classe && m.Classe.toLowerCase().includes('entretien'));

    // Find chef (responsable)
    const chef = serviceMembers.find(m => m.Role && m.Role.toLowerCase().includes('responsable'));

    // De-duplicate personnel
    const deduplicateByName = (arr) => {
        const unique = [];
        const seen = new Set();
        arr.forEach(p => {
            if (!seen.has(p.Nom)) {
                seen.add(p.Nom);
                unique.push(p);
            }
        });
        return unique;
    };

    const uniqueRestauration = deduplicateByName(restauration.filter(m => m !== chef));
    const uniqueEntretien = deduplicateByName(entretien);

    const adminHtml = renderMemberList(adminMembers, "primary");

    let html = `
        <div class="mb-5" data-aos="fade">
            <h4 class="fw-bold text-royal mb-4 ps-3 border-start border-4 border-primary">Services & Supports</h4>
            <div class="accordion shadow-sm rounded-4 overflow-hidden" id="accordionTeam">
    `;

    // Administration accordion
    html += `
        <div class="accordion-item border-0 border-bottom">
            <h2 class="accordion-header" id="headingAdmin">
                <button class="accordion-button collapsed fw-bold text-royal bg-light-fun shadow-none"
                    type="button" data-bs-toggle="collapse" data-bs-target="#collapseAdmin"
                    aria-expanded="false" aria-controls="collapseAdmin">
                    <i class="bi bi-pc-display-horizontal me-2 text-primary"></i>Administration & Gestion
                </button>
            </h2>
            <div id="collapseAdmin" class="accordion-collapse collapse" aria-labelledby="headingAdmin"
                data-bs-parent="#accordionTeam">
                <div class="accordion-body">
                    ${adminHtml}
                </div>
            </div>
        </div>
    `;

    // Services accordion - split layout
    html += `
        <div class="accordion-item border-0">
            <h2 class="accordion-header" id="headingServices">
                <button class="accordion-button collapsed fw-bold text-royal bg-light-fun shadow-none"
                    type="button" data-bs-toggle="collapse" data-bs-target="#collapseServices"
                    aria-expanded="false" aria-controls="collapseServices">
                    <i class="bi bi-tools me-2 text-success"></i>Services Généraux & Restauration
                </button>
            </h2>
            <div id="collapseServices" class="accordion-collapse collapse" aria-labelledby="headingServices"
                data-bs-parent="#accordionTeam">
                <div class="accordion-body">
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <h6 class="fw-bold text-success">Restauration</h6>
    `;

    if (chef) {
        html += `
                            <p class="mb-2"><strong>${chef.Nom}</strong> <span class="small text-muted">(Responsable)</span></p>
        `;
    }

    if (uniqueRestauration.length > 0) {
        html += `
                            <ul class="list-unstyled small text-muted ps-3 border-start">
                                ${uniqueRestauration.map(m => `<li>${m.Nom}</li>`).join('')}
                            </ul>
        `;
    }

    html += `
                        </div>
                        <div class="col-md-6 mb-3">
                            <h6 class="fw-bold text-success">Entretien & Maintenance</h6>
    `;

    if (uniqueEntretien.length > 0) {
        html += `
                            <ul class="list-unstyled small text-muted ps-3 border-start">
                                ${uniqueEntretien.map(m => `<li>${m.Nom}</li>`).join('')}
                            </ul>
        `;
    }

    html += `
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    html += `
            </div>
        </div>
    `;

    return html;
}

function renderAssociationsCondensed(members) {
    const ogec = members.filter(m => m.Classe && m.Classe.toUpperCase() === 'OGEC');
    const apel = members.filter(m => m.Classe && m.Classe.toUpperCase() === 'APEL');

    let html = `
        <div class="row text-center mt-5">
    `;

    // OGEC
    html += `
            <div class="col-md-6 mb-4">
                <div class="p-4 bg-light-fun rounded-4 h-100">
                    <h4 class="fw-bold text-royal">O.G.E.C.</h4>
                    <p class="text-muted small">Organisme de Gestion de l'Enseignement Catholique.<br>Gestion économique et sociale de l'école.</p>
                    <div class="d-flex gap-2 justify-content-center">
                        <a href="mailto:ogec@ecolesaintvincent.fr" class="btn btn-sm btn-outline-primary rounded-pill">
                            <i class="bi bi-envelope me-1"></i>Contacter
                        </a>
                        <button class="btn btn-sm btn-action rounded-pill" data-bs-toggle="modal" data-bs-target="#ogecModal">Plus d'infos</button>
                    </div>


                </div>
            </div>
    `;

    // APEL
    html += `
            <div class="col-md-6 mb-4">
                <div class="p-4 bg-light-fun rounded-4 h-100">
                    <h4 class="fw-bold text-royal">A.P.E.L.</h4>
                    <p class="text-muted small">Association des Parents d'élèves de l'Enseignement Libre.<br>Participe à l'animation et à la vie de l'école.</p>
                    <div class="d-flex gap-2 justify-content-center">
                        <a href="mailto:apel@ecolesaintvincent.fr" class="btn btn-sm btn-outline-primary rounded-pill">
                            <i class="bi bi-envelope me-1"></i>Contacter
                        </a>
                        <button class="btn btn-sm btn-action rounded-pill" data-bs-toggle="modal" data-bs-target="#apelModal">Plus d'infos</button>
                    </div>


                </div>
            </div>
        </div>
    `;

    return html;
}

function renderMemberList(members, colorClass) {
    if (members.length === 0) return '';

    let html = '<div class="row">';
    members.forEach(m => {
        html += `
            <div class="col-md-6 mb-3">
                <h6 class="fw-bold text-${colorClass}">${m.Classe || m.Role || 'Membre'}</h6>
                <p class="mb-1"><strong>${m.Nom}</strong></p>
                ${m.Role && m.Classe ? `<p class="small text-muted">${m.Role}</p>` : ''}
                ${m.Email ? `<p class="small text-muted"><i class="bi bi-envelope me-1"></i><a href="mailto:${m.Email}" class="text-decoration-none text-muted">Contact</a></p>` : ''}
            </div>
        `;
    });
    html += '</div>';
    return html;
}

function initializeAccordion() {
    // Make accordion exclusive - only one open at a time
    const accordionElement = document.getElementById('accordionTeam');
    if (!accordionElement) return;

    const accordionButtons = accordionElement.querySelectorAll('.accordion-button');
    accordionButtons.forEach(button => {
        button.addEventListener('click', function () {
            const target = this.getAttribute('data-bs-target');
            const allCollapses = accordionElement.querySelectorAll('.accordion-collapse');

            allCollapses.forEach(collapse => {
                if (collapse.id !== target.substring(1)) {
                    const bsCollapse = bootstrap.Collapse.getInstance(collapse);
                    if (bsCollapse) {
                        bsCollapse.hide();
                    }
                }
            });
        });
    });
}
