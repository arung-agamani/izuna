import fetcher from "./fetcher";
import logger from "../winston";

import * as vn from "./collections/vn";
import * as chara from "./collections/chara";
export class Kana {
    vn: typeof vn;
    chara: typeof chara;
    endpoint: string = "https://api.vndb.org/kana";

    constructor() {
        this.vn = vn;
        this.chara = chara;
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
