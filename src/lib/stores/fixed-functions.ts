// Funciones corregidas para el manejo de datos

import { transactions } from './transactions';
import type { TransactionType, Transaction } from './transactions';

// Función para obtener gastos agrupados por cuenta y filtrados por ubicación
export function getExpensesByCategoryForLocation(location: string): Record<string, number> {
    const categories = new Map<string, number>();
    
    console.log(`Filtrando gastos por ubicación: "${location}"`);
    
    if (!location) {
        console.warn('Se llamó a getExpensesByCategoryForLocation sin especificar una ubicación');
        return {};
    }
    
    try {
        let items: any[] = [];
        
        // Obtener los datos desde el store
        transactions.subscribe(data => {
            items = data;
        })();
        
        if (!items || !Array.isArray(items)) {
            console.error('Error: No se pudieron obtener items o no es un array', items);
            return {};
        }
        
        const filteredItems = items.filter(item => 
            item && item.type === 'egreso' && item.location === location);
            
        console.log(`Encontrados ${filteredItems.length} gastos para ubicación "${location}"`);
            
        filteredItems.forEach(item => {
            if (!item) return;
            
            // Usar el campo cuenta como clave principal para agrupar los gastos
            const key = item.cuenta || item.category || 'Sin categoría';
                
            // Asegurarse de que el monto es un número válido
            const amount = typeof item.amount === 'number' ? item.amount : 0;
            if (amount > 0) {
                categories.set(key, (categories.get(key) || 0) + amount);
            }
        });
        
        // Convertir el Map a un objeto
        const result: Record<string, number> = {};
        categories.forEach((value, key) => {
            result[key] = value;
        });
        
        return result;
    } catch (error) {
        console.error(`Error al procesar gastos por ubicación "${location}":`, error);
        return {};
    }
}
