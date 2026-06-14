import fp from 'fastify-plugin';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import fastifyRoutes from '@fastify/routes';
import path from 'path';
import { config } from '../../config';
import authPlugin from './auth';
import oauthPlugin from './oauth';
import swaggerPlugin from './swagger';

export default fp(async (fastify) => {
  // Register CORS plugin
  await fastify.register(fastifyCors, {
    origin:
      config.domainPrefix === 'http://127.0.0.1:8000'
        ? ['http://localhost:5173', 'http://localhost:8000', 'https://izuna.howlingmoon.dev']
        : ['https://izuna.howlingmoon.dev'],
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
  });

  // Register static file serving — only serve actual files, pass SPA routes to 404 handler
  await fastify.register(fastifyStatic, {
    root: path.resolve(__dirname, '..', '..', '..', 'web', 'dist'),
    wildcard: false,
  });

  // Register routes plugin
  await fastify.register(fastifyRoutes);

  // Register authentication plugin (JWT + Cookie)
  await fastify.register(authPlugin);

  // Register OAuth plugin (Google + Discord)
  await fastify.register(oauthPlugin);

  // Register Swagger documentation
  await fastify.register(swaggerPlugin);
});
