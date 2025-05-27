// @ts-nocheck - Desactivar comprobación de tipos para este archivo
// Utilidades para depuración
export const DEBUG = true;

export function logData(component, message, data) {
    if (DEBUG) {
        console.log(`[${component}] ${message}`, data);
    }
}

export function logError(component, message, error) {
    console.error(`[${component}] ERROR: ${message}`, error);
}

// Función para inspeccionar la estructura de datos
export function inspectObject(obj, depth = 1) {
    if (!DEBUG) return;
    
    try {
        if (depth <= 0 || !obj) return;
        
        const properties = Object.keys(obj);
        console.group('Inspección de objeto');
        console.log(`Tipo: ${typeof obj}, Propiedades: ${properties.length}`);
        
        properties.forEach(prop => {
            const value = obj[prop];
            if (typeof value === 'object' && value !== null) {
                console.group(`${prop}:`);
                console.log(`Tipo: ${typeof value}, Valor:`, value);
                if (depth > 1) {
                    inspectObject(value, depth - 1);
                }
                console.groupEnd();
            } else {
                console.log(`${prop}: ${value}`);
            }
        });
        console.groupEnd();
    } catch (error) {
        console.error('Error al inspeccionar el objeto:', error);
    }
}

// Registrar evento de carga
console.log('[DEBUG] Módulo de depuración cargado');
