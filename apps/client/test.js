const { execSync } = require('child_process');
try {
  const cmd = 'powershell -NoProfile -Command "$mp = Get-MpComputerStatus; $sig = if ($null -ne $mp.AntivirusSignatureLastUpdated) { Get-Date $mp.AntivirusSignatureLastUpdated -Format o } else { $null }; [PSCustomObject]@{ rt = $mp.RealTimeProtectionEnabled; sig = $sig } | ConvertTo-Json -Compress"';
  const mpStatus = execSync(cmd, { encoding: 'utf8' });
  console.log(mpStatus);
} catch(e) { console.error(e) }
