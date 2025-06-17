// Este archivo usa CommonJS (extensión .cjs)
const fs = require('fs');
const path = require('path');

console.log('===== NORMALIZACIÓN DE DB (CommonJS) =====');

// Ruta al archivo de la base de datos
const dbPath = path.join(__dirname, '..', 'src', 'lib', 'data', 'db.json');
const outputPath = path.join(__dirname, '..', 'src', 'lib', 'data', 'db-normalized.json');

console.log(`Ruta de entrada: ${dbPath}`);
console.log(`Ruta de salida: ${outputPath}`);

// Verificar si el archivo existe
if (!fs.existsSync(dbPath)) {
  console.error(`Error: el archivo ${dbPath} no existe`);
  process.exit(1);
}

// Leer el archivo
try {
  console.log('Leyendo archivo...');
  const rawData = fs.readFileSync(dbPath, 'utf8');
  console.log(`Archivo leído. Tamaño: ${rawData.length} bytes`);
  
  // Parsear el JSON
  const data = JSON.parse(rawData);
  console.log(`Datos parseados. Total de registros: ${data.length}`);
  
  // Normalizar los datos
  const normalizedData = data.map(item => {
    // Si no es un objeto válido, lo devolvemos sin cambios
    if (!item || typeof item !== 'object') return item;
    
    // Creamos una copia del objeto para modificarlo
    const normalized = { ...item };
    
    // 1. Si existe formattedAmount, moverlo a amount
    if ('formattedAmount' in normalized) {
      normalized.amount = normalized.formattedAmount;
      delete normalized.formattedAmount;
    }
    
    // 2. Normalizar el tipo a minúsculas
    if (normalized.type) {
      if (normalized.type === 'Egreso') {
        normalized.type = 'egreso';
      } else if (normalized.type === 'Ingreso') {
        normalized.type = 'ingreso';
      }
    }
    
    // 3. Convertir fechas de formato "dd-MMM-yy" a ISO "YYYY-MM-DDTHH:mm:ss.sssZ"
    if (normalized.date && typeof normalized.date === 'string') {
      const datePattern = /^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/;
      const match = normalized.date.match(datePattern);
      
      if (match) {
        const day = parseInt(match[1], 10);
        const monthAbbr = match[2].toLowerCase();
        let year = parseInt(match[3], 10);
        
        // Mapeo de abreviaturas de meses
        const monthMap = {
          'ene': 0, 'jan': 0,
          'feb': 1,
          'mar': 2,
          'abr': 3, 'apr': 3,
          'may': 4,
          'jun': 5,
          'jul': 6,
          'ago': 7, 'aug': 7,
          'sep': 8,
          'oct': 9,
          'nov': 10,
          'dic': 11, 'dec': 11
        };
        
        // Ajustar el año (asumimos que 00-69 es 2000-2069, 70-99 es 1970-1999)
        if (year < 70) {
          year += 2000;
        } else if (year < 100) {
          year += 1900;
        }
        
        const month = monthMap[monthAbbr];
        if (month !== undefined) {
          const isoDate = new Date(year, month, day);
          if (!isNaN(isoDate.getTime())) {
            normalized.date = isoDate.toISOString();
          }
        }
      }
    }
    
    return normalized;
  });
  
  // Guardar los datos normalizados
  fs.writeFileSync(outputPath, JSON.stringify(normalizedData, null, 2));
  console.log(`Base de datos normalizada guardada en: ${outputPath}`);
  
  // Mostrar algunos estadísticas
  console.log('\nAlgunos ejemplos de datos normalizados:');
  console.log(JSON.stringify(normalizedData.slice(0, 2), null, 2));
  
} catch (error) {
  console.error('Error:', error.message);
  console.error(error.stack);
}

console.log('\n===== FIN DE LA NORMALIZACIÓN =====');
