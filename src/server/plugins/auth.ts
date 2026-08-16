import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import { FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../../config/env.js';
import { COOKIE_NAME } from '../../config/constants.js';
import logger from '../../lib/winston.js';

export default fp(async (fastify) => {
  // Register cookie plugin first
  await fastify.register(cookie);

  // Register JWT plugin
  await fastify.register(jwt, {
    secret: env.AUTH_SECRET,
    cookie: {
      cookieName: COOKIE_NAME,
      signed: false,
    },
  });

  // Decorate fastify instance with authenticate function
  fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      logger.warn("Authentication failed", { url: request.url.split("?")[0] });
      reply.status(401).send(err);
    }
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, res: FastifyReply) => Promise<void>;
  }
}

