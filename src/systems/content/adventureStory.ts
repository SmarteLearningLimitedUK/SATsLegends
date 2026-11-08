/** Adventure copy only: never changes questions, answer keys, marks or rewards. */
export const MATHARIA_STORY = 'The Monster Minds are stealing brainpower from Matharia.';

interface AdventureStory { mission: string; tasks: readonly string[]; }
const story = (mission: string, tasks: readonly string[]): AdventureStory => ({mission, tasks});

/** Short tasks follow each game's recovery mission; mathematical data stays in its question. */
export const ADVENTURE_STORIES: Record<string, AdventureStory> = {
  rune_relations:story('The Monster Minds broke the outpost’s rune links. Repair them to reclaim Matharia’s stolen brainpower.',['Repair the first link.','Reconnect the rune path.','Unlock the next seal.','Restore the number bridge.','Repair the gate’s rule.','Release the trapped brainpower.','Rebuild the outpost link.','Free the brainpower store.']),
  shattered_whole:story('Restore the shattered Heart of Wholeness and reclaim the forest’s stolen brainpower.',['Awaken the first fragment.','Repair the crystal seal.','Reconnect the lost magic.','Read the woodland clue.','Restore the ancient pattern.','Rebuild the Heart’s energy.','Break the fractured seal.','Free the forest’s brainpower.']),
  place_value_panic: story('Rebuild the number codes to recover the stolen brainpower.', ['Decode the entrance.', 'Repair the first code.', 'Unlock the next seal.', 'Trace the hidden code.', 'Restore the signal.', 'Decode the vault.', 'Break another seal.', 'Recover the number code.']),
  number_line_ninja: story('Decode the number trail to track down the stolen brainpower.', ['Find the trail.', 'Read the next marker.', 'Decode the route.', 'Trace the hidden path.', 'Locate the crossing.', 'Follow the signal.', 'Read the vault marker.', 'Track the brainpower.']),
  prime_pop: story('Free the prime bubbles carrying Matharia’s stolen brainpower.', ['Find the prime bubbles.', 'Release the trapped energy.', 'Clear the danger line.', 'Follow the prime trail.', 'Free another cluster.', 'Recover the drifting energy.', 'Protect the prime bubbles.', 'Reclaim the brainpower.']),
  rounding_rocket: story('Build a rocket and follow the stolen brainpower into space.', ['Prepare the rocket.', 'Fit the next part.', 'Calibrate the controls.', 'Check the launch code.', 'Set the flight path.', 'Tune the navigation.', 'Trace the energy signal.', 'Prepare for recovery.']),
  maths_vs_zombies: story('Push back the zombies guarding the Monster Minds’ stolen brainpower.', ['Clear the entrance.', 'Push the zombies back.', 'Defend the path.', 'Break their defence.', 'Protect the recovery route.', 'Drive back the guards.', 'Reach the hidden stash.', 'Reclaim the brainpower.']),
  take_out_rush: story('Prepare exact meals to keep Matharia’s brainpower recovery crew going.', ['Feed the scouts.', 'Prepare the next meal.', 'Supply the search party.', 'Pack the rescue meal.', 'Refuel the recovery crew.', 'Fill the next order.', 'Prepare the vault team.', 'Keep the crew going.']),
  fraction_forge: story('Forge fraction keys to unlock the stolen brainpower.', ['Forge the first key.', 'Repair the next lock.', 'Shape another key.', 'Restore the broken seal.', 'Fit the vault key.', 'Strengthen the next key.', 'Unlock the energy store.', 'Free the brainpower.']),
  match3_equivalence: story('Match equal values to release the brainpower trapped in crystals.', ['Find the matching values.', 'Link the crystal energy.', 'Release another cluster.', 'Reconnect the broken chain.', 'Clear the crystal seal.', 'Restore the energy flow.', 'Open the crystal store.', 'Free the trapped brainpower.']),
  percent_power: story('Restore the reactor to draw stolen brainpower back to Matharia.', ['Restart the reactor.', 'Charge the next cell.', 'Restore the power flow.', 'Balance the energy supply.', 'Repair the power link.', 'Boost the recovery signal.', 'Power the vault receiver.', 'Draw the brainpower home.']),
  simplify_sprint: story('Unlock the fraction gates along the stolen brainpower’s escape route.', ['Open the first gate.', 'Clear the next checkpoint.', 'Unlock the path.', 'Pass the fraction seal.', 'Trace the escape route.', 'Open the hidden gate.', 'Reach the vault passage.', 'Follow the brainpower trail.']),
  angle_arena: story('A Monster Mind is guarding the frozen route. Aim the cannon to clear a path for the rescue crew.', ['The lookout spots you.', 'Ice blocks the bridge.', 'The guard raises a shield.', 'A frozen beam bars the way.', 'The vault gate is in range.', 'The ice wall cracks.', 'The crew is ready to cross.', 'One last defence stands.']),
  polygon_palace: story('Identify the palace’s shapes to find where the brainpower is hidden.', ['Read the palace seal.', 'Identify the next symbol.', 'Decode the doorway.', 'Inspect the hidden shape.', 'Read the chamber clue.', 'Find the matching seal.', 'Trace the vault symbol.', 'Locate the brainpower store.']),
  area_architect: story('Repair Matharia’s damaged rooms so recovered brainpower can be stored safely.', ['Measure the damaged room.', 'Plan the next repair.', 'Restore the floor.', 'Measure the repair space.', 'Rebuild the storage room.', 'Check the repair plan.', 'Prepare the recovery chamber.', 'Make room for brainpower.']),
  rotation_relay: story('Restore the transformed map pieces to reveal the brainpower route.', ['Restore the first map.', 'Move the next piece.', 'Repair the route map.', 'Align the hidden marker.', 'Restore the map seal.', 'Reveal the next passage.', 'Locate the vault route.', 'Trace the brainpower path.']),
  coordinates_quest: story('Use the coordinates to track the stolen brainpower across Matharia.', ['Locate the first clue.', 'Follow the next signal.', 'Mark the hidden route.', 'Find the next waypoint.', 'Trace the energy trail.', 'Locate the secret crossing.', 'Find the vault position.', 'Track the brainpower stash.']),
  conversion_canyon: story('Weigh recovery supplies for the journey to the stolen brainpower.', ['Weigh the first shipment.', 'Pack the next supplies.', 'Balance the recovery load.', 'Prepare the canyon delivery.', 'Check the rescue cargo.', 'Load the vault supplies.', 'Prepare the recovery shipment.', 'Send the crew onward.']),
  perimeter_path: story('Repair the boundary protecting Matharia’s brainpower recovery route.', ['Inspect the damaged boundary.', 'Measure the next section.', 'Repair the outer path.', 'Check the broken fence.', 'Protect the recovery trail.', 'Measure the vault boundary.', 'Secure the next passage.', 'Guard the brainpower route.']),
  mean_machine: story('The stolen crystals leave an energy trail. Analyse the power cells to find where it leads.', ['The first cells light up.', 'A signal comes from the docks.', 'The trail splits in two.', 'One cell stops reporting.', 'The signal reaches the lab.', 'The vault sends a pulse.', 'The crew finds the signal.', 'The source is close.']),
  graph_grabber: story('The Monster Minds hid the crystals in ordinary cargo. Read the harbour records to track their shipment.', ['The dockmaster has a clue.', 'Two cargo records disagree.', 'A crate was left on the quay.', 'The next boat is loading.', 'A hidden ledger turns up.', 'The crew tracks the cargo.', 'The last record leads to the vault.']),
  line_graph_lab: story('The dock records lead to a hidden lab. Trace its readings to find where the Monster Minds took the crystals.', ['The lab is still warm.', 'The sensor records a change.', 'A reading is missing.', 'The trail leads downstairs.', 'The vault sensor wakes up.', 'The crew follows the signal.', 'The last graph reveals the route.']),
  data_detective: story('Use every clue to identify who is hiding the stolen brainpower.', ['Inspect the first clue.', 'Compare the suspects.', 'Trace the stolen stash.', 'Check the next alibi.', 'Connect the evidence.', 'Inspect the hidden record.', 'Identify the vault guard.', 'Find the brainpower thief.']),
  factor_frenzy: story('Open the sentinel’s factor locks to free the stolen brainpower.', ['Decode the first lock.', 'Open the next seal.', 'Repair the factor code.', 'Unlock another barrier.', 'Trace the hidden factor.', 'Decode the vault lock.', 'Open the energy seal.', 'Free the brainpower store.']),
  multiplication_mine: story('The Monster Minds sealed brainpower inside the ore. Calculate four strikes to free the crystal for the rescue crew.', ['A blue glint shows in the ore.', 'A crack opens in the rock.', 'The crystal starts to shine.', 'One last layer holds it in.', 'The crystal is free.']),
  order_ops_arena: story('Resolve the operation codes to break the Monster Minds’ defences.', ['Break the first code.', 'Decode the next defence.', 'Resolve the hidden code.', 'Clear the next barrier.', 'Repair the operation seal.', 'Decode the vault defence.', 'Open the recovery passage.', 'Reach the brainpower store.']),
  formula_forge: story('The rescue crew needs a key cut to the vault’s exact measurements. Work out each value before you forge it.', ['The vault key needs a blank.', 'The first piece fits.', 'A new slot needs measuring.', 'The key is taking shape.', 'The last tooth needs a fit.', 'The key is ready for the lock.']),
  remainder_run: story('Pack the harbour supplies for Matharia’s brainpower recovery fleet.', ['Pack the first shipment.', 'Load the next boat.', 'Share the rescue supplies.', 'Prepare the harbour delivery.', 'Check the remaining cargo.', 'Supply the vault crew.', 'Pack the recovery shipment.', 'Send the fleet onward.']),
  time_keeper_cove: story('Restore the clocks guiding the search for Matharia’s stolen brainpower.', ['Restore the first clock.', 'Set the next signal.', 'Repair the time marker.', 'Synchronise the search crew.', 'Check the recovery time.', 'Restore the vault clock.', 'Set the return signal.', 'Guide the brainpower home.']),
  problem_pyramid: story('Restore the number stones sealing away Matharia’s stolen brainpower.', ['Break the first seal.', 'Unlock the next chamber.', 'Build the number link.', 'Decode the hidden stone.', 'Repair the upper chamber.', 'Trace the vault code.', 'Open the pyramid seal.', 'Free the brainpower store.']),
  unit_mixer: story('Stabilise the stepping stones to cross the lava and recover stolen brainpower.', ['Stabilise the first stone.', 'Secure the next crossing.', 'Repair the lava path.', 'Clear the broken passage.', 'Reach the hidden crossing.', 'Stabilise the vault route.', 'Secure the recovery path.', 'Cross towards the brainpower.']),
  change_counter: story('Give exact change to keep Matharia’s recovery supplies moving.', ['Check the first receipt.', 'Settle the next order.', 'Pay for rescue supplies.', 'Check the cargo bill.', 'Prepare the crew’s change.', 'Settle the vault delivery.', 'Check the recovery order.', 'Keep the supplies moving.']),
  potion_panic: story('Brew exact mixtures to release the brainpower trapped by the Monster Minds.', ['Mix the first brew.', 'Prepare the next potion.', 'Repair the release mixture.', 'Blend the rescue brew.', 'Prepare the vault potion.', 'Balance the hidden recipe.', 'Mix the recovery potion.', 'Release the trapped brainpower.']),
  share_splitter: story('Share supplies fairly among the crew recovering Matharia’s brainpower.', ['Supply the first team.', 'Share the next batch.', 'Prepare the scouts’ portions.', 'Divide the rescue supplies.', 'Supply the search party.', 'Share the vault provisions.', 'Prepare the recovery crew.', 'Keep every team supplied.']),
  ratio_fractions: story('Mix the right fuel to catch the stolen brainpower convoy.', ['Prepare the first boost.', 'Mix the next fuel.', 'Follow the escaping convoy.', 'Power the recovery kart.', 'Refuel the pursuit.', 'Reach the vault road.', 'Prepare the recovery boost.', 'Catch the brainpower convoy.']),
  scale_builder: story('Rebuild scaled models to repair Matharia’s brainpower recovery stations.', ['Plan the first repair.', 'Resize the next model.', 'Restore the damaged blueprint.', 'Check the new dimensions.', 'Rebuild the recovery station.', 'Scale the vault model.', 'Prepare the storage blueprint.', 'Repair the brainpower station.']),
  calendar_quest: story('Plan the recovery crew’s dates to intercept the stolen brainpower.', ['Plan the first journey.', 'Schedule the next search.', 'Check the crew’s dates.', 'Plan the rescue meeting.', 'Schedule the supply arrival.', 'Find the vault date.', 'Plan the recovery journey.', 'Arrange the return home.']),
};

