import { buildServer } from './server/fastify';
import logger, { logError, getErrorMessage } from './lib/winston'

/**
 * Application factory that builds and configures the Fastify server
 * Handles all plugin registration, route setup, and error handling
 */
export async function buildApp() {
  try {
    const server = await buildServer();
    logger.info('✅ Application built successfully');
    return server;
  } catch (error) {
    logError('❌ Failed to build application:', error);
    throw error;
  }
}

/**
 * Starts the web server and listens on configured host/port
 */
export async function startWebServer(port: number, host: string) {
  try {
    const server = await buildApp();
    await server.listen({ port, host });
    logger.info(`🚀 Server is listening at http://${host}:${port}`);

    // Display Swagger docs URL
    server.swagger();
    logger.info(`📚 API documentation available at http://${host}:${port}/apidocs`);

    return server;
  } catch (error) {
    logError('❌ Failed to start web server:', error);
    throw error;
  }
}
