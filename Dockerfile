ARG NODE_VERSION=22

# ═══ Backend builder ═══════════════════════════════════
FROM node:${NODE_VERSION}-alpine AS backend-builder
WORKDIR /tmp
COPY package.json yarn.lock tsconfig.json ./
RUN yarn install --frozen-lockfile
COPY prisma ./prisma
RUN npx prisma generate
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

# Copy package manifests and install production deps only
COPY package.json yarn.lock ./
RUN apk add --no-cache openssl \
    && yarn install --frozen-lockfile --production \
    && apk del --no-cache git 2>/dev/null; true

# Copy built artifacts
COPY --from=backend-builder /tmp/build ./build
COPY --from=web-builder /tmp/web/dist ./web/dist
COPY prisma ./prisma

# Copy prisma CLI from builder — needed for migrate at runtime
COPY --from=backend-builder /tmp/node_modules/.prisma ./node_modules/.prisma
COPY --from=backend-builder /tmp/node_modules/@prisma ./node_modules/@prisma
COPY --from=backend-builder /tmp/node_modules/@prisma/engines ./node_modules/@prisma/engines
COPY --from=backend-builder /tmp/node_modules/prisma ./node_modules/prisma
COPY --from=backend-builder /tmp/node_modules/.bin/prisma ./node_modules/.bin/prisma

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8000/api/status',r=>{process.exit(r.statusCode===200?0:1)})"

# Ensure node user owns everything before dropping root
RUN chown -R node:node /usr/src/app

# Drop root
USER node

EXPOSE 8000


CMD ["sh", "-c", "npx prisma migrate deploy && node build/index.js"]
