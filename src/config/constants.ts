export const COOKIE_NAME = 'ninpou';
export const JWT_EXPIRY = '1h';
export const RATE_LIMIT_MAX = 100;
export const RATE_LIMIT_WINDOW = '1 minute';

// OAuth state management
export const GOOGLE_OAUTH_SCOPE = [
  'profile email',
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.readonly',
];

export const DISCORD_OAUTH_SCOPE = [
  'email',
  'identify',
  'guilds',
  'guilds.members.read',
];

// Swagger defaults
export const SWAGGER_VERSION = '0.0.1';
export const SWAGGER_TITLE = 'Izuna Swagger';
export const SWAGGER_DESCRIPTION = 'API Docs for Izuna';
