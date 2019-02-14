#!/bin/bash
set -ue

for dockerfile in **/alpine/Dockerfile; do
  # shellcheck disable=SC2016
  sed -Ei -e 's/# Travis CI build deps injection/      ccache netcat-openbsd \\/' \
    -e "s/# Travis CI ccache env setup and cache restore/&\n    \&\& nc -v \"\$HOST_IP\" 5678 | tar -xz -C \/ || true \\\/" \
    -e "s/# Travis CI ccache env setup and cache restore/&\n    \&\& HOST_IP=\"\$(ip route | awk '\/default\/ { print \$3 \}')\" \\\/" \
    -e 's/# Travis CI ccache env setup and cache restore/&\n    \&\& ccache --set-config=max_size=150MB \\/' \
    -e 's/# Travis CI ccache env setup and cache restore/\&\& export PATH="\/usr\/lib\/ccache\/bin\/:$PATH" \\/' \
    -e 's/# Travis CI ccache store and cleanup/&\n    \&\& rm -rf \/root\/.ccache\/ \\/' \
    -e 's/# Travis CI ccache store and cleanup/\&\& tar -czf - \/root\/.ccache\/ | nc -v -w 3 "$HOST_IP" 1234 || true \\/' "${dockerfile}"
done
