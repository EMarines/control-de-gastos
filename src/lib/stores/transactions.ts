import { writable } from 'svelte/store';
// src/lib/stores/transactions.ts
import { db } from '../firebase'; // Asegúrate que la ruta a tu firebase.ts sea correcta
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore'; // Funciones de Firestore

// Asegúrate de que updateTransaction esté definida Y EXPORTADA así:
export async function updateTransaction(transactionData: Transaction): Promise<void> {
    if (!transactionData.id) {
        console.error('[transactions.ts] Error: Se intentó actualizar una transacción sin ID.');
        throw new Error('No se puede actualizar una transacción sin ID.');
    }
    try {
        const transactionDocRef = doc(db, 'transactions', transactionData.id);
        // Usamos setDoc con merge:true para actualizar solo los campos proporcionados
        // y no sobrescribir todo el documento si transactionData es parcial.
        // Asegúrate de que transactionData contenga todos los campos que quieres persistir.
        await setDoc(transactionDocRef, transactionData, { merge: true });
        console.log('[transactions.ts] Transacción actualizada en Firebase con ID: ', transactionData.id);
        // onSnapshot se encargará de actualizar el store local cuando detecte el cambio en Firebase.
        // La actualización local optimista es opcional:
        // transactions.update(items => items.map(item => (item.id === transactionData.id ? transactionData : item)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (error) {
        console.error('[transactions.ts] Error al actualizar la transacción en Firebase: ', error);
        throw error; // Propagar el error para que el componente lo maneje
    }
}

// ... resto de tu store ...


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
    console.error('[transactions.ts] Error: transactionData.js no exporta un array o está vacío.', transactionsDataFromFile);
    // Considerar asignar un array vacío a initialTransactions si esto ocurre
} else {
    console.log(`[transactions.ts] Iniciando procesamiento de ${transactionsDataFromFile.length} registros de transactionData.js...`);
}

// initialTransactions cargadas desde el archivo JS.
// Esto puede servir como un estado inicial antes de que Firebase cargue,
// o podrías optar por un array vacío y depender completamente de Firebase.
let localInitialTransactions: Transaction[] = (transactionsDataFromFile as TransactionInput[])
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
            const cleaned = (rawAmount as string).replace(/[$€£¥,]/g, '').trim();
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
const ingresosIniciales = localInitialTransactions.filter(t => t.type === 'ingreso').length;
const egresosIniciales = localInitialTransactions.filter(t => t.type === 'egreso').length;
console.log(`[transactions.ts] Transacciones iniciales procesadas desde archivo: ${localInitialTransactions.length} (Ingresos: ${ingresosIniciales}, Egresos: ${egresosIniciales})`);

// Log de ubicaciones para debug
const locations = new Set<string>();
localInitialTransactions.forEach(t => {
    if (t.location) {
        locations.add(t.location);
    }
});
console.log('[transactions.ts] Ubicaciones encontradas en las transacciones cargadas:', Array.from(locations));

// Tu store principal. Inicialmente puede estar vacío o con los datos del archivo local.
// Firebase lo actualizará.
export const transactions = writable<Transaction[]>([]); // Empezar vacío o con localInitialTransactions

const transactionsCollectionRef = collection(db, 'transactions');

// --- Cargar y Sincronizar con Firebase ---
// Crear una consulta para obtener las transacciones, ordenadas por fecha (más recientes primero)
const q = query(transactionsCollectionRef, orderBy('date', 'desc'));

const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const firebaseTransactions: Transaction[] = [];
    querySnapshot.forEach((doc) => {
        // Es importante asegurarse de que los datos del documento coincidan con tu interfaz Transaction
        // y manejar cualquier transformación necesaria (ej. Timestamps de Firebase a objetos Date de JS si es necesario)
        // En tu caso, 'date' es un string ISO, lo cual está bien.
        firebaseTransactions.push({ ...doc.data(), id: doc.id } as Transaction);
    });
    transactions.set(firebaseTransactions); // Actualiza el store de Svelte con los datos de Firebase
    console.log('[transactions.ts] Transacciones actualizadas desde Firebase:', firebaseTransactions.length);
}, (error) => {
    console.error('[transactions.ts] Error al obtener transacciones desde Firebase con onSnapshot: ', error);
    // Opcional: si Firebase falla, podrías cargar los datos locales como fallback
    // if (localInitialTransactions.length > 0) {
    //     console.log('[transactions.ts] Fallback: Cargando transacciones desde archivo local debido a error de Firebase.');
    //     transactions.set(localInitialTransactions);
    // }
});

// Opcional: Exportar la función de desuscripción si necesitas detener la escucha en algún momento (ej. al cerrar sesión de un usuario)
// export const stopListeningToTransactions = () => unsubscribe();

export async function addTransaction(transactionData: Omit<Transaction, 'id'>): Promise<string | null> {
    try {
        // Preparamos el objeto a guardar.
        // Tu 'transactionData.date' ya es un string ISO, lo cual está bien para Firestore.
        // Opcionalmente, puedes añadir un timestamp del servidor para el momento de la creación.
        const dataToSave = {
            ...transactionData,
            // createdAt: serverTimestamp() // Descomenta si quieres guardar la fecha de creación en el servidor
        };

        const docRef = await addDoc(transactionsCollectionRef, dataToSave);
        console.log('Transacción guardada en Firebase con ID: ', docRef.id);

        // Con onSnapshot activo, la actualización del store local aquí es opcional
        // porque onSnapshot detectará el nuevo documento y actualizará el store.
        // Mantenerla puede dar una sensación de respuesta más inmediata en la UI (actualización optimista).
        // transactions.update(items => [{ ...transactionData, id: docRef.id } as Transaction, ...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        return docRef.id;
    } catch (error) {
        console.error('Error al añadir la transacción a Firebase: ', error);
        // Podrías querer lanzar el error para que el componente que llama lo maneje
        // throw error;
        return null;
    }
}

export async function removeTransaction(id: string): Promise<void> {
    try {
        const transactionDocRef = doc(db, 'transactions', id);
        await deleteDoc(transactionDocRef);
        console.log('Transacción eliminada de Firebase con ID: ', id);
        // onSnapshot se encargará de actualizar el store local.
        // transactions.update(items => items.filter(item => item.id !== id)); // Opcional para UI optimista
    } catch (error) {
        console.error('Error al eliminar la transacción de Firebase: ', error);
        throw error; // Propagar el error para que el componente lo maneje
    }
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
