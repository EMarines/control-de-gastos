<#
.SYNOPSIS
    Limpia de forma segura un archivo sensible del historial de Git.
.DESCRIPTION
    Este script proporciona una forma segura e interactiva de eliminar un archivo sensible de todo el historial de un repositorio Git.
    Puede ejecutarse en modo de instrucciones (por defecto) o en modo de ejecución.
.PARAMETER FileName
    El nombre del archivo que se va a eliminar del historial. Requerido si se usa -Execute.
.PARAMETER BfgJarPath
    La ruta al archivo bfg.jar. Por defecto es '.\bfg.jar'.
.PARAMETER Execute
    Si se especifica, el script ejecutará los comandos de limpieza en lugar de solo mostrar las instrucciones.
.EXAMPLE
    .\clean-history.ps1
    Muestra las instrucciones detalladas sin ejecutar nada.
.EXAMPLE
    .\clean-history.ps1 -FileName "mi-archivo-secreto.txt" -Execute
    Ejecuta el proceso de limpieza para "mi-archivo-secreto.txt".
#>
[CmdletBinding()]
param (
    [Parameter(Mandatory = $false)]
    [string]$FileName,

    [string]$BfgJarPath = ".\bfg.jar",

    [Switch]$Execute
)

function Show-Instructions {
    Write-Host @"
=================================================================
INSTRUCCIONES PARA LIMPIAR UN ARCHIVO SENSIBLE DEL HISTORIAL GIT
=================================================================

Este script te ayuda a eliminar permanentemente un archivo sensible del historial de tu repositorio.

Para usarlo en modo de ejecución, proporciona el nombre del archivo y el switch -Execute:
PS> .\clean-history.ps1 -FileName "nombre-del-archivo.ext" -Execute

El proceso que se seguirá es:

1.  USO DE BFG REPO-CLEANER:
    - Se usará la herramienta BFG, que es la forma más rápida y recomendada.
    - Debes tener Java instalado y el archivo bfg.jar en la ruta especificada (por defecto: '$BfgJarPath').
    - Puedes descargarlo desde: https://repo1.maven.org/maven2/com/madgag/bfg/

2.  FALLBACK A GIT FILTER-BRANCH:
    - Si BFG falla (o no se encuentra), el script intentará usar el comando nativo de Git 'filter-branch'.
    - Este método es más lento pero no requiere dependencias externas.

3.  LIMPIEZA FINAL:
    - Se limpiarán las referencias antiguas (reflog) y se ejecutará el recolector de basura (gc) para eliminar físicamente los datos del repositorio local.

4.  PUSH FORZADO AL REMOTO:
    - Se te pedirá confirmación para forzar la subida de los cambios al repositorio remoto.
    - ¡ADVERTENCIA! Este paso sobreescribe el historial remoto. Asegúrate de que nadie más esté trabajando en el repositorio o coordina con tu equipo.

=================================================================
"@ -ForegroundColor Cyan
}

function Execute-Cleanup {
    if (-not (Test-Path ".git")) {
        Write-Error "Este script debe ejecutarse desde la raíz de un repositorio Git."
        return
    }

    Write-Host "Iniciando la limpieza del historial para el archivo: '$FileName'" -ForegroundColor Green

    # Intentar con BFG
    $bfgFound = Test-Path $BfgJarPath
    $javaCheck = Get-Command java -ErrorAction SilentlyContinue

    if ($bfgFound -and $javaCheck) {
        Write-Host "Ejecutando BFG para eliminar '$FileName'..." -ForegroundColor Yellow
        java -jar $BfgJarPath --delete-files $FileName
    } else {
        Write-Warning "No se encontró BFG en '$BfgJarPath' o Java no está en el PATH. Usando git filter-branch como alternativa (puede ser lento)."
        git filter-branch --force --index-filter "git rm --cached --ignore-unmatch `"$FileName`"" --prune-empty --tag-name-filter cat -- --all
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Falló la reescritura del historial. Abortando."
        return
    }

    Write-Host "Limpiando referencias y ejecutando recolección de basura..." -ForegroundColor Yellow
    git reflog expire --expire=now --all
    git gc --prune=now --aggressive

    Write-Host "Limpieza local completada." -ForegroundColor Green
    
    $confirmation = Read-Host "ADVERTENCIA: ¿Deseas forzar el push de TODOS los branches al remoto? Esto sobreescribirá el historial. Escribe 'si' para confirmar."
    if ($confirmation -eq 'si') {
        Write-Host "Forzando push al repositorio remoto..." -ForegroundColor Yellow
        git push origin --force --all
        Write-Host "¡Push forzado completado!" -ForegroundColor Green
    } else {
        Write-Host "Operación de push cancelada. Deberás hacerlo manualmente con: git push origin --force --all" -ForegroundColor Cyan
    }
}

if ($Execute) {
    if (-not $FileName) {
        Write-Error "El parámetro -FileName es obligatorio cuando se usa -Execute."
        return
    }
    Execute-Cleanup
} else {
    Show-Instructions
}