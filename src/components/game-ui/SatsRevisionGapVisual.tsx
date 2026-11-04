import type { RevisionGapModel } from '../../systems/content/satsRevisionGapMissions';

export default function SatsRevisionGapVisual({ model, shaded = 0, symbols = [] }: {
  model: RevisionGapModel; shaded?: number; symbols?: (number | null)[];
}) {
  if (model.kind === 'choice-pairs') {
    return <svg className="sats-diagram" viewBox="0 0 520 270" role="img"
      aria-label={`${model.pairing}. ${model.groups.map(group => `${group.label}: ${group.choices.join(', ')}`).join('. ')}`}>
      {model.groups.map((group, i) => <g key={group.label} transform={`translate(${i * 260} 0)`}>
        <text x="130" y="27" textAnchor="middle" style={{ fontSize: 22, fill: '#ffda79' }}>{group.label} ({group.choices.length})</text>
        <text x="130" y="51" textAnchor="middle" style={{ fontSize: 17 }}>Choose one</text>
        {group.choices.map((choice, j) => <g key={choice}>
          <circle cx="37" cy={77 + j * 25} r="3" fill="#ffda79" />
          <text x="51" y={83 + j * 25} style={{ fontSize: 20 }}>{choice}</text>
        </g>)}
      </g>)}
      <path d="M260 15V224M22 236H498" stroke="#a3c8d2" strokeOpacity=".45" />
      <text x="260" y="260" textAnchor="middle" style={{ fontSize: 18, fill: '#ffda79' }}>{model.pairing}</text>
    </svg>;
  }
  if (model.kind === 'fraction-grid') {
    return <svg className="sats-diagram" viewBox="0 0 400 270" role="img"
      aria-label={`First diagram: ${model.numerator} of ${model.denominator} equal parts shaded.${model.construct ? ` Your hundred-square has ${shaded} squares shaded.` : ` Write the equivalent fraction with denominator ${model.targetDenominator}.`}`}>
      <text x="200" y="23" textAnchor="middle">One whole</text>
      {Array.from({ length: model.denominator }, (_, i) => <rect key={i} x={45 + i * 310 / model.denominator} y="35" width={310 / model.denominator} height="35" fill={i < model.numerator ? '#68e4ef' : '#163648'} stroke="#d0edf0" />)}
      {model.construct ? <>{Array.from({ length: 100 }, (_, i) => <rect key={i} x={125 + (i % 10) * 15} y={87 + Math.floor(i / 10) * 15} width="15" height="15" fill={i < shaded ? '#ffda79' : '#163648'} stroke="#a3c8d2" strokeWidth=".7" />)}<text x="200" y="261" textAnchor="middle">{shaded}/100 shaded</text></> : <text x="200" y="158" textAnchor="middle" style={{ fontSize: 30 }}>□ / {model.targetDenominator}</text>}
    </svg>;
  }
  if (model.kind === 'similar-rectangles') {
    const factor = model.enlargedWidth / model.width;
    const unit = 150 / (model.height * factor);
    return <svg className="sats-diagram" viewBox="0 0 450 260" role="img"
      aria-label={`Similar rectangles. A: width ${model.width} cm, height ${model.height} cm. B: width ${model.enlargedWidth} cm, height unknown.`}>
      <rect x="80" y={195 - model.height * unit} width={model.width * unit} height={model.height * unit} fill="#68e4ef44" stroke="#a4eaf0" strokeWidth="2" />
      <rect x="275" y="45" width={model.enlargedWidth * unit} height="150" fill="#ffda7933" stroke="#ffda79" strokeWidth="2" />
      <text x="95" y={175 - model.height * unit} textAnchor="middle">A</text><text x="305" y="25" textAnchor="middle">B</text>
      <text x={80 + model.width * unit / 2} y="226" textAnchor="middle">{model.width} cm</text>
      <text x="62" y={195 - model.height * unit / 2} textAnchor="end">{model.height} cm</text>
      <text x={275 + model.enlargedWidth * unit / 2} y="226" textAnchor="middle">{model.enlargedWidth} cm</text>
      <text x="258" y="126" textAnchor="end">? cm</text>
    </svg>;
  }
  return <svg className="sats-diagram" viewBox="0 0 440 270" role="img" aria-label={`Pictogram. Key: one symbol represents ${model.key} items. ${model.labels.map((label, i) => `${label}: ${symbols[i] === null || symbols[i] === undefined ? 'not placed' : `${symbols[i]! / 2} symbols`}`).join('. ')}`}>
    <text x="220" y="24" textAnchor="middle">Key: ● = {model.key} items · half = {model.key / 2}</text>
    {model.labels.map((label, i) => <g key={label}>
      <text x="80" y={85 + i * 65} textAnchor="end">{label}</text>
      <path d={`M95 ${100 + i * 65}H415`} stroke="#9fdae644" />
      {Array.from({ length: Math.ceil((symbols[i] ?? 0) / 2) }, (_, j) => <g key={j} transform={`translate(${125 + j * 52} ${79 + i * 65})`}>
        {(symbols[i] ?? 0) >= (j + 1) * 2 ? <circle r="15" fill="#ffda79" /> : <path d="M0 -15A15 15 0 0 0 0 15Z" fill="#ffda79" />}
      </g>)}
    </g>)}
  </svg>;
}
