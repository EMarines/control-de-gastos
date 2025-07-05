# Guía para limpiar el repositorio y eliminar el archivo sensible
# Script para PowerShell

Write-Host @"
=================================================================
INSTRUCCIONES PARA RESOLVER PROBLEMAS CON EL REPOSITORIO GIT
=================================================================

Tu repositorio Git local parece tener problemas graves que impiden 
la limpieza normal del historial. Sigue estos pasos para resolver
el problema y proteger tus datos sensibles:

PASO 1: Respalda tu código actual
------------------------------------------
1. Crea una carpeta de respaldo fuera del repositorio
2. Copia todos los archivos de tu proyecto (excepto la carpeta .git)

PASO 2: Crea un repositorio nuevo
------------------------------------------
1. Cierra VS Code si está abierto
2. Renombra tu carpeta actual de proyecto para mantenerla como respaldo:
   Rename-Item -Path "C:\Users\Propietario\OneDrive\AB GrupoUrbania\OneDrive\Escritorio\Web Projects\Control de gastos" -NewName "Control de gastos_backup"

3. Crea una nueva carpeta para el proyecto:
   New-Item -Path "C:\Users\Propietario\OneDrive\AB GrupoUrbania\OneDrive\Escritorio\Web Projects\Control de gastos" -ItemType Directory

4. Abre la nueva carpeta:
   cd "C:\Users\Propietario\OneDrive\AB GrupoUrbania\OneDrive\Escritorio\Web Projects\Control de gastos"

PASO 3: Inicializa un nuevo repositorio Git
------------------------------------------
1. Inicializa un nuevo repositorio Git:
   git init

2. Copia todos los archivos desde la carpeta de respaldo (excepto .git y firebase-service-account-key.json)

3. Crea o actualiza el archivo .gitignore:
   Add-Content -Path ".gitignore" -Value "firebase-service-account-key.json`n.env`n"

4. Añade todos los archivos y realiza el primer commit:
   git add .
   git commit -m "Reconstrucción limpia del repositorio"

5. Configura el repositorio remoto:
   git remote add origin https://github.com/tu-usuario/tu-repositorio.git

6. Push al repositorio remoto:
   git push -f origin master

PASO 4: Configuración para variables de entorno
------------------------------------------
1. Crea un archivo .env.example para documentar las variables necesarias
2. Asegúrate de que la aplicación cargue las credenciales desde variables de entorno

=================================================================

Nota: Esta es la forma más limpia y segura de resolver el problema, ya que
tu repositorio Git local parece estar dañado y tiene problemas con los permisos
de archivos que impiden una limpieza normal del historial.

=================================================================
"@ -ForegroundColor Cyan
