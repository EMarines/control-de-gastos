import { writable } from 'svelte/store';

// Definir los tipos de transacciones
export type TransactionType = 'ingreso' | 'egreso';

export interface Transaction {
    id: string;
    description: string;  // Pagado A
    amount: number;
    date: string;
    type: TransactionType;
    category?: string;    // Mantenido para compatibilidad con datos antiguos
    // Campos adicionales (opcionales)
    location?: string;    // Opciones (Casa o Match Home)
    cuenta?: string;      // Cuenta principal
    subcuenta?: string;   // Subcuenta específica
    paymentMethod?: string;  // Pagado con
    invoice?: string;     // Referencia
    tags?: string;        // Etiquetas
    notes?: string;       // Notas adicionales
    businessPurpose?: string;  // Pagado por
    merchant?: string;    // Para compatibilidad con datos antiguos
    receiptNumber?: string; // Para compatibilidad con datos antiguos
}

// Stores para el estado de carga
export const isLoadingData = writable<boolean>(false);
export const transactions = writable<Transaction[]>([]);

// Esta función carga los datos desde el archivo local db.json
export async function loadLocalTransactions(): Promise<void> {
  isLoadingData.set(true);
  
  try {
    // Importar el archivo JSON local
    const response = await fetch('/src/lib/data/db.json');
    if (!response.ok) {
      throw new Error(`Error al cargar el archivo: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Normalizar los datos para asegurar que cumplen con la estructura esperada
    const normalizedData = data.map((item: any, index: number) => {
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
    
    console.log(`[local-transactions] Cargados ${normalizedData.length} registros desde db.json`);
    transactions.set(normalizedData);
  } catch (error) {
    console.error('[local-transactions] Error al cargar datos locales:', error);
    transactions.set([]);
  } finally {
    isLoadingData.set(false);
  }
}

// Función para obtener el total por tipo de transacción
export function getTotal(type: TransactionType): number {
  let total = 0;
  transactions.subscribe(items => {
    total = items
      .filter(item => item.type === type)
      .reduce((acc, item) => acc + item.amount, 0);
  })();
  return total;
}

// Función para obtener el balance (ingresos - egresos)
export function getBalance(): number {
  return getTotal('ingreso') - getTotal('egreso');
}

// Función para obtener gastos por categoría
export function getExpensesByCategory(): Record<string, number> {
  const categories: Record<string, number> = {};
  
  transactions.subscribe(items => {
    items.forEach(item => {
      if (item.type === 'egreso') {
        const key = item.cuenta || item.category || 'Sin categoría';
        categories[key] = (categories[key] || 0) + item.amount;
      }
    });
  })();
  
  return categories;
}

// Función para obtener gastos por ubicación y categoría
export function getExpensesByCategoryForLocation(location: string): Record<string, number> {
  const categories: Record<string, number> = {};
  
  transactions.subscribe(items => {
    items.forEach(item => {
      if (item.type === 'egreso' && item.location === location) {
        const key = item.cuenta || item.category || 'Sin categoría';
        categories[key] = (categories[key] || 0) + item.amount;
      }
    });
  })();
  
  return categories;
}

// Función para normalizar el tipo de transacción (asegurar case-sensitivity correcta)
export function normalizeTransactionType(type: string): TransactionType {
  if (!type) return 'egreso'; // Default to egreso if undefined
  
  const lowerType = type.toLowerCase();
  if (lowerType === 'ingreso') return 'ingreso';
  if (lowerType === 'egreso') return 'egreso';
  
  // Handling for legacy data with different names
  if (lowerType === 'gasto') return 'egreso';
  if (lowerType === 'income') return 'ingreso';
  if (lowerType === 'expense') return 'egreso';
  if (lowerType === 'ingresso') return 'ingreso';
  if (lowerType === 'egresso') return 'egreso';
  
  // For data with capitalized first letter
  if (type === 'Ingreso') return 'ingreso';
  if (type === 'Egreso') return 'egreso';
  
  // Default
  return 'egreso';
}

// Cargar datos automáticamente
if (typeof window !== 'undefined') {
  // Solo ejecutar en el navegador, no durante SSR
  loadLocalTransactions();
}
