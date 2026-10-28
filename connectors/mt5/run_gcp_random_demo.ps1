$ErrorActionPreference = 'Stop'

$log = 'C:\bots\macrointel_reader\random_trader.log'
$accountPath = 'C:\bots\macrointel_reader\demo-account.json'
if (Test-Path -LiteralPath $accountPath) {
    $account = Get-Content -LiteralPath $accountPath -Raw | ConvertFrom-Json
    $env:MT5_DEMO_LOGIN = [string]$account.login
    $env:MT5_DEMO_SERVER = [string]$account.server
    if ($null -ne $account.serverUtcOffsetSeconds) {
        $env:MT5_DEMO_SERVER_UTC_OFFSET_SECONDS = [string]$account.serverUtcOffsetSeconds
    }
}
$login = 'C:\bots\macrointel_reader\demo-login.dpapi'
if (Test-Path -LiteralPath $login) {
    # The encrypted password belongs to this VM; the folder limits who can read it.
    Add-Type -AssemblyName System.Security
    $passwordBytes = [Security.Cryptography.ProtectedData]::Unprotect(
        [IO.File]::ReadAllBytes($login), $null,
        [Security.Cryptography.DataProtectionScope]::LocalMachine
    )
    $env:MT5_DEMO_PASSWORD = [Text.Encoding]::UTF8.GetString($passwordBytes)
    [Array]::Clear($passwordBytes, 0, $passwordBytes.Length)
}
Add-Content $log "Demo trader starting $(Get-Date -Format o)" -Encoding Unicode
# Keep Python running when it reports a recoverable failure on stderr.
$ErrorActionPreference = 'Continue'
& 'C:\bots\macrointel_reader\.venv\Scripts\python.exe' -u 'C:\bots\macrointel_reader\demo_trader.py' `
    *>> $log
$exitCode = $LASTEXITCODE
Remove-Item Env:\MT5_DEMO_PASSWORD -ErrorAction SilentlyContinue
$ErrorActionPreference = 'Stop'
Add-Content $log "Demo trader exited $(Get-Date -Format o) with code $exitCode" -Encoding Unicode
exit $exitCode
