import fp from 'fastify-plugin';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import fastifyRoutes from '@fastify/routes';
import path from 'path';
import { config } from '../../config/index.js';
import authPlugin from './auth.js';
import adminAuthPlugin from './adminAuth.js';
import oauthPlugin from './oauth.js';
import swaggerPlugin from './swagger.js';
import rateLimitPlugin from './rateLimit.js';
import metricsPlugin from './metrics.js';

export default fp(async (fastify) => {
  // Register CORS plugin
  await fastify.register(fastifyCors, {
    origin:
      config.domainPrefix === 'http://localhost:8000'
        ? ['http://localhost:5173', 'http://localhost:8000', 'https://izuna.howlingmoon.dev']
        : ['https://izuna.howlingmoon.dev'],
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
  });

  // Register static file serving — only serve actual files, pass SPA routes to 404 handler
  await fastify.register(fastifyStatic, {
    root: path.resolve(import.meta.dirname, '..', '..', '..', 'web', 'dist'),
    wildcard: false,
    lastModified: false,
    cacheControl: false,
  });

  // Register routes plugin
  await fastify.register(fastifyRoutes);
  // Register Prometheus metrics endpoint (public, unauthenticated, not rate-limited)
  await fastify.register(metricsPlugin);
  // Register admin authentication plugin (whitelist-based)
  await fastify.register(adminAuthPlugin);

  // Register authentication plugin (JWT + Cookie)
  await fastify.register(authPlugin);

  // Register OAuth plugin (Google + Discord)
  await fastify.register(oauthPlugin);

  // Register Swagger documentation
  await fastify.register(swaggerPlugin);
  // Register rate limiting
  await fastify.register(rateLimitPlugin);
});
