// src/lib/util/formatters.ts

/**
 * Formatea un valor numérico como moneda.
 * @param value El número a formatear.
 * @param currencySymbol El símbolo de la moneda (por defecto '$').
 * @param locale El locale para el formato de número (por defecto 'en-US' para comas como separadores de miles).
 * @returns La cadena de moneda formateada.
 */
export function formatCurrency(
    value: number | undefined | null,
    currencySymbol: string = '$', // Cambiado el default a '$' como en Operaciones.svelte
    locale: string = 'en-US'
): string {
    if (typeof value !== 'number' || isNaN(value)) {
        value = 0; // Si no es un número válido, mostrar 0.00
    }
    const formattedNumber = value.toLocaleString(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    return `${currencySymbol} ${formattedNumber}`;
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
