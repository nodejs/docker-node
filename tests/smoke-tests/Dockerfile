RUN apt-get update \
 && apt-get install -y --force-yes --no-install-recommends\
      git \
      ca-certificates \
      ssh-client \
 && rm -rf /var/lib/apt/lists/*;

ENV NODE_ENV dev
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
RUN npm config set spin=false
ADD ./smoke_test.sh ./smoke_test.sh
RUN chmod +x ./smoke_test.sh
RUN ./smoke_test.sh
