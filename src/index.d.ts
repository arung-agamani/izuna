declare module "discord.js-pagination";
declare module "youtube-search-api";

export {};

declare global {
    // Node 18+ global fetch — not in @types/node 17
    function fetch(input: any, init?: any): Promise<any>;
}