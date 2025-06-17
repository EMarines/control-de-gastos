<script lang="ts">    import { createEventDispatcher } from 'svelte';
    import { addTransaction, updateTransaction, removeTransaction, type Transaction, type TransactionType } from '../stores/transactions';
    import { ingresosCasa, ingresosMatchHome, pagadoCon } from '../data/parameters';

    // Props del componente
    export let show = false;
    export let initialData: Transaction | null = null;

    const dispatch = createEventDispatcher();
      // Estado del formulario
    let description = '';
    let amount: number | null = null;
    let formattedAmount = '';
    let dateInput = '';
    let location = '';
    let incomeSource = '';
    let paymentMethod = '';
    let invoice = '';
    let tags = '';
    let notes = '';
    
    // Flag para rastrear si el formulario ha sido inicializado
    let isInitialized = false;
      // Opciones para la fuente de ingreso basadas en la ubicación seleccionada
    $: sourceOptions = location === 'Casa' ? ingresosCasa : ingresosMatchHome;
    
    // Crear una fecha actual con mediodía para evitar problemas de zona horaria
    let now = new Date();
    
    // Estado inicial de la fecha
    let dateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
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
    }
      // Formatear fecha para input (yyyy-mm-dd)
    function formatDateInput(date: Date | null): string {
        if (!date) return '';
        // Ajustar para evitar problemas de zona horaria
        const localDate = new Date(date);
        localDate.setMinutes(localDate.getMinutes() + localDate.getTimezoneOffset());
        const year = localDate.getFullYear();
        const month = String(localDate.getMonth() + 1).padStart(2, '0');
        const day = String(localDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }      // Formatear fecha para visualización
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
                    dateObj = new Date(
                        tempDate.getFullYear(),
                        tempDate.getMonth(),
                        tempDate.getDate(),
                        12, 0, 0 // Mediodía para evitar problemas
                    );
                } else {
                    dateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
                }
            } catch (err) {
                console.error('Error al inicializar fecha:', err);
                dateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
            }
            
            dateInput = formatDateInput(dateObj);
            location = initialData.location || '';
            incomeSource = initialData.cuenta || '';
            paymentMethod = initialData.paymentMethod || '';
            invoice = initialData.invoice || '';
            tags = initialData.tags || '';
            notes = initialData.notes || '';
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
        
        // Crear fecha con mediodía para evitar problemas de zona horaria
        const now = new Date();
        dateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
        dateInput = formatDateInput(dateObj);
        location = '';
        incomeSource = '';
        paymentMethod = '';
        invoice = '';
        tags = '';
        notes = '';
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
    }
      // Manejar cambio en el input de fecha
    function handleDateChange(event: Event) {
        try {
            const rawDate = (event.target as HTMLInputElement).value;
            // Crear fecha sin considerar la zona horaria
            const dateParts = rawDate.split('-');
            const year = parseInt(dateParts[0]);
            const month = parseInt(dateParts[1]) - 1; // Meses en JS son 0-11
            const day = parseInt(dateParts[2]);
            
            dateObj = new Date(year, month, day, 12, 0, 0); // Usar mediodía para evitar problemas
        } catch {
            dateObj = new Date();
        }
        
        dateInput = formatDateInput(dateObj);
    }
    
    // Manejar envío del formulario
    function handleSubmit(event: SubmitEvent) {
        event.preventDefault();
        
        // Validar datos requeridos
        if (!description || !amount || amount <= 0 || !dateInput) {
            alert("Por favor, completa todos los campos obligatorios (*) y asegúrate de que el monto sea válido.");
            return;
        }
          // Crear fecha ajustada sin problemas de zona horaria
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
        
        const isoDate = adjustedDate.toISOString();
        
        // Crear objeto de transacción
        const transactionData = {
            description,
            amount,
            date: isoDate,
            type: 'ingreso' as TransactionType,
            location,
            cuenta: incomeSource,
            subcuenta: '',
            paymentMethod,
            invoice,
            tags,
            notes,
            businessPurpose: ''
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
        if (initialData?.id && confirm(`¿Estás seguro de que deseas eliminar este ingreso?`)) {
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
            <h2 id="modal-title">{initialData?.id ? 'Modificar Ingreso' : 'Registrar Ingreso'}</h2>
            <button class="close-button" on:click={closeModal} aria-label="Cerrar" type="button">&times;</button>
        </div>
        
        <div class="modal-body">
            <form on:submit={handleSubmit}>
                <div class="form-row">
                    <div class="form-group">
                        <label for="income-location">Ubicación</label>
                        <select id="income-location" bind:value={location} required>
                            <option value="">Seleccionar...</option>
                            <option value="Casa">Casa</option>
                            <option value="Match Home">Match Home</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="income-source">Fuente de Ingreso*</label>
                        <select id="income-source" bind:value={incomeSource} required>
                            <option value="">Seleccionar...</option>
                            {#each sourceOptions as option}
                                <option value={option}>{option}</option>
                            {/each}
                        </select>
                    </div>
                </div>
                  <div class="form-row">
                    <div class="form-group date-container">
                        <label for="income-date">Fecha*</label>
                        <input 
                            type="date" 
                            id="income-date" 
                            bind:value={dateInput} 
                            on:change={handleDateChange}
                            required 
                        />
                    </div>
                    
                    <div class="form-group">
                        <label for="income-payment">Método de Pago</label>
                        <select id="income-payment" bind:value={paymentMethod}>
                            <option value="">Seleccionar...</option>
                            {#each pagadoCon as method}
                                <option value={method}>{method}</option>
                            {/each}
                        </select>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group full-width">
                        <label for="income-description">Descripción*</label>
                        <input 
                            type="text" 
                            id="income-description" 
                            bind:value={description} 
                            placeholder="Ej: Salario, Venta, etc." 
                            required 
                        />
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="income-amount">Monto ($)*</label>
                        <input 
                            type="text" 
                            id="income-amount" 
                            value={formattedAmount}
                            on:input={handleAmountChange}
                            placeholder="0.00" 
                            inputmode="decimal"
                            required 
                        />
                    </div>
                    
                    <div class="form-group">
                        <label for="income-invoice">Referencia/Factura</label>
                        <input 
                            type="text" 
                            id="income-invoice" 
                            bind:value={invoice} 
                            placeholder="Número o referencia" 
                        />
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group full-width">
                        <label for="income-tags">Etiquetas</label>
                        <input 
                            type="text" 
                            id="income-tags" 
                            bind:value={tags} 
                            placeholder="Separadas por comas" 
                        />
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group full-width">
                        <label for="income-notes">Notas</label>
                        <textarea 
                            id="income-notes" 
                            bind:value={notes} 
                            placeholder="Notas adicionales..."
                        ></textarea>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn cancel-btn" on:click={closeModal} aria-label="Cancelar operación">
                        Cancelar
                    </button>
                    
                    {#if initialData?.id}
                        <button type="button" class="btn delete-btn" on:click={handleDelete} aria-label="Eliminar ingreso">
                            Eliminar
                        </button>
                    {/if}
                    
                    <button type="submit" class="btn save-btn" aria-label={initialData?.id ? 'Guardar cambios del ingreso' : 'Guardar nuevo ingreso'}>
                        {initialData?.id ? 'Guardar Cambios' : 'Guardar Ingreso'}
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
        background-color: #4CAF50; /* Verde para ingresos */
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
    }
      .date-container {
        position: relative;
    }
    
    input[type="date"] {
        position: relative;
        color: #333;
        width: 100%;
        padding-right: 30px; /* Espacio para el icono del calendario */
    }
    
    input[type="date"]::-webkit-calendar-picker-indicator {
        position: absolute;
        right: 8px;
        height: 20px;
        width: 20px;
        color: #555;
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
        background-color: #4CAF50;
        color: white;
    }
    
    /* Responsive design */
    @media (max-width: 600px) {
        .form-row {
            flex-direction: column;
            gap: 10px;
        }
    }
</style>
