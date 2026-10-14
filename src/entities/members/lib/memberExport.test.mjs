import test from 'node:test';
import assert from 'node:assert/strict';
import { memberCsv } from './memberExport.js';
import { titleCase } from './memberDisplay.js';

test('profile formatting keeps initials and applies title case without mutating data',()=>{
  assert.equal(titleCase('r m p g t hasarinda'),'R M P G T Hasarinda');
  assert.equal(titleCase('r. m. hasarinda'),'R. M. Hasarinda');
  assert.equal(titleCase(null),null);
});
test('selected row exports quote cells and neutralize spreadsheet formulas',()=>{
  const csv=memberCsv([{full_name:'=test,"name"',member_id:'12M001',form_number:'0001',city:'colombo',is_active:true}]);
  assert.ok(csv.includes('"\'=test,""name"""'));
  assert.ok(csv.includes('"12M001"'));
  assert.ok(csv.includes('"0001"'));
  assert.equal(csv.split('\r\n').length,2);
});
