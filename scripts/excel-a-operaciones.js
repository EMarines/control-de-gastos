// /**
//  * Script para extraer los datos de la hoja "Datos" del archivo Excel 
//  * y convertirlos a JSON para la aplicación de control de gastos
//  */

// const XLSX = require('xlsx');
// const fs = require('fs');
// const path = require('path');

// // Ruta del archivo Excel (parámetro opcional o ruta predeterminada)
// const excelFilePath = process.argv[2] || "C:\\Users\\Propietario\\OneDrive\\AB GrupoUrbania\\OneDrive\\AB GrupoUrbania\\Documents\\Relacion Ingresos Egresos.xlsm";

// // Ruta de destino para el archivo JSON
// const outputPath = path.join("c:\\Users\\Propietario\\OneDrive\\AB GrupoUrbania\\OneDrive\\Escritorio\\Web Projects\\Control de gastos", "src", "lib", "data", "operaciones", "datos.json");

// // Mostrar ruta del archivo Excel para verificación
// console.log(`Usando archivo Excel en: ${excelFilePath}`);
// console.log(`El resultado se guardará en: ${outputPath}`);

// // Función para convertir Excel a JSON
// function convertirExcelAJson() {
//     try {
//         console.log("Iniciando la conversión específica de la hoja 'Datos' a JSON...");
        
//         // Leer el archivo Excel
//         const workbook = XLSX.readFile(excelFilePath);
        
//         // Verificar si existe la hoja "Datos"
//         if (!workbook.SheetNames.includes("Datos")) {
//             console.error("Error: No se encontró la hoja 'Datos' en el archivo Excel.");
//             console.log("Hojas disponibles:", workbook.SheetNames.join(", "));
//             return;
//         }
        
//         // Obtener la hoja "Datos"
//         const sheet = workbook.Sheets["Datos"];
//         const jsonData = XLSX.utils.sheet_to_json(sheet);
        
//         if (jsonData.length === 0) {
//             console.error("Error: La hoja 'Datos' no contiene información.");
//             return;
//         }
        
//         console.log(`Se encontraron ${jsonData.length} registros en la hoja 'Datos'.`);
        
//         // Analizar las columnas para mapearlas al formato requerido por la aplicación
//         const primeraFila = jsonData[0];
//         const columnas = Object.keys(primeraFila);
        
//         console.log("Columnas encontradas:", columnas.join(", "));
        
//         // Transformar los datos al formato esperado por la aplicación
//         const transacciones = jsonData.map((fila, indice) => {
//             // Intentar determinar los nombres de las columnas relevantes
//             let columnaFecha, columnaDescripcion, columnaMonto, columnaCategoria, columnaTipo;
//             let columnaUbicacion, columnaMetodoPago, columnaFactura, columnaNotas;
            
//             // Asignar columnas según los nombres detectados
//             for (const col of columnas) {
//                 const colLower = col.toLowerCase();
                
//                 if (colLower.includes("fecha")) {
//                     columnaFecha = col;
//                 } else if (colLower.includes("descrip") || colLower.includes("concepto") || 
//                           colLower.includes("empresa") || colLower.includes("proveedor")) {
//                     columnaDescripcion = col;
//                 } else if (colLower.includes("monto") || colLower.includes("importe") || 
//                           colLower.includes("valor") || colLower.includes("cantidad")) {
//                     columnaMonto = col;
//                 } else if (colLower.includes("categ") || colLower.includes("tipo gasto")) {
//                     columnaCategoria = col;
//                 } else if (colLower.includes("tipo") && !colLower.includes("gasto")) {
//                     columnaTipo = col;
//                 } else if (colLower.includes("ubica") || colLower.includes("direcc") || 
//                           colLower.includes("local")) {
//                     columnaUbicacion = col;
//                 } else if (colLower.includes("pago") || colLower.includes("metodo")) {
//                     columnaMetodoPago = col;
//                 } else if (colLower.includes("factura") || colLower.includes("refer")) {
//                     columnaFactura = col;
//                 } else if (colLower.includes("nota") || colLower.includes("observ")) {
//                     columnaNotas = col;
//                 }
//             }
            
//             // Función para formatear la fecha en ISO
//             const formatearFecha = (valorFecha) => {
//                 if (!valorFecha) return new Date().toISOString();
                
//                 try {
//                     // Si es un número, es un código de fecha de Excel
//                     if (typeof valorFecha === 'number') {
//                         // Excel cuenta días desde el 1 de enero de 1900
//                         const fechaExcel = new Date(Date.UTC(1900, 0, valorFecha - 1));
//                         return fechaExcel.toISOString();
//                     } 
//                     // Si es un objeto Date
//                     else if (valorFecha instanceof Date) {
//                         return valorFecha.toISOString();
//                     } 
//                     // Si es una cadena, intentar convertir
//                     else {
//                         // Intentar varios formatos comunes en español
//                         const fecha = new Date(valorFecha);
//                         if (!isNaN(fecha)) {
//                             return fecha.toISOString();
//                         }
                        
