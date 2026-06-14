import { FastifyPluginAsync } from 'fastify';
import googleOAuthRoutes from './google';
import discordOAuthRoutes from './discord';

const oauthRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(googleOAuthRoutes);
  await fastify.register(discordOAuthRoutes);
};

export default oauthRoutes;
