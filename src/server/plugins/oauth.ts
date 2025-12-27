import fp from 'fastify-plugin';
import oauthplugin, { OAuth2Namespace } from '@fastify/oauth2';
import { FastifyRequest } from 'fastify';
import { env } from '../../config/env';
import { config } from '../../config';
import { GOOGLE_OAUTH_SCOPE, DISCORD_OAUTH_SCOPE } from '../../config/constants';
import { closureGoogleOauthState } from '../../lib/google';
import { oauthSessionState } from '../../lib/session';
import logger from '../../lib/winston';

export default fp(async (fastify) => {
  // Google OAuth2 Configuration
  await fastify.register(oauthplugin, {
    name: 'googleOAuth2',
    scope: GOOGLE_OAUTH_SCOPE,
    credentials: {
      client: {
        id: env.GOOGLE_OAUTH_CLIENT_ID,
        secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
      },
      auth: oauthplugin.GOOGLE_CONFIGURATION,
    },
    generateStateFunction: (
      request: FastifyRequest<{
        Querystring: {
          source: string;
          uid: string;
        };
      }>,
    ) => {
      const { source, uid } = request.query;
      const state = Buffer.from(`${source}-${uid}`).toString('base64');
      closureGoogleOauthState.add(state);
      return state;
    },
    checkStateFunction: (returnedState: any, callback: any) => {
      if (closureGoogleOauthState.has(returnedState)) {
        callback();
        return;
      }
      callback(new Error('Invalid state'));
    },
    startRedirectPath: '/api/auth/google',
    callbackUri: config.getOAuthCallbackUri('google'),
  });

  // Discord OAuth2 Configuration
  await fastify.register(oauthplugin, {
    name: 'discordOAuth2',
    scope: DISCORD_OAUTH_SCOPE,
    credentials: {
      client: {
        id: env.DISCORD_OAUTH_CLIENT_ID,
        secret: env.DISCORD_OAUTH_CLIENT_SECRET,
      },
      auth: oauthplugin.DISCORD_CONFIGURATION,
    },
    generateStateFunction: (
      req: FastifyRequest<{
        Querystring: {
          r: string; // redirect link
          i: string; // initiator
        };
      }>,
    ) => {
      const stateObj = {
        redirect: req.query.r === 'null' ? Buffer.from('/').toString('base64') : req.query.r,
        initiator: req.query.i || 'web',
      };
      let state = JSON.stringify(stateObj);
      state = Buffer.from(state).toString('base64');
      oauthSessionState.add(state);
      return state;
    },
    checkStateFunction: (returnedState: any, callback: any) => {
      if (oauthSessionState.has(returnedState)) {
        callback();
        return;
      }
      callback(new Error('Invalid state'));
    },
    startRedirectPath: '/api/auth/discord',
    callbackUri: config.getOAuthCallbackUri('discord'),
  });
});

declare module 'fastify' {
  interface FastifyInstance {
    googleOAuth2: OAuth2Namespace;
    discordOAuth2: OAuth2Namespace;
  }
}
