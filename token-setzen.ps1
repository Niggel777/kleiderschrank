# Hinterlegt deinen Hugging-Face-Token als geheimes Secret in der Supabase-Funktion "anprobe".
# Der Token wird verdeckt abgefragt, landet nicht im Verlauf und nicht im Code.
# (Nur ASCII-Zeichen, weil Windows PowerShell 5.1 UTF-8-Dateien ohne BOM falsch liest.)
$sicher = Read-Host -AsSecureString "Hugging-Face-Token (beginnt mit hf_) einfuegen und Enter druecken"
$token = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sicher)).Trim()
if (-not $token.StartsWith("hf_")) {
  Write-Host "Das sieht nicht nach einem Hugging-Face-Token aus (hf_...). Bitte erneut starten." -ForegroundColor Red
  exit 1
}
npx --yes supabase@2.122.0 secrets set "HF_TOKEN=$token" --project-ref dcdfwhmwuzqqjpufshsc
$ok = $LASTEXITCODE -eq 0
Remove-Variable token, sicher
if ($ok) { Write-Host "Fertig - die KI-Anprobe nutzt jetzt deinen Token." -ForegroundColor Green }
else { Write-Host "Das Speichern hat nicht geklappt (siehe Meldung oben)." -ForegroundColor Red }
