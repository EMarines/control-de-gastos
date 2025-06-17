// final-simple.cjs - Versión CommonJS
const fs = require('fs');
const path = require('path');

// Definir rutas (usando __dirname que está disponible en CommonJS)
const dbPath = path.join(__dirname, '..', 'src', 'lib', 'data', 'db.json');
const outputPath = path.join(__dirname, '..', 'src', 'lib', 'data', 'db-fixed-final.json');

// Mostrar información
console.log('=== NORMALIZADOR SIMPLE (CommonJS) ===');
console.log(`Entrada: ${dbPath}`);
console.log(`Salida: ${outputPath}`);

try {
  // 1. Leer el archivo
  const content = fs.readFileSync(dbPath, 'utf8');
  console.log(`Archivo leído: ${content.length} bytes`);
  
  // 2. Aplicar reemplazos simples
  let modified = content;
  
  // 2.1 Cambiar formattedAmount -> amount
  modified = modified.replace(/\"formattedAmount\"/g, '"amount"');
  
  // 2.2 Egreso/Ingreso -> egreso/ingreso
  modified = modified.replace(/\"type\"\s*:\s*\"Egreso\"/g, '"type": "egreso"');
  modified = modified.replace(/\"type\"\s*:\s*\"Ingreso\"/g, '"type": "ingreso"');
  
  // 2.3 Convertir fechas a formato ISO (dd-MMM-yy -> YYYY-MM-DDT00:00:00.000Z)
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
  
  // 3. Escribir el resultado
  fs.writeFileSync(outputPath, modified, 'utf8');
  console.log(`✅ Archivo guardado: ${outputPath}`);
  
} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  console.error(error.stack);
}
