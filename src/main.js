import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import htm from 'htm';
import JSZip from 'jszip';
import './styles.css';
import './kinds.css';
import { parseChat, MEDIA_RE } from './parser.js';
import { analyze } from './analysis.js';
import { nf, nf1, pct, MONTHS, fmtDate, fmtDur, pColor } from './format.js';
import { SCENARIOS, makeDemo } from './demos.js';
import { TONES, buildPrompt } from './prompt.js';
import { getAi } from './ai.js';
import { KINDS, kindById } from './kinds.js';

const html = htm.bind(React.createElement);
const DEMO_KIND = { 'lea-tim':'liebe', familie:'familie', wg:'anderes' };

function niceMax(v){ if(v<=5) return 5; const p=Math.pow(10,Math.floor(Math.log10(v))); const n=v/p; return (n<=1?1:n<=2?2:n<=5?5:10)*p; }

function MonthChart({a}){
  const W=640,Hh=210,pl=40,pr=8,pt=10,pb=26;
  const n=a.months.length, max=niceMax(Math.max(1,...a.months.map(m=>m.counts.reduce((x,y)=>x+y,0))));
  const bw=(W-pl-pr)/n, inner=Math.max(2,bw*0.7);
  const y=v=>pt+(Hh-pt-pb)*(1-v/max);
  const every=Math.ceil(n/8);
  return html`<div className="chart"><svg viewBox=${`0 0 ${W} ${Hh}`} role="img" aria-label="Nachrichten pro Monat, gestapelt nach Person">
    ${[0,max/2,max].map(v=>html`<g key=${v}><line className="grid" x1=${pl} x2=${W-pr} y1=${y(v)} y2=${y(v)}/><text x=${pl-6} y=${y(v)+3} textAnchor="end">${nf.format(v)}</text></g>`)}
    ${a.months.map((m,i)=>{ let acc=0; const x=pl+i*bw+(bw-inner)/2;
      return html`<g key=${m.key}>
        ${m.counts.map((c,j)=>{ if(!c) return null; const y0=y(acc), y1=y(acc+c); acc+=c; return html`<rect key=${j} x=${x} y=${y1} width=${inner} height=${Math.max(0,y0-y1)} fill=${pColor(j)} rx="1.5"><title>${MONTHS[m.m]} ${m.y} · ${a.persons[j].name}: ${c}</title></rect>`; })}
        ${i%every===0 ? html`<text x=${x+inner/2} y=${Hh-8} textAnchor="middle">${MONTHS[m.m]}${(m.m===0||i===0)?' '+String(m.y).slice(2):''}</text>` : null}
      </g>`; })}
  </svg></div>`;
}

function HourChart({a}){
  const W=640,Hh=150,pl=8,pr=8,pt=8,pb=22;
  const max=Math.max(1,...a.hours); const bw=(W-pl-pr)/24, inner=bw*0.72;
  const y=v=>pt+(Hh-pt-pb)*(1-v/max);
  return html`<div className="chart"><svg viewBox=${`0 0 ${W} ${Hh}`} role="img" aria-label="Nachrichten nach Uhrzeit">
    <line className="grid" x1=${pl} x2=${W-pr} y1=${y(0)} y2=${y(0)}/>
    ${a.hours.map((v,i)=>html`<rect key=${i} x=${pl+i*bw+(bw-inner)/2} y=${y(v)} width=${inner} height=${y(0)-y(v)} rx="2" fill=${i===a.peakHour?'var(--mark)':'var(--p0)'} opacity=${i===a.peakHour?1:.75}><title>${i} Uhr: ${v}</title></rect>`)}
    ${[0,6,12,18,23].map(i=>html`<text key=${i} x=${pl+i*bw+bw/2} y=${Hh-6} textAnchor="middle">${i}:00</text>`)}
  </svg></div>`;
}

