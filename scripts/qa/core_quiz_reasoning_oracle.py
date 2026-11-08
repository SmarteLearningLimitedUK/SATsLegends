"""Independent reasoning-template and diagram checks from displayed givens."""
import json,re,math
from fractions import Fraction as F
from pathlib import Path
R=Path('qa-artifacts/core-quizzes-2026-11-05')
number=lambda s:[F(n) for n in re.findall(r'-?\d+(?:\.\d+)?',s)]
def nearest(n,p):return int(F(n,p)+F(1,2))*p
checks=0;families=set();failures=[]
for paper in json.loads((R/'reasoning-oracle-input.json').read_text(encoding='utf8')):
 for q in paper['missions']:
  k=q['id'];v=q['visual'];a=[f['answer'] for f in q['fields']];expected=None
  if k=='quiz-round-three':expected=[str(nearest(int(v['lines'][0]),p)) for p in [10,100,1000]]
  elif k in ['quiz-written-digits','quiz-subtraction-digits']:
   lines=q['assessment']['response']['lines'];solutions=[]
   for x in range(10):
    for y in range(10):
     top=lines[0].replace('□',str(x)).replace(' ','');bottom=lines[2].replace('□',str(y)).replace(' ','')
     if top.startswith('0'):continue
     operand=int(number(lines[1])[0]);lhs=int(top)*operand if k=='quiz-written-digits' else int(top)-operand
     if lhs==int(bottom):solutions.append([str(x),str(y)])
   assert len(solutions)==1,(k,solutions);expected=solutions[0]
  elif k=='quiz-prime-set':
   opts=q['assessment']['response']['options'];expected=[json.dumps([str(i) for i,n in enumerate(map(int,opts)) if n>=2 and all(n%d for d in range(2,math.isqrt(n)+1))],separators=(',',':'))]
  elif k=='quiz-fraction-blank':
   left,right=v['values'];expected=[str(F(left)*int(right.split('/')[1]))]
  elif k=='quiz-fraction-matches':expected=[str(F(f['label'])) for f in q['fields']]
  elif k=='quiz-stock-rate':
   b,c,d=[number(s)[0] for s in v['lines']];expected=[str(b*c/d)]
  elif k=='quiz-mean-round':
   mean=sum(F(row[1]) for row in v['rows'])/len(v['rows']);expected=[str(nearest(mean,100))]
  elif k=='quiz-multi-cost':
   books,cost=number(v['lines'][0]);classes,spend=number(v['lines'][1]);expected=[str(books*cost-classes*spend)]
  elif k=='quiz-large-order':expected=[json.dumps(sorted(q['assessment']['response']['values'],key=F),separators=(',',':'))]
  elif k=='depth-table-complete':
   expected=[]
   for r,c in q['assessment']['response']['cells']:
    row=v['rows'][r];expected.append(str(F(row[3])-F(row[1 if c==2 else 2]) if c in [1,2] else F(row[1])+F(row[2])))
  elif v['type']=='symmetry':
   expected=[';'.join(sorted(f'{5-x},{y}' for x,y in v['cells']))];a=[';'.join(sorted(a[0].split(';')))]
  elif v['type']=='depth' and v['model']['kind']=='line-build':expected=['line:'+':'.join(str(x) for x in v['model']['readings'])]
  elif v['type']=='depth' and v['model']['kind']=='pie-build':
   counts=v['model']['counts'];expected=['pie:'+':'.join(str(F(x*360,sum(counts))) for x in counts)]
  if expected is None:continue
  families.add(k);checks+=1
  try:
   assert len(a)==len(expected)
   for actual,wanted in zip(a,expected):
    if actual==wanted:continue
    assert F(actual)==F(wanted),(actual,wanted)
  except Exception as error:failures.append({'seed':paper['seed'],'id':k,'actual':a,'expected':expected,'error':str(error)})
result={'status':'pass' if not failures else 'fail','checks':checks,'families':sorted(families),'method':'Independent Python exact fractions, digit enumeration, prime factor trials, grid reflection and chart-angle calculations. Only the listed archetypes were independently checked.','failures':failures}
(R/'independent-reasoning-results.json').write_text(json.dumps(result,indent=2),encoding='utf8');print(json.dumps(result));assert not failures
