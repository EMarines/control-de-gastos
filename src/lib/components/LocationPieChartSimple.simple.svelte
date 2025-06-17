<script lang="ts">
    import { onMount } from 'svelte';
    import { transactions, type Transaction } from '../stores/simple-local-transactions';
    
    // Función simple de formateo de moneda
    function formatCurrency(value: number): string {
        return new Intl.NumberFormat('es-MX', { 
            style: 'currency', 
            currency: 'MXN',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }

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
    let barChartData: { category: string; amount: number; color: string; percentage?: number }[] = [];

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

        // Ordenar por monto descendente y limitar a los N más grandes
        const maxCategories = 8;
        barChartData = Object.entries(categories)
            .sort((a, b) => b[1] - a[1])
            .slice(0, maxCategories)
            .map(([category, amount], index) => ({
                category,
                amount,
                color: defaultColors[index % defaultColors.length]
            }));

        // Si hay demasiadas categorías, agrupar las restantes como "Otros"
        if (Object.keys(categories).length > maxCategories) {
            const topCategoriesTotal = barChartData.reduce((sum, item) => sum + item.amount, 0);
            const allCategoriesTotal = Object.values(categories).reduce((sum, amount) => sum + amount, 0);
            const othersTotal = allCategoriesTotal - topCategoriesTotal;
            
            if (othersTotal > 0) {
                barChartData.push({
                    category: 'Otros',
                    amount: othersTotal,
                    color: '#7f8c8d' // Color gris para "Otros"
                });
            }
        }

        // Calcular porcentajes
        const total = barChartData.reduce((sum, item) => sum + item.amount, 0);
        barChartData = barChartData.map(item => ({
            ...item,
            percentage: total > 0 ? (item.amount / total) * 100 : 0
        }));

        console.log(`[LocationPieChartSimple] Datos del gráfico generados con ${barChartData.length} categorías`);
    }

    // Suscribirse a cambios en las transacciones y la ubicación
    $: calculateChartData($transactions, location);
</script>

<div class="chart-container">
    <h3>{title}</h3>
    <p class="subtitle">{subtitle}</p>

    {#if barChartData.length === 0}
        <div class="no-data">No hay datos disponibles para la ubicación seleccionada</div>
    {:else}
        <div class="bar-chart">
            {#each barChartData as item (item.category)}
                <div class="chart-row">
                    <div class="label-container">
                        <span class="color-indicator" style="background-color: {item.color};"></span>
                        <span class="category-label">{item.category}</span>
                    </div>
                    <div class="amount-container">
                        <span class="amount">{formatCurrency(item.amount)}</span>
                        <span class="percentage">({item.percentage?.toFixed(1)}%)</span>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .chart-container {
        border-radius: 8px;
        padding: 1rem;
        background-color: #ffffff;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    h3 {
        margin-top: 0;
        margin-bottom: 0.5rem;
        color: #2c3e50;
    }

    .subtitle {
        margin-top: 0;
        font-size: 0.9rem;
        color: #7f8c8d;
        margin-bottom: 1rem;
    }

    .bar-chart {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .chart-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .label-container {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .color-indicator {
        width: 12px;
        height: 12px;
        border-radius: 50%;
    }

    .category-label {
        font-size: 0.9rem;
    }

    .amount-container {
        text-align: right;
    }

    .amount {
        font-weight: bold;
        font-size: 0.9rem;
    }

    .percentage {
        font-size: 0.8rem;
        color: #7f8c8d;
        margin-left: 0.25rem;
    }

    .no-data {
        color: #7f8c8d;
        font-style: italic;
        text-align: center;
        padding: 2rem 0;
    }
</style>