function Logo(){
  return html`<svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
    <rect x="2" y="4" width="22" height="17" rx="6" fill="var(--p0)"/>
    <path d="M7 21 l0 5 l5 -5z" fill="var(--p0)"/>
    <circle cx="20" cy="17" r="8" fill="var(--bg)" stroke="var(--ink)" stroke-width="2.6"/>
    <circle cx="20" cy="17" r="4" fill="var(--mark)"/>
    <line x1="26" y1="23" x2="31.5" y2="28.5" stroke="var(--ink)" stroke-width="3.4" stroke-linecap="round"/>
  </svg>`;
}

function summaryText(a, title, ai){
  const top = a.persons.slice(0,6);
  const lines = [`Chatlupe: ${title}`, `${fmtDate(a.first)} – ${fmtDate(a.last)} · ${nf.format(a.total)} Nachrichten`, ''];
  lines.push('Wer investiert mehr: ' + top.map(p=>`${p.name} ${pct(p.invest)}`).join(' · '));
  top.forEach(p=>lines.push(`${p.name}: ${nf.format(p.msgs)} Nachrichten, antwortet im Schnitt nach ${fmtDur(p.medianReply)}, ${p.starters}× zuerst geschrieben`));
  lines.push(`Längste Funkstille: ${fmtDur(a.longest.gap)}`);
  if (ai){ lines.push('', ai.titel||'', ai.fazit||''); }
  return lines.join('\n');
}

function Investment({a}){
  const top = a.persons.slice(0,6);
  const lead = top[0] && [...top].sort((x,y)=>y.invest-x.invest)[0];
  const two = top.length===2;
  const diff = two ? Math.abs(top[0].invest-top[1].invest) : 0;
  let line;
  if (two) line = diff<0.06 ? 'Ziemlich ausgeglichen. Ihr investiert beide etwa gleich viel.' : `${lead.name} investiert mehr in diesen Chat.`;
  else line = `${lead.name} hält diese Gruppe am Laufen.`;
  return html`<div className="panel">
    <div className="label">Wer investiert mehr?</div>
    <p className="verdict-line">${line}</p>
    <div className="invest-bar" role="img" aria-label=${top.map(p=>p.name+' '+pct(p.invest)).join(', ')}>
      ${top.map(p=>html`<span key=${p.name} style=${{flex:p.invest,background:pColor(p.idx)}}>${p.invest>0.12?pct(p.invest):''}</span>`)}
    </div>
    <div className="legend">${top.map(p=>html`<span key=${p.name}><i className="dot" style=${{background:pColor(p.idx)}}></i>${p.name} <span className="mono muted">${pct(p.invest)}</span></span>`)}</div>
    <p className="muted" style=${{fontSize:'.85rem'}}>Score aus Anteil der Nachrichten (40 %), wer zuerst schreibt (30 %) und Antworttempo (30 %).</p>
  </div>`;
}

function People({a}){
  return html`<div className="people">${a.persons.slice(0,6).map(p=>html`<article className="person" key=${p.name}>
    <h3><i className="dot" style=${{background:pColor(p.idx)}}></i>${p.name}</h3>
    <div className="emojis" aria-label="Lieblings-Emojis">${p.topEmojis.join('') || html`<span className="muted" style=${{fontSize:'.85rem',letterSpacing:0}}>keine Emojis</span>`}</div>
    <dl className="kv">
      <dt>Nachrichten</dt><dd>${nf.format(p.msgs)} · ${pct(p.msgs/a.total)}</dd>
      <dt>Antwortet nach</dt><dd>${fmtDur(p.medianReply)}</dd>
      <dt>Schreibt zuerst</dt><dd>${nf.format(p.starters)}×</dd>
      <dt>Wörter pro Nachricht</dt><dd>${nf1.format(p.wpm)}</dd>
      <dt>Fragen gestellt</dt><dd>${nf.format(p.questions)}</dd>
      <dt>Nach Mitternacht</dt><dd>${nf.format(p.night)}</dd>
      <dt>Herzen & Liebes</dt><dd>${nf.format(p.hearts)}</dd>
      <dt>Medien</dt><dd>${nf.format(p.media)}</dd>
    </dl>
  </article>`)}</div>`;
}

