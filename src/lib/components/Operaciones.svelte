<script lang="ts">
    import { onMount } from 'svelte';
    import { transactions, type Transaction } from '../stores/transactions'; // Importar el store y el tipo

    import { formatCurrency } from '../util/formatters'; // Importar la función de formato
    console.log($transactions);
    
    // Usar el tipo Transaction del store. Renombrar localmente si se prefiere, pero Transaction es claro.
    type Operacion = Transaction; 
    
    let operaciones: Operacion[] = [];
    let operacionesFiltradas: Operacion[] = [];
    let datosCargadosInicialmente: boolean = false; // Para saber si ya procesamos los datos del store una vez
    
    // Filtros
    let filtroTipo: string = 'todos'; // 'todos', 'ingreso', 'egreso'
    let filtroCuenta: string = 'todas'; // Cambiado de filtroCategoria a filtroCuenta
    let filtroUbicacion: string = 'todas';
    let filtroBusqueda: string = '';
    let filtroFechaDesde: string = '';
    let filtroFechaHasta: string = '';
    
    // Ordenación
    let ordenPor: string = 'fecha'; // 'fecha', 'monto', 'descripcion'
    let ordenDireccion: 'asc' | 'desc' = 'desc';
    
    // Cuentas únicas para filtro (anteriormente categorías)
    let cuentasUnicas: string[] = [];
    let ubicaciones: string[] = [];
    
    // Totales
    let totalIngresos: number = 0;
    let totalGastos: number = 0;
    let saldo: number = 0;
    
    // Formatear fecha para mostrarla
    function formatearFecha(fechaISO: string): string {
        const fecha = new Date(fechaISO);
        return fecha.toLocaleDateString('es-ES', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
        });
    }
    
    // Función para filtrar operaciones
    function filtrarOperaciones(): void {
        operacionesFiltradas = operaciones.filter(op => {
            // Filtro por tipo
            if (filtroTipo !== 'todos' && op.type !== filtroTipo) return false;
            
            // Filtro por cuenta (anteriormente categoría)
            if (filtroCuenta !== 'todas' && op.cuenta !== filtroCuenta) return false;
            
            // Filtro por ubicación
            if (filtroUbicacion !== 'todas' && op.location !== filtroUbicacion) return false;
            
            // Filtro por texto de búsqueda
            if (filtroBusqueda) {
                const busqueda = filtroBusqueda.toLowerCase();
                const descripcionMatches = op.description?.toLowerCase().includes(busqueda);
                const notasMatches = op.notes?.toLowerCase().includes(busqueda);
                const facturaMatches = op.invoice?.toLowerCase().includes(busqueda);
                if (!descripcionMatches && !notasMatches && !facturaMatches) return false;
            }
            
            // Filtro por fecha desde
            if (filtroFechaDesde) {
                const fechaDesde = new Date(filtroFechaDesde);
                const fechaOp = new Date(op.date);
                if (fechaOp < fechaDesde) return false;
            }
            
            // Filtro por fecha hasta
            if (filtroFechaHasta) {
                const fechaHasta = new Date(filtroFechaHasta);
                fechaHasta.setHours(23, 59, 59, 999); // Fin del día
                const fechaOp = new Date(op.date);
                if (fechaOp > fechaHasta) return false;
            }
            
            return true;
        });
        
        // Aplicar ordenación
        operacionesFiltradas.sort((a, b) => {
            if (ordenPor === 'fecha') {
                const fechaA = new Date(a.date).getTime();
                const fechaB = new Date(b.date).getTime();
                return ordenDireccion === 'asc' ? fechaA - fechaB : fechaB - fechaA;
            } else if (ordenPor === 'monto') {
                return ordenDireccion === 'asc' ? a.amount - b.amount : b.amount - a.amount;
            } else if (ordenPor === 'descripcion') {
                return ordenDireccion === 'asc' 
                    ? a.description.localeCompare(b.description) 
                    : b.description.localeCompare(a.description);
            }
            return 0;
        });
        
        // Calcular totales
        totalIngresos = operacionesFiltradas
            .filter(op => op.type === 'ingreso')
            .reduce((sum, op) => sum + op.amount, 0);
            
        totalGastos = operacionesFiltradas
            .filter(op => op.type === 'egreso')
            .reduce((sum, op) => sum + op.amount, 0);
            
        saldo = totalIngresos - totalGastos;
    }

    // Procesar datos del store de transacciones
    function procesarTransacciones(transaccionesDelStore: Transaction[]): void {
        console.log('[Operaciones.svelte] Datos recibidos del store en procesarTransacciones:', JSON.parse(JSON.stringify(transaccionesDelStore)));
        operaciones = [...transaccionesDelStore]; // Crear una copia para evitar modificar el store directamente si no es necesario
        console.log(`[Operaciones] Procesando ${operaciones.length} transacciones del store.`);

        // Extraer cuentas y ubicaciones únicas para los filtros
        const cuentasSet = new Set<string>();
        const ubicacionesSet = new Set<string>();
        
        operaciones.forEach(op => {
            if (op.cuenta) cuentasSet.add(op.cuenta); // Usar op.cuenta
            if (op.location) ubicacionesSet.add(op.location);
        });
        
        cuentasUnicas = Array.from(cuentasSet).sort();
        ubicaciones = Array.from(ubicacionesSet).sort();
        
        // Aplicar filtros
        filtrarOperaciones();
        
        if (!datosCargadosInicialmente) {
            datosCargadosInicialmente = true;
        }
    }
    
    // Cambiar ordenación
    function cambiarOrden(campo: string): void {
        if (ordenPor === campo) {
            // Si ya estamos ordenando por este campo, cambiar dirección
            ordenDireccion = ordenDireccion === 'asc' ? 'desc' : 'asc';
        } else {
            // Nuevo campo de ordenación
            ordenPor = campo;
            // Para fecha, ordenar descendente por defecto, para otros ascendente
            ordenDireccion = campo === 'fecha' ? 'desc' : 'asc';
        }
        
        filtrarOperaciones();
    }
    
    // Ejecutar filtros cada vez que cambian
    $: {
        if (datosCargadosInicialmente) { // Solo filtrar si los datos ya se cargaron una vez
            filtroTipo;
            filtroCuenta;
            filtroUbicacion;
            filtroBusqueda;
            filtroFechaDesde;
            filtroFechaHasta;
            filtrarOperaciones();
        }
    }
    
    // Suscribirse al store de transacciones al montar el componente
    onMount(() => {
        const unsubscribe = transactions.subscribe(procesarTransacciones);
        return unsubscribe; // Devolver la función de desuscripción para limpiar al desmontar
    });
