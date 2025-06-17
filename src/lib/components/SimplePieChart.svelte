<script lang="ts">
    import { onMount } from 'svelte';
    import { getExpensesByCategory } from '../stores/transactions';
    
    let mounted = false;
    const size = 200; // Tamaño del gráfico
    const radius = size / 2; // Radio del gráfico
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
        const expenses = getExpensesByCategory();
        const total = Object.values(expenses).reduce<number>((sum, amount) => sum + (typeof amount === 'number' ? amount : 0), 0);
        
        // Si no hay gastos, mostrar un mensaje
        if (total === 0) {
            return [];
        }
        
        let startAngle = 0;
        
        return Object.entries(expenses).map(([category, amount], index) => {
            const amountValue = amount as number;
            const percent = total > 0 ? (amountValue / total * 100) : 0;
            const sweepAngle = percent * 3.6; // 3.6 = 360/100 (convierte porcentaje a grados)
            const endAngle = startAngle + sweepAngle;
            
            // Crear el path SVG para este segmento
            const pathD = describeArc(centerX, centerY, radius, startAngle, endAngle);
            const item = {
                category, // Usamos directamente el nombre de la categoría (cuenta)
                amount: amountValue,
                percent: Math.round(percent * 10) / 10, // Redondear a 1 decimal
                color: backgroundColors[index % backgroundColors.length], // Asignar colores cíclicamente
                pathD
            };
            
            startAngle = endAngle; // El siguiente segmento comienza donde termina este
            return item;
        }).filter(item => (item.amount as number) > 0);
    }
</script>

<div class="card">
    <h2>Distribución de Egresos</h2>
    
    <div class="pie-chart-container">
        {#if mounted}
            {@const percentages = calculatePercentages()}
              {#if percentages.length > 0}
                <svg width={size} height={size} viewBox="0 0 {size} {size}" class="pie-chart" role="img" aria-labelledby="pieChartTitle pieChartDesc">
                    <title id="pieChartTitle">Distribución de Egresos</title>
                    <desc id="pieChartDesc">Gráfico circular que muestra el porcentaje de gastos por categoría</desc>
                    {#each percentages as item}
                        <path 
                            d={item.pathD} 
                            fill={item.color}
                            stroke="#fff" 
                            stroke-width="1"
                            aria-label="{item.category}: {item.amount.toFixed(2)}€ ({item.percent}%)"
                        >
                            <title>{item.category}: {item.amount.toFixed(2)}€ ({item.percent}%)</title>
                        </path>
                    {/each}
                </svg>
                  <div class="chart-legend" role="list" aria-label="Leyenda del gráfico">
                    {#each percentages as item}
                        <div class="legend-item" role="listitem">
                            <div class="color-box" style="background-color: {item.color};" aria-hidden="true"></div>
                            <span>{item.category}: {item.percent}% ({item.amount.toFixed(2)}€)</span>
                        </div>
                    {/each}
                </div>            {:else}
                <div class="no-data" role="status" aria-live="polite">
                    <p>No hay datos de egresos con cuentas para mostrar.</p>
                    <p>Registra egresos con cuentas para ver la distribución.</p>
                </div>
            {/if}        {:else}
            <p role="status" aria-live="polite">Cargando gráfico...</p>
        {/if}
    </div>
</div>

<style>
    .pie-chart-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-top: 1rem;
    }
    
    .pie-chart {
        filter: drop-shadow(0 2px 5px rgba(0,0,0,0.1));
    }
    
    .chart-legend {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        margin-top: 1.5rem;
        gap: 0.8rem;
    }
    
    .legend-item {
        display: flex;
        align-items: center;
        margin-right: 0.5rem;
    }
    
    .color-box {
        width: 15px;
        height: 15px;
        margin-right: 5px;
        border-radius: 3px;
    }
    
    h2 {
        text-align: center;
        margin-bottom: 1rem;
    }

    .no-data {
        text-align: center;
        padding: 1rem;
        font-style: italic;
        color: #777;
    }
    
    path {
        transition: transform 0.2s ease-out;
    }
    
    path:hover {
        transform: scale(1.03);
        transform-origin: center;
    }
</style>
