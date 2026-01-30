# Deploy Script for Windows
Write-Host "Iniciando Deploy do WhatsApp Webhook..." -ForegroundColor Green

# Tenta usar o comando npx supabase
npx supabase functions deploy whatsapp-webhook --no-verify-jwt --project-ref qxralytyrytjqizuouhz

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCESSO! Deploy finalizado." -ForegroundColor Cyan
} else {
    Write-Host "Falha no deploy. Tentando via 'supabase' direto..." -ForegroundColor Yellow
    supabase functions deploy whatsapp-webhook --no-verify-jwt --project-ref qxralytyrytjqizuouhz
}

Read-Host -Prompt "Pressione Enter para sair"
