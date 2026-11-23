use std::{fs, path::PathBuf};
use chrono::Utc;
use rusqlite::Connection;
use serde::Serialize;
use crate::{error::AppError, paths::AppPaths, repository::{self, JournalFilterInput}, fill_corrections::{self, CorrectionHistoryEvent}, initial_risk_corrections::{self,InitialRiskCorrectionEvent},source_type_corrections::{self,SourceTypeCorrectionEvent},source_price_corrections::{self,SourcePriceCorrectionEvent}};

#[derive(Debug, Serialize)]
pub struct ExportResult {
    pub path: String,
    pub row_count: usize,
    pub created_at: String,
}

fn esc_html(s:&str)->String { s.replace('&',"&amp;").replace('<',"&lt;").replace('>',"&gt;").replace('"',"&quot;") }
fn csv_cell(s:&str)->String { format!("\"{}\"",s.replace('"',"\"\"")) }

pub fn export_html(conn:&Connection, paths:&AppPaths, filter:JournalFilterInput)->Result<ExportResult,AppError>{
    let rows=repository::list_journal_trades(conn,filter.clone())?;
    let a=repository::get_analytics_summary(conn,filter)?;
    // Compute and validate all audit chains before a report is written.
    // No correction history may be silently dropped from effective-value reports.
    let mut audits:Vec<(String,Vec<CorrectionHistoryEvent>)>=Vec::new();
    let mut risk_audits:Vec<(String,Vec<InitialRiskCorrectionEvent>)>=Vec::new();
    let mut source_audits:Vec<(String,Vec<SourceTypeCorrectionEvent>)>=Vec::new();
    let mut price_audits:Vec<(String,Vec<SourcePriceCorrectionEvent>)>=Vec::new();
    for row in &rows {
        audits.push((row.trade_id.clone(),fill_corrections::list_trade_correction_history(conn,&row.trade_id)?));
        risk_audits.push((row.trade_id.clone(),initial_risk_corrections::list_initial_risk_corrections(conn,&row.trade_id)?));
        source_audits.push((row.trade_id.clone(),source_type_corrections::list_source_corrections_for_trade(conn,&row.trade_id)?));
        price_audits.push((row.trade_id.clone(),source_price_corrections::list_for_trade(conn,&row.trade_id)?));
    }
    fs::create_dir_all(&paths.exports)?;
    let created=Utc::now();
    let path:PathBuf=paths.exports.join(format!("TradingJournal_Report_{}.html",created.format("%Y%m%d_%H%M%S")));
    let metric=|label:&str,value:String|format!("<div class='m'><span>{}</span><b>{}</b></div>",esc_html(label),esc_html(&value));
    let mut html=String::from("<!doctype html><html><head><meta charset='utf-8'><title>Trading Journal Report</title><style>body{font-family:Arial,sans-serif;margin:32px;color:#1f2937}h1{margin-bottom:4px}.sub{color:#64748b}.metrics{display:flex;flex-wrap:wrap;gap:10px;margin:20px 0}.m{border:1px solid #ddd;border-radius:10px;padding:10px 14px;min-width:120px}.m span{display:block;color:#64748b;font-size:12px}.m b{font-size:20px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{border-bottom:1px solid #e5e7eb;text-align:left;padding:8px;vertical-align:top}th{background:#f8fafc}.warn{padding:10px;background:#fff7ed;border:1px solid #fdba74;border-radius:8px}</style></head><body>");
    html.push_str("<h1>Personal Trading Journal</h1><div class='sub'>Readable local export</div><div class='metrics'>");
    html.push_str(&metric("Trades",a.trade_count.to_string()));
    html.push_str(&metric("R sample",a.eligible_r_count.to_string()));
    html.push_str(&metric("Win rate",a.win_rate.map(|v|format!("{:.1}%",v)).unwrap_or("—".into())));
    html.push_str(&metric("Average R",a.average_r.map(|v|format!("{:.2}R",v)).unwrap_or("—".into())));
    html.push_str(&metric("Net R",a.net_r.map(|v|format!("{:.2}R",v)).unwrap_or("—".into())));
    html.push_str(&metric("Expectancy",a.expectancy_r.map(|v|format!("{:.2}R",v)).unwrap_or("—".into())));
    html.push_str(&metric("Bad decision + win",a.bad_decision_win_count.to_string()));
    html.push_str("</div>");
    if a.small_sample {html.push_str("<p class='warn'>Small sample — interpret performance metrics cautiously.</p>");}
    html.push_str("<table><thead><tr><th>Date</th><th>Instrument</th><th>Direction</th><th>Status</th><th>Candidate</th><th>Level sources</th><th>Decision quality</th><th>Rules</th><th>Mistakes</th><th>R</th><th>Net P&amp;L</th></tr></thead><tbody>");
    for r in &rows {
        html.push_str(&format!("<tr><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td></tr>",
            esc_html(&r.session_date),esc_html(&r.instrument_symbol),esc_html(&r.direction),esc_html(&r.status),esc_html(r.candidate_label.as_deref().unwrap_or("—")),
            esc_html(&r.level_sources.join(" · ")),esc_html(r.decision_quality.as_deref().unwrap_or("—")),esc_html(&r.rule_status),esc_html(&r.mistakes.join(" · ")),
            r.realized_r.map(|v|format!("{:.2}R",v)).unwrap_or("—".into()),r.net_realized_pnl.map(|v|format!("${:.2}",v)).unwrap_or("—".into())))
    }
    html.push_str("</tbody></table>");
    html.push_str("<h2>Audited corrections</h2><p>Trade results above use effective recorded values. Every correction retains the original immutable execution event, the previous and replacement values, reason and timestamp. Original values are never rewritten.</p>");
    html.push_str("<table><thead><tr><th>Trade ID</th><th>Execution ID</th><th>Field</th><th>Revision</th><th>Previous</th><th>Replacement</th><th>Reason</th><th>Timestamp (UTC)</th><th>Operator</th><th>Correction ID</th></tr></thead><tbody>");
    let mut any=false;
    for (trade_id,events) in &audits {
        for event in events {
            any=true;
            let old=event.previous.map(|v|v.to_string()).unwrap_or("UNKNOWN".into());
            let new=event.replacement.map(|v|v.to_string()).unwrap_or("UNKNOWN".into());
            html.push_str(&format!("<tr><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td></tr>",
                esc_html(trade_id),esc_html(&event.execution_id),esc_html(&event.field),
                event.revision,esc_html(&old),esc_html(&new),esc_html(&event.reason),
                esc_html(&event.recorded_at_utc),esc_html(&event.actor),esc_html(&event.correction_id)));
        }
    }
    if !any {html.push_str("<tr><td colspan='10'>No audited corrections in this report.</td></tr>");}
    html.push_str("</tbody></table>");
    html.push_str("<h2>Audited INITIAL risk-dollar corrections</h2><p>These are corrections of original recorded risk, not actual Stop Moves. Trade R is calculated from the effective initial-risk denominator; original SQLite risk snapshot remains preserved. Null means unknown, not zero.</p>");
    html.push_str("<table><thead><tr><th>Trade ID</th><th>Risk snapshot</th><th>Revision</th><th>Original</th><th>Previous</th><th>Replacement</th><th>Reason</th><th>UTC timestamp</th><th>Actor</th><th>Correction ID</th></tr></thead><tbody>");
    let mut any_risk=false;
    for (trade_id,events) in &risk_audits {
      for event in events {
        any_risk=true;
        html.push_str(&format!("<tr><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td></tr>",
          esc_html(trade_id),esc_html(&event.risk_snapshot_id),event.revision,
          event.original_risk_dollars.map(|v|v.to_string()).unwrap_or("UNKNOWN".into()),
          event.previous_risk_dollars.map(|v|v.to_string()).unwrap_or("UNKNOWN".into()),
          event.replacement_risk_dollars,esc_html(&event.reason),
          esc_html(&event.recorded_at_utc),esc_html(&event.actor),esc_html(&event.correction_id)));
      }
    }
    if !any_risk {html.push_str("<tr><td colspan='10'>No initial-risk corrections for selected Trades.</td></tr>");}
    html.push_str("</tbody></table>");
    html.push_str("<h2>Audited historical Level Source type corrections</h2><p>The original Zone revision and candidate source ID are preserved. Effective historical classification is shown with a correction flag in the level-source summary; this is not an observed confirmation or actual later market revision.</p>");
    html.push_str("<table><thead><tr><th>Trade ID</th><th>Candidate source ID</th><th>Revision</th><th>Original source type ID</th><th>Previous source type ID</th><th>Replacement source type ID</th><th>Reason</th><th>UTC timestamp</th><th>Actor</th><th>Audit ID</th></tr></thead><tbody>");
    let mut any_source=false;
    for (trade_id,events) in &source_audits {
      for event in events {
        any_source=true;
        html.push_str(&format!("<tr><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td></tr>",
          esc_html(trade_id),esc_html(&event.candidate_source_id),event.revision,
          esc_html(&event.original_source_type_id),esc_html(&event.previous_source_type_id),
          esc_html(&event.replacement_source_type_id),esc_html(&event.reason),
          esc_html(&event.recorded_at_utc),esc_html(&event.actor),esc_html(&event.correction_id)));
      }
    }
    if !any_source{html.push_str("<tr><td colspan='10'>No source type correction events for these Trades.</td></tr>");}
    html.push_str("</tbody></table>");
    html.push_str("<h2>Audited historical Level Source price corrections</h2><p>Original candidate_sources.source_price and Zone geometry are preserved. This correction changes only the effective historical source price, not fills or financial results.</p>");
    html.push_str("<table><thead><tr><th>Trade ID</th><th>Source ID</th><th>Revision</th><th>Original price</th><th>Previous price</th><th>Effective price</th><th>Reason</th><th>UTC timestamp</th><th>Actor</th><th>Audit ID</th></tr></thead><tbody>");
    let mut any_source_price=false;
    for (trade_id,events) in &price_audits {
      for event in events {
        any_source_price=true;
        html.push_str(&format!("<tr><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td></tr>",
          esc_html(trade_id),esc_html(&event.candidate_source_id),event.revision,
          event.original_source_price.map(|p|p.to_string()).unwrap_or("Unknown".into()),
          event.previous_source_price.map(|p|p.to_string()).unwrap_or("Unknown".into()),
          event.replacement_source_price,esc_html(&event.reason),
          esc_html(&event.recorded_at_utc),esc_html(&event.actor),esc_html(&event.correction_id)));
      }
    }
    if !any_source_price{html.push_str("<tr><td colspan='10'>No historical source price correction events for these Trades.</td></tr>");}
    html.push_str("</tbody></table></body></html>");
    fs::write(&path,html)?;
    Ok(ExportResult{path:path.to_string_lossy().to_string(),row_count:rows.len(),created_at:created.to_rfc3339()})
}

