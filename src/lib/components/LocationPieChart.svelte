<script lang="ts">
    import { onMount } from 'svelte';
    // Importar la función fija desde el nuevo archivo
    import { getExpensesByCategoryForLocation } from '../stores/fixed-functions';
    import { logData, logError, inspectObject } from '../util/debug.js';
      // Props
    export let location: string = ''; // 'Casa' o 'Match Home'
    export let title: string = '';
      // Si no se proporciona un título, usar uno predeterminado basado en la ubicación
    $: if (!title && location) {
        title = `Egresos - ${location}`;
    }
    
    // Mensaje para el subtítulo
    const subtitle = "Distribución por cuenta";
    
    let mounted = false;
    const size = 180; // Tamaño ligeramente más pequeño que el gráfico principal
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
      
    function calculatePercentages() {
        try {
            if (!location) {
                console.warn('LocationPieChart: No location specified');
                return []; // Si no hay ubicación, devolver array vacío
            }
            
            console.log(`LocationPieChart: Calculando porcentajes para "${location}"`);
            const expenses = getExpensesByCategoryForLocation(location);
            console.log(`LocationPieChart: Gastos obtenidos para "${location}":`, expenses);
            
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

<div class="card location-card">
    <h3>{title}</h3>
    <p class="subtitle">{subtitle}</p>
    
    <div class="pie-chart-container">
        {#if mounted}
            {@const percentages = calculatePercentages()}
            
            {#if percentages.length > 0}
                <svg width={size} height={size} viewBox="0 0 {size} {size}" class="pie-chart">
                    {#each percentages as item}
                        <path 
                            d={item.pathD} 
                            fill={item.color}
                            stroke="#fff" 
                            stroke-width="1">
                            <title>{item.category}: {item.amount.toFixed(2)}€ ({item.percent}%)</title>
                        </path>
                    {/each}
                </svg>
                
                <div class="chart-legend">
                    {#each percentages as item}
                        <div class="legend-item">
                            <div class="color-box" style="background-color: {item.color};"></div>
                            <span>{item.category}: {item.percent}%</span>
                        </div>
                    {/each}
                </div>            {:else}                <div class="no-data">
                    <p>No hay datos de egresos para <strong>{location || 'esta ubicación'}</strong>.</p>
                    <p>Verifica que existan transacciones de tipo "egreso" con la ubicación "{location}".</p>
                    <button class="debug-button" on:click={() => {
                        inspectObject(getExpensesByCategoryForLocation(location), 2);
                        logData('LocationPieChart', 'Debug para ubicación', location);
                    }}>Depurar datos</button>
                </div>
            {/if}
        {:else}
            <p>Cargando gráfico...</p>
        {/if}
    </div>
</div>

<style>
    .location-card {
        margin-bottom: 1rem;
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
    
    .chart-legend {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        margin-top: 1rem;
        gap: 0.5rem;
        font-size: 0.9em;
    }
    
    .legend-item {
        display: flex;
        align-items: center;
        margin-right: 0.5rem;
    }
    
    .color-box {
        width: 12px;
        height: 12px;
        margin-right: 4px;
        border-radius: 3px;
    }
      h3 {
        text-align: center;
        margin-bottom: 0.2rem;
        font-size: 1.1rem;
    }
    
    .subtitle {
        text-align: center;
        font-size: 0.85rem;
        margin-top: 0;
        margin-bottom: 0.5rem;
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
