import {directScript} from "../src/director/semantic-director.mjs";

const script = {segments:[
  {text:"We compare content and representation."},
  {text:"Because the transport connects the sender to the receiver."},
  {text:"First, parse the structured fields."},
  {text:"The source provides evidence for the claim."},
  {text:"The API transforms the input into a result."},
  {text:"The sender preference determines what is wanted."},
]};
const decisions = directScript(script);
const expected = ["comparison","causal","sequence","evidence","code","preference"];
for (let i=0;i<expected.length;i+=1) {
  if (decisions[i]?.variant !== expected[i]) {
    throw new Error("semantic director mismatch at "+i+": "+JSON.stringify(decisions));
  }
}
for (const decision of decisions) {
  if (!Array.isArray(decision.matched_rules)) throw new Error("missing matched rules");
  if (!(decision.confidence >= 0 && decision.confidence <= 1)) throw new Error("invalid confidence");
}
console.log("semantic director PASS", JSON.stringify(decisions));
