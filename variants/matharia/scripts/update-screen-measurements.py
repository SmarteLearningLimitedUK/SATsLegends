import json
from pathlib import Path
root=Path(__file__).resolve().parents[3];p=root/'docs/concept-recreation/approved-screens.json';m=json.loads(p.read_text())
regions={
 'number_line_ninja':dict(coordinateSystem='normalized x,y,width,height; measured against 1844x853',hud=[.272,.014,.49,.116],question=[.16,.145,.715,.177],heroSilhouette=[0,.188,.225,.599],ruler=[.205,.50,.728,.30],marks=[.243,.452,.637,.096],answers=[.292,.62,.462,.23],navigation=[.316,.855,.367,.127]),
 'rounding_rocket':dict(coordinateSystem='normalized x,y,width,height; measured against 853x1844',hud=[.035,.031,.904,.081],question=[.128,.123,.746,.114],rocket=[.315,.245,.37,.346],hero=[.075,.433,.183,.19],launchPad=[.22,.579,.585,.052],buildStatus=[.254,.649,.492,.078],answerPanel=[.039,.735,.923,.132],answerGems=[.07,.78,.86,.069],navigation=[.04,.889,.92,.076])
}
for s in m['screens']:
 if s['key'] in regions:s['regions']=regions[s['key']]
p.write_text(json.dumps(m,indent=2));print('Measured scenes:',', '.join(regions))
