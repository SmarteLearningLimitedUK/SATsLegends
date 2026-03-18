import topIconTabbar from './slices/top_icon_tabbar.png';
import topTabsRow from './slices/top_tabs_row.png';
import topCurrencyRow from './slices/top_currency_row.png';

import panelLargeLeft from './slices/panel_large_left.png';
import panelLargeRight from './slices/panel_large_right.png';
import panelMediumLeft from './slices/panel_medium_left.png';
import panelMediumCenter from './slices/panel_medium_center.png';
import panelMediumRight from './slices/panel_medium_right.png';
import panelCenterRibbon from './slices/panel_center_ribbon.png';

import cardTall from './slices/card_tall.png';
import formPanel from './slices/form_panel.png';
import formInputSlot from './slices/form_input_slot.png';
import formInputSlot2 from './slices/form_input_slot_2.png';
import glowCard from './slices/glow_card.png';
import glowCardBase from './slices/glow_card_base.png';

import buttonGroupFrame from './slices/button_group_frame.png';
import buttonTallPrimary from './slices/button_tall_primary.png';
import buttonSquareBlue from './slices/button_square_blue.png';
import buttonSquareYellow from './slices/button_square_yellow.png';

import statusBoardTopbar from './slices/status_board_topbar.png';
import statusBoardYellowRow from './slices/status_board_yellow_row.png';
import smallButtonYellow from './slices/small_button_yellow.png';
import smallButtonBlue from './slices/small_button_blue.png';

import infoBarLight from './slices/info_bar_light.png';
import infoBarDark from './slices/info_bar_dark.png';
import speechBubbleLong from './slices/speech_bubble_long.png';
import speechBubbleShort from './slices/speech_bubble_short.png';
import tinyActionRow from './slices/tiny_action_row.png';
import buttonRowSmall from './slices/button_row_small.png';

import progressGroup from './slices/progress_group.png';
import progressLongFg from './slices/progress_long_fg.png';
import progressLongBg from './slices/progress_long_bg.png';

import boardLarge from './slices/board_large.png';
import joystickCluster from './slices/joystick_cluster.png';

export const SCREEN_BUILD_SLICES = {
  topIconTabbar,
  topTabsRow,
  topCurrencyRow,

  panelLargeLeft,
  panelLargeRight,
  panelMediumLeft,
  panelMediumCenter,
  panelMediumRight,
  panelCenterRibbon,

  cardTall,
  formPanel,
  formInputSlot,
  formInputSlot2,
  glowCard,
  glowCardBase,

  buttonGroupFrame,
  buttonTallPrimary,
  buttonSquareBlue,
  buttonSquareYellow,

  statusBoardTopbar,
  statusBoardYellowRow,
  smallButtonYellow,
  smallButtonBlue,

  infoBarLight,
  infoBarDark,
  speechBubbleLong,
  speechBubbleShort,
  tinyActionRow,
  buttonRowSmall,

  progressGroup,
  progressLongFg,
  progressLongBg,

  boardLarge,
  joystickCluster,
} as const;

export type ScreenBuildSliceKey = keyof typeof SCREEN_BUILD_SLICES;
