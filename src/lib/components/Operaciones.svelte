<script lang="ts">
    import { onMount } from 'svelte';
    import { 
        transactions, 
        type Transaction, 
        removeTransaction, 
        updateTransaction, 
        addTransaction,
        loadFirstPage,
        loadMoreTransactions, 
        isLoadingMore,
        hasMoreData,
        isInitialDataLoaded,
        fixDateFormatsInTransactions    } from '../stores/transactions'; // Importar el store, tipo y funciones de paginación
    import ActionButton from './ActionButton.svelte';
    import { forceRefreshData, refreshing } from '../services/data-refresh';
    import SimpleIncomeModal from './SimpleIncomeModal.svelte'; // Cambiado a SimpleIncomeModal
    import SimpleExpenseModal from './SimpleExpenseModal.svelte'; // Cambiado a SimpleExpenseModal
    
    import { formatCurrency } from '../util/formatters'; // Importar la función de formato
    
    type Operacion = Transaction; 
    
    let operaciones: Operacion[] = [];
    let operacionesFiltradas: Operacion[] = [];
    let datosCargadosInicialmente: boolean = false; // Para saber si ya procesamos los datos del store una vez    // Filtros
    let filtroTipo: string = 'todos'; // 'todos', 'ingreso', 'egreso' (todo en minúsculas como en la base de datos)
    let filtroCuenta: string = 'todas'; // Cambiado de filtroCategoria a filtroCuenta
    let filtroUbicacion: string = 'todas';
    let filtroBusqueda: string = '';
    let filtroFechaDesde: string = '';
    let filtroFechaHasta: string = '';
    
    // Ordenación
    let ordenPor: string = 'fecha'; // 'fecha', 'monto', 'descripcion'
    let ordenDireccion: 'asc' | 'desc' = 'desc';
    
    // Cuentas únicas para filtro (anteriormente categorías)
    let cuentasUnicas: string[] = [];
    let ubicaciones: string[] = [];
    
    // Totales
    let totalIngresos: number = 0;
    let totalGastos: number = 0;
