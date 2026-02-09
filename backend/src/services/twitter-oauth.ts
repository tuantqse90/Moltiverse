import { TwitterApi } from 'twitter-api-v2';

export interface TwitterAuthConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
}

export interface TwitterTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface TwitterUserInfo {
  id: string;
  username: string;
  displayName: string;
  profileImageUrl: string;
}

// Store PKCE verifiers temporarily (in production, use Redis or similar)
const pkceStore = new Map<string, { codeVerifier: string; walletAddress: string }>();

export class TwitterOAuthService {
  private config: TwitterAuthConfig;
  private client: TwitterApi;

  constructor(config?: Partial<TwitterAuthConfig>) {
    this.config = {
      clientId: config?.clientId || process.env.TWITTER_CLIENT_ID || '',
      clientSecret: config?.clientSecret || process.env.TWITTER_CLIENT_SECRET || '',
      callbackUrl: config?.callbackUrl || process.env.TWITTER_CALLBACK_URL || 'http://localhost:3001/api/auth/twitter/callback',
    };

    this.client = new TwitterApi({
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
    });
  }

  /**
   * Check if Twitter OAuth is configured
   */
  isConfigured(): boolean {
    return Boolean(this.config.clientId && this.config.clientSecret);
  }

  /**
   * Generate OAuth 2.0 authorization URL with PKCE
   */
  async generateAuthUrl(walletAddress: string): Promise<{ url: string; state: string }> {
    if (!this.isConfigured()) {
      throw new Error('Twitter OAuth is not configured');
    }

    const { url, codeVerifier, state } = this.client.generateOAuth2AuthLink(
      this.config.callbackUrl,
      {
        scope: ['tweet.read', 'users.read', 'offline.access'],
      }
    );

    // Store the code verifier and wallet address for the callback
    pkceStore.set(state, { codeVerifier, walletAddress });

    // Clean up old entries after 10 minutes
    setTimeout(() => {
      pkceStore.delete(state);
    }, 10 * 60 * 1000);

    return { url, state };
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleCallback(code: string, state: string): Promise<{
    tokens: TwitterTokens;
    user: TwitterUserInfo;
    walletAddress: string;
  }> {
    if (!this.isConfigured()) {
      throw new Error('Twitter OAuth is not configured');
    }

    const stored = pkceStore.get(state);
    if (!stored) {
      throw new Error('Invalid or expired OAuth state');
    }

    const { codeVerifier, walletAddress } = stored;
    pkceStore.delete(state);

    // Exchange code for tokens
    const {
      client: loggedClient,
      accessToken,
      refreshToken,
      expiresIn,
    } = await this.client.loginWithOAuth2({
      code,
      codeVerifier,
      redirectUri: this.config.callbackUrl,
    });

    // Get user info
    const { data: user } = await loggedClient.v2.me({
      'user.fields': ['profile_image_url', 'name', 'username'],
    });

    return {
      tokens: {
        accessToken,
        refreshToken,
        expiresIn,
      },
      user: {
        id: user.id,
        username: user.username,
        displayName: user.name || user.username,
        profileImageUrl: user.profile_image_url?.replace('_normal', '_400x400') || '',
      },
      walletAddress,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<TwitterTokens> {
    if (!this.isConfigured()) {
      throw new Error('Twitter OAuth is not configured');
    }

    const {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn,
    } = await this.client.refreshOAuth2Token(refreshToken);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn,
    };
  }

  /**
   * Get user info using access token
   */
  async getUserInfo(accessToken: string): Promise<TwitterUserInfo> {
    const client = new TwitterApi(accessToken);

    const { data: user } = await client.v2.me({
      'user.fields': ['profile_image_url', 'name', 'username'],
    });

    return {
      id: user.id,
      username: user.username,
      displayName: user.name || user.username,
      profileImageUrl: user.profile_image_url?.replace('_normal', '_400x400') || '',
    };
  }
}

// Singleton instance
let twitterOAuthInstance: TwitterOAuthService | null = null;

export function getTwitterOAuthService(): TwitterOAuthService {
  if (!twitterOAuthInstance) {
    twitterOAuthInstance = new TwitterOAuthService();
  }
  return twitterOAuthInstance;
}

export default TwitterOAuthService;
