import React, { useMemo, useState } from 'react'

const seedReferences = [
  {
    id:'47112345', region:'LEC', mo:'DE', priority:1, owner:'Credit Management', escalationOwner:'Finance Team Lead', promiseDate:'today',
    exceptionGroup:'Commercial / Order Entry', exception:'Credit Block', activeExceptions:['Credit Block'], deadline:'13:18', minutesLeft:36,
    status:'NEW', recovery:'Recoverable', value:84000, customerImpact:'Strategic customer · €84k', actionLabel:'Release Credit Block', system:'SAP S/4 Credit Management',
    issue:'The customer credit limit is exceeded. The order can still be released before the 14:00 order cut-off.',
    steps:['Review open receivables','Confirm temporary credit approval','Release the credit block in SAP','Verify delivery creation'],
    recurring:'12 similar cases in the last 7 days', automationCandidate:true,
  },
  {
    id:'47112588', region:'W1', mo:'NL', priority:1, owner:'Order Management', escalationOwner:'O2P Team Lead', promiseDate:'today',
    exceptionGroup:'Commercial / Order Entry', exception:'Order Block', activeExceptions:['Order Block','Pricing Check'], deadline:'13:30', minutesLeft:48,
    status:'IN PROGRESS', recovery:'Recoverable', value:62000, customerImpact:'2 references · €62k', actionLabel:'Remove Order Block', system:'SAP S/4 Sales Order',
    issue:'A manual order block prevents delivery creation although material is available.',
    steps:['Review block reason','Confirm approval with order owner','Remove order block','Reprocess delivery creation'],
    recurring:'8 similar cases in the last 7 days', automationCandidate:false,
  },
  {
    id:'47112641', region:'E4', mo:'AT', priority:1, owner:'Customer Service', escalationOwner:'CS Team Lead', promiseDate:'today',
    exceptionGroup:'Commercial / Order Entry', exception:'Incomplete Address', activeExceptions:['Incomplete Address'], deadline:'13:42', minutesLeft:60,
    status:'NEW', recovery:'Critical', value:19000, customerImpact:'Customer installation today', actionLabel:'Update Address', system:'SAP Business Partner Master Data',
    issue:'The ship-to address is incomplete and cannot be processed reliably by the carrier.',
    steps:['Call customer to confirm address','Update address in master data','Validate postal code and city','Reprocess delivery and label creation'],
    recurring:'18 similar cases in the last 7 days', automationCandidate:true,
  },
  {
    id:'47111903', region:'LEC', mo:'DE', priority:2, owner:'Inbound Warehouse', escalationOwner:'Inbound Shift Lead', promiseDate:'today',
    exceptionGroup:'Fulfillment / Warehouse', exception:'Inbound Execution', activeExceptions:['Inbound Execution','ATP Confirmation'], deadline:'14:00', minutesLeft:78,
    status:'ASSIGNED', recovery:'Recoverable', value:41000, customerImpact:'5 additional express references affected', actionLabel:'Prioritize Inbound', system:'SAP EWM Inbound Monitor',
    issue:'Missing inbound stock for Article 234 – Drill Set affects five additional express references due today.',
    steps:['Locate the inbound handling unit','Confirm unloading status','Assign priority put-away','Post put-away and trigger ATP recheck'],
    recurring:'6 similar cases in the last 7 days', automationCandidate:true,
  },
  {
    id:'47112802', region:'W1', mo:'BE', priority:2, owner:'Warehouse', escalationOwner:'Warehouse Team Lead', promiseDate:'future',
    exceptionGroup:'Fulfillment / Warehouse', exception:'Backorder Focus', activeExceptions:['Backorder Focus'], deadline:'14:15', minutesLeft:93,
    status:'MONITORING', recovery:'Recoverable', value:36000, customerImpact:'3 references compete for the same stock', actionLabel:'Prioritize Picking', system:'SAP EWM Warehouse Monitor',
    issue:'Available stock is not yet allocated to the highest-priority express references.',
    steps:['Review competing requirements','Validate allocation priority','Move reference into priority wave','Confirm picking start'],
    recurring:'4 similar cases in the last 7 days', automationCandidate:false,
  },
  {
    id:'47112017', region:'E4', mo:'CH', priority:2, owner:'Transport', escalationOwner:'Transport Team Lead', promiseDate:'future',
    exceptionGroup:'Transport', exception:'Transport Planning', activeExceptions:['Transport Planning'], deadline:'17:15', minutesLeft:273,
    status:'NEW', recovery:'Recoverable', value:23000, customerImpact:'2 references on the same route', actionLabel:'Assign Carrier', system:'SAP TM Transportation Cockpit',
    issue:'No carrier has been assigned although the shipping window is approaching.',
    steps:['Review route and service level','Check carrier capacity','Assign carrier','Confirm carrier acceptance'],
    recurring:'5 similar cases in the last 7 days', automationCandidate:false,
  },
  {
    id:'47113111', region:'LEC', mo:'DE', priority:3, owner:'Transport', escalationOwner:'Transport Manager', promiseDate:'history',
    exceptionGroup:'Transport', exception:'Missing Documents', activeExceptions:['Missing Documents','Transport Execution'], deadline:'16:30', minutesLeft:-42,
    status:'DELAYED', recovery:'No longer recoverable', value:12000, customerImpact:'Customer was overpromised', actionLabel:'Start Recovery', system:'Export Documentation',
    issue:'Required export documents were not available before the final shipping cut-off.',
    steps:['Identify missing document','Request document from responsible owner','Inform customer proactively','Reschedule transport'],
    recurring:'3 similar cases in the last 7 days', automationCandidate:false,
  },
]