let saldo: number = 0;
    
    // Estado para la edición y borrado
    let editingOperation: Operacion | null = null;
    let modalTypeToShow: 'income' | 'expense' | null = null;
    let deletingOperation: Operacion | null = null;
    
    // Función para convertir fecha en formato "21-May-25" a timestamp
    function parseCustomDate(dateStr: string): number {
        try {
            // console.log('parseCustomDate - Fecha recibida:', dateStr);
            
            // Si es null, undefined o cadena vacía
            if (!dateStr) {
                console.warn('parseCustomDate - Fecha vacía o null, utilizando fecha actual');
                return Date.now();
            }
            
            // Priorizar formato ISO (el formato de Firebase) ya que es más preciso
            if (dateStr.includes('T') || dateStr.includes('Z')) {
                const dateObj = new Date(dateStr);
                if (!isNaN(dateObj.getTime())) {
                    // console.log('parseCustomDate - Fecha con formato ISO:', dateStr, '->', dateObj.toISOString(), '->',  dateObj.getTime());
                    return dateObj.getTime();
                }
            }            
            if (dateStr.includes('-')) {
                const parts = dateStr.split('-');
                // console.log('parseCustomDate - Partes de la fecha:', parts);
                
                if (parts.length === 3) {
                    // Verificar primero si es un formato ISO simplificado (yyyy-mm-dd)
                    // Si la primera parte tiene 4 dígitos, asumimos que es el año (formato ISO yyyy-mm-dd)
                    if (parts[0].length === 4) {
                        const year = parseInt(parts[0]);
                        const month = parseInt(parts[1]) - 1; // Meses en JS son base 0
                        const day = parseInt(parts[2]);
                        
                        // console.log('parseCustomDate - Detectado formato ISO yyyy-mm-dd:', { year, month: month+1, day });
                        
                        const dateObj = new Date(year, month, day);
                        if (!isNaN(dateObj.getTime())) {
                            return dateObj.getTime();
                        }
                    }
                    
                    // Si no es formato ISO, procesamos como formato dd-MMM-yy (21-May-25, 9-Oct-24)
                    const day = parseInt(parts[0]);
                    // Lista de meses en inglés y español para detectar el formato correctamente
                    const englishMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const spanishMonths = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                    
                    let month = englishMonths.indexOf(parts[1]);
                    
                    // Si no se encontró en inglés, buscar en español
                    if (month === -1) {
                        month = spanishMonths.indexOf(parts[1]);
                    }
                    
                    // console.log('parseCustomDate - Mes detectado:', parts[1], 'índice:', month);
                              
                    if (month >= 0) {
                        let year = parseInt(parts[2]);
                        // Asumir que años de dos dígitos menores a 50 son del 2000 en adelante
                        if (year < 100) {
                            year = year < 50 ? 2000 + year : 1900 + year;
                        }
                        // console.log('parseCustomDate - Año calculado:', year);
                        
                        // Crear fecha y validar que sea correcta
                        const dateObj = new Date(year, month, day);
                        // console.log('parseCustomDate - Fecha creada:', dateObj.toISOString());
                        
                        if (!isNaN(dateObj.getTime())) {
                            return dateObj.getTime();
                        } else {
                            console.error('parseCustomDate - Fecha inválida creada:', { day, month, year });
                        }
                    } else {
                        console.error('parseCustomDate - Mes no reconocido:', parts[1]);
                        
                        // MEJORA: Intentar mapear meses desconocidos a formatos reconocidos
                        const monthText = parts[1].toLowerCase();
                        const monthMappings: {[key: string]: number} = {
                            // Español completo
                            'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3,
                            'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7,
                            'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11,
                            // Inglés completo
                            'january': 0, 'february': 1, 'march': 2, 'april': 3,
                            'may': 4, 'june': 5, 'july': 6, 'august': 7,
                            'september': 8, 'october': 9, 'november': 10, 'december': 11
                        };
                        
                        // Intentar reconocer por coincidencia parcial
                        for (const [key, value] of Object.entries(monthMappings)) {
                            if (key.startsWith(monthText) || monthText.startsWith(key)) {
                                month = value;
                                // console.log('parseCustomDate - Mes identificado por coincidencia parcial:', parts[1], '→', key, month);
                                break;
                            }
                        }
                        
                        // Si se identificó un mes por coincidencia parcial
                        if (month >= 0) {
                            let year = parseInt(parts[2]);
                            if (year < 100) {
                                year = year < 50 ? 2000 + year : 1900 + year;
                            }
                            
                            const dateObj = new Date(year, month, day);
                            if (!isNaN(dateObj.getTime())) {
                                // console.log('parseCustomDate - Fecha reparada con coincidencia parcial:', dateObj.toISOString());
                                return dateObj.getTime();
                            }
                        }
                        
                        // Si aún no se pudo identificar, intentar como fecha numérica (dd-mm-yyyy)
                        const numericMonth = parseInt(parts[1]) - 1; // Restar 1 porque los meses en JS son base 0
                        if (!isNaN(numericMonth) && numericMonth >= 0 && numericMonth <= 11) {
                            let year = parseInt(parts[2]);
                            if (year < 100) {
                                year = year < 50 ? 2000 + year : 1900 + year;
                            }
                            
                            const dateObj = new Date(year, numericMonth, day);
                            if (!isNaN(dateObj.getTime())) {
                                console.log('parseCustomDate - Fecha interpretada como dd-mm-yyyy:', dateObj.toISOString());
                                return dateObj.getTime();
                            }
                        }
                    }
                }
            } else if (dateStr.includes('/')) {
                // Formato dd/mm/yyyy o mm/dd/yyyy
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    let day, month, year;
                    
                    // Detectar formato de fecha basado en los valores
                    const firstPart = parseInt(parts[0]);
                    const secondPart = parseInt(parts[1]);
                    
                    // Si el primer número es > 12, probablemente es un día (formato europeo)
                    if (firstPart > 12) {
                        day = firstPart;
                        month = secondPart - 1; // Meses en JS son base 0
                    } else {
                        // Asumir formato mm/dd/yyyy (americano)
                        month = firstPart - 1;
                        day = secondPart;
                    }
                    
                    year = parseInt(parts[2]);
                    
                    const dateObj = new Date(year, month, day);
                    // console.log('parseCustomDate - Fecha con formato dd/mm/yyyy o mm/dd/yyyy:', dateObj.toISOString());
                    
                    if (!isNaN(dateObj.getTime())) {
                        return dateObj.getTime();
                    }
                }
            }
              // Para otros formatos de fecha (último recurso)
            try {
                // Intentar con Date.parse primero que es más preciso para fechas en formato estándar
                const timestamp = Date.parse(dateStr);
                if (!isNaN(timestamp)) {
                    console.log('parseCustomDate - Fecha parseada con Date.parse:', dateStr, '->', new Date(timestamp).toISOString());
                    return timestamp;
                }
                
                const dateObj = new Date(dateStr);
                // console.log('parseCustomDate - Fecha con formato estándar:', dateStr, '->', dateObj.toISOString(), '->', dateObj.getTime());
                if (!isNaN(dateObj.getTime())) {
                    return dateObj.getTime();
                }
            } catch (e) {
                console.error('Error convirtiendo fecha estándar:', e, dateStr);
            }
            
            // Último intento: buscar patrones numéricos en el formato dd/mm/yy o dd-mm-yy
            const numericMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
            if (numericMatch) {
                const day = parseInt(numericMatch[1]);
                const month = parseInt(numericMatch[2]) - 1; // Meses en JS son base 0
                let year = parseInt(numericMatch[3]);
                if (year < 100) {
                    year = year < 50 ? 2000 + year : 1900 + year;
                }
                
                const dateObj = new Date(year, month, day);
                if (!isNaN(dateObj.getTime())) {
                    // console.log('parseCustomDate - Fecha extraída con regex:', dateObj.toISOString());
                    return dateObj.getTime();
                }
            }
            
            console.warn('No se pudo parsear la fecha, retornando timestamp actual:', dateStr);
            return Date.now(); // Devolver fecha actual como último recurso
        } catch (error) {
            console.error('Error al parsear fecha:', error, dateStr);
            return Date.now(); // En caso de error, también devolver la fecha actual
        }    }    // Formatear fecha para mostrarla en formato "DD-MMM-YY"
    function formatearFecha(fechaStr: string): string {
        try {
            // Si es null, undefined o cadena vacía
            if (!fechaStr) {
                console.warn('formatearFecha - Fecha vacía o null');
                return 'Fecha inválida';
            }
            
            // Intentar parsear la fecha
            let fecha: Date;
            
            // Si es un formato ISO completo con T o Z (como "2025-Jun-10T00:00:00.000Z")
            if (fechaStr.includes('T') || fechaStr.includes('Z')) {
                fecha = new Date(fechaStr);
            }
            // Si es un formato ISO simple (yyyy-mm-dd) como "2025-05-29"
            else if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
                const [year, month, day] = fechaStr.split('-').map(Number);
                fecha = new Date(year, month - 1, day); // Meses en JS son base 0
            }
            // Si ya está en el formato correcto DD-MMM-YY (como "10-Jun-25")
            else if (fechaStr.includes('-') && fechaStr.split('-').length === 3) {
                const parts = fechaStr.split('-');
                const englishMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const spanishMonths = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                
                // Verificar si la segunda parte es un mes en texto y las otras partes son números
                const possibleMonth = parts[1];
                if (
                    (englishMonths.includes(possibleMonth) || spanishMonths.includes(possibleMonth)) &&
                    !isNaN(parseInt(parts[0])) && 
                    !isNaN(parseInt(parts[2]))
                ) {
                    // Ya está en el formato correcto, asegurarse que el día tenga dos dígitos y el mes en inglés
                    let monthIndex = englishMonths.indexOf(possibleMonth);
                    if (monthIndex === -1) {
                        monthIndex = spanishMonths.indexOf(possibleMonth);
                    }
                    const day = parts[0].padStart(2, '0');
                    const month = englishMonths[monthIndex];
                    return `${day}-${month}-${parts[2]}`;
                }
                else {
                    // Usar parseCustomDate para intentar convertirlo
                    const timestamp = parseCustomDate(fechaStr);
                    if (timestamp > 0) {
                        fecha = new Date(timestamp);
                    } else {
                        fecha = new Date(fechaStr);
                    }
                }
            }
            // Para otros formatos, usar parseCustomDate que ya tiene toda la lógica
            else {
                const timestamp = parseCustomDate(fechaStr);
                if (timestamp > 0) {
                    fecha = new Date(timestamp);
                } else {
                    fecha = new Date(fechaStr);
                }
            }
              // Verificar si la fecha es válida
            if (!fecha || isNaN(fecha.getTime())) {
                console.error('Fecha inválida en formatearFecha:', fechaStr);
                return 'Fecha inválida';
            }
              // Formatear la fecha como DD-MMM-YY
            const day = fecha.getDate().toString().padStart(2, '0'); // Asegura que el día tenga dos dígitos
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = monthNames[fecha.getMonth()];
            const year = fecha.getFullYear().toString().substring(2); // Solo los últimos 2 dígitos
            
            return `${day}-${month}-${year}`;
        } catch (error) {
            console.error('Error al formatear fecha:', error, fechaStr);
            return 'Fecha inválida';
        }
    }
      // Función para filtrar operaciones (optimizada)
    function filtrarOperaciones(): void {
        // Preparar las variables de búsqueda fuera del bucle para evitar recrearlas por cada operación
        const busqueda = filtroBusqueda ? filtroBusqueda.toLowerCase() : '';
        const fechaDesde = filtroFechaDesde ? new Date(filtroFechaDesde) : null;
        
        // Crear fecha hasta con el final del día seleccionado
        let fechaHasta = null;
        if (filtroFechaHasta) {
            fechaHasta = new Date(filtroFechaHasta);
            fechaHasta.setHours(23, 59, 59, 999); // Fin del día
        }
        
        // console.log(`filtrarOperaciones - Filtrando ${operaciones.length} operaciones con filtros:`, {
        //     tipo: filtroTipo,
        //     cuenta: filtroCuenta,
        //     ubicacion: filtroUbicacion,
        //     busqueda: busqueda,
        //     fechaDesde: fechaDesde ? fechaDesde.toISOString() : null,
        //     fechaHasta: fechaHasta ? fechaHasta.toISOString() : null
        // });
        
        // Aplicar filtros de manera más eficiente
        operacionesFiltradas = operaciones.filter(op => {
            // Verificar las propiedades requeridas para asegurarse que existen
            if (!op || typeof op.type !== 'string') {
                console.warn('Operación inválida o sin tipo:', op);
                return false;
            }

            // Verificar los filtros más rápidos primero para mejorar rendimiento
            // (principio de corto-circuito)
            
            // Filtro por tipo - comparar ignorando mayúsculas/minúsculas
            if (filtroTipo !== 'todos' && op.type.toLowerCase() !== filtroTipo.toLowerCase()) {
                return false;
            }
            
            // Filtro por cuenta 
            if (filtroCuenta !== 'todas' && op.cuenta !== filtroCuenta) {
                return false;
            }
            
            // Filtro por ubicación
            if (filtroUbicacion !== 'todas' && op.location !== filtroUbicacion) {
                return false;
            }
            
            // Filtros más costosos al final
            
            // Filtro por fecha desde
            if (fechaDesde) {
                const opDate = new Date(op.date);
                if (isNaN(opDate.getTime())) {
                    console.warn('Fecha inválida en operación:', op.id, op.date);
                    return false;
                }
                if (opDate < fechaDesde) return false;
            }
            
            // Filtro por fecha hasta
            if (fechaHasta) {
                const opDate = new Date(op.date);
                if (isNaN(opDate.getTime())) {
                    console.warn('Fecha inválida en operación:', op.id, op.date);
                    return false;
                }
                if (opDate > fechaHasta) return false;
            }
            
            // Filtro por texto de búsqueda (el más costoso)
            if (busqueda) {
                const descripcionMatches = op.description?.toLowerCase().includes(busqueda);
                const notasMatches = op.notes?.toLowerCase().includes(busqueda);
                const facturaMatches = op.invoice?.toLowerCase().includes(busqueda);
                if (!descripcionMatches && !notasMatches && !facturaMatches) return false;
            }
            
            return true;
        });

        // console.log(`filtrarOperaciones - Resultado: ${operacionesFiltradas.length} operaciones después de filtrar`);

        // Aplicar ordenación
        operacionesFiltradas = operacionesFiltradas.sort((a: Operacion, b: Operacion): number => {
            if (ordenPor === 'fecha') {
                const fechaA = parseCustomDate(a.date);
                const fechaB = parseCustomDate(b.date);
                
                // Si alguna fecha es inválida (0), colocarla al final
                if (fechaA === 0 && fechaB !== 0) return ordenDireccion === 'asc' ? 1 : -1;
                if (fechaB === 0 && fechaA !== 0) return ordenDireccion === 'asc' ? -1 : 1;
                if (fechaA === 0 && fechaB === 0) return 0;
                
                return ordenDireccion === 'asc' ? fechaA - fechaB : fechaB - fechaA;
            } else if (ordenPor === 'monto') {
                return ordenDireccion === 'asc' ? a.amount - b.amount : b.amount - a.amount;
            } else if (ordenPor === 'descripcion') {
                return ordenDireccion === 'asc' 
                    ? a.description.localeCompare(b.description) 
                    : b.description.localeCompare(a.description);
            }
            return 0;
        });
        
        // Calcular totales
        totalIngresos = operacionesFiltradas
            .filter(op => op.type.toLowerCase() === 'ingreso')
            .reduce((sum, op) => sum + op.amount, 0);
            
        totalGastos = operacionesFiltradas
            .filter(op => op.type.toLowerCase() === 'egreso')
            .reduce((sum, op) => sum + op.amount, 0);
            
        saldo = totalIngresos - totalGastos;    }
    
    // Procesar datos del store de transacciones
    function procesarTransacciones(transaccionesDelStore: Transaction[]): void {
        // Mostrar datos recibidos para debug
        console.log('Datos recibidos del store:', transaccionesDelStore);
        
        if (transaccionesDelStore && transaccionesDelStore.length > 0) {
            // console.log('Muestra de tipos de transacciones:', 
            //     transaccionesDelStore.slice(0, 5).map(t => `${t.id}: ${t.type} (${typeof t.type})`));
                
            // Verificar si hay algún problema con los tipos de transacciones
            const problemasConTipos = transaccionesDelStore
                .filter(t => !t.type || (t.type.toLowerCase() !== 'ingreso' && t.type.toLowerCase() !== 'egreso'));
                
            if (problemasConTipos.length > 0) {
                // console.error(`Se encontraron ${problemasConTipos.length} transacciones con tipos problematicos:`, 
                //    problemasConTipos.map(t => `${t.id}: ${t.type}`));
            }
        }
        
        // Verificar que los datos sean válidos para evitar errores
        if (!Array.isArray(transaccionesDelStore)) {
            console.error('Datos recibidos no son un array:', transaccionesDelStore);
            return;
        }
        
        // Verificar fechas antes de iniciar el procesamiento
        const problemasConFechas = transaccionesDelStore.filter(t => {
            try {
                const dateObj = new Date(t.date);
                return isNaN(dateObj.getTime());
            } catch (e) {
                return true;
            }
        });
        
        if (problemasConFechas.length > 0) {
            console.error(`Se encontraron ${problemasConFechas.length} transacciones con fechas inválidas:`, 
                problemasConFechas.map(t => `${t.id}: ${t.date}`));
        }
        
        // Analizar distribución de fechas para detectar patrones
        const fechasDistribucion: Record<string, number> = {};
        const formatosDetectados: Record<string, number> = {
            'ISO': 0,
            'dd-MMM-yy': 0,
            'dd/mm/yyyy': 0,
            'otro': 0
        };
        
        transaccionesDelStore.forEach(t => {
            if (!t.date) return;
            
            // Contar ocurrencias de patrones de fecha específicos
            if (t.date.startsWith('9-Sep')) {
                fechasDistribucion['9-Sep'] = (fechasDistribucion['9-Sep'] || 0) + 1;
            } else if (t.date.startsWith('9-Oct')) {
                fechasDistribucion['9-Oct'] = (fechasDistribucion['9-Oct'] || 0) + 1;
            }
            
            // Detectar formato
            if (t.date.includes('T')) {
                formatosDetectados['ISO']++;
            } else if (t.date.includes('-') && /\d+-[A-Za-z]+-\d+/.test(t.date)) {
                formatosDetectados['dd-MMM-yy']++;
            } else if (t.date.includes('/')) {
                formatosDetectados['dd/mm/yyyy']++;
            } else {
                formatosDetectados['otro']++;
            }
            
            // Agregar el mes/año para visualizar distribución
            try {
                const timestamp = parseCustomDate(t.date);
                if (timestamp > 0) {
                    const fecha = new Date(timestamp);
                    const clave = `${fecha.getFullYear()}-${fecha.getMonth() + 1}`;
                    fechasDistribucion[clave] = (fechasDistribucion[clave] || 0) + 1;
                }
            } catch (e) {}
        });
        
        // Imprimir diagnóstico
        // console.log('Formatos de fecha detectados:', formatosDetectados);
        // console.log('Distribución de fechas:', fechasDistribucion);
        
        // Crear una copia para evitar modificar el store directamente
        // y asegurar que estén ordenadas por fecha descendente (más reciente primero)
        operaciones = [...transaccionesDelStore].sort((a: Operacion, b: Operacion): number => {
            try {
                const dateA = parseCustomDate(a.date);
                const dateB = parseCustomDate(b.date);
                
                // Verificar validez de las fechas y hacer debug
                if (isNaN(dateA) || dateA === 0) {
                    console.error('Fecha A inválida en ordenamiento inicial:', a.id, a.date, dateA);
                }
                if (isNaN(dateB) || dateB === 0) {
                    console.error('Fecha B inválida en ordenamiento inicial:', b.id, b.date, dateB);
                }
                
                // Mostrar algunos ejemplos de fechas (solo para debugging)
                if (Math.random() < 0.01) { // Mostrar aproximadamente 1% de las fechas para no sobrecargar la consola
                    // console.log(`Fecha ordenada: ${a.date} -> ${new Date(dateA).toISOString()}`);
                }
                
                return dateB - dateA; // Orden descendente por fecha
            } catch (error) {
                console.error('Error al ordenar fechas:', error, { a: a.date, b: b.date });
                return 0;
            }
        });

        // Extraer cuentas y ubicaciones únicas para los filtros
        const cuentasSet = new Set<string>();
        const ubicacionesSet = new Set<string>();
        
        operaciones.forEach(op => {
            if (op.cuenta) cuentasSet.add(op.cuenta);
            if (op.location) ubicacionesSet.add(op.location);
        });
        
        cuentasUnicas = Array.from(cuentasSet).sort();
        ubicaciones = Array.from(ubicacionesSet).sort();
        
        // console.log('Cuentas detectadas:', cuentasUnicas);
        // console.log('Ubicaciones detectadas:', ubicaciones);
        
        // Aplicar filtros iniciales
        filtrarOperaciones();
        
        // Marcar datos como cargados
        datosCargadosInicialmente = true;
    }
    
    // Cambiar ordenación
    function cambiarOrden(campo: string): void {
        if (ordenPor === campo) {
            // Si ya estamos ordenando por este campo, cambiar dirección
            ordenDireccion = ordenDireccion === 'asc' ? 'desc' : 'asc';
        } else {
            // Nuevo campo de ordenación
            ordenPor = campo;
            // Para fecha, ordenar descendente por defecto, para otros ascendente
            ordenDireccion = campo === 'fecha' ? 'desc' : 'asc';
        }
        
        filtrarOperaciones();
    }

  // En Operaciones.svelte
  function handleRowDoubleClick(operation: Operacion): void {
      editingOperation = operation;
      modalTypeToShow = operation.type.toLowerCase() === 'ingreso' ? 'income' : 'expense';
  }
  

    function handleModalClose(): void {
        modalTypeToShow = null;
        editingOperation = null; // Limpiar la operación en edición al cerrar
    }
    // Crear una combinación de todos los filtros para optimizar la reactividad
    $: filtrosCombinados = { 
        tipo: filtroTipo, 
        cuenta: filtroCuenta, 
        ubicacion: filtroUbicacion, 
        busqueda: filtroBusqueda, 
        fechaDesde: filtroFechaDesde, 
        fechaHasta: filtroFechaHasta,
        orden: ordenPor,
        direccion: ordenDireccion
    };

    // Borrar transacción
    async function handleDeleteOperation(op: Operacion) {
        if (confirm('¿Seguro que deseas borrar esta transacción?')) {
            try {
                await removeTransaction(op.id);
                alert('Transacción eliminada');
            } catch (e) {
                alert('Error al eliminar: ' + e);
            }
        }
    }
    
    // Usar debounce para la búsqueda por texto para evitar procesamiento excesivo
    let debounceTimer: number | null = null;
    $: {
        if (datosCargadosInicialmente) {
            // Cancelar temporizador anterior si existe
            if (debounceTimer !== null) {
                clearTimeout(debounceTimer);
            }
            
            // Si es un cambio en la búsqueda por texto, usar debounce
            if (filtroBusqueda !== undefined) {
                debounceTimer = setTimeout(() => {
                    filtrarOperaciones();
                    debounceTimer = null;
                }, 300) as unknown as number;
            } else {
                // Para otros filtros, aplicar inmediatamente
                filtrarOperaciones();
            }
        }
    }
      // Variables para scroll infinito
    let tablaContainer: HTMLDivElement;
    let scrollLoadingThreshold = 200; // píxeles desde el fondo para cargar más
    let loadingMoreData = false; // Estado local para evitar múltiples cargas
      // Manejar el evento de scroll para cargar más datos cuando se acerca al final
    function handleScroll() {
        if ($isLoadingMore || !$hasMoreData || loadingMoreData) return;
        
        const { scrollTop, scrollHeight, clientHeight } = tablaContainer;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        
        if (distanceFromBottom < scrollLoadingThreshold) {
            loadingMoreData = true;
            loadMoreTransactions().then(() => {
                loadingMoreData = false;
            }).catch(error => {
                console.error('Error al cargar más transacciones:', error);
                loadingMoreData = false;
            });
        }
    }
    
    // Optimizar la renderización evitando múltiples actualizaciones durante el scrolling
    let scrollTimer: number | null = null;
    function optimizedHandleScroll() {
        if (scrollTimer !== null) {
            clearTimeout(scrollTimer);
        }
        scrollTimer = setTimeout(() => {
            handleScroll();
            scrollTimer = null;
        }, 100) as unknown as number;
    }
    
    // Suscribirse al store de transacciones y cargar datos iniciales
    onMount(() => {
        // Cargar la primera página de datos
        loadFirstPage();
        
        // Suscribirse a las actualizaciones del store
        const unsubscribe = transactions.subscribe(procesarTransacciones);
        
        return () => {
            // Limpiar temporizador y desuscribirse al desmontar
            if (scrollTimer !== null) {
                clearTimeout(scrollTimer);
            }
            unsubscribe();
        };
    });
