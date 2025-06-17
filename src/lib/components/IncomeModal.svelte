<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
    import { addTransaction, updateTransaction, removeTransaction, type Transaction } from '../stores/transactions';
    import { ingresosCasa, ingresosMatchHome, pagadoCon, pagadoPor } from '../data/parameters';

    export let show = false;
    export let initialData: Transaction | null = null;

    const dispatch = createEventDispatcher();
    
    // Objeto para almacenar todos los datos del formulario juntos (para evitar resets parciales)
    let formData = {
        description: '',
        amount: null as number | null,
        formattedAmount: '',
        dateObject: new Date(),
        date: '',
        displayDate: '',
        location: '',
        incomeSource: '',
        paymentMethod: '',
        invoice: '',
        tags: '',
        notes: ''
    };
    
    let filteredSources: string[] = [];
    let showSourceSuggestions: boolean = false;
    
    // Inicializar fechas una vez al principio
    onMount(() => {
        formData.date = formatDateInput(formData.dateObject);
        formData.displayDate = formatDateDisplay(formData.dateObject);
    });

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
    }    // Funciones de formato de fecha
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
    
    // Función para actualizar solo la visualización de la fecha sin afectar otros campos
    function updateDisplayDate(e: Event) {
        e?.preventDefault();
        
        try {
            // Solo actualizar elementos relacionados con la fecha
            const newDateObject = parseInputDate(formData.date);
            formData.dateObject = newDateObject;
            formData.displayDate = formatDateDisplay(newDateObject);
            console.log('Fecha actualizada:', {date: formData.date, displayDate: formData.displayDate});
        } catch (err) {
            console.error('Error al actualizar la fecha:', err);
        }
    }    // Opciones para la fuente del ingreso según la ubicación
    $: opcionesFuenteIngreso = formData.location === 'Casa' ? ingresosCasa : ingresosMatchHome;
    
    // Variable para evitar inicializaciones repetidas del formulario
    let lastShowState = false;
    
    // Inicializar o resetear el formulario cuando el estado del modal cambia
    $: {
        if (show !== lastShowState) {
            lastShowState = show;
            
            if (show) {
                // El modal se está abriendo
                initializeForm();
            }
        }
    }
    
    // Función para inicializar el formulario
    function initializeForm() {
        try {
            if (initialData) {
                // Inicializar con datos existentes para edición
                formData = {
                    description: initialData.description || '',
                    amount: initialData.amount,
                    formattedAmount: formatNumber(initialData.amount?.toString() || '0'),
                    dateObject: initialData.date ? parseInputDate(initialData.date) : new Date(),
                    date: '',
                    displayDate: '',
                    location: initialData.location || '',
                    incomeSource: initialData.cuenta || '',
                    paymentMethod: initialData.paymentMethod || '',
                    invoice: initialData.invoice || '',
                    tags: initialData.tags || '',
                    notes: initialData.notes || ''
                };
                
                // Establecer las fechas derivadas después de inicializar el objeto
                formData.date = formatDateInput(formData.dateObject);
                formData.displayDate = formatDateDisplay(formData.dateObject);
                
                console.log('Formulario inicializado para edición:', formData);
            } else {
                resetForm();
            }
        } catch (error) {
            console.error('Error al inicializar formulario:', error);
            resetForm(); // En caso de error, usar valores predeterminados
        }
    }    // Actualizar amount (número) cuando formattedAmount (string) cambia
    $: {
        formData.amount = parseFormattedNumber(formData.formattedAmount);
    }

    // Función para resetear el formulario completamente
    function resetForm() {
        const now = new Date();
        
        formData = {
            description: '',
            amount: null,
            formattedAmount: '',
            dateObject: now,
            date: formatDateInput(now),
            displayDate: formatDateDisplay(now),
            location: '',
            incomeSource: '',
            paymentMethod: '',
            invoice: '',
            tags: '',
            notes: ''
        };
        
        showSourceSuggestions = false;
        filteredSources = [];
        
        console.log('Formulario reseteado');
    }
    
    function handleSubmit() {
        // Validar el formulario antes de enviar
        const numericAmount = formData.amount;
        
        if (formData.description && numericAmount !== null && numericAmount > 0 && formData.date) {
            // Preparar la fecha en formato ISO
            const isoDate = parseInputDate(formData.date).toISOString();
            console.log('IncomeModal - Fecha para guardado:', { 
                originalDate: formData.date, 
                parsedDate: parseInputDate(formData.date),
                isoDate 
            });            // Crear objeto para transacción
            const transactionData = {
                description: formData.description,
                amount: numericAmount,
                date: isoDate,
                type: 'ingreso' as const, // Asegura el tipo correcto
                location: formData.location,
                cuenta: formData.incomeSource, // Guardamos 'incomeSource' en el campo 'cuenta' de la transacción
                subcuenta: '', // Los ingresos podrían no tener subcuenta
                paymentMethod: formData.paymentMethod,
                invoice: formData.invoice,
                tags: formData.tags,
                notes: formData.notes,
                businessPurpose: '', // Para mantener consistencia con otros campos
            };

            if (initialData && initialData.id) {
                // Actualizar transacción existente
                console.log('IncomeModal - Actualizando transacción:', { ...transactionData, id: initialData.id });
                updateTransaction({ ...transactionData, id: initialData.id });
            } else {
                // Crear nueva transacción
                console.log('IncomeModal - Creando nueva transacción:', transactionData);
                addTransaction(transactionData);
            }
            
            closeModal();
        } else {
            alert("Por favor, completa todos los campos obligatorios (*) y asegúrate de que el monto sea válido.");
        }
    }    function handleDelete() {
        if (initialData && initialData.id) {
            if (confirm(`¿Estás seguro de que quieres eliminar el ingreso "${initialData.description}"?`)) {
                removeTransaction(initialData.id);
                closeModal();
            }
        }
    }
    
    function closeModal() {
        // No modificamos los datos del formulario aquí,
        // esto evita problemas con estados parciales
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
    }    function selectSource(source: string) {
        formData.description = source; // Usar formData.description en lugar de description
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
        </div>        <div class="modal-content">
            <form on:submit|preventDefault={handleSubmit} on:input={(e) => e.stopPropagation()}>
                <div class="form-row">
                    <div class="form-group">                        <label for="inc-location">Ubicación</label>
                        <select id="inc-location" bind:value={formData.location} required>
                            <option value="">Seleccionar...</option>
                            <option value="Casa">Casa</option>
                            <option value="Match Home">Match Home</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="inc-incomeSource">Fuente del Ingreso*</label>
                        <select id="inc-incomeSource" bind:value={formData.incomeSource} required>
                            <option value="">Seleccionar fuente...</option>
                            {#each opcionesFuenteIngreso as opcion}
                                <option value={opcion}>{opcion}</option>
                            {/each}
                        </select>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">                        <label for="inc-date">Fecha*</label>
                        <div class="date-input-container">
                            <input 
                                type="date" 
                                id="inc-date" 
                                bind:value={formData.date}
                                on:input={(e) => e.stopPropagation()}
                                on:change={(e) => {
                                    e.preventDefault();
                                    updateDisplayDate(e);
                                }}
                                required 
                            />
                            <div class="date-display">{formData.displayDate}</div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="inc-paymentMethod">Recibido en</label>
                        <select id="inc-paymentMethod" bind:value={formData.paymentMethod}>                            <option value="">Seleccionar método...</option>
                            {#each pagadoCon as opcion} <!-- Reutilizando pagadoCon o podrías tener 'recibidoEn' -->
                                <option value={opcion}>{opcion}</option>
                            {/each}
                        </select>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group full-width">                        <label for="inc-description">Descripción*</label>
                        <input type="text" id="inc-description" bind:value={formData.description} placeholder="Ej: Salario, Venta de producto X" required />
                        <!-- Podrías añadir autocompletado aquí si es relevante -->
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="inc-amount">Monto ($)*</label>
                        <input 
                            type="text" 
                            id="inc-amount" 
                            bind:value={formData.formattedAmount} 
                            on:input={(e) => formData.formattedAmount = formatNumber(e.currentTarget ? e.currentTarget.value : '')} 
                            inputmode="decimal" 
                            placeholder="0.00" 
                            required 
                        />
                    </div>
                    <div class="form-group">
                        <label for="inc-invoice">Referencia/Factura</label>
                        <input type="text" id="inc-invoice" bind:value={formData.invoice} placeholder="Número de factura o referencia" />
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group full-width">                        <label for="inc-tags">Etiquetas</label>
                        <input type="text" id="inc-tags" bind:value={formData.tags} placeholder="Separadas por comas" />
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group full-width">
                        <label for="inc-notes">Notas adicionales</label>
                        <textarea id="inc-notes" bind:value={formData.notes} placeholder="Añade notas o detalles"></textarea>
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