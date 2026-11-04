import {useState, type FormEvent} from 'react';
import {UserRound} from 'lucide-react';
import NativeDialog from './NativeDialog';

// A fresh adult-level calculation keeps account and purchase actions in the
// parent area. No answer or personal information is stored.
export default function NativeParentGate({onClose,onContinue}:{onClose:()=>void;onContinue:()=>void}) {
  const [numbers] = useState(()=>[17+Math.floor(Math.random()*12),13+Math.floor(Math.random()*9)]);
  const [answer,setAnswer]=useState('');
  const [error,setError]=useState(false);
  function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(Number(answer)===numbers[0]*numbers[1])onContinue();
    else {setError(true);setAnswer('');}
  }
  return <NativeDialog kind="parent-gate" titleId="native-parent-gate-title" onClose={onClose}>
    <p className="native-kicker"><UserRound size={16}/>For parents &amp; guardians</p>
    <h1 id="native-parent-gate-title">A quick parent check.</h1>
    <p className="native-dialog-intro">Please ask an adult to answer this question before continuing.</p>
    <form className="native-form" onSubmit={submit}>
      <label>What is {numbers[0]} × {numbers[1]}?<input type="number" inputMode="numeric" required value={answer} onChange={event=>{setAnswer(event.target.value);setError(false)}} aria-describedby={error?'native-parent-gate-error':undefined}/></label>
      {error&&<p id="native-parent-gate-error" className="native-error" role="alert">That answer isn’t quite right. Please try again.</p>}
      <button type="submit" className="native-primary">Continue</button>
      <button type="button" className="native-secondary" onClick={onClose}>Back to the game</button>
    </form>
  </NativeDialog>;
}
