from statistics import median

rows = [
    {"status":"CLOSED","r":1.5,"pnl":300,"dq":"A","rule":"FOLLOWED","mistakes":[]},
    {"status":"CLOSED","r":-1.0,"pnl":-200,"dq":"A","rule":"FOLLOWED","mistakes":["EARLY_ENTRY"]},
    {"status":"CLOSED","r":0.5,"pnl":100,"dq":"INVALID","rule":"VIOLATED","mistakes":["CHASE"]},
    {"status":"OPEN","r":0.3,"pnl":60,"dq":"B","rule":"UNCHECKED","mistakes":[]},
]
closed=[x for x in rows if x['status']=='CLOSED' and x['r'] is not None]
rs=[x['r'] for x in closed]
wins=[x for x in rs if x>0]
losses=[x for x in rs if x<0]
assert len(rows)==4
assert len(rs)==3, 'open trades must not enter closed-performance R analytics'
assert round(sum(rs),6)==1.0
assert round(sum(rs)/len(rs),6)==round(1/3,6)
assert median(rs)==0.5
assert len(wins)==2 and len(losses)==1
assert round(sum(wins)/abs(sum(losses)),6)==2.0
assert sum(1 for x in closed if x['dq'] in ('C','INVALID') and x['r']>0)==1, 'Bad Decision + Win must be surfaced'
assert sum(1 for x in rows if x['rule']=='VIOLATED')==1
print('PASS: phase6 analytics formulas, closed-trade eligibility, sample count, rule violation count, and Bad Decision + Win classification')
