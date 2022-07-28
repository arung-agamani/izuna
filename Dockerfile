FROM node:16-buster-slim as builder
WORKDIR /tmp
COPY package.json tsconfig.json /tmp/
RUN npm install
COPY ./src ./src
RUN npm run build

FROM node:16-buster-slim
WORKDIR /usr/src/app
COPY package.json ./
RUN apt-get update && apt-get install openssl -y
RUN npm install
COPY --from=builder /tmp/build ./build
COPY ./prisma ./prisma
RUN npx prisma generate
EXPOSE 8000
CMD npm start