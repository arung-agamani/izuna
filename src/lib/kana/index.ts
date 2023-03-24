import fetcher from "./fetcher";
import logger from "../winston";

import * as vn from "./collections/vn";

export class Kana {
    vn: typeof vn;
    endpoint: string = "https://api.vndb.org/kana";

    constructor() {
        this.vn = vn;
    }

    /**
     * stats
     */
    public async stats() {
        try {
            const { data } = await fetcher.get("stats");
            return data;
        } catch (error) {
            logger.error(`Error on Kana: stats`);
            logger.error(error);
        }
    }
}

let instance: Kana | null = null;

export function getKanaInstance() {
    if (!instance) {
        instance = new Kana();
        return instance;
    }
    return instance;
}
