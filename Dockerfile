FROM docker.io/node:9.8.0-alpine AS build


RUN apk add --no-cache ca-certificates wget
# flow requires glibc: https://github.com/facebook/flow/issues/3649
RUN wget -q -O /etc/apk/keys/sgerrand.rsa.pub https://raw.githubusercontent.com/sgerrand/alpine-pkg-glibc/master/sgerrand.rsa.pub && \
  wget -q https://github.com/sgerrand/alpine-pkg-glibc/releases/download/2.27-r0/glibc-2.27-r0.apk && \
  apk add glibc-2.27-r0.apk

WORKDIR /opt
COPY package.json yarn.lock ./
RUN yarn install --dev

COPY . ./
RUN yarn run check
RUN yarn build

# Cleanup sources and dev deps
RUN yarn install --production

FROM docker.io/node:9.8.0-alpine
WORKDIR /opt
COPY --from=build /opt/package.json ./package.json
COPY --from=build /opt/node_modules ./node_modules
COPY --from=build /opt/lib ./lib
RUN du -sh .
RUN du -sh node_modules

USER node
CMD [ "node", "lib/index.js" ]
