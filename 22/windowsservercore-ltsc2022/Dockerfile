FROM mcr.microsoft.com/windows/servercore:ltsc2022

SHELL ["powershell", "-Command", "$ErrorActionPreference = 'Stop'; $ProgressPreference = 'SilentlyContinue';"]

# PATH isn't actually set in the Docker image, so we have to set it from within the container
RUN $newPath = ('C:\nodejs;{0};{0}' -f $env:PATH); \
    [Environment]::SetEnvironmentVariable('PATH', $newPath, [EnvironmentVariableTarget]::Machine)
# doing this first to share cache across versions more aggressively

ENV NODE_VERSION 22.9.0
ENV NODE_CHECKSUM 8af226c0aa71fefe5228e881f4b5c5d90a8b41c290b96f44f56990d8dc3fac1c

RUN [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 ; \
    Invoke-WebRequest $('https://nodejs.org/dist/v{0}/node-v{0}-win-x64.zip' -f $env:NODE_VERSION) -OutFile 'node.zip' -UseBasicParsing ; \
    if ((Get-FileHash node.zip -Algorithm sha256).Hash -ne $env:NODE_CHECKSUM) { Write-Error 'SHA256 mismatch' } ; \
    Expand-Archive node.zip -DestinationPath C:\ ; \
    Rename-Item -Path $('C:\node-v{0}-win-x64' -f $env:NODE_VERSION) -NewName 'C:\nodejs' ; \
    Remove-Item node.zip -Force ; \
    node --version; \
    npm --version;