function Change({a}){
  const c=a.change;
  const arrow=(e,l)=>{ const d=l-e; if (Math.abs(d)<0.03) return html`<span className="muted">gleich</span>`; return d>0?html`<span className="up">▲ ${Math.round(d*100)}</span>`:html`<span className="down">▼ ${Math.round(-d*100)}</span>`; };
  const tempo = c.latePerDay/c.earlyPerDay;
  return html`<div className="panel">
    <div className="label">Früher vs. jetzt</div>
    <p className="verdict-line">${tempo<0.75?'Es ist ruhiger geworden.':tempo>1.33?'Ihr schreibt mehr als am Anfang.':'Das Tempo ist ungefähr gleich geblieben.'}</p>
    <p className="muted mono" style=${{fontSize:'.88rem'}}>${nf1.format(c.earlyPerDay)} → ${nf1.format(c.latePerDay)} Nachrichten pro Tag</p>
    <div style=${{overflowX:'auto'}}><table className="cmp">
      <thead><tr><th>Anteil</th><th>erstes Drittel</th><th>letztes Drittel</th><th>Punkte</th></tr></thead>
      <tbody>${c.persons.slice(0,6).map(p=>html`<tr key=${p.name}><td><i className="dot" style=${{background:pColor(p.idx)}}></i>${p.name}</td><td className="mono">${pct(p.early)}</td><td className="mono">${pct(p.late)}</td><td className="mono">${arrow(p.early,p.late)}</td></tr>`)}</tbody>
    </table></div>
  </div>`;
}

function Highlights({a}){
  const bd = a.busiest.k ? a.busiest.k.split('-').map(Number) : null;
  return html`<div className="panel"><div className="label">Auffällig</div><div className="highlights">
    <div className="hl"><span className="muted">Längste Funkstille</span><b>${fmtDur(a.longest.gap)}</b><span className="muted mono" style=${{fontSize:'.8rem'}}>${fmtDate(a.longest.from)} – ${fmtDate(a.longest.to)}</span></div>
    <div className="hl"><span className="muted">Aktivster Tag</span><b>${bd?new Date(bd[0],bd[1]-1,bd[2]).toLocaleDateString('de-DE',{day:'numeric',month:'long',year:'numeric'}):'–'}</b><span className="muted mono" style=${{fontSize:'.8rem'}}>${nf.format(a.busiest.n)} Nachrichten</span></div>
    <div className="hl"><span className="muted">Lieblingsuhrzeit</span><b>${a.peakHour}:00 – ${a.peakHour+1}:00 Uhr</b><span className="muted mono" style=${{fontSize:'.8rem'}}>${nf.format(a.hours[a.peakHour])} Nachrichten</span></div>
    <div className="hl"><span className="muted">Schickt gern drei hintereinander</span><b>${a.doubleKing.name}</b><span className="muted mono" style=${{fontSize:'.8rem'}}>${nf.format(a.doubleKing.doubles)} Doppelnachrichten</span></div>
  </div></div>`;
}

