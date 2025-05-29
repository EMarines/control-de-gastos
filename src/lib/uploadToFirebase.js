import fs from 'fs';
import path from 'path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';

// --- Configuración ---
// 1. Ruta a tu archivo db.json
// Esta ruta asume que 'uploadToFirebase.js' está en la raíz y 'db.json' en 'src/lib/data/'
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Ajusta la ruta relativa si es necesario.
// Ejemplo: si el script está en una carpeta 'scripts' y db.json en 'src/lib/data'
// const dbFilePath = path.resolve(__dirname, '../src/lib/data/db.json');
const dbFilePath = path.resolve(__dirname, 'data/db.json'); // Ajustado: db.json está en data/ dentro de src/lib/


// 2. Ruta a tu clave de cuenta de servicio de Firebase
// Coloca el archivo JSON descargado de Firebase en la raíz de tu proyecto o ajusta la ruta.
const serviceAccountPath = path.resolve(__dirname, '../../firebase-service-account-key.json'); // Ajustado: buscar en la raíz del proyecto

// 3. Nombre de la colección en Firestore donde se guardarán las transacciones
const firestoreCollectionName = 'transactions';
// --- Fin Configuración ---

async function uploadDataToFirestore() {
  try {
    // Verificar si el archivo de la cuenta de servicio existe
    if (!fs.existsSync(serviceAccountPath)) {
      console.error(`Error: El archivo de clave de cuenta de servicio no se encontró en: ${serviceAccountPath}`);
      console.error('Por favor, descarga la clave desde Firebase Console y colócala en la ruta especificada.');
      process.exit(1);
    }
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    // Inicializar Firebase Admin SDK
    initializeApp({
      credential: cert(serviceAccount)
    });

    const db = getFirestore();
    console.log('Firebase Admin SDK inicializado correctamente.');

    // Verificar si el archivo db.json existe
    if (!fs.existsSync(dbFilePath)) {
      console.error(`Error: El archivo db.json no se encontró en: ${dbFilePath}`);
      process.exit(1);
    }

    // Leer el archivo db.json
    const rawData = await fs.promises.readFile(dbFilePath, 'utf-8');
    const transactions = JSON.parse(rawData);

    if (!Array.isArray(transactions) || transactions.length === 0) {
      console.log('No hay transacciones para subir o el formato no es un array.');
      return;
    }

    console.log(`Se encontraron ${transactions.length} transacciones para subir a la colección '${firestoreCollectionName}'.`);

    // Subir cada transacción a Firestore
    // Usaremos un batch para subir múltiples documentos de forma más eficiente si son muchos.
    // Firestore tiene un límite de 500 operaciones por batch.
    const batchSize = 499; // Un poco menos del límite para estar seguros
    let batch = db.batch();
    let operationCount = 0;
    let totalUploaded = 0;

    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];
      // Firestore generará un ID único para cada documento si no se especifica uno.
      // Si tus objetos tienen un campo 'id' único y quieres usarlo:
      // const docRef = db.collection(firestoreCollectionName).doc(transaction.id);
      // await docRef.set(transaction);
      // Pero como tus IDs están vacíos, dejaremos que Firestore los genere:
      const docRef = db.collection(firestoreCollectionName).doc(); // Firestore genera el ID
      batch.set(docRef, transaction);
      operationCount++;
      totalUploaded++;

      if (operationCount === batchSize || totalUploaded === transactions.length) {
        console.log(`Subiendo lote de ${operationCount} transacciones...`);
        await batch.commit();
        console.log(`Lote subido. Total subido hasta ahora: ${totalUploaded}`);
        if (totalUploaded < transactions.length) { // Si quedan más transacciones
          batch = db.batch(); // Iniciar un nuevo lote
          operationCount = 0; // Resetear contador de operaciones del lote
        }
      }
    }

    console.log(`\n¡Éxito! Se subieron ${totalUploaded} transacciones a la colección '${firestoreCollectionName}' en Firestore.`);

  } catch (error) {
    console.error('Error subiendo datos a Firestore:', error);
  }
}

// Ejecutar la función
uploadDataToFirestore();
