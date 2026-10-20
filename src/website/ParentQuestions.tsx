import { Link } from 'react-router-dom';

export default function ParentQuestions() {
  return <section className="website-container parent-questions" aria-labelledby="parent-questions-title">
    <div><p className="website-eyebrow">Before you begin</p><h2 id="parent-questions-title">A few things parents ask.</h2><p>What’s included, how practice works and where you fit in.</p></div>
    <div>
      <details><summary>Who is Matharia for?</summary><p>Matharia offers KS2 maths revision, including arithmetic and reasoning skills relevant to Years 5 and 6. Your child can revisit number, fractions, geometry and other topics through game challenges, revision guides and visual lessons.</p></details>
      <details><summary>How does it fit alongside school?</summary><p>Start with a topic your child is covering in class, or one they would like to revisit. Use a worked example in the revision guide, try a game challenge, then ask them to explain their method. SATs Legends is a revision companion to classroom teaching, written practice and past papers.</p></details>
      <details><summary>What will I see in my parent account?</summary><p>Saved activity, answer accuracy, strengths and topics to revisit for your child’s profile. You can check the private dashboard or opt into progress emails. These are practice insights, rather than a predicted SATs result.</p></details>
      <details><summary>Can we use it on different devices?</summary><p>Matharia plays in a web browser on phones, tablets and desktop computers. Log in to the same parent account and choose the same child profile. Let a cloud save finish before switching devices; an internet connection is needed to sync progress.</p></details>
      <details><summary>Is English included?</summary><p>Lexcoria is our English revision sister game, covering reading, grammar, punctuation and spelling. It is still in development. Current Matharia plans cover maths only; English and combined plans are not on sale yet. <Link to="/english">See Lexcoria’s current availability.</Link></p></details>
      <details><summary>What does a Matharia plan include?</summary><p>Game access for one child profile, saved progress and a private parent dashboard, with optional progress emails. Choose £4.99 monthly or £49.99 yearly. Plans renew automatically; cancel renewal in your parent account and access continues to the end of the paid period. <Link to="/subscriptions">Compare the plans.</Link></p></details>
    </div>
  </section>;
}
