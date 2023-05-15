### vn

This command supports slash command.  
Creates API call to [vndb.org](vndb.org) and retrieve public info about Visual Novels.  
Available subcommands.

-   game  
     This command will search for a title and return common information.  
     Example :

    > /vn game title:hoshimemo

    This command will search title with `hoshimemo` as the query.
    The same command can be done using regular text message.

    > izuna vn hoshimemo

    If search result returns more than one result, reply message will be sent containing top 5 result and button components to choose. Further interaction can be continued on the provided buttons.

-   characters  
     This command will search for a character and return the common information about the character. Spoilers will be hidden properly.  
     Example :

    > /vn character name:murasame

    If search result returns more than one result, reply message will be sent containing a select menu with search results as options. Further interaction can be continued on the provided select menu.
