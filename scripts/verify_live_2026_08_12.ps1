$r = Invoke-WebRequest -Uri 'https://abuz8ai.com/tools/ai-background-remover-pro' -UseBasicParsing -MaximumRedirection 5
Write-Output ("status: " + $r.StatusCode)
Write-Output ("has studio marker: " + ($r.Content -match 'ABUZ8 LIVE STUDIO'))
Write-Output ("has comfy-studio.js ref: " + ($r.Content -match '_comfy-studio.js'))
Write-Output ("has Early Access CTA: " + ($r.Content -match 'Early Access'))

$r2 = Invoke-WebRequest -Uri 'https://abuz8ai.com/tools/_comfy-studio.js' -UseBasicParsing
Write-Output ("studio js status: " + $r2.StatusCode)

$r3 = Invoke-WebRequest -Uri 'https://abuz8ai.com/tools/ai-qr-art-pro' -UseBasicParsing -MaximumRedirection 5
Write-Output ("qr-art status: " + $r3.StatusCode)
Write-Output ("qr-art has studio marker (should be false): " + ($r3.Content -match 'ABUZ8 LIVE STUDIO'))
