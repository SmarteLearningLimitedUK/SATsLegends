"""Independent displayed-question checks using Python's Gregorian calendar, not the JS generator."""
import calendar,json,re
from datetime import datetime,date,timedelta
from pathlib import Path
out=Path('qa-artifacts/calendar-pictogram-2026-11-04')
rows=json.loads((out/'question-samples.json').read_text(encoding='utf-8'))
def dates(prompt):return [datetime.strptime(s,'%d %B %Y').date() for s in re.findall(r'\d{1,2} [A-Z][a-z]+ \d{4}',prompt)]
checks=0
for row in rows:
 c=row['calendar'];tier=row['tier'];prompt=c['mission']['prompt'];answer=c['answer'];ds=dates(prompt)
 if tier==1:
  match=re.search(r'in (\d{4})\?',prompt)
  expected=(366 if calendar.isleap(int(match[1])) else 365) if match else None
  if not match:expected=calendar.monthrange(c['year'],c['month']+1)[1]
 elif tier==2:
  nums=list(map(int,re.findall(r'\d+',prompt)))
  expected=nums[0]*(12 if 'months' in prompt else 7)+nums[1]
 elif tier==3:expected=(ds[1]-ds[0]).days
 elif tier==4:
  weeks,days=map(int,re.search(r'lasts (\d+) weeks and (\d+) days',prompt).groups())
  expected=(ds[0]+timedelta(days=weeks*7+days)).isoformat()
 else:
  days=int(re.search(r'at least (\d+) days',prompt)[1]);weekday=re.search(r'on a ([A-Z][a-z]+)',prompt)[1]
  expected_date=ds[0]+timedelta(days=days)
  while expected_date.strftime('%A')!=weekday:expected_date+=timedelta(days=1)
  expected=expected_date.isoformat()
 assert str(expected)==answer,('calendar',row['seed'],tier,expected,answer)
 p=row['pictogram'];m=p['model'];mission=p['mission'];value=mission['fields'][0]['answer']
 if p['build']:
  symbols=list(map(int,value.split(':')[1:]));assert [h*m['key']/2 for h in symbols]==m['counts']
  if tier==4:assert sum(m['counts'])==m['total'] and 0<=m['hiddenCountIndex']<3
 else:
  symbols=list(map(int,p['initialValue'].split(':')[1:]));assert [h*m['key']/2 for h in symbols]==m['counts']
  if 'one whole symbol' in mission['prompt']:expected_p=m['key'];assert m['hideKey'] is True
  elif 'all three' in mission['prompt']:expected_p=sum(m['counts'])
  else:
   label=next(label for label in m['labels'] if label in mission['prompt']);expected_p=m['counts'][m['labels'].index(label)]
  assert float(value)==expected_p,('pictogram',row['seed'],tier)
 checks+=2
(out/'independent-oracle.json').write_text(json.dumps({'passed':True,'independentQuestionChecks':checks},indent=2))
print(f'PASS: {checks:,} independently recomputed displayed calendar/pictogram questions')
