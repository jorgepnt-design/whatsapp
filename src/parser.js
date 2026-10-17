const LINE_RE = /^\[?(\d{1,4})[.\/-](\d{1,2})[.\/-](\d{1,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp]\.?\s?[Mm]\.?)?\]?\s*(?:[-–]\s*)?(.*)$/;
export const MEDIA_RE = /(<Medien ausgeschlossen>|<Media omitted>|weggelassen|omitted|<angehängt:|<attached:)/i;
export const DELETED_RE = /(Diese Nachricht wurde gelöscht|Du hast diese Nachricht gelöscht|This message was deleted|You deleted this message)/i;
const SYSTEM_RE = /(Ende-zu-Ende|end-to-end encrypted|hat die Gruppe|created group|hat dich hinzugefügt|added you|Sicherheitsnummer|security code)/i;

export function parseChat(text){
  const lines = text.replace(/\r/g,'').split('\n');
  const raw = [];
  let ymd = false;
  for (let line of lines){
    line = line.replace(/[‎‏‪-‮﻿]/g,'').replace(/[  ]/g,' ');
    const m = line.match(LINE_RE);
    if (m && (line.includes(':')) && /\d{1,2}:\d{2}/.test(line.slice(0,26))){
      const [ , a,b,c,h,mi,s,ap,rest] = m;
      if (a.length===4) ymd = true;
      raw.push({a:+a,b:+b,c:+c,h:+h,mi:+mi,s:+(s||0),ap:ap||'',rest,sep:line.match(/^\[?\d{1,4}([.\/-])/)[1]});
    } else if (raw.length && line.length){
      raw[raw.length-1].rest += '\n' + line;
    }
  }
  if (!raw.length) return [];
  let dmy = true;
  if (!ymd){
    if (raw.some(r=>r.a>12)) dmy = true;
    else if (raw.some(r=>r.b>12)) dmy = false;
    else dmy = raw[0].sep !== '/';
  }
  const out = [];
  for (const r of raw){
    let d,mo,y;
    if (ymd){ y=r.a; mo=r.b; d=r.c; } else if (dmy){ d=r.a; mo=r.b; y=r.c; } else { mo=r.a; d=r.b; y=r.c; }
    if (y<100) y+=2000;
    let h=r.h; const ap=r.ap.toLowerCase().replace(/[^ap]/g,'');
    if (ap==='p' && h<12) h+=12; if (ap==='a' && h===12) h=0;
    const idx = r.rest.indexOf(': ');
    if (idx<1 || idx>60) continue;
    const name = r.rest.slice(0,idx).trim();
    const body = r.rest.slice(idx+2);
    if (SYSTEM_RE.test(body) && body.length<160) continue;
    const t = new Date(y,mo-1,d,h,r.mi,r.s).getTime();
    if (isNaN(t)) continue;
    out.push({t,name,text:body});
  }
  out.sort((x,y)=>x.t-y.t);
  return out;
}
