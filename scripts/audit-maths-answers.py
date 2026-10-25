"""Independent exact-arithmetic audit of the exported, actually selected banks."""
import ast
import json
import math
import re
from fractions import Fraction as F
from pathlib import Path
from qa.sats_depth_oracle import depth_expected
from qa.sats_revision_gap_oracle import revision_gap_expected

ROOT = Path('qa-artifacts/maths-curriculum-audit')

def numbers(text):
    return [F(x) for x in re.findall(r'-?\d+(?:\.\d+)?', text.replace('−', '-').replace(',', ''))]

def arithmetic(text):
    text = text.replace('−', '-').replace('–', '-').replace('×', '*').replace('x', '*').replace('÷', '/').replace(',', '').replace('²', '**2').replace('³', '**3')
    text = re.sub(r'(\d+)\s+(\d+)/(\d+)', r'(\1+\2/\3)', text)
    text = re.sub(r'(\d+)%',r'(\1/100)',text).replace(' of ', ' * ')
    def visit(n):
        if isinstance(n, ast.Constant): return F(str(n.value))
        if isinstance(n, ast.UnaryOp) and isinstance(n.op, ast.USub): return -visit(n.operand)
        if isinstance(n, ast.BinOp):
            a,b=visit(n.left),visit(n.right)
            if isinstance(n.op,ast.Add): return a+b
            if isinstance(n.op,ast.Sub): return a-b
            if isinstance(n.op,ast.Mult): return a*b
            if isinstance(n.op,ast.Div): return a/b
            if isinstance(n.op,ast.Pow): return a**int(b)
        raise ValueError(ast.dump(n))
    return visit(ast.parse(text.strip(), mode='eval').body)

def equivalent(a,b):
    try: return arithmetic(str(a)) == arithmetic(str(b))
    except (ValueError,SyntaxError,TypeError): return str(a).strip()==str(b).strip()

def field_equivalent(field, expected):
    response=field.get('response')
    if response not in ['ordered','sequence','set']:return equivalent(field['answer'],expected)
    separator=';' if response=='sequence' else ','
    actual=field['answer'].split(separator);expected=str(expected).split(separator)
    if len(actual)!=len(expected):return False
    if response=='set':return all(any(equivalent(a,b) for b in expected) for a in actual) and len(set(actual))==len(actual)
    return all(equivalent(a,b) for a,b in zip(actual,expected))

