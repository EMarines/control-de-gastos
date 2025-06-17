<script lang="ts">
    import { createEventDispatcher } from 'svelte';    import { type Transaction, addTransaction, updateTransaction, removeTransaction, transactions } from '../stores/transactions';
    import { cuentaCasa, cuentaMatchHome, gastosCasa, gastosMatchHome, servicios, transporte, escuela, salud, pagadoCon, pagadoPor } from '../data/parameters';
    
    export let show = false;
    export let initialData: Transaction | null = null; // Para recibir la operación a editar
    
    // Mapa para relacionar cuentas con sus respectivas subcuentas
    const cuentaToSubcuentaMap: Record<string, string[]> = {
        "Servicios": servicios,
        "Gastos Transporte": transporte,
        "Escuela": escuela,
        "Salud": salud,
        "Gastos Casa": gastosCasa,
        "Gastos Oficina": gastosMatchHome
    };
    
    const dispatch = createEventDispatcher();
    // Datos del formulario
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
    }      // Formatear fecha para mostrar como dd/mmm/yyyy
    function formatDateDisplay(date: Date): string {
        if (!date) return '';
        // Ajustar para evitar problemas de zona horaria
        const localDate = new Date(date);
        localDate.setMinutes(localDate.getMinutes() + localDate.getTimezoneOffset());
        const day = String(localDate.getDate()).padStart(2, '0');
        const month = localDate.toLocaleString('es', { month: 'short' });
        const year = localDate.getFullYear();
        return `${day}/${month}/${year}`;
    }
    
    // Formatear fecha para input type="date" (YYYY-MM-DD)
    function formatDateInput(date: Date): string {
        if (!date) return '';
        // Ajustar para evitar problemas de zona horaria
        const localDate = new Date(date);
        localDate.setMinutes(localDate.getMinutes() + localDate.getTimezoneOffset());
        const year = localDate.getFullYear();
        const month = String(localDate.getMonth() + 1).padStart(2, '0');
        const day = String(localDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    // Convertir de formato input date a Date object
    function parseInputDate(dateString: string): Date {
        try {
            return new Date(dateString);
        } catch (err) {
            console.error('Error al analizar la fecha:', err);
            return new Date();
        }
    }    // Crear una fecha actual con mediodía para evitar problemas de zona horaria
    let now = new Date();
    let dateObject: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
    let date: string = formatDateInput(dateObject); // Formato YYYY-MM-DD para input type="date"
    let displayDate: string = formatDateDisplay(dateObject); // Formato dd/mmm/yyyy para mostrar
    
    // Flag para rastrear si el formulario ha sido inicializado
    let isInitialized = false;
      function updateDisplayDate(e?: Event) {
        e && e.preventDefault();
        
        try {
            // Crear la fecha sin considerar la zona horaria
            dateObject = parseInputDate(date);
            displayDate = formatDateDisplay(dateObject);
        } catch (err) {
            console.error('Error al actualizar la fecha:', err);
        }
    }
    
    // Datos adicionales
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
    }    // Lógica reactiva para poblar/resetear el formulario con manejo mejorado de inicialización
    $: if (show && !isInitialized) {
        if (initialData) {
            description = initialData.description || '';
            amount = initialData.amount;
            formattedAmount = formatNumber(initialData.amount.toString()); // Formatear el monto inicial
            
            try {
                // Asegurarse de que la fecha se procese correctamente
                if (initialData.date) {
                    // Crear fecha sin problemas de zona horaria
                    const tempDate = new Date(initialData.date);
                    // Ajustar para la zona horaria local
                    const adjustedDate = new Date(
                        tempDate.getFullYear(),
                        tempDate.getMonth(),
                        tempDate.getDate(),
                        12, 0, 0 // Mediodía para evitar problemas
                    );
                    dateObject = adjustedDate;
                } else {
                    dateObject = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
                }
            } catch (err) {
                console.error('Error al inicializar fecha:', err);
                dateObject = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
            }
            
            date = formatDateInput(dateObject);
            displayDate = formatDateDisplay(dateObject);
            
            location = initialData.location || '';
            cuenta = initialData.cuenta || '';
            subcuenta = initialData.subcuenta || ''; // Asumiendo que 'subcuenta' existe en Transaction
            paymentMethod = initialData.paymentMethod || '';
            invoice = initialData.invoice || '';
            tags = initialData.tags || ''; // Asumiendo que 'tags' existe en Transaction
            notes = initialData.notes || '';
            businessPurpose = initialData.businessPurpose || ''; // Asumiendo que 'businessPurpose' existe en Transaction
        } else {
            resetForm();
        }
        
        isInitialized = true;
    }
    
    // Resetear la bandera cuando se cierra el modal
    $: if (!show) {
        isInitialized = false;
    }

    // Actualizar amount (número) cuando formattedAmount (string) cambia
    $: {
        amount = parseFormattedNumber(formattedAmount);
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
        // No es estrictamente necesario resetear aquí si el bloque $: lo maneja
    }    function resetForm() {
        description = '';
        amount = null;
        formattedAmount = '';
        
        // Crear una fecha actual con mediodía para evitar problemas de zona horaria
        const now = new Date();
        dateObject = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
        date = formatDateInput(dateObject);
        displayDate = formatDateDisplay(dateObject);
        
        location = '';
        cuenta = '';
        subcuenta = '';
        paymentMethod = '';
        invoice = '';
        tags = '';
        notes = '';
        businessPurpose = '';
        showProviderSuggestions = false;
        filteredProviders = [];
    }
      function handleSubmit() {
        // Convertir el valor formateado a número para validación
        const numericAmount = parseFormattedNumber(formattedAmount);
        
        if (description && numericAmount !== null && numericAmount > 0 && date) {
            // Crear fecha sin problemas de zona horaria
            let adjustedDate;
            try {
                const dateParts = date.split('-');
                const year = parseInt(dateParts[0]);
                const month = parseInt(dateParts[1]) - 1; // Meses en JS son 0-11
                const day = parseInt(dateParts[2]);
                
                // Validar partes de la fecha
                if (isNaN(year) || isNaN(month) || isNaN(day)) {
                    throw new Error('Formato de fecha inválido');
                }
                
                adjustedDate = new Date(year, month, day, 12, 0, 0); // Usar mediodía para evitar problemas de zona horaria
                
                // Verificar que la fecha sea válida
                if (isNaN(adjustedDate.getTime())) {
                    throw new Error('Fecha inválida');
                }
            } catch (err) {
                console.error('Error al procesar la fecha:', err);
                // Si hay error, usar la fecha actual
                const now = new Date();
                adjustedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
            }
            
            const isoDate = adjustedDate.toISOString();
            
            if (initialData && initialData.id) {
                // Actualizar transacción existente
                const transactionData: Transaction = { // Tipo Transaction completo para actualizar
                    id: initialData.id, // Incluir el ID existente
                    description,
                    amount: numericAmount,
                    date: isoDate,
                    type: 'egreso',
                    location,
                    cuenta,
                    subcuenta,
                    paymentMethod,
                    invoice,
                    tags,
                    notes,
                    businessPurpose
                };
                console.log('ExpenseModal - Actualizando transacción:', transactionData);
                updateTransaction({ ...transactionData, id: initialData.id });
            } else {
                // Crear nueva transacción
                // Definir transactionData aquí, explícitamente sin 'id'
                const transactionData: Omit<Transaction, 'id'> = {
                    // No se incluye 'id' aquí
                    description,
                    amount: numericAmount,
                    date: isoDate,
                    type: 'egreso',
                    location,
                    cuenta,
                    subcuenta,
                    paymentMethod,
                    invoice,
                    tags,
                    notes,
                    businessPurpose
                };
                console.log('ExpenseModal - Creando nueva transacción:', transactionData);
                addTransaction(transactionData); // El store se encarga de generar el ID
            }
            
            closeModal();
            // El reseteo del formulario se maneja por el bloque reactivo $: cuando 'show' cambia o 'initialData' es null.
        } else {
            // Aquí podrías añadir lógica para mostrar errores de validación al usuario
            console.error("Error de validación en el formulario", { description, numericAmount, date });
            alert("Por favor, completa todos los campos obligatorios (*) y asegúrate de que el monto sea válido.");
        }
    }

    function handleDelete() {
        if (initialData && initialData.id) {
            if (confirm(`¿Estás seguro de que quieres eliminar la operación "${initialData.description}"?`)) {
                removeTransaction(initialData.id);
                closeModal();
            }
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
            <h2>{initialData?.id ? 'Editar Egreso' : 'Registrar Egreso'}</h2>
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
                    </div>                    <!-- Fecha (date) -->                    <div class="form-group">
                        <label for="date">Fecha*</label>
                        <div class="date-container">
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
                    {#if initialData?.id}
                        <button type="button" class="modal-btn btn-delete" on:click={handleDelete}>Borrar</button>
                    {/if}
                    <button type="submit" class="modal-btn btn-save">
                        {initialData?.id ? 'Guardar Cambios' : 'Guardar Movimiento'}
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
        position: relative;
    }
    
    .date-container {
        position: relative;
        width: 100%;
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
    }    /* Estilo personalizado para inputs de tipo date */
    input[type="date"] {
        color: transparent;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', sans-serif;
        font-weight: 400;
        padding: 0.7rem;
        padding-right: 30px;
        appearance: none; /* Para más control sobre la apariencia */
        position: relative;
        z-index: 1;
        background-color: white;
    }
    
    .date-display {
        position: absolute;
        pointer-events: none;
        padding: 0.7rem;
        top: 0;
        left: 0;
        width: calc(100% - 40px); /* Dejar espacio para el icono del calendario */
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        z-index: 2;
        background-color: transparent;
        color: #999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', sans-serif;
        font-weight: 400;
    }
    
    /* Personalizar el ícono de calendario */
    input[type="date"]::-webkit-calendar-picker-indicator {
        opacity: 0.6;
        cursor: pointer;
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        height: 20px;
        width: 20px;
        z-index: 3;
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

    .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        margin-top: 1rem;
    }

    .btn-delete {
        background-color: #F44336; /* Rojo */
        color: white;
    }
    .btn-delete:hover {
        background-color: #D32F2F;
    }
</style>
