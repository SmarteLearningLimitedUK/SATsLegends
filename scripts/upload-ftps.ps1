param(
  [Parameter(Mandatory = $true)][string]$LocalRoot,
  [Parameter(Mandatory = $true)][string]$FtpHost,
  [Parameter(Mandatory = $true)][int]$Port,
  [Parameter(Mandatory = $true)][string]$Username,
  [Parameter(Mandatory = $true)][string]$Password,
  [Parameter(Mandatory = $true)][string]$RemoteBaseDir,
  [Parameter(Mandatory = $false)][string]$UseSsl = 'false',
  [Parameter(Mandatory = $false)][string]$AllowInsecureCertificate = 'false',
  [Parameter(Mandatory = $false)][string]$UsePassive = 'true',
  [Parameter(Mandatory = $false)][string]$AllowPassiveToggleFallback = 'false',
  [Parameter(Mandatory = $false)][string]$MaxParallel = '1'
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

function ConvertTo-IntValue {
  param(
    [string]$Value,
    [string]$ParameterName,
    [int]$Min,
    [int]$Max
  )

  $parsed = 0
  if (-not [int]::TryParse($Value, [ref]$parsed)) {
    throw "Invalid $ParameterName value '$Value'. It must be an integer."
  }
  if ($parsed -lt $Min -or $parsed -gt $Max) {
    throw "Invalid $ParameterName value '$Value'. Allowed range is $Min..$Max."
  }
  return $parsed
}

$UseSsl = ConvertTo-BoolValue -Value $UseSsl -ParameterName 'UseSsl'
$AllowInsecureCertificate = ConvertTo-BoolValue -Value $AllowInsecureCertificate -ParameterName 'AllowInsecureCertificate'
$UsePassive = ConvertTo-BoolValue -Value $UsePassive -ParameterName 'UsePassive'
$AllowPassiveToggleFallback = ConvertTo-BoolValue -Value $AllowPassiveToggleFallback -ParameterName 'AllowPassiveToggleFallback'
$MaxParallel = ConvertTo-IntValue -Value $MaxParallel -ParameterName 'MaxParallel' -Min 1 -Max 20

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

function Upload-FileWithRetry {
  param(
    [string]$Uri,
    [string]$Relative,
    [string]$FilePath,
    [long]$FileLength,
    [bool]$AttemptUsePassive
  )

  try {
    $uploadRequest = New-FtpRequest -Uri $Uri -Method ([System.Net.WebRequestMethods+Ftp]::UploadFile)
    $uploadRequest.UsePassive = $AttemptUsePassive
    $uploadRequest.ContentLength = $FileLength

    $requestStream = $uploadRequest.GetRequestStream()
    $fileStream = [System.IO.File]::OpenRead($FilePath)

    try {
      $fileStream.CopyTo($requestStream)
    }
    finally {
      $fileStream.Close()
      $requestStream.Close()
    }

    $uploadResponse = $uploadRequest.GetResponse()
    $uploadResponse.Close()
    return $true
  }
  catch [System.Net.WebException] {
    $ftpResponse = $_.Exception.Response
    $statusCode = $null

    if ($ftpResponse) {
      $statusCode = [int]$ftpResponse.StatusCode
      $ftpResponse.Close()
    }

    if ($statusCode -eq 451 -or $statusCode -eq 450 -or $statusCode -eq 452) {
      Write-Warning "Upload failed with FTP $statusCode for $Relative. Retrying with UsePassive=$AttemptUsePassive."
      Start-Sleep -Milliseconds 300
      try {
        $retryRequest = New-FtpRequest -Uri $Uri -Method ([System.Net.WebRequestMethods+Ftp]::UploadFile)
        $retryRequest.UsePassive = $AttemptUsePassive
        $retryRequest.ContentLength = $FileLength

        $retryRequestStream = $retryRequest.GetRequestStream()
        $retryFileStream = [System.IO.File]::OpenRead($FilePath)

        try {
          $retryFileStream.CopyTo($retryRequestStream)
        }
        finally {
          $retryFileStream.Close()
          $retryRequestStream.Close()
        }

        $retryResponse = $retryRequest.GetResponse()
        $retryResponse.Close()
        return $true
      }
      catch [System.Net.WebException] {
        $retryFtpResponse = $_.Exception.Response
        if ($retryFtpResponse) {
          $retryStatusCode = [int]$retryFtpResponse.StatusCode
          $retryFtpResponse.Close()
          Write-Warning "Retry with UsePassive=$AttemptUsePassive failed for $Relative (FTP $retryStatusCode)."
        }
        else {
          Write-Warning "Retry with UsePassive=$AttemptUsePassive failed for $Relative."
        }
      }
    }

    throw
  }
}

try {
  Write-Host "Ensuring remote folder /$remoteBase exists..."
  Ensure-RemoteDirectory -Dir $remoteBase

  $files = Get-ChildItem -LiteralPath $LocalRoot -File -Recurse

  $remoteDirs = @{}
  foreach ($file in $files) {
    $relative = $file.FullName.Substring($LocalRoot.Length).TrimStart('\\')
    $relative = $relative -replace '\\', '/'
    $remotePath = "$remoteBase/$relative"
    $remoteDir = [System.IO.Path]::GetDirectoryName($remotePath) -replace '\\', '/'
    if (-not [string]::IsNullOrWhiteSpace($remoteDir)) {
      $remoteDirs[$remoteDir] = $true
    }
  }

  foreach ($dir in $remoteDirs.Keys) {
    Ensure-RemoteDirectory -Dir $dir
  }

  if ($MaxParallel -le 1) {
    foreach ($file in $files) {
      $relative = $file.FullName.Substring($LocalRoot.Length).TrimStart('\\')
      $relative = $relative -replace '\\', '/'
      $remotePath = "$remoteBase/$relative"
      $uri = "ftp://$FtpHost`:$Port/$remotePath"

      Write-Host "Uploading $relative"
      $uploaded = Upload-FileWithRetry -Uri $uri -Relative $relative -FilePath $file.FullName -FileLength $file.Length -AttemptUsePassive $UsePassive

      if (-not $uploaded -and $AllowPassiveToggleFallback) {
        Write-Warning "Attempting passive mode fallback for $relative with UsePassive=$(-not $UsePassive)."
        $uploaded = Upload-FileWithRetry -Uri $uri -Relative $relative -FilePath $file.FullName -FileLength $file.Length -AttemptUsePassive (-not $UsePassive)
      }

      if (-not $uploaded) {
        throw "Upload failed for $relative"
      }
    }
  }
  else {
    Write-Host "Uploading with up to $MaxParallel parallel streams..."

    $uploadJob = {
      param($FilePath, $Relative, $FileLength, $FtpHost, $Port, $RemoteBase, $Username, $Password, $UseSsl, $AllowInsecureCertificate, $UsePassive, $AllowPassiveToggleFallback)

      $ErrorActionPreference = 'Stop'

      function ConvertTo-BoolInJob {
        param([object]$Value)

        if ($Value -is [bool]) { return $Value }

        $text = [string]$Value
        switch ($text.Trim().ToLowerInvariant()) {
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
          default { throw "Invalid boolean value '$text' inside upload job." }
        }
      }

      $UseSsl = ConvertTo-BoolInJob -Value $UseSsl
      $AllowInsecureCertificate = ConvertTo-BoolInJob -Value $AllowInsecureCertificate
      $UsePassive = ConvertTo-BoolInJob -Value $UsePassive
      $AllowPassiveToggleFallback = ConvertTo-BoolInJob -Value $AllowPassiveToggleFallback

      function Invoke-UploadAttempt {
        param([object]$AttemptUsePassive)

        $AttemptUsePassive = ConvertTo-BoolInJob -Value $AttemptUsePassive

        try {
          $request = [System.Net.FtpWebRequest]::Create("ftp://$FtpHost`:$Port/$RemoteBase/$Relative")
          $request.Credentials = New-Object System.Net.NetworkCredential($Username, $Password)
          $request.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
          $request.EnableSsl = $UseSsl
          $request.UseBinary = $true
          $request.UsePassive = $AttemptUsePassive
          $request.KeepAlive = $false
          $request.ContentLength = $FileLength

          $requestStream = $request.GetRequestStream()
          $fileStream = [System.IO.File]::OpenRead($FilePath)
          try {
            $fileStream.CopyTo($requestStream)
          }
          finally {
            $fileStream.Close()
            $requestStream.Close()
          }

          $response = $request.GetResponse()
          $response.Close()
          return @{ Success = $true; StatusCode = $null }
        }
        catch [System.Net.WebException] {
          $ftpResponse = $_.Exception.Response
          $statusCode = $null
          if ($ftpResponse) {
            $statusCode = [int]$ftpResponse.StatusCode
            $ftpResponse.Close()
          }
          return @{ Success = $false; StatusCode = $statusCode; ErrorMessage = $_.Exception.Message }
        }
      }

      $originalCallback = [System.Net.ServicePointManager]::ServerCertificateValidationCallback
      if ($UseSsl -and $AllowInsecureCertificate) {
        [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
      }

      try {
        $first = Invoke-UploadAttempt -AttemptUsePassive $UsePassive
        if ($first.Success) {
          return "OK|$Relative"
        }

        if ($first.StatusCode -eq 451 -or $first.StatusCode -eq 450 -or $first.StatusCode -eq 452) {
          Start-Sleep -Milliseconds 300
          $second = Invoke-UploadAttempt -AttemptUsePassive $UsePassive
          if ($second.Success) {
            return "OK|$Relative|retry"
          }
          if ($AllowPassiveToggleFallback) {
            $fallback = Invoke-UploadAttempt -AttemptUsePassive (-not $UsePassive)
            if ($fallback.Success) {
              return "OK|$Relative|fallback"
            }
            throw "Upload failed for $Relative after fallback. Last FTP status: $($fallback.StatusCode)."
          }
          throw "Upload failed for $Relative after retry. Last FTP status: $($second.StatusCode)."
        }

        throw "Upload failed for $Relative. FTP status: $($first.StatusCode). Error: $($first.ErrorMessage)"
      }
      finally {
        if ($UseSsl -and $AllowInsecureCertificate) {
          [System.Net.ServicePointManager]::ServerCertificateValidationCallback = $originalCallback
        }
      }
    }

    $queue = New-Object System.Collections.Generic.Queue[object]
    foreach ($file in $files) {
      $relative = $file.FullName.Substring($LocalRoot.Length).TrimStart('\\')
      $relative = $relative -replace '\\', '/'
      $queue.Enqueue(@($file.FullName, $relative, $file.Length))
    }

    $runningJobs = @()
    $hadErrors = $false

    while ($queue.Count -gt 0 -or $runningJobs.Count -gt 0) {
      while ($queue.Count -gt 0 -and $runningJobs.Count -lt $MaxParallel) {
        $item = $queue.Dequeue()
        Write-Host "Uploading $($item[1])"
        $job = Start-Job -ScriptBlock $uploadJob -ArgumentList $item[0], $item[1], $item[2], $FtpHost, $Port, $remoteBase, $Username, $Password, $UseSsl, $AllowInsecureCertificate, $UsePassive, $AllowPassiveToggleFallback
        $runningJobs += $job
      }

      $completed = Wait-Job -Job $runningJobs -Any -Timeout 2
      if ($completed) {
        foreach ($job in @($completed)) {
          try {
            $output = Receive-Job -Job $job -ErrorAction Stop
            foreach ($line in $output) {
              if ($line -like 'OK|*|retry') {
                $parts = $line.Split('|')
                Write-Warning "Upload failed once for $($parts[1]). Retry succeeded with UsePassive=$UsePassive."
              }
              elseif ($line -like 'OK|*|fallback') {
                $parts = $line.Split('|')
                Write-Warning "Upload required passive fallback for $($parts[1])."
              }
            }
          }
          catch {
            $hadErrors = $true
            Write-Error $_
          }
          finally {
            Remove-Job -Job $job -Force
            $runningJobs = @($runningJobs | Where-Object { $_.Id -ne $job.Id })
          }
        }
      }
    }

    if ($hadErrors) {
      throw 'One or more parallel uploads failed.'
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