function AiPanel({a, title, kind, aiState, setAiState, sampleAvail, sampleRef}){
  const [tone,setTone] = useState('ehrlich');
  const ctl = useRef(null);
  const st = aiState || {status:'idle'};
  async function run(){
    const s = sampleRef.current; if (!s) return;
    ctl.current = new AbortController();
    setAiState({status:'loading'});
    try{
      const res = await s.json(buildPrompt(a,tone,title,kind), {signal:ctl.current.signal});
      if (!res || typeof res!=='object' || !res.fazit) throw {code:'invalid_json'};
      setAiState({status:'done', data:res, tone});
    }catch(e){
      const code = e && e.code;
      const msg = {
        cancelled:null,
        not_granted:'Du hast Claude für diese Seite nicht freigegeben. Das KI-Fazit bleibt deshalb aus, die Statistik funktioniert weiter.',
        sampling_disabled:'Claude ist für dieses Konto nicht verfügbar.',
        rate_limited:'Gerade zu viele Anfragen. Versuch es in ein paar Minuten noch einmal.',
        prompt_too_large:'Der Chat ist zu lang für ein Fazit. Lade einen kürzeren Export hoch.',
        invalid_json:'Die Antwort kam in einem unerwarteten Format. Tipp nochmal auf den Knopf.',
        refused:'Claude hat diesen Chat nicht bewertet. Probier einen anderen Ton.'
      };
      const text = code in msg ? msg[code] : 'Verbindung unterbrochen. Tipp nochmal auf den Knopf.';
      setAiState(text ? {status:'error', msg:text, hide: code==='not_granted'||code==='sampling_disabled'} : {status:'idle'});
    }
  }
  if (sampleAvail===false || st.hide) return html`<div className="panel ai">
    <div className="label">KI-Fazit</div>
    <p>${st.hide ? st.msg : 'Das KI-Fazit ist in dieser Version nicht eingerichtet. Alle Zahlen oben funktionieren trotzdem.'}</p>
  </div>`;
  return html`<div className="panel ai" id="fazit">
    <div className="label">Was Chatlupe wirklich denkt</div>
    ${st.status==='done' ? html`
      <p className="ai-title">${st.data.titel}</p>
      <p style=${{fontSize:'1.05rem'}}>${st.data.fazit}</p>
      ${Array.isArray(st.data.personen) && html`<div className="ai-people">${st.data.personen.map((p,i)=>{
        const match = a.persons.find(x=>x.name===p.name);
        return html`<div className="ai-person" key=${i}><b><i className="dot" style=${{background:pColor(match?match.idx:i)}}></i>${p.name} <em>${p.rolle}</em></b><span>${p.urteil}</span></div>`; })}</div>`}
      ${st.data.veraenderung && html`<div><div className="label">Was sich verändert hat</div><p>${st.data.veraenderung}</p></div>`}
      ${st.data.tipp && html`<div><div className="label">Tipp</div><p>${st.data.tipp}</p></div>`}
      <div className="tones">${Object.entries(TONES).map(([k,v])=>html`<button key=${k} className="tone" aria-pressed=${tone===k} onClick=${()=>setTone(k)}>${v.label}</button>`)}
        <button className="btn btn-mark" onClick=${run}>Neu bewerten</button></div>
    ` : st.status==='loading' ? html`
      <div className="thinking"><i></i><i></i><i></i><span>Chatlupe liest mit. Das dauert meist 20 bis 60 Sekunden.</span></div>
      <div><button className="btn btn-ghost" style=${{color:'var(--bg)'}} onClick=${()=>ctl.current&&ctl.current.abort()}>Stopp</button></div>
    ` : html`
      <p>Lass Claude den Chat lesen und dir sagen, wer welche Rolle spielt und was sich verändert hat.</p>
      <div className="tones" role="group" aria-label="Ton wählen">${Object.entries(TONES).map(([k,v])=>html`<button key=${k} className="tone" aria-pressed=${tone===k} onClick=${()=>setTone(k)}>${v.label}</button>`)}</div>
      <div><button className="btn btn-mark" onClick=${run} disabled=${sampleAvail===null}>${sampleAvail===null?'Wird vorbereitet…':'KI-Fazit erstellen'}</button></div>
      ${st.status==='error' && html`<p style=${{color:'var(--mark)'}}>${st.msg}</p>`}
      <p className="muted" style=${{fontSize:'.82rem'}}>Beim Tippen gehen die Statistik und ein Ausschnitt von rund 220 Nachrichten an Claude. Vorher nichts.</p>
    `}
  </div>`;
}

