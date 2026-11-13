import test from 'node:test';
import assert from 'node:assert/strict';
import { compareMetric, evaluateMetricWindow, selectRoutingRules, eligibleChannels, notificationDedupeKey, retryDelaySeconds, safeDeliveryError } from './alertPolicy.js';

test('metric comparator supports all configured operators and rejects missing values',()=>{
  assert.equal(compareMetric(3,'gt',2),true);assert.equal(compareMetric(3,'gte',3),true);assert.equal(compareMetric(1,'lt',2),true);assert.equal(compareMetric(2,'lte',2),true);assert.equal(compareMetric(2,'eq',2),true);assert.equal(compareMetric(2,'neq',3),true);assert.equal(compareMetric(null,'gt',0),null);
});
test('metric duration requires a fresh, dense complete window and never fills missing values',()=>{
  const now=100_000;const good=[{value:90,collectedAt:new Date(70_000)},{value:92,collectedAt:new Date(90_000)}];
  assert.equal(evaluateMetricWindow(good,{operator:'gt',threshold:80,durationSec:20,now,maxGapSec:25}).triggered,true);
  const missing=[{value:99,collectedAt:new Date(20_000)},{value:99,collectedAt:new Date(90_000)}];
  assert.equal(evaluateMetricWindow(missing,{operator:'gt',threshold:80,durationSec:20,now,maxGapSec:15}).complete,false);
  assert.equal(evaluateMetricWindow([],{operator:'gt',threshold:0,durationSec:0,now}).latestValue,null);
});
test('routing prefers resource specificity, then priority, and uses fallback only if no match',()=>{
  const base={enabled:true,severities:['HIGH'],category:'AWS'};const rules=[{...base,id:'broad',priority:900},{...base,id:'specific',resourceType:'EC2_INSTANCE',priority:2},{...base,id:'fallback',isFallback:true,category:null,priority:1000}];
  assert.deepEqual(selectRoutingRules(rules,{category:'AWS',severity:'HIGH',resourceType:'EC2_INSTANCE'}).rules.map(r=>r.id),['specific']);
  assert.deepEqual(selectRoutingRules(rules,{category:'DOCKER',severity:'HIGH',resourceType:'DOCKER_HOST'}).rules.map(r=>r.id),['fallback']);
});
test('recipient preferences exclude inactive users and external in-app; key and retry policy are stable',()=>{
  assert.deepEqual(eligibleChannels({id:'x',memberType:'INTERNAL',userId:'u',isActive:true,user:{isActive:false},preferences:{}},['IN_APP','EMAIL'],'CRITICAL'),[]);
  assert.deepEqual(eligibleChannels({id:'x',memberType:'EXTERNAL',isActive:true,preferences:{}},['IN_APP','EMAIL'],'CRITICAL'),['EMAIL']);
  assert.equal(notificationDedupeKey('a',2,'m','EMAIL','ALERT_FIRING'),'a:2:m:EMAIL:ALERT_FIRING');
  assert.equal(retryDelaySeconds(4),240);assert.equal(retryDelaySeconds(20),3600);
  assert.equal(safeDeliveryError({code:'EAUTH'}),'EAUTH');assert.equal(safeDeliveryError(new Error('credential password leaked')),'DELIVERY_FAILED');
});
