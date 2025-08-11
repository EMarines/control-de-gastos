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

export function parseCustomDate(dateStr: string): number {
    try {
        if (!dateStr) {
            return Date.now();
        }
        
        if (dateStr.includes('T') || dateStr.includes('Z')) {
            const dateObj = new Date(dateStr);
            if (!isNaN(dateObj.getTime())) {
                return dateObj.getTime();
            }
        }            
        if (dateStr.includes('-')) {
            const parts = dateStr.split('-');
            
            if (parts.length === 3) {
                if (parts[0].length === 4) {
                    const year = parseInt(parts[0]);
                    const month = parseInt(parts[1]) - 1;
                    const day = parseInt(parts[2]);
                    
                    const dateObj = new Date(year, month, day);
                    if (!isNaN(dateObj.getTime())) {
                        return dateObj.getTime();
                    }
                }
                
                const day = parseInt(parts[0]);
                const englishMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const spanishMonths = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                
                let month = englishMonths.indexOf(parts[1]);
                
                if (month === -1) {
                    month = spanishMonths.indexOf(parts[1]);
                }
                
                if (month >= 0) {
                    let year = parseInt(parts[2]);
                    if (year < 100) {
                        year = year < 50 ? 2000 + year : 1900 + year;
                    }
                    
                    const dateObj = new Date(year, month, day);
                    
                    if (!isNaN(dateObj.getTime())) {
                        return dateObj.getTime();
                    }
                } else {
                    const monthText = parts[1].toLowerCase();
                    const monthMappings: {[key: string]: number} = {
                        'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3,
                        'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7,
                        'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11,
                        'january': 0, 'february': 1, 'march': 2, 'april': 3,
                        'may': 4, 'june': 5, 'july': 6, 'august': 7,
                        'september': 8, 'october': 9, 'november': 10, 'december': 11
                    };
                    
                    for (const [key, value] of Object.entries(monthMappings)) {
                        if (key.startsWith(monthText) || monthText.startsWith(key)) {
                            month = value;
                            break;
                        }
                    }
                    
                    if (month >= 0) {
                        let year = parseInt(parts[2]);
                        if (year < 100) {
                            year = year < 50 ? 2000 + year : 1900 + year;
                        }
                        
                        const dateObj = new Date(year, month, day);
                        if (!isNaN(dateObj.getTime())) {
                            return dateObj.getTime();
                        }
                    }
                    
                    const numericMonth = parseInt(parts[1]) - 1;
                    if (!isNaN(numericMonth) && numericMonth >= 0 && numericMonth <= 11) {
                        let year = parseInt(parts[2]);
                        if (year < 100) {
                            year = year < 50 ? 2000 + year : 1900 + year;
                        }
                        
                        const dateObj = new Date(year, numericMonth, day);
                        if (!isNaN(dateObj.getTime())) {
                            return dateObj.getTime();
                        }
                    }
                }
            }
        } else if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                let day, month, year;
                
                const firstPart = parseInt(parts[0]);
                const secondPart = parseInt(parts[1]);
                
                if (firstPart > 12) {
                    day = firstPart;
                    month = secondPart - 1;
                } else {
                    month = firstPart - 1;
                    day = secondPart;
                }
                
                year = parseInt(parts[2]);
                
                const dateObj = new Date(year, month, day);
                
                if (!isNaN(dateObj.getTime())) {
                    return dateObj.getTime();
                }
            }
        }
        try {
            const timestamp = Date.parse(dateStr);
            if (!isNaN(timestamp)) {
                return timestamp;
            }
            
            const dateObj = new Date(dateStr);
            if (!isNaN(dateObj.getTime())) {
                return dateObj.getTime();
            }
        } catch (e) {
            console.error('Error convirtiendo fecha estándar:', e, dateStr);
        }
        
        const numericMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
        if (numericMatch) {
            const day = parseInt(numericMatch[1]);
            const month = parseInt(numericMatch[2]) - 1;
            let year = parseInt(numericMatch[3]);
            if (year < 100) {
                year = year < 50 ? 2000 + year : 1900 + year;
            }
            
            const dateObj = new Date(year, month, day);
            if (!isNaN(dateObj.getTime())) {
                return dateObj.getTime();
            }
        }
        
        console.warn('No se pudo parsear la fecha, retornando timestamp actual:', dateStr);
        return Date.now();
    } catch (error) {
        console.error('Error al parsear fecha:', error, dateStr);
        return Date.now();
    }
}

export function formatearFecha(fechaStr: string): string {
    try {
        if (!fechaStr) {
            return 'Fecha inválida';
        }
        
        let fecha: Date;
        
        if (fechaStr.includes('T') || fechaStr.includes('Z')) {
            fecha = new Date(fechaStr);
        }
        else if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
            const [year, month, day] = fechaStr.split('-').map(Number);
            fecha = new Date(year, month - 1, day);
        }
        else if (fechaStr.includes('-') && fechaStr.split('-').length === 3) {
            const parts = fechaStr.split('-');
            const englishMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const spanishMonths = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            
            const possibleMonth = parts[1];
            if (
                (englishMonths.includes(possibleMonth) || spanishMonths.includes(possibleMonth)) &&
                !isNaN(parseInt(parts[0])) && 
                !isNaN(parseInt(parts[2]))
            ) {
                let monthIndex = englishMonths.indexOf(possibleMonth);
                if (monthIndex === -1) {
                    monthIndex = spanishMonths.indexOf(possibleMonth);
                }
                const day = parts[0].padStart(2, '0');
                const month = englishMonths[monthIndex];
                return `${day}-${month}-${parts[2]}`;
            }
            else {
                const timestamp = parseCustomDate(fechaStr);
                if (timestamp > 0) {
                    fecha = new Date(timestamp);
                } else {
                    fecha = new Date(fechaStr);
                }
            }
        }
        else {
            const timestamp = parseCustomDate(fechaStr);
            if (timestamp > 0) {
                fecha = new Date(timestamp);
            } else {
                fecha = new Date(fechaStr);
            }
        }
        if (!fecha || isNaN(fecha.getTime())) {
            return 'Fecha inválida';
        }
        const day = fecha.getDate().toString().padStart(2, '0');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames[fecha.getMonth()];
        const year = fecha.getFullYear().toString().substring(2);
        
        return `${day}-${month}-${year}`;
    } catch (error) {
        console.error('Error al formatear fecha:', error, fechaStr);
        return 'Fecha inválida';
    }
}