function Report({a, title, tag, kind, isDemo, aiState, setAiState, sampleAvail, sampleRef}){
  const [copied,setCopied] = useState(null);
  async function copy(){
    const txt = summaryText(a,title, aiState&&aiState.status==='done'?aiState.data:null);
    try{ await navigator.clipboard.writeText(txt); setCopied('ok'); setTimeout(()=>setCopied(null),2200); }
    catch(e){ setCopied(txt); }
  }
  return html`<section className="report" id="report" aria-live="polite">
    <div className="rhead">
      <div style=${{display:'flex',gap:8,flexWrap:'wrap'}}>
        ${isDemo && html`<span className="chip example">Beispielchat, frei erfunden</span>`}
        ${tag && html`<span className="chip">${tag}</span>`}
      </div>
      <h2>${title}</h2>
      <div className="facts mono">
        <span>${fmtDate(a.first)} – ${fmtDate(a.last)}</span>
        <span>${nf.format(a.total)} Nachrichten</span>
        <span>${a.persons.length} ${a.persons.length===1?'Person':'Personen'}</span>
        <span>an ${nf.format(a.activeDays)} von ${nf.format(Math.ceil(a.spanDays))} Tagen geschrieben</span>
      </div>
    </div>
    <div className="grid2">
      <${Investment} a=${a}/>
      <${Change} a=${a}/>
    </div>
    <${AiPanel} a=${a} title=${title} kind=${kind} aiState=${aiState} setAiState=${setAiState} sampleAvail=${sampleAvail} sampleRef=${sampleRef}/>
    <${People} a=${a}/>
    <div className="panel">
      <div className="label">Nachrichten pro Monat</div>
      <${MonthChart} a=${a}/>
      <div className="legend">${a.persons.slice(0,6).map(p=>html`<span key=${p.name}><i className="dot" style=${{background:pColor(p.idx)}}></i>${p.name}</span>`)}</div>
    </div>
    <div className="grid2">
      <div className="panel"><div className="label">Wann ihr schreibt</div><${HourChart} a=${a}/></div>
      <${Highlights} a=${a}/>
    </div>
    <div style=${{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
      <button className="btn btn-ink" onClick=${copy}>Zusammenfassung kopieren</button>
      ${copied==='ok' && html`<span className="muted">Kopiert. Ab in die Gruppe damit.</span>`}
    </div>
    ${copied && copied!=='ok' && html`<div><p className="muted">Kopieren ging hier nicht. Markiere den Text und kopiere ihn selbst:</p><pre className="copyfallback">${copied}</pre></div>`}
  </section>`;
}

function KindPicker({onPick}){
  return html`<div className="kinds" role="list">
    ${KINDS.map(k=>html`<button key=${k.id} className="kind" role="listitem" onClick=${()=>onPick(k.id)}>
      <span className="kind-ic" style=${{background:k.color}} aria-hidden="true">${k.icon}</span>
      <span className="kind-tx"><b>${k.label}</b><small>${k.hint} …</small></span>
    </button>`)}
  </div>`;
}

