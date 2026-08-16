import { FastifyPluginAsync } from 'fastify';
import { closureGoogleOauthState, closureGoogleOauthTracker } from '../../lib/google.js';
import logger, { logError } from '../../lib/winston.js';

const googleOAuthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{
    Querystring: {
      state: string;
    };
  }>(
    '/auth/google/callback',
    {},
    async (req, reply) => {
      try {
        const token = await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(req);
        const state = req.query.state || '';

        const decodedState = Buffer.from(state, "base64").toString();
        const [source, uid] = decodedState.split("-");
        logger.debug("Google OAuth callback received", { source, uid });

        if (source === 'closure' && closureGoogleOauthState.has(state)) {
          closureGoogleOauthTracker.set(uid || '', token.token);
          closureGoogleOauthState.delete(state);
          return {
            status: 200,
            message: `You've authorized Closure to take over your account! Hahahahaha.... jkjk`,
          };
        } else {
          return {
            status: 404,
            message: `You're a stranger. I don't think this is how things should've gone.`,
          };
        }
      } catch (error) {
        logError("Google OAuth callback failed", error);
        reply.status(500).send({
          statusCode: 500,
          error: 'Something went wrong.',
        });
      }
    },
  );
};

export default googleOAuthRoutes;
