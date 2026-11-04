/** Screen-space artwork settings; gameplay angles and collision rules stay independent. */
export function angleArenaLayout(width: number, height: number) {
  const shortScreen = height < 500;
  const unit = Math.min(width, height);
  return {
    cannonX: width * .16,
    cannonY: height * (shortScreen ? .61 : .65),
    cannonSize: unit * .36,
    cannonPodiumWidth: Math.min(width * .19, height * .30),
    cannonPodiumHeight: height * .13,
    enemySize: unit * .50,
    enemyPodiumHeight: height * .20,
    targetDistance: width * .68,
    targetRise: height * .07,
    arcHeight: height * .23,
    missSpread: height * .25,
  };
}
