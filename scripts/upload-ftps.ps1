param(
  [Parameter(Mandatory = $true)][string]$LocalRoot,
  [Parameter(Mandatory = $true)][string]$FtpHost,
  [Parameter(Mandatory = $true)][int]$Port,
  [Parameter(Mandatory = $true)][string]$Username,
  [Parameter(Mandatory = $true)][string]$Password,
  [Parameter(Mandatory = $true)][string]$RemoteBaseDir,
  [Parameter(Mandatory = $false)][string]$UseSsl = 'false',
  [Parameter(Mandatory = $false)][string]$AllowInsecureCertificate = 'false',
  [Parameter(Mandatory = $false)][string]$UsePassive = 'true'
)

$ErrorActionPreference = 'Stop'


function ConvertTo-BoolValue {
  param(
    [string]$Value,
    [string]$ParameterName
  )

  switch ($Value.Trim().ToLowerInvariant()) {
    '1' { return $true }
    'true' { return $true }
    'yes' { return $true }
    'y' { return $true }
    'on' { return $true }
    '0' { return $false }
    'false' { return $false }
    'no' { return $false }
    'n' { return $false }
    'off' { return $false }
    default {
      throw "Invalid $ParameterName value '$Value'. Use true/false, yes/no, on/off, or 1/0."
    }
  }
}

$UseSsl = ConvertTo-BoolValue -Value $UseSsl -ParameterName 'UseSsl'
$AllowInsecureCertificate = ConvertTo-BoolValue -Value $AllowInsecureCertificate -ParameterName 'AllowInsecureCertificate'
$UsePassive = ConvertTo-BoolValue -Value $UsePassive -ParameterName 'UsePassive'

$originalServerCertificateValidationCallback = [System.Net.ServicePointManager]::ServerCertificateValidationCallback
if ($UseSsl -and $AllowInsecureCertificate) {
  Write-Warning 'AllowInsecureCertificate is enabled. TLS certificate validation is being bypassed for this process.'
  [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
}
if (-not (Test-Path -LiteralPath $LocalRoot)) {
  throw "LocalRoot not found: $LocalRoot"
}

$LocalRoot = (Resolve-Path -LiteralPath $LocalRoot).Path.TrimEnd('\\')
$credential = New-Object System.Net.NetworkCredential($Username, $Password)
$remoteBase = $RemoteBaseDir.Trim('/').Trim()
if ([string]::IsNullOrWhiteSpace($remoteBase)) {
  $remoteBase = 'sats'
}

function New-FtpRequest {
  param(
    [string]$Uri,
    [string]$Method
  )

  $request = [System.Net.FtpWebRequest]::Create($Uri)
  $request.Credentials = $credential
  $request.Method = $Method
  $request.EnableSsl = $UseSsl
  $request.UseBinary = $true
  $request.UsePassive = $UsePassive
  $request.KeepAlive = $false
  return $request
}

function Ensure-RemoteDirectory {
  param([string]$Dir)

  if ([string]::IsNullOrWhiteSpace($Dir)) { return }

  $parts = $Dir.Split('/') | Where-Object { $_ -ne '' }
  $current = ''

  foreach ($part in $parts) {
    if ($current -eq '') { $current = $part } else { $current = "$current/$part" }
    $uri = "ftp://$FtpHost`:$Port/$current"

    try {
      $request = New-FtpRequest -Uri $uri -Method ([System.Net.WebRequestMethods+Ftp]::MakeDirectory)
      $response = $request.GetResponse()
      $response.Close()
    }
    catch [System.Net.WebException] {
      $ftpResponse = $_.Exception.Response
      if ($ftpResponse -and $ftpResponse.StatusCode -eq [System.Net.FtpStatusCode]::ActionNotTakenFileUnavailable) {
        continue
      }
      throw
    }
  }
}

try {
  Write-Host "Ensuring remote folder /$remoteBase exists..."
  Ensure-RemoteDirectory -Dir $remoteBase

  $files = Get-ChildItem -LiteralPath $LocalRoot -File -Recurse

  foreach ($file in $files) {
    $relative = $file.FullName.Substring($LocalRoot.Length).TrimStart('\\')
    $relative = $relative -replace '\\', '/'

    $remotePath = "$remoteBase/$relative"
    $remoteDir = [System.IO.Path]::GetDirectoryName($remotePath) -replace '\\', '/'

    Ensure-RemoteDirectory -Dir $remoteDir

    $uri = "ftp://$FtpHost`:$Port/$remotePath"
    Write-Host "Uploading $relative"

    $uploaded = $false

    foreach ($attemptUsePassive in @($UsePassive, (-not $UsePassive))) {
      if ($uploaded) { break }

      try {
        $uploadRequest = New-FtpRequest -Uri $uri -Method ([System.Net.WebRequestMethods+Ftp]::UploadFile)
        $uploadRequest.UsePassive = $attemptUsePassive
        $uploadRequest.ContentLength = $file.Length

        $requestStream = $uploadRequest.GetRequestStream()
        $fileStream = [System.IO.File]::OpenRead($file.FullName)
        $fileStream.CopyTo($requestStream)
        $fileStream.Close()
        $requestStream.Close()

        $uploadResponse = $uploadRequest.GetResponse()
        $uploadResponse.Close()
        $uploaded = $true
      }
      catch [System.Net.WebException] {
        $ftpResponse = $_.Exception.Response
        if ($ftpResponse) {
          $statusCode = [int]$ftpResponse.StatusCode
          $ftpResponse.Close()
          if (-not $uploaded -and $statusCode -eq 451 -and $attemptUsePassive -eq $UsePassive) {
            Write-Warning "Upload failed with FTP 451 for $relative. Retrying with UsePassive=$(-not $UsePassive)."
            continue
          }
        }
        throw
      }
    }
  }

  if ($UseSsl) {
    Write-Host "FTPS upload complete."
  }
  else {
    Write-Host "FTP upload complete."
  }
}
finally {
  if ($UseSsl -and $AllowInsecureCertificate) {
    [System.Net.ServicePointManager]::ServerCertificateValidationCallback = $originalServerCertificateValidationCallback
  }
}