function Upload({onChat}){
  const [kind,setKind] = useState(null);
  const [drag,setDrag] = useState(false);
  const [err,setErr] = useState('');
  const [busy,setBusy] = useState(false);
  const [paste,setPaste] = useState(false);
  const [txt,setTxt] = useState('');
  const inp = useRef(null);
  function titleFrom(name){
    const n = name.replace(/\.(txt|zip)$/i,'');
    const m = n.match(/(?:WhatsApp[- ]Chat (?:mit|with)\s+)(.+)/i);
    return m ? m[1].trim() : (/^_?chat$/i.test(n)?'Dein Chat':n);
  }
  function finish(text, title){
    const msgs = parseChat(text);
    if (msgs.length<5){ setErr('Darin haben wir keine WhatsApp-Nachrichten gefunden. Exportiere den Chat in WhatsApp über „Chat exportieren“ und lade die .zip- oder .txt-Datei hier hoch.'); return; }
    setErr(''); onChat(msgs, title, kind);
  }
  async function handle(file){
    if (!file) return;
    setBusy(true); setErr('');
    try{
      if (/\.zip$/i.test(file.name) || file.type.includes('zip')){
        const zip = await JSZip.loadAsync(file);
        const txts = Object.values(zip.files).filter(f=>!f.dir && /\.txt$/i.test(f.name));
        if (!txts.length) throw new Error('Im ZIP liegt keine .txt-Datei. Exportiere den Chat bitte „Ohne Medien“.');
        txts.sort((x,y)=> (/chat/i.test(y.name)?1:0)-(/chat/i.test(x.name)?1:0));
        const text = await txts[0].async('string');
        finish(text, titleFrom(file.name));
      } else {
        const text = await file.text();
        finish(text, titleFrom(file.name));
      }
    }catch(e){ setErr(e.message || 'Die Datei ließ sich nicht lesen. Versuch es mit der .txt-Datei aus dem Export.'); }
    setBusy(false);
  }
  const k = kindById(kind);
  if (!k) return html`<div className="upload" id="upload">
    <h3 className="kind-q">Was für einen Chat soll Chatlupe lesen?</h3>
    <${KindPicker} onPick=${setKind}/>
  </div>`;
  return html`<div className=${'upload'+(drag?' drag':'')} id="upload"
    onDragOver=${e=>{e.preventDefault();setDrag(true);}} onDragLeave=${()=>setDrag(false)}
    onDrop=${e=>{e.preventDefault();setDrag(false);handle(e.dataTransfer.files[0]);}}>
    <div className="upload-row">
      <div style=${{display:'grid',gap:4,minWidth:0}}>
        <div style=${{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
          <span className="kind-ic sm" style=${{background:k.color}} aria-hidden="true">${k.icon}</span>
          <h3 style=${{fontSize:'1.2rem'}}>${k.label}</h3>
          <button className="linkbtn" onClick=${()=>{setKind(null);setErr('');}}>ändern</button>
        </div>
        <p className="muted">WhatsApp-Export als .zip oder .txt hierher ziehen oder auswählen.</p>
      </div>
      <div style=${{display:'flex',gap:8,flexWrap:'wrap'}}>
        <button className="btn btn-ink" onClick=${()=>inp.current.click()} disabled=${busy}>${busy?'Wird gelesen…':'Datei auswählen'}</button>
        <button className="btn btn-ghost" onClick=${()=>setPaste(!paste)} aria-expanded=${paste}>Text einfügen</button>
      </div>
      <input ref=${inp} id="file" type="file" accept=".txt,.zip,text/plain,application/zip" className="sr" onChange=${e=>{handle(e.target.files[0]); e.target.value='';}}/>
    </div>
    ${paste && html`<div style=${{display:'grid',gap:8}}>
      <label htmlFor="pastebox" className="label">Exportierten Chattext einfügen</label>
      <textarea id="pastebox" value=${txt} onInput=${e=>setTxt(e.target.value)} placeholder="17.10.26, 21:04 - Lea: Bist du heute Abend da?"></textarea>
      <div><button className="btn btn-mark" onClick=${()=>finish(txt,'Dein Chat')} disabled=${!txt.trim()}>Analysieren</button></div>
    </div>`}
    ${err && html`<p className="err" role="alert">${err}</p>`}
    <p className="privacy">Die Auswertung läuft komplett in deinem Browser. Deine Datei wird nirgends hochgeladen oder gespeichert. Nur wenn du ein KI-Fazit anforderst, gehen Statistik und ein Ausschnitt an Claude.</p>
  </div>`;
}

