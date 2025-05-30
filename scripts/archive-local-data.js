/**
 * Script para limpiar archivos de datos locales innecesarios
 * Usa este script solo si estás seguro que los datos ya están migrados a Firestore
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Archivos que podrían ser eliminados (ajusta según tu caso)
const filesToArchive = [
    path.join(__dirname, '../lib/data/transactionData.js'),
    path.join(__dirname, '../lib/data/operaciones/datos.json'),
    path.join(__dirname, '../lib/data/db.json'),
    path.join(__dirname, '../lib/data/transactions.json'),
    path.join(__dirname, '../lib/data/db-fixed.json')
];

// Directorio para archivar los archivos
const archiveDir = path.join(__dirname, '../lib/data/archived');

// Asegúrate de que el directorio de archivo exista
if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
}

// Función para archivar archivos
function archiveFile(filePath) {
    if (fs.existsSync(filePath)) {
        try {
            const fileName = path.basename(filePath);
            const archiveFilePath = path.join(archiveDir, fileName);
            
            // Mover el archivo a la carpeta de archivo
            fs.copyFileSync(filePath, archiveFilePath);
            
            console.log(`Archivo ${fileName} archivado correctamente en ${archiveDir}`);
            return true;
        } catch (error) {
            console.error(`Error al archivar ${filePath}:`, error);
            return false;
        }
    } else {
        console.log(`El archivo ${filePath} no existe`);
        return false;
    }
}

// Archivar cada archivo
let archivedCount = 0;
for (const file of filesToArchive) {
    if (archiveFile(file)) {
        archivedCount++;
    }
}

console.log(`Proceso completado. ${archivedCount} de ${filesToArchive.length} archivos fueron archivados.`);
console.log(`Los archivos originales todavía existen en sus ubicaciones originales.`);
console.log(`Si deseas eliminarlos, puedes hacerlo manualmente después de verificar que todo funciona correctamente.`);
