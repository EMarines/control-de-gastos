<script lang="ts">
    import { onMount } from 'svelte';
    // Importar la función fija desde el nuevo archivo
    import { getExpensesByCategoryForLocation } from '../stores/transactions';
    import { transactions } from '../stores/transactions';
    import type { Transaction } from '../stores/transactions';
    import { logData, logError, inspectObject } from '../util/debug.js';
    import { formatCurrency } from '../util/formatters';
    
    // Periodo de tiempo para mostrar datos - compartido entre ambas gráficas
    let period: 'month' | 'last30days' = 'month';
    
    // Mensaje para el subtítulo que cambia según el periodo seleccionado
    $: subtitle = period === 'month' 
        ? `Distribución por cuenta - ${getCurrentMonthName()}`
        : "Distribución por cuenta - Últimos 30 días";
    
    // Función para obtener el nombre del mes actual
    function getCurrentMonthName(): string {
        const monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        return monthNames[new Date().getMonth()];
    }
    
    let mounted = false;
    const size = 140; // Tamaño más pequeño de cada gráfica
    const radius = size / 2;
    const centerX = radius;
    const centerY = radius;
      
    // Colores para las categorías
    const backgroundColors = [
        '#e74c3c',
        '#3498db',
        '#2ecc71',
        '#f39c12',
        '#9b59b6',
        '#1abc9c',
        '#34495e',
        '#d35400',
        '#16a085',
        '#8e44ad'
    ];
    
    onMount(() => {
        mounted = true;
    });
    
    // Función para convertir grados a radianes
    function toRadians(degrees: number): number {
        return degrees * Math.PI / 180;
    }
    
    // Función para calcular las coordenadas de un punto en el círculo
    function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
        const angleInRadians = toRadians(angleInDegrees - 90); // Restamos 90° para que empiece desde arriba
        return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
        };
    }
    
    // Función para generar el path de un arco SVG
    function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number): string {
        const start = polarToCartesian(x, y, radius, endAngle);
        const end = polarToCartesian(x, y, radius, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
        
        return [
            "M", start.x, start.y, 
            "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
            "L", x, y,
            "Z"
        ].join(" ");
    }
    
    // Función para calcular los datos de la gráfica para una ubicación
    function calculatePercentages(location: string) {
        try {
            if (!location) {
                console.warn('LocationPieChart: No location specified');
                return []; // Si no hay ubicación, devolver array vacío
            }
            
            console.log(`LocationPieChart: Calculando porcentajes para "${location}" en periodo "${period}"`);
            
            // La función getExpensesByCategoryForLocation ahora maneja internamente tanto "Match Home" como "MatchHome"
            const expenses = getExpensesByCategoryForLocation(location, period);
            console.log(`LocationPieChart: Gastos obtenidos para "${location}" en periodo "${period}":`, expenses);
            
            // Verificar si expenses es un objeto válido
            if (!expenses || typeof expenses !== 'object') {
                console.error(`LocationPieChart: Los gastos obtenidos no son un objeto válido para "${location}"`, expenses);
                return [];
            }
            
            // Calcular total de manera segura
            const expenseValues = Object.values(expenses);
            if (!expenseValues.length) {
                console.log(`LocationPieChart: No hay categorías de gastos para "${location}"`);
                return [];
            }
            
            const total = expenseValues.reduce((sum, amount) => sum + Number(amount), 0);
            console.log(`LocationPieChart: Total para "${location}": ${total}`);
            
            // Si no hay gastos, mostrar un mensaje
            if (total === 0) {
                console.log(`LocationPieChart: No hay gastos para "${location}"`);
                return [];
            }
            
            let startAngle = 0;
            return Object.entries(expenses).map(([category, amount], index) => {
                // Convertir amount a número si no lo es
                const numAmount = typeof amount === 'number' ? amount : Number(amount);
                
                // Calcular porcentaje de forma segura
                const percent = total > 0 ? (numAmount / total * 100) : 0;
                const sweepAngle = percent * 3.6; // 3.6 = 360/100 (convierte porcentaje a grados)
                const endAngle = startAngle + sweepAngle;
                
                // Crear el path SVG para este segmento
                const pathD = describeArc(centerX, centerY, radius, startAngle, endAngle);
                
                const item = {
                    category,
                    amount: numAmount,
                    percent: Math.round(percent * 10) / 10, // Redondear a 1 decimal
                    color: backgroundColors[index % backgroundColors.length], // Asignar colores cíclicamente
                    pathD
                };
                
                startAngle = endAngle; // El siguiente segmento comienza donde termina este
                return item;
            }).filter(item => item.amount > 0);
        } catch (error) {
            console.error(`Error al calcular porcentajes para "${location}":`, error);
            return [];
        }
    }
    
    
</script>

<div class="chart-container">
    <div class="chart-header">
        <h2 class="chart-title">Distribución de Egresos por Ubicación</h2>
        
        <!-- Selector de periodo centralizado para ambas gráficas -->
        <div class="period-selector">
            <label>
                <input type="radio" name="period" value="month" bind:group={period}>
                Mes actual
            </label>
            <label>
                <input type="radio" name="period" value="last30days" bind:group={period}>
                Últimos 30 días
            </label>
        </div>
    </div>
    <p class="subtitle-shared">{subtitle}</p>
      <!-- Ambas gráficas dentro de la misma card -->
    <div class="card charts-container">
        <div class="charts-wrapper">
            <!-- Gráfica de Casa -->
            <div class="location-chart">
                <h3>Casa</h3>
                
                <div class="pie-chart-container">
                    {#if mounted}
                        {@const percentages = calculatePercentages('Casa')}
                        
                        {#if percentages.length > 0}
                            <svg width={size} height={size} viewBox="0 0 {size} {size}" class="pie-chart">
                                {#each percentages as item}
                                    <path 
                                        d={item.pathD} 
                                        fill={item.color}
                                        stroke="#fff" 
                                        stroke-width="1">
                                        <title>{item.category}: {formatCurrency(item.amount)} ({item.percent}%)</title>
                                    </path>
                                {/each}
                            </svg>
                            
                            <div class="chart-legend">
                                {#each percentages as item}
                                    <div class="legend-item">
                                        <div class="color-box" style="background-color: {item.color};"></div>
                                        <span title="{formatCurrency(item.amount)}">{item.category}: {item.percent}%</span>
                                    </div>
                                {/each}
                            </div>
                        {:else}
                            <div class="no-data">
                                <p>No hay datos para <strong>Casa</strong></p>
                            </div>
                        {/if}
                    {:else}
                        <p>Cargando...</p>
                    {/if}
                </div>
            </div>
            
            <!-- Gráfica de MatchHome -->
            <div class="location-chart">
                <h3>MatchHome</h3>
                
                <div class="pie-chart-container">
                    {#if mounted}
                        {@const percentages = calculatePercentages('MatchHome')}
                        
                        {#if percentages.length > 0}
                            <svg width={size} height={size} viewBox="0 0 {size} {size}" class="pie-chart">
                                {#each percentages as item}
                                    <path 
                                        d={item.pathD} 
                                        fill={item.color}
                                        stroke="#fff" 
                                        stroke-width="1">
                                        <title>{item.category}: {formatCurrency(item.amount)} ({item.percent}%)</title>
                                    </path>
                                {/each}
                            </svg>
                            
                            <div class="chart-legend">
                                {#each percentages as item}
                                    <div class="legend-item">
                                        <div class="color-box" style="background-color: {item.color};"></div>
                                        <span title="{formatCurrency(item.amount)}">{item.category}: {item.percent}%</span>
                                    </div>
                                {/each}
                            </div>                        
                        {:else}
                            <div class="no-data">
                                <p>No hay datos para <strong>MatchHome</strong></p>
                            </div>
                        {/if}
                    {:else}
                        <p>Cargando...</p>
                    {/if}
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    .chart-container {
        width: 100%;
    }
    
    .charts-container {
        padding: 20px;
        margin-bottom: 20px;
    }
    
    .charts-wrapper {
        display: flex;
        justify-content: center;
        gap: 20px;
        margin-top: 0.5rem;
    }
    
    .location-chart {
        flex: 1;
        min-width: 150px;
        max-width: 300px;
        padding: 10px;
    }
    
    .chart-title {
        text-align: center;
        margin-bottom: 0.5rem;
        color: var(--dark-color);
        font-size: 1.5rem;
    }
    
    .pie-chart-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-top: 0.5rem;
    }
    
    .pie-chart {
        filter: drop-shadow(0 2px 5px rgba(0,0,0,0.1));
    }
      .chart-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        margin-bottom: 5px;
    }
    
    .chart-legend {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        margin-top: 0.5rem;
        gap: 0.3rem;
        font-size: 0.8em;
    }
    
    .period-selector {
        display: flex;
        gap: 1rem;
        font-size: 0.8rem;
    }
    
    .period-selector label {
        display: flex;
        align-items: center;
        cursor: pointer;
    }
    
    .period-selector input {
        margin-right: 0.4rem;
    }

    .legend-item {
        display: flex;
        align-items: center;
        margin-right: 0.3rem;
    }
    
    .color-box {
        width: 10px;
        height: 10px;
        margin-right: 3px;
        border-radius: 2px;
    }
    
    h3 {
        text-align: center;
        margin-bottom: 0.2rem;
        font-size: 1rem;
        color: #555;
    }
    
    .subtitle-shared {
        text-align: center;
        font-size: 0.8rem;
        margin: 0 0 10px 0;
        color: #777;
        font-style: italic;
    }

    .no-data {
        text-align: center;
        padding: 0.5rem;
        font-style: italic;
        color: #777;
        font-size: 0.9em;
    }
    
    path {
        transition: transform 0.2s ease-out;
    }
    
    path:hover {
        transform: scale(1.03);
        transform-origin: center;
    }
      .chart-title {
        font-size: 1.2rem;
        margin: 0;
    }
    
    
    
    @media (max-width: 768px) {
        .charts-wrapper {
            flex-direction: row;
            flex-wrap: wrap;
            justify-content: center;
        }
        
        .location-chart {
            flex: 0 0 48%;
            min-width: 140px;
        }
        
        .chart-header {
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
        }
        
        .chart-title {
            font-size: 1.1rem;
        }
    }
    
    @media (max-width: 500px) {
        .charts-wrapper {
            flex-direction: column;
            align-items: center;
        }
        
        .location-chart {
            width: 100%;
            max-width: 100%;
        }
    }
</style>