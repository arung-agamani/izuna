import fetcher from "../fetcher";
import logger from "../../winston";

export interface SearchCharacterResult {
    id: string;
    name: string;
    description: string;
    vns: Array<{
        id: string;
        title: string;
    }>;
    image: {
        url: string;
        dims: [number, number];
        sexual: number;
        violence: number;
    };
}

interface SearchCharacterFetchResult extends BaseResponse {
    results: SearchCharacterResult[];
}

export async function searchCharacter(name: string): Promise<SearchCharacterFetchResult | null> {
    try {
        const { data } = await fetcher.post("character", {
            filters: ["search", "=", name],
            fields: "id,name,description,vns{id,title},image{url,dims,sexual,violence}",
        });
        return data;
    } catch (error) {
        logger.error("Kana: Error when fetching from /character");
        logger.error(error);
        return null;
    }
}

export async function getVNCharacters(vnId: string) {
    try {
        const { data } = await fetcher.post("character", {
            filters: ["vn", "=", ["id", "=", vnId]],
            fields: "id,name,description,height,weight,bust,waist,hips,cup,age,birthday,sex,vns{id,spoiler,title,role},traits{name,spoiler}",
        });
        return data;
    } catch (error) {
        logger.error("Kana: Error when fetching from /character");
        logger.error(error);
    }
}

export async function getCharacterById(id: string): Promise<SearchCharacterFetchResult | null> {
    try {
        const { data } = await fetcher.post("character", {
            filters: ["id", "=", id],
            fields: "id,name,description,height,weight,bust,waist,hips,cup,age,birthday,sex,vns{id,spoiler,title,role},traits{name,spoiler},image{url,dims,sexual,violence}",
        });
        return data;
    } catch (error) {
        logger.error("Kana: Error when fetching from /character");
        logger.error(error);
        return null;
    }
}
