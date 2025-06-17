// final-normalizer.js
// Script definitivo que normaliza la base de datos solo con reemplazos directos

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// En ES Modules, necesitamos calcular __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  console.log('🔄 Iniciando normalización definitiva...');

  // 1. Definir rutas
  const dbPath = join(__dirname, '..', 'src', 'lib', 'data', 'db.json');
  const outputPath = join(__dirname, '..', 'src', 'lib', 'data', 'db-final.json');
  
  console.log(`📂 Archivo de entrada: ${dbPath}`);
  console.log(`📂 Archivo de salida: ${outputPath}`);
  
  // Verificar si existe el archivo
  if (!existsSync(dbPath)) {
    console.error('❌ El archivo de base de datos no existe');
    process.exit(1);
  }
  
  // 2. Leer el archivo
  console.log('📖 Leyendo archivo...');
  const content = readFileSync(dbPath, 'utf8');
  console.log(`✅ Archivo leído correctamente (${content.length} bytes)`);
  
  // 3. Realizar reemplazos directos
  console.log('🔄 Aplicando reemplazos...');
  
  // 3.1. Reemplazar "formattedAmount" por "amount"
  console.log('- Reemplazando formattedAmount por amount');
  let modified = content.replace(/\"formattedAmount\"/g, '"amount"');
  
  // 3.2. Normalizar los tipos ("Egreso" → "egreso", "Ingreso" → "ingreso")
  console.log('- Normalizando tipos a minúsculas');
  modified = modified.replace(/\"type\"\s*:\s*\"Egreso\"/g, '"type": "egreso"');
  modified = modified.replace(/\"type\"\s*:\s*\"Ingreso\"/g, '"type": "ingreso"');
  modified = modified.replace(/\"type\"\s*:\s*\"EGRESO\"/g, '"type": "egreso"');
  modified = modified.replace(/\"type\"\s*:\s*\"INGRESO\"/g, '"type": "ingreso"');
  
  // 3.3. Convertir fechas en formato "dd-MMM-yy" a ISO
  console.log('- Convirtiendo fechas a formato ISO');
  modified = modified.replace(/"date"\s*:\s*"(\d{1,2})-([A-Za-z]{3})-(\d{2})"/g, (match, day, month, year) => {
    // Normalizar día a dos dígitos
    day = day.padStart(2, '0');
    
    // Convertir el mes
    const monthMap = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
      'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
      'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'may': '05', 'jun': '06',
      'jul': '07', 'ago': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12'
    };
    
    // Obtener número de mes (con casing insensible)
    const monthLower = month.toLowerCase();
    const monthNum = monthMap[monthLower] || '01';
    
    // Ajustar el año
    const fullYear = parseInt(year) < 70 ? `20${year}` : `19${year}`;
    
    // Retornar la fecha en formato ISO
    return `"date": "${fullYear}-${monthNum}-${day}T00:00:00.000Z"`;
  });
  
  // 4. Guardar el archivo normalizado
  console.log('💾 Guardando archivo normalizado...');
  writeFileSync(outputPath, modified, 'utf8');
  console.log(`✅ Archivo guardado correctamente: ${outputPath}`);
  
  // Crear copia adicional con el nombre original + .bak
  const backupPath = dbPath + '.bak';
  writeFileSync(backupPath, content, 'utf8');
  console.log(`📦 Copia de seguridad creada: ${backupPath}`);
  
  // 5. Finalizar
  console.log('');
  console.log('✅ Proceso completado con éxito');
  
} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  console.error(error.stack);
}
