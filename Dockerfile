ARG NODE_VERSION=22

# ═══ Backend builder ═══════════════════════════════════
FROM node:${NODE_VERSION}-alpine AS backend-builder
WORKDIR /tmp
COPY package.json yarn.lock tsconfig.json prisma.config.ts ./
COPY scripts ./scripts
RUN yarn install --frozen-lockfile
COPY prisma ./prisma
COPY src ./src
RUN yarn build

# ═══ Frontend builder ══════════════════════════════════
FROM node:${NODE_VERSION}-alpine AS web-builder
WORKDIR /tmp/web
COPY web/package.json web/yarn.lock ./
RUN yarn install --frozen-lockfile
COPY web ./
RUN yarn build

# ═══ Final runtime image ═══════════════════════════════
FROM node:${NODE_VERSION}-alpine
LABEL org.opencontainers.image.source="https://github.com/arung-agamani/izuna"

WORKDIR /usr/src/app

# Install openssl as root, chown workdir, then switch to node
RUN apk add --no-cache openssl \
    && chown -R node:node /usr/src/app

USER node

# Install production deps as node (owns node_modules from the start)
COPY --chown=node:node package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production \
    && yarn cache clean

# Copy built artifacts (owned by node)
COPY --from=backend-builder --chown=node:node /tmp/build ./build
COPY --from=web-builder --chown=node:node /tmp/web/dist ./web/dist
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node prisma.config.ts ./prisma.config.ts

EXPOSE 8000

CMD ["sh", "-c", "npx prisma migrate deploy && node build/index.js"]
