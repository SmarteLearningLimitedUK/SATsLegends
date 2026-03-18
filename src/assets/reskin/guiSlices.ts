import headerBar from '../casual_ui/dialogs_panels/currency_display_bar.png';
import panelPrimary from '../casual_ui/dialogs_panels/panel_3.png';
import panelDark from '../casual_ui/dialogs_panels/panel.png';
import panelPaper from '../casual_ui/dialogs_panels/dialog__popup_1.png';
import listPanel from '../casual_ui/dialogs_panels/list.png';
import buttonPrimary from '../casual_ui/inputs/btn_1.png';
import buttonSecondary from '../casual_ui/inputs/btn_4.png';
import buttonConfirm from '../casual_ui/inputs/btn_2.png';
import buttonIcon from '../casual_ui/inputs/btn_5.png';
import progressBg from '../casual_ui/hud/progress_bar_1__bg.png';
import progressFill from '../casual_ui/hud/progress_bar_1__fg.png';
import hudBoard from '../casual_ui/hud/hud__score_timer_board.png';

export const GUI_SLICES = {
  headerBar,
  panelPrimary,
  panelDark,
  panelPaper,
  listPanel,
  buttonPrimary,
  buttonSecondary,
  buttonConfirm,
  buttonIcon,
  progressBg,
  progressFill,
  hudBoard,
} as const;

export type GuiSliceKey = keyof typeof GUI_SLICES;
