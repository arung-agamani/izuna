import type { SapphireClient } from "@sapphire/framework";

let _client: SapphireClient | null = null;

export function setBotClient(client: SapphireClient): void {
    _client = client;
}

export function getBotClient(): SapphireClient | null {
    return _client;
}
