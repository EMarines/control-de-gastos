<script lang="ts">
    import { onMount } from 'svelte';
    import { 
        transactions, 
        type Transaction, 
        removeTransaction, 
        updateTransaction, 
        addTransaction,
        loadFirstPage,
        loadMoreTransactions, 
        isLoadingMore,
        hasMoreData,
        isInitialDataLoaded,
        fixDateFormatsInTransactions    } from '../stores/transactions'; // Importar el store, tipo y funciones de paginación
    import ActionButton from './ActionButton.svelte';
    import { forceRefreshData, refreshing } from '../services/data-refresh';
    import SimpleIncomeModal from './SimpleIncomeModal.svelte'; // Cambiado a SimpleIncomeModal
    import SimpleExpenseModal from './SimpleExpenseModal.svelte'; // Cambiado a SimpleExpenseModal
    
    import { formatCurrency, parseCustomDate, formatearFecha } from '../util/formatters'; // Importar la función de formato
    
    type Operacion = Transaction; 
    
    import { derived } from 'svelte/store';
    // Usar directamente el store de transacciones y filtrar en un derived store
    let filtroTipo: string = 'todos';
    let filtroCuenta: string = 'todas';
    let filtroUbicacion: string = 'todas';
    let filtroBusqueda: string = '';
    let filtroFechaDesde: string = '';
    let filtroFechaHasta: string = '';

    // Derived store para operaciones filtradas
    $: operacionesFiltradas = (() => {
        let arr = [...$transactions];
        // Filtros
        if (filtroTipo !== 'todos') arr = arr.filter(op => op.type?.toLowerCase() === filtroTipo);
        if (filtroCuenta !== 'todas') arr = arr.filter(op => (op.cuenta || op.category) === filtroCuenta);
        if (filtroUbicacion !== 'todas') {
            arr = arr.filter(op => {
                if (!op.location) return false;
                if (filtroUbicacion === 'Match Home' || filtroUbicacion === 'MatchHome') {
                    return op.location === 'Match Home' || op.location === 'MatchHome';
                }
                return op.location === filtroUbicacion;
            });
        }
        if (filtroBusqueda) {
            const b = filtroBusqueda.toLowerCase().trim();
            arr = arr.filter(op =>
                (op.description != null && String(op.description).toLowerCase().includes(b)) ||
                (op.notes != null && String(op.notes).toLowerCase().includes(b)) ||
                (op.invoice != null && String(op.invoice).toLowerCase().includes(b)) ||
                (op.cuenta != null && String(op.cuenta).toLowerCase().includes(b)) ||
                (op.subcuenta != null && String(op.subcuenta).toLowerCase().includes(b)) ||
                (op.location != null && String(op.location).toLowerCase().includes(b)) ||
                (op.paymentMethod != null && String(op.paymentMethod).toLowerCase().includes(b))
            );
        }
        if (filtroFechaDesde) {
            const [y, m, d] = filtroFechaDesde.split('-').map(Number);
            const desde = new Date(y, m - 1, d, 0, 0, 0, 0);
            arr = arr.filter(op => parseCustomDate(op.date) >= desde.getTime());
        }
        if (filtroFechaHasta) {
            const [y, m, d] = filtroFechaHasta.split('-').map(Number);
            const hasta = new Date(y, m - 1, d, 23, 59, 59, 999);
            arr = arr.filter(op => parseCustomDate(op.date) <= hasta.getTime());
        }
        // Ordenar por fecha descendente
        arr.sort((a, b) => parseCustomDate(b.date) - parseCustomDate(a.date));
        return arr;
    })();

    // Eliminado: declaración duplicada de filtros (ya están declarados arriba)
    
    // Ordenación
    let ordenPor: string = 'fecha'; // 'fecha', 'monto', 'descripcion'
    let ordenDireccion: 'asc' | 'desc' = 'desc';
    
    // Cuentas únicas para filtro (anteriormente categorías)
    $: cuentasUnicas = Array.from(new Set($transactions.map(op => op.cuenta || op.category).filter((c): c is string => !!c)));
    $: ubicaciones = Array.from(new Set($transactions.map(op => {
        if (op.location === 'MatchHome') return 'Match Home';
        return op.location;
    }).filter((u): u is string => !!u)));
    
    // Totales
    $: totalIngresos = operacionesFiltradas.filter((op: Operacion) => op.type === 'ingreso').reduce((sum, op) => sum + op.amount, 0);
    $: totalGastos = operacionesFiltradas.filter((op: Operacion) => op.type === 'egreso').reduce((sum, op) => sum + op.amount, 0);
    $: saldo = totalIngresos - totalGastos;
    
    // Estado para la edición y borrado
    let editingOperation: Operacion | null = null;
    let modalTypeToShow: 'income' | 'expense' | null = null;
    let deletingOperation: Operacion | null = null;
    
    // Función eliminada: la lógica de filtrado está en el derived store
    
    // Función eliminada: la lógica de procesamiento está en el store y derived store
    
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
        
        // filtrado y ordenación ahora es reactivo por el derived store
    }

  // En Operaciones.svelte
  function handleRowDoubleClick(operation: Operacion): void {
      editingOperation = operation;
      modalTypeToShow = operation.type.toLowerCase() === 'ingreso' ? 'income' : 'expense';
  }
  

    function handleModalClose(): void {
        modalTypeToShow = null;
        editingOperation = null; // Limpiar la operación en edición al cerrar
    }
    // Crear una combinación de todos los filtros para optimizar la reactividad
    $: filtrosCombinados = { 
        tipo: filtroTipo, 
        cuenta: filtroCuenta, 
        ubicacion: filtroUbicacion, 
        busqueda: filtroBusqueda, 
        fechaDesde: filtroFechaDesde, 
        fechaHasta: filtroFechaHasta,
        orden: ordenPor,
        direccion: ordenDireccion
    };

    // Borrar transacción
    async function handleDeleteOperation(op: Operacion) {
        if (confirm('¿Seguro que deseas borrar esta transacción?')) {
            try {
                await removeTransaction(op.id);
                alert('Transacción eliminada');
            } catch (e) {
                alert('Error al eliminar: ' + e);
            }
        }
    }
    
    // Eliminado: debounce y bloque reactivo innecesario
      // Variables para scroll infinito
    let tablaContainer: HTMLDivElement | undefined;
    let scrollLoadingThreshold = 200; // píxeles desde el fondo para cargar más
    let loadingMoreData = false; // Estado local para evitar múltiples cargas
      // Manejar el evento de scroll para cargar más datos cuando se acerca al final
    function handleScroll() {
        if (!tablaContainer) return;
        if ($isLoadingMore || !$hasMoreData || loadingMoreData) return;

        const { scrollTop, scrollHeight, clientHeight } = tablaContainer;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

        if (distanceFromBottom < scrollLoadingThreshold) {
            loadingMoreData = true;
            loadMoreTransactions().then(() => {
                loadingMoreData = false;
            }).catch(error => {
                console.error('Error al cargar más transacciones:', error);
                loadingMoreData = false;
            });
        }
    }
    
    // Optimizar la renderización evitando múltiples actualizaciones durante el scrolling
    let scrollTimer: number | null = null;
    function optimizedHandleScroll() {
        if (scrollTimer !== null) {
            clearTimeout(scrollTimer);
        }
        scrollTimer = setTimeout(() => {
            handleScroll();
            scrollTimer = null;
        }, 100) as unknown as number;
    }
    
    // Cargar la primera página de datos al montar
    onMount(() => {
        loadFirstPage();
    });

    function limpiarFiltros() {
        filtroTipo = 'todos';
        filtroCuenta = 'todas';
        filtroUbicacion = 'todas';
        filtroBusqueda = '';
        filtroFechaDesde = '';
        filtroFechaHasta = '';
    }

    $: hayFiltrosActivos = 
        filtroTipo !== 'todos' || 
        filtroCuenta !== 'todas' || 
        filtroUbicacion !== 'todas' || 
        (filtroBusqueda ?? '').trim() !== '' || 
        filtroFechaDesde !== '' || 
        filtroFechaHasta !== '';

    $: haySeleccion = hayFiltrosActivos && operacionesFiltradas.length > 0;

    function getFechaCSV(dateStr: string): string {
        if (!dateStr) return '';
        if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
            return dateStr.slice(0, 10);
        }
        const ts = parseCustomDate(dateStr);
        if (!ts || isNaN(ts)) return dateStr;
        const d = new Date(ts);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    function escapeCSV(val: unknown): string {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }

    async function compartirCSV() {
        if (!haySeleccion || operacionesFiltradas.length === 0) return;

        const headers = [
            'Fecha',
            'Tipo',
            'Descripción',
            'Cuenta',
            'Subcuenta',
            'Ubicación',
            'Monto',
            'Referencia',
            'Método de Pago',
            'Notas'
        ];

        const rows = operacionesFiltradas.map(op => {
            const montoNum = op.type?.toLowerCase() === 'egreso'
                ? -Math.abs(Number(op.amount) || 0)
                : Math.abs(Number(op.amount) || 0);
            const cuentaStr = op.type?.toLowerCase() === 'ingreso'
                ? 'Ingreso'
                : (op.cuenta || op.category || '');

            return [
                escapeCSV(getFechaCSV(op.date)),
                escapeCSV(op.type || ''),
                escapeCSV(op.description || ''),
                escapeCSV(cuentaStr),
                escapeCSV(op.subcuenta || ''),
                escapeCSV(op.location || ''),
                montoNum.toFixed(2),
                escapeCSV(op.invoice || ''),
                escapeCSV(op.paymentMethod || ''),
                escapeCSV(op.notes || '')
            ].join(',');
        });

        const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

        let filename = `operaciones_seleccion_${new Date().toISOString().slice(0, 10)}.csv`;
        if (filtroFechaDesde && filtroFechaHasta) {
            filename = `operaciones_${filtroFechaDesde}_a_${filtroFechaHasta}.csv`;
        } else if (filtroFechaDesde) {
            filename = `operaciones_desde_${filtroFechaDesde}.csv`;
        } else if (filtroFechaHasta) {
            filename = `operaciones_hasta_${filtroFechaHasta}.csv`;
        }

        if (typeof navigator !== 'undefined' && typeof File !== 'undefined' && typeof navigator.share === 'function') {
            try {
                const file = new File([blob], filename, { type: 'text/csv' });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: 'Operaciones seleccionadas',
                        text: `Exportación de ${operacionesFiltradas.length} operaciones`,
                        files: [file]
                    });
                    return;
                }
            } catch (err: any) {
                if (err?.name === 'AbortError') {
                    return;
                }
                console.warn('Web Share no disponible para archivos, usando descarga directa:', err);
            }
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
</script>

