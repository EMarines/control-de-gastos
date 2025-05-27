<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { addTransaction, transactions } from '../stores/transactions';
    import { cuentaCasa, cuentaMatchHome, ingresoA, pagadoCon } from '../data/parameters';
    
    export let show = false;
    
    const dispatch = createEventDispatcher();    // Datos del formulario
    let description: string = '';
    let amount: number | null = null; // Valor numérico real
    let formattedAmount: string = ''; // Versión formateada para mostrar
    let filteredPayers: string[] = [];
    let showPayerSuggestions: boolean = false;
    
    // Función para formatear números con comas cada 3 dígitos
    function formatNumber(value: string): string {
        // Eliminar caracteres no numéricos excepto punto decimal
        let clean = value.replace(/[^\d.]/g, '');
        
        // Asegurarse de que solo hay un punto decimal
        const decimalPosition = clean.indexOf('.');
        if (decimalPosition !== -1) {
            clean = clean.slice(0, decimalPosition + 1) + clean.slice(decimalPosition + 1).replace(/\./g, '');
        }
        
        // Separar la parte entera y decimal
        let [integerPart, decimalPart] = clean.split('.');
        
        // Formatear la parte entera con comas
        integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        
        // Reconstruir el número con parte decimal si existe
        return decimalPart !== undefined ? `${integerPart}.${decimalPart}` : integerPart;
    }
    
    // Función para parsear el valor formateado a número
    function parseFormattedNumber(formatted: string): number | null {
        if (!formatted) return null;
        const numberStr = formatted.replace(/,/g, '');
        const number = parseFloat(numberStr);
        return isNaN(number) ? null : number;
    }
    
    // Actualizar amount cuando cambia formattedAmount
    $: {
        amount = parseFormattedNumber(formattedAmount);
    }
      // Formatear fecha para mostrar como dd/mmm/yyyy
    function formatDateDisplay(date: Date): string {
        const day = date.getDate().toString().padStart(2, '0');
        const month = date.toLocaleString('es', { month: 'short' });
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }
    
    // Formatear fecha para input type="date" (YYYY-MM-DD)
    function formatDateInput(date: Date): string {
        return date.toISOString().split('T')[0];
    }
    
    // Convertir de formato input date a Date object
    function parseInputDate(dateString: string): Date {
        return new Date(dateString);
    }
      let dateObject: Date = new Date(); // Objeto Date actual
    let date: string = formatDateInput(dateObject); // Formato YYYY-MM-DD para input type="date"
    let displayDate: string = formatDateDisplay(dateObject); // Formato dd/mmm/yyyy para mostrar
    
    // Actualizar la fecha mostrada cuando cambie la fecha seleccionada
    function updateDisplayDate() {
        dateObject = parseInputDate(date);
        displayDate = formatDateDisplay(dateObject);
    }
    
    // Datos adicionales
    let location: string = ''; // Valor vacío para Opciones
    let cuenta: string = ''; // Valor vacío para tipo de ingreso
    let paymentMethod: string = ''; // Valor vacío para método de pago
    let invoice: string = '';
    let notes: string = '';
    
    // Obtener opciones de cuenta según la ubicación seleccionada
    $: opcionesCuenta = location === 'Casa' ? cuentaCasa : cuentaMatchHome;
      // Función para obtener pagadores únicos de las transacciones existentes
    function getUniquePayers(): string[] {
        const payers: string[] = [];
        
        // Extraer los pagadores únicos de las transacciones de ingreso
        $transactions.forEach(transaction => {
            if (transaction.type === 'ingreso' && transaction.description && !payers.includes(transaction.description)) {
                payers.push(transaction.description);
            }
        });
        
        return payers;
    }
      // Función para filtrar pagadores al escribir
    function filterPayers(input: string) {
        const payers = getUniquePayers();
        
        if (input.length > 0) {
            filteredPayers = payers.filter(payer => 
                payer.toLowerCase().includes(input.toLowerCase())
            );
            showPayerSuggestions = filteredPayers.length > 0;
        } else {
            showPayerSuggestions = false;
        }
    }
    
    // Función para seleccionar un pagador de las sugerencias
    function selectPayer(payer: string) {
        description = payer;
        showPayerSuggestions = false;
    }
    
    function closeModal() {
        dispatch('close');
    }    
    
    function handleSubmit() {
        // Convertir el valor formateado a número para validación
        const numericAmount = parseFormattedNumber(formattedAmount);
        
        if (description && numericAmount !== null && numericAmount > 0) {            // We'll keep using ISO format in the store, but display in our custom format
            addTransaction({
                description,
                amount: numericAmount, // Use numericAmount which is guaranteed to be a number
                date: parseInputDate(date).toISOString(), // Fecha seleccionada
                type: 'ingreso',
                // Campos adicionales
                location,
                cuenta, // Tipo de ingreso
                paymentMethod, // Recibido a través de
                invoice,
                notes
            });
            
            // Limpiar formulario
            description = '';
            amount = null;
            formattedAmount = ''; // Limpiar también el valor formateado
            dateObject = new Date(); // Reset to current date
            date = formatDateInput(dateObject); // Reset to current date in input format
            location = '';
            cuenta = '';
            paymentMethod = '';
            invoice = '';
            notes = '';
            
            // Cerrar modal
            closeModal();
        }
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
            <h2>Registrar Ingreso</h2>
            <button class="close-btn" on:click={closeModal}>&times;</button>
        </div>
        <div class="modal-content">
            <form on:submit|preventDefault={handleSubmit}>
                <!-- PRIMERA FILA: Opciones y Fecha -->
                <div class="form-row">
                    <!-- 1. Opciones (location) -->
                    <div class="form-group">
                        <label for="location">Opciones</label>
                        <select 
                            id="location"
                            bind:value={location}
                            required
                        >
                            <option value="">Seleccionar...</option>
                            <option value="Casa">Casa</option>
                            <option value="Match Home">Match Home</option>
                        </select>
                    </div>                    <!-- Fecha (date) -->
                    <div class="form-group">
                        <label for="date">Fecha*</label>
                        <div class="date-input-container">
                            <input 
                                type="text" 
                                id="displayDate"
                                bind:value={displayDate}
                                readonly
                                required
                                placeholder="dd/mmm/yyyy"
                            />
                            <input 
                                type="date" 
                                id="date"
                                bind:value={date}
                                on:change={updateDisplayDate}
                                class="date-input-hidden"
                                required
                            />
                        </div>
                    </div>
                </div>
                
                <!-- SEGUNDA FILA: Solo Pagó -->
                <div class="form-row">                    <!-- Pagador (description) -->
                    <div class="form-group full-width">
                        <label for="description">Pagó*</label>
                        <div class="autocomplete-container">
                            <input 
                                type="text" 
                                id="description"
                                bind:value={description}
                                on:input={() => filterPayers(description)}
                                on:focus={() => filterPayers(description)}
                                on:blur={() => setTimeout(() => showPayerSuggestions = false, 200)}
                                placeholder="Nombre del pagador"
                                required
                            />
                            {#if showPayerSuggestions}
                                <div class="suggestions-container" role="listbox">
                                    {#each filteredPayers as payer}
                                        <div 
                                            class="suggestion-item"
                                            role="option"
                                            aria-selected={description === payer}
                                            tabindex="0"
                                            on:click={() => selectPayer(payer)}
                                            on:keydown={(e) => e.key === 'Enter' && selectPayer(payer)}
                                        >
                                            {payer}
                                        </div>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                    </div>
                </div>
                
                <!-- TERCERA FILA: Valor ($) y Cuenta -->
                <div class="form-row">
                    <!-- Valor (amount) -->                    
                     <div class="form-group">  
                        <label for="amount">Valor ($)*</label>
                        <input 
                            type="text" 
                            id="amount"
                            bind:value={formattedAmount}
                            on:input={(e) => formattedAmount = formatNumber(e.currentTarget ? e.currentTarget.value : '')}
                            inputmode="decimal"
                            placeholder="0.00"
                            required
                        />
                    </div>
                    
                    <!-- Cuenta (tipo de ingreso) -->
                    <div class="form-group">
                        <label for="cuenta">Cuenta*</label>
                        <select 
                            id="cuenta" 
                            bind:value={cuenta}
                            required
                        >
                            <option value="">Seleccionar tipo de ingreso...</option>
                            {#each ingresoA as opcion}
                                <option value={opcion}>{opcion}</option>
                            {/each}
                        </select>
                    </div>
                </div>
                  
                <!-- CUARTA FILA: Referencia y Método de Pago -->
                <div class="form-row">
                    <!-- Referencia (invoice) -->
                    <div class="form-group">
                        <label for="invoice">Referencia</label>
                        <input 
                            type="text" 
                            id="invoice"
                            bind:value={invoice}
                            placeholder="Número de factura o referencia"
                        />
                    </div>
                    
                    <!-- Método de Pago (paymentMethod) -->
                    <div class="form-group">
                        <label for="paymentMethod">Recibido a través de</label>
                        <select 
                            id="paymentMethod"
                            bind:value={paymentMethod}
                            required
                        >
                            <option value="">Seleccionar método...</option>
                            {#each pagadoCon as opcion}
                                <option value={opcion}>{opcion}</option>
                            {/each}
                        </select>
                    </div>
                </div>
                
                <!-- QUINTA FILA: Notas adicionales -->
                <div class="form-row">
                    <div class="form-group full-width">
                        <label for="notes">Notas adicionales</label>
                        <textarea 
                            id="notes"
                            bind:value={notes}
                            placeholder="Añade notas o detalles"
                        ></textarea>
                    </div>
                </div>
                
                <div class="modal-actions">
                    <button type="button" class="modal-btn btn-cancel" on:click={closeModal}>
                        Cancelar
                    </button>
                    <button type="submit" class="modal-btn btn-save">
                        Guardar Ingreso
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>
{/if}

<style>
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
        max-width: 700px;
        max-height: 90vh;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        overflow-y: auto;
    }
    
    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid #eee;
        background-color: var(--primary-color);
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
        gap: 1rem;
    }
    
    .form-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        width: 100%;
    }
    
    .form-group {
        margin-bottom: 0.5rem;
    }
    
    .full-width {
        grid-column: 1 / -1;
    }
      label {
        display: block;
        margin-bottom: 0.3rem;
        font-weight: 500;
        color: #555;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', sans-serif;
    }input, select, textarea {
        width: 100%;
        padding: 0.7rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 1rem;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', sans-serif;
        box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);
        transition: border-color 0.2s, box-shadow 0.2s;
        color: #999999; /* Color gris más tenue para el texto de los inputs */
        font-weight: 400;
    }
    
    input:focus, select:focus, textarea:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
    }
      /* Estilos para placeholders */
    ::placeholder {
        color: #bbbbbb;
        opacity: 1; /* Firefox */
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', sans-serif;
        font-weight: 400;
    }
    
    :-ms-input-placeholder {
        color: #bbbbbb;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', sans-serif;
        font-weight: 400;
    }
    
    ::-ms-input-placeholder {
        color: #bbbbbb;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', sans-serif;
        font-weight: 400;
    }
    
    textarea {
        min-height: 100px;
        resize: vertical;
    }
    
    .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        margin-top: 1.5rem;
        padding-top: 1rem;
        border-top: 1px solid #eee;
    }
    
    .modal-btn {
        padding: 0.8rem 1.5rem;
        border: none;
        border-radius: 4px;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s, transform 0.1s;
    }
    
    .modal-btn:active {
        transform: scale(0.98);
    }
    
    .btn-cancel {
        background-color: #e0e0e0;
        color: #333;
    }
    
    .btn-cancel:hover {
        background-color: #d0d0d0;
    }
    
    .btn-save {
        background-color: var(--primary-color);
        color: white;
    }
    
    .btn-save:hover {
        background-color: #2980b9;
    }
    
    /* Estilos para autocompletado */
    .autocomplete-container {
        position: relative;
        width: 100%;
    }
    
    .suggestions-container {
        position: absolute;
        top: 100%;
        left: 0;
        width: 100%;
        max-height: 200px;
        overflow-y: auto;
        background-color: white;
        border: 1px solid #ddd;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        z-index: 10;
    }
    
    .suggestion-item {
        padding: 0.5rem 1rem;
        cursor: pointer;
    }
    
    .suggestion-item:hover {
        background-color: #f5f5f5;
    }
    /* Ocultar flechas de inputs numéricos */
    /* Chrome, Safari, Edge, Opera */
    input::-webkit-outer-spin-button,
    input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }
      /* Firefox */
    input[inputmode="decimal"] {
        -moz-appearance: textfield;
        appearance: textfield;
    }
    
    /* Estilo para las opciones en selects */
    option {
        color: #999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', sans-serif;
        font-weight: 400;
    }
    
    /* Primera opción (placeholder) en un tono más claro */
    option:first-child {
        color: #bbbbbb;
    }
    
    /* Estilo personalizado para inputs de tipo date */
    input[type="date"] {
        color: #999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', sans-serif;
        font-weight: 400;
        padding: 0.7rem;
        appearance: none; /* Para más control sobre la apariencia */
    }
    
    /* Personalizar el ícono de calendario */
    input[type="date"]::-webkit-calendar-picker-indicator {
        opacity: 0.6;
        cursor: pointer;
    }    /* Estilos para el selector de fecha personalizado */
    .date-input-container {
        position: relative;
        width: 100%;
    }
    
    .date-input-container input[type="text"] {
        width: 100%;
        padding-right: 2rem; /* Espacio para el ícono de calendario */
        cursor: pointer;
        background-color: transparent;
    }
    
    .date-input-hidden {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        cursor: pointer;
    }
</style>
