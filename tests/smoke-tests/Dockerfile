ENV NODE_ENV dev
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
RUN npm config set spin=false
ADD ./smoke_test.sh ./smoke_test.sh
RUN chmod +x ./smoke_test.sh
RUN ./smoke_test.sh
