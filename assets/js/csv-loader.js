/**
 * Generic CSV Loader
 * Fetches a CSV file and converts it to an array of objects.
 */
class CsvLoader {
    /**
     * Fetch and parse a CSV file.
     * @param {string} url - The URL of the CSV file.
     * @returns {Promise<Array>} - A promise that resolves to an array of objects.
     */
       /** Google d'abord (6 s, 1 nouvelle tentative), puis copie locale. Lève une erreur si tout échoue. */
    static async fetchCsvStrict(url, retries = 1) {
        let lastError;
        for (let attempt = 0; attempt <= retries; attempt++) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 6000);
            try {
                const response = await fetch(url, { signal: controller.signal });
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return this.parseCsv(await response.text());
            } catch (err) {
                lastError = err;
            } finally {
                clearTimeout(timer);
            }
        }
        // Repli : copie locale générée par la GitHub Action (identifiée par le gid de l'URL)
        const gid = (url.match(/[?&]gid=(\d+)/) || [])[1];
        if (gid) {
            try {
                const res = await fetch('assets/data/sheet-' + gid + '.csv', { cache: 'no-cache' });
                if (res.ok) return this.parseCsv(await res.text());
            } catch (e) { /* on lève l'erreur d'origine ci-dessous */ }
        }
        throw lastError;
    }

    /** Comportement historique : renvoie [] en cas d'échec (utilisé par agenda, cantine, tarifs). */
    static async fetchCsv(url) {
        try {
            return await this.fetchCsvStrict(url);
        } catch (error) {
            console.error('Error loading CSV:', error);
            return [];
        }
    }

    /**
     * Parse CSV text into an array of objects.
     * Handles quoted fields, escaped quotes, multiline HTML text, and standard CSV formatting.
     * @param {string} csvText 
     * @returns {Array}
     */
    static parseCsv(csvText) {
        if (!csvText || !csvText.trim()) return [];

        const rows = [];
        let currentRow = [];
        let currentField = '';
        let inQuotes = false;

        for (let i = 0; i < csvText.length; i++) {
            const char = csvText[i];
            const nextChar = csvText[i + 1];

            if (inQuotes) {
                if (char === '"') {
                    if (nextChar === '"') {
                        // Double guillemet échapé ("") -> guillemet simple dans la chaîne
                        currentField += '"';
                        i++; // sauter le guillemet suivant
                    } else {
                        // Fin du champ entre guillemets
                        inQuotes = false;
                    }
                } else {
                    currentField += char;
                }
            } else {
                if (char === '"') {
                    inQuotes = true;
                } else if (char === ',') {
                    currentRow.push(currentField.trim());
                    currentField = '';
                } else if (char === '\r') {
                    // Ignorer les retours chariot \r
                } else if (char === '\n') {
                    currentRow.push(currentField.trim());
                    if (currentRow.some(f => f !== '')) {
                        rows.push(currentRow);
                    }
                    currentRow = [];
                    currentField = '';
                } else {
                    currentField += char;
                }
            }
        }

        // Ajouter le dernier champ et la dernière ligne s'il en reste
        if (currentField !== '' || currentRow.length > 0) {
            currentRow.push(currentField.trim());
            if (currentRow.some(f => f !== '')) {
                rows.push(currentRow);
            }
        }

        if (rows.length < 2) return [];

        // 1. En-têtes
        const headers = rows[0].map(h => h.trim());

        // 2. Traitement des lignes de données
        const result = [];
        for (let r = 1; r < rows.length; r++) {
            const values = rows[r];
            const obj = {};
            for (let c = 0; c < headers.length; c++) {
                const headerName = headers[c];
                if (headerName) {
                    obj[headerName] = values[c] !== undefined ? values[c] : '';
                }
            }
            if (Object.keys(obj).length > 0) {
                result.push(obj);
            }
        }

        return result;
    }

    /**
     * Helper to parse DD/MM/YYYY dates
     * @param {string} dateString 
     * @returns {Date|null}
     */
    static parseDate(dateString) {
        if (!dateString) return null;
        const parts = dateString.split('/');
        if (parts.length === 3) {
            // Month is 0-indexed in JS
            return new Date(parts[2], parts[1] - 1, parts[0]);
        }
        return null;
    }
}
