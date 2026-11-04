"""Evidence-led revision audit. Run export-revision-readiness.ts before this file.

Manual judgements are deliberately separate from measured counts. An objective
label or a numeric variant is never treated as proof of complete curriculum depth.
"""
import csv
import hashlib
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'qa-artifacts/revision-readiness'
def read(path):
    return json.loads((ROOT / path).read_text(encoding='utf-8'))
def save(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')

# All 53 KS2 sub-strands, plus the three assumed KS1 foundation groups.
# These judgements concern breadth, not a psychometric mastery certificate.
GROUPS = [
 ('N1','Counting and equal steps','Forward/backward named multiples and powers of ten are present.','Check transfer between spoken counts, number lines and independent continuations.'),
 ('N2','Read, write and order numbers','Large-number ordering and words-to-digits tasks are present.','Digits-to-words response variety is not established by the words-to-digits examples.'),
 ('N3','Place value and Roman numerals','Digit value, large numbers and Roman numeral reading are present.','Add explanation of Roman notation if teaching from scratch; do not confuse reading with writing Roman numerals.'),
 ('N4','Representation, estimation and rounding','Sparse number lines, varied whole-number rounding and decimal rounding are present.','Broaden explain-an-error rounding tasks; the 2026 Paper 3 Q9 asks for a reason, not only a rounded number.'),
 ('N5','Negative numbers','Negative contexts, interval calculations and midpoints are present.','Vary contexts and start/end unknowns; the skill is not missing.'),
 ('N6','Number problems','Lift journeys and number constraints provide examples.','More clues with several simultaneous constraints would improve transfer beyond familiar templates.'),
 ('C1','Mental addition and subtraction','Live arithmetic and larger mental sums are present.','A correct answer alone cannot establish the mental strategy; show worked compensation/partitioning examples.'),
 ('C2','Written addition and subtraction','Column-sized arithmetic and entered answers are present.','Several explanations are generic rules; add fully worked carrying and exchanging examples.'),
 ('C3','Inverse operations and estimates','Inverse checks, estimates and unreasonable-answer judgements are present.','Broaden learner choice of a suitable checking strategy rather than prescribing every rounding step.'),
 ('C4','Addition/subtraction problems','Ticket, money, capacity and multistep contexts are present.','Vary unknown positions and include unprompted operation selection.'),
 ('C5','Factors, multiples and powers','All factors, common factors/multiples, primes, prime factors, squares and cubes are present.','Do not describe these as missing knowledge. Add factor-pair and justification formats for breadth.'),
 ('C6','Mental multiplication and division','Times tables, zero/one, three-factor products and efficient mental products are present.','Measure recall separately from maths coverage; speed alone does not establish understanding.'),
 ('C7','Written multiplication and division','Long-sized products/quotients, multiplication columns and remainder contexts are present.','Explicit worked short- and long-division methods need review; remainder interpretation does not demonstrate a written algorithm.'),
 ('C8','Multiplication/division problems','Money, sharing, scaling, capacity and multistep examples are present.','Broaden unfamiliar contexts and independently chosen methods; sampled bank balance is not an official difficulty calibration.'),
 ('C9','Order of operations','Brackets and mixed operations are present.','Include explanation of equivalent calculations, not only evaluation.'),
 ('F1','Recognising and counting fractions','Discrete portions and fractional/decimal sequences are present.','Equal-part area/strip representations and fractions of a length have less evidenced variety.'),
 ('F2','Equivalence and simplification','Numerical equivalence, simplification and mixed/improper conversion are present.','Visual equivalent fractions including tenths/hundredths are not established by numerical labels. Two conversion families carry the wrong objective code.'),
 ('F3','Comparing fractions','Multiple-fraction ordering, values above one and misconception choices are present.','Extend independent explanations and visual comparisons; do not count numerical variants as different reasoning types.'),
 ('F4','Adding and subtracting fractions','Like/unlike denominators and mixed-number operations are present.','Worked common-denominator diagrams and contextual representations would strengthen revision explanations.'),
 ('F5','Multiplying and dividing fractions','Fraction × whole, fraction × fraction and fraction ÷ whole calculations are present.','Broaden contextual/visual explanations and contrast multiplication with addition.'),
 ('F6','Decimal/fraction relationships','Decimal-to-fraction, decimal digit values and fraction-related quotients are present.','Expand visual tenths/hundredths representations; read primary code evidence alongside actual question wording.'),
 ('F7','Decimal rounding','Whole-number and decimal-place rounding are present.','The 4F7 tagged varied family uses three decimal places, so its label alone is not precise year-specific evidence.'),
 ('F8','Ordering decimals','Multi-value decimal ordering and comparisons are present.','Include equal values with trailing zeroes and varied place lengths in representation review.'),
 ('F9','Decimal arithmetic','Powers of ten, decimal products and quotients are present.','Use concrete worked place-value explanations; final-answer accuracy does not validate a chosen written method.'),
 ('F10','Fraction/decimal problems and accuracy','Fraction-of-amount and exact decimal contexts are present.','No reviewed family demonstrates a calculated answer rounded to a specified accuracy in a context for 6F10.'),
 ('F11','Fraction/decimal/percentage equivalence','Match game has five main equivalence classes; Core adds examples such as 3/8.','Broaden representations and recall beyond the five repeated classes; this is depth, not an absent equivalence topic.'),
 ('F12','Percentage knowledge','Direct percentages, reverse percentages and increases/discounts are present.','Maintain a distinction between understanding percent and contextual percentage reasoning under R2.'),
 ('R1','Relative sizes and proportion','Recipes and scaling quantities provide examples.','Use non-integer multipliers and missing quantities in different positions.'),
 ('R2','Percentage problems','Direct/reverse amounts, discounts, increases and comparing rates are present.','Broaden independently explained choices; no major percentage form was found wholly absent.'),
 ('R3','Similar shapes and scale factors','Known-factor enlargement/reduction and scale questions are present.','Finding an unknown factor from corresponding sides of similar shapes was not found in the reviewed banks.'),
 ('R4','Unequal sharing and grouping','Ratio shares, fractions of a whole and grouping are present.','Vary leftover/unequal-sharing situations and require explanations of the unit part.'),
 ('A1','Missing numbers as algebra','Equation identification and missing-number arithmetic are present.','Writing an expression/equation independently has less breadth than choosing one; some guided families lack a routed game.'),
 ('A2','Simple formulae','Substitution, reverse rules and selecting formulae are present.','Include independently written formulae and a wider range of unknown positions.'),
 ('A3','Linear sequences','Continue, identify rules and generate from position rules are present.','Vary decreasing and non-unit starts; algebraic nth-term notation is not required as an extra SATs gate.'),
 ('A4','Pairs satisfying an equation','Two-unknown pairs and constrained valid pairs are present.','ext-valid-pairs is labelled 6A5 but primarily evidences 6A4. This is a mapping error, not an absent skill.'),
 ('A5','Enumerating possibilities','All-pair and all-possible-value tasks are present.','depth-all-possibilities is labelled 6A4 but primarily evidences 6A5. Broaden contexts and explain how completeness is checked.'),
 ('M1','Compare and convert measures','Mixed-unit comparisons and metric conversions are present.','Confirm each stated unit relationship separately; a general conversion game is not proof of every conversion.'),
 ('M2','Measuring and estimating','Offset rulers, scales and cylinders are present.','Sensible unit/magnitude estimation and differently graduated instruments have less evidenced variety.'),
 ('M4','Time and calendar','Analogue/24-hour clocks, intervals, seconds, overnight journeys and weeks/days are present.','Days in each month and ordinary/leap-year facts were not found; days-to-weeks does not cover this.'),
 ('M5','Metric conversion','Length/mass/capacity metric conversion is present.','Check decimal precision and units attached to answers, not only multiplication by 1,000.'),
 ('M6','Metric and imperial','Supplied imperial approximations and inverse conversions are present.','6M6 is miles/kilometres; pounds/pints/inches cases in the reverse family belong to 5M6.'),
 ('M7','Area and perimeter','Compound area, triangles, parallelograms, irregular estimates and equal-area/different-perimeter examples are present.','Broaden shapes/orientations and explanation of which length is perpendicular; this is not a missing whole topic.'),
 ('M8','Volume and capacity','Cuboid formulae, cube counting and removal contexts are present.','Broaden volume estimation. Physical water-capacity activities are excluded from the paper-revision gate.'),
 ('M9','Problems with measures and money','Costs, change, capacity and mixed-unit contexts are present.','Broaden unknowns and multi-source information; assess interpretation of units explicitly.'),
 ('G2','Properties and classification','2-D/3-D property classification, symmetry, perpendicular/parallel and line types are present.','Core alone underrepresents the main classification game; preserve varied orientations and sorting formats.'),
 ('G3','Drawing, construction and nets','Digital rectangles, symmetry completion, angle construction and cube nets are present.','Cube-net example diversity is limited; physical model making is excluded, but recognition of 3-D shapes remains examinable.'),
 ('G4','Angles','Classifying/estimating, reading/drawing, straight/point/triangle/quadrilateral and opposite angles are present.','Include diagrams that are not to scale and explanations; do not claim protractor work is a practical-only exclusion.'),
 ('G5','Circles','Radius, diameter, circumference vocabulary and radius/diameter relationship are present.','Vary orientation and distinguish naming a part from calculating a related length.'),
 ('P2','Transformations','The main transformation game moves/reflections whole triangles and describes translations.','The old compass-turn family labelled 4P2 is not translation evidence; the actual game supplies relevant practice.'),
 ('P3','Coordinates','Four-quadrant points and whole-shape work in the main transformation game are present.','Core point-only examples do not fully demonstrate plotting/completing polygons; include main-game evidence.'),
 ('S1','Present and interpret data','Bars, line plots, tables, pictograms, pie reading and construction are present.','Constructing a pictogram was not found; a half-symbol reading question is not construction evidence.'),
 ('S2','Problems using data','Comparison, sum/difference, interpolation and timetable/table completion are present.','Broaden two-source and independently explained reasoning beyond familiar chart templates.'),
 ('S3','Mean','Totals, means, zero/decimal values and missing/incorrect mean reasoning are present.','Median, mode and probability are not additional KS2 SATs content gaps for this audit.'),
 ('G1','KS1 shape foundation','Shape-name practice is present.','Assumed foundation, not a separate KS2 Table 3 objective.'),
 ('M3','KS1 measure foundation','Measurement games provide related foundation practice.','Assumed foundation, not a separate KS2 Table 3 objective.'),
 ('P1','KS1 movement foundation','Direction/turn patterns are present.','Assumed foundation, not a separate KS2 Table 3 objective.'),
]

FINDINGS = [
 ('calendar','knowledge','High',['3M4e'],'Month lengths and ordinary/leap-year facts',
  'No calendar-month/leap-year question found in src. depth-calendar only changes days into weeks and days.',
  ['depth-calendar','time-seconds','depth-midnight-duration'],['src/systems/content/satsDepthMissions.ts'],
  'Add month/year facts and varied date contexts; retain the existing clock/duration coverage.'),
 ('visual-equivalence','representation','High',['5F2b'],'Visual equivalent fractions, including tenths and hundredths',
  'Mixed/improper conversion and numerical match labels do not evidence visual equivalence. No equal-part area/strip equivalence task identified.',
  ['ext-mixed-improper','ext-mixed-to-improper','equivalent'],['src/games/FractionMatchGame.tsx','src/components/game-ui/SatsMissionVisual.tsx'],
  'Add equivalent shaded diagrams/strips with different partitions, with entered fractions and explanations.'),
 ('applied-accuracy','application','High',['6F10'],'Round a calculated answer to the requested accuracy',
  'Both directly tagged families ask exact answers or reverse a fraction; neither asks applied rounding.',
  ['depth-decimal-context','fraction-whole'],['src/systems/content/satsAdventure.ts','src/systems/content/satsDepthMissions.ts'],
  'Add measurement/money calculations requiring a rounded final answer and interpretation; distinguish from standalone rounding.'),
 ('unknown-scale','application','High',['6R3'],'Find the scale factor from corresponding sides',
  'ScaleBuilder and reviewed Core/shared examples provide the factor or explicit scale relationship. Unknown-factor similar-shape tasks not found.',
  ['scale'],['src/games/ScaleBuilderGame.tsx','src/systems/content/satsInspiredQuestionBanks.ts'],
  'Add paired similar shapes with one corresponding side pair, find the factor, then an unknown side.'),
 ('pictogram-build','response format','Medium',['3S1'],'Construct a pictogram using a key',
  'Reading a pictogram, including half-symbols, exists; constructing one was not identified.',
  ['depth-pictogram','construct-graph','depth-line-build','depth-pie-build'],['src/systems/content/satsDepthMissions.ts'],
  'Let learners choose/place symbols against categories and a key; retain existing graph construction.'),
 ('written-methods','explanation','High',['5C7b','6C7b','6C7c'],'Teach written division with worked numeric examples',
  'Long-sized quotient questions and remainder contexts exist. General instructions and a final quotient do not establish a worked short/long division lesson.',
  ['ar-short-div','ar-long-div-a','ar-long-div-b','depth-division-check','depth-division-interpret'],['src/components/game-ui/RevisionWorkshop.tsx','src/systems/content/learnerGuides.ts'],
  'Show concrete short- and long-division steps and explain when a remainder is a fraction/decimal or rounds up/down. Automatic handwriting assessment is not required.'),
 ('explanations','explanation','Medium',['3C2','4C2','5C2'],'General rules are not always worked solutions',
  'Every sampled family has explanation text, but several column calculations give generic carry/exchange rules without working through the actual numbers.',
  ['ar-add','ar-subtract','ar-exchange','ext-written-add','ext-written-sub'],['src/systems/content/satsAdventure.ts','src/components/game-ui/RevisionWorkshop.tsx'],
  'Write numeric worked examples, common-error explanations and clear links from an error to the relevant step.'),
 ('targeted-retry','delivery','High',[],'Weak-skill review does not launch fresh targeted practice',
  'Core review priorities link to the old solution. RevisionWorkshop cycles its once-generated family list; wrapping does not regenerate a fresh variant in that session.',
  [],['src/games/BossEncounterGame.tsx','src/components/game-ui/RevisionWorkshop.tsx'],
  'Add a fresh same-skill retry from the review and a clear manual practice route. Spaced/adaptive scheduling is a product enhancement, not missing maths knowledge.'),
 ('orphan-guides','delivery','Medium',[],'Some guided bank entries have no matching current game route',
  'calculation_clash guide/bank objects exist, but the current 37-route catalog has no calculation_clash route. Core access remains available.',
  ['ar-add','ar-subtract','inverse','estimate'],['src/systems/content/learnerGuides.ts','src/components/game-ui/PracticeIntroPopup.tsx'],
  'Expose these arithmetic/algebra examples through a reachable existing practice entry; do not count object existence as learner access.'),
 ('metadata','mapping','High',['5F2a','5F2b','6A4','6A5','6F10','6M6','4P2','6C7c','4F7'],'Correct the objective mapping before claiming complete coverage',
  'Conversion, algebra, contextual rounding, imperial, rotation and written-division labels overstate or misstate what particular tasks demonstrate.',
  ['ext-mixed-improper','ext-mixed-to-improper','ext-valid-pairs','depth-all-possibilities','fraction-whole','depth-decimal-context','depth-imperial-reverse','rotation','ext-fractional-remainder','depth-division-interpret','depth-decimal-round-varied'],
  ['src/systems/content/satsAdventure.ts','src/systems/content/satsExtendedMissions.ts','src/systems/content/satsDepthMissions.ts','docs/maths-coverage-evidence.json'],
  'Correct labels and split variable families where the objective changes; rerun an evidence-led coverage report.'),
 ('independent-reasons','response format','Medium',['4F7','6F3','6A5'],'Broaden independent reasoning and explanation',
  'Choices, entered calculations, ordered/set answers and constructions are present. Selecting a supplied reason is a narrower task than constructing an explanation.',
  ['claim','depth-reasonableness','depth-mean-zero-reason','depth-all-possibilities'],['src/systems/content/satsResponseMarking.ts'],
  'Add unscaffolded explain-an-error and justify/all-possibilities prompts with model answers; a universal free-text auto-marker is not necessary.'),
 ('fixed-replay','practice depth','Medium',[],'Some families repeat the identical question across seeds',
  'Sixteen of the 192 families have one numeric/visual/answer signature across the 125 sampled seeds. Fixed vocabulary or formula prompts can be appropriate; fixed applied problems offer limited transfer practice.',
  ['angle','translate','timetable','net','construct-graph'],['src/systems/content/satsAdventure.ts','src/systems/content/satsReplayVariations.ts'],
  'Prioritise new diagrams, contexts and unknown positions for fixed applied families. Do not pad factual prompts with artificial variation or call changed numbers a new reasoning structure.'),
]

CORRECTIONS = {
 'ext-mixed-improper': ['5F2a'], 'ext-mixed-to-improper': ['5F2a'],
 'ext-valid-pairs': ['6A4'], 'depth-all-possibilities': ['6A5'],
 'fraction-whole': ['4F10a'], 'depth-decimal-context': ['5F10'],
 'rotation': [], 'ext-fractional-remainder': [], 'depth-division-interpret': ['6C8'],
 'depth-imperial-reverse': ['5M6'], 'depth-decimal-round-varied': ['5F7'],
}

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    current = read('qa-artifacts/revision-readiness/family-delivery.json')
    families = current['families']
    byid = {q['id']:q for q in families}
    index = read('docs/ks2-assessment-objectives.json')
    old = read('qa-artifacts/content-depth/coverage.json')
    oldrows = {r['code']: r for r in old['rows']}
    labels = {r['code']:r['description'] for r in read('qa-artifacts/maths-curriculum-audit/objectives-extracted.json')}
    # Repair merged/missing extraction entries against framework-plain.txt Table 3.
    labels.update({'3S1':'Interpret and present data using bar charts, pictograms and tables',
      '6A5':'Enumerate possibilities of combinations of two variables',
      '6R4':'Solve unequal-sharing and grouping problems using fractions and multiples',
      '3N2a':'Compare and order numbers up to 1,000; read and write these in numerals and words',
      '5F2a':'Convert mixed numbers and improper fractions, including results greater than one',
      '6M9':'Solve calculation and unit-conversion problems using decimal notation up to three decimal places where appropriate'})
    groups = {g[0]: {'group':g[0], 'title':g[1], 'evidenceSummary':g[2], 'depthLimitation':g[3]} for g in GROUPS}
    assert len(groups)==56
    findings=[]
    for fid,kind,priority,codes,title,evidence,ids,sources,action in FINDINGS:
        assert all(i in byid for i in ids), (fid, ids)
        assert all((ROOT/s).exists() for s in sources), (fid,sources)
        findings.append(dict(id=fid,kind=kind,priority=priority,objectives=codes,title=title,evidence=evidence,families=ids,sources=sources,action=action))
    matrix=[]
    for obj in index['objectives']:
        code=obj['code']; group=re.sub(r'^\d','',code); group=re.sub(r'[a-z]$','',group)
        assert code in labels and group in groups,code
        primary=[q for q in families if code in CORRECTIONS.get(q['id'],[q['reference']])]
        related=[i for i in oldrows[code]['missionIds'] if i in byid and i not in [q['id'] for q in primary]]
        # Remove old semantically invalid evidence rather than carrying it through as coverage.
        related=[i for i in related if i not in CORRECTIONS or code in CORRECTIONS[i]]
        if code=='3M4e': related=list(dict.fromkeys(related+['time-seconds']))
        flags=[f['id'] for f in findings if code in f['objectives']]
        status='Example evidenced; breadth limited' if primary else 'Related practice; exact objective depth unverified'
        if code in ['5F2b','6F10']: status='Required facet not evidenced'
        if code=='3M4e': status='Known fact gap within objective'
        if code in ['3S1','6R3']: status='Practice present; required format/application gap'
        practical='Physical modelling only excluded; 3-D recognition retained' if code=='3G3b' else 'Physical water activity only excluded; volume/capacity knowledge retained' if code=='5M8' else ''
        matrix.append({**obj,'group':group,'objective':labels[code],'reviewStatus':status,
          'primaryExamples':[q['id'] for q in primary], 'relatedCandidates':related,
          'questionTypes':sorted(set(t for q in primary for t in q['responseModes'])),
          'explanation': 'Text available; numeric working quality must be read, not inferred from presence' if primary else 'Group-level guide/related examples only; exact worked example not established',
          'guidedExamples':sum(q['guidedAccess'] for q in primary),
          'coreExamples':sum(bool(q['paperAppearances']) for q in primary),
          'findings':flags,'practicalExclusion':practical,
          'groupEvidence':groups[group]['evidenceSummary'],'depthLimitation':groups[group]['depthLimitation'],
          'legacyNote':oldrows[code]['note']})
    assert len(matrix)==195 and len({r['code'] for r in matrix})==195
    for q in families:
        q['auditedReferences']=CORRECTIONS.get(q['id'],[q['reference']])
        q['explanationJudgement']='General method instruction; needs worked numerical example' if q['id'] in ['ar-add','ar-subtract','ar-exchange','ar-thousands','ar-short-div','ar-long-div-a','ar-long-div-b'] else 'Explanation text present; not independently rated as a complete worked lesson'
    verdict={
      'reviewed':'2026-10-20', 'scope':'England KS2 maths SATs revision companion; years 3–6 paper-testable knowledge, not every practical classroom activity.',
      'verdict':'Broad content coverage, but a comprehensive revision claim is not yet supported.',
      'counts':{'officialObjectives':len(matrix),'ks2Substrands':53,'assumedKs1FoundationGroups':3,'coreFamilies':len(families),'seeds':current['seeds'],
        'sampledFamilyInstances':len(families)*current['seeds'],'guidedFamilies':sum(q['guidedAccess'] for q in families),'familiesSampledInCore':sum(bool(q['paperAppearances']) for q in families),
        'findings':len(findings),'primaryExampleObjectives':sum(bool(r['primaryExamples']) for r in matrix),'objectivesWithRelatedEvidenceOnly':sum(not r['primaryExamples'] for r in matrix)},
      'interpretation':'The 195 rows are a checklist, not 195 independently certified skills. Primary examples are reviewed question/objective matches; related candidates require checking year-specific scope. Neither is a full-depth pass. No coverage percentage is claimed.',
      'legacyReconciliation':'The previous 99 representative / 96 partial / 0 unmatched counts described label/source matches. They are not a count of mastered skills, missing knowledge or complete revision provision. This report removes known false matches and separates facts, application, formats, explanations and delivery.',
      'answerVerification':read('qa-artifacts/maths-curriculum-audit/current-answer-verification.json'),
      'limitations':['Independent answer checks cover the exported Core/shared banks, not every local generator or every possible seed.','Static route/guide joins are not a fresh end-to-end navigation test.','Not every year-specific facet has an independently verified example; rows without a primary match remain explicitly unverified rather than silently green.','This is not an official SATs endorsement, difficulty calibration or proof of learner mastery.','Existing browser evidence is linked for context; no gameplay layout or animation QA was rerun in this content audit.'],
      'excludedAsAdditionalGaps':['Physical modelling with materials and measuring capacity with water, only for their practical components.','Probability, median and mode are not additional KS2 SATs maths content requirements in this audit.','Spaced scheduling, handwriting recognition and automatic marking of every prose explanation are optional systems, not missing mathematical knowledge.'],
      'assumptions':['England end-of-KS2 assessment; current repository is the product source of truth.','The existing 195-objective index is the canonical local checklist, checked against the official framework.','Audit only: no production bank, gameplay, marking or learner progress behaviour was changed.'],
      'externalLegacyAssumptions':False,
      'sources':[{'title':'STA KS2 mathematics framework (Table 3, Table 4 and cognitive domain)','url':index['source']},
        {'title':'GOV.UK framework publication (2026–27 arrangements unchanged)','url':'https://www.gov.uk/government/publications/key-stage-2-mathematics-test-framework'},
        {'title':'Official 2026 KS2 maths papers and mark schemes','url':'https://www.gov.uk/government/publications/key-stage-2-tests-2026-mathematics-test-materials'}],
      'paperBenchmarks':[
        {'paper':'2026 Paper 3 Q9','skill':'Explain an incorrect decimal rounding claim (4F7)','comparison':'Standalone rounding is present; independently constructed explanations need greater variety.'},
        {'paper':'2026 Paper 2 Q20 / Paper 3 Q19','skill':'Pairs satisfying an equation / enumerate possibilities (6A4 / 6A5)','comparison':'Both are present. Two newer families reverse the objective labels.'},
        {'paper':'2026 Paper 2 Q3','skill':'3-D recognition (3G3b)','comparison':'Keep recognition in scope while excluding only the practical model-making component.'},
        {'paper':'2026 Paper 2 Q17','skill':'Miles/kilometres (6M6)','comparison':'Other imperial conversions must not inflate this objective’s evidence.'}],
    }
    verdict['counts']['fixedFamiliesAcrossSample']=sum(q['numericVisualAnswerVariants']==1 for q in families)
    verdict['fixedFamilies']=[q['id'] for q in families if q['numericVisualAnswerVariants']==1]
    inputs=['docs/ks2-assessment-objectives.json','docs/maths-coverage-evidence.json','src/systems/content/satsAdventure.ts','src/systems/content/satsDepthMissions.ts','src/systems/content/satsExtendedMissions.ts','src/systems/content/satsInspiredQuestionBanks.ts','src/systems/content/satsReplayVariations.ts','src/systems/content/learnerGuides.ts','src/components/game-ui/RevisionWorkshop.tsx','src/components/game-ui/PracticeIntroPopup.tsx','src/games/BossEncounterGame.tsx','qa-artifacts/maths-curriculum-audit/game-sources.json','qa-artifacts/maths-curriculum-audit/sources/2026-mark-schemes-plain.txt','qa-artifacts/maths-curriculum-audit/sources/framework-plain.txt']
    inputs += [r['source'] for r in read('qa-artifacts/maths-curriculum-audit/game-sources.json')]
    verdict['inputHashes']={p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in sorted(set(inputs))}
    verdict['changedFiles']=['scripts/export-revision-readiness.ts','scripts/audit-revision-readiness.py','qa-artifacts/revision-readiness/*','qa-artifacts/maths-curriculum-audit/current-inventory.json','qa-artifacts/maths-curriculum-audit/current-answer-verification.json']
    save('audit.json',verdict);save('objectives.json',matrix);save('skill-groups.json',list(groups.values()));save('findings.json',findings);save('families.json',families)
    for name,rows in [('objectives',matrix),('findings',findings),('families',families)]:
        with (OUT/f'{name}.csv').open('w',encoding='utf-8-sig',newline='') as f:
            writer=csv.DictWriter(f,fieldnames=list(dict.fromkeys(k for row in rows for k in row)));writer.writeheader()
            writer.writerows({k:json.dumps(v,ensure_ascii=False) if isinstance(v,(list,dict)) else v for k,v in row.items()} for row in rows)
    render(verdict,matrix,findings,groups,families)
    print(json.dumps(verdict['counts']))

def render(audit,matrix,findings,groups,families):
    e=html.escape
    payload=json.dumps({'objectives':matrix,'groups':list(groups.values()),'families':families},ensure_ascii=False).replace('</','<\\/')
    cards=''.join(f'<article><p class="tag">{e(f["priority"])} · {e(f["kind"])}</p><h3>{e(f["title"])}</h3><p>{e(f["evidence"])}</p><p><strong>Next:</strong> {e(f["action"])}</p><small>{e(", ".join(f["objectives"]))}<br>{e(", ".join(f["families"]))}<br>{e(" · ".join(f["sources"]))}</small></article>' for f in findings)
    sourceLinks=' · '.join(f'<a href="{e(s["url"])}">{e(s["title"])}</a>' for s in audit['sources'])
    document='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SATs Legends · revision readiness audit</title>
<style>*{box-sizing:border-box}body{margin:0;background:#091d28;color:#e9f0ec;font:16px/1.55 system-ui,sans-serif}main{max-width:1320px;padding:32px 24px 80px;margin:auto}h1{font-size:clamp(28px,4vw,48px);line-height:1.15}h2{margin-top:42px;color:#ffda86}h3{margin:8px 0}a{color:#9ce4e5}p{max-width:100ch}small{overflow-wrap:anywhere;color:#acc3cb}.tag{color:#ffda86;font-size:13px;text-transform:uppercase;letter-spacing:.06em}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:16px}article,details{border:1px solid #35515c;border-radius:12px;background:#102c39;padding:18px;min-width:0}details{margin:10px 0}summary{cursor:pointer;font-weight:700}input,select{background:#173945;color:#fff;border:1px solid #60818a;padding:12px;border-radius:6px;font:inherit;max-width:100%}.toolbar{display:flex;flex-wrap:wrap;gap:12px;position:sticky;top:0;background:#091d28;padding:12px 0;z-index:1}.toolbar input{flex:1;min-width:min(100%,250px)}.metrics{display:flex;flex-wrap:wrap;gap:12px}.metrics span{padding:12px 20px;background:#173945;border-radius:8px}dl{display:grid;grid-template-columns:140px 1fr;gap:9px}dt{color:#a4c7ce}dd{margin:0;overflow-wrap:anywhere}button{padding:10px;background:#ffe0a0;color:#10212a;border:0;border-radius:5px;font:inherit;cursor:pointer}.muted{color:#b5cad1}@media(max-width:600px){main{padding:20px 14px}dl{grid-template-columns:1fr}dt{font-weight:700}}
</style><main><p class="tag">Evidence review · 20 October 2026 · England KS2</p><h1>Revision readiness audit</h1><p>Broad maths coverage, but a comprehensive revision claim is not yet supported. The remaining issues concern specific facts, representations, applications and revision support.</p>
<div class="metrics"><span>195 objective rows</span><span>53 KS2 sub-strands</span><span>192 Core families</span><span>30,600 answer fields checked</span></div>
<p class="muted">This is a content audit. A correct answer, an objective label or a large question count does not establish complete skill depth. No production questions or gameplay were changed.</p>
<p><a href="audit.json">Audit / provenance JSON</a> · <a href="objectives.csv">195-row checklist CSV</a> · <a href="families.csv">Family delivery CSV</a> · <a href="findings.csv">Action list CSV</a></p>
<h2>What actually needs attention</h2><div class="grid">CARDS</div>
<h2>What is already present</h2><p>Factors, primes, common multiples, squares/cubes; fraction operations; direct and reverse percentages; clocks and durations; area/perimeter/volume; transformations and coordinates; graph reading and several constructions; formulae, sequences and both algebra pair/possibility skills. These should not be reported as entirely missing topics.</p>
<h2>Every objective, with evidence and limitations</h2><p>Exact examples and related candidates are separated. Rows without a primary example remain unverified for their exact year-specific scope. Related practice is useful evidence, but cannot justify an automatic green tick. The old “99 representative / 96 partial / 0 unmatched” figures were not a completeness score.</p>
<div class="toolbar"><input id="search" aria-label="Search audit" placeholder="Search code, skill or family"><select id="view" aria-label="Checklist view"><option value="objectives">Official objectives</option><option value="groups">Skill-group review</option><option value="families">Question families and access</option></select><select id="filter" aria-label="Evidence filter"><option value="all">All rows</option><option value="gaps">Named findings</option><option value="unverified">No primary example</option></select></div><p id="count" role="status"></p><div id="rows"></div>
<h2>Revision support</h2><p>All 192 sampled families have explanation text. That is not a guarantee of a worked lesson. Some arithmetic explanations describe a general method without demonstrating the current calculation. The family view shows routes, guide keys, response types, seed variety and Core appearances.</p><p>Fresh-session replay varies many numbers. Within one Help workshop, its once-generated list is reused when cycling. Core weak-skill links currently open existing solutions. Targeted fresh retries would make this a stronger revision companion; spaced scheduling is an optional enhancement.</p>
<h2>Paper comparison and scope</h2><p>Official 2026 examples distinguish answer finding from explanation: Paper 3 Q9 asks learners to explain a rounding error. Paper 2 Q20 and Paper 3 Q19 separately exercise equation pairs and listing possibilities. A single paper samples the domain; absence from one year does not remove an objective.</p><p>Only the physical components of making models and measuring capacity with water are excluded. 3-D recognition, volume estimation, ruler reading and protractor construction remain relevant. Probability, median and mode are not extra requirements for this KS2 audit.</p><p>SOURCES</p>
<h2>Verification and limits</h2><p>Fresh export: 125 seeds × 192 families = 24,000 generated mission instances; 375 Core paper selections. Independent exact-arithmetic/geometry checks passed for 30,600 answer fields across the exported Core and shared banks. This does not validate every local generator or unseen seed.</p><p>Static catalog/guide joins establish candidate delivery paths, not a fresh end-to-end browser test. Numeric/visual/answer signatures measure replay variety, not independent problem structures or calibrated difficulty. Every objective has a review row; exact-depth uncertainty is retained rather than hidden.</p><p>Assumptions: England KS2 SATs, current repository, audit only. No external legacy assumptions were used. No gameplay, artwork, backend, marking behaviour or saved progress was changed.</p><p>Changed files: two audit scripts, this report and its JSON/CSV exports; the existing inventory and independent-answer-check artifacts were refreshed. Reproduce with <code>npx tsx scripts/export-maths-audit.ts</code>, <code>python scripts/audit-maths-answers.py</code>, <code>npx tsx scripts/export-revision-readiness.ts</code>, then <code>python scripts/audit-revision-readiness.py</code>.</p>
</main><script>const data=PAYLOAD;const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const join=x=>(x||[]).join(', ')||'None established';const field=(a,b)=>'<dt>'+esc(a)+'</dt><dd>'+esc(b)+'</dd>';function render(){const view=document.querySelector('#view').value,filter=document.querySelector('#filter').value,query=document.querySelector('#search').value.toLowerCase();let rows=data[view].filter(r=>JSON.stringify(r).toLowerCase().includes(query));if(view==='objectives'){if(filter==='gaps')rows=rows.filter(r=>r.findings.length);if(filter==='unverified')rows=rows.filter(r=>!r.primaryExamples.length)}document.querySelector('#count').textContent=rows.length+' of '+data[view].length+' rows';document.querySelector('#rows').innerHTML=rows.map(r=>{if(view==='groups')return '<details><summary>'+esc(r.group+' · '+r.title)+'</summary><p>'+esc(r.evidenceSummary)+'</p><p>'+esc(r.depthLimitation)+'</p></details>';if(view==='families')return '<details><summary>'+esc(r.id+' · '+r.game)+'</summary><p>'+esc(r.prompt)+'</p><dl>'+field('Visual / inputs',r.visual.type+' / '+join(r.responseModes))+field('Bank label',r.reference)+field('Audited label',join(r.auditedReferences))+field('Guided access',r.guidedAccess?'Static route + guide + bank match': 'No matching routed guide in current catalog')+field('Route',r.route||'Not found in catalog')+field('Core selections',JSON.stringify(r.paperAppearances))+field('Variants / 125',r.numericVisualAnswerVariants+' (not a structural breadth count)')+field('Explanation',r.explanation)+field('Quality judgement',r.explanationJudgement)+'</dl></details>';return '<details><summary>'+esc(r.code+' · '+r.objective)+'</summary><p class="tag">'+esc(r.reviewStatus)+'</p><dl>'+field('Exact examples',join(r.primaryExamples))+field('Related candidates',join(r.relatedCandidates))+field('Question types',join(r.questionTypes))+field('Guided / Core',r.guidedExamples+' / '+r.coreExamples+' primary examples')+field('Worked support',r.explanation)+field('Group evidence',r.groupEvidence)+field('Depth limitation',r.depthLimitation)+field('Named findings',join(r.findings))+field('Practical exclusion',r.practicalExclusion||'None')+'</dl></details>'}).join('')}for(const id of ['search','view','filter'])document.getElementById(id).addEventListener('input',render);render();</script></html>'''
    document=document.replace('CARDS',cards).replace('SOURCES',sourceLinks).replace('PAYLOAD',payload)
    (OUT/'index.html').write_text(document,encoding='utf-8')

if __name__=='__main__':
    main()
