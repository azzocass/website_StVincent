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
    static async fetchCsv(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch CSV: ${response.statusText}`);
            }
            const text = await response.text();
            return this.parseCsv(text);
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