//                         // Intentar formato DD/MM/YYYY
//                         const partes = valorFecha.split(/[\/\-\.]/);
//                         if (partes.length === 3) {
//                             const fecha = new Date(
//                                 parseInt(partes[2]), // año
//                                 parseInt(partes[1]) - 1, // mes (0-11)
//                                 parseInt(partes[0]) // día
//                             );
//                             if (!isNaN(fecha)) {
//                                 return fecha.toISOString();
//                             }
//                         }
//                     }
//                 } catch (e) {
//                     console.warn(`Advertencia: No se pudo convertir la fecha "${valorFecha}" para el registro ${indice + 1}`);
//                 }
                
//                 return new Date().toISOString(); // Fecha actual como respaldo
//             };
            
//             // Determinar el tipo de transacción (ingreso/gasto)
//             const determinarTipo = () => {
//                 if (columnaTipo && fila[columnaTipo]) {
//                     const tipoValor = String(fila[columnaTipo]).toLowerCase();
//                     if (tipoValor.includes("ingreso") || tipoValor.includes("entrada")) {
//                         return "ingreso";
//                     }
//                 }
                
//                 // Si hay un monto negativo, es un gasto
//                 if (columnaMonto && fila[columnaMonto] < 0) {
//                     return "gasto";
//                 }
                
//                 // Por defecto asumimos gasto
//                 return "gasto";
//             };
            
//             // Determinar la categoría
//             const determinarCategoria = () => {
//                 if (!columnaCategoria || !fila[columnaCategoria]) return "otro";
                
//                 const categoriaValor = String(fila[columnaCategoria]).toLowerCase();
                
//                 if (categoriaValor.includes("hogar") || categoriaValor.includes("casa")) {
//                     return "hogar";
//                 } else if (categoriaValor.includes("comida") || categoriaValor.includes("aliment")) {
//                     return "comida";
//                 } else if (categoriaValor.includes("trans") || categoriaValor.includes("viaje")) {
//                     return "transporte";
//                 } else if (categoriaValor.includes("entret") || categoriaValor.includes("ocio")) {
//                     return "entretenimiento";
//                 } else if (categoriaValor.includes("salud") || categoriaValor.includes("medic")) {
//                     return "salud";
//                 } else if (categoriaValor.includes("educ") || categoriaValor.includes("estud")) {
//                     return "educacion";
//                 }
                
//                 return "otro";
//             };
            
//             // Obtener el monto (siempre positivo)
//             const obtenerMonto = () => {
//                 if (!columnaMonto || !fila[columnaMonto]) return 0;
                
//                 let monto = 0;
                
//                 if (typeof fila[columnaMonto] === 'number') {
//                     monto = Math.abs(fila[columnaMonto]);
//                 } else {
//                     // Limpieza de formato (eliminar símbolos de moneda, etc.)
//                     const montoStr = String(fila[columnaMonto])
//                         .replace(/[€$,\s]/g, '')
//                         .trim();
//                     monto = Math.abs(parseFloat(montoStr) || 0);
//                 }
                
//                 return monto;
//             };
            
//             // Crear objeto de transacción conforme a nuestro modelo
//             return {
//                 id: `importado-${Date.now()}-${indice}`,
//                 description: fila[columnaDescripcion] || "Sin descripción",
//                 amount: obtenerMonto(),
//                 date: formatearFecha(fila[columnaFecha]),
//                 type: determinarTipo(),
//                 category: determinarCategoria(),
                
//                 // Campos opcionales
//                 merchant: "", // No tenemos equivalente directo
//                 location: fila[columnaUbicacion] || "Casa", // Por defecto "Casa"
//                 paymentMethod: fila[columnaMetodoPago] || "",
//                 invoice: fila[columnaFactura] || "",
//                 tags: "", // No tenemos equivalente directo
//                 notes: fila[columnaNotas] || "",
//                 receiptNumber: "", // No tenemos equivalente directo
//                 businessPurpose: "" // No tenemos equivalente directo
//             };
//         });
        
//         // Asegurarnos que el directorio existe
//         const dirPath = path.dirname(outputPath);
//         if (!fs.existsSync(dirPath)) {
//             fs.mkdirSync(dirPath, { recursive: true });
//             console.log(`Creado el directorio: ${dirPath}`);
//         }
        
//         // Guardar el JSON formateado
//         fs.writeFileSync(outputPath, JSON.stringify(transacciones, null, 2));
        
//         console.log(`Conversión completa: ${transacciones.length} transacciones guardadas en ${outputPath}`);
        
//         // Mostrar una muestra de los datos
//         if (transacciones.length > 0) {
//             console.log("\nMuestra de la primera transacción convertida:");
//             console.log(JSON.stringify(transacciones[0], null, 2));
//         }
//     } catch (error) {
//         console.error("Error al procesar el archivo Excel:", error);
//     }
// }

// // Ejecutar la función
// convertirExcelAJson();
