# Script para limpiar archivos no utilizados del proyecto
# Ejecutar este script desde PowerShell

# Backup files
$backupFiles = @(
    ".\src\lib\components\TransactionHistory.svelte.bak",
    ".\src\lib\components\Operaciones.svelte.broken",
    ".\src\lib\components\Operaciones.svelte.error",
    ".\src\lib\stores\transactions.ts.backup",
    ".\src\lib\data\db.json.bak"
)

# Duplicate data files
$duplicateDataFiles = @(
    ".\src\lib\data\db copy.json",
    ".\src\lib\data\db-simple.json"
    # Keeping db-final.json as a backup
)

# Deprecated/unused components
$unusedComponents = @(
    ".\src\lib\components\ExpensesChart.svelte",
    ".\src\lib\components\LocationPieChartSimple.simple.svelte",
    ".\src\lib\components\FinancialSummary.simple.svelte"
)

# Unused store files
$unusedStoreFiles = @(
    ".\src\lib\stores\transactions-fixed.ts",
    ".\src\lib\stores\fixed-transactions.ts"
    # Keeping simple-local-transactions.ts since it's used by simple-view
)

# Test/utility scripts
$testScripts = @(
    ".\scripts\ultra-simple-fix.js",
    ".\scripts\test-console.js",
    ".\scripts\normalize.js",
    ".\scripts\normalize-simple.js",
    ".\scripts\final-normalizer.js",
    ".\scripts\check-path.js"
)

# Create backup folder if it doesn't exist
$backupFolder = ".\backup-files"
if (-not (Test-Path $backupFolder)) {
    New-Item -Path $backupFolder -ItemType Directory
    Write-Host "Created backup folder: $backupFolder" -ForegroundColor Green
}

# Function to move files to backup folder
function Move-FilesToBackup($filesList) {
    foreach ($file in $filesList) {
        if (Test-Path $file) {
            $fileName = Split-Path $file -Leaf
            $destination = Join-Path -Path $backupFolder -ChildPath $fileName
            Move-Item -Path $file -Destination $destination -Force
            Write-Host "Moved to backup: $file" -ForegroundColor Yellow
        } else {
            Write-Host "File not found: $file" -ForegroundColor Red
        }
    }
}

# Move all unused files to backup
Write-Host "Moving backup files..." -ForegroundColor Cyan
Move-FilesToBackup $backupFiles

Write-Host "Moving duplicate data files..." -ForegroundColor Cyan
Move-FilesToBackup $duplicateDataFiles

Write-Host "Moving unused components..." -ForegroundColor Cyan
Move-FilesToBackup $unusedComponents

Write-Host "Moving unused store files..." -ForegroundColor Cyan
Move-FilesToBackup $unusedStoreFiles

Write-Host "Moving test scripts..." -ForegroundColor Cyan
Move-FilesToBackup $testScripts

Write-Host "Project cleanup completed!" -ForegroundColor Green
Write-Host "Unused files moved to: $backupFolder" -ForegroundColor Green
