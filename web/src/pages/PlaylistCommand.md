### `playlist`

Command signature

> `izuna playlist [subcommand]

This command will manage the current playlist as a whole. Avaliable subcommands are:

-   load  
    This subcommand will load existing playlist into current playlist. Load operation is append. Accepts flag `-p` to specify scope (server-scoped or user-scoped playlist).  
    Examples:

    > `izuna playlist load list1`

    This command will load playlist named `list1` to current playlist.

-   save  
    This subcommand will save current playlist with name.  
    Example.

    > `izuna playlist save himehinamix`

    This command will save the current playlist with the name `himehinamix`

    > `izuna playlist save himehinamix -p`

    Supplying `-p` ocmmand will set the scope to user only.

-   list  
    This subcommand will list all playlists this user has, and the current server has (if done inside server/guild).  
    Example:

    > `izuna playlist list`

    This command will list all playlists saved by user and show both server and user scoped playlist.

-   info  
    This subcommand will print all track info from a playlist. Scope can be specified using `-p` flag.  
    Example:

    > `izuna playlist info himehinamix`

    This command will print all tracks inside the saved playlist `himehinamix`.
