$games = Get-Content games.js
$index = Get-Content index.html
$newLines = @()
$injected = $false

foreach ($line in $index) {
    # Skip the external script reference
    if ($line -like '*src="games.js"*') { continue }

    $newLines += $line

    # Inject games data after the opening script tag
    if (-not $injected -and $line.Trim() -eq '<script>') {
        $newLines += $games
        $injected = $true
    }
}

$newLines | Set-Content index.html
