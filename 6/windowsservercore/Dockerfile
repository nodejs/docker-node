FROM microsoft/windowsservercore:1803

SHELL ["powershell", "-Command", "$ErrorActionPreference = 'Stop'; $ProgressPreference = 'SilentlyContinue';"]

ENV NODE_VERSION 6.14.3

RUN [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 ; \
    Invoke-WebRequest $('https://nodejs.org/dist/v{0}/node-v{0}-x64.msi' -f $env:NODE_VERSION) -OutFile "$env:Temp\node.msi" -UseBasicParsing ; \
    $sig = Get-AuthenticodeSignature -filepath "$env:Temp\node.msi" ; \
    if ($sig.Status -ne 'Valid') { Write-Error 'Authenticode signature is not valid' } ; \
    if (@( \
      'db2f847aed75d4586000c83cad0607fdc12aa2bd' \
      ) -notcontains $sig.SignerCertificate.Thumbprint) { Write-Error 'Unknown signer certificate' } ; \
    Start-Process msiexec.exe -ArgumentList '/i', "$env:Temp\node.msi", '/quiet', '/norestart' -NoNewWindow -Wait; \
    Remove-Item -Path "$env:Temp\node.msi"

ENV YARN_VERSION 1.6.0

RUN [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 ; \
    Invoke-WebRequest $('https://yarnpkg.com/downloads/{0}/yarn-{0}.msi' -f $env:YARN_VERSION) -OutFile "$env:Temp\yarn.msi" -UseBasicParsing ; \
    $sig = Get-AuthenticodeSignature -filepath "$env:Temp\yarn.msi" ; \
    if ($sig.Status -ne 'Valid') { Write-Error 'Authenticode signature is not valid' } ; \
    if (@( \
      'AF764E1EA56C762617BDC757C8B0F3780A0CF5F9' \
      ) -notcontains $sig.SignerCertificate.Thumbprint) { Write-Error 'Unknown signer certificate' } ; \
    Start-Process msiexec.exe -ArgumentList '/i', "$env:Temp\yarn.msi", '/quiet', '/norestart' -NoNewWindow -Wait; \
    Remove-Item -Path "$env:Temp\yarn.msi"

CMD [ "node.exe" ]
