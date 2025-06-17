// date-converter.cjs
const fs = require('fs');
const path = require('path');

// Definir rutas
const dbPath = path.join(__dirname, '..', 'src', 'lib', 'data', 'db-simple.json');
const outputPath = path.join(__dirname, '..', 'src', 'lib', 'data', 'db-final.json');

console.log('=== CONVERSOR DE FECHAS ===');
console.log(`Entrada: ${dbPath}`);
console.log(`Salida: ${outputPath}`);

try {
  // 1. Leer el archivo JSON
  const content = fs.readFileSync(dbPath, 'utf8');
  console.log(`Archivo leído: ${content.length} bytes`);
  
  // 2. Parsear el JSON
  const data = JSON.parse(content);
  console.log(`JSON parseado con ${data.length} registros`);
  
  // 3. Convertir las fechas
  for (const item of data) {
    if (item && item.date && typeof item.date === 'string') {
      // Formato actual: "26-May-25"
      const match = item.date.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/);
      
      if (match) {
        const day = match[1].padStart(2, '0');
        const month = match[2];
        const year = match[3];
        
        // Mapeo de abreviaturas de meses a números
        const monthMap = {
          'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
          'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
          'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'may': '05', 'jun': '06',
          'jul': '07', 'ago': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12'
        };
        
        const monthLower = month.toLowerCase();
        const monthNum = monthMap[monthLower] || '01';
        
        // Convertir año de 2 dígitos a 4 dígitos
        const fullYear = parseInt(year) < 70 ? `20${year}` : `19${year}`;
        
        // Formato para input date: "YYYY-MM-DD"
        item.date = `${fullYear}-${monthNum}-${day}`;
        console.log(`Convertido: ${match[0]} -> ${item.date}`);
      }
    }
  }
  
  // 4. Convertir el objeto de nuevo a JSON y guardar
  const jsonOutput = JSON.stringify(data, null, 2);
  fs.writeFileSync(outputPath, jsonOutput);
  
  console.log(`✅ Archivo guardado: ${outputPath}`);
  console.log('Conversión de fechas completada con éxito.');
  
} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  console.error(error.stack);
}