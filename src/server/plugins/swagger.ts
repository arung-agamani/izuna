import fp from 'fastify-plugin';
import fastifySwagger from '@fastify/swagger';
import { config } from '../../config/index.js';
import { SWAGGER_VERSION, SWAGGER_TITLE, SWAGGER_DESCRIPTION } from '../../config/constants.js';

export default fp(async (fastify) => {
  await fastify.register(fastifySwagger, {
    routePrefix: '/apidocs',
    swagger: {
      info: {
        title: SWAGGER_TITLE,
        description: SWAGGER_DESCRIPTION,
        version: SWAGGER_VERSION,
      },
      securityDefinitions: {
        apiKey: {
          type: 'apiKey',
          name: 'awooKey',
          in: 'header',
        },
      },
      host: config.swaggerHost,
      schemes: config.swaggerSchemes,
      consumes: ['application/json', 'text/plain'],
      produces: ['application/json', 'text/plain'],
    },
    hideUntagged: true,
    exposeRoute: true,
  });

  // Add user schema
  fastify.addSchema({
    $id: 'user',
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'user id',
      },
    },
  });
});
