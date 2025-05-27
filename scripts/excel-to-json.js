// // Importar librería xlsx para leer archivos Excel
// const XLSX = require('xlsx');
// const fs = require('fs');
// const path = require('path');

// // Ruta del archivo Excel
// const excelFilePath = "C:\\Users\\Propietario\\OneDrive\\AB GrupoUrbania\\OneDrive\\AB GrupoUrbania\\Documents\\Relacion Ingresos Egresos.xlsm";

// // Función para convertir el archivo Excel a JSON
// function convertExcelToJson() {
//     try {
//         console.log("Iniciando la conversión del archivo Excel a JSON...");
//         // Leer el archivo Excel
//         const workbook = XLSX.readFile(excelFilePath);
        
//         // Obtener la lista de hojas
//         const sheetNames = workbook.SheetNames;
//         console.log(`Hojas encontradas: ${sheetNames.join(', ')}`);
        
//         // Objeto para almacenar todas las transacciones
//         const allTransactions = [];
//         let id = 1; // ID para cada transacción
        
//         // Procesamos cada hoja que podría contener transacciones
//         for (const sheetName of sheetNames) {
//             // Ignorar hojas que podrían ser de resumen o configuración
//             if (sheetName.toLowerCase().includes('resumen') || 
//                 sheetName.toLowerCase().includes('config') ||
//                 sheetName.toLowerCase().includes('instrucciones')) {
//                 console.log(`Saltando hoja: ${sheetName} (parece ser de resumen o configuración)`);
//                 continue;
//             }
            
//             console.log(`Procesando hoja: ${sheetName}`);
            
//             // Convertir la hoja a JSON
//             const sheet = workbook.Sheets[sheetName];
//             const jsonData = XLSX.utils.sheet_to_json(sheet);
            
//             if (jsonData.length === 0) {
//                 console.log(`La hoja ${sheetName} no contiene datos`);
//                 continue;
//             }
            
//             // Analizar la primera fila para detectar las columnas
//             const firstRow = jsonData[0];
//             const columns = Object.keys(firstRow);
            
//             console.log(`Columnas detectadas: ${columns.join(', ')}`);
            
//             // Mapear columnas a nuestro esquema de transacciones
//             let dateColumn, descriptionColumn, amountColumn, categoryColumn;
            
//             // Buscar columnas por nombres comunes en español
//             for (const col of columns) {
//                 const colLower = col.toLowerCase();
                
//                 if (colLower.includes('fecha')) {
//                     dateColumn = col;
//                 } else if (colLower.includes('descripción') || colLower.includes('descripcion') || 
//                           colLower.includes('concepto') || colLower.includes('detalle') ||
//                           colLower.includes('empresa') || colLower.includes('proveedor')) {
//                     descriptionColumn = col;
//                 } else if (colLower.includes('monto') || colLower.includes('importe') || 
//                           colLower.includes('valor') || colLower.includes('cantidad')) {
//                     amountColumn = col;
//                 } else if (colLower.includes('categoría') || colLower.includes('categoria') || 
//                           colLower.includes('tipo') || colLower.includes('cuenta')) {
//                     categoryColumn = col;
//                 }
//             }
            
//             console.log(`Columnas mapeadas - Fecha: ${dateColumn}, Descripción: ${descriptionColumn}, Monto: ${amountColumn}, Categoría: ${categoryColumn}`);
            
//             // Procesar cada fila y convertirla al formato de nuestra aplicación
//             for (const row of jsonData) {
//                 // Validar que tengamos al menos descripción y monto
//                 if (!row[descriptionColumn] || !row[amountColumn]) {
//                     continue; // Saltar filas sin datos esenciales
//                 }
                
//                 // Determinar si es ingreso o gasto basado en el valor o categoría
//                 let type = 'gasto'; // Por defecto asumimos que es gasto
//                 let amount = parseFloat(row[amountColumn]);
                
