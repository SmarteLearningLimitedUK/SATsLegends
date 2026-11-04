/** iOS access checks wrap existing navigation, never question/scoring logic. */
export function adaptNativeFlow(code: string, file: string, root: string, modulePath: (name: string) => string) {
  if (file !== `${root}/src/App.tsx`) return code;
  code = code.replace(/\r\n/g, '\n');
  const declaration = 'const App: React.FC = () => {';
  const select = '  const handleLevelSelect = (level: LevelData) => {';
  if (!code.includes(declaration) || !code.includes(select)) throw new Error('Native access navigation adapter changed; inspect App source.');
  return `import {useNativeAccess} from '${modulePath('app/NativeAccess')}';\nimport {canAccessLevel} from '${modulePath('app/accessPolicy')}';\n` + code
    .replace(declaration, `${declaration}\n  const nativeAccess = useNativeAccess();`)
    .replace(select, `${select}\n    if (selectedIsland && !canAccessLevel(nativeAccess.fullAccess, selectedIsland.id, level)) { nativeAccess.openUpgrade(); return; }`);
}
