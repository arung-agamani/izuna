FROM node:18 as builder
SHELL ["/bin/bash", "-c"]
WORKDIR /tmp
COPY package.json yarn.lock /tmp/
RUN yarn install --frozen-lockfile
COPY ./src ./src
RUN yarn build

FROM node:18-alpine as web-builder
WORKDIR /tmp
COPY web /tmp
WORKDIR /tmp/web
COPY package.json yarn.lock /tmp/web/
RUN yarn install --frozen-lockfile
RUN yarn build

FROM node:18-alpine
LABEL org.opencontainers.image.source="https://github.com/arung-agamani/izuna"
WORKDIR /usr/src/app
COPY package.json yarn.lock ./
RUN apk add --no-cache openssl git
RUN yarn install --frozen-lockfile --production
COPY --from=builder /tmp/build ./build
COPY --from=web-builder /tmp/dist ./web/dist
COPY ./prisma ./prisma
ENV NODE_ENV prod
RUN npx prisma generate
EXPOSE 8000
CMD yarn start
