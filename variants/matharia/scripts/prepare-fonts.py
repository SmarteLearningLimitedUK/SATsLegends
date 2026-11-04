"""Pin the existing licensed typeface to static weights for consistent WebKit rendering.

Requires fonttools and brotli for asset preparation, not application runtime.
The optional qa-artifacts/font-runtime installation keeps tooling out of dependencies.
"""
from pathlib import Path
import sys,json,hashlib,shutil
root=Path(__file__).resolve().parents[3]
sys.path.insert(0,str(root/'qa-artifacts/font-runtime'))
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

source=root/'node_modules/@fontsource-variable/fredoka/files/fredoka-latin-wght-normal.woff2'
dest=root/'variants/matharia/assets/fonts';dest.mkdir(exist_ok=True)
records=[];css=['/* Static instances of the existing Fredoka outlines; licensed under the included OFL. */']
for weight,label in [(300,'Light'),(400,'Regular'),(500,'Medium'),(600,'SemiBold'),(650,'DemiBold'),(700,'Bold')]:
    font=TTFont(source)
    axes={a.axisTag:a.defaultValue for a in font['fvar'].axes};axes['wght']=weight
    instantiateVariableFont(font,axes,inplace=True)
    assert 'fvar' not in font
    names={1:'Matharia Rounded',2:label,3:f'MathariaRounded-{weight}',4:f'Matharia Rounded {label}',6:f'MathariaRounded-{weight}',16:'Matharia Rounded',17:label}
    for record in list(font['name'].names):
        if record.nameID in names:font['name'].setName(names[record.nameID],record.nameID,record.platformID,record.platEncID,record.langID)
    font['OS/2'].usWeightClass=weight
    target=dest/f'matharia-rounded-{weight}.woff2';font.flavor='woff2';font.save(target)
    records.append(dict(weight=weight,path=target.relative_to(root).as_posix(),bytes=target.stat().st_size,sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
    css.append(f"@font-face {{font-family:'Matharia Rounded';font-style:normal;font-weight:{weight};font-display:swap;src:url('../assets/fonts/{target.name}') format('woff2');}}")
shutil.copyfile(root/'node_modules/@fontsource-variable/fredoka/LICENSE',dest/'LICENSE')
(root/'variants/matharia/src/font-faces.css').write_text('\n'.join(css)+'\n',encoding='utf8')
(root/'variants/matharia/reference/font-assets.json').write_text(json.dumps(dict(source=source.relative_to(root).as_posix(),processing='Static wght instances of the existing font; outlines unchanged apart from axis instantiation. Renamed internal family; original copyright and OFL retained.',assets=records),indent=2),encoding='utf8')
print('Prepared six static font weights with original licence.')
