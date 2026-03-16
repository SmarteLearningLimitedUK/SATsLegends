param(
  [Parameter(Mandatory = $true)][string]$LocalRoot,
  [Parameter(Mandatory = $true)][string]$Host,
  [Parameter(Mandatory = $true)][int]$Port,
  [Parameter(Mandatory = $true)][string]$Username,
  [Parameter(Mandatory = $true)][string]$Password,
  [Parameter(Mandatory = $true)][string]$RemoteBaseDir
)

$ErrorActionPreference = 'Stop'

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
  $request.EnableSsl = $true
  $request.UseBinary = $true
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
    $uri = "ftp://$Host`:$Port/$current"

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

Write-Host "Ensuring remote folder /$remoteBase exists..."
Ensure-RemoteDirectory -Dir $remoteBase

$files = Get-ChildItem -LiteralPath $LocalRoot -File -Recurse

foreach ($file in $files) {
  $relative = $file.FullName.Substring($LocalRoot.Length).TrimStart('\\')
  $relative = $relative -replace '\\', '/'

  $remotePath = "$remoteBase/$relative"
  $remoteDir = [System.IO.Path]::GetDirectoryName($remotePath) -replace '\\', '/'

  Ensure-RemoteDirectory -Dir $remoteDir

  $uri = "ftp://$Host`:$Port/$remotePath"
  Write-Host "Uploading $relative"

  $uploadRequest = New-FtpRequest -Uri $uri -Method ([System.Net.WebRequestMethods+Ftp]::UploadFile)
  $content = [System.IO.File]::ReadAllBytes($file.FullName)
  $uploadRequest.ContentLength = $content.Length

  $requestStream = $uploadRequest.GetRequestStream()
  $requestStream.Write($content, 0, $content.Length)
  $requestStream.Close()

  $uploadResponse = $uploadRequest.GetResponse()
  $uploadResponse.Close()
}

Write-Host "FTPS upload complete."