</script>

{#if modalTypeToShow === 'income'}
    <SimpleIncomeModal 
        show={true} 
        initialData={editingOperation} 
        on:close={handleModalClose} 
    />
{:else if modalTypeToShow === 'expense'}
    <SimpleExpenseModal 
        show={true} 
        initialData={editingOperation} 
        on:close={handleModalClose} 
    />
{/if}

<div class="operaciones-container">
    <div class="header-container">
        <h2>Operaciones</h2>
        <div class="actions-container">
            <ActionButton 
                text="Corregir fechas" 
                icon="🔧"
                action={async () => {
                    if (confirm('¿Estás seguro de que deseas corregir las fechas de todas las transacciones? Este proceso puede tardar unos minutos.')) {
                        try {
                            // console.log('Iniciando corrección de fechas...');
                            await fixDateFormatsInTransactions();
                            alert('Corrección de fechas completada.');
                        } catch (error) {
                            console.error('Error al corregir fechas:', error);
                            alert('Error al corregir fechas: ' + error);
                        }
                    }                }}
                variant="secondary"
            />
            <ActionButton 
                text="Actualizar datos" 
                icon="↻"
                action={forceRefreshData}
                loading={$refreshing}
                variant="secondary"
            />
        </div>
    </div>
    
    <!-- Panel de filtros -->
    <div class="filtros-panel">
        <div class="filtro-grupo">
            <label for="filtroTipo">Tipo:</label>
            <select id="filtroTipo" bind:value={filtroTipo}>
                <option value="todos">Todos</option>
                <option value="ingreso">Ingresos</option>
                <option value="egreso">Egresos</option>
            </select>
        </div>
        
        <div class="filtro-grupo">
            <label for="filtroCuenta">Cuenta:</label>
            <select id="filtroCuenta" bind:value={filtroCuenta}>
                <option value="todas">Todas</option>
                {#each cuentasUnicas as cuenta}
                    <option value={cuenta}>{cuenta.charAt(0).toUpperCase() + cuenta.slice(1)}</option>
                {/each}
            </select>
        </div>
        
        <div class="filtro-grupo">
            <label for="filtroUbicacion">Ubicación:</label>
            <select id="filtroUbicacion" bind:value={filtroUbicacion}>
                <option value="todas">Todas</option>
                {#each ubicaciones as ubicacion}
                    <option value={ubicacion}>{ubicacion}</option>
                {/each}
            </select>
        </div>
        
        <div class="filtro-fecha">
            <div class="filtro-grupo">
                <label for="filtroFechaDesde">Desde:</label>
                <input 
                    type="date" 
                    id="filtroFechaDesde" 
                    bind:value={filtroFechaDesde}
                >
            </div>
            
            <div class="filtro-grupo">
                <label for="filtroFechaHasta">Hasta:</label>
                <input 
                    type="date" 
                    id="filtroFechaHasta" 
                    bind:value={filtroFechaHasta}
                >
            </div>
        </div>
          <div class="filtro-busqueda">
            <label for="filtroBusqueda" class="visually-hidden">Buscar transacciones</label>
            <input 
                type="text" 
                id="filtroBusqueda"
                placeholder="Buscar..."
                bind:value={filtroBusqueda}
                aria-label="Buscar transacciones"
            >
        </div>
    </div>
    
    <!-- Resumen financiero -->
    <div class="resumen-financiero">
        <div class="resumen-item ingresos">
            <span>Ingresos</span>
            <strong>{formatCurrency(totalIngresos)}</strong>
        </div>
        
        <div class="resumen-item gastos">
            <span>Gastos</span>
            <strong>{formatCurrency(totalGastos)}</strong>
        </div>
        
        <div class="resumen-item saldo" class:negativo={saldo < 0}>
            <span>Saldo</span>
            <strong>{formatCurrency(saldo)}</strong>
        </div>    </div>
    
    <!-- Nota eliminada: ahora scroll infinito real -->
      <!-- Tabla de operaciones con scroll infinito -->
    {#if !$isInitialDataLoaded && operacionesFiltradas.length === 0}
        <div class="cargando">Cargando datos...</div>
    {:else if $isInitialDataLoaded && operacionesFiltradas.length === 0}
        <div class="sin-datos">
            No se encontraron operaciones con los filtros seleccionados.
        </div>
    {:else}
        <div 
            class="tabla-operaciones" 
            bind:this={tablaContainer} 
            on:scroll={optimizedHandleScroll}
        >
            <table>
                <thead>
                    <tr>
                        <th on:click={() => cambiarOrden('fecha')} class:activo={ordenPor === 'fecha'}>
                            Fecha {ordenPor === 'fecha' && (ordenDireccion === 'asc' ? '▲' : '▼')}
                        </th>
                        <th on:click={() => cambiarOrden('descripcion')} class:activo={ordenPor === 'descripcion'}>
                            Descripción {ordenPor === 'descripcion' && (ordenDireccion === 'asc' ? '▲' : '▼')}
                        </th>
                        <th>Cuenta</th>
                        <th>Ubicación</th>
                        <th on:click={() => cambiarOrden('monto')} class:activo={ordenPor === 'monto'}>
                            Monto {ordenPor === 'monto' && (ordenDireccion === 'asc' ? '▲' : '▼')}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {#each operacionesFiltradas as op}
                        <tr 
                            class:ingreso={op.type.toLowerCase() === 'ingreso'} 
                            class:egreso={op.type.toLowerCase() === 'egreso'} 
                            on:dblclick={() => handleRowDoubleClick(op)} 
                            style="cursor: pointer;">
                            <td>{formatearFecha(op.date)}</td>
                            <td class="descripcion-celda">
                                <div class="descripcion-contenido">
                                    <span>{op.description}</span>
                                    {#if op.notes}
                                        <div class="notas">{op.notes}</div>
                                    {/if}
                                    {#if op.invoice}
                                        <div class="factura">Ref: {op.invoice}</div>
                                    {/if}
                                </div>
                            </td>
                            <td>
                                {op.type.toLowerCase() === 'ingreso' ? 'Ingreso' : op.cuenta ? op.cuenta.charAt(0).toUpperCase() + op.cuenta.slice(1) : '-'}
                            </td>
                            <td>{op.location || '-'}</td>
                            <td class="monto-celda">
                                <span class={op.type}>
                                     {op.type.toLowerCase() === 'ingreso' ? '+' : '-'}{formatCurrency(op.amount)}
                                </span>
                                {#if op.paymentMethod}
                                    <div class="metodo-pago">{op.paymentMethod}</div>
                                {/if}
                                <button class="delete-btn" title="Borrar transacción" on:click|stopPropagation={() => handleDeleteOperation(op)}>🗑️</button>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
            
            {#if $isLoadingMore}
                <div class="cargando-mas">
                    <div class="spinner"></div>
                    <span>Cargando más transacciones...</span>
                </div>
            {/if}
            
            {#if !$hasMoreData && operacionesFiltradas.length > 0}
                <div class="sin-mas-datos">
                    No hay más transacciones para cargar
                </div>
            {/if}
        </div>
    {/if}
</div>

<style>
    .operaciones-container {
        background-color: white;
        border-radius: 10px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        padding: 1.5rem;
        margin-bottom: 2rem;
    }    .header-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
    }
    
    .actions-container {
        display: flex;
        gap: 0.5rem;
    }
    
    h2 {
        margin-top: 0;
        margin-bottom: 0;
        color: #333;
        font-size: 1.8rem;
    }
    
    .filtros-panel {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        margin-bottom: 1.5rem;
        background-color: #f9f9f9;
        padding: 1rem;
        border-radius: 8px;
    }
    
    .filtro-grupo {
        display: flex;
        flex-direction: column;
        min-width: 120px;
    }
    
    .filtro-grupo label {
        font-size: 0.85rem;
        margin-bottom: 0.3rem;
        color: #666;
    }
    
    .filtro-grupo select,
    .filtro-grupo input,
    .filtro-busqueda input {
        padding: 0.5rem;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 0.9rem;
    }
    
    .filtro-fecha {
        display: flex;
        gap: 0.5rem;
    }
    
    .filtro-busqueda {
        flex-grow: 1;
    }
    
    .filtro-busqueda input {
        width: 100%;
    }
    
    .resumen-financiero {
        display: flex;
        gap: 1.5rem;
        margin-bottom: 1.5rem;
        padding: 1rem;
        background-color: #f5f5f5;
        border-radius: 8px;
    }
    
    .resumen-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        min-width: 120px;
    }
    
    .resumen-item span {
        font-size: 0.9rem;
        color: #666;
    }
    
    .resumen-item strong {
        font-size: 1.3rem;
        margin-top: 0.3rem;
    }
    
    .ingresos {
        background-color: rgba(76, 175, 80, 0.1);
    }
    
    .ingresos strong {
        color: #4CAF50;
    }
    
    .gastos {
        background-color: rgba(244, 67, 54, 0.1);
    }
    
    .gastos strong {
        color: #F44336;
    }
    
    .saldo {
        background-color: rgba(33, 150, 243, 0.1);
    }
    
    .saldo strong {
        color: #2196F3;
    }
    
    .saldo.negativo strong {
        color: #F44336;
    }
    
    .tabla-operaciones {
        overflow-x: auto; /* Mantenemos el scroll horizontal si es necesario para la tabla */
        max-height: 700px; /* Define una altura máxima, ajusta este valor según tus necesidades */
        overflow-y: auto !important; /* Agrega scroll vertical cuando el contenido excede max-height */
        display: block; /* Asegurarse que el div es un bloque para que funcione el scrolling */
    }
    
    table {
        width: 100%;
        border-collapse: collapse;
    }
    
    th, td {
        padding: 0.8rem;
        text-align: left;
        border-bottom: 1px solid #eee;
    }
    
    th {
        background-color: #f5f5f5;
        font-weight: 600;
        color: #444;
        cursor: pointer;
        user-select: none;
    }
    
    th.activo {
        background-color: #e9e9e9;
    }
    
    tbody tr:hover {
        background-color: #f9f9f9;
    }
    
    .descripcion-celda {
        max-width: 300px;
    }
    
    .descripcion-contenido {
        display: flex;
        flex-direction: column;
    }
    
    .notas, .factura {
        font-size: 0.8rem;
        color: #777;
        margin-top: 0.3rem;
    }
    
    .factura {
        font-style: italic;
    }
    
    .monto-celda {
        font-weight: 500;
        position: relative;
    }

    .delete-btn {
        background: none;
        border: none;
        color: #F44336;
        font-size: 1.2rem;
        cursor: pointer;
        margin-left: 0.5rem;
        transition: color 0.2s;
        position: absolute;
        right: 0.5rem;
        top: 50%;
        transform: translateY(-50%);
        opacity: 0.7;
    }
    .delete-btn:hover {
        color: #b71c1c;
        opacity: 1;
    }
    
    .metodo-pago {
        font-size: 0.8rem;
        color: #777;
        margin-top: 0.3rem;
    }
    
    .ingreso {
        border-left: 3px solid #4CAF50;
    }
    
    .egreso { /* Cambiado de gasto a egreso */
        border-left: 3px solid #F44336;
    }
    
    .ingreso .ingreso {
        color: #4CAF50;
    }
    /* Estilo para montos de egreso */
    .egreso .egreso, .egreso span[class*="egreso"] { /* Asegurar que el monto de egreso también se coloree */
        color: #F44336;
    }
      .cargando, .error, .sin-datos {
        padding: 2rem;
        text-align: center;
        background-color: #f9f9f9;
        border-radius: 8px;
        margin: 1rem 0;
    }
    
    .nota-datos-limitados {
        background-color: rgba(255, 193, 7, 0.15);
        border-left: 4px solid #ffc107;
        padding: 0.8rem 1rem;
        margin: 1rem 0;
        border-radius: 4px;
        font-size: 0.9rem;
        color: #856404;
    }
    
    /* Los estilos del botón se han movido al componente ActionButton.svelte */
    
    /* Estilos para carga infinita */
    .cargando-mas {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        background-color: #f5f5f5;
        margin-top: 0.5rem;
        border-radius: 4px;
    }
    
    .spinner {
        width: 20px;
        height: 20px;
        border: 2px solid rgba(0, 0, 0, 0.1);
        border-top-color: #2196F3;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-right: 10px;
    }
    
    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
      .sin-mas-datos {
        text-align: center;
        padding: 1rem;
        color: #666;
        font-style: italic;
        background-color: #f9f9f9;
        margin-top: 0.5rem;
        border-radius: 4px;
    }
    
    .visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
    }
</style>
