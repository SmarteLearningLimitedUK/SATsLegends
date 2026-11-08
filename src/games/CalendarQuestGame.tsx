import RevisionActivityGame,{type RevisionActivityGameProps} from './RevisionActivityGame';
export default function CalendarQuestGame(p:Omit<RevisionActivityGameProps,'kind'>){return <RevisionActivityGame {...p} kind="calendar"/>;}
