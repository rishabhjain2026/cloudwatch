import test from 'node:test';
import assert from 'node:assert/strict';
import { canCorrelateIncident, correlationKeyForAlert, correlationScore, matchesAutomationRule, nextIncidentTransition, severityAtLeast } from './incidentPolicy.js';

const alert={category:'AWS',alertType:'METRIC_THRESHOLD',resourceType:'EC2_INSTANCE',resourceId:'server-1',severity:'CRITICAL'};

test('incident automation requires enabled matching category/type/resource and minimum severity',()=>{
  const rule={enabled:true,category:'AWS',alertType:'METRIC_THRESHOLD',resourceType:'EC2_INSTANCE',minimumSeverity:'HIGH'};
  assert.equal(matchesAutomationRule(rule,alert),true);
  assert.equal(matchesAutomationRule({...rule,enabled:false},alert),false);
  assert.equal(matchesAutomationRule({...rule,category:'DOCKER'},alert),false);
  assert.equal(severityAtLeast('MEDIUM','HIGH'),false);
});

test('correlation keys and matches honor configured dimensions and time window',()=>{
  const rule={correlateByCategory:true,correlateByResource:true,correlateByAlertType:false,correlationWindowSec:900};
  assert.equal(correlationKeyForAlert(alert,rule),'AWS:EC2_INSTANCE:server-1');
  const incident={status:'INVESTIGATING',detectedAt:new Date(90_000),category:'AWS',resourceType:'EC2_INSTANCE',resourceId:'server-1',alerts:[]};
  assert.equal(canCorrelateIncident(incident,alert,rule,100_000),true);
  assert.equal(canCorrelateIncident({...incident,resourceId:'server-2'},alert,rule,100_000),false);
  assert.equal(canCorrelateIncident(incident,alert,rule,1_000_000),false);
  assert.equal(correlationKeyForAlert({...alert,resourceId:null},rule),null);
});

test('lifecycle rejects skipped resolution and supports auditable reopen only',()=>{
  assert.equal(nextIncidentTransition('OPEN','ACKNOWLEDGED'),true);
  assert.equal(nextIncidentTransition('ACKNOWLEDGED','INVESTIGATING'),true);
  assert.equal(nextIncidentTransition('OPEN','CLOSED'),false);
  assert.equal(nextIncidentTransition('RESOLVED','OPEN'),true);
  assert.equal(nextIncidentTransition('CLOSED','OPEN'),true);
});

test('historical score ignores title-only matches and favors shared resource identity',()=>{
  const current={category:'DOCKER',resourceType:'DOCKER_CONTAINER',resourceId:'c1',severity:'HIGH',alertTypes:['DOCKER_CONTAINER_UNHEALTHY']};
  const titleOnly={category:'AWS',resourceType:null,resourceId:null,severity:'LOW',alertTypes:[]};
  const sameResource={...current,severity:'MEDIUM',alertTypes:['DOCKER_CONTAINER_STOPPED']};
  assert.equal(correlationScore(current,titleOnly),0);
  assert.ok(correlationScore(current,sameResource)>=4);
});
