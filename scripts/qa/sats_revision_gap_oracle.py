"""Independent answers from displayed givens, not the production answer fields."""
import re
from fractions import Fraction

def revision_gap_expected(q):
    key=q['id'].removeprefix('revision-')
    p=q['prompt']; m=q['visual'].get('model',{})
    numbers=[int(n) for n in re.findall(r'\d+',p)]
    if key=='month-days':
        lengths=dict(January=31,February=29 if 'leap' in p else 28,March=31,April=30,May=31,June=30,July=31,August=31,September=30,October=31,November=30,December=31)
        return [next(days for month,days in lengths.items() if month in p)]
    if key=='year-days':return [366 if 'leap' in p else 365]
    if key=='years-months':
        if 'whole years' in p:return [numbers[0]//12,numbers[0]%12]
        return [12*numbers[0]+numbers[1]]
    if key=='fraction-equivalent':return [Fraction(m['numerator'],m['denominator'])*m['targetDenominator']]
    if key=='fraction-shade':return ['shade:'+str(int(Fraction(m['numerator'],m['denominator'])*100))]
    if key=='context-round':
        value=Fraction(numbers[0]*100,numbers[1])
        return [(value+Fraction(1,2)).numerator//(value+Fraction(1,2)).denominator]
    if key=='unknown-scale':
        factor=Fraction(m['enlargedWidth'],m['width'])
        return [factor,factor*m['height']]
    if key=='pictogram-build':return ['pictogram:'+':'.join(str(int(Fraction(count*2,m['key']))) for count in m['counts'])]
    if key=='combinations':return [len(m['groups'][0]['choices'])*len(m['groups'][1]['choices'])]
    if key=='measure-estimate':
        estimates={'apple':'200 g','pencil':'18 cm','bucket':'10 litres','adult':'70 kg','teaspoon':'5 ml','bread':'£1.50'}
        return [next(value for item,value in estimates.items() if item in p)]
    raise ValueError(key)