const baseKpis = { atRisk:43, delayed:17, actNow:12, protected:31, actioned:28 }
const baseProfile = {
  'Commercial / Order Entry': {'Credit Block':18,'Incomplete Address':14,'Order Block':11},
  'Fulfillment / Warehouse': {'Warehouse Execution':21,'Inbound Execution':17,'Backorder Focus':13},
  'Transport': {'Transport Planning':16,'Transport Execution':12,'Missing Documents':9},
}

const money = (v) => new Intl.NumberFormat('en-US',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(v)

function App(){
  const [page,setPage]=useState('operations')
  const [filters,setFilters]=useState({region:'All',mo:'All',priority:'All',owner:'All',promiseDate:'today'})
  const [references,setReferences]=useState(seedReferences)
  const [selectedId,setSelectedId]=useState(seedReferences[0].id)
  const [actionId,setActionId]=useState(null)

  const filtered=useMemo(()=>references.filter(r=>(filters.region==='All'||r.region===filters.region)&&(filters.mo==='All'||r.mo===filters.mo)&&(filters.priority==='All'||String(r.priority)===filters.priority)&&(filters.owner==='All'||r.owner===filters.owner)&&(filters.promiseDate==='All'||r.promiseDate===filters.promiseDate)),[references,filters])
  const selected=filtered.find(r=>r.id===selectedId)||filtered[0]||null
  const actionReference=references.find(r=>r.id===actionId)

  const factor=useMemo(()=>{
    let f=1
    if(filters.region!=='All')f*=.48
    if(filters.mo!=='All')f*=.42
    if(filters.priority!=='All')f*=filters.priority==='1'?.34:filters.priority==='2'?.43:.23
    if(filters.owner!=='All')f*=.32
    if(filters.promiseDate==='future')f*=.62
    if(filters.promiseDate==='history')f*=.38
    return Math.max(.08,f)
  },[filters])

  const kpis=useMemo(()=>({
    atRisk:Math.round(baseKpis.atRisk*factor)+filtered.filter(r=>r.recovery!=='No longer recoverable'&&r.status!=='ACTIONED').length,
    delayed:Math.round(baseKpis.delayed*factor)+filtered.filter(r=>r.recovery==='No longer recoverable').length,
    actNow:Math.round(baseKpis.actNow*factor)+filtered.filter(r=>r.priority===1&&r.status!=='ACTIONED').length,
    protected:Math.round(baseKpis.protected*factor)+filtered.filter(r=>r.status==='ACTIONED'&&r.recovery!=='No longer recoverable').length,
    actioned:Math.round(baseKpis.actioned*factor)+filtered.filter(r=>r.status==='ACTIONED').length,
  }),[factor,filtered])

  const exceptionProfile=useMemo(()=>{
    const result=Object.fromEntries(Object.entries(baseProfile).map(([g,items])=>[g,Object.fromEntries(Object.entries(items).map(([n,c])=>[n,Math.max(1,Math.round(c*factor))]))]))
    filtered.forEach(r=>{result[r.exceptionGroup]??={};result[r.exceptionGroup][r.exception]=(result[r.exceptionGroup][r.exception]||0)+1})
    return result
  },[factor,filtered])

  const completeAction=(id,outcome,note)=>{
    setReferences(list=>list.map(r=>r.id===id?{...r,status:outcome==='Resolved'?'ACTIONED':outcome==='Escalated'?'ESCALATED':'MONITORING',recovery:outcome==='Resolved'&&r.recovery!=='No longer recoverable'?'Protected':r.recovery,resolutionNote:note}:r))
    setSelectedId(id);setActionId(null);setPage('operations')
  }

  if(actionReference)return <ActionPage reference={actionReference} onBack={()=>setActionId(null)} onComplete={completeAction}/>

  return <div className="app"><style>{styles}</style>
    <Header page={page} setPage={setPage}/>
    {page==='operations'?<>
      <FilterBar filters={filters} setFilters={setFilters} references={references}/>
      <KpiRow kpis={kpis}/>
      <main className="grid">
        <section className="panel worklist">
          <div className="section-head"><div><h2>PRIORITIZED ACTION WORKLIST</h2><p>Focus on references that are still recoverable before the operational cut-off.</p></div><span className="pill">{filtered.length} visible</span></div>
          <Worklist rows={filtered} selected={selected} setSelectedId={setSelectedId} openAction={(id)=>{setSelectedId(id);setActionId(id)}}/>
          <Journey reference={selected}/>
        </section>
        <ExceptionProfile groups={exceptionProfile}/>
      </main>
    </>:<Reporting references={references} kpis={kpis} profile={exceptionProfile}/>} 
  </div>
}

function Header({page,setPage}){return <header className="header"><div><h1>ORDER CONTROL TOWER</h1><p>Management concept mock-up · Exception prevention and operational action</p></div><nav><button className={page==='operations'?'active':''} onClick={()=>setPage('operations')}>Operations</button><button className={page==='reporting'?'active':''} onClick={()=>setPage('reporting')}>Management Reporting</button></nav><span className="live">LIVE DATA · 2 MIN</span></header>}

function FilterBar({filters,setFilters,references}){
  const owners=['All',...new Set(references.map(r=>r.owner))]
  const fields=[['Region','region',['All','LEC','W1','E4']],['MO','mo',['All','DE','NL','BE','AT','CH']],['Priority','priority',['All','1','2','3']],['Owner','owner',owners],['Promise Date','promiseDate',['All','today','future','history']]]
  return <section className="filters">{fields.map(([label,key,opts])=><label key={key}><span>{label}</span><select value={filters[key]} onChange={e=>setFilters(f=>({...f,[key]:e.target.value}))}>{opts.map(o=><option key={o}>{o}</option>)}</select></label>)}<button onClick={()=>setFilters({region:'All',mo:'All',priority:'All',owner:'All',promiseDate:'today'})}>Reset</button></section>
}

function KpiRow({kpis}){return <section className="kpis"><Kpi tone="amber" title="REFERENCES AT RISK" value={kpis.atRisk} hint="Still recoverable"/><Kpi tone="red" title="REFERENCES DELAYED" value={kpis.delayed} hint="CX impact – Customer was overpromised"/><Kpi tone="red" title="P1 · ACT NOW" value={kpis.actNow} hint="Immediate action required"/><Kpi tone="green" title="PROMISES PROTECTED" value={kpis.protected} hint="Recovered before cut-off"/><Kpi tone="purple" title="ACTIONED" value={kpis.actioned} hint="Completed interventions"/></section>}
function Kpi({tone,title,value,hint}){return <div className={`kpi ${tone}`}><span>{title}</span><strong>{value}</strong><small>{hint}</small></div>}

function Worklist({rows,selected,setSelectedId,openAction}){return <div className="table-wrap"><table><thead><tr><th>Priority</th><th>Reference</th><th>Exception</th><th>Action deadline</th><th>Action</th><th>Recovery</th><th>Customer impact</th><th>Owner</th><th>Status</th></tr></thead><tbody>{rows.map(r=><tr key={r.id} className={selected?.id===r.id?'selected':''} onClick={()=>setSelectedId(r.id)}><td><span className={`priority p${r.priority}`}>P{r.priority}</span></td><td><strong>{r.id}</strong><small>{r.region} · {r.mo}</small></td><td>{r.exception}{r.activeExceptions.length>1&&<span className="multi">{r.activeExceptions.length} issues</span>}</td><td><strong>{r.deadline}</strong><small className={r.minutesLeft<0?'overdue':''}>{r.minutesLeft>=0?`${r.minutesLeft} min remaining`:`${Math.abs(r.minutesLeft)} min overdue`}</small></td><td><button className="action" onClick={e=>{e.stopPropagation();openAction(r.id)}}>{r.actionLabel} ↗</button></td><td><span className={`recovery ${r.recovery.toLowerCase().replaceAll(' ','-')}`}>{r.recovery}</span></td><td>{r.customerImpact}</td><td>{r.owner}</td><td><span className="status">{r.status}</span></td></tr>)}</tbody></table>{rows.length===0&&<div className="empty">No references match the selected filters.</div>}</div>}

function Journey({reference}){
  if(!reference)return null
  const finalLabel=reference.status==='ACTIONED'?'Promise protected':reference.recovery==='No longer recoverable'?'Recovery required':'Operational cut-off'
  const nodes=[['12:47','Risk detected','done'],['12:49','Owner assigned','done'],['12:56','Action started',reference.status==='NEW'?'open':'done'],[reference.deadline,reference.status==='ACTIONED'?'Action completed':'Target resolution',reference.status==='ACTIONED'?'done':'active'],['14:00',finalLabel,reference.status==='ACTIONED'?'done':reference.recovery==='No longer recoverable'?'late':'open']]
  return <div className="journey"><h3>SELECTED REFERENCE JOURNEY · {reference.id}</h3><div className="timeline">{nodes.map((n,i)=><div className="node" key={i}><strong>{n[0]}</strong><span className={`dot ${n[2]}`}/><small>{n[1]}</small></div>)}</div></div>
}

function ExceptionProfile({groups}){const max=Math.max(1,...Object.values(groups).flatMap(g=>Object.values(g)));return <aside className="panel profile"><div className="section-head"><div><h2>EXCEPTION PROFILE</h2><p>Dummy volumes change with the active filters.</p></div></div>{Object.entries(groups).map(([group,items])=><div className="profile-group" key={group}><h3>{group}</h3>{Object.entries(items).map(([name,count])=><div className="bar-row" key={name}><div><span>{name}</span><strong>{count}</strong></div><div className="track"><span style={{width:`${Math.max(8,count/max*100)}%`}}/></div></div>)}</div>)}</aside>}

function Reporting({references,kpis,profile}){
  const recoverable=references.filter(r=>r.recovery==='Recoverable'||r.recovery==='Critical').length
  const multi=references.filter(r=>r.activeExceptions.length>1).length
  const automation=references.filter(r=>r.automationCandidate).length
  return <main className="reporting"><section className="hero-report"><div><span>MANAGEMENT VIEW</span><h2>From visibility to protected customer promises</h2><p>The Control Tower creates value when risks are detected early, assigned clearly and resolved before the operational cut-off.</p></div><div className="hero-metric"><strong>{kpis.protected}</strong><span>promises protected</span></div></section><section className="report-grid"><div className="panel report-card"><h3>Operational outcome</h3><Metric label="Recoverable references" value={recoverable}/><Metric label="Multi-exception references" value={multi}/><Metric label="Automation candidates" value={automation}/><Metric label="Action success rate" value="72%"/></div><div className="panel report-card"><h3>Business value</h3><Metric label="Customer promise value protected" value="€1.2m"/><Metric label="Avoided special handling" value="€84k"/><Metric label="Average response time" value="18 min"/><Metric label="Open beyond SLA" value="7"/></div><div className="panel report-card wide"><h3>Management takeaway</h3><div className="takeaways"><div><strong>Detect</strong><p>Identify risk before it becomes an OTIF failure.</p></div><div><strong>Act</strong><p>Guide the responsible owner to the next best action.</p></div><div><strong>Protect</strong><p>Preserve the customer promise and avoid recovery cost.</p></div><div><strong>Learn</strong><p>Use recurring exceptions to improve automation.</p></div></div></div></section></main>
}
function Metric({label,value}){return <div className="metric"><span>{label}</span><strong>{value}</strong></div>}

function ActionPage({reference,onBack,onComplete}){
  const [checked,setChecked]=useState(reference.steps.map(()=>false));const [note,setNote]=useState('');const [outcome,setOutcome]=useState('Resolved');const done=checked.filter(Boolean).length
  return <div className="action-page"><style>{styles}</style><header className="header"><div><h1>ACTION WORKSPACE</h1><p>Reference {reference.id} · {reference.exception}</p></div><button className="back" onClick={onBack}>← Back to Operations</button></header><main className="action-layout"><section className="panel action-main"><div className="action-title"><span className={`priority p${reference.priority}`}>P{reference.priority}</span><div><h2>{reference.actionLabel}</h2><p>{reference.issue}</p></div></div>{reference.activeExceptions.length>1&&<div className="warning"><strong>Multi-exception reference:</strong> {reference.activeExceptions.join(' · ')}</div>}<div className="info-grid"><Info label="Recovery status" value={reference.recovery}/><Info label="Time remaining" value={reference.minutesLeft>=0?`${reference.minutesLeft} minutes`:'Cut-off missed'}/><Info label="Owner" value={reference.owner}/><Info label="Escalation owner" value={reference.escalationOwner}/><Info label="Customer impact" value={reference.customerImpact}/><Info label="Source system" value={reference.system}/></div><h3>Recommended resolution workflow</h3><div className="checklist">{reference.steps.map((s,i)=><label key={s} className={checked[i]?'checked':''}><input type="checkbox" checked={checked[i]} onChange={()=>setChecked(v=>v.map((x,j)=>j===i?!x:x))}/><span>{i+1}</span><p>{s}</p></label>)}</div><div className="resolution"><label>Outcome<select value={outcome} onChange={e=>setOutcome(e.target.value)}><option>Resolved</option><option>Partially resolved</option><option>Escalated</option></select></label><label>Resolution note<textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Document the action and customer impact."/></label></div><div className="action-footer"><button className="secondary" onClick={()=>alert(`Prototype link to ${reference.system}`)}>Open source system ↗</button><button className="complete" disabled={done!==reference.steps.length} onClick={()=>onComplete(reference.id,outcome,note)}>Mark as actioned</button></div></section><aside className="panel action-side"><h3>Action progress</h3><strong className="progress-number">{done}/{reference.steps.length}</strong><div className="progress"><span style={{width:`${done/reference.steps.length*100}%`}}/></div><h3>Expected outcome</h3><p>{reference.recovery==='No longer recoverable'?'Document recovery actions and proactively manage customer impact.':'Remove the exception before cut-off and keep the customer promise achievable.'}</p><h3>Learning signal</h3><p>{reference.recurring}</p>{reference.automationCandidate&&<span className="automation">Automation candidate</span>}</aside></main></div>
}
function Info({label,value}){return <div className="info"><span>{label}</span><strong>{value}</strong></div>}

const styles=`
*{box-sizing:border-box}body{margin:0;font-family:Inter,Arial,sans-serif;background:#f4f5f7;color:#20242a}.app,.action-page{min-height:100vh}.header{height:92px;background:#d71920;color:#fff;display:flex;align-items:center;gap:28px;padding:0 32px}.header h1{margin:0;font-size:29px}.header p{margin:5px 0 0;color:#ffe3e4}.header nav{margin-left:auto;display:flex;gap:8px}.header nav button,.back{border:1px solid rgba(255,255,255,.55);background:transparent;color:#fff;border-radius:8px;padding:10px 14px;font-weight:800}.header nav button.active{background:#fff;color:#d71920}.live{background:#fff;color:#d71920;border-radius:8px;padding:11px 15px;font-weight:900}.filters{margin:20px 28px;display:grid;grid-template-columns:repeat(5,minmax(130px,1fr)) auto;gap:13px;background:#fff;border:1px solid #dde1e6;border-radius:13px;padding:16px}.filters label span{display:block;font-size:11px;text-transform:uppercase;font-weight:900;color:#68707b;margin-bottom:6px}.filters select,.filters button,.resolution select{width:100%;padding:10px;border:1px solid #cfd4dc;border-radius:8px;background:#fff;font-weight:700}.filters button{align-self:end}.kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:15px;margin:0 28px 20px}.kpi{border-radius:13px;padding:17px 19px;min-height:112px}.kpi span{font-size:12px;font-weight:900;color:#555d67}.kpi strong{display:block;font-size:33px;margin:9px 0 5px}.kpi small{color:#5f6670}.amber{background:#fff4d8}.amber strong{color:#9a6a00}.red{background:#fde5e5}.red strong{color:#b31217}.green{background:#e3f4ea}.green strong{color:#217a47}.purple{background:#f0e9f8}.purple strong{color:#6d3a8a}.grid{display:grid;grid-template-columns:minmax(0,2.45fr) minmax(330px,1fr);gap:18px;margin:0 28px 28px}.panel{background:#fff;border:1px solid #dfe2e7;border-radius:14px}.worklist{padding:17px}.section-head{display:flex;justify-content:space-between;align-items:flex-start}.section-head h2,.profile h2{margin:0;font-size:20px}.section-head p{margin:5px 0 13px;color:#68707b}.pill{background:#eef0f3;border-radius:18px;padding:7px 11px;font-weight:800}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;font-size:12px}th{text-align:left;background:#eceef1;padding:8px 9px;color:#4f5660;white-space:nowrap}td{padding:7px 9px;border-bottom:1px solid #eceef1;vertical-align:middle}tbody tr{cursor:pointer}tbody tr:hover,tbody tr.selected{background:#fff8f8}td small{display:block;color:#777f89;margin-top:3px}.priority{display:inline-block;color:#fff;border-radius:6px;padding:4px 7px;font-weight:900}.p1{background:#d71920}.p2{background:#f2a900}.p3{background:#26925d}.action{border:1px solid #d71920;color:#d71920;background:#fff;border-radius:6px;padding:5px 7px;font-size:10px;font-weight:900;white-space:nowrap}.action:hover{background:#d71920;color:#fff}.multi{display:block;width:max-content;margin-top:4px;background:#f0e9f8;color:#6d3a8a;border-radius:10px;padding:2px 6px;font-size:9px;font-weight:900}.recovery{font-weight:900;font-size:10px}.recovery.recoverable,.recovery.protected{color:#217a47}.recovery.critical{color:#cf7f00}.recovery.no-longer-recoverable{color:#b31217}.overdue{color:#b31217!important;font-weight:800}.status{font-size:10px;font-weight:900}.empty{text-align:center;padding:28px;color:#777}.journey{margin-top:15px;border-top:1px solid #e3e5e8;padding-top:18px}.journey h3{font-size:14px}.timeline{display:flex;justify-content:space-between;position:relative;margin:24px 18px 8px}.timeline:before{content:'';position:absolute;left:5%;right:5%;top:34px;height:4px;background:#ccd1d7}.node{width:19%;text-align:center;z-index:1}.node strong,.node small{display:block}.node small{margin-top:8px;color:#666}.dot{display:block;width:18px;height:18px;border-radius:50%;margin:9px auto 0;background:#cbd0d6}.dot.done{background:#217a47}.dot.active{background:#f2a900}.dot.late{background:#d71920}.profile{padding:21px}.profile-group{margin-top:18px}.profile-group h3{font-size:12px;color:#737b85;text-transform:uppercase}.bar-row{margin:10px 0}.bar-row>div:first-child{display:flex;justify-content:space-between;font-size:13px}.track{height:11px;background:#eceef1;border-radius:8px;overflow:hidden;margin-top:5px}.track span{display:block;height:100%;background:#d71920;border-radius:8px}.reporting{padding:28px}.hero-report{background:linear-gradient(120deg,#7f0d12,#d71920);color:#fff;border-radius:18px;padding:34px;display:flex;justify-content:space-between;align-items:center}.hero-report span{font-size:12px;font-weight:900;letter-spacing:1px}.hero-report h2{font-size:32px;margin:9px 0}.hero-report p{max-width:760px;color:#ffe5e6}.hero-metric{text-align:right}.hero-metric strong{display:block;font-size:56px}.hero-metric span{font-size:15px}.report-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px}.report-card{padding:24px}.report-card h3{margin-top:0}.report-card.wide{grid-column:1/-1}.metric{display:flex;justify-content:space-between;border-bottom:1px solid #eceef1;padding:14px 0}.metric strong{font-size:20px}.takeaways{display:grid;grid-template-columns:repeat(4,1fr);gap:15px}.takeaways div{background:#f5f6f8;border-radius:12px;padding:18px}.takeaways strong{color:#d71920;font-size:19px}.takeaways p{color:#5f6670;line-height:1.45}.action-layout{display:grid;grid-template-columns:minmax(0,2fr) 350px;gap:20px;padding:28px}.action-main,.action-side{padding:27px}.action-title{display:flex;gap:14px;align-items:flex-start}.action-title h2{font-size:29px;margin:0}.action-title p{font-size:17px;color:#515964;line-height:1.5}.warning{background:#fff4d8;border-left:4px solid #f2a900;padding:13px;margin:18px 0}.info-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:11px;margin:21px 0}.info{background:#f5f6f8;border-radius:9px;padding:14px}.info span{display:block;font-size:10px;text-transform:uppercase;color:#737b85;font-weight:900}.info strong{display:block;margin-top:6px}.checklist label{display:flex;align-items:center;gap:11px;border:1px solid #dfe2e7;border-radius:9px;padding:11px;margin:8px 0}.checklist label.checked{background:#eaf6ef;border-color:#75b690}.checklist input{width:17px;height:17px}.checklist label>span{width:25px;height:25px;border-radius:50%;background:#eceef1;display:grid;place-items:center;font-weight:900}.checklist p{margin:0}.resolution{display:grid;grid-template-columns:220px 1fr;gap:12px;margin-top:20px}.resolution label{font-weight:900}.resolution textarea{display:block;width:100%;height:88px;margin-top:6px;padding:10px;border:1px solid #cfd4dc;border-radius:8px;font:inherit}.resolution select{margin-top:6px}.action-footer{display:flex;justify-content:space-between;margin-top:18px}.secondary,.complete{padding:11px 17px;border-radius:8px;font-weight:900}.secondary{background:#fff;border:1px solid #9097a1}.complete{background:#217a47;color:#fff;border:0}.complete:disabled{background:#bfc4ca}.progress-number{font-size:44px;color:#d71920}.progress{height:11px;background:#eceef1;border-radius:8px;overflow:hidden}.progress span{display:block;height:100%;background:#217a47}.action-side p{color:#5f6670;line-height:1.5}.automation{display:inline-block;background:#f0e9f8;color:#6d3a8a;border-radius:14px;padding:7px 10px;font-weight:900}.back{margin-left:auto}.action-page .header{justify-content:space-between}
@media(max-width:1100px){.filters{grid-template-columns:repeat(3,1fr)}.kpis{grid-template-columns:repeat(2,1fr)}.grid,.action-layout{grid-template-columns:1fr}.report-grid{grid-template-columns:1fr}.takeaways{grid-template-columns:repeat(2,1fr)}}@media(max-width:720px){.header{height:auto;flex-wrap:wrap;padding:20px}.header nav{order:3;width:100%}.filters{grid-template-columns:1fr;margin:14px}.kpis{grid-template-columns:1fr;margin:0 14px 14px}.grid{margin:0 14px 20px}.reporting,.action-layout{padding:14px}.hero-report{display:block}.hero-metric{text-align:left;margin-top:20px}.takeaways,.info-grid,.resolution{grid-template-columns:1fr}}
`

export default App
