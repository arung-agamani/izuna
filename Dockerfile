FROM node:18 as builder
SHELL ["/bin/bash", "-c"]
WORKDIR /tmp
COPY package.json yarn.lock tsconfig.json /tmp/
RUN yarn install --frozen-lockfile
COPY ./prisma ./prisma
RUN npx prisma generate
COPY ./src ./src
RUN yarn build

FROM node:18-alpine as web-builder
WORKDIR /tmp/web
COPY web/package.json web/yarn.lock ./
RUN yarn install --frozen-lockfile
COPY web ./
RUN yarn build

FROM node:18-alpine
LABEL org.opencontainers.image.source="https://github.com/arung-agamani/izuna"
WORKDIR /usr/src/app
COPY package.json yarn.lock ./
RUN apk add --no-cache openssl git
RUN yarn install --frozen-lockfile --production
COPY --from=builder /tmp/build ./build
COPY --from=web-builder /tmp/web/dist ./web/dist
COPY ./prisma ./prisma
ENV NODE_ENV prod
RUN npx prisma generate
EXPOSE 8000
CMD yarn start
