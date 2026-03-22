document.addEventListener('DOMContentLoaded', function () {
    const footerTabLinks = document.querySelectorAll('.footer-tab-link');

    footerTabLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetTabSelector = this.getAttribute('data-tab');
            const targetTab = document.querySelector(targetTabSelector);

            if (targetTab) {
                // Scroll to presentation section
                const presentationSection = document.getElementById('presentation');
                if (presentationSection) {
                    presentationSection.scrollIntoView({ behavior: 'smooth' });
                }

                // Trigger click on the tab
                // We need a small delay if we want the scroll to happen first/concurrently
                // mainly to ensure Bootstrap tab events don't conflict with scroll if any
                const tabInstance = new bootstrap.Tab(targetTab);
                tabInstance.show();
            }
        });
    });
});
