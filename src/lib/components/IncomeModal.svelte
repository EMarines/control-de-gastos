<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { addTransaction, updateTransaction, removeTransaction, type Transaction } from '../stores/transactions';
    import { ingresosCasa, ingresosMatchHome, pagadoCon, pagadoPor } from '../data/parameters'; // Asumiendo que tienes parámetros para ingresos

    export let show = false;
    export let initialData: Transaction | null = null; // Para recibir la operación a editar

    const dispatch = createEventDispatcher();

    // Datos del formulario
    let description: string = '';
    let amount: number | null = null;
    let formattedAmount: string = '';
    let filteredSources: string[] = []; // Para autocompletar fuentes de ingreso
    let showSourceSuggestions: boolean = false;

    // Funciones de formato de número (igual que en ExpenseModal)
    function formatNumber(value: string): string {
        let clean = value.replace(/[^\d.]/g, '');
        const decimalPosition = clean.indexOf('.');
        if (decimalPosition !== -1) {
            clean = clean.slice(0, decimalPosition + 1) + clean.slice(decimalPosition + 1).replace(/\./g, '');
        }
        let [integerPart, decimalPart] = clean.split('.');
        integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return decimalPart !== undefined ? `${integerPart}.${decimalPart}` : integerPart;
    }

    function parseFormattedNumber(formatted: string): number | null {
        if (!formatted) return null;
        const numberStr = formatted.replace(/,/g, '');
        const number = parseFloat(numberStr);
        return isNaN(number) ? null : number;
    }

    // Funciones de formato de fecha (igual que en ExpenseModal)
    function formatDateDisplay(date: Date): string {
        const day = date.getDate().toString().padStart(2, '0');
        const month = date.toLocaleString('es', { month: 'short' });
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    function formatDateInput(date: Date): string {
        return date.toISOString().split('T')[0];
    }

    function parseInputDate(dateString: string): Date {
        return new Date(dateString);
    }

    let dateObject: Date = new Date();
    let date: string = formatDateInput(dateObject);
    let displayDate: string = formatDateDisplay(dateObject);

    function updateDisplayDate() {
        dateObject = parseInputDate(date);
        displayDate = formatDateDisplay(dateObject);
    }

    // Datos adicionales específicos para ingresos
    let location: string = ''; // 'Casa' o 'Match Home'
    let incomeSource: string = ''; // Fuente del ingreso (ej. Nómina, Venta, etc.)
    let paymentMethod: string = ''; // Cómo se recibió el ingreso
    let invoice: string = ''; // Referencia o factura
    let tags: string = '';
    let notes: string = '';

    // Opciones para la fuente del ingreso según la ubicación
    $: opcionesFuenteIngreso = location === 'Casa' ? ingresosCasa : ingresosMatchHome;

    // Lógica reactiva para poblar/resetear el formulario
    $: if (show) {
        if (initialData) {
            description = initialData.description || '';
            amount = initialData.amount;
            formattedAmount = formatNumber(initialData.amount.toString());
            
            dateObject = initialData.date ? parseInputDate(initialData.date) : new Date();
            date = formatDateInput(dateObject);
            displayDate = formatDateDisplay(dateObject);
            
            location = initialData.location || '';
            incomeSource = initialData.cuenta || ''; // Usamos 'cuenta' para 'incomeSource' si así está en Transaction
            paymentMethod = initialData.paymentMethod || '';
            invoice = initialData.invoice || '';
            tags = initialData.tags || '';
            notes = initialData.notes || '';
        } else {
            resetForm();
        }
    }

    // Actualizar amount (número) cuando formattedAmount (string) cambia
    $: {
        amount = parseFormattedNumber(formattedAmount);
    }

    function resetForm() {
        description = '';
        amount = null;
        formattedAmount = '';
        dateObject = new Date();
        date = formatDateInput(dateObject);
        displayDate = formatDateDisplay(dateObject);
        location = '';
        incomeSource = '';
        paymentMethod = '';
        invoice = '';
        tags = '';
        notes = '';
        showSourceSuggestions = false;
        filteredSources = [];
    }

    function handleSubmit() {
        const numericAmount = parseFormattedNumber(formattedAmount);
        
        if (description && numericAmount !== null && numericAmount > 0 && date) {
            const transactionData: Omit<Transaction, 'id' | 'type'> & { id?: number; type: 'ingreso' } = {
                description,
                amount: numericAmount,
                date: parseInputDate(date).toISOString(),
                type: 'ingreso', // Tipo fijo para este modal
                location,
                cuenta: incomeSource, // Guardamos 'incomeSource' en el campo 'cuenta' de la transacción
                // subcuenta: '', // Los ingresos podrían no tener subcuenta, o podrías añadirla
                paymentMethod,
                invoice,
                tags,
                notes,
                // businessPurpose: '', // Podría no aplicar a ingresos
            };

            if (initialData && initialData.id) {
                // Actualizar transacción existente
                updateTransaction({ ...transactionData, id: initialData.id });
            } else {
                // Crear nueva transacción
                addTransaction(transactionData); // <-- AQUÍ ESTÁ EL PROBLEMA
            }
            
            closeModal();
        } else {
            alert("Por favor, completa todos los campos obligatorios (*) y asegúrate de que el monto sea válido.");
        }
    }

    function handleDelete() {
        if (initialData && initialData.id) {
            if (confirm(`¿Estás seguro de que quieres eliminar el ingreso "${initialData.description}"?`)) {
                removeTransaction(initialData.id);
                closeModal();
            }
        }
    }

    function closeModal() {
        dispatch('close');
    }

    // Funciones para autocompletar (similar a ExpenseModal, adaptado para 'description' o 'incomeSource')
    // Aquí un ejemplo simple para 'description'
    function getUniqueIncomeDescriptions(): string[] {
        const descriptions: string[] = [];
        // Asumiendo que $transactions está disponible o se pasa como prop si es necesario
        // o se accede directamente al store si este modal no es tan genérico.
        // Por simplicidad, lo omitimos aquí, pero se implementaría similar a ExpenseModal.
        return descriptions; 
    }

    function filterIncomeSources(input: string) {
        // Lógica de filtrado para 'description' o 'incomeSource'
        // similar a filterProviders en ExpenseModal
        if (input.length > 0) {
            // Ejemplo:
            // filteredSources = getUniqueIncomeDescriptions().filter(desc => desc.toLowerCase().includes(input.toLowerCase()));
            // showSourceSuggestions = filteredSources.length > 0;
        } else {
            showSourceSuggestions = false;
        }
    }

    function selectSource(source: string) {
        description = source; // o incomeSource = source;
        showSourceSuggestions = false;
    }

</script>

{#if show}
<div 
    class="modal-overlay" 
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    on:click|self={closeModal} 
    on:keydown={(e) => e.key === 'Escape' && closeModal()}>
    <div class="modal-container" role="document">
        <div class="modal-header">
            <h2>{initialData?.id ? 'Editar Ingreso' : 'Registrar Ingreso'}</h2>
            <button class="close-btn" on:click={closeModal}>&times;</button>
        </div>
        <div class="modal-content">
            <form on:submit|preventDefault={handleSubmit}>
                <div class="form-row">
                    <div class="form-group">
                        <label for="inc-location">Ubicación</label>
                        <select id="inc-location" bind:value={location} required>
                            <option value="">Seleccionar...</option>
                            <option value="Casa">Casa</option>
                            <option value="Match Home">Match Home</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="inc-incomeSource">Fuente del Ingreso*</label>
                        <select id="inc-incomeSource" bind:value={incomeSource} required>
                            <option value="">Seleccionar fuente...</option>
                            {#each opcionesFuenteIngreso as opcion}
                                <option value={opcion}>{opcion}</option>
                            {/each}
                        </select>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="inc-date">Fecha*</label>
                        <div class="date-input-container">
                            <input type="date" id="inc-date" bind:value={date} on:change={updateDisplayDate} required />
                            <div class="date-display">{displayDate}</div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="inc-paymentMethod">Recibido en</label>
                        <select id="inc-paymentMethod" bind:value={paymentMethod}>
                            <option value="">Seleccionar método...</option>
                            {#each pagadoCon as opcion} <!-- Reutilizando pagadoCon o podrías tener 'recibidoEn' -->
                                <option value={opcion}>{opcion}</option>
                            {/each}
                        </select>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group full-width">
                        <label for="inc-description">Descripción*</label>
                        <input type="text" id="inc-description" bind:value={description} placeholder="Ej: Salario, Venta de producto X" required />
                        <!-- Podrías añadir autocompletado aquí si es relevante -->
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="inc-amount">Monto ($)*</label>
                        <input type="text" id="inc-amount" bind:value={formattedAmount} on:input={(e) => formattedAmount = formatNumber(e.currentTarget ? e.currentTarget.value : '')} inputmode="decimal" placeholder="0.00" required />
                    </div>
                    <div class="form-group">
                        <label for="inc-invoice">Referencia/Factura</label>
                        <input type="text" id="inc-invoice" bind:value={invoice} placeholder="Número de factura o referencia" />
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group full-width">
                        <label for="inc-tags">Etiquetas</label>
                        <input type="text" id="inc-tags" bind:value={tags} placeholder="Separadas por comas" />
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group full-width">
                        <label for="inc-notes">Notas adicionales</label>
                        <textarea id="inc-notes" bind:value={notes} placeholder="Añade notas o detalles"></textarea>
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button type="button" class="modal-btn btn-cancel" on:click={closeModal}>Cancelar</button>
                    {#if initialData?.id}
                        <button type="button" class="modal-btn btn-delete" on:click={handleDelete}>Borrar</button>
                    {/if}
                    <button type="submit" class="modal-btn btn-save">
                        {initialData?.id ? 'Guardar Cambios' : 'Guardar Ingreso'}
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>
{/if}

<style>
    /* Estilos generales del modal (puedes copiarlos de ExpenseModal.svelte y ajustarlos si es necesario) */
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }
    
    .modal-container {
        background-color: white;
        width: 90%;
        max-width: 700px; /* O el ancho que prefieras */
        max-height: 90vh;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        overflow-y: auto; /* Para permitir scroll si el contenido es muy largo */
    }
    
    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid #eee;
        background-color: var(--primary-color, #2196F3); /* Color primario o un verde para ingresos */
        color: white;
        border-radius: 8px 8px 0 0;
    }
    
    .modal-header h2 {
        margin: 0;
        font-size: 1.5rem;
    }
    
    .close-btn {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0;
        color: white;
    }
    
    .modal-content {
        padding: 1.5rem;
    }
    
    form {
        display: flex;
        flex-direction: column;
        gap: 1rem; /* Espacio entre filas del formulario */
    }
    
    .form-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); /* Columnas responsivas */
        gap: 1rem;
        width: 100%;
    }
    
    .form-group {
        margin-bottom: 0.5rem; /* O ajusta según el gap de form-row */
    }
    
    .full-width {
        grid-column: 1 / -1; /* Para que ocupe toda la fila */
    }

    label {
        display: block;
        margin-bottom: 0.3rem;
        font-weight: 500;
        color: #555;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', sans-serif;
    }

    input, select, textarea {
        width: 100%;
        padding: 0.7rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 1rem;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', sans-serif;
        box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);
        transition: border-color 0.2s, box-shadow 0.2s;
        color: #333; /* Color de texto normal para inputs */
        font-weight: 400;
    }
    input::placeholder, textarea::placeholder {
        color: #999;
    }

    /* Estilos para el input de fecha personalizado */
    .date-input-container {
        position: relative;
        width: 100%;
    }
    .date-input-container input[type="date"] {
        color: transparent; /* Oculta el texto nativo del input date */
    }
    .date-input-container input[type="date"]::-webkit-calendar-picker-indicator {
        position: absolute;
        right: 0.7rem;
        top: 0;
        bottom: 0;
        margin: auto;
        height: 20px; /* Ajusta según necesidad */
        width: 20px; /* Ajusta según necesidad */
        opacity: 0.6;
        cursor: pointer;
    }
    .date-display {
        position: absolute;
        top: 50%;
        left: 0.7rem;
        transform: translateY(-50%);
        pointer-events: none;
        font-size: 1rem;
        color: #333; /* Color del texto de la fecha mostrada */
        z-index: 1;
    }

    .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        margin-top: 1rem;
    }

    .modal-btn {
        padding: 0.6rem 1.2rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
        transition: background-color 0.2s;
    }
    .btn-save {
        background-color: var(--primary-color, #2196F3); /* O un verde para ingresos */
        color: white;
    }
    .btn-save:hover {
        background-color: var(--primary-color-dark, #1976D2); /* O un verde más oscuro */
    }
    .btn-cancel {
        background-color: #f0f0f0;
        color: #333;
    }
    .btn-cancel:hover {
        background-color: #e0e0e0;
    }
    .btn-delete {
        background-color: #F44336; /* Rojo */
        color: white;
    }
    .btn-delete:hover {
        background-color: #D32F2F;
    }
</style>