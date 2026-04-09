import heroPortrait from './chooseheroes.png';

export type CharacterAvatar = {
  id: string;
  name: string;
  image: string;
  portrait?: string;
};

export const DEFAULT_AVATAR_ID = 'hero-01';

export const CHARACTER_AVATARS: CharacterAvatar[] = [
  {
    id: 'hero-01',
    name: 'Hero',
    image: heroPortrait,
    portrait: heroPortrait,
  },
];
