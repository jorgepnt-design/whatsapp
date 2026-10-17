import { MEDIA_RE, DELETED_RE } from './parser.js';

const EMOJI_RE = /\p{Extended_Pictographic}/gu;
const LAUGH_RE = /(haha|hihi|hehe|\blol\b|\bxd\b|😂|🤣)/i;
const HEART_RE = /(❤|♥|😍|🥰|😘|💕|💖|lieb dich|\bhdl\b|vermiss)/i;
export const H = 3600e3, DAY = 24*H;

export function median(arr){ if(!arr.length) return null; const s=[...arr].sort((a,b)=>a-b); const m=s.length>>1; return s.length%2?s[m]:(s[m-1]+s[m])/2; }

export function analyze(msgs){
  if (!msgs.length) return null;
  const P = new Map();
  const get = n => { if(!P.has(n)) P.set(n,{name:n,msgs:0,words:0,media:0,deleted:0,emojis:{},emojiCount:0,questions:0,night:0,starters:0,replies:[],doubles:0,laughs:0,hearts:0}); return P.get(n); };
  const hours = new Array(24).fill(0);
  const days = new Map();
  let longest = {gap:0,from:0,to:0};
  let prev = null;
  for (const m of msgs){
    const p = get(m.name);
    p.msgs++;
    const isMedia = MEDIA_RE.test(m.text) && m.text.length<80;
    const isDel = DELETED_RE.test(m.text);
    if (isMedia) p.media++; else if (isDel) p.deleted++;
    else {
      p.words += m.text.trim().split(/\s+/).filter(Boolean).length;
      const em = m.text.match(EMOJI_RE); if (em){ p.emojiCount+=em.length; for(const e of em) p.emojis[e]=(p.emojis[e]||0)+1; }
      if (m.text.includes('?')) p.questions++;
      if (LAUGH_RE.test(m.text)) p.laughs++;
      if (HEART_RE.test(m.text)) p.hearts++;
    }
    const d = new Date(m.t); const hr = d.getHours();
    hours[hr]++; if (hr<5) p.night++;
    const dk = d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
    days.set(dk,(days.get(dk)||0)+1);
    if (prev){
      const gap = m.t - prev.t;
      if (gap>longest.gap) longest={gap,from:prev.t,to:m.t};
      if (gap>6*H) p.starters++;
      if (prev.name!==m.name && gap<12*H) p.replies.push(gap);
      if (prev.name===m.name && gap<10*60e3) p.doubles++;
    } else p.starters++;
    prev = m;
  }
  const persons = [...P.values()].sort((a,b)=>b.msgs-a.msgs);
  persons.forEach((p,i)=>{ p.idx=i; p.medianReply=median(p.replies); p.topEmojis=Object.entries(p.emojis).sort((a,b)=>b[1]-a[1]).slice(0,5).map(e=>e[0]); p.wpm = (p.msgs-p.media-p.deleted)>0 ? p.words/(p.msgs-p.media-p.deleted) : 0; });
  const total = msgs.length;
  const first = msgs[0].t, last = msgs[msgs.length-1].t;
  const spanDays = Math.max(1,(last-first)/DAY);
  const months = [];
  const fd = new Date(first), ld = new Date(last);
  let cy=fd.getFullYear(), cm=fd.getMonth();
  const idxOf = new Map(persons.map(p=>[p.name,p.idx]));
  const mIndex = new Map();
  while (cy<ld.getFullYear() || (cy===ld.getFullYear() && cm<=ld.getMonth())){
    const key=cy+'-'+cm; mIndex.set(key,months.length);
    months.push({key,y:cy,m:cm,counts:new Array(persons.length).fill(0)});
    cm++; if(cm>11){cm=0;cy++;}
    if (months.length>240) break;
  }
  for (const m of msgs){ const d=new Date(m.t); const i=mIndex.get(d.getFullYear()+'-'+d.getMonth()); if(i!=null) months[i].counts[idxOf.get(m.name)]++; }
  const cut1 = first + (last-first)/3, cut2 = first + 2*(last-first)/3;
  const early = new Array(persons.length).fill(0), late = new Array(persons.length).fill(0);
  for (const m of msgs){ if (m.t<=cut1) early[idxOf.get(m.name)]++; else if (m.t>=cut2) late[idxOf.get(m.name)]++; }
  const third = Math.max(1,spanDays/3);
  const eSum = early.reduce((a,b)=>a+b,0)||1, lSum = late.reduce((a,b)=>a+b,0)||1;
  const change = { earlyPerDay: eSum/third, latePerDay: lSum/third,
    persons: persons.map((p,i)=>({name:p.name, idx:i, early:early[i]/eSum, late:late[i]/lSum})) };
  const totStart = persons.reduce((a,p)=>a+p.starters,0)||1;
  const speeds = persons.map(p=> p.medianReply==null ? 0 : 1/(p.medianReply/60e3 + 2));
  const spSum = speeds.reduce((a,b)=>a+b,0)||1;
  const raw = persons.map((p,i)=> .4*(p.msgs/total) + .3*(p.starters/totStart) + .3*(speeds[i]/spSum));
  const rSum = raw.reduce((a,b)=>a+b,0)||1;
  persons.forEach((p,i)=>{ p.invest = raw[i]/rSum; });
  let busiest = {k:null,n:0}; for (const [k,n] of days) if(n>busiest.n) busiest={k,n};
  const peakHour = hours.indexOf(Math.max(...hours));
  const doubleKing = [...persons].sort((a,b)=>b.doubles-a.doubles)[0];
  const nightOwl = [...persons].sort((a,b)=>b.night-a.night)[0];
  return { msgs, persons, total, first, last, spanDays, months, hours, change, longest, busiest, peakHour, doubleKing, nightOwl, activeDays: days.size };
}
