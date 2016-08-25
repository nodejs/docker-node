docker build --isolation=hyperv -t node:4.8.1-nanoserver 4.8/windows/nanoserver
docker build --isolation=hyperv -t node:4.8.1-nanoserver-onbuild 4.8/windows/nanoserver/onbuild

docker build --isolation=hyperv -t node:6.10.1-nanoserver 6.10/windows/nanoserver
docker build --isolation=hyperv -t node:6.10.1-nanoserver-onbuild 6.10/windows/nanoserver/onbuild

docker build --isolation=hyperv -t node:7.7.4-nanoserver 7.7/windows/nanoserver
docker build --isolation=hyperv -t node:7.7.4-nanoserver-onbuild 7.7/windows/nanoserver/onbuild
