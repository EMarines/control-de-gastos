const fs = require('fs');
const path = require('path');

// Mostrar información de inicio
console.log('Iniciando script de normalización...');
console.log(`Directorio actual: ${__dirname}`);

// Ruta al archivo de la base de datos
const dbPath = path.join(__dirname, '..', 'src', 'lib', 'data', 'db.json');
console.log(`Ruta completa al archivo: ${dbPath}`);

// Verificar si el archivo existe
console.log(`¿El archivo existe? ${fs.existsSync(dbPath) ? 'Sí' : 'No'}`);

// Leer el archivo
try {
  console.log('Intentando leer el archivo...');
  const rawData = fs.readFileSync(dbPath, 'utf8');
  console.log(`Archivo leído. Tamaño: ${rawData.length} bytes`);
  console.log('Primeros 100 caracteres del archivo:');
  console.log(rawData.substring(0, 100));
  
  console.log('Intentando parsear como JSON...');
  const db = JSON.parse(rawData);
  console.log('Base de datos cargada y parseada correctamente');
  console.log(`Número de registros: ${db.length}`);
  
  // Solo para ver un ejemplo del primer objeto
  console.log('Primer registro:');
  console.log(JSON.stringify(db[0], null, 2));
} catch (error) {
  console.error('Error:', error.message);
  console.error(error.stack);
}