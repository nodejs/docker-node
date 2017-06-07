FROM node:4.8.1-nanoserver

RUN mkdir \app
WORKDIR /app

ONBUILD COPY package.json package.json
ONBUILD RUN npm install ; Remove-Item $($env:APPDATA + '\npm-cache') -Force -Recurse ; Remove-Item $($env:TEMP + '\npm-*') -Force -Recurse
ONBUILD COPY . .

CMD [ "npm.cmd", "start" ]
