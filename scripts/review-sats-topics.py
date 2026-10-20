"""SATs-only topic review: revision practice, not a concept-teaching audit."""
import csv
import hashlib
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'qa-artifacts/sats-topic-review'
FRAMEWORK = 'https://assets.publishing.service.gov.uk/media/5a822bbded915d74e62362a2/2016_KS2_Mathematics_framework_PDFA_V5.pdf'

def load(name):
    return json.loads((ROOT / name).read_text(encoding='utf-8'))

GAPS = [
    dict(id='calendar-facts', title='Calendar facts and years/months conversion', codes=['3M4e','4M4c'], pages=[22],
         kind='Missing facts / conversion examples',
         present='Analogue/24-hour clocks, Roman clock numerals, seconds/minutes, weeks/days and overnight durations are already present.',
         missing='Days in each month, days in ordinary/leap years, and years-to-months practice were not identified.',
         evidence=['src/systems/content/satsDepthMissions.ts: depth-calendar, depth-midnight-duration', 'src/systems/content/satsAdventure.ts: time-seconds, clock', 'src/systems/content/satsExtendedMissions.ts: ext-clock-24', 'src/games/ChronoDashGame.tsx: generateRandomTime'],
         example='How many months are there in 2 years and 3 months?', answer='27 months',
         action='Add a small rotating set to time practice. No calendar lesson or separate calendar game is required.'),
    dict(id='visual-equivalence', title='Equivalent fractions shown in diagrams', codes=['3F2','4F2','5F2b'], pages=[17],
         kind='Missing representation',
         present='Numerical fraction equivalence, mixed/improper conversion, decimal/percentage matching and portion arithmetic are present.',
         missing='Equivalent shaded areas or strips with different partitions, including tenths and hundredths, were not identified.',
         evidence=['src/games/FractionMatchGame.tsx: GEM_VALUE_POOLS, numeric TileValue labels', 'src/components/game-ui/SatsMissionVisual.tsx: fractions visual', 'src/systems/content/satsExtendedMissions.ts: ext-mixed-improper, ext-mixed-to-improper'],
         example='A strip has 6 of its 10 equal parts shaded. Complete an equivalent shaded hundred-square and write its fraction.', answer='60/100',
         action='Add diagram-based revision challenges to existing fraction practice. Numerical labels alone do not cover this representation.'),
    dict(id='applied-rounding', title='Round a calculated answer to a specified accuracy', codes=['6F10'], pages=[19],
         kind='Missing application',
         present='Standalone whole/decimal rounding, exact decimal calculations and estimation checks are present.',
         missing='A context requiring a calculation followed by a specified rounding step was not identified. The two 6F10-labelled families do not ask for rounded answers.',
         evidence=['src/systems/content/satsDepthMissions.ts: depth-decimal-context, depth-decimal-round-varied', 'src/systems/content/satsAdventure.ts: fraction-whole, round', 'src/systems/content/satsReplayVariations.ts: decimal-round'],
         example='A ribbon is 5 m long. It is cut into 6 equal pieces. How long is each piece, to the nearest centimetre?', answer='83 cm',
         action='Add short measurement/money contexts with the required accuracy stated in the question. Keep this distinct from remainder interpretation.'),
    dict(id='unknown-factor', title='Find an unknown scale factor for similar shapes', codes=['6R3'], pages=[20],
         kind='Missing application',
         present='Enlarging/reducing with a supplied factor, scale maps and proportional recipe quantities are present.',
         missing='Finding the scale factor from corresponding sides of two similar shapes was not identified.',
         evidence=['src/games/ScaleBuilderGame.tsx: SCALE_BUILDER levels, supplied targetScale', 'src/systems/content/satsAdventure.ts: scale', 'src/systems/content/satsInspiredQuestionBanks.ts: scale_safari'],
         example='Two rectangles are similar. A side of 3 cm corresponds to a side of 9 cm. What is the enlargement scale factor?', answer='3',
         action='Add paired shapes, ask for the missing factor, then vary which side or factor is unknown.'),
    dict(id='pictogram-construction', title='Complete or construct a pictogram using a key', codes=['3S1'], pages=[27],
         kind='Missing response format',
         present='Pictogram reading including half-symbols, bar-chart construction, line plotting and pie-chart construction are present.',
         missing='Placing or completing pictogram symbols to represent supplied category totals was not identified.',
         evidence=['src/systems/content/satsDepthMissions.ts: depth-pictogram, depth-line-build, depth-pie-build', 'src/components/game-ui/SatsConstructionControl.tsx', 'src/systems/content/satsAdventure.ts: construct-graph'],
         example='Each symbol represents 5 books. Complete the row to show 15 books.', answer='3 symbols',
         action='Add a small symbol-placement/completion challenge to graph practice, including occasional half-symbols.'),
    dict(id='correspondence', title='Count combinations of independent choices', codes=['3C8','4C8'], pages=[15],
         kind='Missing multiplication application',
         present='Multiplication facts, products, scaling, sharing and algebraic enumeration are present.',
         missing='Correspondence problems pairing every item in one set with every item in another were not identified. Listing pairs satisfying an equation is a different application.',
         evidence=['src/systems/content/satsAdventure.ts: arithmeticMissions, reasoningMissions', 'src/systems/content/satsDepthMissions.ts: depth-all-possibilities', 'src/systems/content/satsInspiredQuestionBanks.ts: exported shared/context banks', 'src/games/MultiplicationMineGame.tsx', 'src/games/FormulaForgeGame.tsx'],
         example='There are 3 shirts and 4 pairs of trousers. How many different outfits use one shirt and one pair of trousers?', answer='12 outfits',
         action='Add original outfits/menu/flag-choice problems. This is KS2 multiplication reasoning, not probability or permutations notation.'),
    dict(id='measure-estimation', title='Estimate sensible real-world measurements', codes=['4M2'], pages=[21],
         kind='Missing measurement application',
         present='Exact measurement, scale reading, conversions, number-line/angle/area estimates and calculation estimates are present.',
         missing='Choosing a plausible real-world length, mass, capacity or monetary estimate was not identified. Reading a graduated scale is a different task.',
         evidence=['src/games/ConversionCanyonGame.tsx: buildRound', 'src/games/LavaPathGame.tsx: resolveQuestion', 'src/systems/content/satsDepthMissions.ts: depth-ruler-offset, depth-capacity-scale, depth-irregular-estimate', 'src/systems/content/satsInspiredQuestionBanks.ts: measurement bank'],
         example='Which is the best estimate for the mass of an apple: 2 g, 200 g, 20 kg or 200 kg?', answer='200 g',
         action='Add brief plausible-measure and estimated-price questions within measurement/money games. No physical experiment is required.'),
]

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    previous=load('qa-artifacts/revision-readiness/audit.json')
    objectives=load('qa-artifacts/revision-readiness/objectives.json')
    families=load('qa-artifacts/revision-readiness/families.json')
    codes={r['code'] for r in objectives}
    for gap in GAPS:
        assert all(code in codes for code in gap['codes'])
        for evidence in gap['evidence']:
            assert (ROOT/evidence.split(': ')[0]).exists(), evidence
    unchanged=all(hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==h for p,h in previous['inputHashes'].items())
    assert unchanged, 'Content changed since sampled audit. Refresh the inventory before reusing evidence.'
    # Audit scope is now deliberately narrower than the earlier readiness report.
    report=dict(reviewed='2026-10-20', product='Matharia (current SATsLegends repository)',
        purpose='Revise and practise England KS2 SATs maths already taught elsewhere.',
        boundary='Official KS2 test content domain, including rare examinable content; not every curriculum activity or a teaching programme.',
        verdict='All nine broad maths strands have practice. Seven specific examinable facets were not evidenced in the reviewed content.',
        findings=GAPS, objectiveRowsReviewed=len(objectives), coreFamilies=len(families), unchangedSourceHashes=len(previous['inputHashes']),
        evidenceReuse='The 48 hashed audit inputs are unchanged. Reused 125-seed inventory and independently checked answers; this turn re-read the identified sources and searched current banks/games for the candidate omissions.',
        notMissing=['Number/place value/rounding/negative numbers', 'Four operations, factors, primes, squares/cubes and order of operations', 'Fraction operations, decimals and direct/reverse percentages', 'Ratio sharing and supplied-factor scaling', 'Formulae, sequences, equation pairs and enumerating algebraic possibilities', 'Clocks, durations, units, money, area/perimeter and cuboid volume', 'Shapes, angles, nets, circles, symmetry and coordinate transformations', 'Bar/line/pie reading and several construction formats, tables/timetables and mean'],
        noLongerContentBlockers=['Concept lessons and full worked teaching sequences', 'Adaptive/spaced scheduling', 'Automatic marking of handwriting or every prose explanation', 'Identical factual prompts where a fixed fact is appropriate'],
        separateIssues=['Correct mislabelled objective references; a labelling error is not automatically missing maths.', 'Fresh retries and more varied contexts improve revision, but are not new topics.', 'Independent explain-why and varied construction formats have limited breadth; existing choice reasons and rectangle constructions mean those areas are not wholly absent.', 'Simple rate practice has examples such as price per kilogram; do not claim rates are entirely missing.'],
        excluded=['Physical model-making and water-capacity activities, only in their practical components', 'Probability, median/mode, formal permutations/combinations notation and secondary algebra as additional KS2 requirements'],
        limits=['Not evidenced means no relevant task was identified in the reviewed current banks and sources; it is not mathematical proof that no undiscovered route could contain one.', 'The 195-objective checklist is not 195 missing topics. 91 rows lack an exact primary tag; related/lower-year content and main-game evidence must be considered before treating those rows as gaps.', 'All broad strands being represented does not certify every diagram, number range or reasoning format. No coverage percentage or official endorsement is claimed.'],
        assumptions=['Matharia refers to the app in this repository.', 'England end-of-KS2 maths SATs, under the currently published assessment framework.', 'Review only: no learner content or game behaviour changed.'],
        externalLegacyAssumptions=False,
        changedFiles=['scripts/review-sats-topics.py','qa-artifacts/sats-topic-review/index.html','qa-artifacts/sats-topic-review/review.json','qa-artifacts/sats-topic-review/gaps.csv','qa-artifacts/sats-topic-review/objectives.json'],
        sources=[dict(title='Official KS2 mathematics test framework',url=FRAMEWORK),dict(title='Framework publication and current assessment arrangements',url='https://www.gov.uk/government/publications/key-stage-2-mathematics-test-framework')])
    scoped=[]
    for row in objectives:
        matches=[g['id'] for g in GAPS if row['code'] in g['codes']]
        cleaned={'3G3a':'Draw 2-D shapes','4P3b':'Plot specified points and draw sides to complete a given polygon'}.get(row['code'],row['objective'])
        scoped.append(dict(code=row['code'],objective=cleaned,topicGapFindings=matches,
            status='Specific facet not evidenced' if matches else 'No additional topic omission established in this review',
            exampleFamilies=row['primaryExamples'],mainGameGroupEvidence=row['groupEvidence'],
            certainty='Not a completeness certificate; read the linked evidence and limitations.'))
    (OUT/'review.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
    (OUT/'objectives.json').write_text(json.dumps(scoped,indent=2,ensure_ascii=False),encoding='utf-8')
    with (OUT/'gaps.csv').open('w',encoding='utf-8-sig',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=list(GAPS[0])); writer.writeheader()
        writer.writerows({k:json.dumps(v,ensure_ascii=False) if isinstance(v,list) else v for k,v in g.items()} for g in GAPS)
    render(report)
    print(json.dumps({'topicFacetGaps':len(GAPS),'objectiveRows':len(scoped),'unchangedInputs':report['unchangedSourceHashes'],'appChanged':False}))

def render(report):
    e=html.escape
    rows=''.join('<tr><td><strong>'+e(g['title'])+'</strong><br><small>'+e(', '.join(g['codes']))+'</small></td><td>'+e(g['missing'])+'</td><td>'+e(g['present'])+'</td></tr>' for g in GAPS)
    details=''.join('<details><summary>'+e(g['title'])+'</summary><p><strong>Type:</strong> '+e(g['kind'])+'</p><p>'+e(g['action'])+'</p><p><strong>Original example:</strong> '+e(g['example'])+' <strong>Answer:</strong> '+e(g['answer'])+'</p><ul>'+''.join('<li><code>'+e(s)+'</code></li>' for s in g['evidence'])+'</ul><p><a href="'+FRAMEWORK+'#page='+str(g['pages'][0])+'">Official framework reference</a></p></details>' for g in GAPS)
    items=lambda key:'<ul>'+''.join('<li>'+e(x)+'</li>' for x in report[key])+'</ul>'
    page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Matharia · SATs topic review</title><style>*{box-sizing:border-box}body{margin:0;background:#0b202b;color:#eef2ed;font:16px/1.6 system-ui,sans-serif}main{max-width:1200px;margin:auto;padding:32px 24px 70px}h1{font-size:clamp(30px,5vw,48px);line-height:1.15}h2{color:#ffdc92;margin-top:36px}a{color:#9de8e4}small,.muted{color:#b9d0d5}table{width:100%;border-collapse:collapse;background:#12323e}th,td{text-align:left;vertical-align:top;border:1px solid #365460;padding:16px}th{background:#19424e}td:first-child{width:25%}details{padding:18px;border:1px solid #365460;border-radius:8px;margin:12px 0;background:#12323e}summary{cursor:pointer;font-weight:700}code{overflow-wrap:anywhere}li{margin:7px 0}.scroll{overflow:auto}p{max-width:100ch}@media(max-width:700px){main{padding:20px 14px}.scroll table,.scroll tbody,.scroll tr,.scroll td{display:block}.scroll thead{display:none}.scroll td:first-child{width:auto;background:#19424e}.scroll td{border-bottom:0}.scroll tr{margin-bottom:18px;border-bottom:1px solid #365460}}</style><main><p class="muted">SATs revision game review · 20 October 2026</p><h1>Matharia: missing SATs practice</h1><p><strong>All nine broad maths strands are represented. Seven specific examinable facets were not evidenced.</strong> These are gaps within existing topics, not seven missing curriculum subjects.</p><p>This review assumes learners have already been taught the concepts. It only asks whether the game offers relevant England KS2 SATs practice, including rarely examined content.</p><p><a href="review.json">Full evidence and scope</a> · <a href="gaps.csv">Download action checklist</a> · <a href="objectives.json">195-objective scope check</a></p><h2>What needs adding</h2><div class="scroll"><table><thead><tr><th>Examinable facet</th><th>Not evidenced</th><th>Already present</th></tr></thead><tbody>ROWS</tbody></table></div><h2>Evidence and example questions</h2>DETAILS<h2>Already represented</h2>PRESENT<h2>Requirements removed from this review</h2>REMOVED<p>Full lessons, concept teaching and a curriculum sequence are not requirements for a revision game. Brief answer feedback is sufficient. The practical-only components of model-making and water experiments are excluded; shape recognition, diagram construction and paper-based measurement questions remain in scope.</p><h2>Separate from missing topics</h2>SEPARATE<h2>Evidence and limits</h2><p>The existing 192-family, 125-seed inventory was checked against unchanged hashes for 48 source inputs, alongside a new targeted review of banks and main-game generators. Earlier independent checking passed 30,600 exported answer fields. Those checks were not rerun this turn because production content has not changed.</p>LIMITS<p>The earlier readiness report contains teaching and delivery recommendations. Those do not count as missing SATs topics under this clarified brief. This report replaces that interpretation for topic decisions.</p><p><a href="FRAMEWORK">Official test framework</a> · <a href="https://www.gov.uk/government/publications/key-stage-2-mathematics-test-framework">Current framework publication</a></p><h2>Scope and changes</h2>ASSUMPTIONS<p>Changed files: <code>scripts/review-sats-topics.py</code> and the generated HTML, JSON and CSV files in <code>qa-artifacts/sats-topic-review/</code>. App source and game content are unchanged. No external legacy assumptions were used.</p></main></html>'''
    for token,value in {'ROWS':rows,'DETAILS':details,'PRESENT':items('notMissing'),'REMOVED':items('noLongerContentBlockers'),'SEPARATE':items('separateIssues'),'LIMITS':items('limits'),'ASSUMPTIONS':items('assumptions'),'FRAMEWORK':FRAMEWORK}.items():
        page=page.replace(token,value)
    (OUT/'index.html').write_text(page,encoding='utf-8')

if __name__=='__main__': main()
