import { FastifyPluginAsync } from 'fastify';
import googleOAuthRoutes from './google';
import discordOAuthRoutes from './discord';

const oauthRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(googleOAuthRoutes, { prefix: '/api' });
  await fastify.register(discordOAuthRoutes, { prefix: '/api' });
};

export default oauthRoutes;
