const segments = [
  { key:'accepted', label:'Approved', color:'#30e875' },
  { key:'pending', label:'Pending', color:'#d9bb70' },
  { key:'rejected', label:'Rejected', color:'#cf8990' },
];

export function ApplicationOutcomes({ counts }) {
  const total = segments.reduce((sum, item) => sum + Number(counts[item.key] || 0), 0);
  const reviewed = Number(counts.accepted) + Number(counts.rejected);
  const approval = reviewed ? Math.round(Number(counts.accepted) / reviewed * 100) : null;
  return <section className="adm-panel adm-outcomes">
    <div className="adm-panel-heading"><div><span className="adm-eyebrow">APPLICATION OUTCOMES</span><h2>Review progress</h2></div></div>
    {total ? <>
      <div className="adm-outcomes-visual">
        <svg viewBox="0 0 160 160" role="img" aria-label={segments.map(item => `${counts[item.key] || 0} ${item.label.toLowerCase()}`).join(', ')}>
          <circle cx="80" cy="80" r="62" fill="none" stroke="#26382d" strokeWidth="13"/>
          {segments.map((item, index) => {
            const share = Number(counts[item.key] || 0) / total * 100;
            const offset = segments.slice(0, index).reduce((sum, previous) => sum + Number(counts[previous.key] || 0), 0) / total * 100;
            return share > 0 && <circle key={item.key} cx="80" cy="80" r="62" pathLength="100" fill="none" stroke={item.color} strokeWidth="13" strokeDasharray={`${share} ${100 - share}`} strokeDashoffset={-offset} transform="rotate(-90 80 80)"/>;
          })}
        </svg>
        <div aria-hidden="true"><strong>{total.toLocaleString()}</strong><span>applications</span></div>
      </div>
      <dl className="adm-outcome-legend">{segments.map(item => <div key={item.key}><dt><i style={{ background:item.color }}/>{item.label}</dt><dd>{Number(counts[item.key] || 0).toLocaleString()}</dd></div>)}</dl>
      <p className="adm-outcome-note">{approval === null ? 'No applications reviewed yet.' : `${approval}% of reviewed applications approved.`}</p>
    </> : <div className="adm-chart-empty"><strong>No applications yet</strong><p>The breakdown will appear after the first application.</p></div>}
  </section>;
}
