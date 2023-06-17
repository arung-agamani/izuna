import debounce from "lodash.debounce";
import logger from "./winston";

const map = new Map<string, () => void>();

export function addInteractionEntry(interactionId: string, fn: () => void, timeout = 60000) {
    const debounced = debounce(() => {
        fn();
        if (map.has(interactionId)) map.delete(interactionId);
    }, timeout);
    map.set(interactionId, debounced);
    debounced();
    logger.debug({
        message: `Timeout for message with id ${interactionId} has been added`,
        label: {
            source: "interactionTimeout",
            handler: "addInteractionEntry",
        },
    });
}

export function debounceInteraction(interactionId: string) {
    const func = map.get(interactionId);
    if (!func) return;
    logger.debug({
        message: `Timeout for message with id ${interactionId} has been debounced`,
        label: {
            source: "interactionTimeout",
            handler: "debounceInteraction",
        },
    });
    func();
}
