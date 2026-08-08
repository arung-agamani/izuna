import type { User } from "@prisma/client";
import { UserRepository } from "../repositories/UserRepository";
import prisma from "../lib/prisma";
import { discordAccessTokens } from "../lib/session";
import logger from "../lib/winston";

export interface DiscordLoginInput {
    id: string;
    username: string;
    email?: string;
}

export interface DiscordTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn?: number;
}

/**
 * Auth-related business logic.
 * Route handlers own HTTP concerns (token exchange, cookie setting, redirect).
 * This service owns user identity and token lifecycle.
 */
export class AuthService {
    private static instance: AuthService | null = null;
    private readonly userRepo: UserRepository;

    constructor(repository?: UserRepository) {
        this.userRepo = repository ?? new UserRepository(prisma);
    }

    public static getInstance(): AuthService {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }

    /**
     * Process a Discord OAuth login: find or create the user, persist tokens in DB and in-memory cache.
     * Returns the user record so the route handler can generate a JWT.
     */
    async processDiscordLogin(discordUser: DiscordLoginInput, tokens: DiscordTokens): Promise<User> {
        logger.info("User login from Discord", { username: discordUser.username });

        const user = await this.userRepo.findOrCreateFromDiscord({
            id: discordUser.id,
            username: discordUser.username,
            email: discordUser.email,
        });

        // In-memory cache for quick access (route handlers use this before falling back to DB)
        discordAccessTokens.set(discordUser.id, {
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken,
            expires_at: Date.now() + (Number(tokens.expiresIn) || 604800) * 1000,
        });

        // Persist to DB for survival across restarts
        await this.userRepo.updateDiscordTokens(user.id, tokens.accessToken, tokens.refreshToken);

        return user;
    }

    /**
     * Validate that a base64-encoded OAuth state exists in the session set.
     * Returns the decoded state object on success, null on invalid state.
     */
    validateState(state: string, stateSet: Set<string>): { redirect: string; initiator: string } | null {
        if (!stateSet.has(state)) return null;
        try {
            const decoded = Buffer.from(state, "base64").toString();
            return JSON.parse(decoded) as { redirect: string; initiator: string };
        } catch {
            return null;
        }
    }

    /**
     * Decode a base64 redirect URL from the state.
     */
    decodeRedirect(encoded: string): string {
        try {
            return Buffer.from(encoded, "base64").toString();
        } catch {
            return "/";
        }
    }

    /**
     * Refresh the user's tokens in both memory and DB.
     * Called by the token refresh endpoint.
     */
    async refreshTokens(uid: string, tokens: DiscordTokens): Promise<void> {
        const user = await this.userRepo.findByUid(uid);
        if (!user) throw new Error("User not found");

        discordAccessTokens.set(uid, {
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken,
            expires_at: Date.now() + (Number(tokens.expiresIn) || 604800) * 1000,
        });

        await this.userRepo.updateDiscordTokens(user.id, tokens.accessToken, tokens.refreshToken);
    }
}
