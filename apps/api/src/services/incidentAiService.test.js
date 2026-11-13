import test from 'node:test';
import assert from 'node:assert/strict';
import { incidentAnalysisSchema, sanitizeIncidentText } from './incidentAiService.js';

test('AI context sanitizer removes common credentials and bounds untrusted text',()=>{
  const value=sanitizeIncidentText('Authorization: Bearer abc.def password=hunter2 postgres://user:secret@db/app');
  assert.equal(value.includes('abc.def'),false);
  assert.equal(value.includes('hunter2'),false);
  assert.equal(value.includes('user:secret'),false);
  assert.ok(sanitizeIncidentText('a'.repeat(100),12).length===12);
});

test('structured analysis validator rejects missing evidence structure and invalid confidence',()=>{
  const minimal={executiveSummary:'Insufficient evidence to determine the root cause.',whatHappened:'A real alert was recorded.',rootCauses:[],impactAssessment:{summary:'Unknown',affectedResources:[],downtime:'Not measured',serviceImpact:'Unknown'},investigationChecklist:[],recommendedResolution:[],preventionRecommendations:[],additionalDataRequired:['Collect additional telemetry'],similarIncidents:[]};
  assert.equal(incidentAnalysisSchema.parse(minimal).rootCauses.length,0);
  assert.throws(()=>incidentAnalysisSchema.parse({...minimal,rootCauses:[{hypothesis:'x',explanation:'x',supportingEvidence:[],missingInformation:[],verificationSteps:[],confidence:'CERTAIN'}]}));
});