const aliases: Record<string,string> = {fraction_match:'match3_equivalence',rotation_station:'rotation_relay',timekeeper_temple:'time_keeper_cove',potion_pour:'potion_panic'};
export function getAdventureStory(key: string): AdventureStory | undefined {
  const canonical = Object.hasOwn(aliases,key) ? aliases[key] : key;
  return Object.hasOwn(ADVENTURE_STORIES,canonical) ? ADVENTURE_STORIES[canonical] : undefined;
}
/** The same question/step always gets the same copy, including after a mistake or pause. */
export function adventureTask(key: string, step = 0): string {
  const tasks = getAdventureStory(key)?.tasks;
  if (!tasks?.length) return '';
  const index = Number.isFinite(step) ? Math.max(0, Math.floor(step)) : 0;
  return tasks[index % tasks.length];
}
export function adventureQuestion(key: string, step: number, question: string): string {
  const task = adventureTask(key, step);
  return task ? `${task} ${question}` : question;
}
export function adventureBriefing(key: string, fallback: string): string {
  const mission = getAdventureStory(key)?.mission;
  return mission ? `${MATHARIA_STORY} ${mission}` : fallback;
}

/** The banquet heading has room for one short line above its separate ratio. */
export function shareMissionQuestion(step: number, cakes: number, crew: number): string {
  const tasks = [
    `Crew of ${crew}: share ${cakes} cakes.`, `Share ${cakes} cakes: ${crew} crew.`,
    `Supply ${crew} crew: ${cakes} cakes.`, `Split ${cakes} cakes: ${crew} crew.`,
    `Feed ${crew} crew: ${cakes} cakes.`, `Crew of ${crew}: split ${cakes} cakes.`,
    `Allocate ${cakes} cakes: ${crew} crew.`, `Provision ${crew} crew: ${cakes} cakes.`,
  ];
  const index = Number.isFinite(step) ? Math.max(0, Math.floor(step)) : 0;
  return tasks[index % tasks.length];
}
