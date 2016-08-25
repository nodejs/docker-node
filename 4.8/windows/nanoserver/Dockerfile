FROM microsoft/nanoserver

SHELL ["powershell", "-Command", "$ErrorActionPreference = 'Stop'; $ProgressPreference = 'SilentlyContinue';"]

ENV NPM_CONFIG_LOGLEVEL info
ENV NODE_VERSION 4.8.1
ENV NODE_SHA256 edb47c31de7891ddb58d5e1024e31c91b49b4f2226cf6c3e0c41e715ee6111e4

RUN Invoke-WebRequest $('https://nodejs.org/dist/v{0}/node-v{0}-win-x64.zip' -f $env:NODE_VERSION) -OutFile 'node.zip' -UseBasicParsing ; \
    if ((Get-FileHash node.zip -Algorithm sha256).Hash -ne $env:NODE_SHA256) {exit 1} ; \
    Expand-Archive node.zip -DestinationPath C:\ ; \
    Rename-Item -Path $('C:\node-v{0}-win-x64' -f $env:NODE_VERSION) -NewName 'C:\nodejs' ; \
    New-Item $($env:APPDATA + '\npm') ; \
    $env:PATH = 'C:\nodejs;{0}\npm;{1}' -f $env:APPDATA, $env:PATH ; \
    Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment\' -Name Path -Value $env:PATH ; \
    Remove-Item -Path node.zip

CMD [ "node.exe" ]
