<!-- Vista simple para prueba de datos -->
<script lang="ts">
    import { loadTransactionsFromJSON, transactions, isLoading, error } from '../lib/stores/simple-local-transactions';
    import FinancialSummary from '../lib/components/FinancialSummary.simple.svelte';
    import LocationPieChartSimple from '../lib/components/LocationPieChartSimple.simple.svelte';
    
    // Función simple de formateo de moneda
    function formatCurrency(value: number): string {
        return new Intl.NumberFormat('es-MX', { 
            style: 'currency', 
            currency: 'MXN',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }
    
    // Estadísticas de normalización
    let stats = {
        totalRegistros: 0,
        fechasYYYYMMDD: 0,
        tiposMinusculas: 0
    };
    
    // Calcular estadísticas cuando cambian las transacciones
    $: {
        if ($transactions && $transactions.length > 0) {
            stats.totalRegistros = $transactions.length;
            stats.fechasYYYYMMDD = $transactions.filter(t => /^\d{4}-\d{2}-\d{2}$/.test(t.date)).length;
            stats.tiposMinusculas = $transactions.filter(t => t.type === 'ingreso' || t.type === 'egreso').length;
        }
    }
    
    // Porcentajes de normalización
    $: pctFechas = stats.totalRegistros ? Math.round((stats.fechasYYYYMMDD / stats.totalRegistros) * 100) : 0;
    $: pctTipos = stats.totalRegistros ? Math.round((stats.tiposMinusculas / stats.totalRegistros) * 100) : 0;
    
    // Volver a cargar los datos cuando se necesite
    function reloadData() {
        loadTransactionsFromJSON();
    }
</script>

<svelte:head>
    <title>Control de Egresos - Vista de Datos</title>
</svelte:head>

<div class="container">
    <h1>Control de Egresos - Datos Locales Normalizados</h1>
      <div class="info-panel">
        <div class="info-box">
            <h3>Información</h3>
            <p>Esta vista muestra los datos de la base de datos local normalizada:</p>
            <ul>
                <li>✅ Fechas en formato YYYY-MM-DD: <strong>{stats.fechasYYYYMMDD}/{stats.totalRegistros}</strong> ({pctFechas}%)</li>
                <li>✅ Clave "amount" en lugar de "formattedAmount"</li>
                <li>✅ Tipos en minúsculas ("ingreso"/"egreso"): <strong>{stats.tiposMinusculas}/{stats.totalRegistros}</strong> ({pctTipos}%)</li>
            </ul>
        </div>
    </div>
      <!-- Botones de acción -->
    <div class="action-buttons">
        <a href="/" class="btn btn-secondary">
            <i class="fas fa-arrow-left"></i> Volver al inicio
        </a>
        <button class="btn btn-primary" on:click={reloadData}>
            {#if $isLoading}
                <i class="fas fa-spinner fa-spin"></i> Cargando...
            {:else}
                <i class="fas fa-sync"></i> Recargar datos
            {/if}
        </button>
    </div>
    
    <!-- Mensaje de error -->
    {#if $error}
        <div class="alert alert-danger">
            <strong>Error:</strong> {$error}
        </div>
    {/if}
    
    <!-- Estadísticas -->
    {#if $isLoading}
        <div class="loading-spinner">Cargando datos...</div>
    {:else if $transactions.length === 0}
        <div class="alert alert-warning">No hay datos disponibles</div>
    {:else}
        <div class="data-summary">
            <div class="row">
                <div class="col">
                    <FinancialSummary />
                </div>
            </div>
            
            <div class="row charts">
                <div class="col">
                    <LocationPieChartSimple location="Casa" />
                </div>
                <div class="col">
                    <LocationPieChartSimple location="Match Home" />
                </div>
            </div>
            
            <!-- Tabla de transacciones recientes -->
            <div class="row">
                <div class="col">
                    <div class="card">
                        <h2>Transacciones Recientes</h2>
                        <p>Total: {$transactions.length} transacciones</p>
                        
                        <div class="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Descripción</th>
                                        <th>Tipo</th>
                                        <th>Cantidad</th>
                                        <th>Ubicación</th>
                                        <th>Cuenta</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {#each $transactions.slice(0, 20) as tx (tx.id)}
                                        <tr class={tx.type === 'egreso' ? 'expense-row' : 'income-row'}>
                                            <td>{tx.date}</td>
                                            <td>{tx.description}</td>
                                            <td>{tx.type}</td>
                                            <td class="amount">{formatCurrency(tx.amount)}</td>
                                            <td>{tx.location || '-'}</td>
                                            <td>{tx.cuenta || '-'}</td>
                                        </tr>
                                    {/each}
                                </tbody>
                            </table>
                        </div>
                        
                        <p class="footnote">Mostrando las 20 transacciones más recientes de {$transactions.length} totales.</p>
                    </div>
                </div>
            </div>
        </div>
    {/if}
    
    <!-- Estadísticas de normalización -->
    <div class="normalization-stats">
        <h2>Estadísticas de Normalización</h2>
        <div class="stat-box">
            <div class="stat-item">
                <span class="stat-label">Total de Registros:</span>
                <span class="stat-value">{$transactions.length}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Fechas en formato YYYY-MM-DD:</span>
                <span class="stat-value">{stats.fechasYYYYMMDD} ({pctFechas}%)</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Tipos en minúsculas:</span>
                <span class="stat-value">{stats.tiposMinusculas} ({pctTipos}%)</span>
            </div>
        </div>
    </div>
</div>

<style>
    .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 1rem;
    }
    
    h1 {
        margin-bottom: 1.5rem;
        color: #2c3e50;
    }
    
    .action-buttons {
        display: flex;
        gap: 1rem;
        margin-bottom: 1rem;
    }
    
    .btn {
        padding: 0.5rem 1rem;
        border-radius: 0.25rem;
        border: none;
        cursor: pointer;
        font-weight: bold;
    }
    
    .btn-primary {
        background-color: #3498db;
        color: white;
    }
    
    .btn-secondary {
        background-color: #6c757d;
        color: white;
    }
    
    .btn-info {
        background-color: #17a2b8;
        color: white;
    }
    
    .alert {
        padding: 1rem;
        border-radius: 0.25rem;
        margin-bottom: 1rem;
    }
    
    .alert-danger {
        background-color: #ffecec;
        border: 1px solid #f5c6cb;
        color: #721c24;
    }
    
    .alert-warning {
        background-color: #fff3cd;
        border: 1px solid #ffeeba;
        color: #856404;
    }
    
    .loading-spinner {
        text-align: center;
        padding: 2rem;
        color: #7f8c8d;
    }
    
    .data-summary {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }
    
    .row {
        display: flex;
        gap: 1.5rem;
        margin-bottom: 1.5rem;
    }
    
    .col {
        flex: 1;
    }
    
    .card {
        background: white;
        border-radius: 8px;
        padding: 1rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .table-container {
        overflow-x: auto;
    }
    
    table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 1rem;
    }
    
    th, td {
        padding: 0.75rem;
        text-align: left;
        border-bottom: 1px solid #e9e9e9;
    }
    
    th {
        background-color: #f8f9fa;
        font-weight: bold;
    }
    
    .amount {
        text-align: right;
        font-family: monospace;
    }
    
    .expense-row {
        background-color: rgba(231, 76, 60, 0.05);
    }
    
    .income-row {
        background-color: rgba(46, 204, 113, 0.05);
    }
    
    .footnote {
        font-size: 0.8rem;
        color: #7f8c8d;
        margin-top: 1rem;
    }
    
    .charts {
        margin-top: 1rem;
    }
    
    .info-panel {
        background-color: #f0f8ff;
        border-left: 4px solid #3498db;
        padding: 1rem;
        border-radius: 0.25rem;
        margin-bottom: 1.5rem;
    }
    
    .info-box {
        background-color: #e3f2fd;
        border: 1px solid #90caf9;
        border-radius: 8px;
        padding: 1rem;
    }
    
    .info-box h3 {
        margin-top: 0;
        color: #1565c0;
    }
    
    .info-box p {
        margin: 0.5rem 0;
        color: #34495e;
    }
    
    .info-box ul {
        margin-bottom: 0;
        padding-left: 1.5rem;
    }
    
    .info-box li {
        margin-bottom: 0.25rem;
    }
    
    .normalization-stats {
        margin-top: 2rem;
        padding: 1rem;
        background-color: #f9f9f9;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .stat-box {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .stat-item {
        display: flex;
        justify-content: space-between;
        padding: 0.5rem;
        background-color: #fff;
        border-radius: 4px;
        border: 1px solid #e0e0e0;
    }
    
    .stat-label {
        font-weight: bold;
        color: #333;
    }
    
    .stat-value {
        color: #2ecc71;
    }
</style>
