// Este archivo es un punto de entrada para cargar la base de datos local
// El código cliente usará fetch para acceder a este archivo

import { json } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';

// Ruta al archivo de la base de datos (usando rutas relativas)
// Usando directamente dbTC.json como base de datos principal
const dbPath = path.join(process.cwd(), 'src', 'lib', 'data', 'dbTC.json');
const fallbackPath = path.join(process.cwd(), 'src', 'lib', 'data', 'db.json');

export async function GET() {
  try {
    // Intentar leer el archivo db-final.json
    let data;
    let source;
    
    if (fs.existsSync(dbPath)) {
      data = fs.readFileSync(dbPath, 'utf8');
      source = 'dbTC.json';
    } else if (fs.existsSync(fallbackPath)) {
      data = fs.readFileSync(fallbackPath, 'utf8');
      source = 'db.json';
    } else {
      return json({ error: 'No se encontró ninguna base de datos' }, { status: 404 });
    }
    
    // Parsear el JSON para validar que sea correcto
    const parsedData = JSON.parse(data);
    
    console.log(`Sirviendo ${parsedData.length} registros desde ${source}`);
    
    // Devolver los datos como JSON
    return json(parsedData);
  } catch (error) {
    console.error('Error al leer la base de datos:', error);
    return json({ error: 'Error al leer la base de datos' }, { status: 500 });
  }
}