{#if modalTypeToShow === 'income'}
    <SimpleIncomeModal 
        show={true} 
        initialData={editingOperation} 
        on:close={handleModalClose} 
    />
{:else if modalTypeToShow === 'expense'}
    <SimpleExpenseModal 
        show={true} 
        initialData={editingOperation} 
        on:close={handleModalClose} 
    />
{/if}

<div class="operaciones-container">
    <div class="header-container">
        <h2>Operaciones</h2>
        <div class="actions-container">
            <ActionButton 
                text="Corregir fechas" 
                icon="🔧"
                action={async () => {
                    if (confirm('¿Estás seguro de que deseas corregir las fechas de todas las transacciones? Este proceso puede tardar unos minutos.')) {
                        try {
                            // console.log('Iniciando corrección de fechas...');
                            await fixDateFormatsInTransactions();
                            alert('Corrección de fechas completada.');
                        } catch (error) {
                            console.error('Error al corregir fechas:', error);
                            alert('Error al corregir fechas: ' + error);
                        }
                    }                }}
                variant="secondary"
            />
            <ActionButton 
                text="Actualizar datos" 
                icon="↻"
                action={forceRefreshData}
                loading={$refreshing}
                variant="secondary"
            />
        </div>
    </div>
    
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
                    <option value={cuenta}>
                        {typeof cuenta === 'string' ? cuenta.charAt(0).toUpperCase() + cuenta.slice(1) : String(cuenta)}
                    </option>
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
        
        <div 
            class="filtro-compartir" 
            title={haySeleccion ? `Compartir ${operacionesFiltradas.length} operaciones en CSV` : 'Aplica un filtro para compartir la selección en CSV'}
        >
            <button 
                type="button" 
                class="btn-compartir" 
                class:activo={haySeleccion} 
                disabled={!haySeleccion}
                on:click={compartirCSV}
                aria-label="Compartir selección en CSV"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="18" cy="5" r="3"></circle>
                    <circle cx="6" cy="12" r="3"></circle>
                    <circle cx="18" cy="19" r="3"></circle>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                </svg>
            </button>
        </div>

        <div class="filtro-busqueda">
            <label for="filtroBusqueda" class="visually-hidden">Buscar transacciones</label>
            <input 
                type="text" 
                id="filtroBusqueda"
                placeholder="Buscar por descripción, cuenta, referencia, notas..."
                bind:value={filtroBusqueda}
                aria-label="Buscar transacciones"
            >
        </div>
        <div class="filtro-actions">
            <button on:click={limpiarFiltros} class="btn-limpiar">Limpiar</button>
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
        </div>    </div>
    
    <!-- Nota eliminada: ahora scroll infinito real -->
    {#if !$isInitialDataLoaded && operacionesFiltradas.length === 0}
        <div class="cargando">Cargando datos...</div>
    {:else if $isInitialDataLoaded && operacionesFiltradas.length === 0}
        <div class="sin-datos">
            <p>No se encontraron operaciones con los filtros seleccionados.</p>
            {#if $hasMoreData}
                <button 
                    class="btn-limpiar" 
                    style="margin-top: 0.5rem;" 
                    on:click={() => loadMoreTransactions()}
                    disabled={$isLoadingMore}>
                    {$isLoadingMore ? 'Cargando...' : 'Cargar más de la base de datos'}
                </button>
            {/if}
        </div>
    {:else}
        <div class="tabla-operaciones" bind:this={tablaContainer} on:scroll={optimizedHandleScroll}>
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Descripción</th>
                        <th>Cuenta</th>
                        <th>Ubicación</th>
                        <th>Monto</th>
                    </tr>
                </thead>
                <tbody>
                    {#each operacionesFiltradas as op}
                        <tr 
                            class:ingreso={op.type.toLowerCase() === 'ingreso'} 
                            class:egreso={op.type.toLowerCase() === 'egreso'} 
                            on:dblclick={() => handleRowDoubleClick(op)} 
                            style="cursor: pointer;">
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
                                {op.type.toLowerCase() === 'ingreso'
                                    ? 'Ingreso'
                                    : (typeof op.cuenta === 'string' && op.cuenta.length > 0
                                        ? op.cuenta.charAt(0).toUpperCase() + op.cuenta.slice(1)
                                        : (op.cuenta != null ? String(op.cuenta) : '-'))}
                            </td>
                            <td>{op.location || '-'}</td>
                            <td class="monto-celda">
                                <span class={op.type}>
                                     {op.type.toLowerCase() === 'ingreso' ? '+' : '-'}{formatCurrency(op.amount)}
                                </span>
                                {#if op.paymentMethod}
                                    <div class="metodo-pago">{op.paymentMethod}</div>
                                {/if}
                                <button class="delete-btn" title="Borrar transacción" on:click|stopPropagation={() => handleDeleteOperation(op)}>🗑️</button>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
            {#if $isLoadingMore}
                <div class="cargando-mas">
                    <span class="spinner"></span> Cargando más operaciones...
                </div>
            {/if}
            {#if $isInitialDataLoaded && !$hasMoreData}
                <div class="sin-mas-datos">No hay más operaciones para mostrar.</div>
            {/if}
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
    }    .header-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
    }
    
    .actions-container {
        display: flex;
        gap: 0.5rem;
    }
    
    h2 {
        margin-top: 0;
        margin-bottom: 0;
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

    .filtro-compartir {
        display: flex;
        align-items: flex-end;
    }

    .btn-compartir {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
        box-sizing: border-box;
        border: 1px solid #ddd;
        border-radius: 4px;
        background-color: #f5f5f5;
        color: #b0b0b0;
        cursor: not-allowed;
        transition: background-color 0.2s, color 0.2s, border-color 0.2s, transform 0.1s, box-shadow 0.2s;
    }

    .btn-compartir.activo {
        background-color: #2196F3;
        border-color: #1976D2;
        color: #ffffff;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(33, 150, 243, 0.25);
    }

    .btn-compartir.activo:hover {
        background-color: #1976D2;
        border-color: #1565C0;
        box-shadow: 0 3px 6px rgba(33, 150, 243, 0.35);
        transform: translateY(-1px);
    }

    .btn-compartir.activo:active {
        transform: translateY(0);
        box-shadow: 0 1px 2px rgba(33, 150, 243, 0.2);
    }

    .filtro-actions {
        display: flex;
        align-items: flex-end;
    }

    .btn-limpiar {
        padding: 0.5rem 1rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        background-color: #f0f0f0;
        cursor: pointer;
        font-size: 0.9rem;
        height: fit-content;
    }

    .btn-limpiar:hover {
        background-color: #e0e0e0;
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
        overflow-y: auto !important; /* Agrega scroll vertical cuando el contenido excede max-height */
        display: block; /* Asegurarse que el div es un bloque para que funcione el scrolling */
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
    
    /* th.activo eliminado: ya no se usa */
    
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
        position: relative;
    }

    .delete-btn {
        background: none;
        border: none;
        color: #F44336;
        font-size: 1.2rem;
        cursor: pointer;
        margin-left: 0.5rem;
        transition: color 0.2s;
        position: absolute;
        right: 0.5rem;
        top: 50%;
        transform: translateY(-50%);
        opacity: 0.7;
    }
    .delete-btn:hover {
        color: #b71c1c;
        opacity: 1;
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
    
    .nota-datos-limitados {
        background-color: rgba(255, 193, 7, 0.15);
        border-left: 4px solid #ffc107;
        padding: 0.8rem 1rem;
        margin: 1rem 0;
        border-radius: 4px;
        font-size: 0.9rem;
        color: #856404;
    }
    
    /* Los estilos del botón se han movido al componente ActionButton.svelte */
    
    /* Estilos para carga infinita */
    .cargando-mas {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        background-color: #f5f5f5;
        margin-top: 0.5rem;
        border-radius: 4px;
    }
    
    .spinner {
        width: 20px;
        height: 20px;
        border: 2px solid rgba(0, 0, 0, 0.1);
        border-top-color: #2196F3;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-right: 10px;
    }
    
    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
      .sin-mas-datos {
        text-align: center;
        padding: 1rem;
        color: #666;
        font-style: italic;
        background-color: #f9f9f9;
        margin-top: 0.5rem;
        border-radius: 4px;
    }
    
    .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
    }
</style>
