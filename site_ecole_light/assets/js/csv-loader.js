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
     * Handles quoted fields and standard CSV escaping.
     * @param {string} csvText 
     * @returns {Array}
     */
    static parseCsv(csvText) {
        // Robust CSV line splitter that handles quoted newlines
        // But for simplicity in this specific app, we will stick to splitting by \n
        // and using a regex to parse individual lines respecting quotes.

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

        // 1. Parse Headers
        // Fix for Google Sheets quirk: sometimes it returns "Col1,Col2",Col1,Col2
        // We will take the first N valid headers.
        let headers = parseLine(lines[0]);

        // Sanitize headers: empty headers should be ignored or merged? 
        // For this specific app, we know we expect Date, Entree, Plat... 
        // We will assume the first 5 columns are what we want if we see duplicates/garbage.
        // But a safer way is to trust the data row length.

        const result = [];

        for (let i = 1; i < lines.length; i++) {
            const values = parseLine(lines[i]);

            // If values length matches headers, great.
            // If values < headers, maybe headers has garbage at the end.
            // We will map based on the specific known keys if possible, or just index.

            const obj = {};
            // Logic: Use the minimum length to avoid out-of-bounds
            const len = Math.min(headers.length, values.length);

            for (let j = 0; j < len; j++) {
                const headerName = headers[j];
                // Skip empty header names
                if (headerName) {
                    obj[headerName] = values[j];
                }
            }
            // Only add if we have at least a Date (or 1st column)
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
