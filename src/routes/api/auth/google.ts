import type {
    FastifyInstance,
    FastifyPluginAsync,
    FastifyPluginOptions,
} from "fastify";
import type { FastifyOAuth2Options, OAuth2Namespace } from "@fastify/oauth2";
import { fastifyOauth2 } from "@fastify/oauth2";
import { config } from "../../../config";

async function routes(fastify: FastifyInstance, _: FastifyPluginOptions) {
    const plugin =
        fastifyOauth2 as unknown as FastifyPluginAsync<FastifyOAuth2Options>;
    fastify.register(plugin, {
        name: "googleOAuth2",
        scope: ["profile email"],
        credentials: {
            client: {
                id: process.env["GOOGLE_OAUTH_CLIENT_ID"]!,
                secret: process.env["GOOGLE_OAUTH_CLIENT_SECRET"]!,
            },
            auth: fastifyOauth2.GOOGLE_CONFIGURATION,
        },
        startRedirectPath: "/api/auth/google",
        callbackUri: `${config.domainPrefix}/api/auth/google/callback`,
    });

    fastify.get("api/auth/google/callback", {}, async (req, _) => {
        const token =
            await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(
                req
            );
        console.log(token);
    });
}

export default routes;

declare module "fastify" {
    interface FastifyInstance {
        googleOAuth2: OAuth2Namespace;
    }
}
