### tag

Echoes message stored under a "tag". Think of it as server-wide replacement for custom emoji and custom stickers. Supports text message and attachment.

Tag can be called by wrapping the tag name with hashtag. For example, if a tag is registered with tag name `awoo`, calling the tag can be done with message `#awoo#`. This can be called at any position of the message.

Example usage :

> I mean her design really looks like #awoo#, so 10/10

This message will echo any content registered under `awoo` tag.

Multiple tags in a single message is not supported. If multiple tags exist, only the first tag will be called.

The following subcommands are available for adding, listing, and deleting tags. More convenient way to manage is available in this site ([User tags](/closure/tags) or [Server tags](/closure/guilds))

-   add  
    This subcommand add a tag with given message content. Tag name should be alphanumeric single-word name. Regex is used to validate `/[0-9A-Za-z]+/`  
    Examples:

    > izuna tag add [tag name] [message content]

    This command will add new tag and use any string after the first argument as the message content.
    As this uses standard text message, the content shouldn't be over than 2000 characters.

    > izuna tag add [tag name]

    If command is called with file attachment, it will discard any text content and set the tag to `Media` tag. When tag is called, it will send the attachment given. This command only take the first attachment only.

-   info  
    This subcommand will print the information associated with a tag.  
    Example:

    > izuna tag info awoo

    This command will print information on `awoo` tag.

-   list  
    This subcommand will list registered tags. If used inside server/guild, it will return all tags for that guild only. If used through DM, then it will list user-scoped tags only. Additional single argument can be supplied to filter search.  
    Example:

    > izuna tag list

    This command will list every tags in server/guild or user, according to where the command is being called.

    > izuna tag list cute

    Same with the command above, but this command will do additional filtering using `cute` as the filter. Filtering uses simple substring search.

-   delete  
    This subcommand will delete registered tag. Just supply the tag name after the subcommand.  
    Example :

    > izuna tag delete awoo

    This will delete tag `awoo` from the server/guild or user, based on where the command being called.
