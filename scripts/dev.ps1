<#
    Ô'resto · lancer le site et son API en local

        pwsh -File scripts/dev.ps1        (ou : powershell -File scripts\dev.ps1)

    Pourquoi ce script plutôt qu'un simple « swa start ».

    Azure Functions Core Tools ne tourne que sur Node 18, 20 ou 22, alors que
    la machine a Node 24 par défaut. Mettre Node 20 en tête du PATH ne suffit
    pas : le raccourci swa.cmd créé par npm contient

        IF EXIST "%dp0%\node.exe" ( SET "_prog=%dp0%\node.exe" )

    et comme le préfixe global de npm est ici le dossier d'installation de
    Node 24, lequel contient node.exe, le raccourci se lie en dur à Node 24 et
    ignore le PATH. C'est la raison exacte pour laquelle la manipulation
    habituelle échoue.

    La parade tient en une ligne : on n'appelle pas le raccourci, on donne
    directement le point d'entrée JavaScript de swa à Node 20. Le PATH, lui,
    reste utile pour func.exe, qui cherche son node par ce biais.

    Rien n'est modifié sur la machine : ni le PATH permanent, ni les paquets
    globaux, ni l'installation de Node 24, qui continue de servir à tout le
    reste du projet.
#>

param(
    # Arrête d'office les func / swa restés en vie d'un lancement précédent.
    [switch]$Nettoyer
)

$ErrorActionPreference = 'Stop'

$Node20  = 'C:\Users\tawfik\AppData\Local\node20\node-v20.18.1-win-x64'
$Node24  = 'C:\Users\tawfik\AppData\Local\Programs\nodejs'
$FuncDir = 'C:\Users\tawfik\AppData\Local\azure-functions-core-tools'
$SwaBin  = Join-Path $Node24 'node_modules\@azure\static-web-apps-cli\dist\cli\bin.js'

foreach ($chemin in @("$Node20\node.exe", "$FuncDir\func.exe", $SwaBin)) {
    if (-not (Test-Path $chemin)) { throw "Introuvable : $chemin" }
}

$racine = Split-Path $PSScriptRoot -Parent
Set-Location $racine

if (-not (Test-Path 'api\local.settings.json')) {
    throw "api\local.settings.json manquant. Copiez api\local.settings.json.exemple et renseignez-le."
}
if (-not (Test-Path 'api\node_modules')) {
    throw "Dependances de l'API absentes. Lancez : cd api ; npm install"
}

# --------------------------------------------------------------------------
# Contrôle des ports.
#
# Un func laissé en vie d'un essai précédent garde le port 7071. swa démarre
# alors quand même, sa tentative de lancer l'API échoue en silence dans le flux
# d'erreur, et c'est l'ancien processus qui répond : on croit tester le code du
# jour alors qu'on interroge celui d'hier. Le symptôme est déroutant, d'où ce
# contrôle explicite.
# --------------------------------------------------------------------------
$occupes = @()
foreach ($port in @(7071, 4280)) {
    $lien = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($lien) {
        $proc = Get-Process -Id $lien[0].OwningProcess -ErrorAction SilentlyContinue
        $occupes += [pscustomobject]@{ Port = $port; Pid = $proc.Id; Nom = $proc.ProcessName }
    }
}

if ($occupes) {
    if ($Nettoyer) {
        foreach ($o in $occupes) {
            Write-Host "  arret de $($o.Nom) (pid $($o.Pid)) qui tenait le port $($o.Port)"
            Stop-Process -Id $o.Pid -Force -ErrorAction SilentlyContinue
        }
        # Les processus enfants de func mettent un instant à lâcher le port.
        Start-Sleep -Seconds 2
    } else {
        $liste = ($occupes | ForEach-Object { "port $($_.Port) tenu par $($_.Nom) (pid $($_.Pid))" }) -join "`n  "
        throw @"
Des processus occupent deja les ports du serveur local :
  $liste

Relancez avec -Nettoyer pour les arreter :
  powershell -File scripts\dev.ps1 -Nettoyer
"@
    }
}

# Node 20 en tête pour cette session seulement : c'est ce que func.exe
# trouvera quand il cherchera son interpréteur.
$env:Path = "$Node20;$FuncDir;$env:Path"

Write-Host ''
Write-Host "  node (pour func) : $(& "$Node20\node.exe" -v)"
Write-Host "  func             : $(& "$FuncDir\func.exe" --version)"
Write-Host "  swa              : lance sous Node 20, sans passer par swa.cmd"
Write-Host ''
Write-Host '  Site  : http://localhost:4280'
Write-Host '  Admin : http://localhost:4280/admin'
Write-Host '  Codes : http://localhost:4280/qr'
Write-Host ''

& "$Node20\node.exe" $SwaBin start . --api-location api @args
