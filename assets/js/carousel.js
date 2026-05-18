// ==========================================
// CONFIGURATION DU CARROUSEL
// ==========================================

// 1. Liste des images disponibles dans le dossier assets/images/carousel/
// Ajoute simplement le nom de ton fichier ici quand tu en ajoutes un nouveau !
const imageFiles = [
    'DSC06043.webp',
    'DSC06044.webp',
    'DSC06073.webp',
    'DSC06075.webp',
    'DSC06082.webp',
    'DSC06091.webp',
    'banner1.webp',
    'banner2.webp',
    'banner3.webp',
    '20202021top01.webp',
    '20202021top11.webp',
    '20202021top12.webp',
    '20202021top20.webp',
    'top_2022_01.webp',
    'top_2022_02.webp',
    'top_2022_04.webp',
    'top_2022_05.webp'
];

// 2. Liste des textes affichés par-dessus les images
// Ils seront piochés aléatoirement !
const texts = [
    { title: 'Bienvenue à Saint Vincent', subtitle: 'Ensemble, vivre une école de toutes les intelligences.' },
    { title: 'Construire son Histoire', subtitle: 'Accompagner chaque enfant sur un chemin de réussite.' },
    { title: 'Au Cœur de Sainte-Luce', subtitle: 'Un établissement catholique ouvert à tous.' },
    { title: 'Grandir Ensemble', subtitle: 'Un cadre bienveillant pour s’épanouir au quotidien.' },
    { title: 'Découvrir et Apprendre', subtitle: 'Des projets pédagogiques innovants pour tous.' }
];

// ==========================================
// LOGIQUE D'AFFICHAGE (Ne pas modifier)
// ==========================================

// Fonction pour mélanger un tableau aléatoirement
function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('carousel-inner-container');
    if (!container) return;

    // Mélanger les images pour ne pas avoir toujours le même ordre
    const shuffledImages = shuffleArray(imageFiles);
    
    // Mélanger les textes pour les assigner aléatoirement
    const shuffledTexts = shuffleArray(texts);

    let html = '';
    
    // On limite à 5-6 images maximum par chargement de page pour que ce soit fluide
    const imagesToDisplay = shuffledImages.slice(0, 6);

    imagesToDisplay.forEach((imgFile, index) => {
        const isActive = index === 0 ? 'active' : '';
        
        // On récupère un texte aléatoire, ou rien s'il n'y a plus de textes dispos
        const text = shuffledTexts[index] || null;
        
        const captionHtml = text ? `
            <div class="carousel-caption text-start">
                <h1 class="display-3 fw-bold mb-3 slide-in-bottom">${text.title}</h1>
                <p class="lead fs-4 slide-in-bottom delay-1">${text.subtitle}</p>
            </div>
        ` : '';

        html += `
            <div class="carousel-item ${isActive}">
                <img src="assets/images/carousel/${imgFile}" loading="${index === 0 ? 'eager' : 'lazy'}" class="d-block w-100 placeholder-img"
                    alt="Image carrousel ${index + 1}" style="filter: brightness(0.9);">
                ${captionHtml}
            </div>
        `;
    });

    container.innerHTML = html;
});
