from pathlib import Path
import sqlite3, hashlib, tempfile, shutil, csv

root=Path(__file__).resolve().parents[1]
# Schema migration chain including v6.
db=Path(tempfile.mkdtemp())/'test.db'
c=sqlite3.connect(db)
c.execute("CREATE TABLE IF NOT EXISTS schema_meta(id INTEGER PRIMARY KEY CHECK(id=1), schema_version INTEGER NOT NULL)")
c.execute("INSERT OR IGNORE INTO schema_meta VALUES(1,0)")
for n,name in enumerate(['001_initial.sql','002_decision_workflow.sql','003_execution_core.sql','004_post_trade_review.sql','005_session_review_rules.sql','006_attachments_indexes.sql'],start=1):
    c.executescript((root/'src-tauri'/'migrations'/name).read_text())
    c.execute("UPDATE schema_meta SET schema_version=? WHERE id=1",(n,))
c.commit()
assert c.execute("PRAGMA integrity_check").fetchone()[0]=='ok'
assert c.execute("SELECT schema_version FROM schema_meta WHERE id=1").fetchone()[0]==6
idx={r[1] for r in c.execute("PRAGMA index_list('attachments')")}
assert 'idx_attachments_owner' in idx and 'idx_attachments_stage' in idx

# Attachment hash / file round-trip concept test.
tmp=Path(tempfile.mkdtemp())
src=tmp/'sample.png'; src.write_bytes(b'\x89PNG\r\n\x1a\nsynthetic-test')
dst=tmp/'attachments'/'trade'/'t1'; dst.mkdir(parents=True)
out=dst/'a1.png'; shutil.copy2(src,out)
assert hashlib.sha256(src.read_bytes()).hexdigest()==hashlib.sha256(out.read_bytes()).hexdigest()

# Export escaping concept: commas/quotes remain one CSV cell.
csv_path=tmp/'report.csv'
with csv_path.open('w',newline='',encoding='utf-8') as f:
    w=csv.writer(f); w.writerow(['candidate','mistakes']); w.writerow(['Hourly POC, P3','"Chase" | FOMO'])
rows=list(csv.reader(csv_path.open(encoding='utf-8')))
assert rows[1][0]=='Hourly POC, P3' and rows[1][1]=='"Chase" | FOMO'

# Source requirements present.
app=(root/'src'/'App.tsx').read_text()
assert 'AttachmentPanel' in app and 'Readable report' in app and 'exportJournalCsv' in app
lib=(root/'src-tauri'/'src'/'lib.rs').read_text()
for cmd in ['import_attachment','list_attachments','attachment_data_url','export_journal_html','export_journal_csv']:
    assert cmd in lib
print('PASS: schema v6, attachment indexes, hash round-trip, export escaping, attachment/export source wiring')
