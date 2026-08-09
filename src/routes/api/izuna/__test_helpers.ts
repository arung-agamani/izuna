import Fastify from "fastify";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";

/**
 * Build a minimal Fastify instance for route integration tests.
 * Registers only the plugins needed for the routes under test.
 */
export async function buildTestApp() {
    const app = Fastify({ logger: false });

    // Register cookie + JWT (needed for auth-protected routes and token signing)
    await app.register(cookie);
    await app.register(jwt, { secret: "test-secret" });

    // Replicate the authenticate decorator
    app.decorate("authenticate", async function (request: { jwtVerify: () => Promise<void> }, reply: { status: (code: number) => { send: (body: unknown) => void } }) {
        try {
            await request.jwtVerify();
        } catch {
            reply.status(401).send({ error: "Unauthorized" });
        }
    });

    return app;
}

/**
 * Sign a JWT for a test user. Returns the cookie header value.
 */
export async function signTestToken(app: ReturnType<typeof Fastify>): Promise<string> {
    const token = await app.jwt.sign({ id: 1, uid: "test-user", aud: "izuna" });
    // Return the raw token — callers set the cookie header
    return token;
}
