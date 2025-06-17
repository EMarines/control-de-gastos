// local-data-service.ts
import type { Transaction } from '../stores/transactions';

// Esta función carga los datos desde el archivo local db.json
export async function loadLocalTransactions(): Promise<Transaction[]> {  try {
    // Importar el archivo JSON local desde nuestra API que sirve la base de datos normalizada
    const response = await fetch('/api/db');
    if (!response.ok) {
      throw new Error(`Error al cargar el archivo: ${response.statusText}`);
    }
    
    // Get only the first 50 items from the data
    const data = await response.json();
    const limitedData = data.slice(0, 50);
    
    console.log(`Cargando solo los primeros 50 registros de ${data.length} disponibles`);
    
    // Normalizar los datos para asegurar que cumplen con la estructura esperada
    const normalizedData = limitedData.map((item: any, index: number) => {
      // Asegurarse de que amount es un número
      const amount = typeof item.amount === 'number' 
        ? item.amount 
        : parseFloat(String(item.amount || "0").replace(/,/g, ''));
      
      // Verificar si ya tiene un ID, sino asignar uno
      const id = item.id || `local-${index}`;
      
      return {
        id,
        description: item.description || '',
        amount: isNaN(amount) ? 0 : amount,
        date: item.date || '',
        type: item.type?.toLowerCase() || 'egreso',
        location: item.location || '',
        cuenta: item.cuenta || '',
        subcuenta: item.subcuenta || '',
        paymentMethod: item.paymentMethod || '',
        invoice: item.invoice || '',
        tags: item.tags || '',
        notes: item.notes || '',
        businessPurpose: item.businessPurpose || item['PagadbusinessPurposeo Por:'] || ''
      };
    });
    
    // Ordenar por fecha descendente (más reciente primero)
    normalizedData.sort((a: Transaction, b: Transaction) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });
    
    console.log(`[local-data-service] Cargados ${normalizedData.length} registros desde db.json`);
    return normalizedData;
  } catch (error) {
    console.error('[local-data-service] Error al cargar datos locales:', error);
    return [];
  }
}
