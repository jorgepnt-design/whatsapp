import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import htm from 'htm';
import JSZip from 'jszip';
import './styles.css';
import './kinds.css';
import { parseChat, MEDIA_RE, DELETED_RE } from './parser.js';
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

const STEPS = [
  { t:'Was für ein Chat?', s:'Damit Chatlupe Rollen und Dynamik richtig deutet.' },
  { t:'Chat exportieren', s:'So holst du den Verlauf aus WhatsApp. Dauert eine Minute.' },
  { t:'Chat hochladen', s:'Die Datei bleibt in deinem Browser.' },
  { t:'Wer ist dabei?', s:'Gib dem Chat einen Namen und sag, wer hinter den Nummern steckt.' },
  { t:'Wer investiert mehr?', s:null },
  { t:'Verlauf', s:'Wie sich euer Chat über die Zeit entwickelt hat.' },
  { t:'Was Chatlupe denkt', s:'Zum Schluss das Fazit. Und eine Zusammenfassung für die Gruppe.' }
];
const isPhone = s => /^\+?[\d\s\-()\/.]+$/.test(s) && (s.match(/\d/g)||[]).length>=7;

function ArrowLeft(){
  return html`<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function Bubble(){
  return html`<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className="bubble"><path d="M12 3.5c-4.97 0-9 3.36-9 7.5 0 2.1 1.04 4 2.72 5.36L5 20.5l4.1-2.05c.92.23 1.9.35 2.9.35 4.97 0 9-3.36 9-7.5s-4.03-7.8-9-7.8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
}
function Pencil(){
  return html`<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
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

function KindPicker({onPick, selected}){
  return html`<div className="kinds" role="list">
    ${KINDS.map(k=>html`<button key=${k.id} className="kind" role="listitem" aria-pressed=${selected===k.id} onClick=${()=>onPick(k.id)}>
      <span className="kind-ic" style=${{background:k.color}} aria-hidden="true">${k.icon}</span>
      <span className="kind-tx"><b>${k.label}</b><small>${k.hint} …</small></span>
    </button>`)}
  </div>`;
}

function ExportGuide(){
  return html`<ol className="steps">
    <li><b>Chat öffnen</b><span className="muted">Den Einzel- oder Gruppenchat, den du analysieren willst.</span></li>
    <li><b>Menü aufrufen</b><span className="muted">iPhone: oben auf den Namen tippen. Android: ⋮ oben rechts, dann „Mehr“.</span></li>
    <li><b>„Chat exportieren“</b><span className="muted">„Ohne Medien“ wählen. Das reicht und geht schneller.</span></li>
    <li><b>Datei sichern</b><span className="muted">Die .zip-Datei in „Dateien“ speichern oder dir selbst schicken. Im nächsten Schritt lädst du sie hoch.</span></li>
  </ol>`;
}

function titleFrom(name){
  const n = name.replace(/\.(txt|zip)$/i,'');
  const m = n.match(/(?:WhatsApp[- ]Chat (?:mit|with)\s+)(.+)/i);
  return m ? m[1].trim() : (/^_?chat$/i.test(n)?'':n);
}

function UploadStep({onChat, chat, demos, onDemo}){
  const [drag,setDrag] = useState(false);
  const [err,setErr] = useState('');
  const [busy,setBusy] = useState(false);
  const [paste,setPaste] = useState(false);
  const [txt,setTxt] = useState('');
  const inp = useRef(null);
  function finish(text, title){
    const msgs = parseChat(text);
    if (msgs.length<5){ setErr('Darin haben wir keine WhatsApp-Nachrichten gefunden. Exportiere den Chat in WhatsApp über „Chat exportieren“ und lade die .zip- oder .txt-Datei hier hoch.'); return; }
    setErr(''); onChat(msgs, title);
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
        finish(await txts[0].async('string'), titleFrom(file.name));
      } else {
        finish(await file.text(), titleFrom(file.name));
      }
    }catch(e){ setErr(e.message || 'Die Datei ließ sich nicht lesen. Versuch es mit der .txt-Datei aus dem Export.'); }
    setBusy(false);
  }
  return html`<div style=${{display:'grid',gap:18}}>
    <div className=${'upload'+(drag?' drag':'')} id="upload"
      onDragOver=${e=>{e.preventDefault();setDrag(true);}} onDragLeave=${()=>setDrag(false)}
      onDrop=${e=>{e.preventDefault();setDrag(false);handle(e.dataTransfer.files[0]);}}>
      <p className="muted">WhatsApp-Export als .zip oder .txt hierher ziehen oder auswählen.</p>
      <div style=${{display:'flex',gap:8,flexWrap:'wrap'}}>
        <button className="btn btn-ink" onClick=${()=>inp.current.click()} disabled=${busy}>${busy?'Wird gelesen…':'Datei auswählen'}</button>
        <button className="btn btn-ghost" onClick=${()=>setPaste(!paste)} aria-expanded=${paste}>Text einfügen</button>
      </div>
      <input ref=${inp} id="file" type="file" accept=".txt,.zip,text/plain,application/zip" className="sr" onChange=${e=>{handle(e.target.files[0]); e.target.value='';}}/>
      ${paste && html`<div style=${{display:'grid',gap:8}}>
        <label htmlFor="pastebox" className="label">Exportierten Chattext einfügen</label>
        <textarea id="pastebox" value=${txt} onInput=${e=>setTxt(e.target.value)} placeholder="17.10.26, 21:04 - Lea: Bist du heute Abend da?"></textarea>
        <div><button className="btn btn-mark" onClick=${()=>finish(txt,'')} disabled=${!txt.trim()}>Einlesen</button></div>
      </div>`}
      ${err && html`<p className="err" role="alert">${err}</p>`}
      ${chat && !err && html`<p className="ok-line">Geladen: <b>${chat.title || 'Dein Chat'}</b> · ${nf.format(chat.msgs.length)} Nachrichten${chat.isDemo?' (Beispiel)':''}</p>`}
      <p className="privacy">Die Auswertung läuft komplett in deinem Browser. Deine Datei wird nirgends hochgeladen oder gespeichert. Nur wenn du am Ende ein KI-Fazit anforderst, gehen Statistik und ein Ausschnitt an Claude.</p>
    </div>
    <div className="demos" role="group" aria-label="Beispielchats">
      <span className="label" style=${{marginRight:4}}>Kein Export zur Hand? Beispiel nehmen</span>
      ${demos.map((d,i)=>html`<${DemoButton} key=${d.id} d=${d} i=${i} onClick=${()=>onDemo(d)} pressed=${!!(chat&&chat.demoId===d.id)}/>`)}
    </div>
  </div>`;
}

const AV_COLORS = ['var(--p1)','var(--p2)','var(--p4)'];
function DemoButton({d, i, onClick, pressed}){
  return html`<button className="demo" aria-pressed=${pressed} onClick=${onClick}>
    <span className="av" style=${{background:AV_COLORS[i%3]}}>${d.initials}</span>
    <span><b>${d.title}</b><small>${d.tag}</small></span></button>`;
}

function Participants({msgs, aliases, setAlias}){
  const rows = useMemo(()=>{
    const c = new Map(); for (const m of msgs) c.set(m.name,(c.get(m.name)||0)+1);
    return [...c].sort((a,b)=>b[1]-a[1]).map(([name,count],idx)=>({name,count,idx}));
  },[msgs]);
  const [open,setOpen] = useState(null);
  const [draft,setDraft] = useState('');
  const [all,setAll] = useState(false);
  const total = msgs.length, max = rows.length ? rows[0].count : 1;
  const shown = all ? rows : rows.slice(0,30);
  const samples = n => msgs.filter(m=>m.name===n && !MEDIA_RE.test(m.text) && !DELETED_RE.test(m.text) && m.text.length>12)
    .slice(-80).map(m=>m.text.replace(/\n/g,' ').slice(0,140)).filter((t,i,arr)=>arr.indexOf(t)===i).sort((a,b)=>b.length-a.length).slice(0,3);
  function edit(r){ setOpen(r.name); setDraft(aliases[r.name]||''); }
  return html`<div style=${{display:'grid',gap:10}}>
    <ul className="plist">${shown.map(r=>{
      const alias = aliases[r.name], phone = isPhone(r.name), editing = open===r.name;
      const ex = editing ? samples(r.name) : [];
      return html`<li className="prow" key=${r.name}>
        <div className="prow-top">
          <span className="pname"><i className="pdot" style=${{background:pColor(r.idx)}}></i><span>${alias||r.name}${alias && html` <span className="muted orig">${r.name}</span>`}</span></span>
          <span className="pnum mono"><span>${nf.format(r.count)}</span><${Bubble}/><span className="ppct">${pct(r.count/total)}</span></span>
        </div>
        <div className="ptrack" aria-hidden="true"><span style=${{width:Math.max(3,r.count/max*100)+'%',background:pColor(r.idx)}}></span></div>
        ${!editing && (phone || alias) && html`<button className="whois" onClick=${()=>edit(r)}>${alias?'Name ändern':'Wer ist das?'} <span aria-hidden="true">→</span></button>`}
        ${editing && html`<form className="whois-form" onSubmit=${e=>{e.preventDefault(); setAlias(r.name, draft.trim()); setOpen(null);}}>
          <label className="label" htmlFor=${'alias-'+r.idx}>Wer steckt hinter ${r.name}?</label>
          <div className="whois-row">
            <input id=${'alias-'+r.idx} className="field" autoFocus value=${draft} onInput=${e=>setDraft(e.target.value)} placeholder="Name eingeben" maxLength="40"/>
            <button className="btn btn-ink" type="submit">Speichern</button>
            <button className="linkbtn" type="button" onClick=${()=>setOpen(null)}>Abbrechen</button>
          </div>
          ${ex.length ? html`<div className="samples"><span className="label">Schreibt zum Beispiel</span>${ex.map((s,i)=>html`<q key=${i}>${s}</q>`)}</div>` : null}
        </form>`}
      </li>`; })}
    </ul>
    ${rows.length>30 && html`<div><button className="linkbtn" onClick=${()=>setAll(!all)}>${all?'Weniger anzeigen':`Alle ${rows.length} anzeigen`}</button></div>`}
    <p className="muted" style=${{fontSize:'.85rem'}}>Namen, die du hier vergibst, bleiben in deinem Browser und gelten für die ganze Auswertung. Gibst du zwei Einträgen denselben Namen, werden sie zusammengelegt.</p>
  </div>`;
}

function Facts({a}){
  return html`<div className="facts mono">
    <span>${fmtDate(a.first)} – ${fmtDate(a.last)}</span>
    <span>${nf.format(a.total)} Nachrichten</span>
    <span>${a.persons.length} ${a.persons.length===1?'Person':'Personen'}</span>
    <span>an ${nf.format(a.activeDays)} von ${nf.format(Math.ceil(a.spanDays))} Tagen geschrieben</span>
  </div>`;
}

function Finish({a, title, kind, aiState, setAiState, sampleAvail, sampleRef}){
  const [copied,setCopied] = useState(null);
  async function copy(){
    const txt = summaryText(a,title, aiState&&aiState.status==='done'?aiState.data:null);
    try{ await navigator.clipboard.writeText(txt); setCopied('ok'); setTimeout(()=>setCopied(null),2200); }
    catch(e){ setCopied(txt); }
  }
  return html`<div style=${{display:'grid',gap:18}}>
    <${AiPanel} a=${a} title=${title} kind=${kind} aiState=${aiState} setAiState=${setAiState} sampleAvail=${sampleAvail} sampleRef=${sampleRef}/>
    <div style=${{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
      <button className="btn btn-ink" onClick=${copy}>Zusammenfassung kopieren</button>
      ${copied==='ok' && html`<span className="muted">Kopiert. Ab in die Gruppe damit.</span>`}
    </div>
    ${copied && copied!=='ok' && html`<div><p className="muted">Kopieren ging hier nicht. Markiere den Text und kopiere ihn selbst:</p><pre className="copyfallback">${copied}</pre></div>`}
  </div>`;
}

function Home({onStart, demos, onDemo}){
  return html`<div className="wrap">
    <header className="top">
      <a className="brand" href="#top"><${Logo}/>Chatlupe</a>
      <button className="btn btn-ink" onClick=${onStart}>Jetzt starten</button>
    </header>
    <section className="hero" id="top">
      <h1>Lad deinen Chat hoch. Wir zeigen dir, <span className="mark">was da wirklich läuft.</span></h1>
      <p className="lead">Chatlupe liest deinen WhatsApp-Export und zeigt, wer mehr schreibt, wer sich zuerst meldet, wer auf sich warten lässt und wie sich alles über die Monate verändert hat.</p>
      <div><button className="btn btn-mark btn-lg" onClick=${onStart}>Chat auswerten</button></div>
      <div className="demos" role="group" aria-label="Beispielchats">
        <span className="label" style=${{marginRight:4}}>Oder Beispiel ansehen</span>
        ${demos.map((d,i)=>html`<${DemoButton} key=${d.id} d=${d} i=${i} onClick=${()=>onDemo(d)} pressed=${false}/>`)}
      </div>
    </section>
    <section className="block">
      <h2>In 7 Schritten zum Fazit</h2>
      <ol className="steps mini">${STEPS.map(s=>html`<li key=${s.t}><b>${s.t}</b></li>`)}</ol>
      <p className="privacy">Die Auswertung läuft komplett in deinem Browser. Nur wenn du am Ende ein KI-Fazit anforderst, gehen Statistik und ein Ausschnitt von rund 220 Nachrichten an Claude.</p>
    </section>
    <footer>
      <span><b style=${{color:'var(--ink)'}}>Chatlupe</b> · Statistik im Browser, Fazit von Claude</span>
      <span>Die Beispielchats und alle Namen darin sind erfunden.</span>
    </footer>
  </div>`;
}

function App(){
  const demos = useMemo(()=>SCENARIOS.map(sc=>({...sc, msgs: makeDemo(sc)})),[]);
  const [view,setView] = useState('home');
  const [step,setStep] = useState(1);
  const [kind,setKind] = useState(null);
  const [chat,setChat] = useState(null);
  const [aliases,setAliases] = useState({});
  const [name,setName] = useState('');
  const [ai,setAi] = useState(null);
  const [sampleAvail,setSampleAvail] = useState(null);
  const sampleRef = useRef(null);
  useEffect(()=>{ let alive=true; (async()=>{
    let s=null; try{ s = await getAi(); }catch(e){ s=null; }
    if(!alive) return; sampleRef.current=s; setSampleAvail(!!s);
  })(); return ()=>{alive=false}; },[]);
  useEffect(()=>{ window.scrollTo(0,0); },[step,view]);

  const msgs = useMemo(()=> chat ? chat.msgs.map(m=> aliases[m.name] ? {...m, name:aliases[m.name]} : m) : null, [chat,aliases]);
  const a = useMemo(()=> msgs && msgs.length ? analyze(msgs) : null, [msgs]);
  useEffect(()=>{ setAi(null); },[chat,aliases,kind]);
  const title = name.trim() || (chat && chat.title) || 'Dein Chat';

  function start(){ setView('flow'); setStep(1); }
  function loadChat(m, t){ setChat({msgs:m, title:t, isDemo:false, stamp:Date.now()}); setAliases({}); setName(t); setStep(4); }
  function openDemo(d){
    setChat({msgs:d.msgs, title:d.title, tag:d.tag, isDemo:true, demoId:d.id, stamp:Date.now()});
    setAliases({}); setName(d.title); setKind(k=>k||DEMO_KIND[d.id]); setView('flow'); setStep(4);
  }
  function setAlias(orig, val){ setAliases(o=>{ const n={...o}; if (val && val!==orig) n[orig]=val; else delete n[orig]; return n; }); }
  function back(){ if (step>1) setStep(step-1); else setView('home'); }
  function restart(){ setChat(null); setAliases({}); setName(''); setKind(null); setStep(1); }

  if (view==='home') return html`<${Home} onStart=${start} demos=${demos} onDemo=${openDemo}/>`;

  const cur = Math.min(step, a ? 7 : 3);
  const meta = STEPS[cur-1];
  const k = kindById(kind);
  let body, next = null;
  if (cur===1){
    body = html`<${KindPicker} selected=${kind} onPick=${id=>{ setKind(id); setStep(2); }}/>`;
    if (kind) next = {label:'Weiter', go:2};
  } else if (cur===2){
    body = html`<${ExportGuide}/>`;
    next = {label:'Weiter', go:3};
  } else if (cur===3){
    body = html`<${UploadStep} onChat=${loadChat} chat=${chat} demos=${demos} onDemo=${openDemo}/>`;
    if (chat) next = {label:'Weiter', go:4};
  } else if (cur===4){
    body = html`<div style=${{display:'grid',gap:22}}>
      <label className="namefield">
        <span className="sr">Name des Chats</span>
        <input value=${name} onInput=${e=>setName(e.target.value)} placeholder=${a.persons.length>2?'Name der Gruppe …':'Name des Chats …'} maxLength="60"/>
        <${Pencil}/>
      </label>
      <${Participants} msgs=${chat.msgs} aliases=${aliases} setAlias=${setAlias}/>
    </div>`;
    next = {label:'Auswerten', go:5};
  } else if (cur===5){
    body = html`<div style=${{display:'grid',gap:18}}>
      <${Facts} a=${a}/>
      <${Investment} a=${a}/>
      <${People} a=${a}/>
    </div>`;
    next = {label:'Weiter', go:6};
  } else if (cur===6){
    body = html`<div style=${{display:'grid',gap:18}}>
      <${Change} a=${a}/>
      <div className="panel">
        <div className="label">Nachrichten pro Monat</div>
        <${MonthChart} a=${a}/>
        <div className="legend">${a.persons.slice(0,6).map(p=>html`<span key=${p.name}><i className="dot" style=${{background:pColor(p.idx)}}></i>${p.name}</span>`)}</div>
      </div>
      <div className="grid2">
        <div className="panel"><div className="label">Wann ihr schreibt</div><${HourChart} a=${a}/></div>
        <${Highlights} a=${a}/>
      </div>
    </div>`;
    next = {label:'Zum Fazit', go:7};
  } else {
    body = html`<${Finish} a=${a} title=${title} kind=${kind} aiState=${ai} setAiState=${setAi} sampleAvail=${sampleAvail} sampleRef=${sampleRef}/>`;
  }

  return html`<div className="flow">
    <div className="flowbar"><div className=${'flowbar-in'+(cur>=5?' wide':'')}>
      <button className="iconbtn" aria-label=${cur===1?'Zur Startseite':'Zurück'} onClick=${back}><${ArrowLeft}/></button>
      <div className="progress" role="progressbar" aria-label="Fortschritt" aria-valuemin="1" aria-valuemax="7" aria-valuenow=${cur}><span style=${{width:(cur/7*100)+'%'}}></span></div>
      <span className="stepcount">${cur} von 7</span>
    </div></div>
    <main className=${'flow-body'+(cur>=5?' wide':'')}>
      <div className="step-head">
        ${cur>=4 && html`<div style=${{display:'flex',gap:8,flexWrap:'wrap'}}>
          ${chat.isDemo && html`<span className="chip example">Beispielchat, frei erfunden</span>`}
          ${k && html`<span className="chip">${k.icon} ${k.label}</span>`}
        </div>`}
        <h2>${cur>=5 ? (cur===5 ? title : meta.t) : meta.t}</h2>
        ${cur===5 ? html`<p className="muted">Wer schreibt, wer meldet sich zuerst, wer lässt auf sich warten.</p>` : meta.s && html`<p className="muted">${meta.s}</p>`}
      </div>
      ${body}
      <div className="flow-nav">
        ${next && html`<button className="btn btn-mark btn-lg" onClick=${()=>setStep(next.go)}>${next.label} <span aria-hidden="true">→</span></button>`}
        ${cur===7 && html`<button className="btn btn-ink" onClick=${restart}>Neuen Chat auswerten</button>`}
        ${cur===7 && html`<button className="btn btn-ghost" onClick=${()=>setView('home')}>Zur Startseite</button>`}
      </div>
    </main>
  </div>`;
}

createRoot(document.getElementById('root')).render(html`<${App}/>`);
