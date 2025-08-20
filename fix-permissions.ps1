# Script para resolver problemas de permisos con OneDrive y Vite

Write-Host "Resolviendo problemas de permisos con OneDrive..." -ForegroundColor Yellow

# Limpiar cache de Vite
Write-Host "Limpiando cache de Vite..." -ForegroundColor Green
if (Test-Path "node_modules/.vite") {
    Remove-Item -Path "node_modules/.vite" -Recurse -Force -ErrorAction SilentlyContinue
}

# Limpiar node_modules y reinstalar (opcional)
Write-Host "¿Deseas limpiar node_modules y reinstalar? (Esto puede tomar unos minutos)" -ForegroundColor Yellow
$reinstall = Read-Host "Escribe 'si' para reinstalar o 'no' para continuar"

if ($reinstall -eq "si") {
    Write-Host "Eliminando node_modules..." -ForegroundColor Green
    Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
    
    Write-Host "Reinstalando dependencias..." -ForegroundColor Green
    npm install
}

Write-Host "Configurando exclusiones para mejorar el rendimiento..." -ForegroundColor Green
Write-Host "Recomendación: Considera mover el proyecto a una ubicación local como C:\Projects\" -ForegroundColor Cyan
Write-Host "OneDrive puede causar problemas de permisos con herramientas de desarrollo." -ForegroundColor Cyan
