$ErrorActionPreference = 'Stop'

ForEach ($Dir in dir -directory | where { $_.Name -ne "docs" }) {
  $tag = ((cat $Dir\windows\windowsservercore\Dockerfile | Select-String -Pattern 'ENV NODE_VERSION') -split ' ')[2]

  $variants = @('windowsservercore', 'nanoserver')
  ForEach ($variant in $variants) {
    Write-Host Building node:$tag-$variant
    docker build -t node:$tag-$variant $Dir/windows/$variant

    $OUTPUT=$(docker run --rm node:$tag-$variant node -e "process.stdout.write(process.versions.node)")
    if ( "$OUTPUT" -Ne "$tag" ) {
      Write-Error "Test of $tag-$variant failed!"
    } else {
      Write-Host "Test of $tag-$variant succeeded."
    }
  }
}
