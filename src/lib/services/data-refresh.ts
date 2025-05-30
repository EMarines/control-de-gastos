import { writable, get } from 'svelte/store';
import { clearCache } from '../services/idb-service';
import { resetAllTransactionsAndReload } from '../stores/transactions';

// Store para controlar el estado de la actualización forzada
export const refreshing = writable<boolean>(false);

/**
 * Fuerza la actualización de datos desde Firestore
 * Limpia la caché y vuelve a cargar los datos
 */
export async function forceRefreshData(): Promise<void> {
    if (get(refreshing)) return;
    
    refreshing.set(true);
    
    try {
        // Limpiar caché actual
        await clearCache();
        
        // Reiniciar y recargar todas las transacciones desde Firestore
        await resetAllTransactionsAndReload();
        
        if (import.meta.env.DEV) {
            console.log('[data-refresh] Datos actualizados forzosamente desde Firestore');
        }
    } catch (error) {
        console.error('[data-refresh] Error al actualizar datos:', error);
    } finally {
        refreshing.set(false);
    }
}
