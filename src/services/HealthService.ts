import type { SapphireClient } from "@sapphire/framework";

export interface DbPinger {
    $queryRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<unknown>;
}

interface LavalinkManagerLike {
    nodes: ReadonlyMap<string, unknown>;
}

export interface HealthCheck {
    up: boolean;
    latencyMs?: number;
    detail?: string;
}

export interface HealthResult {
    status: "ok" | "degraded";
    checks: {
        db: HealthCheck;
        bot: HealthCheck;
        lavalink: HealthCheck;
    };
}

/**
 * Readiness probe for the bot + web server. Dependencies are constructor-injected
 * so the check logic is trivially unit-testable (repo convention: no vi.mock()).
 */
export class HealthService {
    constructor(
        private readonly prisma: DbPinger,
        private readonly getBotClient: () => SapphireClient | null,
        private readonly getLavalinkManager: () => LavalinkManagerLike | undefined,
        private readonly botEnabled: boolean,
    ) {}

    public async check(): Promise<HealthResult> {
        const db = await this.checkDb();
        const bot = this.checkBot();
        const lavalink = this.checkLavalink();

        // DB is required for the web API; bot readiness is required only when the bot is enabled.
        const ready = db.up && (this.botEnabled ? bot.up : true);

        return { status: ready ? "ok" : "degraded", checks: { db, bot, lavalink } };
    }

    private async checkDb(): Promise<HealthCheck> {
        const start = Date.now();
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            return { up: true, latencyMs: Date.now() - start };
        } catch (error) {
            return { up: false, detail: error instanceof Error ? error.message : String(error) };
        }
    }

    private checkBot(): HealthCheck {
        if (!this.botEnabled) return { up: true, detail: "disabled" };
        const client = this.getBotClient();
        return { up: client?.isReady() ?? false, detail: client ? undefined : "not initialized" };
    }

    private checkLavalink(): HealthCheck {
        const manager = this.getLavalinkManager();
        const nodes = manager?.nodes.size ?? 0;
        return { up: nodes > 0, detail: `nodes=${nodes}` };
    }
}
