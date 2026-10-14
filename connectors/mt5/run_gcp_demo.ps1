$ErrorActionPreference = 'Stop'

$reader = 'C:\bots\macrointel_reader\read_snapshot.py'
$terminal = 'C:\Program Files\FTMO Global Markets MT5 Terminal\terminal64.exe'
$log = 'C:\bots\macrointel_reader\reader.log'

Add-Content $log "Reader starting $(Get-Date -Format o)"
& 'C:\Python311\python.exe' $reader $terminal `
    --confirm-account `
    --expected-login 114054496 `
    --expected-server 'MetaQuotes-Demo' `
    --api-url 'https://macrointel-api.onrender.com/api/v1/integrations/mt5/snapshot' `
    *>> $log
$exitCode = $LASTEXITCODE
Add-Content $log "Reader exited $(Get-Date -Format o) with code $exitCode"
exit $exitCode