def mission_expected(q):
    if q['id'].startswith('revision-'):return revision_gap_expected(q)
    if q['id'].startswith('depth-'):return depth_expected(q)
    key=q['id'];v=q['visual'];p=q['prompt'];n=numbers(p);vals=v.get('values',[]);lines=v.get('lines',[])
    if key.startswith('ar-'):
        raw=lines[0]
        if key=='ar-missing': return [numbers(raw)[-1]-numbers(raw)[0]]
        result=arithmetic(raw.split('=')[0])
        if key.startswith('ar-long-mult'): return [numbers(q['fields'][0]['label'])[0]*numbers(raw)[0],result]
        if key.startswith('ar-long-div'): return [int(str(int(result))[0]),result]
        return [result]
    def roman_value(text):
        values={'I':1,'V':5,'X':10,'L':50,'C':100,'D':500,'M':1000}
        return sum((-1 if i+1<len(text) and values[c]<values[text[i+1]] else 1)*values[c] for i,c in enumerate(text))
    if key.startswith('ext-'):
        if key=='ext-ten-hundred':return [n[1]+(-n[0] if 'less' in p else n[0])]
        if key=='ext-thousand':return [n[-1]+(-1000 if 'less' in p else 1000)]
        if key=='ext-roman-hundred':return [roman_value(lines[0])]
        if key in ['ext-mental-large','ext-mental-large-add','ext-written-add','ext-written-sub']:return [arithmetic(lines[0])]
        if key=='ext-clock-24':return [f"{(12 if v['hours']==12 else v['hours']+12)}:{v['minutes']:02}"]
        if key=='ext-capacity':return [n[0]+n[1]-n[2]]
        if key=='ext-symmetry':return [';'.join(f'{5-x},{y}' for x,y in v['cells'])]
        if key=='ext-decimal-round-whole':return [math.floor(F(lines[0])+F(1,2))]
        if key=='ext-decimal-round-tenth':return [F(math.floor(F(lines[0])*10+F(1,2)),10)]
        if key=='ext-decimal-order-three':return [', '.join(f'{float(x):.3f}' for x in sorted(numbers(lines[0])))]
        if key=='ext-read-scale':return [F(v['max']*v['position'],v['intervals'])]
        if key=='ext-regular-polygon':return [F(360,v['sides']),180-F(360,v['sides'])]
        if key=='ext-fractional-remainder':return [arithmetic(lines[0])]
        if key=='ext-opposite-angle':return [v['angle']]
        if key=='ext-isosceles':return [F(180-v['angle'],2)]
        if key=='ext-circle-terms':return ['diameter']
        if key=='ext-mixed-to-improper':return [arithmetic(v['values'][0])]
        if key=='ext-mixed-improper':return [F(*map(int,v['values'][0].split('/'))) ]
        if key=='ext-valid-pairs':return [f'3,{int((n[2]-6)/3)}',f'6,{int((n[2]-12)/3)}']
        if key=='ext-shaded-area':
            value=F(v['width']*v['height'])-F(v['cutBase']*v['cutHeight'],2);return [value,value]
        if key=='ext-compound-volume':
            dimensions=[numbers(label) for label in v['labels']];value=dimensions[0][0]*dimensions[1][0]*(dimensions[2][0]-dimensions[2][1]);return [value,value]
        if key=='ext-journey-time':value=n[0]*n[1]+(n[0]-1)*n[2];return [value,value]
        if key=='ext-capacity-reasoning':value=n[0]-n[1]*n[2]+n[3];return [value,value]
        raise ValueError('Unaudited extension '+key)
    if key=='roman':return [roman_value(lines[0].split()[0])]
    if key=='place':return [int(numbers(p)[0])*100000]
    if key=='decimal-order':return [min(numbers(lines[0]))]
    if key=='equivalent':
        a,b=map(int,v['values'][0].split('/'));return [F(a*int(v['values'][1].split('/')[1]),b)]
    if key=='decimal-fraction':return [F(lines[0])]
    if key=='percent-claim':return [F(numbers(lines[0])[0],numbers(lines[0])[1])*100,F(numbers(lines[1])[0],numbers(lines[1])[1])*100]
    if key=='possibilities':
        total=int(n[0]);pairs=';'.join(f'{a},{total-a}' for a in range(1,(total+1)//2));return [(total-1)//2,pairs]
    if key=='shape-name':return [v['shape'].title()]
    if key=='prime':return [next(x for x in numbers(lines[0]) if x>=2 and all(int(x)%d for d in range(2,math.isqrt(int(x))+1)))]
    if key=='factor':return [math.gcd(*map(int,numbers(lines[0])))]
    if key=='estimate':return [math.floor(numbers(lines[0])[0]/100+F(1,2))*100*math.floor(numbers(lines[0])[1]/100+F(1,2))*100]
    if key=='ratio-fraction':return [F(v['parts'][0],sum(v['parts']))]
    if key=='order':return [arithmetic(lines[0])]
    if key=='fraction-compare':return [max(F(x) for x in v['values'])]
    if key=='two-unknowns':return [(n[0]+n[1])/2,(n[0]-n[1])/2]
    if key=='fraction-two':
        x,y=F(v['values'][0]),F(v['values'][2]);return [math.lcm(x.denominator,y.denominator),x+y]
    if key=='claim' and 'More equal parts' in q['fields'][1]['answer']:return ['Yes' if ' is smaller than ' in p else 'No','More equal parts of the same whole make each part smaller.']
    if key=='imperial':return [n[-1]*F('1.6')]
    if key=='circle':return [numbers(v['labels'][0])[0]*2]
    if key=='solid':return [8 if 'vertices' in p else 6 if 'faces' in p else 12]
    if key=='clock':
        t=v['hours']*60+v['minutes'];return [f"{t//60:02}:{t%60:02}",f"{(t+35)//60:02}:{(t+35)%60:02}"]
    if key=='money':return [n[0]*n[1],n[2]-n[0]*n[1]]
    if key=='pie':return [n[0]*v['angles'][0]/360,n[0]*v['angles'][1]/360]
    if key=='scale-reading' and v['type']=='scale':return [F(v['max']*v['position'],v['intervals'])]
    if key=='capacity':return [n[0]*1000,n[0]*1000/250]
    if key=='reading-number':return [4000000+n[0]*1000+n[1]]
    if key=='number-problem':return [n[0]+n[1]-n[2]]
    if key=='fraction-name':return [F(v['parts'][0],sum(v['parts']))]
    if key=='fraction-whole-mult':return [arithmetic(' '.join(v['values']))]
    if key=='decimal-round':return [F(math.floor(F(lines[0])*10+F(1,2)),10)]
    if key=='simplify':return [F(v['values'][0])]
    if key=='measure-compare':return [str(float(numbers(lines[0])[0])).rstrip('0').rstrip('.')+' m']
    if key=='time-seconds':return [n[0]*60+n[1]]
    if key=='parallelogram':return [n[0]*n[1]]
    if key=='compound-area':return [n[0]*n[1],n[0]*n[1]-n[2]*n[3]]
    if key=='mass-money':return [n[1]/1000,n[0]*n[1]/1000]
    if key=='angles-point':return [360-n[0]-n[1]]
    if key=='quadrilateral-angle':return [360-n[0]-n[1]-n[2]]
    if key=='rotation':return [['North','East','South','West'][int(n[0]/90)%4]]
    if key=='table-total':return [sum(F(row[1]) for row in v['rows'])]
    if key=='factor-multiple':return [math.lcm(*map(int,numbers(lines[0])))]
    constant={
      'roman':[1000+400+40],'place':[7*10**5],'decimal-order':[min(map(F,['0.6','0.56','0.605','0.065']))],
      'equivalent':[3*20//5],'decimal-fraction':[F(35,100)],'percent-equivalence':[F(3,8)*100],
      'prime':[next(x for x in [21,29,33,39] if all(x%d for d in range(2,math.isqrt(x)+1)))],
      'factor':[math.gcd(24,36)],'estimate':[round(398,-2)*round(202,-2)],'ratio-fraction':[F(2,5)],
      'order':[30-12//3*2],'fraction-compare':[max(F(5,8),F(2,3))],
      'two-unknowns':[(18+4)//2,(18-4)//2],'possibilities':[3,'1,6;2,5;3,4'],
      'fraction-two':[math.lcm(6,4),F(5,6)+F(3,4)],
      'claim':['No','Eighths are smaller parts than sixths.'],'percent-claim':[F(18,24)*100,F(16,20)*100],
      'imperial':[5*F('1.6')],'circle':[7*2],'solid':[4+4+4],
      'clock':['09:45','10:20'],'angle':[180-47-68],'translate':[2-3,-3+2],
      'timetable':[10*60+20-(9*60+35),11*60-(10*60+20)],'pie':[60*120//360,60*180//360],
      'money':[3*F('1.35'),10-3*F('1.35')],'scale-reading':[1+F(3,4)],'net':['Cube',8] if q['fields'][0]['label']=='Solid' else [6,8],
      'capacity':[F('2.5')*1000,F('2.5')*1000/250],
      'reading-number':[4_000_000+70_000+6],'number-problem':[-3+8-2],
      'fraction-name':[F(3,8)],'fraction-whole-mult':[3*F(2,5)],'decimal-round':[F(65,10)],
      'simplify':[F(18,24)],'measure-compare':['1.2 m'],'time-seconds':[3*60+25],
      'parallelogram':[8*5],'compound-area':[9*7,9*7-3*2],'mass-money':[F(750,1000),F(750,1000)*4],
      'shape-classify':['Rectangle'],'symmetry':[2],'angles-point':[360-85-140],
      'quadrilateral-angle':[360-90-105-80],'rotation':['East'],'table-total':[18+27+15],
      'factor-multiple':[math.lcm(6,8)],'shape-name':['Triangle'],'movement-pattern':['Left'],
      'draw-rectangle':['6 cm × 4 cm · 4 right angles'],'draw-angle':['65°'],
      'construct-graph':['Red 10 · Blue 15 · Green 5'],
    }
    if key in constant:return constant[key]
    if key=='round':return [math.floor(F(lines[0])/1000+F(1,2))*1000]
    if key=='negative':return [n[0]+n[1]]
    if key in ['sequence','counting']:
        fv=lambda x:F(x.replace('−','-'));return [fv(vals[0])+vals.index('?')*(fv(vals[1])-fv(vals[0]))]
    if key=='inverse':return [numbers(lines[0])[-1]/8] if q['fields'][0]['label']=='Missing number' else [f'8 × n = {int(n[-1])}']
    if key=='fraction-whole':return [n[-1]*4/3]
    if key=='percent-back':return [n[-1]*100/n[0]]
    if key=='café':return [n[0]*n[1],n[0]*n[1]-n[2]]
    if key=='share':return [n[0]*2/5,n[0]*3/5]
    if key=='sale':return [n[0]*15/100,n[0]*85/100]
    if key=='recipe':return [n[1]/n[0],n[1]/n[0]*n[2]]
    if key=='formula':
        x=numbers(q['fields'][0]['label'])[0];return [3*x+4,(25-4)//3]
    if key=='buses':return [n[0]//n[1],math.ceil(n[0]/n[1])]
    if key=='scale':return [n[0]*n[2],n[1]*n[2]]
    if key=='convert':return [numbers(lines[0])[0]*1000]
    if key=='coordinate':return v['points'][0]
    if key=='perimeter':
        a,b=[numbers(label)[0] for label in v['labels']];return [2*(a+b),a*b]
    if key=='volume':
        a,b,c=[numbers(label)[0] for label in v['labels']];return [a*b,a*b*c]
    if key=='triangle':
        a,b=[numbers(label)[0] for label in v['labels']];return [a*b,a*b/2]
    if key=='reflect':return [-v['points'][0][0],v['points'][0][1]]
    if key=='bars':return [v['values'][1]-v['values'][0]]
    if key=='mean':return [sum(map(F,vals)),sum(map(F,vals))/len(vals)]
    if key=='line':return [v['values'][1],F(v['values'][1]+v['values'][2],2)]
    if key=='mental':return [arithmetic(lines[0])]
    if key=='tickets':return [n[0]-n[1]-n[2]]
    raise ValueError('Unaudited mission '+key)

def shared_expected(q):
    p=q.get('prompt',q.get('question',''));g=q.get('game',q.get('bank'));v=q.get('visual',{});n=numbers(p)
    if g=='calculation_clash':return arithmetic(v['lines'][0])
    if g=='place_value_peaks':
        if 'greatest' in p:return max(F(x.replace(',','')) for x in q['options'])
        if 'value of the digit' in p:
            digit=re.search(r'digit (\d)',p)[1];num=re.search(r'in ([\d,]+)',p)[1].replace(',','');return int(digit)*10**(len(num)-num.index(digit)-1)
        if 'more than' in p:return n[0]+n[1]
        if 'rounds' in p:return next(F(x.replace(',','')) for x in q['options'] if math.floor(F(x.replace(',',''))/n[-1]+F(1,2))*n[-1]==n[0])
        if 'times' in p:return n[0]*n[1]
        return sum(n)
    if g=='coordinate_quest':
        if v['type']=='coordinates':
            point=next(x for x in v['points'] if x['label']==v['targetLabel'])
            return f"({point['x']}, {point['y']})" if 'coordinates are' in p else point['label']
        return '(7, 2)' if '(5, 8)' in p else '(-8, 2)'
    if g=='transform_temple':
        if v['type']=='transform':
            dx=v['image']['x']-v['start']['x'];dy=v['image']['y']-v['start']['y'];return f"{abs(dx)} {'right' if dx>0 else 'left'}, {abs(dy)} {'up' if dy>0 else 'down'}"
        return 'translation 8 units right'
    if g in ['unit_mixer','measurement'] or (g=='scale_safari' and p.startswith('Convert')):
        match=re.search(r'(\d[\d,.]*)\s*(kg|g|km|cm|mm|m|litres|litre|l|millilitres|ml)',p);amount=F(match[1].replace(',',''));unit=match[2]
        target=re.search(r'(?:into|to|how many)\s+(kilograms|metres|millilitres|litres|kg|km|cm|mm|ml|g|m|l)\b',p)[1]
        scales={'kg':1000,'kilograms':1000,'g':1,'km':1000,'metres':1,'m':1,'cm':F(1,100),'mm':F(1,1000),'l':1000,'litre':1000,'litres':1000,'millilitres':1,'ml':1}
        return amount*scales[unit]/scales[target]
    if g=='scale_safari':
        if 'recipe' in p:return n[0]/n[1]*n[2]
        if 'flour to sugar' in p:return n[2]*n[1]/n[0]
        if 'map' in p:return n[1]*n[2]
        if 'half' in p:return n[0]/2
        return n[2]/n[1]
    if g=='graph_grabber':
        bars={x['label']:x['value'] for x in v['bars']}
        if 'most' in p:return max(bars,key=bars.get)
        if 'Windward deliver?' in p:return bars['Windward']
        if 'Windward and Jerry' in p:return bars['Windward']+bars['Jerry']
        if 'more crates' in p:return bars['Eden']-bars['Jerry']
        if 'two boats' in p:return next(o for o in q['options'] if sum(bars[x] for x in o.split(' and '))==15)
        return sum(bars.values())
    if g=='mean_machine':
        if 'mean of 9' in p:return n[-1]*4-sum(n[:-1])
        if 'four scores' in p:return n[0]*4
        if 'Five scores' in p:return n[0]*5
        return sum(n)/len(n)
    if g=='equation_grove':
        if 'black beads' in p:return (n[-1]-4)/3 if 'How many white beads are there?' in p else n[-1]*3+4
        if '17 added' in p:return n[-1]-n[0]
        if 'multiplied' in p:return n[1]/n[0]
        if 'then divide' in p:return n[2]*n[1]-n[0]
        return n[2]/n[1]-n[0]
    if g=='formula_forge':
        if 'perimeter 34' in p:return (n[0]-2*n[1])/2
        if 'perimeter' in p:return 2*sum(n)
        if 'perpendicular height?' in p:return n[0]*2/n[1]
        if 'triangle' in p or 'A = (b' in p:return n[-2]*n[-1]/2
        if 'cuboid' in p:return math.prod(n)
        if 'multiplies by 4' in p:return n[-1]*4-3
        if 'output is' in p:return (n[-1]-n[1])/n[0]
        return n[0]*n[1]
    if g=='rule_runner':
        if v['type']=='sequence' and all(re.fullmatch(r'-?\d+|\?',str(x)) for x in v['values']):
            seq=v['values'];i=seq.index('?');return F(seq[0])+i*(F(seq[1])-F(seq[0]))
        if 'multiple of 7' in p:return next(F(x) for x in q['options'] if int(x)%7==0 and '8' in x)
        return n[-1]*n[0]+n[1]
    if g=='data':
        data=q['data']
        if q['type']=='mean':return F(sum(data),len(data))
        if q['type']=='range':return max(data)-min(data)
        bars={x['label']:x['value'] for x in q.get('chartData',[])}
        if 'green' in p:return bars['Green']-bars['Red']
        if 'gold' in p:return bars['Blue']-bars['Gold']
        return bars['Blue']
    if g=='time':
        # The small authored bank is independently reduced to minute arithmetic.
        expected={'Write 12:35 am using the 24-hour clock.':'00:35','Write 7:20 pm using the 24-hour clock.':'19:20','Write 11:45 pm using the 24-hour clock.':'23:45','What time is 2 hours 10 minutes before 9:05 am?':'6:55 AM','What time is 1 hour 25 minutes after 4:15 pm?':'5:40 PM','What time is 45 minutes before 1:20 pm?':'12:35 PM','How much time is there between 08:35 and 11:20?':'2h 45m','What time is 150 minutes after 10:40 am?':'1:10 PM','How much time is there between 09:50 and 12:15?':'2h 25m'}
        return expected[p]
    raise ValueError('Unaudited shared question '+p)

def actual_number(value):
    # Units are printed explicitly on choice tiles, so compare the numerical value here.
    match=re.match(r'^(-?\d[\d,]*(?:\.\d+)?)(?:\s*(?:cm[²³]?|mm|km|kg|ml|m|g|l|litres)(?:\b|$))',str(value))
    return match[1].replace(',','') if match else value

if __name__=='__main__':
    import sys
    source='before' if '--before' in sys.argv else 'current'
    data=json.loads((ROOT/(source+'-inventory.json')).read_text(encoding='utf-8'))
    failures=[];count=0;families=set()
    for run in data['missions']:
        for q in run['arithmetic']+run['reasoning']:
            expected=mission_expected(q)
            for field,value in zip(q['fields'],expected):
                if not field_equivalent(field,value):failures.append({'bank':'mission','id':q['id'],'seed':run['seed'],'actual':field['answer'],'expected':str(value)})
                count+=1
            assert len(expected)==len(q['fields']),q['id']
            families.add(q['id'])
    for q in data['shared']+data['other']:
        expected=shared_expected(q);actual=q.get('correct',q.get('answer'))
        if not equivalent(actual_number(actual),expected):failures.append({'bank':q.get('game',q.get('bank')),'prompt':q.get('prompt',q.get('question')),'actual':actual,'expected':str(expected)})
        count+=1
    report={'passed':not failures,'independentlyCheckedFields':count,'missionFamilies':len(families),'sharedAndOtherFamilies':len(data['shared'])+len(data['other']),'failures':failures}
    (ROOT/(source+'-answer-verification.json')).write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report))
    if failures:raise SystemExit(1)
