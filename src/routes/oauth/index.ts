import { FastifyPluginAsync } from 'fastify';
import googleOAuthRoutes from './google.js';
import discordOAuthRoutes from './discord.js';

const oauthRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(googleOAuthRoutes);
  await fastify.register(discordOAuthRoutes);
};

export default oauthRoutes;
