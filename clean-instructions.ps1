# Pasos para limpiar un archivo sensible del historial Git

# Este script no se ejecuta automáticamente, solo muestra los comandos que deberías ejecutar uno por uno

Write-Host @"
=================================================================
INSTRUCCIONES PARA LIMPIAR UN ARCHIVO SENSIBLE DEL HISTORIAL GIT
=================================================================

Sigue estos pasos en el orden indicado:

PASO 1: Confirma todos los cambios pendientes
---------------------------------------------
git add .gitignore .env.example
git commit -m "Añadir archivos de configuración para la seguridad"

git rm firebase-service-account-key.json
git commit -m "Eliminar archivo de claves sensibles"

PASO 2: Ejecuta BFG para limpiar el historial
---------------------------------------------
# Asegúrate de que estás en la raíz del repositorio
cd "C:\Users\Propietario\OneDrive\AB GrupoUrbania\OneDrive\Escritorio\Web Projects\Control de gastos"
java -jar bfg-1.15.0.jar --delete-files firebase-service-account-key.json

PASO 3: Limpia las referencias y fuerza la recolección de basura
---------------------------------------------------------------
git reflog expire --expire=now --all
git gc --prune=now --aggressive

PASO 4: Fuerza el push al repositorio remoto
-------------------------------------------
git push origin --force --all

=================================================================
"@ -ForegroundColor Cyan
