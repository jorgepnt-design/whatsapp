import { parseChat } from './parser.js';
import { H, DAY } from './analysis.js';

function mulberry(seed){ return function(){ seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function pickW(r,w){ const s=w.reduce((a,b)=>a+b,0); let x=r()*s; for(let i=0;i<w.length;i++){ x-=w[i]; if(x<=0) return i; } return w.length-1; }
function gauss(r){ return Math.sqrt(-2*Math.log(r()+1e-9))*Math.cos(2*Math.PI*r()); }
const lerp=(a,b,t)=>a+(b-a)*t;

export const SCENARIOS = [
  { id:'lea-tim', title:'Lea & Tim', tag:'Situationship', initials:'LT', seed:11, start:[2025,11,1], months:10,
    names:['Lea','Tim'],
    rate:t=>lerp(2.3,1.0,t), starter:t=>[lerp(.45,.78,t), lerp(.55,.22,t)],
    speed:(i,t)=> i===0 ? 4 : lerp(7,110,t), len:[3,12],
    hours:[2,1,.6,.2,.1,.1,.2,.6,1,1,1,1.2,1.4,1,1,1.1,1.3,1.6,2.2,2.8,3.2,3.4,3.2,2.6],
    pools:[
      ['Bist du heute Abend da?','haha okay 😂','Ich hab an dich gedacht 🙈','Wie war dein Tag?','Sollen wir am Wochenende was machen?','Schläfst du schon?','Du bist so doof 😂❤️','Hab den Film ohne dich angefangen 😤','Alles gut bei dir?','Okay.','Meld dich einfach','Ich vermiss dich irgendwie 🥺','Gute Nacht 🌙','Hast du meine Sprachnachricht gehört?','Hahaha nein 😂','Wann hast du Zeit?','Bin wach 👀'],
      ['Sorry, war beim Training','ja klar','mal schauen','haha','Bin gerade voll im Stress','Klingt gut 👍','Morgen vielleicht?','Was machst du so?','Bin müde','Hab grad erst gesehen','Lass mal telefonieren','Du auch 😊','Hab ich voll vergessen sorry','Bei mir passt Samstag','Gute Nacht'] ],
    shared:['ok','Ja','😂','Wann?','Bis später','Haha','Okay','<Medien ausgeschlossen>'] },
  { id:'familie', title:'Familie Kowalski', tag:'Familie', initials:'FK', seed:23, start:[2025,10,1], months:12,
    names:['Mama','Nele','Papa','Ben'],
    rate:t=>lerp(1.4,1.7,t), starter:t=>[.62,.2,.13,.05],
    speed:(i,t)=>[6,12,30,lerp(180,90,t)][i], len:[3,9],
    hours:[0,0,0,0,0,.1,.6,1.6,2,1.4,1,1.1,1.6,1.2,.9,1,1.3,1.8,2.2,2.2,1.8,1.2,.6,.2],
    pools:[
      ['Wer kommt Sonntag zum Essen?','Habt ihr gut geschlafen? ☀️','Bitte zurückrufen!!','Ich hab Kuchen gebacken 🍰😋','Denkt an Omas Geburtstag 🎂🎉','Seid ihr gut angekommen? 🙏','Zieht euch warm an 🧣❄️','Wer hat den Schlüssel?','Ich bin stolz auf euch ❤️❤️','Gute Nacht ihr Lieben 😘','Hat jemand mein Handyladekabel gesehen?','Schöne Woche euch 🌻'],
      ['Bin dabei!','Mama 😂','Kann jemand Ben wecken','Ich bring Salat mit','Love you 🥰','Wer holt mich vom Bahnhof ab?','Hahaha','Sonntag geht bei mir'],
      ['Der Rasen muss gemäht werden.','Ok.','Ruf mal an','👍','Bin im Keller','Spiel läuft gleich','Auto ist in der Werkstatt','Gut.'],
      ['jo','später','hab kein Akku','was gibts zu essen','👍','bin unterwegs','ok'] ],
    shared:['👍','Ja','Danke','<Medien ausgeschlossen>','😂'] },
  { id:'wg', title:'WG Bergstraße', tag:'Gruppe', initials:'WG', seed:37, start:[2026,1,1], months:8,
    names:['Jana','Malik','Sophie'],
    rate:t=>lerp(1.6,1.2,t), starter:t=>[.45,.35,lerp(.3,.08,t)],
    speed:(i,t)=>[15,9,lerp(20,240,t)][i], len:[2,8],
    hours:[.6,.3,.1,0,0,0,.2,.8,1,.8,.7,.9,1.3,1.1,1,1.1,1.4,1.8,2.2,2.4,2.2,1.8,1.3,.9],
    pools:[
      ['Wer hat das Klopapier leer gemacht? 🧻','Putzplan: Bad ist diese Woche Malik','Spülmaschine ist voll','Miete ist raus','Leise bitte, Klausur morgen 🙏','Wer kauft Milch?','Paket für dich ist da 📦'],
      ['Pizza heute? 🍕','Ich hab Nudeln übrig','Party Samstag?? 🎉','Kann jemand die Heizung anmachen','Bin in 10 Min da','Haha sorry 😅','Haustür stand offen!'],
      ['Bin heute bei meinem Freund','Sorry, sehe es erst jetzt','Kann ich nächste Woche machen?','Ich bin am Wochenende weg','ok','Hab ich gemacht 👍'] ],
    shared:['ok','😂','Ja','Danke!','<Medien ausgeschlossen>','Wer?'] }
];

export function makeDemo(sc){
  const r = mulberry(sc.seed);
  const start = new Date(sc.start[0], sc.start[1]-1, sc.start[2]);
  const end = new Date(start); end.setMonth(end.getMonth()+sc.months);
  const totalDays = Math.round((end-start)/DAY);
  const lines = [];
  const pad = n => String(n).padStart(2,'0');
  const fmt = (t,name,text)=>{ const d=new Date(t); return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${String(d.getFullYear()).slice(2)}, ${pad(d.getHours())}:${pad(d.getMinutes())} - ${name}: ${text}`; };
  const n = sc.names.length;
  for (let dI=0; dI<totalDays; dI++){
    const tt = dI/totalDays;
    const sessions = Math.floor(sc.rate(tt)*(0.3+r()*1.4) + r()*0.5);
    const dayT = start.getTime() + dI*DAY;
    const used = [];
    for (let s=0;s<sessions;s++){
      let hour = pickW(r, sc.hours);
      if (used.includes(hour)) hour = (hour+3)%24; used.push(hour);
      let t = dayT + hour*H + Math.floor(r()*55)*60e3;
      let who = pickW(r, sc.starter(tt));
      const L = sc.len[0] + Math.floor(r()*(sc.len[1]-sc.len[0]+1));
      for (let k=0;k<L;k++){
        const pool = r()<0.72 ? sc.pools[who] : sc.shared;
        lines.push(fmt(t, sc.names[who], pool[Math.floor(r()*pool.length)]));
        let next = who;
        if (n===2){ if (r()<0.72) next = 1-who; }
        else if (r()<0.75){ const w = sc.starter(tt).map((x,i)=> i===who?0:x+.15); next = pickW(r,w); }
        const delay = next===who ? (0.3+r()*2) : Math.max(0.3, sc.speed(next,tt)*Math.exp(gauss(r)*0.9));
        t += delay*60e3; who = next;
      }
    }
  }
  return parseChat(lines.join('\n'));
}
