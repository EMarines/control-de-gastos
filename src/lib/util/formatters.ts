// src/lib/util/formatters.ts

/**
 * Formatea un valor numérico como moneda.
 * @param value El número a formatear.
 * @param currencySymbol El símbolo de la moneda (por defecto '$').
 * @param locale El locale para el formato de número (por defecto 'en-US' para comas como separadores de miles).
 * @returns La cadena de moneda formateada.
 */
export function formatCurrency(
    value: number | string | undefined | null,
    currencySymbol: string = '$', 
    locale: string = 'en-US'
): string {
    // Handle string values (convert to number)
    if (typeof value === 'string') {
        try {
            value = parseFloat(value.replace(/,/g, ''));
        } catch (e) {
            console.error('Error parsing string to number:', value, e);
            value = 0;
        }
    }
    
    // Handle invalid values
    if (value === null || value === undefined || typeof value !== 'number' || isNaN(value)) {
        console.warn('formatCurrency received invalid value:', value);
        value = 0; // Default to 0 for invalid inputs
    }
    
    try {
        // Format with locale
        const formattedNumber = value.toLocaleString(locale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        return `${currencySymbol} ${formattedNumber}`;
    } catch (error) {
        console.error('Error formatting currency:', error, value);
        // Fallback formatting
        return `${currencySymbol} ${value.toFixed(2)}`;
    }
}

// Podrías añadir otras funciones de formato aquí en el futuro, como formatear fechas.
// Por ejemplo:
// export function formatDate(dateISO: string, locale: string = 'es-ES'): string {
//     const fecha = new Date(dateISO);
//     return fecha.toLocaleDateString(locale, {
//         day: '2-digit',
//         month: 'short',
//         year: 'numeric'
//     });
// }
