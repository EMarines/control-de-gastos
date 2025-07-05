# Guía para eliminar archivos sensibles del historial de Git

## Problema
Se necesita eliminar el archivo `firebase-service-account-key.json` del historial de Git para proteger las claves secretas.

## Solución
Hay dos enfoques principales:

### Opción 1: Usar BFG Repo-Cleaner (más rápido y recomendado)

1. Asegúrate de tener Java instalado
2. Descarga BFG desde https://rtyley.github.io/bfg-repo-cleaner/ (ya tienes bfg-1.15.0.jar)
3. Clona un espejo limpio del repositorio:
   ```
   git clone --mirror https://github.com/tu-usuario/tu-repositorio.git repo-mirror
   cd repo-mirror
   ```
4. Ejecuta BFG para eliminar el archivo:
   ```
   java -jar path\to\bfg-1.15.0.jar --delete-files firebase-service-account-key.json
   ```
5. Limpia las referencias:
   ```
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   ```
6. Haz push de los cambios:
   ```
   git push
   ```

### Opción 2: Usar git filter-branch (más lento pero incluido con Git)

1. Haz una copia de respaldo de tu repositorio
2. Ejecuta el siguiente comando:
   ```
   git filter-branch --force --index-filter "git rm --cached --ignore-unmatch firebase-service-account-key.json" --prune-empty --tag-name-filter cat -- --all
   ```
3. Limpia las referencias:
   ```
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   ```
4. Haz push forzado:
   ```
   git push origin --force --all
   ```

## Prevención para el futuro
Ya has añadido el archivo a `.gitignore` y has creado un `.env.example`, lo cual es una buena práctica.

Para trabajar con servicios de Firebase, considera usar variables de entorno:
1. Crea un archivo `.env` (que esté en .gitignore)
2. Define tus variables como:
   ```
   FIREBASE_API_KEY=tu_api_key
   FIREBASE_AUTH_DOMAIN=tu_auth_domain
   FIREBASE_PROJECT_ID=tu_project_id
   ```
3. Carga estas variables en tu aplicación usando la librería `dotenv` o el sistema de variables de entorno de SvelteKit.

## Recuerda
- Forzar push a un repositorio remoto reescribirá la historia de Git
- Los colaboradores deberán clonar nuevamente o realizar operaciones especiales
- Los servicios como GitHub pueden tardar en actualizar sus cachés
