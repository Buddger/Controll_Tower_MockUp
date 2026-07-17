import React, { useMemo, useState } from 'react'

const referencesSeed = [
  {
    id: '47112345', region: 'LEC', mo: 'DE', priority: 1, owner: 'Credit Management', promiseDate: 'today',
    exceptionGroup: 'Commercial / Order Entry', exception: 'Credit Block', deadline: '13:18', minutesLeft: 36,
    status: 'NEW', value: 84000, atRisk: true, delayed: false, protected: false, actioned: false,
    nextAction: 'Release Credit Block', actionLabel: 'Release Credit Block', system: 'SAP S/4 Credit Management',
    crossImpact: 'Affects this reference only',
    issue: 'The reference is blocked because the customer credit limit is exceeded. Release is required before the order cut-off.',
    steps: ['Review open receivables', 'Check temporary credit limit', 'Confirm approval with Credit Management', 'Release credit block in SAP', 'Verify delivery creation'],
  },
  {
    id: '47112588', region: 'W1', mo: 'NL', priority: 1, owner: 'Order Management', promiseDate: 'today',
    exceptionGroup: 'Commercial / Order Entry', exception: 'Order Block', deadline: '13:30', minutesLeft: 48,
    status: 'IN PROGRESS', value: 62000, atRisk: true, delayed: false, protected: false, actioned: false,
    nextAction: 'Remove Order Block', actionLabel: 'Remove Order Block', system: 'SAP S/4 Sales Order',
    crossImpact: 'Affects this reference only',
    issue: 'A manual order block prevents delivery creation although material is available.',
    steps: ['Review block reason', 'Confirm approval with order owner', 'Remove order block', 'Reprocess delivery creation', 'Validate confirmed promise date'],
  },
  {
    id: '47112641', region: 'E4', mo: 'AT', priority: 1, owner: 'Customer Service', promiseDate: 'today',
    exceptionGroup: 'Commercial / Order Entry', exception: 'Incomplete Address', deadline: '13:42', minutesLeft: 60,
    status: 'NEW', value: 19000, atRisk: true, delayed: false, protected: false, actioned: false,
    nextAction: 'Update Address in Master Data', actionLabel: 'Update Address in Master Data', system: 'SAP Business Partner Master Data',
    crossImpact: 'May affect future references for this ship-to party',
    issue: 'The ship-to address is incomplete and cannot be processed reliably by the carrier.',
    steps: ['Call customer to confirm address', 'Correct street and house number', 'Validate postal code and city', 'Update business partner master data', 'Reprocess delivery and label creation'],
  },
  {
    id: '47111903', region: 'LEC', mo: 'DE', priority: 2, owner: 'Inbound Warehouse', promiseDate: 'today',
    exceptionGroup: 'Fulfillment / Warehouse', exception: 'Inbound Execution', deadline: '14:00', minutesLeft: 78,
    status: 'IN PROGRESS', value: 41000, atRisk: true, delayed: false, protected: false, actioned: false,
    nextAction: 'Prioritize Inbound Put-away', actionLabel: 'Prioritize Inbound', system: 'SAP EWM Inbound Monitor',
    crossImpact: '5 additional express references affected',
    issue: 'Missing inbound stock for Article 234 – Drill Set affects five additional express references due today.',
    steps: ['Locate inbound handling unit', 'Confirm unloading status', 'Prioritize quality and quantity check', 'Move handling unit to priority put-away', 'Post put-away and trigger ATP recheck'],
  },
  {
    id: '47112802', region: 'W1', mo: 'BE', priority: 2, owner: 'Warehouse', promiseDate: 'future',
    exceptionGroup: 'Fulfillment / Warehouse', exception: 'Backorder Focus', deadline: '14:15', minutesLeft: 93,
    status: 'MONITOR', value: 36000, atRisk: true, delayed: false, protected: false, actioned: false,
    nextAction: 'Prioritize Picking', actionLabel: 'Prioritize Picking', system: 'SAP EWM Warehouse Monitor',
    crossImpact: '3 references compete for the same stock',
    issue: 'Available stock is not yet allocated to the highest-priority express references.',
    steps: ['Review competing requirements', 'Validate allocation priority', 'Move reference into priority wave', 'Release warehouse task', 'Confirm picking start'],
  },
  {
    id: '47112017', region: 'E4', mo: 'CH', priority: 2, owner: 'Transport', promiseDate: 'future',
    exceptionGroup: 'Transport', exception: 'Transport Planning', deadline: '17:15', minutesLeft: 273,
    status: 'NEW', value: 23000, atRisk: true, delayed: false, protected: false, actioned: false,
    nextAction: 'Assign Carrier', actionLabel: 'Assign Carrier', system: 'SAP TM Transportation Cockpit',
    crossImpact: '2 references on the same route',
    issue: 'No carrier has been assigned although the shipping window is approaching.',
    steps: ['Review route and service level', 'Check carrier capacity', 'Assign carrier', 'Tender shipment', 'Confirm acceptance'],
  },
  {
    id: '47113111', region: 'LEC', mo: 'DE', priority: 3, owner: 'Transport', promiseDate: 'history',
    exceptionGroup: 'Transport', exception: 'Missing Documents', deadline: '16:30', minutesLeft: -42,
    status: 'DELAYED', value: 12000, atRisk: false, delayed: true, protected: false, actioned: false,
    nextAction: 'Request Missing Documents', actionLabel: 'Request Documents', system: 'Export Documentation',
    crossImpact: 'Affects this reference only',
    issue: 'Required export documents were not available before the final shipping cut-off.',
    steps: ['Identify missing document', 'Request document from responsible owner', 'Attach document to shipment', 'Confirm customs completeness', 'Reschedule transport'],
  },
]

