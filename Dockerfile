FROM node:16 as builder
SHELL ["/bin/bash", "-c"]
WORKDIR /tmp
COPY package.json tsconfig.json yarn.lock /tmp/
RUN npm install
COPY ./src ./src
RUN npm run build

FROM node:16-buster-slim as web-builder
WORKDIR /tmp
COPY web /tmp
WORKDIR /tmp/web
RUN yarn
RUN yarn build

FROM node:16-buster-slim
WORKDIR /usr/src/app
COPY package.json ./
RUN apt-get update && apt-get install openssl -y
RUN npm install
COPY --from=builder /tmp/build ./build
COPY --from=web-builder /tmp/dist ./web/dist
COPY ./prisma ./prisma
RUN npx prisma generate
EXPOSE 8000
CMD npm start