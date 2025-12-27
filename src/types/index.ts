export interface FastifyDiscordOAuthBody {
  user: {
    id: number;
    uid: string;
    name: string;
    email: string;
    dateCreated: string;
  };
  token: {
    access_token: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
    token_type: string;
    expires_at: string;
  };
}
