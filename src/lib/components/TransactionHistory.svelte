<script lang="ts">
    import { transactions, removeTransaction, type Transaction } from '../stores/transactions';
    // import { formatCurrency } from '../util/formatters'; // TEMPORALMENTE COMENTADO
    
    // VERSIÓN DE PRUEBA SÚPER SIMPLE DE formatCurrency
    function formatCurrency(value: number | null | undefined): string {
        if (typeof value !== 'number' || isNaN(value)) return 'Inválido';
        return `$${value.toFixed(2)}`;
    }
    // Formatear fecha
    function formatDate(dateStr: string): string {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-ES');
    }

    console.log("[TransactionHistory] Valor del store $transactions:", $transactions);
</script>

<div class="card">
    <h2>Historial de Transacciones</h2>
    
    <div class="transaction-list">
        {#if $transactions.length === 0}
            <p class="empty-message">No hay transacciones registradas</p>
        {:else}
            {#each $transactions.sort((a: Transaction, b: Transaction) => new Date(b.date).getTime() - new Date(a.date).getTime()) as transaction (transaction.id)}
                {@const formattedAmount = formatCurrency(transaction.amount)}
                <!-- El console.log que estaba en el svelte:component problemático se puede mantener aquí si es necesario -->
                {@const _ = console.log(`[TransactionHistory] Iterando: ID=${transaction.id}, Desc=${transaction.description}, Amount=${transaction.amount}, Type=${typeof transaction.amount}, Formatted=${formattedAmount}`)}
                <div class="transaction-item" class:income={transaction.type === 'ingreso'} class:expense={transaction.type === 'egreso'}>
                    <div class="transaction-details">
                        <h3>{transaction.description}</h3>
                        <p class="transaction-category">
                            {transaction.type === 'ingreso' ? 'Ingreso' : 'Egreso'}
                        </p>
                        <p class="transaction-date">{formatDate(transaction.date)}</p>
                    </div>
                    <div class="transaction-amount">
                        <p class="amount">{transaction.type === 'ingreso' ? '+' : '-'}{formattedAmount}</p>
                        <button 
                            class="btn btn-sm btn-danger" 
                            on:click={() => removeTransaction(transaction.id)}
                            aria-label="Eliminar transacción"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            {/each}
        {/if}
    </div>
</div>

<style>
    .transaction-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        max-height: 400px;
        overflow-y: auto;
    }

    .transaction-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-radius: 8px;
        border-left: 5px solid #ccc;
        background-color: white;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .income {
        border-left-color: var(--secondary-color);
    }

    .expense {
        border-left-color: var(--danger-color);
    }

    .transaction-details h3 {
        font-size: 1.1rem;
        margin-bottom: 0.2rem;
    }

    .transaction-category {
        font-size: 0.9rem;
        color: #666;
    }

    .transaction-date {
        font-size: 0.8rem;
        color: #888;
    }

    .transaction-amount {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .amount {
        font-weight: bold;
        font-size: 1.2rem;
    }

    .income .amount {
        color: var(--secondary-color);
    }

    .expense .amount {
        color: var(--danger-color);
    }

    .btn-sm {
        padding: 0.2rem 0.4rem;
        font-size: 0.8rem;
    }

    .empty-message {
        text-align: center;
        color: #888;
        padding: 2rem 0;
    }
</style>
