$files = @(
  "E:\ABU\abuz8ai-site\tools\ai-background-remover-pro.html",
  "E:\ABU\abuz8ai-site\tools\ai-qr-art-pro.html",
  "E:\ABU\abuz8ai-site\scripts\studio_configs_2026_08_11.py",
  "E:\ABU\abuz8ai-site\scripts\inject_studio_2026_08_11.py"
)
foreach ($f in $files) {
  $h = Get-FileHash -Algorithm SHA256 -Path $f
  Write-Output ($h.Path + " => " + $h.Hash)
}
