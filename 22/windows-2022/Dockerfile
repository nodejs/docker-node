FROM mcr.microsoft.com/windows/servercore:ltsc2022 as installer

SHELL ["powershell", "-Command", "$ErrorActionPreference = 'Stop'; $ProgressPreference = 'SilentlyContinue';"]

# PATH isn't actually set in the Docker image, so we have to set it from within the container
RUN $newPath = ('C:\Program Files (x86)\GnuPG\bin;{0}' -f $env:PATH); \
	Write-Host ('Updating PATH: {0}' -f $newPath); \
	[Environment]::SetEnvironmentVariable('PATH', $newPath, [EnvironmentVariableTarget]::Machine)
# doing this first to share cache across versions more aggressively

ENV NODE_VERSION 22.7.0
ENV NODE_CHECKSUM 3fc638727974262b4f65a6b1b43c22fb2d80671cdcb50e1237e0b05d1330aaf7

ENV GPG_VERSION 2.4.5_20240307

RUN Invoke-WebRequest $('https://www.gnupg.org/ftp/gcrypt/binary/gnupg-w32-{0}.exe' -f $env:GPG_VERSION) -OutFile 'gpg-installer.exe'; \
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
      gpg --keyserver hkps://keys.openpgp.org --recv-keys $_ ; \
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

RUN $newPath = ('C:\nodejs;{0}' -f $env:PATH); \
	Write-Host ('Updating PATH: {0}' -f $newPath); \
	[Environment]::SetEnvironmentVariable('PATH', $newPath, [EnvironmentVariableTarget]::Machine)

COPY --from=installer C:/nodejs C:/nodejs

COPY docker-entrypoint.ps1 C:/docker-entrypoint.ps1
ENTRYPOINT [ "powershell.exe" , "C:/docker-entrypoint.ps1" ]

# Smoke test
RUN node --version; \
	npm --version;
	
CMD [ "node.exe" ]