</script>

<div class="operaciones-container">
    <h2>Operaciones</h2>
    
    <!-- Panel de filtros -->
    <div class="filtros-panel">
        <div class="filtro-grupo">
            <label for="filtroTipo">Tipo:</label>
            <select id="filtroTipo" bind:value={filtroTipo}>
                <option value="todos">Todos</option>
                <option value="ingreso">Ingresos</option>
                <option value="egreso">Egresos</option>
            </select>
        </div>
        
        <div class="filtro-grupo">
            <label for="filtroCuenta">Cuenta:</label>
            <select id="filtroCuenta" bind:value={filtroCuenta}>
                <option value="todas">Todas</option>
                {#each cuentasUnicas as cuenta}
                    <option value={cuenta}>{cuenta.charAt(0).toUpperCase() + cuenta.slice(1)}</option>
                {/each}
            </select>
        </div>
        
        <div class="filtro-grupo">
            <label for="filtroUbicacion">Ubicación:</label>
            <select id="filtroUbicacion" bind:value={filtroUbicacion}>
                <option value="todas">Todas</option>
                {#each ubicaciones as ubicacion}
                    <option value={ubicacion}>{ubicacion}</option>
                {/each}
            </select>
        </div>
        
        <div class="filtro-fecha">
            <div class="filtro-grupo">
                <label for="filtroFechaDesde">Desde:</label>
                <input 
                    type="date" 
                    id="filtroFechaDesde" 
                    bind:value={filtroFechaDesde}
                >
            </div>
            
            <div class="filtro-grupo">
                <label for="filtroFechaHasta">Hasta:</label>
                <input 
                    type="date" 
                    id="filtroFechaHasta" 
                    bind:value={filtroFechaHasta}
                >
            </div>
        </div>
        
        <div class="filtro-busqueda">
            <input 
                type="text" 
                placeholder="Buscar..."
                bind:value={filtroBusqueda}
            >
        </div>
    </div>
    
    <!-- Resumen financiero -->
    <div class="resumen-financiero">
        <div class="resumen-item ingresos">
            <span>Ingresos</span>
            <strong>{formatCurrency(totalIngresos)}</strong>
        </div>
        
        <div class="resumen-item gastos">
            <span>Gastos</span>
            <strong>{formatCurrency(totalGastos)}</strong>
        </div>
        
        <div class="resumen-item saldo" class:negativo={saldo < 0}>
            <span>Saldo</span>
            <strong>{formatCurrency(saldo)}</strong>
        </div>
    </div>
    
    <!-- Tabla de operaciones -->
    {#if !datosCargadosInicialmente && operacionesFiltradas.length === 0}
        <div class="cargando">Cargando datos...</div>
    {:else if datosCargadosInicialmente && operacionesFiltradas.length === 0}
        <div class="sin-datos">
            No se encontraron operaciones con los filtros seleccionados.
        </div>
    {:else}
        <div class="tabla-operaciones">
            <table>
                <thead>
                    <tr>
                        <th on:click={() => cambiarOrden('fecha')} class:activo={ordenPor === 'fecha'}>
                            Fecha {ordenPor === 'fecha' && (ordenDireccion === 'asc' ? '▲' : '▼')}
                        </th>
                        <th on:click={() => cambiarOrden('descripcion')} class:activo={ordenPor === 'descripcion'}>
                            Descripción {ordenPor === 'descripcion' && (ordenDireccion === 'asc' ? '▲' : '▼')}
                        </th>
                        <th>Cuenta</th>
                        <th>Ubicación</th>
                        <th on:click={() => cambiarOrden('monto')} class:activo={ordenPor === 'monto'}>
                            Monto {ordenPor === 'monto' && (ordenDireccion === 'asc' ? '▲' : '▼')}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {#each operacionesFiltradas as op}
                        <tr class:ingreso={op.type === 'ingreso'} class:egreso={op.type === 'egreso'}>
                            <td>{formatearFecha(op.date)}</td>
                            <td class="descripcion-celda">
                                <div class="descripcion-contenido">
                                    <span>{op.description}</span>
                                    {#if op.notes}
                                        <div class="notas">{op.notes}</div>
                                    {/if}
                                    {#if op.invoice}
                                        <div class="factura">Ref: {op.invoice}</div>
                                    {/if}
                                </div>
                            </td>
                            <td>
                                {op.type === 'ingreso' ? 'Ingreso' : op.cuenta ? op.cuenta.charAt(0).toUpperCase() + op.cuenta.slice(1) : '-'}
                            </td>
                            <td>{op.location || '-'}</td>
                            <td class="monto-celda">
                                <span class={op.type}>
                                     {op.type === 'ingreso' ? '+' : '-'}{formatCurrency(op.amount, '')}
                                </span>
                                {#if op.paymentMethod}
                                    <div class="metodo-pago">{op.paymentMethod}</div>
                                {/if}
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
</div>

<style>
    .operaciones-container {
        background-color: white;
        border-radius: 10px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        padding: 1.5rem;
        margin-bottom: 2rem;
    }
    
    h2 {
        margin-top: 0;
        margin-bottom: 1.5rem;
        color: #333;
        font-size: 1.8rem;
    }
    
    .filtros-panel {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        margin-bottom: 1.5rem;
        background-color: #f9f9f9;
        padding: 1rem;
        border-radius: 8px;
    }
    
    .filtro-grupo {
        display: flex;
        flex-direction: column;
        min-width: 120px;
    }
    
    .filtro-grupo label {
        font-size: 0.85rem;
        margin-bottom: 0.3rem;
        color: #666;
    }
    
    .filtro-grupo select,
    .filtro-grupo input,
    .filtro-busqueda input {
        padding: 0.5rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 0.9rem;
    }
    
    .filtro-fecha {
        display: flex;
        gap: 0.5rem;
    }
    
    .filtro-busqueda {
        flex-grow: 1;
    }
    
    .filtro-busqueda input {
        width: 100%;
    }
    
    .resumen-financiero {
        display: flex;
        gap: 1.5rem;
        margin-bottom: 1.5rem;
        padding: 1rem;
        background-color: #f5f5f5;
        border-radius: 8px;
    }
    
    .resumen-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        min-width: 120px;
    }
    
    .resumen-item span {
        font-size: 0.9rem;
        color: #666;
    }
    
    .resumen-item strong {
        font-size: 1.3rem;
        margin-top: 0.3rem;
    }
    
    .ingresos {
        background-color: rgba(76, 175, 80, 0.1);
    }
    
    .ingresos strong {
        color: #4CAF50;
    }
    
    .gastos {
        background-color: rgba(244, 67, 54, 0.1);
    }
    
    .gastos strong {
        color: #F44336;
    }
    
    .saldo {
        background-color: rgba(33, 150, 243, 0.1);
    }
    
    .saldo strong {
        color: #2196F3;
    }
    
    .saldo.negativo strong {
        color: #F44336;
    }
    
    .tabla-operaciones {
        overflow-x: auto; /* Mantenemos el scroll horizontal si es necesario para la tabla */
        max-height: 700px; /* Define una altura máxima, ajusta este valor según tus necesidades */
        overflow-y: auto; /* Agrega scroll vertical cuando el contenido excede max-height */
    }
    
    table {
        width: 100%;
        border-collapse: collapse;
    }
    
    th, td {
        padding: 0.8rem;
        text-align: left;
        border-bottom: 1px solid #eee;
    }
    
    th {
        background-color: #f5f5f5;
        font-weight: 600;
        color: #444;
        cursor: pointer;
        user-select: none;
    }
    
    th.activo {
        background-color: #e9e9e9;
    }
    
    tbody tr:hover {
        background-color: #f9f9f9;
    }
    
    .descripcion-celda {
        max-width: 300px;
    }
    
    .descripcion-contenido {
        display: flex;
        flex-direction: column;
    }
    
    .notas, .factura {
        font-size: 0.8rem;
        color: #777;
        margin-top: 0.3rem;
    }
    
    .factura {
        font-style: italic;
    }
    
    .monto-celda {
        font-weight: 500;
    }
    
    .metodo-pago {
        font-size: 0.8rem;
        color: #777;
        margin-top: 0.3rem;
    }
    
    .ingreso {
        border-left: 3px solid #4CAF50;
    }
    
    .egreso { /* Cambiado de gasto a egreso */
        border-left: 3px solid #F44336;
    }
    
    .ingreso .ingreso {
        color: #4CAF50;
    }
    /* Estilo para montos de egreso */
    .egreso .egreso, .egreso span[class*="egreso"] { /* Asegurar que el monto de egreso también se coloree */
        color: #F44336;
    }
    
    .cargando, .error, .sin-datos {
        padding: 2rem;
        text-align: center;
        background-color: #f9f9f9;
        border-radius: 8px;
        margin: 1rem 0;
    }
    
    button {
        margin-top: 1rem;
        padding: 0.5rem 1rem;
        background-color: #2196F3;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }
    
    button:hover {
        background-color: #1976D2;
    }
</style>
