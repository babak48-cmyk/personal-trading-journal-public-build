use std::{fs, path::PathBuf};
use chrono::Utc;
use rusqlite::Connection;
use serde::Serialize;
use crate::{error::AppError, paths::AppPaths, repository::{self, JournalFilterInput}};

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
        html.push_str(&format!("<tr><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td><td>{}</td></tr>",
            esc_html(&r.session_date),esc_html(&r.instrument_symbol),esc_html(&r.direction),esc_html(&r.status),esc_html(r.candidate_label.as_deref().unwrap_or("—")),
            esc_html(&r.level_sources.join(" · ")),esc_html(r.decision_quality.as_deref().unwrap_or("—")),esc_html(&r.rule_status),esc_html(&r.mistakes.join(" · ")),
            r.realized_r.map(|v|format!("{:.2}R",v)).unwrap_or("—".into()),r.net_realized_pnl.map(|v|format!("${:.2}",v)).unwrap_or("—".into())))
    }
    html.push_str("</tbody></table></body></html>");
    fs::write(&path,html)?;
    Ok(ExportResult{path:path.to_string_lossy().to_string(),row_count:rows.len(),created_at:created.to_rfc3339()})
}

pub fn export_csv(conn:&Connection, paths:&AppPaths, filter:JournalFilterInput)->Result<ExportResult,AppError>{
    let rows=repository::list_journal_trades(conn,filter)?;
    fs::create_dir_all(&paths.exports)?;
    let created=Utc::now();
    let path=paths.exports.join(format!("TradingJournal_Trades_{}.csv",created.format("%Y%m%d_%H%M%S")));
    let mut out=String::from("session_date,instrument,direction,status,candidate,level_sources,decision_quality,rule_status,mistakes,realized_r,net_pnl\n");
    for r in &rows {
        let vals=[csv_cell(&r.session_date),csv_cell(&r.instrument_symbol),csv_cell(&r.direction),csv_cell(&r.status),csv_cell(r.candidate_label.as_deref().unwrap_or("")),csv_cell(&r.level_sources.join(" | ")),csv_cell(r.decision_quality.as_deref().unwrap_or("")),csv_cell(&r.rule_status),csv_cell(&r.mistakes.join(" | ")),r.realized_r.map(|v|v.to_string()).unwrap_or_default(),r.net_realized_pnl.map(|v|v.to_string()).unwrap_or_default()];
        out.push_str(&vals.join(","));out.push('\n');
    }
    fs::write(&path,out)?;
    Ok(ExportResult{path:path.to_string_lossy().to_string(),row_count:rows.len(),created_at:created.to_rfc3339()})
}
