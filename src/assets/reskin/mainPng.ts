import boosterHolder from './main_png/booster_holder.png';
import closeButton from './main_png/close_button.png';
import key from './main_png/key.png';
import key2 from './main_png/key2.png';
import largeAvatarFrame from './main_png/large_avatar_frame.png';
import mission from './main_png/mission.png';
import separator from './main_png/separator.png';
import skull from './main_png/skull.png';
import smallAvatarFrame from './main_png/small_avatar_frame.png';
import textBox from './main_png/text_box.png';
import treasureChest from './main_png/treasure_chest.png';
import treasureChest2 from './main_png/treasure_chest2.png';

export const MAIN_PNG_SKIN = {
  boosterHolder,
  closeButton,
  key,
  key2,
  largeAvatarFrame,
  mission,
  separator,
  skull,
  smallAvatarFrame,
  textBox,
  treasureChest,
  treasureChest2,
} as const;

export type MainPngSkinKey = keyof typeof MAIN_PNG_SKIN;
