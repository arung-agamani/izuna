import type { Message } from "discord.js";
import type { Tag } from "../../generated/prisma/client.js";
import { TagService } from "../../services/TagService.js";
import logger from "../../lib/winston.js";

const isDevelopment = process.env["NODE_ENV"] === "development";
const TAG_DELIMITER = isDevelopment ? "&" : "#";
const ALPHANUMERIC_REGEX = /^[A-Za-z0-9]+$/;

/**
 * Handle tag invocation in a message.
 * Detects #tagName# patterns, resolves the tag, and responds in-channel
 * (or as a reply if the user was replying to another message).
 *
 * Returns true if a tag was handled (found or not-found message sent),
 * false if no tag pattern was detected.
 */
export async function handleTagMessage(message: Message): Promise<boolean> {
    if (message.author.bot) return false;

    const parts = message.content.split(TAG_DELIMITER);
    if (parts.length < 3) return false;

    // Extract the first non-empty tag name between delimiters
    const foundTag = extractTagName(parts);
    if (!foundTag || !ALPHANUMERIC_REGEX.test(foundTag)) return false;

    // Look up the tag
    const tag = await resolveTag(message, foundTag);
    if (tag === undefined) return true; // DB error — logged, silently skipped

    // Deliver the response
    await deliverTagResponse(message, foundTag, tag);

    return true;
}

/**
 * Extract the first non-empty tag name from odd-indexed split parts.
 * E.g., "hello #foo# world" → parts = ["hello ", "foo", " world"] → "foo"
 */
function extractTagName(parts: string[]): string | null {
    for (let i = 1; i < parts.length; i += 2) {
        if (parts[i] !== "") return parts[i];
    }
    return null;
}

/**
 * Resolve a tag: user-scoped first, then guild-scoped fallback.
 * Returns the tag, null if not found, or undefined on DB error.
 */
async function resolveTag(message: Message, name: string): Promise<Tag | null | undefined> {
    try {
        return await TagService.getInstance().resolve(message.author.id, message.guildId, name);
    } catch (err) {
        logger.error("Tag lookup failed", { name, error: err });
        return undefined;
    }
}

/**
 * Send the tag response. If the user is replying to a message, the bot replies
 * to that same message instead of sending a plain channel message.
 */
async function deliverTagResponse(message: Message, name: string, tag: Tag | null): Promise<void> {
    // Resolve reply target
    let replyTarget: Message | undefined;
    if (message.reference?.messageId) {
        try {
            replyTarget = await message.channel.messages.fetch(message.reference.messageId);
        } catch {
            // message deleted or inaccessible — fall through to channel send
        }
    }

    const respond = async (content: string | { content: string }) => {
        if (replyTarget) {
            await replyTarget.reply(content);
        } else if (message.channel.isSendable()) {
            await message.channel.send(content);
        }
    };

    if (!tag) {
        await respond(`No tag **${name}** found.`);
        return;
    }

    if (tag.isMedia) {
        await respond({ content: tag.message });
        logger.debug({
            message: `${tag.message} invoked`,
            label: { handler: "tag_index", source: "messageCreate", tag: tag.message },
        });
        return;
    }

    await respond(tag.message);
}
