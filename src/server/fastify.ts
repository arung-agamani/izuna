import fastify from 'fastify';
import plugins from './plugins';
import apiv1Routes from '../routes/api';
import logger from '../lib/winston';

export async function buildServer() {
  const server = fastify({
    logger: false, // Using Winston logger instead
  });

  try {
    // Register all plugins (CORS, Static, Auth, OAuth, Swagger)
    await server.register(plugins);

    // Register API routes
    await server.register(apiv1Routes, {
      prefix: '/api',
    });

    // 404 handler - serve index.html for SPA
    server.setNotFoundHandler((_req, res) => {
      res.sendFile('index.html');
    });

    return server;
  } catch (error) {
    logger.error('Failed to build server:', error);
    throw error;
  }
}
