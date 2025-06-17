// normalize-simple.js - Script ultra simplificado
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

// En ES Modules, necesitamos calcular __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

// Función para convertir fechas de formato "dd-MMM-yy" a ISO
function convertIsoDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return dateStr;
  
  // Formato común: "dd-MMM-yy" (ej: "29-May-25")
  const datePattern = /^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/;
  const match = dateStr.match(datePattern);
  
  if (match) {
    let day = match[1].padStart(2, '0');
    const monthAbbr = match[2].toLowerCase();
    let year = match[3];
    
    // Mapa para convertir abreviatura de mes a número de mes (0-based)
    const monthMap = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
      'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
      'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'may': '05', 'jun': '06',
      'jul': '07', 'ago': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12'
    };
    
    const month = monthMap[monthAbbr];
    if (!month) return dateStr; // Si no reconocemos el mes, devolvemos la fecha original
    
    // Ajustar el año (asumimos que 00-69 es 2000-2069, 70-99 es 1970-1999)
    const fullYear = parseInt(year) < 70 ? `20${year}` : `19${year}`;
    
    // Devolver en formato ISO
    return `${fullYear}-${month}-${day}T00:00:00.000Z`;
  }
  
  return dateStr; // Si no coincide con el formato esperado, devolvemos la fecha original
}

try {
  // 1. Rutas de archivos (usando rutas absolutas completas)
  const dbPath = join(__dirname, '..', 'src', 'lib', 'data', 'db.json');
  const outputPath = join(__dirname, '..', 'src', 'lib', 'data', 'db-normalized.json');
  
  console.log(`Archivo de entrada: ${dbPath}`);
  console.log(`¿Existe? ${existsSync(dbPath) ? 'Sí' : 'No'}`);
    // 2. Leer el archivo y parsear el JSON
  const content = readFileSync(dbPath, 'utf8');
  console.log(`Archivo leído: ${content.length} bytes`);
  
  // Limpiar comentarios y caracteres no válidos para JSON
  console.log('Limpiando comentarios y caracteres no válidos...');
  let cleanedContent = content
    .replace(/^\s*\/\/.*$/gm, '') // Eliminar líneas de comentarios
    .replace(/\/\*[\s\S]*?\*\//g, '') // Eliminar comentarios multilinea /* */
    .trim();
  
  // Asegurarse de que empieza con '[' y termina con ']'
  if (!cleanedContent.startsWith('[')) {
    const startBracketPos = cleanedContent.indexOf('[');
    if (startBracketPos > -1) {
      cleanedContent = cleanedContent.substring(startBracketPos);
    }
  }
  
  try {
    // Parsear el JSON para poder normalizar las fechas
    const data = JSON.parse(cleanedContent);
    console.log(`JSON parseado: ${data.length} registros`);
  } catch (parseError) {
    console.error('Error al parsear JSON:', parseError.message);
    
    // Plan B: Usar expresiones regulares directamente sin parsear el JSON
    console.log('Usando enfoque alternativo con reemplazos de texto directo...');
    
    // 3. Hacer las conversiones con expresiones regulares
    let modified = content;
    
    // 3.1. Reemplazar "formattedAmount" por "amount"
    modified = modified.replace(/\"formattedAmount\"/g, '"amount"');
    
    // 3.2. Normalizar los tipos
    modified = modified.replace(/\"type\"\s*:\s*\"Egreso\"/g, '"type": "egreso"');
    modified = modified.replace(/\"type\"\s*:\s*\"Ingreso\"/g, '"type": "ingreso"');
    
    // 3.3. Intentar convertir fechas con un patrón simple
    // Buscar patrones como "date": "dd-MMM-yy" y convertirlos
    modified = modified.replace(/"date"\s*:\s*"(\d{1,2})-([A-Za-z]{3})-(\d{2})"/g, (match, day, month, year) => {
      day = day.padStart(2, '0');
      month = month.toLowerCase();
      
      // Mapa para convertir abreviatura de mes
      const monthMap = {
        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
        'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
        'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'may': '05', 'jun': '06',
        'jul': '07', 'ago': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12'
      };
      
      const monthNum = monthMap[month] || '01';
      const fullYear = parseInt(year) < 70 ? `20${year}` : `19${year}`;
      
      return `"date": "${fullYear}-${monthNum}-${day}T00:00:00.000Z"`;
    });
    
    // 4. Guardar el resultado
    writeFileSync(outputPath, modified, 'utf8');
    console.log(`\nArchivo con reemplazos guardado: ${outputPath}`);
    console.log('\n✅ Proceso completado con enfoque alternativo');
    
    return; // Salir de la función después de aplicar el enfoque alternativo
  }
  
  // 3. Normalizar los datos
  let formattedAmountCount = 0;
  let typeFixCount = 0;
  let dateFixCount = 0;
  
  const normalizedData = data.map(item => {
    // Si no es un objeto válido, lo devolvemos sin cambios
    if (!item || typeof item !== 'object') return item;
    
    const normalized = { ...item };
    
    // 3.1. Si existe formattedAmount, moverlo a amount
    if ('formattedAmount' in normalized) {
      normalized.amount = normalized.formattedAmount;
      delete normalized.formattedAmount;
      formattedAmountCount++;
    }
    
    // 3.2. Normalizar el tipo a minúsculas
    if (normalized.type) {
      if (normalized.type === 'Egreso') {
        normalized.type = 'egreso';
        typeFixCount++;
      } else if (normalized.type === 'Ingreso') {
        normalized.type = 'ingreso';
        typeFixCount++;
      }
    }
    
    // 3.3. Convertir fechas a formato ISO
    if (normalized.date && typeof normalized.date === 'string') {
      const originalDate = normalized.date;
      const isoDate = convertIsoDate(originalDate);
      
      if (isoDate !== originalDate) {
        normalized.date = isoDate;
        dateFixCount++;
      }
    }
    
    return normalized;
  });
  
  // 4. Guardar los datos normalizados
  writeFileSync(outputPath, JSON.stringify(normalizedData, null, 2));
  console.log(`\nArchivo normalizado guardado: ${outputPath}`);
  
  // 5. Mostrar estadísticas
  console.log('\n📊 Resumen de cambios:');
  console.log(`- Campos formattedAmount convertidos a amount: ${formattedAmountCount}`);
  console.log(`- Tipos normalizados a minúsculas: ${typeFixCount}`);
  console.log(`- Fechas convertidas a formato ISO: ${dateFixCount}`);
  console.log(`- Total de registros procesados: ${normalizedData.length}`);
  
  console.log('\n✅ Proceso completado con éxito');
  } catch (error) {
  console.error(`❌ Error: ${error.message}`);
  console.error(error.stack);
}
