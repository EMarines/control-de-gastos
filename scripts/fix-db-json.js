// // Script para corregir el formato del archivo db.json
// const fs = require('fs');
// const path = require('path');

// // Ruta al archivo db.json
// const dbJsonPath = path.join(__dirname, '..', 'src', 'lib', 'data', 'db.json');
// const outputPath = path.join(__dirname, '..', 'src', 'lib', 'data', 'db-fixed.json');
// const logPath = path.join(__dirname, '..', 'db-fix-log.txt');

// // Función para registrar mensajes
// function log(message) {
//   console.log(message);
//   fs.appendFileSync(logPath, message + '\n');
// }

// // Limpiar el archivo de log anterior si existe
// if (fs.existsSync(logPath)) {
//   fs.unlinkSync(logPath);
// }

// log(`Leyendo archivo: ${dbJsonPath}`);

// try {
//   // Leer el contenido del archivo
//   let content = fs.readFileSync(dbJsonPath, 'utf8');
//   log(`Tamaño original del archivo: ${content.length} bytes`);
  
//   // Eliminar comentarios de una línea (// comentario)
//   content = content.replace(/\/\/.*$/gm, '');
  
//   // Eliminar comentarios multilínea (/* comentario */)
//   content = content.replace(/\/\*[\s\S]*?\*\//g, '');
  
//   // Eliminar líneas en blanco
//   content = content.replace(/^\s*[\r\n]/gm, '');
  
//   log(`Tamaño después de limpiar: ${content.length} bytes`);
//   log('Contenido limpiado, verificando JSON...');
  
//   // Asegurarse de que el contenido comienza con [ y termina con ]
//   if (!content.trim().startsWith('[') || !content.trim().endsWith(']')) {
//     log('Advertencia: El contenido no parece ser un array JSON válido');
    
//     // Verificar las primeras líneas para diagnóstico
//     const firstLines = content.split('\n').slice(0, 5).join('\n');
//     log(`Primeras líneas del contenido:\n${firstLines}`);
    
//     // Verificar las últimas líneas
//     const lastLines = content.split('\n').slice(-5).join('\n');
//     log(`Últimas líneas del contenido:\n${lastLines}`);
//   }
  
//   // Intentar parsear el JSON para validarlo
//   try {
//     const jsonData = JSON.parse(content);
//     log(`JSON válido con ${jsonData.length} elementos.`);
    
//     // Guardar el contenido limpio en un nuevo archivo
//     fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2));
//     log(`Archivo JSON corregido guardado en: ${outputPath}`);
    
//     // Crear una versión reducida para pruebas si el archivo es muy grande
//     if (jsonData.length > 100) {
//       const reducedData = jsonData.slice(0, 100); // Tomar solo los primeros 100 elementos
//       fs.writeFileSync(
//         outputPath.replace('.json', '-reduced.json'), 
//         JSON.stringify(reducedData, null, 2)
//       );
//       log(`Versión reducida (100 elementos) guardada en: ${outputPath.replace('.json', '-reduced.json')}`);
//     }
    
//   } catch (parseError) {
//     log('Error al parsear el JSON: ' + parseError.message);
    
//     // Obtener información sobre la posición del error
//     if (parseError.message.includes('position')) {
//       const posMatch = parseError.message.match(/position (\d+)/);
//       if (posMatch && posMatch[1]) {
//         const errorPos = parseInt(posMatch[1]);
//         const errorContext = content.substring(
//           Math.max(0, errorPos - 50),
//           Math.min(content.length, errorPos + 50)
//         );
//         log(`Contexto del error en posición ${errorPos}:\n${errorContext}`);
//       }
//     }
    
//     // Si falla el parsing, guardar el contenido pre-procesado para revisión manual
//     fs.writeFileSync(outputPath + '.txt', content);
//     log(`Contenido pre-procesado guardado en: ${outputPath}.txt para revisión manual`);
//   }
  
// } catch (error) {
//   log('Error al procesar el archivo: ' + error.message);
// }
