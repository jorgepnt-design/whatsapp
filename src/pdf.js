import React from 'react';
import htm from 'htm';
import { Document, Page, View, Text, Font, StyleSheet, pdf } from '@react-pdf/renderer';
import figtree400 from '@fontsource/figtree/files/figtree-latin-400-normal.woff?url';
import figtree600 from '@fontsource/figtree/files/figtree-latin-600-normal.woff?url';
import figtree700 from '@fontsource/figtree/files/figtree-latin-700-normal.woff?url';
import fraunces500 from '@fontsource/fraunces/files/fraunces-latin-500-normal.woff?url';
import fraunces600 from '@fontsource/fraunces/files/fraunces-latin-600-normal.woff?url';
import unbounded700 from '@fontsource/unbounded/files/unbounded-latin-700-normal.woff?url';
import { nf, nf1, pct, fmtDate, fmtDur } from './format.js';
import { kindById } from './kinds.js';
import { fmtLong, longestStreak, topWords } from './extra.js';

const html = htm.bind(React.createElement);

Font.register({ family:'Figtree', fonts:[
  { src:figtree400, fontWeight:400 }, { src:figtree600, fontWeight:600 }, { src:figtree700, fontWeight:700 }
]});
Font.register({ family:'Fraunces', fonts:[{ src:fraunces500, fontWeight:500 }, { src:fraunces600, fontWeight:600 }] });
Font.register({ family:'Unbounded', fonts:[{ src:unbounded700, fontWeight:700 }] });
Font.registerHyphenationCallback(word => [word]);

const C = { ink:'#10231F', muted:'#566A64', line:'#D3DDD8', soft:'#E2EAE6', bg:'#EEF3F0', mark:'#FFD84D', surface:'#FFFFFF' };
const P = ['#1F8A70','#E0634A','#5662C4','#B88A12','#9C4D8A','#4B7A96'];
const pc = i => P[i % P.length];

// The embedded fonts have no emoji glyphs, so emoji are removed from all PDF text.
const EMOJI_RE = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}‍️⃣]/gu;
const clean = s => String(s ?? '').replace(EMOJI_RE, '').replace(/[ \t]{2,}/g, ' ').replace(/\s+([,.!?:;])/g, '$1').trim();
const personName = (p, i) => clean(p.name) || `Person ${i+1}`;

