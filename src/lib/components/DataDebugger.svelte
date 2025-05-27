<script lang="ts">
    // Usamos TypeScript para tipado fuerte
    import { transactions } from '../stores/transactions';
    
    let showData = false;
    
    function toggleData() {
        showData = !showData;
    }
    
    function logTransactions() {
        if ($transactions && Array.isArray($transactions)) {
            console.log(`Datos cargados: ${$transactions.length} transacciones`, $transactions);
            
            // Contar por ubicación
            const locationCount: {[key: string]: number} = {};
            $transactions.forEach(item => {
                if (item && item.location) {
                    const loc = item.location;
                    locationCount[loc] = (locationCount[loc] || 0) + 1;
                }
            });
            
            console.log('Distribución por ubicación:', locationCount);
        } else {
            console.error('Error: Datos de transacciones no disponibles o con formato incorrecto');
        }
    }
</script>

<div class="debug-panel">
    <button class="debug-toggle" on:click={toggleData}>
        {showData ? '❌ Ocultar herramientas' : '🔍 Herramientas de depuración'} 
    </button>
    
    {#if showData}
        <div class="debug-data">
            <h4>Depuración de datos</h4>
            <p>Transacciones cargadas: {$transactions ? $transactions.length : 0}</p>
            
            <div class="debug-buttons">
                <button on:click={logTransactions}>
                    Analizar datos en consola
                </button>
                
                <button on:click={() => console.log('Datos de ubicaciones:', $transactions ? [...new Set($transactions.map(t => t.location).filter(Boolean))] : [])}>
                    Ver ubicaciones
                </button>
            </div>
            
            <div class="info">
                <p><strong>Instrucciones de depuración:</strong></p>
                <ol>
                    <li>Abre la consola del navegador (F12)</li>
                    <li>Usa los botones para ver la información de depuración</li>
                    <li>Revisa los errores y advertencias en la consola</li>
                </ol>
            </div>
        </div>
    {/if}
</div>

<style>
    .debug-panel {
        margin: 1rem 0;
        border: 1px dashed #ccc;
        padding: 0.5rem;
    }
    
    .debug-toggle {
        background-color: #f0f0f0;
        border: 1px solid #ddd;
        padding: 0.3rem 0.7rem;
        border-radius: 3px;
        font-size: 0.85rem;
        cursor: pointer;
    }
    
    .debug-data {
        margin-top: 1rem;
        padding: 0.5rem;
        background-color: #f9f9f9;
        border-radius: 3px;
    }
    
    .debug-buttons {
        display: flex;
        gap: 0.5rem;
        margin: 1rem 0;
    }
    
    .debug-buttons button {
        background-color: #e0e0e0;
        border: 1px solid #ccc;
        padding: 0.3rem 0.5rem;
        border-radius: 3px;
        font-size: 0.8rem;
        cursor: pointer;
    }
    
    .info {
        font-size: 0.9rem;
        margin-top: 1rem;
        padding: 0.5rem;
        background: #f0f0f0;
        border-radius: 3px;
    }
    
    .info ol {
        margin: 0.5rem 0 0 1.5rem;
        padding: 0;
    }
</style>