//                 if (amount < 0) {
//                     amount = Math.abs(amount); // Convertir a positivo
//                 } else if (categoryColumn && row[categoryColumn] && 
//                           (row[categoryColumn].toLowerCase().includes('ingreso') || 
//                            row[categoryColumn].toLowerCase().includes('entrada'))) {
//                     type = 'ingreso';
//                 }
                
//                 // Mapear categoría a uno de nuestros tipos definidos
//                 let category = 'otro';
                
//                 if (categoryColumn && row[categoryColumn]) {
//                     const catLower = row[categoryColumn].toLowerCase();
                    
//                     if (catLower.includes('hogar') || catLower.includes('casa')) {
//                         category = 'hogar';
//                     } else if (catLower.includes('comida') || catLower.includes('alimento')) {
//                         category = 'comida';
//                     } else if (catLower.includes('transporte') || catLower.includes('viaje')) {
//                         category = 'transporte';
//                     } else if (catLower.includes('entretenimiento') || catLower.includes('ocio')) {
//                         category = 'entretenimiento';
//                     } else if (catLower.includes('salud') || catLower.includes('médico') || catLower.includes('medico')) {
//                         category = 'salud';
//                     } else if (catLower.includes('educación') || catLower.includes('educacion') || catLower.includes('estudio')) {
//                         category = 'educacion';
//                     }
//                 }
                
//                 // Convertir fecha al formato ISO
//                 let dateISO;
//                 if (row[dateColumn]) {
//                     // Intentar convertir desde formato de Excel
//                     if (typeof row[dateColumn] === 'number') {
//                         // Es un número serial de Excel
//                         const excelDate = XLSX.SSF.parse_date_code(row[dateColumn]);
//                         dateISO = new Date(excelDate.y, excelDate.m - 1, excelDate.d).toISOString();
//                     } else {
//                         // Intentar parsear directamente
//                         try {
//                             dateISO = new Date(row[dateColumn]).toISOString();
//                         } catch (e) {
//                             dateISO = new Date().toISOString(); // Usar fecha actual si hay error
//                         }
//                     }
//                 } else {
//                     dateISO = new Date().toISOString(); // Fecha por defecto
//                 }
                
//                 // Crear objeto de transacción
//                 const transaction = {
//                     id: id.toString(),
//                     description: row[descriptionColumn],
//                     amount: amount,
//                     date: dateISO,
//                     type: type,
//                     category: category,
                    
//                     // Campos adicionales si existen en el Excel
//                     merchant: row['Subcuenta'] || row['Comercio'] || '',
//                     location: row['Dirección'] || row['Ubicación'] || row['Opciones'] || 'Casa',
//                     paymentMethod: row['Pagado con'] || row['Método de pago'] || '',
//                     invoice: row['Referencia'] || row['Factura'] || '',
//                     tags: row['Etiquetas'] || '',
//                     notes: row['Notas'] || '',
//                     receiptNumber: row['Número de recibo'] || '',
//                     businessPurpose: row['Pagado por'] || ''
//                 };
                
//                 allTransactions.push(transaction);
//                 id++;
//             }
//         }
        
//         console.log(`Total de transacciones procesadas: ${allTransactions.length}`);
        
//         // Guardar el resultado en un archivo JSON
//         const outputPath = path.join("c:\\Users\\Propietario\\OneDrive\\AB GrupoUrbania\\OneDrive\\Escritorio\\Web Projects\\Control de gastos", "src", "lib", "data", "transactions.json");
        
//         // Asegurarnos que el directorio exista
//         const dirPath = path.dirname(outputPath);
//         if (!fs.existsSync(dirPath)) {
//             fs.mkdirSync(dirPath, { recursive: true });
//         }
        
//         // Escribir el archivo JSON
//         fs.writeFileSync(outputPath, JSON.stringify(allTransactions, null, 2));
        
//         console.log(`Archivo JSON guardado en: ${outputPath}`);
//     } catch (error) {
//         console.error('Error al convertir el archivo Excel a JSON:', error);
//     }
// }

// // Ejecutar la función
// convertExcelToJson();