const s = StyleSheet.create({
  page:{ fontFamily:'Figtree', fontSize:10.5, color:C.ink, paddingTop:44, paddingBottom:56, paddingHorizontal:44, lineHeight:1.45, backgroundColor:C.surface },
  brandRow:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:22 },
  brand:{ fontFamily:'Unbounded', fontWeight:700, fontSize:11, color:C.ink },
  brandDot:{ width:9, height:9, borderRadius:5, backgroundColor:P[0], marginRight:6 },
  small:{ fontSize:8.5, color:C.muted },
  kicker:{ flexDirection:'row', marginBottom:10 },
  chip:{ fontSize:8, fontWeight:700, paddingVertical:3, paddingHorizontal:8, borderRadius:8, backgroundColor:C.mark, color:C.ink, marginRight:6, textTransform:'uppercase', letterSpacing:0.6 },
  chipSoft:{ backgroundColor:C.soft },
  title:{ fontFamily:'Fraunces', fontWeight:600, fontSize:26, lineHeight:1.15, marginBottom:8 },
  subtitle:{ fontSize:12, color:C.muted, marginBottom:18 },
  facts:{ flexDirection:'row', marginBottom:22 },
  fact:{ flex:1, backgroundColor:C.bg, borderRadius:8, padding:10, marginRight:8 },
  factLabel:{ fontSize:7.5, color:C.muted, textTransform:'uppercase', letterSpacing:0.6, marginBottom:3 },
  factValue:{ fontSize:12, fontWeight:700 },
  h2:{ fontFamily:'Fraunces', fontWeight:600, fontSize:16, marginBottom:4 },
  h2sub:{ fontSize:9, color:C.muted, marginBottom:10 },
  section:{ marginBottom:20 },
  card:{ borderWidth:1, borderColor:C.line, borderRadius:10, padding:14, marginBottom:12 },
  barRow:{ flexDirection:'row', alignItems:'center', marginBottom:6 },
  barName:{ width:120, fontSize:9.5, paddingRight:8 },
  barTrack:{ flex:1, height:9, borderRadius:5, backgroundColor:C.soft },
  barFill:{ height:9, borderRadius:5 },
  barVal:{ width:62, textAlign:'right', fontSize:9.5, fontWeight:600 },
  stack:{ flexDirection:'row', height:22, borderRadius:6, overflow:'hidden', marginTop:4, marginBottom:8 },
  stackSeg:{ justifyContent:'center', paddingLeft:6 },
  stackTxt:{ color:'#FFFFFF', fontSize:8.5, fontWeight:700 },
  legend:{ flexDirection:'row', flexWrap:'wrap' },
  legendItem:{ flexDirection:'row', alignItems:'center', marginRight:12, marginBottom:3 },
  dot:{ width:7, height:7, borderRadius:4, marginRight:4 },
  grid2:{ flexDirection:'row', flexWrap:'wrap', marginHorizontal:-5 },
  statBox:{ width:'50%', paddingHorizontal:5, marginBottom:10 },
  statInner:{ borderRadius:10, padding:12 },
  statLabel:{ fontSize:8.5, fontWeight:700, marginBottom:4 },
  statBig:{ fontFamily:'Unbounded', fontWeight:700, fontSize:17, lineHeight:1.25, marginBottom:4 },
  table:{ borderWidth:1, borderColor:C.line, borderRadius:8 },
  tr:{ flexDirection:'row', borderBottomWidth:1, borderBottomColor:C.line, paddingVertical:5, paddingHorizontal:8 },
  trLast:{ borderBottomWidth:0 },
  th:{ fontSize:7.5, color:C.muted, textTransform:'uppercase', letterSpacing:0.5, fontWeight:700 },
  td:{ fontSize:9.5 },
  hours:{ flexDirection:'row', alignItems:'flex-end', height:70, marginTop:6 },
  hourCol:{ flex:1, marginHorizontal:0.8, borderTopLeftRadius:2, borderTopRightRadius:2 },
  hourAxis:{ flexDirection:'row', justifyContent:'space-between', marginTop:3 },
  words:{ flexDirection:'row', flexWrap:'wrap' },
  wordItem:{ width:'50%', flexDirection:'row', paddingVertical:3, paddingRight:10 },
  wordRank:{ width:20, fontSize:8.5, color:C.muted },
  wordTxt:{ flex:1, fontSize:10.5, fontWeight:600 },
  wordN:{ fontSize:8.5, color:C.muted },
  articleTitle:{ fontFamily:'Fraunces', fontWeight:600, fontSize:22, lineHeight:1.2, marginBottom:6 },
  byline:{ flexDirection:'row', alignItems:'center', borderWidth:1, borderColor:C.line, borderRadius:8, padding:8, marginBottom:14 },
  para:{ fontSize:10.5, lineHeight:1.6, marginBottom:8, textAlign:'justify' },
  roles:{ flexDirection:'row', flexWrap:'wrap', marginBottom:8 },
  role:{ flexDirection:'row', alignItems:'center', borderWidth:1, borderColor:C.line, borderRadius:10, paddingVertical:3, paddingHorizontal:8, marginRight:6, marginBottom:6 },
  chapterH:{ fontFamily:'Fraunces', fontWeight:600, fontSize:15, textAlign:'center', marginTop:14, marginBottom:2 },
  orn:{ fontSize:8, color:C.muted, textAlign:'center', marginBottom:8 },
  tip:{ borderLeftWidth:3, borderLeftColor:C.mark, backgroundColor:C.bg, padding:10, marginTop:10, marginBottom:22, borderRadius:4 },
  footerLine:{ position:'absolute', bottom:40, left:44, right:44, height:1, backgroundColor:C.line },
  footerLeft:{ position:'absolute', bottom:26, left:44, fontSize:8, color:C.muted }
});

function Bar({name, value, max, color, label}){
  return html`<${View} style=${s.barRow} wrap=${false}>
    <${Text} style=${s.barName}>${name}</${Text}>
    <${View} style=${s.barTrack}><${View} style=${[s.barFill, { width:`${Math.max(2, max ? value/max*100 : 0)}%`, backgroundColor:color }]}/></${View}>
    <${Text} style=${s.barVal}>${label}</${Text}>
  </${View}>`;
}

function Section({title, sub, children, breakBefore, keep}){
  return html`<${View} style=${s.section} break=${!!breakBefore} wrap=${!keep}>
    <${Text} style=${s.h2} minPresenceAhead=${80}>${title}</${Text}>
    ${sub ? html`<${Text} style=${s.h2sub}>${sub}</${Text}>` : null}
    ${children}
  </${View}>`;
}

