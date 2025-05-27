<script lang="ts">
    import { addTransaction, type TransactionType } from '../stores/transactions';
    
    type ExpenseCategory = 'hogar' | 'comida' | 'transporte' | 'entretenimiento' | 'salud' | 'educacion' | 'otro';
    
    // Permite establecer el tipo de transacción desde fuera
    export let initialType: TransactionType = 'egreso';
    
    let description: string = '';
    let amount: number = 0;
    let date: string = new Date().toISOString().slice(0, 10);
    let type: TransactionType = initialType;
    let category: ExpenseCategory = 'otro';
    
    const categories: {value: ExpenseCategory; label: string}[] = [
        { value: 'hogar', label: 'Hogar' },
        { value: 'comida', label: 'Comida' },
        { value: 'transporte', label: 'Transporte' },
        { value: 'entretenimiento', label: 'Entretenimiento' },
        { value: 'salud', label: 'Salud' },
        { value: 'educacion', label: 'Educación' },
        { value: 'otro', label: 'Otro' }
    ];
    
    function handleSubmit() {
        if (description && amount > 0) {
            addTransaction({
                description,
                amount,
                date: new Date(date).toISOString(),
                type,
                category: type === 'egreso' ? category : undefined, // Solo añadir categoría si es egreso
            });
            
            // Reiniciar formulario
            description = '';
            amount = 0;
            date = new Date().toISOString().slice(0, 10);
            type = 'egreso';
            category = 'otro';
        }
    }
</script>

<div class="card">
    <h2>Registrar nueva transacción</h2>
    
    <form on:submit|preventDefault={handleSubmit} class="transaction-form">
        <div class="form-group">
            <label for="description">Descripción</label>
            <input 
                type="text" 
                id="description"
                bind:value={description}
                placeholder="¿En qué se usó el dinero?"
                required
            />
        </div>
        
        <div class="form-group">
            <label for="amount">Cantidad (€)</label>
            <input 
                type="number" 
                id="amount"
                bind:value={amount}
                min="0.01"
                step="0.01"
                placeholder="0.00"
                required
            />
        </div>
        
        <div class="form-group">
            <label for="date">Fecha</label>
            <input 
                type="date" 
                id="date"
                bind:value={date}
                required
            />
        </div>
        
        <div class="form-group">
            <label for="type">Tipo</label>
            <select id="type" bind:value={type}>
                <option value="egreso">Egreso</option>
                <option value="ingreso">Ingreso</option>
            </select>
        </div>
        
        {#if type === 'egreso'}
            <div class="form-group">
                <label for="category">Categoría</label>
                <select id="category" bind:value={category}>
                    {#each categories as cat}
                        <option value={cat.value}>{cat.label}</option>
                    {/each}
                </select>
            </div>
        {/if}
        
        <button type="submit" class="btn btn-primary">
            {type === 'ingreso' ? 'Registrar ingreso' : 'Registrar egreso'}
        </button>
    </form>
</div>

<style>
    .transaction-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    
    .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
    }
    
    label {
        font-weight: 500;
        font-size: 0.9rem;
    }
    
    input, select {
        padding: 0.5rem;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 1rem;
    }
    
    .btn-primary {
        margin-top: 0.5rem;
        background-color: var(--primary-color);
        color: white;
        padding: 0.7rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 1rem;
    }
    
    .btn-primary:hover {
        opacity: 0.9;
    }
</style>
