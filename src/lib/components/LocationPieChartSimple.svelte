<script lang="ts">
    import { onMount } from 'svelte';
    import { transactions, type Transaction } from '../stores/transactions';
    import { formatCurrency } from '../util/formatters'; // Re-importar para las barras


    // Props
    export let location = ''; // 'Casa' o 'Match Home'
    export let title = '';

    // Si no se proporciona un título, usar uno predeterminado basado en la ubicación
    $: if (!title && location) {
        title = `Egresos - ${location}`; // Changed Gastos to Egresos
    }

    // Mensaje para el subtítulo
    const subtitle = "Distribución por cuenta";

    // Datos para el gráfico de barras simplificado
    let barChartData: { category: string; amount: number; color: string }[] = [];

    // Paleta de colores por defecto para el gráfico
    const defaultColors = [
        '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
        '#1abc9c', '#34495e', '#d35400', '#16a085', '#8e44ad'
    ];

    // Función para calcular y actualizar los datos del gráfico
    function calculateChartData(currentTransactions: Transaction[], currentLocation: string) {
        if (!currentLocation) {
            barChartData = [];
            return;
        }

        const filteredTransactions = currentTransactions.filter(item =>
            item && item.type === 'egreso' && item.location === currentLocation);

        console.log(`[LocationPieChartSimple] Encontradas ${filteredTransactions.length} transacciones de egreso para ${currentLocation}`);

        const categories: { [key: string]: number } = {};
        filteredTransactions.forEach(item => {
            const cuentaName = item.cuenta || 'Sin Cuenta'; // Usar 'Sin Cuenta' si es undefined
            const key = cuentaName.charAt(0).toUpperCase() + cuentaName.slice(1); // Capitalizar
            categories[key] = (categories[key] || 0) + item.amount;
        });

        if (Object.keys(categories).length > 0) {
            barChartData = Object.entries(categories).map(([category, amount], index) => ({
                category,
                amount,
                color: defaultColors[index % defaultColors.length]
            }));
        } else {
            barChartData = [];
        }
        console.log(`[LocationPieChartSimple] Datos procesados para barras en ${currentLocation}:`, barChartData);
    }

    // Reaccionar a cambios en las transacciones o la ubicación
    $: calculateChartData($transactions, location);
    
    // Carga inicial
    onMount(() => {
        calculateChartData($transactions, location);
    });
</script>

<div class="chart-card">
    <h3>{title}</h3>
    <p class="subtitle">{subtitle}</p>
    
    <div class="chart-container">
        {#if barChartData.length > 0}
            <!-- Visualización simplificada con barras horizontales -->
            <div class="simple-chart">
                {#each barChartData as item}
                    <div class="chart-item">
                        <div class="label">{item.category}</div>
                        <div class="bar-container">
                            <div class="bar" style="width: {Math.min(100, (item.amount / Math.max(...barChartData.map(d => d.amount))) * 100)}%; background-color: {item.color}">
                                {formatCurrency(item.amount)}
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        {:else}
            <div class="no-data">
                <p>No hay datos de egresos para <strong>{location || 'esta ubicación'}</strong>.</p> <!-- Changed gastos to egresos -->
                <p>Verifica que existan transacciones de tipo "egreso" con la ubicación "{location}".</p> <!-- Changed "gasto" to "egreso" -->
                <button class="debug-button" on:click={() => {
                    console.log(`Debugging egresos para ${location}:`, $transactions.filter(t => 
                        t.location === location && t.type === 'egreso'
                    ));
                }}>Depurar datos de egresos</button>
            </div>
        {/if}
    </div>
</div>

<style>
    .chart-card {
        background-color: #fff;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        padding: 1rem;
        margin-bottom: 1rem;
        min-height: 380px; /* Asegurar altura mínima para el gráfico y títulos */
        display: flex;
        flex-direction: column;
    }
    
    h3 {
        text-align: center;
        margin-bottom: 0.2rem;
        font-size: 1.1rem;
        color: #333;
    }
    
    .subtitle {
        text-align: center;
        font-size: 0.85rem;
        margin-top: 0;
        margin-bottom: 1rem; /* Más espacio antes del gráfico */
        color: #777;
        font-style: italic;
    }
    
    .chart-container {
        margin-top: 0.5rem;
        flex-grow: 1; /* Permitir que el contenedor del gráfico crezca */
        display: flex;
        justify-content: center;
        align-items: center;
        position: relative; /* Para tooltips si se posicionan absolutamente */
    }

    .simple-chart {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        width: 100%; /* Asegurar que ocupe el ancho disponible */
    }

    .chart-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .label {
        width: 30%; /* Ajusta según necesidad */
        font-size: 0.9rem;
        text-align: right;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: #555;
    }

    .bar-container {
        flex-grow: 1;
        background-color: #f0f0f0;
        height: 24px; /* Altura de la barra */
        border-radius: 4px;
        overflow: hidden; /* Para que la barra no se salga */
    }

    .bar {
        height: 100%;
        /* min-width: 30px; No es tan necesario si el texto está dentro */
        display: flex;
        align-items: center;
        padding: 0 8px; /* Espacio para el texto dentro de la barra */
        color: white;
        font-size: 0.8rem;
        transition: width 0.3s ease-out; /* Animación suave del ancho */
        white-space: nowrap;
    }
    
    .no-data {
        text-align: center;
        padding: 1rem;
        color: #777;
        font-style: italic;
        width: 100%;
    }
    
    .debug-button {
        margin-top: 0.5rem;
        padding: 0.3rem 0.7rem;
        background-color: #f0f0f0;
        border: 1px solid #ddd;
        border-radius: 3px;
        font-size: 0.8rem;
        cursor: pointer;
    }
    
    .debug-button:hover {
        background-color: #e4e4e4;
    }
</style>
