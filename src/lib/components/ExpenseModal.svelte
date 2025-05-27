<script lang="ts">    import { createEventDispatcher } from 'svelte';
    import { addTransaction, transactions } from '../stores/transactions';
    import { cuentaCasa, cuentaMatchHome, gastosCasa, gastosMatchHome, servicios, transporte, escuela, salud, pagadoCon, pagadoPor } from '../data/parameters';
    
    export let show = false;
    
    // Mapa para relacionar cuentas con sus respectivas subcuentas
    const cuentaToSubcuentaMap: Record<string, string[]> = {
        "Servicios": servicios,
        "Gastos Transporte": transporte,
        "Escuela": escuela,
        "Salud": salud,
        "Gastos Casa": gastosCasa,
        "Gastos Oficina": gastosMatchHome
    };
    
    const dispatch = createEventDispatcher();    // Datos del formulario
    let description: string = '';
    let amount: number | null = null; // Valor numérico real
    let formattedAmount: string = ''; // Versión formateada para mostrar
    let filteredProviders: string[] = [];
    let showProviderSuggestions: boolean = false;
    
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
    }    // Datos adicionales
    let location: string = ''; // Valor vacío para Opciones
    let cuenta: string = ''; // Valor vacío para Cuenta
    let subcuenta: string = ''; // Valor vacío para Subcuenta específica
    let paymentMethod: string = ''; // Valor vacío para Pagado con
    let invoice: string = '';
    let tags: string = '';
    let notes: string = '';
    let businessPurpose: string = ''; // Valor vacío para Pagado por
      // Obtener opciones de cuenta según la ubicación seleccionada
    $: opcionesCuenta = location === 'Casa' ? cuentaCasa : cuentaMatchHome;    // Función para obtener las opciones de subcuenta según la cuenta seleccionada
    function getSubcuentaOptions(cuentaSeleccionada: string): string[] {
        // Buscar en el mapa si existe una configuración específica para esta cuenta
        if (cuentaToSubcuentaMap[cuentaSeleccionada]) {
            return cuentaToSubcuentaMap[cuentaSeleccionada];
        }
        
        // Si no hay una configuración específica, usar las opciones predeterminadas según la ubicación
        return location === 'Casa' ? gastosCasa : gastosMatchHome;
    }
    
    // Obtener opciones de subcuenta según la cuenta seleccionada
    $: opcionesSubcuenta = getSubcuentaOptions(cuenta);
      // Reiniciar cuenta cuando cambia la ubicación
    $: {
        if (location === 'Casa') {
            if (cuenta && !cuentaCasa.includes(cuenta)) {
                cuenta = '';
            }
        } else if (location === 'Match Home') {
            if (cuenta && !cuentaMatchHome.includes(cuenta)) {
                cuenta = '';
            }
        } else if (!location) {
            // Si location está vacío, reiniciar cuenta
            cuenta = '';
        }
    }
    
    // Reiniciar subcuenta cuando cambia la cuenta o la ubicación
    $: {
        if (!cuenta) {
            // Si cuenta está vacía, reiniciar subcuenta
            subcuenta = '';
        } else {
            const opciones = getSubcuentaOptions(cuenta);
            if (subcuenta && !opciones.includes(subcuenta)) {
                subcuenta = '';
            }
        }
    }
      // Función para obtener proveedores únicos de las transacciones existentes
    function getUniqueProviders(): string[] {
        const providers: string[] = [];
        
        // Extraer los proveedores únicos de las transacciones
        $transactions.forEach(transaction => {
            if (transaction.description && !providers.includes(transaction.description)) {
                providers.push(transaction.description);
            }
        });
        
        return providers;
    }
    
    // Función para filtrar proveedores al escribir
    function filterProviders(input: string) {
        const providers = getUniqueProviders();
        
        if (input.length > 0) {
            filteredProviders = providers.filter(provider => 
                provider.toLowerCase().includes(input.toLowerCase())
            );
            showProviderSuggestions = filteredProviders.length > 0;
        } else {
            showProviderSuggestions = false;
        }
    }
    
    // Función para seleccionar un proveedor de las sugerencias
    function selectProvider(provider: string) {
        description = provider;
        showProviderSuggestions = false;
    }
    
    function closeModal() {
        dispatch('close');
    }    function handleSubmit() {
        // Convertir el valor formateado a número para validación
        const numericAmount = parseFormattedNumber(formattedAmount);
        
        if (description && numericAmount !== null && numericAmount > 0) {            // We'll keep using ISO format in the store, but display in our custom format
            addTransaction({
                description,
                amount: numericAmount, // Use numericAmount which is guaranteed to be a number
                date: parseInputDate(date).toISOString(), // Fecha seleccionada
                type: 'egreso',
                // Campos adicionales
                location,
                cuenta, // Tipo de cuenta principal
                subcuenta, // Subcuenta específica
                paymentMethod,
                invoice,
                tags,
                notes,
                businessPurpose
            });
            
            // Limpiar formulario
            description = '';
            amount = null; // Usando null para un campo de número vacío
            formattedAmount = ''; // Limpiar también el valor formateado
            dateObject = new Date(); // Reset to current date
            date = formatDateInput(dateObject); // Reset to current date in input format
            displayDate = formatDateDisplay(dateObject); // Actualizar la fecha mostrada
            location = '';
            cuenta = '';
            subcuenta = '';
            paymentMethod = '';
            invoice = '';
            tags = '';
            notes = '';
            businessPurpose = '';
            
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
            <h2>Registrar Movimiento</h2>
            <button class="close-btn" on:click={closeModal}>&times;</button>
        </div>
        <div class="modal-content">
            <form on:submit|preventDefault={handleSubmit}>
                <!-- PRIMERA FILA: Opciones y Cuenta -->
                <div class="form-row">
                    <!-- 1. Opciones (location) -->
                    <div class="form-group">
                        <label for="location">Opciones</label>                        <select 
                            id="location"
                            bind:value={location}
                            required
                        >
                            <option value="">Seleccionar...</option>
                            <option value="Casa">Casa</option>
                            <option value="Match Home">Match Home</option>
                        </select>
                    </div>
                      <!-- Cuenta -->
                    <div class="form-group">
                        <label for="cuenta">Cuenta*</label>  
                            <select id="cuenta" bind:value={cuenta} required>
                            <option value="">Seleccionar cuenta...</option>
                            {#each opcionesCuenta as opcion}
                                <option value={opcion}>{opcion}</option>
                            {/each}
                        </select>
                    </div>
                </div>
                  <!-- SEGUNDA FILA: Subcuenta específica y Fecha -->
                <div class="form-row">
                    <!-- Subcuenta específica según la ubicación -->
                    <div class="form-group">
                        <label for="subcuenta">Subcuenta específica</label>                        <select 
                            id="subcuenta"
                            bind:value={subcuenta}
                            required
                        >
                            <option value="">Seleccionar subcuenta...</option>
                            {#each opcionesSubcuenta as opcion}
                                <option value={opcion}>{opcion}</option>
                            {/each}
                        </select>
                    </div>                    <!-- Fecha (date) -->
                    <div class="form-group">
                        <label for="date">Fecha*</label>
                        <div class="date-input-container">
                            <input 
                                type="date" 
                                id="date"
                                bind:value={date}
                                on:change={updateDisplayDate}
                                required
                            />
                            <div class="date-display">
                                {displayDate}
                            </div>
                        </div>
                    </div>
                </div>
                  <!-- TERCERA FILA: Solo Pagado A -->
                <div class="form-row">
                    <!-- Empresa/Proveedor (description) cambiado a "Pagado A" -->
                    <div class="form-group full-width">
                        <label for="description">Pagado A:*</label>
                        <div class="autocomplete-container">
                            <input 
                                type="text" 
                                id="description"
                                bind:value={description}
                                on:input={() => filterProviders(description)}
                                on:focus={() => filterProviders(description)}
                                on:blur={() => setTimeout(() => showProviderSuggestions = false, 200)}
                                placeholder="Nombre de la empresa o proveedor"
                                required
                            />
                            {#if showProviderSuggestions}
                                <div class="suggestions-container">
                                    {#each filteredProviders as provider}
                                        <div 
                                            class="suggestion-item"
                                            role="option"
                                            aria-selected="false"
                                            tabindex="0"
                                            on:click={() => selectProvider(provider)}
                                            on:keydown={(e) => e.key === 'Enter' && selectProvider(provider)}
                                        >
                                            {provider}
                                        </div>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                    </div>
                </div>
                
                <!-- CUARTA FILA: Valor ($) y Referencia -->
                <div class="form-row">
                    <!-- Valor (amount) -->                    <div class="form-group">
                        <label for="amount">Valor ($)*</label>                        <input 
                            type="text" 
                            id="amount"
                            bind:value={formattedAmount}
                            on:input={(e) => formattedAmount = formatNumber(e.currentTarget ? e.currentTarget.value : '')}
                            inputmode="decimal"
                            placeholder="0.00"
                            required
                        />
                    </div>
                    
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
                </div>
                  <!-- QUINTA FILA: Pagado con y Pagado por -->
                <div class="form-row">
                    <!-- Pagado con (paymentMethod) -->
                    <div class="form-group">
                        <label for="paymentMethod">Pagado con</label>                        <select 
                            id="paymentMethod"
                            bind:value={paymentMethod}
                            required
                        >
                            <option value="">Seleccionar método de pago...</option>
                            {#each pagadoCon as opcion}
                                <option value={opcion}>{opcion}</option>
                            {/each}
                        </select>
                    </div>
                    
                    <!-- Pagado por (businessPurpose) -->
                    <div class="form-group">
                        <label for="businessPurpose">Pagado por</label>                        <select 
                            id="businessPurpose"
                            bind:value={businessPurpose}
                            required
                        >
                            <option value="">Seleccionar pagador...</option>
                            {#each pagadoPor as opcion}
                                <option value={opcion}>{opcion}</option>
                            {/each}
                        </select>
                    </div>
                </div>
                
                <!-- QUINTA FILA: Etiquetas -->
                <div class="form-row">
                    <!-- Etiquetas (tags) -->
                    <div class="form-group full-width">
                        <label for="tags">Etiquetas</label>
                        <input 
                            type="text" 
                            id="tags"
                            bind:value={tags}
                            placeholder="Separadas por comas"
                        />
                    </div>
                </div>
                
                <!-- SEXTA FILA: Notas adicionales -->
                <div class="form-row">
                    <!-- Notas adicionales (notes) -->
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
                        Guardar Movimiento
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
        display: flex;        align-items: center;
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
        cursor: pointer;        padding: 0;
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
    }    /* Estilos para el selector de fecha personalizado */
    .date-input-container {
        position: relative;
        width: 100%;
    }
    
    .date-input-container input[type="date"] {
        width: 100%;
        padding: 0.7rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 1rem;
        cursor: pointer;
        color: transparent; /* Hacer invisible el texto del input date nativo */
    }
    
    .date-input-container input[type="date"]::-webkit-calendar-picker-indicator {
        position: absolute;
        right: 0.7rem;
        height: 100%;
        width: 24px;
        background-position: right;
        opacity: 0.6;
        cursor: pointer;
    }
    
    .date-display {
        position: absolute;
        top: 8px;
        left: 8px;
        pointer-events: none;
        font-size: 1rem;
        color: #999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', sans-serif;
        z-index: 1;
    }
</style>
