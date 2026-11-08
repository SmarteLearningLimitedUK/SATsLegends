import type {SatsDomain} from './satsAdventure';
export interface PaperProfile {questions:number;two:number;three:number;domains:Record<SatsDomain,number>}
export interface AssessmentProfile {year:number;arithmetic:Record<'N'|'C'|'F'|'R',number>;reasoning:[PaperProfile,PaperProfile]}
// Observed primary-domain marks and item counts, not universal annual topic rules.
// Source: STA mark schemes 2022–2026, coverage table p4; local audit dataset.
export const ASSESSMENT_PROFILES:AssessmentProfile[]=[
 {year:2022,arithmetic:{N:1,C:22,F:14,R:3},reasoning:[{questions:25,two:10,three:0,domains:{N:4,C:10,F:5,R:2,A:2,M:5,G:3,P:2,S:2}},{questions:21,two:12,three:1,domains:{N:4,C:10,F:5,R:2,A:1,M:6,G:3,P:1,S:3}}]},
 {year:2023,arithmetic:{N:1,C:22,F:14,R:3},reasoning:[{questions:26,two:7,three:1,domains:{N:5,C:8,F:5,R:3,A:2,M:6,G:3,P:1,S:2}},{questions:23,two:8,three:2,domains:{N:4,C:7,F:7,R:3,A:3,M:4,G:3,P:1,S:3}}]},
 {year:2024,arithmetic:{N:1,C:24,F:13,R:2},reasoning:[{questions:27,two:8,three:0,domains:{N:5,C:9,F:4,R:2,A:2,M:6,G:3,P:1,S:3}},{questions:24,two:9,three:1,domains:{N:4,C:9,F:7,R:2,A:2,M:5,G:3,P:1,S:2}}]},
 {year:2025,arithmetic:{N:1,C:23,F:13,R:3},reasoning:[{questions:23,two:12,three:0,domains:{N:5,C:10,F:7,R:2,A:2,M:3,G:2,P:2,S:2}},{questions:22,two:11,three:1,domains:{N:5,C:9,F:5,R:2,A:2,M:6,G:2,P:1,S:3}}]},
 {year:2026,arithmetic:{N:2,C:22,F:13,R:3},reasoning:[{questions:23,two:12,three:0,domains:{N:5,C:7,F:4,R:4,A:2,M:6,G:2,P:1,S:4}},{questions:21,two:12,three:1,domains:{N:3,C:9,F:5,R:4,A:2,M:5,G:2,P:2,S:3}}]},
];
/** Stable 32-bit generator; no five-value modulo cycle or dependency on Math.random. */
export function assessmentRandom(seed:number){let state=(Math.trunc(seed)^0x9e3779b9)>>>0;return {int(min:number,max:number){state=(Math.imul(state,1664525)+1013904223)>>>0;return min+Math.floor(state/4294967296*(max-min+1));},shuffle<T>(values:readonly T[]):T[]{const a=[...values];for(let i=a.length-1;i>0;i--){state=(Math.imul(state,1664525)+1013904223)>>>0;const j=Math.floor(state/4294967296*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}};}
export const assessmentProfile=(seed:number)=>ASSESSMENT_PROFILES[((Math.trunc(seed)%5)+5)%5];
