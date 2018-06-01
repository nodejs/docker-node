param ([String[]] $versionsArg, [String[]] $variantsArg)
# Allow comma delimited cli arguments to filter versions and variants
# E.g. .\test-build.ps1 8,10 windowsservercore,nanoserver

$ErrorActionPreference = 'Stop'

$defaultWindowsVariant=((Get-Content config | Select-String -Pattern 'default_windows_variant') -split ' ')[1]

Function Get-Version {
  $versions = Get-ChildItem -name -directory | Where-Object { ($_ -ne ".git") -and ($_ -ne "docs") -and ($_ -ne "keys") -and ($_ -notcontains "chakracore") }

  If ($versionsArg) {
    $filteredVersions = @()

    ForEach ($version in $versionsArg) {
      If ($versions.Contains($version)) {
        $filteredVersions += $version
      }
    }

    If ($filteredVersions.length -gt 0) {
      return $filteredVersions
    }
  }
  return $versions
}

Function Get-Variant {
  $variants=(((Get-Content architectures | Select-String -Pattern 'windows-amd64') -split ' ')[1] -split ',')

  if ($variantsArg) {
    $filteredVariants = @()

    ForEach ($variant in $variantsArg) {
      If ($variants.Contains($variant)) {
        $filteredVariants += $variant
      }
    }

    If ($filteredVariants.length -gt 0) {
      return $filteredVariants
    }
  }
  return $variants
}

Function Build {
  param ( $version, $variant, $tag )

  $full_tag="$tag-$variant"

  Write-Output "Building node:$full_tag"
  docker build -t node:$full_tag $version/windows/$variant
  if ( $? -eq $FALSE ) {
    Write-Error "Build of $full_tag failed!"
  }
  Write-Output "Testing of $full_tag"
  $path = (Get-Location).path.replace('\', '/')
  docker run --rm -v "$path/:C:/docker-node/" node:"$full_tag" powershell "C:\docker-node\test-image.ps1" "$tag"
}

ForEach ($Dir in Get-Version) {
  $tag = ((Get-Content $Dir\windows\$defaultWindowsVariant\Dockerfile | Select-String -Pattern 'ENV NODE_VERSION') -split ' ')[2]

  ForEach ($variant in Get-Variant) {
    Build $Dir $variant $tag
  }
}
