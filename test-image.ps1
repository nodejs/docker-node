Param($node_version)

If ("$(node -e "process.stdout.write(process.versions.node)")" -ne "$node_version") {
  Write-Error "Test for node failed!"
}
Write-Output "Test for node succeeded."

npm --version *>$null
If (!$?) {
  Write-Error "Test for npm failed!"
}
Write-Output "Test for npm succeeded."

yarn --version *>$null
If (!$?) {
  Write-Error "Test for yarn failed!"
}
Write-Output "Test for yarn succeeded."
