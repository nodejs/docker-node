FROM microsoft/windowsservercore

SHELL ["powershell", "-Command", "$ErrorActionPreference = 'Stop';"]

ENV NPM_CONFIG_LOGLEVEL info
ENV NODE_VERSION 6.9.2

RUN $url = ('https://nodejs.org/dist/v{0}/node-v{0}-x64.msi' -f $env:NODE_VERSION); \
	Write-Host ('Downloading {0} ...' -f $url); \
	(New-Object System.Net.WebClient).DownloadFile($url, 'node.msi'); \
	\
	Write-Host 'Installing ...'; \
	Start-Process msiexec.exe -Wait \
		-ArgumentList @( \
			'/i', \
			'node.msi', \
			'/quiet', \
			'ALLUSERS=1', \
			'/passive', \
			'/norestart' \
		); \
	\
# the installer updated PATH, so we should refresh our local value
	$env:PATH = [Environment]::GetEnvironmentVariable('PATH', [EnvironmentVariableTarget]::Machine); \
	\
	Write-Host 'Verifying install ...'; \
	Write-Host '  node --version'; node --version; \
	\
	Write-Host 'Removing ...'; \
	Remove-Item node.msi -Force; \
	\
	Write-Host 'Complete.';

CMD ["node"]
