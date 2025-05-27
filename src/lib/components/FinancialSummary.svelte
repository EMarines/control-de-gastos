<script lang="ts">
    import { transactions, getTotal, getBalance } from '../stores/transactions';
    import { formatCurrency } from '../util/formatters'; // Importar la función de formato
</script>

<div class="card">
    <h2>Resumen Financiero</h2>
    <div class="summary">
        <div class="summary-item income">
            <h3>Ingresos</h3>
            <p class="amount">{formatCurrency(getTotal('ingreso'))}</p>
        </div>
        <div class="summary-item expenses">
            <h3>Egresos</h3>
            <p class="amount">{formatCurrency(getTotal('egreso'))}</p>
        </div>
        <div class="summary-item balance">
            <h3>Balance</h3>
            <p class="amount" class:negative={getBalance() < 0}>{formatCurrency(getBalance())}</p>
        </div>
    </div>
</div>

<style>
    .summary {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        margin-top: 1rem;
    }

    .summary-item {
        flex: 1;
        padding: 1rem;
        border-radius: 8px;
        text-align: center;
    }

    .income {
        background-color: rgba(46, 204, 113, 0.2);
    }

    .expenses {
        background-color: rgba(231, 76, 60, 0.2);
    }

    .balance {
        background-color: rgba(52, 152, 219, 0.2);
    }

    .amount {
        font-size: 1.5rem;
        font-weight: bold;
        margin-top: 0.5rem;
    }

    .negative {
        color: var(--danger-color);
    }
</style>
