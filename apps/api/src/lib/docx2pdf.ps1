param (
    [string]$docxPath,
    [string]$pdfPath
)
$ErrorActionPreference = "Stop"
$word = $null
$doc = $null

try {
    # Initialize MS Word Application via COM
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0

    # Open the document as read-only
    $doc = $word.Documents.Open($docxPath, $false, $true)

    # Save as PDF (wdFormatPDF = 17)
    $doc.SaveAs($pdfPath, 17)

    # Close document and Word
    $doc.Close($false)
    $word.Quit()
    Write-Output "SUCCESS"
} catch {
    Write-Error $_.Exception.Message
    if ($doc) {
        try { $doc.Close($false) } catch {}
    }
    if ($word) {
        try { $word.Quit() } catch {}
    }
    exit 1
}
