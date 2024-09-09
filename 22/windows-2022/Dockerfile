FROM mcr.microsoft.com/windows/servercore:ltsc2022 as installer

SHELL ["powershell", "-Command", "$ErrorActionPreference = 'Stop'; $ProgressPreference = 'SilentlyContinue';"]

# PATH isn't actually set in the Docker image, so we have to set it from within the container
RUN $newPath = ('C:\Program Files (x86)\GnuPG\bin;{0}' -f $env:PATH); \
    Write-Host ('Updating PATH: {0}' -f $newPath); \
    [Environment]::SetEnvironmentVariable('PATH', $newPath, [EnvironmentVariableTarget]::Machine)
# doing this first to share cache across versions more aggressively

ENV NODE_VERSION 22.8.0
ENV NODE_CHECKSUM d6e1c4fca93997224cac0bec09b4201aa018f50171d38c6b85abe483012839c9

# Version and checksum of the GPG installer (Source: https://www.gnupg.org/download/integrity_check.html)
ENV GPG_VERSION 2.4.5_20240307
ENV GPG_CHECKSUM d2ac821ceacf9409ebcdb42ae330087ada30c732981f00b356f9c2f08fac4dc1

RUN Invoke-WebRequest $('https://www.gnupg.org/ftp/gcrypt/binary/gnupg-w32-{0}.exe' -f $env:GPG_VERSION) -OutFile 'gpg-installer.exe'; \
  if ((Get-FileHash gpg-installer.exe -Algorithm sha256).Hash -ne $env:GPG_CHECKSUM) { Write-Error 'GPG checksum mismatch' }; \
  Start-Process -FilePath 'gpg-installer.exe' -ArgumentList '/S' -Wait; \
  gpg --version;

RUN @( \
      '4ED778F539E3634C779C87C6D7062848A1AB005C', \
      '141F07595B7B3FFE74309A937405533BE57C7D57', \
      '74F12602B6F1C4E913FAA37AD3A89613643B6201', \
      'DD792F5973C6DE52C432CBDAC77ABFA00DDBF2B7', \
      '61FC681DFB92A079F1685E77973F295594EC4689', \
      '8FCCA13FEF1D0C2E91008E09770F7A9A5AE15600', \
      'C4F0DFFF4E8C1A8236409D08E73BC641CC11F4C8', \
      '890C08DB8579162FEE0DF9DB8BEAB4DFCF555EF4', \
      'C82FA3AE1CBEDC6BE46B9360C43CEC45C17AB93C', \
      '108F52B48DB57BB0CC439B2997B01419BD92F80A', \
      'A363A499291CBBC940DD62E41F10027AF002F8B0', \
      'CC68F5A3106FF448322E48ED27F5E38D5B0A215F' \
    ) | foreach { \
      gpg --batch --keyserver hkps://keys.openpgp.org --recv-keys $_ ; \
      if (-not $?) { \
        gpg --batch --keyserver keyserver.ubuntu.com --recv-keys $_ ; \
      } \
    } ; \
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 ; \
    Invoke-WebRequest $('https://nodejs.org/dist/v{0}/SHASUMS256.txt.asc' -f $env:NODE_VERSION) -OutFile 'SHASUMS256.txt.asc' -UseBasicParsing ; \
    gpg --batch --decrypt --output SHASUMS256.txt SHASUMS256.txt.asc ; \
    Invoke-WebRequest $('https://nodejs.org/dist/v{0}/node-v{0}-win-x64.zip' -f $env:NODE_VERSION) -OutFile 'node.zip' -UseBasicParsing ; \
    $sum = $(cat SHASUMS256.txt.asc | sls $('  node-v{0}-win-x64.zip' -f $env:NODE_VERSION)) -Split ' ' ; \
    if ((Get-FileHash node.zip -Algorithm sha256).Hash -ne $sum[0]) { Write-Error 'SHA256 mismatch' } ; \
    Expand-Archive node.zip -DestinationPath C:\ ; \
    Rename-Item -Path $('C:\node-v{0}-win-x64' -f $env:NODE_VERSION) -NewName 'C:\nodejs'

FROM mcr.microsoft.com/windows/servercore:ltsc2022 as runner

SHELL ["powershell", "-Command", "$ErrorActionPreference = 'Stop'; $ProgressPreference = 'SilentlyContinue';"]

COPY --from=installer C:/nodejs C:/nodejs
COPY docker-entrypoint.ps1 C:/docker-entrypoint.ps1

RUN $newPath = ('C:\nodejs;{0}' -f $env:PATH); \
    Write-Host ('Updating PATH: {0}' -f $newPath); \
    [Environment]::SetEnvironmentVariable('PATH', $newPath, [EnvironmentVariableTarget]::Machine); \
    # Because we need to use it in the current session
    $env:PATH = $newPath; \
    node --version; \
    npm --version;

ENTRYPOINT [ "powershell.exe" , "C:/docker-entrypoint.ps1" ]

CMD [ "node.exe" ]