const formatValue = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)

const BASE_KPIS = { atRisk: 39, delayed: 17, p1: 9, protected: 28, actioned: 24 }
const BASE_EXCEPTION_PROFILE = {
  'Commercial / Order Entry': { 'Credit Block': 18, 'Incomplete Address': 14, 'Order Block': 11 },
  'Fulfillment / Warehouse': { 'Warehouse Execution': 21, 'Inbound Execution': 17, 'Backorder Focus': 13 },
  Transport: { 'Transport Planning': 16, 'Transport Execution': 12, 'Missing Documents': 9 },
}

function filterFactor(filters) {
  let factor = 1
  if (filters.region !== 'All') factor *= 0.48
  if (filters.mo !== 'All') factor *= 0.42
  if (filters.priority !== 'All') factor *= filters.priority === '1' ? 0.34 : filters.priority === '2' ? 0.43 : 0.23
  if (filters.owner !== 'All') factor *= 0.32
  if (filters.promiseDate === 'future') factor *= 0.62
  if (filters.promiseDate === 'history') factor *= 0.38
  return Math.max(0.08, factor)
}

function App() {
  const [filters, setFilters] = useState({ region: 'All', mo: 'All', priority: 'All', owner: 'All', promiseDate: 'today' })
  const [references, setReferences] = useState(referencesSeed)
  const [selectedId, setSelectedId] = useState(referencesSeed[0].id)
  const [actionId, setActionId] = useState(null)

  const filtered = useMemo(() => references.filter((r) => {
    return (filters.region === 'All' || r.region === filters.region)
      && (filters.mo === 'All' || r.mo === filters.mo)
      && (filters.priority === 'All' || String(r.priority) === filters.priority)
      && (filters.owner === 'All' || r.owner === filters.owner)
      && (filters.promiseDate === 'All' || r.promiseDate === filters.promiseDate)
  }), [filters, references])

  const selected = filtered.find((r) => r.id === selectedId) || filtered[0] || null
  const actionReference = references.find((r) => r.id === actionId)

  const kpis = useMemo(() => {
    const factor = filterFactor(filters)
    const visible = {
      atRisk: filtered.filter((r) => r.atRisk).length,
      delayed: filtered.filter((r) => r.delayed).length,
      p1: filtered.filter((r) => r.priority === 1 && !r.delayed).length,
      protected: filtered.filter((r) => r.protected).length,
      actioned: filtered.filter((r) => r.actioned).length,
    }
    return Object.fromEntries(Object.entries(BASE_KPIS).map(([key, base]) => [
      key, Math.max(visible[key], Math.round(base * factor) + visible[key])
    ]))
  }, [filtered, filters])

  const exceptionProfile = useMemo(() => {
    const factor = filterFactor(filters)
    const groups = Object.fromEntries(Object.entries(BASE_EXCEPTION_PROFILE).map(([group, items]) => [
      group, Object.fromEntries(Object.entries(items).map(([name, count]) => [name, Math.max(1, Math.round(count * factor))]))
    ]))
    filtered.forEach((r) => {
      groups[r.exceptionGroup] ??= {}
      groups[r.exceptionGroup][r.exception] = (groups[r.exceptionGroup][r.exception] || 0) + 1
    })
    return groups
  }, [filtered, filters])

  const markActioned = (id, note) => {
    setReferences((current) => current.map((r) => r.id === id ? {
      ...r, status: 'ACTIONED', actioned: true, atRisk: false, protected: !r.delayed,
      resolutionNote: note || 'Action completed in pilot mock-up.'
    } : r))
    setSelectedId(id)
    setActionId(null)
  }

  if (actionReference) {
    return <ActionPage reference={actionReference} onBack={() => setActionId(null)} onComplete={markActioned} />
  }

  return (
    <div className="app-shell">
      <style>{styles}</style>
      <header className="header">
        <div><h1>ORDER CONTROL TOWER</h1><p>Interactive pilot v4 · Realistic volumes and compact worklist</p></div>
        <span className="live-badge">LIVE DATA · 2 MIN</span>
      </header>

      <FilterBar filters={filters} setFilters={setFilters} references={references} />

      <section className="kpi-grid">
        <Kpi title="REFERENCES AT RISK" value={kpis.atRisk} hint={`${formatValue(Math.round(kpis.atRisk * 31800))} value`} tone="amber" />
        <Kpi title="REFERENCES DELAYED" value={kpis.delayed} hint="CX impact – Customer was overpromised" tone="red" />
        <Kpi title="P1 · ACT NOW" value={kpis.p1} hint="Immediate action required" tone="red" />
        <Kpi title="PROMISES PROTECTED" value={kpis.protected} hint="Within current filter" tone="green" />
        <Kpi title="ACTIONED" value={kpis.actioned} hint="Completed interventions" tone="purple" />
      </section>

      <main className="content-grid">
        <section className="panel worklist-panel">
          <div className="panel-heading">
            <div><h2>PRIORITIZED ACTION WORKLIST</h2><p>Filters update this list, the KPIs and the exception profile.</p></div>
            <span className="count-pill">{filtered.length} references</span>
          </div>

          <div className="table-wrap">
            <table>
              <thead><tr><th>Priority</th><th>Reference</th><th>Exception</th><th>Action deadline</th><th>Action</th><th>Owner</th><th>Cross-reference impact</th><th>Status</th></tr></thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className={selected?.id === r.id ? 'selected-row' : ''} onClick={() => setSelectedId(r.id)}>
                    <td><span className={`priority p${r.priority}`}>P{r.priority}</span></td>
                    <td><strong>{r.id}</strong><small>{r.region} · {r.mo}</small></td>
                    <td>{r.exception}</td>
                    <td><strong>{r.deadline}</strong><small>{r.minutesLeft >= 0 ? `${r.minutesLeft} min left` : `${Math.abs(r.minutesLeft)} min overdue`}</small></td>
                    <td><button className="action-btn" onClick={(e) => { e.stopPropagation(); setSelectedId(r.id); setActionId(r.id) }}>{r.actionLabel} ↗</button></td>
                    <td>{r.owner}</td>
                    <td><span className={r.crossImpact.includes('additional') || r.crossImpact.includes('compete') ? 'impact-high' : ''}>{r.crossImpact}</span></td>
                    <td><span className={`status ${r.status.toLowerCase().replaceAll(' ','-')}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="empty">No references match the selected filters.</div>}
          </div>

          <Journey reference={selected} />
        </section>

        <ExceptionProfile groups={exceptionProfile} />
      </main>
    </div>
  )
}

function FilterBar({ filters, setFilters, references }) {
  const owners = ['All', ...new Set(references.map((r) => r.owner))]
  const update = (key, value) => setFilters((f) => ({ ...f, [key]: value }))
  const items = [
    ['Region','region',['All','LEC','W1','E4']],
    ['MO','mo',['All','DE','NL','BE','AT','CH']],
    ['Priority','priority',['All','1','2','3']],
    ['Owner','owner',owners],
    ['Promise Date','promiseDate',['All','today','future','history']],
  ]
  return <section className="filters">{items.map(([label,key,options]) => <label key={key}><span>{label}</span><select value={filters[key]} onChange={(e)=>update(key,e.target.value)}>{options.map(o=><option key={o}>{o}</option>)}</select></label>)}<button className="reset-btn" onClick={()=>setFilters({region:'All',mo:'All',priority:'All',owner:'All',promiseDate:'today'})}>Reset filters</button></section>
}

function Kpi({ title, value, hint, tone }) { return <div className={`kpi ${tone}`}><span>{title}</span><strong>{value}</strong><small>{hint}</small></div> }

function Journey({ reference }) {
  if (!reference) return null
  const nodes = reference.actioned
    ? [
        ['12:47','Risk detected','done'], ['12:49','Owner alerted','done'], ['12:56','Action started','done'],
        [reference.deadline,'Action completed','done'], ['14:00', reference.delayed ? 'Recovery documented' : 'Promise protected','done']
      ]
    : [
        ['12:47','Risk detected','done'], ['12:49','Owner alerted','done'], ['12:56','Action started','active'],
        [reference.deadline,'Target resolution','active'], ['14:00','Operational cut-off','late']
      ]
  return <div className="journey"><h3>SELECTED REFERENCE JOURNEY · {reference.id}</h3><div className="timeline">{nodes.map((n,i)=><div className="node" key={i}><strong>{n[0]}</strong><span className={`dot ${n[2]}`}></span><small>{n[1]}</small></div>)}</div></div>
}

function ExceptionProfile({ groups }) {
  const max = Math.max(1, ...Object.values(groups).flatMap(g => Object.values(g)))
  return <aside className="panel exception-panel"><h2>EXCEPTION PROFILE</h2>{Object.keys(groups).length===0 && <p className="empty">No exceptions for this selection.</p>}{Object.entries(groups).map(([group,items])=><div className="profile-group" key={group}><h3>{group.toUpperCase()}</h3>{Object.entries(items).map(([name,count])=><div className="bar-row" key={name}><div className="bar-label"><span>{name}</span><strong>{count}</strong></div><div className="bar-track"><div className="bar-fill" style={{width:`${Math.max(10,(count/max)*100)}%`}} /></div></div>)}</div>)}</aside>
}

function ActionPage({ reference, onBack, onComplete }) {
  const [checked, setChecked] = useState(reference.steps.map(()=>false))
  const [note, setNote] = useState('')
  const completed = checked.filter(Boolean).length
  const toggle = (i) => setChecked((items)=>items.map((v,index)=>index===i?!v:v))
  return <div className="action-page"><style>{styles}</style><header className="header"><div><h1>ACTION WORKSPACE</h1><p>Reference {reference.id} · {reference.exception}</p></div><button className="header-back" onClick={onBack}>← Back to Control Tower</button></header><main className="action-layout"><section className="panel action-main"><span className={`priority p${reference.priority}`}>P{reference.priority}</span><h2>{reference.actionLabel}</h2><p className="issue-text">{reference.issue}</p><div className="info-grid"><Info label="Owner" value={reference.owner}/><Info label="Deadline" value={`${reference.deadline} · ${reference.minutesLeft >= 0 ? reference.minutesLeft+' min left' : 'overdue'}`}/><Info label="Source system" value={reference.system}/><Info label="Cross-reference impact" value={reference.crossImpact}/></div><h3>Recommended resolution workflow</h3><div className="checklist">{reference.steps.map((step,i)=><label key={step} className={checked[i]?'checked':''}><input type="checkbox" checked={checked[i]} onChange={()=>toggle(i)}/><span>{i+1}</span><p>{step}</p></label>)}</div><label className="note-label">Resolution note<textarea value={note} onChange={(e)=>setNote(e.target.value)} placeholder="Document what was changed, who confirmed it and whether the customer promise is protected." /></label><div className="action-footer"><button className="secondary-btn" onClick={()=>alert(`Prototype: open ${reference.system}`)}>Open source system ↗</button><button className="complete-btn" disabled={completed!==reference.steps.length} onClick={()=>onComplete(reference.id,note)}>Mark as actioned</button></div></section><aside className="panel side-summary"><h3>Action progress</h3><div className="progress-number">{completed}/{reference.steps.length}</div><div className="progress-track"><div style={{width:`${(completed/reference.steps.length)*100}%`}} /></div><p>Complete all steps before closing the action.</p><h3>Expected outcome</h3><p>{reference.delayed ? 'The failure cannot be prevented. The action documents recovery and customer communication.' : 'The exception is removed before cut-off and the customer promise remains achievable.'}</p></aside></main></div>
}
function Info({label,value}) { return <div className="info-card"><span>{label}</span><strong>{value}</strong></div> }

const styles = `
*{box-sizing:border-box}body{margin:0;font-family:Inter,Arial,sans-serif;background:#f4f5f7;color:#20242a}.app-shell,.action-page{min-height:100vh}.header{height:92px;background:#d71920;color:white;display:flex;align-items:center;justify-content:space-between;padding:0 34px}.header h1{margin:0;font-size:30px;letter-spacing:.3px}.header p{margin:6px 0 0;color:#ffe3e4}.live-badge,.header-back{background:white;color:#d71920;border:0;border-radius:9px;padding:13px 18px;font-weight:800}.filters{margin:20px 28px;display:grid;grid-template-columns:repeat(5,minmax(130px,1fr)) auto;gap:14px;background:white;padding:18px;border:1px solid #dfe2e7;border-radius:14px}.filters label span{display:block;font-size:11px;font-weight:800;color:#68707b;text-transform:uppercase;margin-bottom:7px}.filters select{width:100%;padding:11px;border:1px solid #cfd4dc;border-radius:8px;background:white;font-weight:700}.reset-btn{align-self:end;padding:11px 16px;border:1px solid #cfd4dc;background:#f7f8fa;border-radius:8px;font-weight:700}.kpi-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:16px;margin:0 28px 20px}.kpi{border-radius:14px;padding:18px 20px;min-height:118px}.kpi span{font-size:13px;font-weight:800;color:#565d67}.kpi strong{display:block;font-size:34px;margin:10px 0 5px}.kpi small{color:#5f6670}.amber{background:#fff4d8}.amber strong{color:#9a6a00}.red{background:#fde5e5}.red strong{color:#b31217}.green{background:#e3f4ea}.green strong{color:#217a47}.purple{background:#f0e9f8}.purple strong{color:#6d3a8a}.content-grid{display:grid;grid-template-columns:minmax(0,2.4fr) minmax(330px,1fr);gap:18px;margin:0 28px 28px}.panel{background:white;border:1px solid #dfe2e7;border-radius:14px}.worklist-panel{padding:18px}.panel-heading{display:flex;justify-content:space-between;align-items:flex-start}.panel h2{margin:0;font-size:21px}.panel-heading p{margin:5px 0 12px;color:#68707b}.count-pill{background:#eef0f3;border-radius:20px;padding:8px 12px;font-weight:700;color:#555}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;font-size:13px}th{text-align:left;background:#eceef1;padding:9px 10px;color:#4f5660;white-space:nowrap}td{padding:8px 10px;border-bottom:1px solid #eceef1;vertical-align:middle}tbody tr{cursor:pointer}tbody tr:hover,.selected-row{background:#fff8f8}td small{display:block;color:#7a818b;margin-top:4px}.priority{display:inline-block;border-radius:7px;color:white;padding:5px 8px;font-weight:800}.p1{background:#d71920}.p2{background:#f2a900}.p3{background:#26925d}.status{font-size:11px;font-weight:800}.status.actioned{color:#217a47}.status.delayed{color:#b31217}.impact-high{color:#b31217;font-weight:800}.action-btn{border:1px solid #d71920;color:#d71920;background:white;border-radius:6px;padding:5px 8px;font-size:11px;font-weight:800;white-space:nowrap;max-width:132px;overflow:hidden;text-overflow:ellipsis}.action-btn:hover{background:#d71920;color:white}.empty{padding:30px;color:#777;text-align:center}.journey{margin-top:16px;border-top:1px solid #e3e5e8;padding-top:20px}.journey h3{font-size:15px}.timeline{display:flex;justify-content:space-between;position:relative;margin:28px 20px 10px}.timeline:before{content:'';position:absolute;top:38px;left:4%;right:4%;height:4px;background:#cdd1d7}.node{position:relative;text-align:center;width:19%;z-index:1}.node strong,.node small{display:block}.node small{margin-top:10px;color:#666}.dot{display:block;width:20px;height:20px;border-radius:50%;margin:11px auto 0}.dot.done{background:#217a47}.dot.active{background:#f2a900}.dot.late{background:#d71920}.exception-panel{padding:22px}.profile-group{margin-top:18px}.profile-group h3{font-size:12px;color:#747b84;letter-spacing:.5px}.bar-row{margin:9px 0}.bar-label{display:flex;justify-content:space-between;font-size:13px}.bar-track{height:12px;background:#eceef1;border-radius:8px;margin-top:6px;overflow:hidden}.bar-fill{height:100%;background:#d71920;border-radius:8px}.action-layout{display:grid;grid-template-columns:minmax(0,2fr) 360px;gap:20px;padding:28px}.action-main,.side-summary{padding:28px}.action-main h2{font-size:30px;margin:14px 0 8px}.issue-text{font-size:18px;line-height:1.5;color:#4f5660}.info-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin:24px 0}.info-card{background:#f5f6f8;border-radius:10px;padding:16px}.info-card span{display:block;font-size:11px;color:#737b85;text-transform:uppercase;font-weight:800}.info-card strong{display:block;margin-top:7px}.checklist label{display:flex;align-items:center;gap:12px;border:1px solid #dfe2e7;border-radius:10px;padding:12px;margin:9px 0}.checklist label.checked{background:#eaf6ef;border-color:#75b690}.checklist input{width:18px;height:18px}.checklist label>span{width:27px;height:27px;border-radius:50%;background:#eceef1;display:grid;place-items:center;font-weight:800}.checklist p{margin:0}.note-label{display:block;margin-top:22px;font-weight:800}.note-label textarea{display:block;width:100%;height:110px;margin-top:8px;padding:12px;border:1px solid #cfd4dc;border-radius:9px;font:inherit}.action-footer{display:flex;justify-content:space-between;margin-top:20px}.secondary-btn,.complete-btn{padding:12px 18px;border-radius:8px;font-weight:800}.secondary-btn{background:white;border:1px solid #9097a1}.complete-btn{background:#217a47;color:white;border:0}.complete-btn:disabled{background:#bfc4ca}.side-summary h3{margin-top:0}.progress-number{font-size:44px;font-weight:900;color:#d71920}.progress-track{height:12px;background:#eceef1;border-radius:8px;overflow:hidden;margin:12px 0 20px}.progress-track div{height:100%;background:#217a47}.side-summary p{line-height:1.5;color:#5f6670}
@media(max-width:1100px){.filters{grid-template-columns:repeat(3,1fr)}.kpi-grid{grid-template-columns:repeat(2,1fr)}.content-grid,.action-layout{grid-template-columns:1fr}.exception-panel{order:2}}@media(max-width:700px){.header{height:auto;padding:22px;gap:20px}.header h1{font-size:22px}.filters{grid-template-columns:1fr}.kpi-grid{grid-template-columns:1fr}.content-grid{margin:0 12px 20px}.action-layout{padding:12px}.info-grid{grid-template-columns:1fr}}
`

export default App
