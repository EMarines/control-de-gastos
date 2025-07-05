# Script PowerShell para limpiar el archivo sensible del historial Git
# Asegúrate de ejecutar este script desde la raíz del repositorio

Write-Host "Comenzando la limpieza del repositorio Git..." -ForegroundColor Green

# Paso 1: Intentar eliminar el archivo sensible con BFG
Write-Host "Ejecutando BFG para eliminar el archivo sensible..." -ForegroundColor Yellow
java -jar bfg-1.15.0.jar --delete-files firebase-service-account-key.json

# Paso 2: Si BFG falla, usar git filter-branch como alternativa
if ($LASTEXITCODE -ne 0) {
    Write-Host "BFG falló, intentando con git filter-branch..." -ForegroundColor Yellow
    git filter-branch --force --index-filter "git rm --cached --ignore-unmatch firebase-service-account-key.json" --prune-empty --tag-name-filter cat -- --all
}

# Paso 3: Limpiar referencias y forzar la recolección de basura
Write-Host "Limpiando referencias y ejecutando recolección de basura..." -ForegroundColor Yellow
git reflog expire --expire=now --all
git gc --prune=now --aggressive

Write-Host "Limpieza completada." -ForegroundColor Green
Write-Host "Ahora puedes hacer push forzado al repositorio remoto con:" -ForegroundColor Cyan
Write-Host "git push origin --force --all" -ForegroundColor White
