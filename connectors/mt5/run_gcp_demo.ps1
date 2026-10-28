$ErrorActionPreference = 'Stop'

$reader = 'C:\bots\macrointel_reader\read_snapshot.py'
$terminal = 'C:\bots\macrointel_reader\terminal\terminal64.exe'
$log = 'C:\bots\macrointel_reader\reader.log'
$accountPath = 'C:\bots\macrointel_reader\demo-account.json'
$account = @{ login = '114054496'; server = 'MetaQuotes-Demo' }
if (Test-Path -LiteralPath $accountPath) {
    $account = Get-Content -LiteralPath $accountPath -Raw | ConvertFrom-Json
}

Add-Content $log "Reader starting $(Get-Date -Format o)" -Encoding Unicode
# Python logs retryable failures to stderr. PowerShell 5.1 must let it retry.
$ErrorActionPreference = 'Continue'
& 'C:\bots\macrointel_reader\.venv\Scripts\python.exe' -u $reader $terminal `
    --confirm-account `
    --portable `
    --expected-login $account.login `
    --expected-server $account.server `
    --api-url 'https://macrointel-api.onrender.com/api/v1/integrations/mt5/snapshot' `
    *>> $log
$exitCode = $LASTEXITCODE
$ErrorActionPreference = 'Stop'
Add-Content $log "Reader exited $(Get-Date -Format o) with code $exitCode" -Encoding Unicode
exit $exitCode
