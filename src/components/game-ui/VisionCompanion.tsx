import React, { useContext } from 'react';
import { VISION_CAST, VisionSceneContext } from '../../games/visionScene';
import {originalHeroId} from '../../assets/characters/originalHeroes';
import VisionCharacter from './VisionCharacter';
import type {HeroArtPose} from '../../assets/characters/originalHeroActivities';
import './companion-staging.css';

// These games already place an actor in their own physical playfield.
const OWN_ACTOR = new Set(['take_out_rush','place_value_panic','number_line_ninja','maths_vs_zombies','angle_arena','factor_frenzy','order_ops_arena','share_splitter','simplify_sprint','unit_mixer','fraction_forge','change_counter']);
const HELPER_POSES:Partial<Record<string,HeroArtPose>>={
 area_architect:'blueprint',rotation_relay:'guide',coordinates_quest:'navigate',conversion_canyon:'carry',
 polygon_palace:'guide',perimeter_path:'navigate',mean_machine:'guide',graph_grabber:'guide',line_graph_lab:'navigate',
 data_detective:'navigate',multiplication_mine:'blueprint',formula_forge:'blueprint',remainder_run:'guide',
 time_keeper_cove:'navigate',problem_pyramid:'guide',potion_panic:'guide',scale_builder:'blueprint',
 crystal_core:'guide',mirror_gate:'navigate',matrix_match:'blueprint',match3_equivalence:'guide',
};
export default function VisionCompanion({ placement }: { placement: 'stage' | 'question' }) {
  const scene = useContext(VisionSceneContext);
  const identity = originalHeroId(scene.heroIdentity);
  if (!VISION_CAST[scene.key] || (OWN_ACTOR.has(scene.key) && !(scene.key === 'fraction_forge' && placement === 'question'))) return null;
  return <span className={`vision-companion vision-companion--${placement}`} data-vision-companion={scene.key} data-helper-pose={HELPER_POSES[scene.key]??'rest'} aria-hidden="true">
    <VisionCharacter identity={identity} artPose={HELPER_POSES[scene.key]} activity="idle" steady={scene.key === 'match3_equivalence'} decorative />
  </span>;
}
