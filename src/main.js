import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import htm from 'htm';
import JSZip from 'jszip';
import '@fontsource/unbounded/500.css';
import '@fontsource/unbounded/700.css';
import '@fontsource/figtree/400.css';
import '@fontsource/figtree/500.css';
import '@fontsource/figtree/600.css';
import '@fontsource/figtree/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/fraunces/500.css';
import '@fontsource/fraunces/600.css';
import './styles.css';
import './kinds.css';
import { parseChat, MEDIA_RE, DELETED_RE } from './parser.js';
import { analyze, DAY } from './analysis.js';
import { nf, nf1, pct, MONTHS, fmtDate, fmtDur, pColor } from './format.js';
import { SCENARIOS, makeDemo } from './demos.js';
import { TONES, buildPrompt } from './prompt.js';
import { getAi } from './ai.js';
import { KINDS, kindById } from './kinds.js';
import { LegalPage, LegalLinks, LEGAL_PAGES } from './legal.js';
import { JUNK_RE, dayNum, fmtLong, isMedia, longestStreak, topWords, topEmojis } from './extra.js';

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

const AI_ERRORS = {
  cancelled:null,
  not_granted:'Du hast Claude für diese Seite nicht freigegeben. Das KI-Fazit bleibt deshalb aus, die Statistik funktioniert weiter.',
  sampling_disabled:'Claude ist für dieses Konto nicht verfügbar.',
  rate_limited:'Gerade zu viele Anfragen. Versuch es in ein paar Minuten noch einmal.',
  prompt_too_large:'Der Chat ist zu lang für ein Fazit. Lade einen kürzeren Export hoch.',
  invalid_json:'Die Antwort kam in einem unerwarteten Format. Tipp nochmal auf den Knopf.',
  refused:'Claude hat diesen Chat nicht bewertet. Probier einen anderen Ton.'
};

function ToneButtons({tone, setTone}){
  return html`<div className="tones" role="group" aria-label="Ton wählen">${Object.entries(TONES).map(([k,v])=>html`<button key=${k} className="tone" aria-pressed=${tone===k} onClick=${()=>setTone(k)}>${v.label}</button>`)}</div>`;
}

const STEPS = [
  { t:'Was für ein Chat?', s:'Damit Chatlupe Rollen und Dynamik richtig deutet.' },
  { t:'Chat exportieren', s:'So holst du den Verlauf aus WhatsApp. Dauert eine Minute.' },
  { t:'Chat hochladen', s:'Die Datei bleibt in deinem Browser.' },
  { t:'Wer ist dabei?', s:'Gib dem Chat einen Namen. So verteilen sich die Nachrichten.' },
  { t:'Namen aufräumen', s:'Ersetze Nummern, Spitznamen und Emojis durch Vornamen, damit Chatlupe weiß, wer wer ist.' },
  { t:'In welcher Sprache soll dein Report sein?', s:'Muss nicht die Sprache deines Chats sein.' },
  { t:'Report erstellen', s:'Noch ein Blick auf alles, dann geht es los.' }
];
const LANGS = [
  {c:'DE',n:'Deutsch'},{c:'GB',n:'Englisch'},{c:'ES',n:'Spanisch'},
  {c:'FR',n:'Französisch'},{c:'IT',n:'Italienisch'},{c:'BR',n:'Portugiesisch (Brasilien)'},
  {c:'PT',n:'Portugiesisch (Portugal)'},{c:'NL',n:'Niederländisch'},{c:'PL',n:'Polnisch'},
  {c:'TR',n:'Türkisch'},{c:'SA',n:'Arabisch'},{c:'UA',n:'Ukrainisch'}
];
const isPhone = s => /^\+?[\d\s\-()\/.]+$/.test(s) && (s.match(/\d/g)||[]).length>=7;
const cleanAlias = v => (v||'').trim();