pub fn export_csv(conn:&Connection, paths:&AppPaths, filter:JournalFilterInput)->Result<ExportResult,AppError>{
    let rows=repository::list_journal_trades(conn,filter)?;
    fs::create_dir_all(&paths.exports)?;
    let created=Utc::now();
    let path=paths.exports.join(format!("TradingJournal_Trades_{}.csv",created.format("%Y%m%d_%H%M%S")));
    let mut out=String::from("session_date,instrument,direction,status,candidate,level_sources,decision_quality,rule_status,mistakes,realized_r_effective,net_pnl_effective,trade_id,audited_correction_count,audited_corrections_json,audited_initial_risk_correction_count,audited_initial_risk_corrections_json,audited_source_type_correction_count,audited_source_type_corrections_json,audited_source_price_correction_count,audited_source_price_corrections_json\n");
    for r in &rows {
        let events=fill_corrections::list_trade_correction_history(conn,&r.trade_id)?;
        let history_json=serde_json::to_string(&events)?;
        let risk_events=initial_risk_corrections::list_initial_risk_corrections(conn,&r.trade_id)?;
        let risk_history_json=serde_json::to_string(&risk_events)?;
        let source_events=source_type_corrections::list_source_corrections_for_trade(conn,&r.trade_id)?;
        let source_history_json=serde_json::to_string(&source_events)?;
        let source_price_events=source_price_corrections::list_for_trade(conn,&r.trade_id)?;
        let source_price_history_json=serde_json::to_string(&source_price_events)?;
        let vals=[csv_cell(&r.session_date),csv_cell(&r.instrument_symbol),csv_cell(&r.direction),csv_cell(&r.status),csv_cell(r.candidate_label.as_deref().unwrap_or("")),csv_cell(&r.level_sources.join(" | ")),csv_cell(r.decision_quality.as_deref().unwrap_or("")),csv_cell(&r.rule_status),csv_cell(&r.mistakes.join(" | ")),r.realized_r.map(|v|v.to_string()).unwrap_or_default(),r.net_realized_pnl.map(|v|v.to_string()).unwrap_or_default(),csv_cell(&r.trade_id),events.len().to_string(),csv_cell(&history_json),risk_events.len().to_string(),csv_cell(&risk_history_json),source_events.len().to_string(),csv_cell(&source_history_json),source_price_events.len().to_string(),csv_cell(&source_price_history_json)];
        out.push_str(&vals.join(","));out.push('\n');
    }
    fs::write(&path,out)?;
    Ok(ExportResult{path:path.to_string_lossy().to_string(),row_count:rows.len(),created_at:created.to_rfc3339()})
}
