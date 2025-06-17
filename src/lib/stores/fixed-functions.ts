// Funciones corregidas para el manejo de datos

import { transactions } from './transactions';
import type { TransactionType, Transaction } from './transactions';

// Función para obtener gastos agrupados por cuenta y filtrados por ubicación y periodo de tiempo
export function getExpensesByCategoryForLocation(location: string, period: 'month' | 'last30days' = 'month'): Record<string, number> {
    const categories = new Map<string, number>();
      // console.log(`Filtrando gastos por ubicación: "${location}" y periodo: "${period}"`);
    
    if (!location) {
        console.warn('Se llamó a getExpensesByCategoryForLocation sin especificar una ubicación');
        return {};
    }
    
    try {        let items: any[] = [];
        
        // Obtener los datos desde el store
        const unsubscribe = transactions.subscribe(data => {
            items = data;
        });
        unsubscribe();
        
        if (!items || !Array.isArray(items)) {
            console.error('Error: No se pudieron obtener items o no es un array', items);
            return {};
        }
        
        // Calcular la fecha límite según el periodo seleccionado
        const now = new Date();
        let startDate: Date;
        
        if (period === 'month') {
            // Inicio del mes actual
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else {
            // Últimos 30 días
            startDate = new Date();
            startDate.setDate(now.getDate() - 30);
        }
        
        // Normalizar la ubicación para aceptar tanto "Match Home" como "MatchHome"
        const isMatchHome = location === "Match Home" || location === "MatchHome";
        
        const filteredItems = items.filter(item => {
            if (!item || item.type !== 'egreso') return false;
            
            // Verificar la ubicación considerando las dos variantes posibles
            const itemLocationMatches = isMatchHome 
                ? (item.location === "Match Home" || item.location === "MatchHome") 
                : item.location === location;
                
            if (!itemLocationMatches) return false;
            
            // Filtrar por fecha
            try {
                const itemDate = new Date(item.date);
                return itemDate >= startDate && itemDate <= now;
            } catch (e) {
                console.warn(`Fecha inválida en item: ${item.id}, fecha: ${item.date}`);
                return false;
            }
        });
            
        console.log(`Encontrados ${filteredItems.length} gastos para ubicación "${location}" en el periodo "${period}"`);
            
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
