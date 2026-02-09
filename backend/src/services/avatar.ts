// DiceBear Avatar Service
// Uses wallet address as seed for consistent avatar generation

const DICEBEAR_API = 'https://api.dicebear.com/7.x';

export type AvatarStyle =
  | 'adventurer'
  | 'adventurer-neutral'
  | 'avataaars'
  | 'avataaars-neutral'
  | 'big-ears'
  | 'big-ears-neutral'
  | 'big-smile'
  | 'bottts'
  | 'bottts-neutral'
  | 'croodles'
  | 'croodles-neutral'
  | 'fun-emoji'
  | 'icons'
  | 'identicon'
  | 'initials'
  | 'lorelei'
  | 'lorelei-neutral'
  | 'micah'
  | 'miniavs'
  | 'notionists'
  | 'notionists-neutral'
  | 'open-peeps'
  | 'personas'
  | 'pixel-art'
  | 'pixel-art-neutral'
  | 'rings'
  | 'shapes'
  | 'thumbs';

export interface AvatarOptions {
  style?: AvatarStyle;
  size?: number;
  backgroundColor?: string;
  flip?: boolean;
}

const DEFAULT_OPTIONS: AvatarOptions = {
  style: 'bottts',
  size: 128,
};

export class AvatarService {
  /**
   * Generate a DiceBear avatar URL based on wallet address
   */
  static generateAvatarUrl(walletAddress: string, options: AvatarOptions = {}): string {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
    const { style, size, backgroundColor, flip } = mergedOptions;

    // Use wallet address as seed for consistent avatars
    const seed = walletAddress.toLowerCase();

    let url = `${DICEBEAR_API}/${style}/svg?seed=${seed}`;

    if (size) {
      url += `&size=${size}`;
    }

    if (backgroundColor) {
      url += `&backgroundColor=${backgroundColor}`;
    }

    if (flip) {
      url += `&flip=true`;
    }

    return url;
  }

  /**
   * Generate avatar URL for an agent with a specific style
   */
  static generateAgentAvatar(agentName: string, index: number): string {
    // Use different styles for variety among agents
    const styles: AvatarStyle[] = [
      'bottts',
      'pixel-art',
      'identicon',
      'shapes',
      'rings',
      'thumbs',
      'fun-emoji',
      'adventurer',
      'big-smile',
      'micah'
    ];

    const style = styles[index % styles.length];
    return this.generateAvatarUrl(agentName, { style, size: 128 });
  }

  /**
   * Get all available avatar styles
   */
  static getAvailableStyles(): AvatarStyle[] {
    return [
      'adventurer',
      'adventurer-neutral',
      'avataaars',
      'avataaars-neutral',
      'big-ears',
      'big-ears-neutral',
      'big-smile',
      'bottts',
      'bottts-neutral',
      'croodles',
      'croodles-neutral',
      'fun-emoji',
      'icons',
      'identicon',
      'initials',
      'lorelei',
      'lorelei-neutral',
      'micah',
      'miniavs',
      'notionists',
      'notionists-neutral',
      'open-peeps',
      'personas',
      'pixel-art',
      'pixel-art-neutral',
      'rings',
      'shapes',
      'thumbs'
    ];
  }
}

export default AvatarService;
