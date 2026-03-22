/**
 * Carousel Loader - Loads images from assets/images folder
 * Excludes: favicon.png, logo.webp
 */

document.addEventListener('DOMContentLoaded', async function () {
    const carouselInner = document.querySelector('#homeCarousel .carousel-inner');
    if (!carouselInner) return;

    // List of images to use for carousel (all WebP except logo)
    const carouselImages = [
        { image: 'banner1.webp', title: 'Bienvenue à Saint Vincent', subtitle: 'Une école ouverte à tous', order: 1 },
        { image: 'banner2.webp', title: 'Construire son Histoire', subtitle: 'Apprendre et grandir ensemble', order: 2 },
        { image: 'banner3.webp', title: 'Au Cœur de Sainte-Luce', subtitle: 'Une communauté éducative engagée', order: 3 },
        { image: '20202021top01.webp', title: 'Nos Élèves', subtitle: 'Des moments de joie et d\'apprentissage', order: 4 },
        { image: '20202021top11.webp', title: 'Vie Scolaire', subtitle: 'Activités et découvertes', order: 5 },
        { image: '20202021top12.webp', title: 'Ensemble', subtitle: 'Partager et créer', order: 6 },
        { image: '20202021top19.webp', title: 'Créativité', subtitle: 'Développer tous les talents', order: 7 },
        { image: '20202021top20.webp', title: 'Épanouissement', subtitle: 'Chaque enfant compte', order: 8 },
        { image: 'top_2022_01.webp', title: 'Notre École', subtitle: 'Un lieu de vie et d\'apprentissage', order: 9 },
        { image: 'top_2022_02.webp', title: 'Activités', subtitle: 'Sport, culture et découverte', order: 10 },
        { image: 'top_2022_04.webp', title: 'Projets', subtitle: 'Apprendre autrement', order: 11 },
        { image: 'top_2022_05.webp', title: 'Convivialité', subtitle: 'Des moments partagés', order: 12 },
        { image: 'top_2022_06.webp', title: 'Réussite', subtitle: 'Accompagner chaque élève', order: 13 }
    ];

    // Randomize slides for variety
    const shuffled = [...carouselImages].sort(() => Math.random() - 0.5);

    // Clear existing slides
    carouselInner.innerHTML = '';

    // Create slides
    shuffled.forEach((slide, index) => {
        const isActive = index === 0 ? 'active' : '';
        const imagePath = `assets/images/${slide.image}`;

        const slideDiv = document.createElement('div');
        slideDiv.className = `carousel-item ${isActive}`;
        slideDiv.innerHTML = `
            <img src="${imagePath}" class="d-block w-100" alt="${slide.title}"
                style="height: 65vh; object-fit: cover; filter: brightness(0.9);"
                onerror="this.src='assets/images/banner1.webp'">
            <div class="carousel-caption d-none d-md-block text-start">
                <h${index === 0 ? '1' : '2'} class="display-3 fw-bold mb-3 slide-in-bottom">${slide.title}</h${index === 0 ? '1' : '2'}>
                <p class="lead mb-4 fade-in">${slide.subtitle}</p>
            </div>
        `;

        // Add blob shape to first slide
        // Blob removal: User requested to remove the blob shape.
        // Previous code injected a .carousel-blob-container with .blob-shape here.

        carouselInner.appendChild(slideDiv);
    });


});
