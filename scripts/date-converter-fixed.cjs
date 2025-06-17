// date-converter-fixed.cjs
const fs = require('fs');
const path = require('path');

console.log('Script iniciado...');
console.log('__dirname:', __dirname);

// Definir rutas
const dbPath = path.join(__dirname, '..', 'src', 'lib', 'data', 'db-simple.json');
const outputPath = path.join(__dirname, '..', 'src', 'lib', 'data', 'db-final.json');

console.log('=== CONVERSOR DE FECHAS ===');
console.log(`Entrada: ${dbPath}`);
console.log(`Salida: ${outputPath}`);

try {
  // 1. Leer el archivo JSON
  let content = fs.readFileSync(dbPath, 'utf8');
  console.log(`Archivo leído: ${content.length} bytes`);
  
  // 2. Eliminar cualquier comentario (líneas que comienzan con //)
  content = content.replace(/^\/\/.*$/mg, '').trim();
  
  // 3. Parsear el JSON
  const data = JSON.parse(content);
  console.log(`JSON parseado con ${data.length} registros`);
  
  // 4. Convertir las fechas
  let countConverted = 0;
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
        const originalDate = item.date;
        item.date = `${fullYear}-${monthNum}-${day}`;
        countConverted++;
        
        // Solo mostramos algunas conversiones para no saturar la consola
        if (countConverted <= 5 || countConverted % 1000 === 0) {
          console.log(`Convertido: ${originalDate} -> ${item.date}`);
        }
      }
    }
  }
  
  console.log(`Total de fechas convertidas: ${countConverted}`);
  
  // 5. Convertir el objeto de nuevo a JSON y guardar
  const jsonOutput = JSON.stringify(data, null, 2);
  fs.writeFileSync(outputPath, jsonOutput);
  
  console.log(`✅ Archivo guardado: ${outputPath}`);
  console.log('Conversión de fechas completada con éxito.');
  
} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  console.error(error.stack);
}
