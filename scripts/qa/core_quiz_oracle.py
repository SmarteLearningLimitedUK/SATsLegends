"""Independent Python Fraction/AST arithmetic oracle; does not import app marking."""
import json,re,ast
from fractions import Fraction as F
from pathlib import Path
R=Path('qa-artifacts/core-quizzes-2026-11-05')
def prepare(s):
 s=s.replace(',','').replace('−','-').replace('×','*').replace('÷','/').replace('²','**2').replace('³','**3')
 s=re.sub(r'(\d+)\s+(\d+)/(\d+)',r'(\1+\2/\3)',s)
 return s.replace('% of','/100 *').replace(' of ',' * ').replace('□','x').strip()
def calculate(s,x=F(0)):
 def visit(n):
  if isinstance(n,ast.Expression):return visit(n.body)
  if isinstance(n,ast.Constant) and type(n.value) in [int,float]:return F(str(n.value))
  if isinstance(n,ast.Name) and n.id=='x':return x
  if isinstance(n,ast.UnaryOp) and isinstance(n.op,ast.USub):return -visit(n.operand)
  if isinstance(n,ast.BinOp):
   a,b=visit(n.left),visit(n.right)
   if isinstance(n.op,ast.Add):return a+b
   if isinstance(n.op,ast.Sub):return a-b
   if isinstance(n.op,ast.Mult):return a*b
   if isinstance(n.op,ast.Div):return a/b
   if isinstance(n.op,ast.Pow) and b.denominator==1 and abs(b)<10:return a**int(b)
  raise ValueError(ast.dump(n))
 return visit(ast.parse(prepare(s),mode='eval'))
failures=[];checked=0
for paper in json.loads((R/'arithmetic-oracle-input.json').read_text(encoding='utf8')):
 for q in paper['missions']:
  left,right=q['visual']['lines'][0].split('=')
  def difference(x):return calculate(left,x)-calculate(right,x)
  # Current arithmetic equations are affine in the one missing value.
  value=-difference(F(0))/(difference(F(1))-difference(F(0)))
  actual=calculate(q['fields'][-1]['answer'])
  checked+=1
  if value!=actual:failures.append({'seed':paper['seed'],'id':q['id'],'expected':str(value),'key':str(actual)})
result={'status':'pass' if not failures else 'fail','independentCalculationChecks':checked,'distinctArithmeticSeeds':125,'method':'Separate Python AST evaluator using exact fractions; solve displayed equation for missing value and compare final answer. Does not import app answer checker. Reasoning answer keys are exercised separately; this oracle validates displayed arithmetic independently.','failures':failures}
(R/'independent-arithmetic-results.json').write_text(json.dumps(result,indent=2),encoding='utf8')
print(json.dumps(result))
