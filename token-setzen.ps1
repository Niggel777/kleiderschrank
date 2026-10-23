# Hinterlegt deinen Hugging-Face-Token als geheimes Secret in der Supabase-Funktion "anprobe".
# Der Token wird verdeckt abgefragt, landet nicht im Verlauf und nicht im Code.
$sicher = Read-Host -AsSecureString "Hugging-Face-Token (beginnt mit hf_) einfügen und Enter drücken"
$token = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sicher))
if (-not $token.StartsWith("hf_")) { Write-Host "Das sieht nicht nach einem Hugging-Face-Token aus (hf_...)." -ForegroundColor Red; exit 1 }
npx supabase@2.122.0 secrets set "HF_TOKEN=$token" --project-ref dcdfwhmwuzqqjpufshsc
Remove-Variable token, sicher
Write-Host "Fertig – die KI-Anprobe nutzt jetzt deinen Token." -ForegroundColor Green
