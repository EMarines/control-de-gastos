<script lang="ts">    import { createEventDispatcher } from 'svelte';
    import { addTransaction, updateTransaction, removeTransaction, type Transaction, type TransactionType, transactions } from '../stores/transactions';
    import { cuentaCasa, cuentaMatchHome, gastosCasa, gastosMatchHome, servicios, transporte, escuela, salud, pagadoCon, pagadoPor } from '../data/parameters';
    
    // Props del componente
    export let show = false;
    export let initialData: Transaction | null = null;

    const dispatch = createEventDispatcher();
    
    // Estado del formulario
    let description = '';    let amount: number | null = null;
    let formattedAmount = '';
    let dateObj = new Date();
    let dateInput = '';
    let location = '';
    let cuenta = '';
    let subcuenta = '';
    let paymentMethod = '';
    let invoice = '';
    let tags = '';
    let notes = '';
    let businessPurpose = '';
    let filteredProviders: string[] = [];
    let showProviderSuggestions = false;
    
    // Flag para rastrear si el formulario ha sido inicializado
    let isInitialized = false;
    
    // Mapa para relacionar cuentas con sus respectivas subcuentas
    const cuentaToSubcuentaMap: Record<string, string[]> = {
        "Servicios": servicios,
        "Egresos Transporte": transporte,
        "Escuela": escuela,
        "Salud": salud,
        "Egresos Casa": gastosCasa,
        "Gastos Oficina": gastosMatchHome
    };
    
    // Obtener opciones de cuenta según la ubicación seleccionada
    $: opcionesCuenta = location === 'Casa' ? cuentaCasa : cuentaMatchHome;
    
    // Función para obtener las opciones de subcuenta según la cuenta seleccionada
    function getSubcuentaOptions(cuentaSeleccionada: string): string[] {
        // Buscar en el mapa si existe una configuración específica para esta cuenta
        if (cuentaToSubcuentaMap[cuentaSeleccionada]) {
            return cuentaToSubcuentaMap[cuentaSeleccionada];
        }
        // Si no hay una configuración específica, dejar la lista vacía
        return [];
    }
    
    // Obtener opciones de subcuenta según la cuenta seleccionada
    $: opcionesSubcuenta = getSubcuentaOptions(cuenta);
      // Formatear números para visualización
    function formatNumber(value: string | number): string {
        if (!value) return '';
        const num = value.toString().replace(/[^\d.]/g, '');
        const parts = num.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return parts.length > 1 ? `${parts[0]}.${parts[1]}` : parts[0];
    }
    
    // Convertir texto formateado a número
    function parseNumber(formatted: string): number | null {
        if (!formatted) return null;
        return parseFloat(formatted.replace(/,/g, ''));
    }    // Formatear fecha para input (yyyy-mm-dd)
    function formatDateInput(date: Date | null): string {
        if (!date) return '';
        // Ajustar para evitar problemas de zona horaria
        const localDate = new Date(date);
        localDate.setMinutes(localDate.getMinutes() + localDate.getTimezoneOffset());
        const year = localDate.getFullYear();
        const month = String(localDate.getMonth() + 1).padStart(2, '0');
        const day = String(localDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    // Formatear fecha para visualización
    function formatDateDisplay(date: Date | null): string {
        if (!date) return '';
        // Ajustar para evitar problemas de zona horaria
        const localDate = new Date(date);
        localDate.setMinutes(localDate.getMinutes() + localDate.getTimezoneOffset());
        const day = String(localDate.getDate()).padStart(2, '0');
        const month = localDate.toLocaleString('es', { month: 'short' });
        const year = localDate.getFullYear();
        return `${day}/${month}/${year}`;
    }
    
    // Reiniciar subcuenta cuando cambia la cuenta o la ubicación
    $: {
        if (!cuenta) {
            // Si cuenta está vacía, reiniciar subcuenta
            if (isInitialized) subcuenta = '';
        } else {
            const opciones = getSubcuentaOptions(cuenta);
            if (subcuenta && !opciones.includes(subcuenta) && isInitialized) {
                subcuenta = '';
            }
        }
    }

    // Reiniciar cuenta cuando cambia la ubicación
    $: {
        if (location === 'Casa') {
            if (cuenta && !cuentaCasa.includes(cuenta) && isInitialized) {
                cuenta = '';
            }
        } else if (location === 'Match Home') {
            if (cuenta && !cuentaMatchHome.includes(cuenta) && isInitialized) {
                cuenta = '';
            }
        } else if (!location && isInitialized) {
            // Si location está vacío, reiniciar cuenta
            cuenta = '';
        }
    }
      // Inicializar el formulario cuando se muestra o cuando cambian los datos iniciales
    $: if (show && !isInitialized) {
        if (initialData) {
            // Inicializar con datos existentes
            description = initialData.description || '';
            amount = initialData.amount;
            formattedAmount = formatNumber(initialData.amount);
            
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
                    dateObj = adjustedDate;
                } else {
                    dateObj = new Date();
                }
            } catch (err) {
                console.error('Error al inicializar fecha:', err);
                dateObj = new Date();
            }
            
            dateInput = formatDateInput(dateObj);
            location = initialData.location || '';
            cuenta = initialData.cuenta || '';
            subcuenta = initialData.subcuenta || '';
            paymentMethod = initialData.paymentMethod || '';
            invoice = initialData.invoice || '';
            tags = initialData.tags || '';
            notes = initialData.notes || '';
            businessPurpose = initialData.businessPurpose || '';
        } else {
            // Nuevo registro, inicializar con valores predeterminados
            resetForm();
        }
        
        isInitialized = true;
    }
    
    // Resetear la bandera cuando se cierra el modal
    $: if (!show) {
        isInitialized = false;
    }
      // Resetear el formulario a valores predeterminados
    function resetForm() {
        description = '';
        amount = null;
        formattedAmount = '';
        
        // Crear una fecha actual con mediodía para evitar problemas de zona horaria
        const now = new Date();
        dateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
        dateInput = formatDateInput(dateObj);
        
        location = '';
        cuenta = '';
        subcuenta = '';
        paymentMethod = '';
        invoice = '';
        tags = '';
        notes = '';
        businessPurpose = '';
        filteredProviders = [];
        showProviderSuggestions = false;
    }
    
    // Actualizar el valor formateado cuando cambia amount
    $: {
        if (amount !== null && amount !== undefined) {
            formattedAmount = formatNumber(amount);
        }
    }
      // Actualizar amount cuando cambia el valor formateado
    function handleAmountChange(event: Event) {
        const value = (event.target as HTMLInputElement).value;
        formattedAmount = formatNumber(value);
        amount = parseNumber(formattedAmount);
    }  // Manejar cambio en el input de fecha
    function handleDateChange(event: Event) {
        try {
            // Crear la fecha sin considerar la zona horaria
            const rawDate = (event.target as HTMLInputElement).value;
            dateObj = new Date(rawDate);
            // No actualizar dateInput para evitar recursión
            // dateInput = formatDateInput(dateObj);
        } catch (err) {
            console.error('Error al procesar fecha:', err);
            dateObj = new Date();
            dateInput = formatDateInput(dateObj);
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
      // Manejar envío del formulario
    function handleSubmit(event: SubmitEvent) {
        event.preventDefault();
        
        // Validar datos requeridos
        if (!description || !amount || amount <= 0 || !dateInput || !cuenta) {
            alert("Por favor, completa todos los campos obligatorios (*) y asegúrate de que el monto sea válido.");
            return;
        }
          // Crear objeto de transacción        // Crear fecha sin problemas de zona horaria
        let adjustedDate;
        try {
            const dateParts = dateInput.split('-');
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
          const transactionData = {
            description,
            amount,
            date: adjustedDate.toISOString(),
            type: 'egreso' as TransactionType,
            location,
            cuenta,
            subcuenta,
            paymentMethod,
            invoice,
            tags,
            notes,
            businessPurpose
        };
        
        try {
            if (initialData?.id) {
                // Actualizar transacción existente
                updateTransaction({ ...transactionData, id: initialData.id });
            } else {
                // Crear nueva transacción
                addTransaction(transactionData);
            }
            
            // Cerrar modal
            closeModal();
        } catch (error) {
            console.error('Error al guardar:', error);
            alert('Ocurrió un error al guardar. Inténtalo de nuevo.');
        }
    }
    
    // Manejar eliminación de transacción
    function handleDelete() {
        if (initialData?.id && confirm(`¿Estás seguro de que deseas eliminar este egreso?`)) {
            removeTransaction(initialData.id);
            closeModal();
        }
    }
    
    // Cerrar el modal
    function closeModal() {
        dispatch('close');
    }
</script>

{#if show}
<div class="modal-overlay" on:click|self={closeModal} on:keydown={(e) => e.key === 'Escape' && closeModal()} role="dialog" aria-modal="true">
    <div class="modal-container" role="document">
        <div class="modal-header">
            <h2 id="modal-title">{initialData?.id ? 'Modificar Egreso' : 'Registrar Egreso'}</h2>
            <button class="close-button" on:click={closeModal} aria-label="Cerrar" type="button">&times;</button>
        </div>
        
        <div class="modal-body">
            <form on:submit={handleSubmit}>
                <div class="form-row">
                    <div class="form-group">
                        <label for="expense-location">Opciones</label>
                        <select id="expense-location" bind:value={location} required>
                            <option value="">Seleccionar...</option>
                            <option value="Casa">Casa</option>
                            <option value="Match Home">Match Home</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="expense-cuenta">Cuenta*</label>
                        <select id="expense-cuenta" bind:value={cuenta} required>
                            <option value="">Seleccionar cuenta...</option>
                            {#each opcionesCuenta as opcion}
                                <option value={opcion}>{opcion}</option>
                            {/each}
                        </select>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="expense-subcuenta">Subcuenta específica</label>
                        <select id="expense-subcuenta" bind:value={subcuenta}>
                            <option value="">Seleccionar subcuenta...</option>
                            {#each opcionesSubcuenta as opcion}
                                <option value={opcion}>{opcion}</option>
                            {/each}
                        </select>
                    </div>                      <div class="form-group">
                        <label for="expense-date">Fecha*</label>
                        <div class="date-container">
                            <input 
                                type="date" 
                                id="expense-date" 
                                bind:value={dateInput} 
                                on:change={handleDateChange}
                                required 
                            />
                        </div>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group full-width">
                        <label for="expense-description">Pagado A:*</label>
                        <div class="autocomplete-container">
                            <input 
                                type="text" 
                                id="expense-description" 
                                bind:value={description} 
                                placeholder="Nombre de la empresa o proveedor" 
                                on:input={() => filterProviders(description)}
                                on:focus={() => filterProviders(description)}
                                on:blur={() => setTimeout(() => showProviderSuggestions = false, 200)}
                                required 
                            />
                            {#if showProviderSuggestions}                                <div class="suggestions-container" role="listbox" aria-label="Sugerencias de proveedores">
                                    {#each filteredProviders as provider}                                        <div 
                                            class="suggestion-item"
                                            role="option"
                                            aria-selected="false"
                                            tabindex="0"
                                            on:click={() => selectProvider(provider)}
                                            on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && selectProvider(provider)}
                                        >
                                            {provider}
                                        </div>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="expense-amount">Valor ($)*</label>
                        <input 
                            type="text" 
                            id="expense-amount" 
                            value={formattedAmount}
                            on:input={handleAmountChange}
                            placeholder="0.00" 
                            inputmode="decimal"
                            required 
                        />
                    </div>
                    
                    <div class="form-group">
                        <label for="expense-invoice">Referencia</label>
                        <input 
                            type="text" 
                            id="expense-invoice" 
                            bind:value={invoice} 
                            placeholder="Número o referencia" 
                        />
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="expense-payment">Pagado con</label>
                        <select id="expense-payment" bind:value={paymentMethod}>
                            <option value="">Seleccionar método de pago...</option>
                            {#each pagadoCon as method}
                                <option value={method}>{method}</option>
                            {/each}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="expense-purpose">Pagado por</label>
                        <select id="expense-purpose" bind:value={businessPurpose}>
                            <option value="">Seleccionar pagador...</option>
                            {#each pagadoPor as person}
                                <option value={person}>{person}</option>
                            {/each}
                        </select>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group full-width">
                        <label for="expense-tags">Etiquetas</label>
                        <input 
                            type="text" 
                            id="expense-tags" 
                            bind:value={tags} 
                            placeholder="Separadas por comas" 
                        />
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group full-width">
                        <label for="expense-notes">Notas adicionales</label>
                        <textarea 
                            id="expense-notes" 
                            bind:value={notes} 
                            placeholder="Añade notas o detalles"
                        ></textarea>
                    </div>
                </div>
                  <div class="form-actions">
                    <button type="button" class="btn cancel-btn" on:click={closeModal} aria-label="Cancelar operación">
                        Cancelar
                    </button>
                    
                    {#if initialData?.id}
                        <button type="button" class="btn delete-btn" on:click={handleDelete} aria-label="Eliminar egreso">
                            Eliminar
                        </button>
                    {/if}
                    
                    <button type="submit" class="btn save-btn" aria-label={initialData?.id ? 'Guardar cambios del egreso' : 'Guardar nuevo egreso'}>
                        {initialData?.id ? 'Guardar Cambios' : 'Guardar Egreso'}
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
        background-color: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }
    
    .modal-container {
        background-color: #fff;
        width: 90%;
        max-width: 650px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
        max-height: 90vh;
        overflow-y: auto;
    }
    
    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px 20px;
        background-color: #f44336; /* Rojo para egresos */
        color: white;
        border-top-left-radius: 8px;
        border-top-right-radius: 8px;
    }
    
    .modal-header h2 {
        margin: 0;
        font-size: 1.5rem;
    }
    
    .close-button {
        background: none;
        border: none;
        color: white;
        font-size: 1.8rem;
        cursor: pointer;
        padding: 0;
    }
    
    .modal-body {
        padding: 20px;
    }
    
    .form-row {
        display: flex;
        gap: 15px;
        margin-bottom: 15px;
    }
      .form-group {
        flex: 1;
        position: relative;
    }
    
    .date-container {
        position: relative;
        width: 100%;
    }
    
    .full-width {
        flex-basis: 100%;
    }
    
    label {
        display: block;
        margin-bottom: 5px;
        font-weight: 500;
        color: #555;
        font-size: 0.9rem;
    }
    
    input, select, textarea {
        width: 100%;
        padding: 8px 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 1rem;
    }
    
    textarea {
        min-height: 80px;
        resize: vertical;
    }    input[type="date"] {
        position: relative;
        color: #333;
        background-color: white;
        padding-right: 30px; /* Espacio adicional para el icono */
    }
    
    input[type="date"]::-webkit-calendar-picker-indicator {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        height: 20px;
        width: 20px;
        color: #555;
        z-index: 3;
        opacity: 1;
        cursor: pointer;
    }
    
    .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 20px;
        padding-top: 15px;
        border-top: 1px solid #eee;
    }
    
    .btn {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
    }
    
    .cancel-btn {
        background-color: #f1f1f1;
        color: #555;
    }
    
    .delete-btn {
        background-color: #f44336;
        color: white;
    }
    
    .save-btn {
        background-color: #2196F3;
        color: white;
    }

    .autocomplete-container {
        position: relative;
        width: 100%;
    }
    
    .suggestions-container {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background-color: white;
        border: 1px solid #ddd;
        border-top: none;
        max-height: 200px;
        overflow-y: auto;
        z-index: 10;
        border-radius: 0 0 4px 4px;
    }
    
    .suggestion-item {
        padding: 8px 10px;
        cursor: pointer;
        transition: background-color 0.2s;
    }
    
    .suggestion-item:hover {
        background-color: #f5f5f5;
    }
    
    /* Responsive design */
    @media (max-width: 600px) {
        .form-row {
            flex-direction: column;
            gap: 10px;
        }
    }
</style>
