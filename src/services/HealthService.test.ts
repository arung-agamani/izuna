import { describe, it, expect, vi } from "vitest";
import type { SapphireClient } from "@sapphire/framework";
import { HealthService, type DbPinger } from "./HealthService.js";

function makeDbPinger(fail: boolean): DbPinger {
    return {
        $queryRaw: vi.fn(async () => {
            if (fail) throw new Error("db down");
        }),
    };
}

const readyClient = { isReady: () => true } as unknown as SapphireClient;
const notReadyClient = { isReady: () => false } as unknown as SapphireClient;

describe("HealthService.check", () => {
    it("is ok when DB up and bot disabled", async () => {
        const service = new HealthService(makeDbPinger(false), () => null, () => undefined, false);
        const result = await service.check();
        expect(result.status).toBe("ok");
        expect(result.checks.db.up).toBe(true);
        expect(result.checks.bot).toMatchObject({ up: true, detail: "disabled" });
    });

    it("is ok when DB up and bot ready", async () => {
        const service = new HealthService(makeDbPinger(false), () => readyClient, () => undefined, true);
        const result = await service.check();
        expect(result.status).toBe("ok");
        expect(result.checks.bot.up).toBe(true);
    });

    it("is degraded when DB down", async () => {
        const service = new HealthService(makeDbPinger(true), () => null, () => undefined, false);
        const result = await service.check();
        expect(result.status).toBe("degraded");
        expect(result.checks.db.up).toBe(false);
    });

    it("is degraded when bot enabled but not ready", async () => {
        const service = new HealthService(makeDbPinger(false), () => notReadyClient, () => undefined, true);
        const result = await service.check();
        expect(result.status).toBe("degraded");
        expect(result.checks.bot.up).toBe(false);
    });

    it("reports Lavalink node count", async () => {
        const service = new HealthService(makeDbPinger(false), () => null, () => ({ nodes: new Map([["a", {}]]) }), false);
        const result = await service.check();
        expect(result.checks.lavalink).toMatchObject({ up: true, detail: "nodes=1" });
    });
});
