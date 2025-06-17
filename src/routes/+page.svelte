<script lang="ts">
    import FinancialSummary from '../lib/components/FinancialSummary.svelte';
    import LocationPieCharts from '../lib/components/LocationPieCharts.svelte';
    import TransactionHistory from '../lib/components/TransactionHistory.svelte';
    import TransactionForm from '../lib/components/TransactionForm.svelte';
    import SimpleExpenseModal from '../lib/components/SimpleExpenseModal.svelte';
    import SimpleIncomeModal from '../lib/components/SimpleIncomeModal.svelte';
    import Operaciones from '../lib/components/Operaciones.svelte';
    import DataDebugger from '../lib/components/DataDebugger.svelte';
    import { fly } from 'svelte/transition';
    
    let showExpenseModal = false;
    let showIncomeModal = false;
    let showExpenseForm = false;
    let showIncomeForm = false;
    
    function toggleExpenseForm() {
        // Mostrar el modal en lugar del formulario
        showExpenseModal = !showExpenseModal;
        if (showExpenseModal) {
            showIncomeModal = false;
        }
    }
    
    function toggleIncomeForm() {
        // Mostrar el modal de ingreso
        showIncomeModal = !showIncomeModal;
        if (showIncomeModal) {
            showExpenseForm = false;
            showExpenseModal = false;
        }
    }
    
    function handleCloseExpenseModal() {
        showExpenseModal = false;
    }
    
    function handleCloseIncomeModal() {
        showIncomeModal = false;
    }
</script>

<svelte:head>
    <title>Control de Egresos</title>
</svelte:head>

<main>
    <header>
        <div class="container">
            <h1>Control de Egresos Personal</h1>
            <div class="action-buttons">
                <button class="btn btn-danger" on:click={toggleExpenseForm}>
                    <i class="fas fa-minus-circle"></i> + Nuevo Egreso
                </button>
                <button class="btn btn-success" on:click={toggleIncomeForm}>
                    <i class="fas fa-plus-circle"></i> + Nuevo Ingreso
                </button>
                <!-- <a href="/simple-view" class="btn btn-info">
                    <i class="fas fa-chart-pie"></i> Ver datos locales
                </a> -->
            </div>
        </div>
    </header> 
        <div class="container">        <!-- Modal para registrar gastos -->
            <SimpleExpenseModal show={showExpenseModal} on:close={handleCloseExpenseModal} />
            <!-- Modal para registrar ingresos -->
            <SimpleIncomeModal show={showIncomeModal} on:close={handleCloseIncomeModal} />
            
            {#if showIncomeForm}
                <div transition:fly={{ y: -20, duration: 300 }}>
                    <TransactionForm initialType="ingreso" />
                </div>
            {/if}            <div class="dashboard-layout">
                <div class="chart-section">
                    <!-- Gráficos por ubicación con controles compartidos -->
                    <LocationPieCharts />
                </div>
                <div class="history-section">
                    <TransactionHistory />
                </div>
        </div>
            <FinancialSummary />
        <!-- Sección para mostrar las operaciones importadas de Excel -->
        <div class="operaciones-section">
            <Operaciones />
        </div>
        
        <!-- Herramienta de depuración de datos -->
            <DataDebugger />
        </div>
    </main>

<style>
    header {
        background-color: var(--dark-color);
        color: white;
        padding: 1.5rem 0;
        margin-bottom: 2rem;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    header .container {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    h1 {
        margin: 0;
        font-size: 1.8rem;
    }
    
    .action-buttons {
        display: flex;
        gap: 1rem;
    }
    
    .dashboard-layout {
        display: grid;
        grid-template-columns: 1fr;
        gap: 2rem;
        margin-top: 2rem;
    }      /* Estilos para el layout general de los gráficos */
    
    @media (min-width: 768px) {
        .dashboard-layout {
            grid-template-columns: 1fr 1fr;
        }
    }
    
 
</style>
