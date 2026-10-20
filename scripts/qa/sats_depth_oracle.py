"""Independent exact arithmetic and geometric checks for depth-task givens."""
import re
import math
from fractions import Fraction as F

def nums(s):
    return [F(n) for n in re.findall(r'-?\d+(?:\.\d+)?',s.replace('−','-'))]

def folds_cube(cells):
    cells=set(map(tuple,cells))
    if len(cells)!=6:return False
    negate=lambda v:tuple(-n for n in v)
    first=next(iter(cells));seen={first:((1,0,0),(0,1,0),(0,0,1))};queue=[first]
    while queue:
        x,y=queue.pop();u,v,n=seen[(x,y)]
        for dx,dy,orientation in [(1,0,(negate(n),v,u)),(-1,0,(n,v,negate(u))),(0,1,(u,negate(n),v)),(0,-1,(u,n,negate(v)))]:
            point=(x+dx,y+dy)
            if point not in cells:continue
            if point in seen:
                if seen[point]!=orientation:return False
            else:seen[point]=orientation;queue.append(point)
    return len(seen)==6 and len({axes[2] for axes in seen.values()})==6

def depth_expected(q):
    key=q['id'].removeprefix('depth-');p=q['prompt'];v=q['visual'];m=v.get('model',{});lines=v.get('lines',[]);n=nums(p)
    if key in ['power-sequence','fraction-steps','named-count','named-count-four']:
        a,b,c=map(F,v['values']);return [f'{c+(b-a)},{c+2*(b-a)}']
    if key=='large-order':return [';'.join(str(int(x)) for x in sorted(nums(lines[0])))]
    if key=='large-round':value,unit=n;return [math.floor((value+unit/2)/unit)*unit]
    if key=='negative-midpoint':return [(n[0]+n[1])/2]
    if key=='estimate-line':return [m['marker']]
    if key=='all-factors':return [','.join(str(i) for i in range(1,int(n[0])+1) if int(n[0])%i==0)]
    if key=='mental-strategy':
        a,b=nums(lines[0]);return [a*b,f'Multiply {int(a/125)} by {int(b/8)}, then by 1000']
    if key=='delivery-cost':packs,price,paid=n;answer=paid-packs*price;return [answer,answer]
    if key=='division-interpret':passengers,seats=n;vehicles=math.ceil(passengers/seats);return [vehicles,vehicles*seats-passengers]
    if key=='division-check':bottles,shops=n;return [bottles/shops,bottles/shops]
    if key=='reasonableness':a,b=nums(lines[0]);return [math.floor((a+50)/100)*100*math.floor((b+5)/10)*10,'No: the claimed answer is about ten times too large']
    if key=='fraction-order':return [','.join(str(x) for x in sorted(map(F,v['values'])))]
    if key=='decimal-digit':return [F(lines[0][-1])/1000]
    if key=='decimal-context':return [(n[0]-n[1])/n[2]]
    if key=='ruler-offset':return [F(m['end']-m['start'],10)]
    if key=='capacity-scale':return [F(m['max']*m['position'],m['intervals'])]
    if key=='measure-order':
        values=[nums(s)[0]*(1000 if re.search(r' (m|kg|litres)$',s) else 10 if s.endswith(' cm') else 1) for s in lines];return [','.join(str(int(x)) for x in sorted(values))]
    if key=='imperial':return [n[1]*n[2]]
    if key=='imperial-reverse':return [n[2]/n[1]]
    if key=='area-perimeter':rows=v['rows'];return [nums(rows[0][1])[0]/nums(rows[0][2])[0],nums(rows[1][1])[0]/nums(rows[1][2])[0]]
    if key=='equal-area-different-perimeter':a,b=nums(lines[0]);c,d=nums(lines[1]);return [2*(a+b),2*(c+d)]
    if key=='irregular-estimate':return [F(m['full'])+F(m['halves'],2)]
    if key=='choose-formula':return ['b × h ÷ 2']
    if key=='volume-formula':return ['l × w × h']
    if key=='calendar':return [int(n[0])//7,int(n[0])%7]
    if key=='perpendicular':return ['B']
    if key=='horizontal-vertical':return ['A','B']
    if key=='protractor-read':return [m['angle']]
    if key=='angle-draw':return [f"angle:{m['target']}"]
    if key=='symmetry-axes':return ['0,1,2,3' if m['square'] else '0,1']
    if key=='circle-vocabulary':return [m['part']]
    if key=='cube-net':
        valid=[i for i,cells in enumerate(m['candidates']) if folds_cube(cells)];assert len(valid)==1
        return ['ABC'[valid[0]]]
    if key=='pictogram':return [sum(F(x) for x in m['icons'])*m['key']]
    if key=='line-build':return ['line:'+':'.join(map(str,m['readings']))]
    if key=='pie-build':return ['pie:'+':'.join(str(F(x)*360/sum(m['counts'])) for x in m['counts'])]
    if key=='table-complete':r=v['rows'];return [F(r[0][3])-F(r[0][1]),F(r[1][1])+F(r[1][2])]
    if key=='sequence-rule':values=list(map(F,v['values']));step=values[1]-values[0];return [f'Add {step} each time',values[0]+5*step]
    if key=='all-possibilities':total=int(nums(lines[0])[0]);return [','.join(map(str,range(1,(total+1)//2)))]
    if key=='mean-zero-reason':values=nums(lines[0]);return [sum(values)/len(values),'Zero is still one of the four readings']
    if key=='decimal-power':return [n[0]*n[1],n[2]/n[3]]
    if key=='decimal-round-varied':
        value=F(lines[0]);scale=1 if 'whole number' in p else 10 if 'one decimal' in p else 100;return [F(math.floor(value*scale+F(1,2)),scale)]
    if key=='zero-one':value=nums(lines[0])[0];return [f'0,{value},{value}']
    if key=='three-factors':return [n[0]*n[1]*n[2]]
    if key=='choose-volume-context':return [math.prod(nums(' '.join(v['labels'])))]
    if key=='midnight-duration':
        times=[int(h)*60+int(m) for h,m in re.findall(r'(\d{2}):(\d{2})',p)];duration=(times[1]-times[0])%1440;return [duration//60,duration%60]
    if key=='angle-classify':
        a=n[0];return ['acute' if a<90 else 'right' if a==90 else 'obtuse' if a<180 else 'straight' if a==180 else 'reflex']
    if key=='generate-sequence':a,b=nums(p)[:2];return [','.join(str(a*i+b) for i in [1,2,3])]
    if key=='triangle-context':a,b=nums(' '.join(v['labels']));return [a*b/2]
    if key=='angle-estimate':return [m['angle']]
    if key=='rectangle-build':
        pairs=[(a,b) for a in range(1,21) for b in range(1,a+1) if a*b==m['area'] and 2*(a+b)==m['perimeter']];assert len(pairs)==1
        return [f'rect:{pairs[0][0]}:{pairs[0][1]}']
    raise ValueError('Missing independent oracle: '+key)
