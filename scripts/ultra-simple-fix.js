// ultra-simple-fix.js
// Este archivo hace lo mínimo necesario para normalizar la base de datos

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Obtener directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Definir rutas absolutas
const dbPath = resolve(__dirname, '..', 'src', 'lib', 'data', 'db.json');
const outputPath = resolve(__dirname, '..', 'src', 'lib', 'data', 'db-ultra-final.json');

// Iniciar el proceso
console.log(`✂️  NORMALIZADOR ULTRA SIMPLE ✂️`);
console.log(`Entrada: ${dbPath}`);
console.log(`Salida: ${outputPath}`);

try {
  // 1. Leer el archivo como texto
  const text = readFileSync(dbPath, 'utf8');
  console.log(`Archivo leído: ${text.length} bytes`);
  
  // 2. Aplicar reemplazos simples
  let result = text;
  
  // 2.1 Cambiar formattedAmount -> amount
  result = result.replace(/\"formattedAmount\"/g, '"amount"');
  
  // 2.2 Egreso/Ingreso -> egreso/ingreso
  result = result.replace(/\"type\"\s*:\s*\"Egreso\"/g, '"type": "egreso"');
  result = result.replace(/\"type\"\s*:\s*\"Ingreso\"/g, '"type": "ingreso"');
  
  // 3. Escribir el archivo
  writeFileSync(outputPath, result, 'utf8');
  console.log(`✅ Archivo guardado: ${outputPath}`);
  
} catch (error) {
  console.error(`❌ ERROR: ${error.message}`);
}