function ArrowLeft(){
  return html`<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function Bubble(){
  return html`<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5c-4.97 0-9 3.36-9 7.5 0 2.1 1.04 4 2.72 5.36L5 20.5l4.1-2.05c.92.23 1.9.35 2.9.35 4.97 0 9-3.36 9-7.5s-4.03-7.8-9-7.8z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
}
function Pencil(){
  return html`<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
}
function PersonIcon(){
  return html`<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="3.6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 20c.8-3.6 3.6-5.6 7-5.6s6.2 2 7 5.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
}
function Sparkle(){
  return html`<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" fill="currentColor"/></svg>`;
}
function Globe(){
  return html`<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9S14.6 18.4 12 21c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>`;
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
      <p className="privacy">Die Auswertung läuft komplett in deinem Browser. Deine Datei wird nirgends hochgeladen oder gespeichert. Nur wenn du am Ende den Report mit KI-Fazit erstellst, gehen Statistik und ein Ausschnitt an Claude. Lade nur Chats hoch, an denen du selbst teilgenommen hast. <a href="#datenschutz">Datenschutz</a></p>
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

function useRows(msgs){
  return useMemo(()=>{
    const c = new Map(); for (const m of msgs) c.set(m.name,(c.get(m.name)||0)+1);
    return [...c].sort((a,b)=>b[1]-a[1]).map(([name,count],idx)=>({name,count,idx}));
  },[msgs]);
}

function Participants({rows, total, aliases, onWho}){
  const [all,setAll] = useState(false);
  const max = rows.length ? rows[0].count : 1;
  const shown = all ? rows : rows.slice(0,30);
  return html`<div style=${{display:'grid',gap:10}}>
    <ul className="plist">${shown.map(r=>{
      const alias = cleanAlias(aliases[r.name]);
      return html`<li className="prow" key=${r.name}>
        <div className="prow-top">
          <span className="pname"><i className="pdot" style=${{background:pColor(r.idx)}}></i><span>${alias||r.name}${alias && html` <span className="muted orig">${r.name}</span>`}</span></span>
          <span className="pnum mono"><span>${nf.format(r.count)}</span><${Bubble}/><span className="ppct">${pct(r.count/total)}</span></span>
        </div>
        <div className="ptrack" aria-hidden="true"><span style=${{width:Math.max(3,r.count/max*100)+'%',background:pColor(r.idx)}}></span></div>
        ${isPhone(r.name) && !alias && html`<button className="whois" onClick=${()=>onWho(r.name)}>Wer ist das? <span aria-hidden="true">→</span></button>`}
      </li>`; })}
    </ul>
    ${rows.length>30 && html`<div><button className="linkbtn" onClick=${()=>setAll(!all)}>${all?'Weniger anzeigen':`Alle ${rows.length} anzeigen`}</button></div>`}
  </div>`;
}

function NameCleanup({rows, msgs, aliases, setAlias, focus, excluded, setExcluded}){
  const [all,setAll] = useState(false);
  const focusIdx = focus ? rows.findIndex(r=>r.name===focus) : -1;
  const shown = (all || focusIdx>=60) ? rows : rows.slice(0,60);
  const sample = n => { const m = msgs.filter(x=>x.name===n && !MEDIA_RE.test(x.text) && !DELETED_RE.test(x.text) && x.text.length>12).slice(-40).sort((a,b)=>b.text.length-a.text.length)[0]; return m ? m.text.replace(/\n/g,' ').slice(0,110) : null; };
  const included = rows.filter(r=>!excluded[r.name]).length;
  const toggle = n => setExcluded(o=>{ const x = {...o}; if (x[n]) delete x[n]; else x[n] = true; return x; });
  return html`<div style=${{display:'grid',gap:10}}>
    <div className="pick-bar">
      <span className="muted small">${included} von ${rows.length} im Bericht</span>
      ${rows.length>2 && html`<span className="pick-all"><button className="linkbtn" onClick=${()=>setExcluded({})}>Alle</button><button className="linkbtn" onClick=${()=>setExcluded(Object.fromEntries(rows.map(r=>[r.name,true])))}>Keine</button></span>`}
    </div>
    <ul className="nlist">${shown.map(r=>{
      const phone = isPhone(r.name), alias = aliases[r.name], shownName = cleanAlias(alias) || (phone ? '' : r.name);
      const id = 'name-'+r.idx, off = !!excluded[r.name];
      const ex = phone && !cleanAlias(alias) && !off ? sample(r.name) : null;
      return html`<li className=${'nrow'+(off?' off':'')} key=${r.name}>
        <span className="avatar" style=${{background:pColor(r.idx)}} aria-hidden="true">${shownName ? [...shownName][0].toUpperCase() : html`<${PersonIcon}/>`}</span>
        <div className="nfield">
          <label className="sr" htmlFor=${id}>Name für ${r.name}</label>
          <input id=${id} className="field" value=${alias!=null ? alias : (phone?'':r.name)} placeholder=${phone?'Vorname':r.name} maxLength="40" autoFocus=${focus===r.name}
            disabled=${off} onInput=${e=>setAlias(r.name, e.target.value)}/>
          ${(phone || (cleanAlias(alias) && cleanAlias(alias)!==r.name)) && html`<small className="muted">${r.name}${ex ? html` · <q>${ex}</q>` : null}</small>`}
        </div>
        <label className="incl" title=${off ? 'Nicht im Bericht' : 'Im Bericht'}>
          <input type="checkbox" checked=${!off} onChange=${()=>toggle(r.name)} aria-label=${`${shownName || r.name} im Bericht`}/>
          <span className="incl-track" aria-hidden="true"></span>
        </label>
      </li>`; })}
    </ul>
    ${rows.length>60 && html`<div><button className="linkbtn" onClick=${()=>setAll(!all)}>${all?'Weniger anzeigen':`Alle ${rows.length} anzeigen`}</button></div>`}
    ${included===0 && html`<p className="err">Wähle mindestens eine Person für den Bericht aus.</p>`}
    <p className="muted" style=${{fontSize:'.85rem'}}>Mit dem Schalter rechts entscheidest du, wer in den Bericht kommt. Ausgeschaltete Personen und ihre Nachrichten zählen weder in der Statistik noch im Report oder PDF. Die Namen bleiben in deinem Browser. Gibst du zwei Einträgen denselben Namen, werden sie zusammengelegt.</p>
  </div>`;
}

function LangPicker({lang, setLang, onDone}){
  const known = LANGS.some(l=>l.n===lang);
  const [other,setOther] = useState(!known && !!lang);
  const [txt,setTxt] = useState(known ? '' : (lang||''));
  return html`<div style=${{display:'grid',gap:12}}>
    <div className="langs">
      ${LANGS.map(l=>html`<button key=${l.c} className="lang" aria-pressed=${lang===l.n} onClick=${()=>{ setLang(l.n); setOther(false); onDone(); }}>
        <span className="lang-c mono">${l.c}</span><span>${l.n}</span></button>`)}
      <button className="lang lang-other" aria-pressed=${other} onClick=${()=>setOther(true)}><span className="lang-c"><${Globe}/></span><span>Andere</span></button>
    </div>
    ${other && html`<form className="whois-row" onSubmit=${e=>{e.preventDefault(); if (txt.trim()){ setLang(txt.trim()); onDone(); }}}>
      <label className="sr" htmlFor="lang-other">Andere Sprache</label>
      <input id="lang-other" className="field" autoFocus value=${txt} onInput=${e=>setTxt(e.target.value)} placeholder="z. B. Schwedisch" maxLength="30"/>
      <button className="btn btn-ink" type="submit" disabled=${!txt.trim()}>Übernehmen</button>
    </form>`}
  </div>`;
}

function CreateStep({title, a, kind, lang, tone, setTone, sampleAvail, onCreate}){
  const k = kindById(kind);
  return html`<div style=${{display:'grid',gap:20}}>
    <div className="summary-card">
      <div><span className="muted">Chat</span><b>${title}</b></div>
      <div><span className="muted">Umfang</span><b>${nf.format(a.total)} Nachrichten · ${a.persons.length} ${a.persons.length===1?'Person':'Personen'}</b></div>
      ${k && html`<div><span className="muted">Art</span><b>${k.icon} ${k.label}</b></div>`}
      <div><span className="muted">Sprache</span><b>${lang}</b></div>
    </div>
    ${sampleAvail!==false && html`<div style=${{display:'grid',gap:8}}>
      <div className="label">Wie soll Chatlupe klingen?</div>
      <div className="tones light"><${ToneButtons} tone=${tone} setTone=${setTone}/></div>
    </div>`}
    <div className="create-wrap"><button className="btn-create" onClick=${onCreate}><${Sparkle}/> Meinen Report erstellen</button></div>
    <p className="muted" style=${{fontSize:'.85rem'}}>${sampleAvail===false
      ? 'Das KI-Fazit ist in dieser Version nicht eingerichtet. Du bekommst die komplette Statistik.'
      : 'Beim Tippen gehen die Statistik und ein Ausschnitt von rund 220 Nachrichten an Claude, damit das Fazit geschrieben werden kann. Die Statistik selbst bleibt in deinem Browser.'}</p>
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

const RSTEPS = [
  { t:'Euer Chat, Tag für Tag.', s:'Ein Kästchen pro Tag. Je heller, desto mehr habt ihr geschrieben.' },
  { t:'Wer redet, wer fängt an?', s:null },
  { t:'Euer Rhythmus.', s:null },
  { t:'Die längsten Nachrichten.', s:'Die ausführlichste Nachricht jeder Person.' },
  { t:'So fing alles an.', s:null },
  { t:'Und hier endet es. Vorerst.', s:null },
  { t:'Eure Wörter.', s:null }
];
const MONTH_LETTERS = 'JFMAMJJASOND';

function Card({tint, title, children, className}){
  return html`<section className=${'tcard'+(className?' '+className:'')} style=${tint?{'--tint':tint}:null}>
    ${title && html`<h3 className="tcard-h">${title}</h3>`}
    ${children}
  </section>`;
}

function Calendar({a}){
  const {years, level} = useMemo(()=>{
    const c = new Map();
    for (const m of a.msgs){ const d=new Date(m.t); const k=d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate(); c.set(k,(c.get(k)||0)+1); }
    const vals = [...c.values()].sort((x,y)=>x-y);
    const q = f => vals[Math.min(vals.length-1, Math.floor(vals.length*f))] || 1;
    const q1=q(.25), q2=q(.5), q3=q(.8);
    const level = n => n===0 ? 0 : n<=q1 ? 1 : n<=q2 ? 2 : n<=q3 ? 3 : 4;
    const f=new Date(a.first), l=new Date(a.last), years=[];
    for (let y=f.getFullYear(); y<=l.getFullYear(); y++){
      const m0 = y===f.getFullYear()?f.getMonth():0, m1 = y===l.getFullYear()?l.getMonth():11, months=[];
      for (let mo=m0; mo<=m1; mo++){
        const dim = new Date(y,mo+1,0).getDate(), cells=[];
        for (let d=1; d<=dim; d++) cells.push({d, n:c.get(y*10000+(mo+1)*100+d)||0});
        months.push({mo, cells});
      }
      years.push({y, months});
    }
    return {years, level};
  },[a]);
  return html`<div className="cal">
    <div className="cal-h">Kalender</div>
    ${years.map(y=>html`<div key=${y.y} className="cal-year">
      <div className="cal-y mono">${y.y}</div>
      ${y.months.map(m=>html`<div key=${m.mo} className="cal-row">
        <span className="cal-m" aria-hidden="true">${MONTH_LETTERS[m.mo]}</span>
        ${m.cells.map(c=>html`<i key=${c.d} className=${'cal-c l'+level(c.n)} title=${`${c.d}. ${MONTHS[m.mo]} ${y.y}: ${c.n} ${c.n===1?'Nachricht':'Nachrichten'}`}></i>`)}
      </div>`)}
    </div>`)}
    <div className="cal-legend"><span>weniger</span>${[0,1,2,3,4].map(l=>html`<i key=${l} className=${'cal-c l'+l}></i>`)}<span>mehr</span></div>
  </div>`;
}

function Donut({parts}){
  const r=38, C=2*Math.PI*r; let off=0;
  return html`<svg viewBox="0 0 100 100" className="donut" role="img" aria-label=${parts.map(p=>p.label+' '+pct(p.v)).join(', ')}>
    <circle cx="50" cy="50" r=${r} fill="none" stroke="var(--soft)" stroke-width="14"/>
    ${parts.map((p,i)=>{ const len=p.v*C; const el=html`<circle key=${i} cx="50" cy="50" r=${r} fill="none" stroke=${p.color} stroke-width="14" stroke-dasharray=${`${Math.max(0,len-1.2)} ${C}`} stroke-dashoffset=${-off} transform="rotate(-90 50 50)"/>`; off+=len; return el; })}
  </svg>`;
}

function Shares({a}){
  const top = a.persons.slice(0,5);
  const restN = a.total - top.reduce((s,p)=>s+p.msgs,0);
  const parts = top.map(p=>({label:p.name, v:p.msgs/a.total, color:pColor(p.idx)}));
  if (restN>0) parts.push({label:'Andere', v:restN/a.total, color:'var(--muted)'});
  const stTotal = a.persons.reduce((s,p)=>s+p.starters,0) || 1;
  const stMax = Math.max(...top.map(p=>p.starters/stTotal), .01);
  return html`<div style=${{display:'grid',gap:14}}>
    <${Card} tint="var(--p2)" title="Anteil am Chat">
      <div className="share">
        <${Donut} parts=${parts}/>
        <ol className="share-list">${parts.map((p,i)=>html`<li key=${p.label}>
          <i className="pdot" style=${{background:p.color}}></i>
          ${i<top.length ? html`<span className="mono muted rank">#${i+1}</span>` : html`<span className="rank"></span>`}
          <span className="share-n">${p.label}</span><b className="mono">${pct(p.v)}</b></li>`)}</ol>
      </div>
    </${Card}>
    <${Card} tint="var(--p1)" title="Wer das Gespräch beginnt">
      <p className="muted small">Wer nach mehr als 6 Stunden Pause als Erstes schreibt.</p>
      <div className="hbars">${top.map(p=>{ const v=p.starters/stTotal; return html`<div className="hbar" key=${p.name}>
        <span className="hbar-n">${p.name}</span>
        <span className="hbar-t"><span style=${{width:Math.max(2,v/stMax*100)+'%',background:pColor(p.idx)}}></span></span>
        <b className="mono">${pct(v)}</b></div>`; })}</div>
    </${Card}>
    <${Investment} a=${a}/>
  </div>`;
}

function Rhythm({a}){
  const fast = a.persons.filter(p=>p.replies.length>=5 && p.medianReply!=null).sort((x,y)=>x.medianReply-y.medianReply).slice(0,3);
  const podium = [fast[1], fast[0], fast[2]].map((p,i)=>p?{p, place:[2,1,3][i]}:null).filter(Boolean);
  const streak = useMemo(()=>longestStreak(a),[a]);
  const bd = a.busiest.k ? a.busiest.k.split('-').map(Number) : null;
  const gapDays = a.longest.gap/DAY;
  const night = [22,23,0,1,2,3,4].reduce((s,h)=>s+a.hours[h],0)/a.total;
  return html`<div style=${{display:'grid',gap:14}}>
    <${Card} tint="var(--p2)" title="Typische Antwortzeit">
      ${podium.length ? html`<div className="podium">${podium.map(({p,place})=>html`<div key=${p.name} className=${'pod pod'+place}>
        <span className="medal" aria-label=${place+'. Platz'}>${place}</span>
        <span className="pod-n">${p.name}</span>
        <b><span className="big-s">${fmtDur(p.medianReply).replace(/ .*/,'')}</span> <small>${fmtDur(p.medianReply).replace(/^\S+ ?/,'')}</small></b>
      </div>`)}</div>` : html`<p className="muted">Zu wenige Antworten für einen Vergleich.</p>`}
      <p className="muted small">Median der Zeit bis zur Antwort, schnellste Person in der Mitte.</p>
    </${Card}>
    <${Card} tint="var(--p3)" title="Rekordtag">
      <p className="stat"><b className="big">${nf.format(a.busiest.n)}</b> <span>Nachrichten am ${bd?fmtLong(new Date(bd[0],bd[1]-1,bd[2])):'–'}</span></p>
    </${Card}>
    <div className="grid-2s">
      <${Card} tint="var(--p0)" title="Längste Serie">
        <p className="stat"><b className="big">${nf.format(streak)}</b> <span>${streak===1?'Tag':'Tage'} am Stück</span></p>
      </${Card}>
      <${Card} tint="var(--p4)" title="Längste Funkstille">
        <p className="stat">${gapDays>=1 ? html`<b className="big">${nf.format(Math.round(gapDays))}</b> <span>${Math.round(gapDays)===1?'Tag':'Tage'}</span>` : html`<b className="big">${fmtDur(a.longest.gap)}</b>`}</p>
        <p className="muted small">${fmtDate(a.longest.from)} – ${fmtDate(a.longest.to)}</p>
      </${Card}>
    </div>
    <${Card} tint="var(--mark)" title="Nach Uhrzeit">
      <${HourChart} a=${a}/>
      <p className="muted small">${pct(night)} zwischen 22 und 5 Uhr · Spitze um ${a.peakHour} Uhr</p>
    </${Card}>
  </div>`;
}

function Bubble2({m, a, clamp}){
  const p = a.persons.find(x=>x.name===m.name);
  const [open,setOpen] = useState(false);
  const long = clamp && m.text.length>320;
  return html`<div className="bubble2">
    <span className="bubble2-n" style=${{color:p?pColor(p.idx):'inherit'}}>${m.name}</span>
    <p className=${long && !open ? 'clamped' : ''}>${isMedia(m) ? '📎 Medien' : m.text}</p>
    ${long && html`<button className="linkbtn" onClick=${()=>setOpen(!open)}>${open?'Weniger anzeigen':'Mehr anzeigen'}</button>`}
  </div>`;
}

function Longest({a}){
  const list = useMemo(()=> a.persons.slice(0,5).map(p=>{
    let best=null, bw=0;
    for (const m of a.msgs){
      if (m.name!==p.name || isMedia(m) || DELETED_RE.test(m.text) || JUNK_RE.test(m.text)) continue;
      const w = m.text.trim().split(/\s+/).filter(Boolean).length;
      if (w>bw){ bw=w; best=m; }
    }
    return best ? {p, m:best, w:bw} : null;
  }).filter(Boolean),[a]);
  return html`<div style=${{display:'grid',gap:14}}>${list.map(({p,m,w})=>html`<${Card} key=${p.name} tint="var(--soft)" className="neutral">
    <h3 className="tcard-h"><i className="pdot" style=${{background:pColor(p.idx)}}></i>${p.name}</h3>
    <p className="stat"><b className="big">${nf.format(w)}</b> <span>${w===1?'Wort':'Wörter'}</span></p>
    <p className="muted small">${fmtLong(m.t)}</p>
    <${Bubble2} m=${m} a=${a} clamp=${true}/>
  </${Card}>`)}</div>`;
}

function FirstDay({a}){
  const {day, list} = useMemo(()=>{
    const first = a.msgs.find(m=>!isMedia(m)) || a.msgs[0];
    const d = dayNum(first.t);
    let list = a.msgs.filter(m=>dayNum(m.t)===d).slice(0,8);
    if (list.length<3) list = a.msgs.slice(0,8);
    return {day:first.t, list};
  },[a]);
  return html`<${Card} tint="var(--soft)" className="neutral" title=${fmtLong(day)}>
    <div className="chatlog">${list.map((m,i)=>html`<${Bubble2} key=${i} m=${m} a=${a}/>`)}</div>
  </${Card}>`;
}


function LastDay({a}){
  const {day, list} = useMemo(()=>{
    const msgs = a.msgs, last = [...msgs].reverse().find(m=>!isMedia(m)) || msgs[msgs.length-1];
    const d = dayNum(last.t);
    let list = msgs.filter(m=>dayNum(m.t)===d).slice(-8);
    if (list.length<3) list = msgs.slice(-8);
    return {day:last.t, list};
  },[a]);
  return html`<${Card} tint="var(--soft)" className="neutral" title=${fmtLong(day)}>
    <div className="chatlog">${list.map((m,i)=>html`<${Bubble2} key=${i} m=${m} a=${a}/>`)}</div>
  </${Card}>`;
}

function Words({a}){
  const {words, emojis} = useMemo(()=>({ words: topWords(a,10), emojis: topEmojis(a,8) }),[a]);
  return html`<div style=${{display:'grid',gap:14}}>
    <${Card} tint="var(--p0)" title="Häufigste Wörter">
      ${words.length ? html`<ol className="wordlist">${words.map(([w,n],i)=>html`<li key=${w}><span className="mono muted rank">#${i+1}</span><b>${w}</b><span className="mono muted">${nf.format(n)}×</span></li>`)}</ol>`
        : html`<p className="muted">Zu wenig Text für eine Wortliste.</p>`}
    </${Card}>
    <${Card} tint="var(--mark)" title="Häufigste Emojis">
      ${emojis.length ? html`<div className="emojirow">${emojis.map(([e,n])=>html`<span key=${e} title=${nf.format(n)+'×'}>${e}<small className="mono">${nf.format(n)}</small></span>`)}</div>`
        : html`<p className="muted">In diesem Chat wird nicht geemojit.</p>`}
    </${Card}>
  </div>`;
}

function Details({a}){
  return html`<details className="details">
    <summary>Alle Zahlen im Detail</summary>
    <div style=${{display:'grid',gap:16,paddingTop:14}}>
      <div className="grid2"><${Investment} a=${a}/><${Change} a=${a}/></div>
      <div className="panel">
        <div className="label">Nachrichten pro Monat</div>
        <${MonthChart} a=${a}/>
        <div className="legend">${a.persons.slice(0,6).map(p=>html`<span key=${p.name}><i className="dot" style=${{background:pColor(p.idx)}}></i>${p.name}</span>`)}</div>
      </div>
      <${People} a=${a}/>
    </div>
  </details>`;
}

function Article({a, title, kind, ai, tone, setTone, onRun, onStop, sampleAvail}){
  const st = ai || {status:'idle'};
  const d = st.status==='done' ? st.data : null;
  const [pdfMsg,setPdfMsg] = useState(null);
  const [pdfReady,setPdfReady] = useState(false);
  const pdfRef = useRef(null);
  const loading = st.status==='loading';
  // Build the PDF ahead of time so "teilen" can hand it over while the tap still counts as a user gesture.
  useEffect(()=>{
    if (loading) return;
    let alive = true; pdfRef.current = null; setPdfReady(false);
    import('./pdf.js').then(m=>m.buildPdf({a, title, kind, ai:d}).then(blob=>{
      if (!alive) return;
      pdfRef.current = new File([blob], m.pdfFileName(title), {type:'application/pdf'});
      setPdfReady(true);
    })).catch(()=>{ if (alive) setPdfMsg('Das PDF ließ sich nicht erstellen. Lade die Seite neu und versuch es noch einmal.'); });
    return ()=>{ alive = false; };
  },[a, title, kind, d, loading]);
  function download(file){
    const url = URL.createObjectURL(file);
    const link = document.createElement('a'); link.href = url; link.download = file.name;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 10000);
  }
  async function share(){
    const file = pdfRef.current; if (!file) return;
    setPdfMsg(null);
    if (navigator.canShare && navigator.canShare({files:[file]})){
      try{ await navigator.share({files:[file], title:'Chatlupe-Report'}); return; }
      catch(e){ if (e && e.name==='AbortError') return; }
    }
    download(file);
    setPdfMsg('Teilen von Dateien geht in diesem Browser nicht, deshalb wurde das PDF heruntergeladen. Du kannst es jetzt in WhatsApp anhängen.');
  }
  let body;
  if (sampleAvail===false || st.hide){
    body = html`<div className="a-note"><p>${st.hide ? st.msg : 'Der geschriebene Report ist in dieser Version nicht eingerichtet. Alle Zahlen findest du unten.'}</p></div>`;
  } else if (st.status==='loading'){
    body = html`<div className="a-note">
      <div className="thinking dark"><i></i><i></i><i></i><span>Chatlupe schreibt deinen Report. Das dauert meist 30 bis 60 Sekunden.</span></div>
      <div className="skel"><i></i><i></i><i style=${{width:'70%'}}></i></div>
      <div><button className="btn btn-ghost" onClick=${onStop}>Abbrechen</button></div>
    </div>`;
  } else if (!d){
    body = html`<div className="a-note">
      <p>Lass Chatlupe den Chat lesen und dir einen ausführlichen Report schreiben: wer welche Rolle spielt und was sich verändert hat.</p>
      <div className="tones light"><${ToneButtons} tone=${tone} setTone=${setTone}/></div>
      <div><button className="btn btn-ink" onClick=${()=>onRun(tone)} disabled=${sampleAvail===null}>${sampleAvail===null?'Wird vorbereitet…':'Report schreiben lassen'}</button></div>
      ${st.status==='error' && html`<p className="err">${st.msg}</p>`}
      <p className="muted small">Beim Tippen gehen die Statistik und ein Ausschnitt von rund 220 Nachrichten an Claude. Vorher nichts.</p>
    </div>`;
  } else {
    const roles = Array.isArray(d.personen) ? d.personen : [];
    body = html`<div className="a-body">
      ${(d.intro||[]).map((p,i)=>html`<p key=${'i'+i}>${p}</p>`)}
      ${roles.length>0 && html`<div className="a-roles">${roles.map((r,i)=>{ const m=a.persons.find(x=>x.name===r.name); return html`<span key=${i} className="a-role"><i className="pdot" style=${{background:pColor(m?m.idx:i)}}></i><b>${r.name}</b> ${r.rolle}</span>`; })}</div>`}
      ${(d.kapitel||[]).map((k,i)=>html`<section key=${'k'+i} className="a-chapter">
        ${k.emoji && html`<div className="a-emoji" aria-hidden="true">${k.emoji}</div>`}
        <h2 className="a-h">${k.titel}</h2>
        <div className="a-orn" aria-hidden="true">— ✦ —</div>
        ${(k.absaetze||[]).map((p,j)=>html`<p key=${j}>${p}</p>`)}
      </section>`)}
      ${d.tipp && html`<aside className="a-tip"><b>Mein Tipp</b><p>${d.tipp}</p></aside>`}
      <div className="a-retone">
        <span className="muted small">Nochmal in einem anderen Ton?</span>
        <div className="tones light"><${ToneButtons} tone=${tone} setTone=${setTone}/></div>
        <div><button className="btn btn-ghost" onClick=${()=>onRun(tone)}>Neu schreiben</button></div>
      </div>
    </div>`;
  }
  return html`<article className="article">
    <h1 className="a-title">${d ? d.titel : title}</h1>
    ${d && d.untertitel && html`<p className="a-sub">${d.untertitel}</p>`}
    <div className="byline"><${Logo}/><div><b>Chatlupe</b><small>Liest mit, zählt nach und sagt dir ehrlich, was sie sieht.</small></div></div>
    <div className="pdf-actions">
      <button className="btn-share" onClick=${share} disabled=${!pdfReady}>↗ Als PDF teilen</button>
      <button className="btn-share" onClick=${()=>pdfRef.current && download(pdfRef.current)} disabled=${!pdfReady}>⬇ PDF herunterladen</button>
    </div>
    <p className="muted small">${loading ? 'Das PDF ist bereit, sobald der Report fertig geschrieben ist.' : pdfReady ? (d ? 'Das PDF enthält den Report und alle Zahlen.' : 'Das PDF enthält alle Zahlen.') : 'PDF wird vorbereitet…'}</p>
    ${pdfMsg && html`<p className="muted small">${pdfMsg}</p>`}
    <p className="a-privacy">🔒 Die Statistik wurde in deinem Browser berechnet.${d ? ' Für den Text hat Claude nur die Zahlen und einen Ausschnitt gesehen.' : ' Bisher hat niemand deinen Chat gesehen.'}</p>
    ${body}
    <${Details} a=${a}/>
  </article>`;
}

function ReportStory({a, rstep}){
  if (rstep===1) return html`<${Calendar} a=${a}/>`;
  if (rstep===2) return html`<${Shares} a=${a}/>`;
  if (rstep===3) return html`<${Rhythm} a=${a}/>`;
  if (rstep===4) return html`<${Longest} a=${a}/>`;
  if (rstep===5) return html`<${FirstDay} a=${a}/>`;
  if (rstep===6) return html`<${LastDay} a=${a}/>`;
  return html`<${Words} a=${a}/>`;
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
      <h2>In 7 Schritten zum Report</h2>
      <ol className="steps mini">${STEPS.map(s=>html`<li key=${s.t}><b>${s.t.replace('In welcher Sprache soll dein Report sein?','Sprache wählen')}</b></li>`)}</ol>
      <p className="privacy">Die Auswertung läuft komplett in deinem Browser. Nur wenn du am Ende den Report mit KI-Fazit erstellst, gehen Statistik und ein Ausschnitt von rund 220 Nachrichten an Claude.</p>
    </section>
    <footer>
      <span><b style=${{color:'var(--ink)'}}>Chatlupe</b> · Statistik im Browser, Fazit von Claude</span>
      <span>Die Beispielchats und alle Namen darin sind erfunden.</span>
      <${LegalLinks}/>
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
  const [excluded,setExcluded] = useState({});
  const [name,setName] = useState('');
  const [lang,setLang] = useState('Deutsch');
  const [tone,setTone] = useState('ehrlich');
  const [focus,setFocus] = useState(null);
  const [rstep,setRstep] = useState(1);
  const readLegal = () => { const h = location.hash.slice(1); return LEGAL_PAGES[h] ? h : null; };
  const [legal,setLegal] = useState(readLegal);
  useEffect(()=>{ const on = ()=>setLegal(readLegal()); window.addEventListener('hashchange', on); return ()=>window.removeEventListener('hashchange', on); },[]);
  useEffect(()=>{ window.scrollTo(0,0); },[legal]);
  const [ai,setAi] = useState(null);
  const [sampleAvail,setSampleAvail] = useState(null);
  const sampleRef = useRef(null);
  const ctl = useRef(null);
  useEffect(()=>{ let alive=true; (async()=>{
    let s=null; try{ s = await getAi(); }catch(e){ s=null; }
    if(!alive) return; sampleRef.current=s; setSampleAvail(!!s);
  })(); return ()=>{alive=false}; },[]);
  useEffect(()=>{ window.scrollTo(0,0); },[step,view,rstep]);

  const allOut = useMemo(()=> !!chat && chat.msgs.every(m=>excluded[m.name]), [chat, excluded]);
  const cur = view==='flow' ? Math.min(step, chat ? (allOut ? 5 : 8) : 3) : 0;
  const rows = useRows(chat ? chat.msgs : []);
  const needA = cur>=7;
  const a = useMemo(()=>{
    if (!needA || !chat) return null;
    const kept = chat.msgs.filter(m=>!excluded[m.name]);
    if (!kept.length) return null;
    return analyze(kept.map(m=>{ const v=cleanAlias(aliases[m.name]); return v ? {...m, name:v} : m; }));
  }, [needA, chat, aliases, excluded]);
  useEffect(()=>{ if (ctl.current) ctl.current.abort(); setAi(null); },[chat,aliases,excluded,kind,lang]);
  const title = name.trim() || (chat && chat.title) || 'Dein Chat';

  async function runAi(t){
    const s = sampleRef.current; if (!s || !a) return;
    if (ctl.current) ctl.current.abort();
    const c = new AbortController(); ctl.current = c;
    setAi({status:'loading'});
    try{
      const res = await s.json(buildPrompt(a,t,title,kind,lang), {signal:c.signal});
      if (!res || typeof res!=='object' || !res.titel || !Array.isArray(res.kapitel)) throw {code:'invalid_json'};
      if (ctl.current===c) setAi({status:'done', data:res, tone:t});
    }catch(e){
      if (ctl.current!==c) return;
      const code = e && e.code;
      const text = code in AI_ERRORS ? AI_ERRORS[code] : 'Verbindung unterbrochen. Tipp nochmal auf den Knopf.';
      setAi(text ? {status:'error', msg:text, hide: code==='not_granted'||code==='sampling_disabled'} : {status:'idle'});
    }
  }

  function start(){ setView('flow'); setStep(1); }
  function loadChat(m, t){ setChat({msgs:m, title:t, isDemo:false, stamp:Date.now()}); setAliases({}); setExcluded({}); setName(t); setFocus(null); setStep(4); }
  function openDemo(d){
    setChat({msgs:d.msgs, title:d.title, tag:d.tag, isDemo:true, demoId:d.id, stamp:Date.now()});
    setAliases({}); setExcluded({}); setName(d.title); setFocus(null); setKind(k=>k||DEMO_KIND[d.id]); setView('flow'); setStep(4);
  }
  function setAlias(orig, val){ setAliases(o=>({...o, [orig]:val})); }
  function back(){ if (cur===8 && rstep>1) setRstep(rstep-1); else if (cur>1) setStep(cur-1); else setView('home'); }
  function restart(){ setChat(null); setAliases({}); setExcluded({}); setName(''); setKind(null); setFocus(null); setStep(1); }
  function create(){ setRstep(1); setStep(8); if (sampleRef.current) runAi(tone); }

  if (legal) return html`<${LegalPage} page=${legal} onBack=${()=>{ history.replaceState(null,'',location.pathname+location.search); setLegal(null); }}/>`;
  if (view==='home') return html`<${Home} onStart=${start} demos=${demos} onDemo=${openDemo}/>`;

  const k = kindById(kind);
  const wide = false;
  const shownStep = cur===8 ? Math.min(rstep,7) : cur;
  let head, body, next = null;
  head = cur===8 ? (rstep<=7 ? RSTEPS[rstep-1] : null) : STEPS[cur-1];
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
        <input value=${name} onInput=${e=>setName(e.target.value)} placeholder=${rows.length>2?'Name der Gruppe …':'Name des Chats …'} maxLength="60"/>
        <${Pencil}/>
      </label>
      <${Participants} rows=${rows} total=${chat.msgs.length} aliases=${aliases} onWho=${n=>{ setFocus(n); setStep(5); }}/>
    </div>`;
    next = {label:'Weiter', go:5};
  } else if (cur===5){
    body = html`<${NameCleanup} rows=${rows} msgs=${chat.msgs} aliases=${aliases} setAlias=${setAlias} focus=${focus} excluded=${excluded} setExcluded=${setExcluded}/>`;
    if (rows.some(r=>!excluded[r.name])) next = {label:'Weiter', go:6};
  } else if (cur===6){
    body = html`<${LangPicker} lang=${lang} setLang=${setLang} onDone=${()=>setStep(7)}/>`;
    next = {label:'Weiter', go:7};
  } else if (cur===7){
    body = html`<${CreateStep} title=${title} a=${a} kind=${kind} lang=${lang} tone=${tone} setTone=${setTone} sampleAvail=${sampleAvail} onCreate=${create}/>`;
  } else {
    body = rstep<=7 ? html`<${ReportStory} a=${a} rstep=${rstep}/>`
      : html`<${Article} a=${a} title=${title} kind=${kind} ai=${ai} tone=${tone} setTone=${setTone} onRun=${runAi} onStop=${()=>ctl.current&&ctl.current.abort()} sampleAvail=${sampleAvail}/>`;
    if (rstep<=7) next = {label:rstep===7?'Report ansehen':'Weiter', go:'r'};
  }

  return html`<div className="flow">
    <div className="flowbar"><div className=${'flowbar-in'+(wide?' wide':'')}>
      <button className="iconbtn" aria-label=${cur===1?'Zur Startseite':'Zurück'} onClick=${back}><${ArrowLeft}/></button>
      <div className="progress" role="progressbar" aria-label="Fortschritt" aria-valuemin="1" aria-valuemax="7" aria-valuenow=${shownStep}><span style=${{width:(shownStep/7*100)+'%'}}></span></div>
      <span className="stepcount">${cur===8 ? (rstep>7 ? 'Dein Report' : `Report ${rstep} von 7`) : `${cur} von 7`}</span>
    </div></div>
    <main className=${'flow-body'+(wide?' wide':'')}>
      ${head && html`<div className="step-head">
        ${cur>=4 && html`<div style=${{display:'flex',gap:8,flexWrap:'wrap'}}>
          ${chat.isDemo && html`<span className="chip example">Beispielchat, frei erfunden</span>`}
          ${k && html`<span className="chip">${k.icon} ${k.label}</span>`}
        </div>`}
        <h2>${head.t}</h2>
        ${head.s && html`<p className="muted">${head.s}</p>`}
      </div>`}
      ${body}
      <div className="flow-nav">
        ${next && html`<button className="btn btn-mark btn-lg" onClick=${()=> next.go==='r' ? setRstep(rstep+1) : setStep(next.go)}>${next.label} <span aria-hidden="true">→</span></button>`}
        ${cur===8 && rstep===8 && html`<button className="btn btn-ink" onClick=${restart}>Neuen Chat auswerten</button>`}
        ${cur===8 && rstep===8 && html`<button className="btn btn-ghost" onClick=${()=>setView('home')}>Zur Startseite</button>`}
      </div>
      <${LegalLinks}/>
    </main>
  </div>`;
}

createRoot(document.getElementById('root')).render(html`<${App}/>`);
