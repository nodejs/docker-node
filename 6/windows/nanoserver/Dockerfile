FROM microsoft/windowsservercore as download

SHELL ["powershell", "-Command", "$ErrorActionPreference = 'Stop'; $ProgressPreference = 'SilentlyContinue';"]

ENV NODE_VERSION 6.14.2

ENV GPG_VERSION 2.3.4

RUN [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12 ; \
    Invoke-WebRequest $('https://files.gpg4win.org/gpg4win-vanilla-{0}.exe' -f $env:GPG_VERSION) -OutFile 'gpg4win.exe' -UseBasicParsing ; \
    Start-Process .\gpg4win.exe -ArgumentList '/S' -NoNewWindow -Wait ;

RUN @( \
      '94AE36675C464D64BAFA68DD7434390BDBE9B9C5', \
      'FD3A5288F042B6850C66B31F09FE44734EB7990E', \
      '71DCFD284A79C3B38668286BC97EC7A07EDE3FC1', \
      'DD8F2338BAE7501E3DD5AC78C273792F7D83545D', \
      'C4F0DFFF4E8C1A8236409D08E73BC641CC11F4C8', \
      'B9AE9905FFD7803F25714661B63B535A4C206CA9', \
      '56730D5401028683275BD23C23EFEFE93C4CFFFE', \
      '77984A986EBC2AA786BC0F66B01FBB92821C587A', \
      '8FCCA13FEF1D0C2E91008E09770F7A9A5AE15600' \
    ) | foreach { \
      gpg --keyserver ha.pool.sks-keyservers.net --recv-keys $_ ; \
    } ; \
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12 ; \
    Invoke-WebRequest $('https://nodejs.org/dist/v{0}/SHASUMS256.txt.asc' -f $env:NODE_VERSION) -OutFile 'SHASUMS256.txt.asc' -UseBasicParsing ; \
    gpg --batch --decrypt --output SHASUMS256.txt SHASUMS256.txt.asc ; \
    Invoke-WebRequest $('https://nodejs.org/dist/v{0}/node-v{0}-win-x64.zip' -f $env:NODE_VERSION) -OutFile 'node.zip' -UseBasicParsing ; \
    $sum = $(cat SHASUMS256.txt.asc | sls $('  node-v{0}-win-x64.zip' -f $env:NODE_VERSION)) -Split ' ' ; \
    if ((Get-FileHash node.zip -Algorithm sha256).Hash -ne $sum[0]) { Write-Error 'SHA256 mismatch' } ; \
    Expand-Archive node.zip -DestinationPath C:\ ; \
    Rename-Item -Path $('C:\node-v{0}-win-x64' -f $env:NODE_VERSION) -NewName 'C:\nodejs'

ENV YARN_VERSION 1.6.0

RUN [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12 ; \
    Invoke-WebRequest $('https://yarnpkg.com/downloads/{0}/yarn-{0}.msi' -f $env:YARN_VERSION) -OutFile yarn.msi -UseBasicParsing ; \
    $sig = Get-AuthenticodeSignature -filepath yarn.msi ; \
    if ($sig.Status -ne 'Valid') { Write-Error 'Authenticode signature is not valid' } ; \
    if (@( \
      'AF764E1EA56C762617BDC757C8B0F3780A0CF5F9' \
      ) -notcontains $sig.SignerCertificate.Thumbprint) { Write-Error 'Unknown signer certificate' } ; \
    Start-Process msiexec.exe -ArgumentList '/i', 'yarn.msi', '/quiet', '/norestart' -NoNewWindow -Wait

FROM microsoft/nanoserver

SHELL ["powershell", "-Command", "$ErrorActionPreference = 'Stop'; $ProgressPreference = 'SilentlyContinue';"]

ENV NODE_VERSION 6.14.2
ENV YARN_VERSION 1.6.0

COPY --from=download /nodejs /nodejs
COPY --from=download [ "/Program Files (x86)/yarn", "/yarn" ]

RUN New-Item $($env:APPDATA + '\npm') -Type Directory ; \
    $env:PATH = 'C:\nodejs;{0}\npm;C:\yarn\bin;{1}' -f $env:APPDATA, $env:PATH ; \
    Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment\' -Name Path -Value $env:PATH

CMD [ "node.exe" ]