function Stat({label, value, note, tint}){
  return html`<${View} style=${s.statBox} wrap=${false}>
    <${View} style=${[s.statInner, { backgroundColor:tint }]}>
      <${Text} style=${s.statLabel}>${label}</${Text}>
      <${Text} style=${s.statBig}>${value}</${Text}>
      ${note ? html`<${Text} style=${s.small}>${note}</${Text}>` : null}
    </${View}>
  </${View}>`;
}

function Table({cols, rows, widths}){
  return html`<${View} style=${s.table}>
    <${View} style=${[s.tr, { backgroundColor:C.bg }]} wrap=${false}>
      ${cols.map((c,i)=>html`<${Text} key=${i} style=${[s.th, { width:widths[i], textAlign:i ? 'right' : 'left' }]}>${c}</${Text}>`)}
    </${View}>
    ${rows.map((r,ri)=>html`<${View} key=${ri} style=${[s.tr, ri===rows.length-1 && s.trLast]} wrap=${false}>
      ${r.map((c,i)=>html`<${Text} key=${i} style=${[s.td, { width:widths[i], textAlign:i ? 'right' : 'left', fontWeight:i ? 400 : 600 }]}>${c}</${Text}>`)}
    </${View}>`)}
  </${View}>`;
}

// Lighter tint of a palette colour for stat boxes.
const tint = (hex, k=0.16) => {
  const n = parseInt(hex.slice(1),16), r = n>>16, g = (n>>8)&255, b = n&255;
  const mix = c => Math.round(c*k + 255*(1-k));
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
};

