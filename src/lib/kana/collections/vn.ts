import fetcher from "../fetcher";
import logger from "../../winston";

type FilterNames =
    | "id"
    | "search"
    | "lang"
    | "olang"
    | "platform"
    | "length"
    | "released"
    | "popularity"
    | "rating"
    | "votecount"
    | "has_description"
    | "has_anime"
    | "has_screenshot"
    | "has_review"
    | "devstatus"
    | "tag"
    | "dtag"
    | "anime_id"
    | "label"
    | "release"
    | "character"
    | "staff"
    | "developer";

type FilterOp = "=" | "!=" | ">=" | ">" | "<=" | "<";

type FieldsNames =
    | "id"
    | "title"
    | "alttitle"
    | "titles"
    | "titles.lang"
    | "titles.title"
    | "titles.latin"
    | "titles.official"
    | "titles.main"
    | "aliases"
    | "olang"
    | "devstatus"
    | "released"
    | "languages"
    | "platforms"
    | "image"
    | "image.id"
    | "image.url"
    | "image.dims"
    | "image.sexual"
    | "image.violence"
    | "image.votecount"
    | "length"
    | "length_minutes"
    | "length_votes"
    | "description"
    | "rating"
    | "popularity"
    | "votecount"
    | "screenshots"
    | "screenshots.*"
    | "screenshots.thumbnail"
    | "screenshots.thumbnail_dims"
    | "screenshots.release.*"
    | "tags"
    | "tags.rating"
    | "tags.spoiler"
    | "tags.lie"
    | "tags.name"
    | "tags.aliases"
    | "tags.description"
    | "tags.category";

export interface BaseHTTPResponse {
    results: Record<string, any>[];
    more: Boolean;
    count?: Number;
    compact_filters?: String;
    normalized_filters?: Record<string, any>[];
}

export async function getRaw(filter: [FilterNames, FilterOp, string], fields: string[]): Promise<BaseHTTPResponse | string> {
    try {
        const { data } = await fetcher.post("vn", {
            filters: filter,
            fields: fields.join(","),
        });
        return data;
    } catch (error: any) {
        logger.error("Error on getRaw on vn");
        logger.error(error);
        return error.response.data;
    }
}

export async function getInfo(filter: [FilterNames, FilterOp, string]): Promise<BaseHTTPResponse | string> {
    try {
        const fields: FieldsNames[] = [
            "id",
            "title",
            "alttitle",
            "aliases",
            "titles.lang",
            "titles.main",
            "titles.title",
            "titles.official",
            "description",
            "image.url",
            "image.sexual",
            "image.violence",
            "image.votecount",
            "length",
            "length_minutes",
            "tags.spoiler",
            "tags.name",
            "tags.category",
            "tags.rating",
            "rating",
            "popularity",
        ];
        const { data } = await fetcher.post("vn", {
            filters: filter,
            fields: fields.join(","),
        });
        return data;
    } catch (error: any) {
        logger.error("Error on getInfo on vn");
        logger.error(error);
        return error.response.data;
    }
}
