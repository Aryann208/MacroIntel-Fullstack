$ErrorActionPreference = 'Stop'

$log = 'C:\bots\macrointel_reader\random_trader.log'
Add-Content $log "Demo trader starting $(Get-Date -Format o)"
& 'C:\Python311\python.exe' 'C:\bots\macrointel_reader\demo_trader.py' `
    *>> $log
$exitCode = $LASTEXITCODE
Add-Content $log "Demo trader exited $(Get-Date -Format o) with code $exitCode"
exit $exitCode
