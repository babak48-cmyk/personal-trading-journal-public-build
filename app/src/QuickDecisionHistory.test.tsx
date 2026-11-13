import {describe,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import type {CandidateDecision} from './services/localApi';
import {DecisionHistoryList,PendingTradeDecisionRow} from './QuickDecisionHistory';

const decision:CandidateDecision={
  decision_id:'long-id/with many symbols and a 00000000-0000-0000-0000-123456789012',
  candidate_id:'zone-1',occurred_at:'2026-11-12T10:45:01.123456789+11:00',
  decision_type:'MISSED',intended_direction:null,reason_code:'HESITATION',
  reason_note:'Test missed opportunity',decision_quality:null,
};
describe('read-only Decision history / pending execution rows',()=>{
  it('shows timestamp, immutable id and original persisted note without a write control',()=>{
    const html=renderToStaticMarkup(<DecisionHistoryList rows={[decision]}/>);
    expect(html).toContain('class="savedDecisionRecord"');
    expect(html).toContain('2026-11-12T10:45:01.123456789+11:00');
    expect(html).toContain('Test missed opportunity');
    expect(html).toContain('HESITATION');
    expect(html).toContain('Decision ID:');
    expect(html).not.toContain('Save decision');
    expect(html).not.toContain('create_candidate_decision');
  });
  it('keeps honest empty and incomplete historical values',()=>{
    const html=renderToStaticMarkup(<DecisionHistoryList rows={[{...decision,reason_code:null,reason_note:null,decision_quality:null}]}/>);
    expect(html).toContain('No note recorded');
    expect(html).toContain('Not recorded');
    expect(renderToStaticMarkup(<DecisionHistoryList rows={[]}/>)).toContain('No saved Decisions');
  });
  it('lists a saved TRADE decision as pending, not as an executed fill',()=>{
    const handler=vi.fn();
    const row={...decision,decision_type:'TRADE',intended_direction:'LONG'};
    const html=renderToStaticMarkup(<PendingTradeDecisionRow decision={row} current={false} onResume={handler}/>);
    expect(html).toContain('pendingDecisionRecord');
    expect(html).toContain('Resume original Decision');
    expect(html).toContain('Decision ID:');
    expect(html).not.toContain('Fill saved');
    expect(handler).not.toHaveBeenCalled();
  });
  it('prevents duplicate entry action when same Decision is current',()=>{
    const html=renderToStaticMarkup(<PendingTradeDecisionRow decision={decision} current={true} onResume={()=>{}}/>);
    expect(html).toContain('Current entry');
    expect(html).toContain('disabled=""');
  });
});
