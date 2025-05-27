import { writable } from 'svelte/store';

export type TransactionType = 'ingreso' | 'egreso'; // Changed 'gasto' to 'egreso'

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

// Define extended type that includes formattedAmount (though we aim to not use it for amount processing)
interface TransactionInput extends Partial<Transaction> {
    formattedAmount?: string | number; // Kept for potential other uses or if data still contains it
    [key: string]: any; // Allow any other properties that might exist in the JSON
}

// Importar datos directamente del archivo JS para evitar problemas de formato JSON
import transactionsDataFromFile from '../data/transactionData.js'; // Renombrado para claridad

console.log("[transactions.ts] Datos crudos importados de transactionData.js:", JSON.parse(JSON.stringify(transactionsDataFromFile)));

// Comprobar que los datos se están importando correctamente
if (!transactionsDataFromFile || !Array.isArray(transactionsDataFromFile)) {
    console.error('[transactions.ts] Error: transactionsData.js no exporta un array o está vacío.', transactionsDataFromFile);
    // Considerar asignar un array vacío a initialTransactions si esto ocurre
} else {
    console.log(`[transactions.ts] Iniciando procesamiento de ${transactionsDataFromFile.length} registros de transactionData.js...`);
}

const initialTransactions: Transaction[] = (transactionsDataFromFile as TransactionInput[])
    .map((item, index) => {
        if (!item) {
            console.warn(`[transactions.ts] Item nulo o undefined en transactionData.js en el índice ${index}. Omitiendo.`);
            return null; // Se filtrará más tarde
        }

        console.log(`[transactions.ts] Procesando item ${index}:`, JSON.parse(JSON.stringify(item)));

        // 1. Procesar Amount (dependiendo únicamente de item.amount)
        let finalAmount = 0;
        const rawAmount = item.amount;

        console.log(`  [Item ${index}] Valor inicial de rawAmount: "${rawAmount}" (tipo: ${typeof rawAmount})`);

        if (typeof rawAmount === 'number' && !isNaN(rawAmount)) {
            finalAmount = rawAmount;
            console.log(`  [Item ${index}] Decisión: rawAmount es número válido. finalAmount = ${finalAmount}`);
        } else if (typeof rawAmount === 'string') {
            // Limpiar la cadena por si acaso aún contiene formatos no numéricos.
            const cleaned = rawAmount.replace(/[$€£¥,]/g, '').trim();
            if (cleaned === "") {
                finalAmount = 0;
                console.log(`  [Item ${index}] Decisión: rawAmount era cadena vacía (o solo símbolos/comas después de limpiar). finalAmount = ${finalAmount}`);
            } else {
                const parsed = parseFloat(cleaned);
                if (!isNaN(parsed)) {
                    finalAmount = parsed;
                    console.log(`  [Item ${index}] Decisión: rawAmount (string) parseado exitosamente ("${cleaned}"). finalAmount = ${finalAmount}`);
                } else {
                    // finalAmount permanece 0 si el parseo falla
                    console.warn(`  [Item ${index}] Decisión: rawAmount (string) no se pudo parsear a número ("${cleaned}"). finalAmount = ${finalAmount}`);
                }
            }
        } else {
            // finalAmount permanece 0 si rawAmount no es ni número ni string, o es un tipo inesperado.
            console.warn(`  [Item ${index}] Decisión: rawAmount no es ni número ni string, o es inválido. finalAmount = ${finalAmount}`);
        }

        // 2. Normalizar Type
        let normalizedType: TransactionType | null = null;
        if (item.type) {
            const typeStr = String(item.type).toLowerCase().trim();
            if (typeStr === 'egreso' || typeStr === 'gasto') { // 'gasto' para compatibilidad
                normalizedType = 'egreso';
            } else if (typeStr === 'ingreso') {
                normalizedType = 'ingreso';
            } else {
                console.warn(`[transactions.ts] Item ${index}: Tipo de transacción no reconocido: "${item.type}".`);
            }
        } else {
            console.warn(`[transactions.ts] Item ${index}: No tiene campo 'type'.`);
        }

        // 3. Validar datos esenciales (type y date)
        if (!normalizedType || !item.date) {
            console.warn(`[transactions.ts] Omitiendo item ${index} por falta de tipo normalizado o fecha. Tipo original: "${item.type}", Fecha: "${item.date}"`);
            return null; // Se filtrará más tarde
        }

        // 4. Generar ID único si no existe o está vacío
        const uniqueId = (item.id && String(item.id).trim()) ? String(item.id).trim() : `${Date.now()}-${Math.random().toString(36).substring(2)}-${index}`;

        // Crear objeto de transacción normalizado
        const transactionObject: Transaction = {
            id: uniqueId,
            description: item.description || 'Sin descripción',
            amount: finalAmount,
            date: String(item.date), // Asegurar que date sea string
            type: normalizedType,
            location: item.location || '',
            cuenta: (item.cuenta || '').trim(),
            subcuenta: (item.subcuena || item.subcuenta || '').trim(), // Manejar posibles variaciones en el nombre del campo
            paymentMethod: item.paymentMethod || '',
            invoice: item.invoice || '',
            tags: item.tags || '',
            notes: item.notes || '',
            businessPurpose: item.businessPurpose || item['PagadbusinessPurposeo Por:'] || '', // Manejar posibles variaciones
            category: item.category || '' // Mantener compatibilidad con datos antiguos
        };
        console.log(`  [Item ${index}] Objeto final procesado:`, JSON.parse(JSON.stringify(transactionObject)));
        return transactionObject;
    })
    .filter(transaction => transaction !== null) as Transaction[]; // Filtrar los items que se marcaron como null