function App(){
  const demos = useMemo(()=>SCENARIOS.map(sc=>({...sc, analysis: analyze(makeDemo(sc))})),[]);
  const [sel,setSel] = useState({kind:'demo', id:'lea-tim'});
  const [own,setOwn] = useState(null);
  const [ai,setAi] = useState({});
  const [sampleAvail,setSampleAvail] = useState(null);
  const sampleRef = useRef(null);
  useEffect(()=>{ let alive=true; (async()=>{
    let s=null; try{ s = await getAi(); }catch(e){ s=null; }
    if(!alive) return; sampleRef.current=s; setSampleAvail(!!s);
  })(); return ()=>{alive=false}; },[]);

  const cur = sel.kind==='own' && own ? {title:own.title, tag:(kindById(own.kind)||{}).label||null, kind:own.kind, analysis:own.analysis, isDemo:false, key:'own'+own.stamp}
    : (()=>{ const d=demos.find(x=>x.id===sel.id); return {title:d.title, tag:d.tag, kind:DEMO_KIND[d.id], analysis:d.analysis, isDemo:true, key:d.id}; })();

  function onChat(msgs,title,kind){
    setOwn({title, kind, analysis:analyze(msgs), stamp:Date.now()});
    setSel({kind:'own'});
    setTimeout(()=>{ const el=document.getElementById('report'); el && el.scrollIntoView({behavior:'smooth',block:'start'}); },60);
  }
  const avColors = ['var(--p1)','var(--p2)','var(--p4)'];

  return html`<div className="wrap">
    <header className="top">
      <a className="brand" href="#top"><${Logo}/>Chatlupe</a>
      <a className="btn btn-ink" href="#upload">Jetzt ausprobieren</a>
    </header>
    <section className="hero" id="top">
      <h1>Lad deinen Chat hoch. Wir zeigen dir, <span className="mark">was da wirklich läuft.</span></h1>
      <p className="lead">Chatlupe liest deinen WhatsApp-Export und zeigt, wer mehr schreibt, wer sich zuerst meldet, wer auf sich warten lässt und wie sich alles über die Monate verändert hat.</p>
      <div className="demos" role="group" aria-label="Beispielchats">
        <span className="label" style=${{marginRight:4}}>Beispiele</span>
        ${demos.map((d,i)=>html`<button key=${d.id} className="demo" aria-pressed=${sel.kind==='demo'&&sel.id===d.id} onClick=${()=>setSel({kind:'demo',id:d.id})}>
          <span className="av" style=${{background:avColors[i%3]}}>${d.initials}</span>
          <span><b>${d.title}</b><small>${d.tag}</small></span></button>`)}
        ${own && html`<button className="demo" aria-pressed=${sel.kind==='own'} onClick=${()=>setSel({kind:'own'})}>
          <span className="av" style=${{background:'var(--p0)'}}>★</span><span><b>${own.title}</b><small>Dein Chat</small></span></button>`}
      </div>
    </section>

    <${Upload} onChat=${onChat}/>

    <${Report} key=${cur.key} a=${cur.analysis} title=${cur.title} tag=${cur.tag} kind=${cur.kind} isDemo=${cur.isDemo}
      aiState=${ai[cur.key]} setAiState=${v=>setAi(o=>({...o,[cur.key]:v}))} sampleAvail=${sampleAvail} sampleRef=${sampleRef}/>

    <section className="block" id="export">
      <h2>So exportierst du einen WhatsApp-Chat</h2>
      <ol className="steps">
        <li><b>Chat öffnen</b><span className="muted">Den Einzel- oder Gruppenchat, den du analysieren willst.</span></li>
        <li><b>Menü aufrufen</b><span className="muted">iPhone: oben auf den Namen tippen. Android: ⋮ oben rechts, dann „Mehr“.</span></li>
        <li><b>„Chat exportieren“</b><span className="muted">„Ohne Medien“ wählen. Das reicht und geht schneller.</span></li>
        <li><b>Hier hochladen</b><span className="muted">Die .zip-Datei in „Dateien“ sichern oder dir selbst schicken, dann oben auswählen.</span></li>
      </ol>
      <p className="muted" style=${{fontSize:'.9rem'}}>Aktuell versteht Chatlupe WhatsApp-Exporte von iPhone und Android, auf Deutsch und Englisch.</p>
    </section>

    <section className="block">
      <h2>Dein Chat ist der nächste.</h2>
      <div><a className="btn btn-mark" href="#upload">Jetzt Chat hochladen</a></div>
    </section>

    <footer>
      <span><b style=${{color:'var(--ink)'}}>Chatlupe</b> · Statistik im Browser, Fazit von Claude</span>
      <span>Die Beispielchats und alle Namen darin sind erfunden.</span>
    </footer>
  </div>`;
}

createRoot(document.getElementById('root')).render(html`<${App}/>`);