export function ReportPdf({a, title, kind, ai}){
  const top = a.persons.slice(0,6);
  const names = a.persons.map(personName);
  const k = kindById(kind);
  const d = ai || null;
  const docTitle = clean(d && d.titel) || clean(title) || 'Dein Chat';
  const restN = a.total - top.reduce((x,p)=>x+p.msgs,0);
  const maxMsgs = Math.max(...top.map(p=>p.msgs), restN, 1);
  const stTotal = a.persons.reduce((x,p)=>x+p.starters,0) || 1;
  const stMax = Math.max(...top.map(p=>p.starters), 1);
  const bd = a.busiest.k ? a.busiest.k.split('-').map(Number) : null;
  const gapDays = a.longest.gap / 864e5;
  const streak = longestStreak(a);
  const words = topWords(a, 10);
  const hourMax = Math.max(...a.hours, 1);
  const night = [22,23,0,1,2,3,4].reduce((x,h)=>x+a.hours[h],0) / a.total;
  const c = a.change;

  return html`<${Document} title=${'Chatlupe: '+clean(title)} author="Chatlupe" creator="Chatlupe" language="de">
    <${Page} size="A4" style=${s.page}>
      <${View} style=${s.footerLine} fixed/>
      <${Text} style=${s.footerLeft} fixed>${'Chatlupe · ' + (clean(title) || 'Dein Chat') + ' · Report vom ' + fmtLong(Date.now())}</${Text}>
      <${View} style=${s.brandRow} fixed>
        <${View} style=${{ flexDirection:'row', alignItems:'center' }}><${View} style=${s.brandDot}/><${Text} style=${s.brand}>Chatlupe</${Text}></${View}>
        <${Text} style=${s.small}>WhatsApp-Report</${Text}>
      </${View}>

      <${View} style=${s.kicker}>
        <${Text} style=${s.chip}>WhatsApp-Report</${Text}>
        ${k ? html`<${Text} style=${[s.chip, s.chipSoft]}>${clean(k.label)}</${Text}>` : null}
      </${View}>
      <${Text} style=${s.title}>${docTitle}</${Text}>
      ${d && d.untertitel ? html`<${Text} style=${s.subtitle}>${clean(d.untertitel)}</${Text}>` : html`<${Text} style=${s.subtitle}>${clean(title)}</${Text}>`}

      <${View} style=${s.facts} wrap=${false}>
        <${View} style=${s.fact}><${Text} style=${s.factLabel}>Zeitraum</${Text}><${Text} style=${[s.factValue, { fontSize:9.5 }]}>${fmtDate(a.first)} – ${fmtDate(a.last)}</${Text}></${View}>
        <${View} style=${s.fact}><${Text} style=${s.factLabel}>Nachrichten</${Text}><${Text} style=${s.factValue}>${nf.format(a.total)}</${Text}></${View}>
        <${View} style=${s.fact}><${Text} style=${s.factLabel}>Personen</${Text}><${Text} style=${s.factValue}>${a.persons.length}</${Text}></${View}>
        <${View} style=${[s.fact, { marginRight:0 }]}><${Text} style=${s.factLabel}>Aktive Tage</${Text}><${Text} style=${s.factValue}>${nf.format(a.activeDays)} von ${nf.format(Math.ceil(a.spanDays))}</${Text}></${View}>
      </${View}>

      <${Section} title="Wer redet wie viel?" sub="Anteil an allen Nachrichten.">
        ${top.map((p,i)=>html`<${Bar} key=${i} name=${names[i]} value=${p.msgs} max=${maxMsgs} color=${pc(p.idx)} label=${`${nf.format(p.msgs)} · ${pct(p.msgs/a.total)}`}/>`)}
        ${restN>0 ? html`<${Bar} name="Andere" value=${restN} max=${maxMsgs} color=${C.muted} label=${`${nf.format(restN)} · ${pct(restN/a.total)}`}/>` : null}
      </${Section}>

      <${Section} title="Wer fängt an?" sub="Wer nach mehr als 6 Stunden Pause als Erstes schreibt.">
        ${top.map((p,i)=>html`<${Bar} key=${i} name=${names[i]} value=${p.starters} max=${stMax} color=${pc(p.idx)} label=${pct(p.starters/stTotal)}/>`)}
      </${Section}>

      <${Section} title="Wer investiert mehr?" sub="Score aus Anteil der Nachrichten (40 %), wer zuerst schreibt (30 %) und Antworttempo (30 %).">
        <${View} style=${s.stack}>
          ${top.map((p,i)=>html`<${View} key=${i} style=${[s.stackSeg, { width:`${p.invest*100}%`, backgroundColor:pc(p.idx) }]}>${p.invest>0.1 ? html`<${Text} style=${s.stackTxt}>${pct(p.invest)}</${Text}>` : null}</${View}>`)}
        </${View}>
        <${View} style=${s.legend}>${top.map((p,i)=>html`<${View} key=${i} style=${s.legendItem}><${View} style=${[s.dot, { backgroundColor:pc(p.idx) }]}/><${Text} style=${{ fontSize:9 }}>${names[i]} ${pct(p.invest)}</${Text}></${View}>`)}</${View}>
      </${Section}>

      <${Section} keep=${true} title="Früher vs. jetzt" sub=${`von ${nf1.format(c.earlyPerDay)} auf ${nf1.format(c.latePerDay)} Nachrichten pro Tag (erstes gegen letztes Drittel des Zeitraums).`}>
        <${Table} cols=${['Person','Anteil früher','Anteil jetzt','Veränderung']} widths=${['40%','20%','20%','20%']}
          rows=${c.persons.slice(0,6).map((p,i)=>{ const dd = Math.round((p.late-p.early)*100); return [names[i], pct(p.early), pct(p.late), dd===0 ? 'gleich' : (dd>0?'+':'')+dd+' Pkt.']; })}/>
      </${Section}>
      <${Section} title="Euer Rhythmus" breakBefore=${true}>
        <${View} style=${s.grid2}>
          <${Stat} label="Rekordtag" value=${nf.format(a.busiest.n)} note=${bd ? 'Nachrichten am '+fmtLong(new Date(bd[0],bd[1]-1,bd[2])) : ''} tint=${tint(P[3])}/>
          <${Stat} label="Längste Serie" value=${`${nf.format(streak)} ${streak===1?'Tag':'Tage'}`} note="am Stück geschrieben" tint=${tint(P[0])}/>
          <${Stat} label="Längste Funkstille" value=${gapDays>=1 ? `${nf.format(Math.round(gapDays))} ${Math.round(gapDays)===1?'Tag':'Tage'}` : fmtDur(a.longest.gap)} note=${`${fmtDate(a.longest.from)} – ${fmtDate(a.longest.to)}`} tint=${tint(P[4])}/>
          <${Stat} label="Lieblingsuhrzeit" value=${`${a.peakHour}–${a.peakHour+1} Uhr`} note=${`${pct(night)} zwischen 22 und 5 Uhr`} tint=${tint(P[2])}/>
        </${View}>

        <${View} style=${s.card} wrap=${false}>
          <${Text} style=${[s.statLabel, { fontSize:10 }]}>Nachrichten nach Uhrzeit</${Text}>
          <${View} style=${s.hours}>${a.hours.map((v,i)=>html`<${View} key=${i} style=${[s.hourCol, { height:`${Math.max(2, v/hourMax*100)}%`, backgroundColor: i===a.peakHour ? '#E9B800' : P[0] }]}/>`)}</${View}>
          <${View} style=${s.hourAxis}>${['0 Uhr','6 Uhr','12 Uhr','18 Uhr','23 Uhr'].map(t=>html`<${Text} key=${t} style=${s.small}>${t}</${Text}>`)}</${View}>
        </${View}>

        <${Text} style=${[s.statLabel, { fontSize:10, marginTop:4, marginBottom:6 }]}>Typische Antwortzeit</${Text}>
        <${Table} cols=${['Person','Antwortet nach','Schreibt zuerst','Nach Mitternacht']} widths=${['40%','20%','20%','20%']}
          rows=${top.map((p,i)=>[names[i], fmtDur(p.medianReply), `${nf.format(p.starters)}×`, nf.format(p.night)])}/>
      </${Section}>

      ${words.length ? html`<${Section} title="Eure Wörter" sub="Die häufigsten Wörter, ohne Füllwörter und Namen.">
        <${View} style=${s.words}>${words.map(([w,n],i)=>html`<${View} key=${w} style=${s.wordItem}><${Text} style=${s.wordRank}>${i+1}.</${Text}><${Text} style=${s.wordTxt}>${w}</${Text}><${Text} style=${s.wordN}>${nf.format(n)}×</${Text}></${View}>`)}</${View}>
      </${Section}>` : null}


      ${d ? html`<${View} break>
        <${Text} style=${s.small}>DER REPORT</${Text}>
        <${Text} style=${s.articleTitle}>${docTitle}</${Text}>
        <${View} style=${s.byline}><${View} style=${s.brandDot}/><${Text} style=${{ fontSize:9 }}><${Text} style=${{ fontWeight:700 }}>Chatlupe</${Text}> · liest mit, zählt nach und sagt dir ehrlich, was sie sieht</${Text}></${View}>
        ${(d.intro||[]).map((p,i)=>html`<${Text} key=${'i'+i} style=${s.para}>${clean(p)}</${Text}>`)}
        ${Array.isArray(d.personen) && d.personen.length ? html`<${View} style=${s.roles}>${d.personen.map((r,i)=>{ const m = a.persons.find(x=>x.name===r.name); return html`<${View} key=${i} style=${s.role}><${View} style=${[s.dot, { backgroundColor:pc(m ? m.idx : i) }]}/><${Text} style=${{ fontSize:9 }}><${Text} style=${{ fontWeight:700 }}>${clean(r.name)}</${Text}> ${clean(r.rolle)}</${Text}></${View}>`; })}</${View}>` : null}
        ${(d.kapitel||[]).map((kp,i)=>html`<${View} key=${'k'+i}>
          <${Text} style=${s.chapterH} minPresenceAhead=${60}>${clean(kp.titel)}</${Text}>
          <${Text} style=${s.orn}>— · —</${Text}>
          ${(kp.absaetze||[]).map((p,j)=>html`<${Text} key=${j} style=${s.para}>${clean(p)}</${Text}>`)}
        </${View}>`)}
        ${d.tipp ? html`<${View} style=${s.tip} wrap=${false}><${Text} style=${{ fontWeight:700, marginBottom:2 }}>Mein Tipp</${Text}><${Text}>${clean(d.tipp)}</${Text}></${View}>` : null}
      </${View}>` : null}

      <${Section} title="Alle Zahlen pro Person" breakBefore=${!d}>
        <${Table} cols=${['Person','Nachrichten','Wörter/Nachr.','Fragen','Herzen','Medien']} widths=${['30%','16%','16%','12%','12%','14%']}
          rows=${a.persons.slice(0,10).map((p,i)=>[names[i], `${nf.format(p.msgs)} · ${pct(p.msgs/a.total)}`, nf1.format(p.wpm), nf.format(p.questions), nf.format(p.hearts), nf.format(p.media)])}/>
        <${Text} style=${[s.small, { marginTop:10 }]}>Die Statistik wurde in deinem Browser berechnet. Der Text stammt von einer KI (Claude) und dient der Unterhaltung.</${Text}>
      </${Section}>

    </${Page}>
  </${Document}>`;
}

export const pdfFileName = title => `Chatlupe-${(clean(title) || 'Report').replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'').slice(0,60) || 'Report'}.pdf`;

export async function buildPdf(props){
  return await pdf(React.createElement(ReportPdf, props)).toBlob();
}