// Temporalmente eliminado: Filtro para transacciones con monto cero.
// .filter(transaction => {
//     const hasAmount = transaction.amount > 0;
//     if (!hasAmount) {
//         console.log('[transactions.ts] Omitiendo transacción con monto cero o negativo:', transaction.description, transaction.amount);
//     }
//     return hasAmount;
// });

// Estadísticas para depuración
const ingresos = initialTransactions.filter(t => t.type === 'ingreso').length;
const egresos = initialTransactions.filter(t => t.type === 'egreso').length;
console.log(`[transactions.ts] Transacciones finales cargadas en el store: ${initialTransactions.length} (Ingresos: ${ingresos}, Egresos: ${egresos})`);

// Log de ubicaciones para debug
const locations = new Set<string>();
initialTransactions.forEach(t => {
    if (t.location) {
        locations.add(t.location);
    }
});
console.log('[transactions.ts] Ubicaciones encontradas en las transacciones cargadas:', Array.from(locations));

export const transactions = writable<Transaction[]>(initialTransactions);

export function addTransaction(transaction: Omit<Transaction, 'id'>) {
    // Generamos un ID único usando fecha y un número aleatorio
    const id = Date.now().toString() + Math.random().toString(36).substring(2);
    transactions.update(items => [...items, { ...transaction, id }]);
}

export function removeTransaction(id: string) {
    transactions.update(items => items.filter(item => item.id !== id));
}

export function getTotal(type: TransactionType) {
    let total = 0;
    transactions.subscribe(items => {
        total = items
            .filter(item => item.type === type)
            .reduce((acc, item) => {
                // Asegurarse de que el monto es un número válido
                const amount = typeof item.amount === 'number' ? item.amount : 0;
                return acc + amount;
            }, 0);
    })();
    return total;
}

export function getBalance() {
    return getTotal('ingreso') - getTotal('egreso'); // Changed 'gasto' to 'egreso'
}

export function getExpensesByCategory() {
    // Ahora usamos un Map dinámico en lugar de categorías fijas
    const categories = new Map<string, number>();

    transactions.subscribe(items => {
        items.forEach(item => {
            if (item.type === 'egreso') { // Changed 'gasto' to 'egreso'
                // Usar cuenta como categoría principal
                const key = item.cuenta || item.category || 'Sin categoría';

                // Asegurarse de que el monto es un número válido
                const amount = typeof item.amount === 'number' ? item.amount : 0;
                if (amount > 0) {
                    categories.set(key, (categories.get(key) || 0) + amount);
                }
            }
        });
    })();

    // Convertir el Map a un objeto para mantener compatibilidad con el código existente
    const result: Record<string, number> = {};
    categories.forEach((value, key) => {
        result[key] = value;
    });

    return result;
}

// Función para obtener gastos agrupados por cuenta y filtrados por ubicación
export function getExpensesByCategoryForLocation(location: string) {
    const categories = new Map<string, number>();

    try {
        console.log(`Filtrando egresos por ubicación: "${location}"`); // Changed 'gastos' to 'egresos'

        if (!location) {
            console.warn('Se llamó a getExpensesByCategoryForLocation sin especificar una ubicación');
            return {};
        }

        transactions.subscribe(items => {
            if (!items || !Array.isArray(items)) {
                console.error('Error: items no es un array o está vacío', items);
                return;
            }

            const filteredItems = items.filter(item =>
                item && item.type === 'egreso' && item.location === location); // Changed 'gasto' to 'egreso'

            console.log(`Encontrados ${filteredItems.length} egresos para ubicación "${location}"`); // Changed 'gastos' to 'egresos'

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
        })();

        // Convertir el Map a un objeto
        const result: Record<string, number> = {};
        categories.forEach((value, key) => {
            result[key] = value;
        });

        console.log(result);

        return result;
    } catch (error) {
        console.error(`Error al procesar egresos por ubicación "${location}":`, error); // Changed 'gastos' to 'egresos'
        return {}; // Devolver un objeto vacío en caso de error
    }
}
