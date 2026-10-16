param([string]$OutputDirectory = (Join-Path $PSScriptRoot '../.secrets'))
$ErrorActionPreference = 'Stop'
$target = [IO.Path]::GetFullPath($OutputDirectory)
$runtimeFile = Join-Path $target 'waybill-runtime.env'
$composeFile = Join-Path $target 'compose.env'
if ((Test-Path -LiteralPath $runtimeFile) -or (Test-Path -LiteralPath $composeFile)) {
    throw 'Secret files already exist. Preserve them; rotate existing credentials through the deployment runbook.'
}
function New-Secret([int]$ByteCount = 48) {
    $bytes = New-Object byte[] $ByteCount
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    return 'Wb!' + ([BitConverter]::ToString($bytes)).Replace('-', '').ToLowerInvariant()
}
$dbAdmin = New-Secret
$dbApp = New-Secret
$jwt = New-Secret
$redis = New-Secret
$rabbit = New-Secret
$minio = New-Secret 16
New-Item -ItemType Directory -Path $target -Force | Out-Null
[IO.File]::WriteAllLines($runtimeFile, @(
    "db-admin-password=$dbAdmin", 'db-user=waybill_app', "db-password=$dbApp", "jwt-secret=$jwt",
    "redis-password=$redis", 'rabbitmq-user=waybill_app', "rabbitmq-password=$rabbit",
    'minio-user=waybill_storage', "minio-password=$minio", 'ai-api-key=ollama',
    'mail-username=', 'mail-password='
))
[IO.File]::WriteAllLines($composeFile, @(
    "DB_ADMIN_PASSWORD=$dbAdmin", "DB_APP_PASSWORD=$dbApp", "JWT_SECRET=$jwt", "REDIS_PASSWORD=$redis",
    'RABBITMQ_USER=waybill_app', "RABBITMQ_PASSWORD=$rabbit", 'MINIO_USER=waybill_storage', "MINIO_PASSWORD=$minio"
))
Write-Output "Created private configuration in $target. No credentials were printed."
Write-Output 'Before applying to an existing installation, migrate the database login and rotate persisted credentials as documented.'
