<script lang="ts">    // Importamos desde el archivo principal de transacciones
    import { transactions, type Transaction, isLoadingMore as isLoading, removeTransaction } from '../stores/transactions';
    
    // VERSIÓN DE PRUEBA SÚPER SIMPLE DE formatCurrency
    function formatCurrency(value: number | null | undefined): string {
        if (typeof value !== 'number' || isNaN(value)) return 'Inválido';
        return `$${value.toFixed(2)}`;
    }
    
    // Función para convertir fecha en formato "21-May-25" a timestamp para ordenamiento
    function parseCustomDate(dateStr: string): number {
        try {
            if (dateStr.includes('-')) {
                // Formato dd-MMM-yy (ejemplo: 21-May-25, 9-Oct-24, 9-Sep-23)
                const parts = dateStr.split('-');
                if (parts.length === 3) {
                    const day = parseInt(parts[0]);
                    // Lista de meses en inglés para detectar el formato correcto
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const month = monthNames.indexOf(parts[1]);
                    if (month >= 0) {
                        let year = parseInt(parts[2]);
                        // Asumir que años de dos dígitos menores a 50 son del 2000 en adelante
                        if (year < 100) {
                            year = year < 50 ? 2000 + year : 1900 + year;
                        }
                        // Crear fecha y validar que sea correcta
                        const dateObj = new Date(year, month, day);
                        if (!isNaN(dateObj.getTime())) {
                            return dateObj.getTime();
                        }
                    }
                }
            } else if (dateStr.includes('/')) {
                // Formato dd/mm/yyyy
                const [day, month, year] = dateStr.split('/');
                return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).getTime();
            }
              // Si no es ninguno de los formatos anteriores, intentar con Date            
            return new Date(dateStr).getTime();
        } catch (error) {
            console.error('Error al parsear fecha:', error, dateStr);
            return 0;
        }
    }
    
    // Formatear fecha
    function formatDate(dateStr: string): string {
        try {
            // Si la fecha ya está en formato dd-MMM-yy (21-May-25, 9-Oct-24), simplemente la devolvemos formateada
            if (dateStr.includes('-') && dateStr.split('-').length === 3) {
                const [day, month, year] = dateStr.split('-');
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                if (monthNames.includes(month)) {
                    return `${day}-${month}-${year}`;
                }
            }
            
            // Manejar diferentes formatos de fecha posibles
            let date;
            if (dateStr.includes('/')) {
                // Si la fecha está en formato dd/mm/yyyy, convertir a mm/dd/yyyy para el objeto Date
                const [day, month, year] = dateStr.split('/');
                date = new Date(`${month}/${day}/${year}`);
            } else {
                // Formato ISO o similar
                date = new Date(dateStr);
            }
            
            // Verificar si la fecha es válida
            if (isNaN(date.getTime())) {
                console.error('Fecha inválida:', dateStr);
                return 'Fecha inválida';
            }
            
            // Obtener componentes de la fecha en el formato deseado: dd-MMM-yy (9-Oct-24)
            const day = date.getDate().toString();
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = monthNames[date.getMonth()];
            const year = date.getFullYear().toString().substring(2); // Solo los últimos 2 dígitos
            
            return `${day}-${month}-${year}`;
        } catch (error) {
            console.error('Error al formatear fecha:', error, dateStr);
            return 'Fecha inválida';
        }
    }
    
    console.log("[TransactionHistory] Valor del store $transactions:", $transactions);
</script>

<div class="card">
    <h2>Historial de Transacciones</h2>
    
    <div class="transaction-list">    {#if $transactions.length === 0}
            <p class="empty-message">No hay transacciones registradas</p>
        {:else}
            {#each $transactions.slice(0, 20).sort((a: Transaction, b: Transaction) => {
                const dateA = parseCustomDate(a.date);
                const dateB = parseCustomDate(b.date);
                
                // Si alguna fecha es inválida (0), colocarla al final
                if (dateA === 0 && dateB !== 0) return 1;
                if (dateB === 0 && dateA !== 0) return -1;
                if (dateA === 0 && dateB === 0) return 0;
                
                return dateB - dateA;  // Orden descendente: más reciente primero
            }) as transaction (transaction.id)}
                {@const formattedAmount = formatCurrency(transaction.amount)}
                <!-- El console.log que estaba en el svelte:component problemático se puede mantener aquí si es necesario -->
                {@const _ = console.log(`[TransactionHistory] Iterando: ID=${transaction.id}, Desc=${transaction.description}, Amount=${transaction.amount}, Type=${typeof transaction.amount}, Formatted=${formattedAmount}`)}                <div class="transaction-item" class:income={transaction.type.toLowerCase() === 'ingreso'} class:expense={transaction.type.toLowerCase() === 'egreso'}>
                    <div class="transaction-details">
                        <h3>{transaction.description}</h3>
                        <p class="transaction-category">
                            {transaction.type.toLowerCase() === 'ingreso' ? 'Ingreso' : 'Egreso'}
                        </p>
                        <p class="transaction-date">{formatDate(transaction.date)}</p>
                    </div>
                    <div class="transaction-amount">
                        <p class="amount">{transaction.type.toLowerCase() === 'ingreso' ? '+' : '-'}{formattedAmount}</p>
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
