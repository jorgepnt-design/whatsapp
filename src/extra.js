import { MEDIA_RE, DELETED_RE } from './parser.js';
import { DAY } from './analysis.js';

export const JUNK_RE = /\S{45,}/;
export const dayNum = t => { const d = new Date(t); return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())/DAY); };
export const fmtLong = t => new Date(t).toLocaleDateString('de-DE',{day:'numeric',month:'long',year:'numeric'});
export const isMedia = m => MEDIA_RE.test(m.text) && m.text.length<80;
export const STOPWORDS = new Set(('aber alle allem allen aller alles als also am an ander andere anderen auch auf aus bei beim bin bis bist bitte da dabei dafür dagegen daher damit dann darauf darum das dass dein deine deinem deinen deiner dem den denn der des dich die dies diese diesem diesen dieser dir doch dort du durch ein eine einem einen einer eines einfach er es etwas euch euer eure für gab ganz gar gibt gerade geht gut habe haben hab hast hat hatte hätte hier hin ich ihm ihn ihr ihre im immer in ist ja jetzt kann kannst kein keine man mal mehr mein meine meinem meinen mich mir mit muss nach nicht nichts noch nur ob oder ohne schon sehr sein seine sich sie sind so soll sollen sondern um und uns unser unsere unter viel vom von vor war waren warst was weil weiß wenn wer werde werden wie wieder will wir wird wo wohl zu zum zur über okay oki gerne heute morgen dann denn eben halt naja nee nein ach oh ah hm hmm haha hahaha hihi lol xd ok jaa jaja wieso warum weshalb also klar sicher ganz echt total voll schon wirklich vielleicht nochmal mehr weniger kurz lang gleich grad grade glaube denke finde sagen sagt gesagt machen macht gemacht mache kommt komme kommen geht gehen gehe sehen sieht wäre würde könnte könnt kannst müssen musst dir dich euch uns the and you that this for are was with have just not but what your all can get will its it’s dont don’t i’m im yes yeah medien ausgeschlossen weggelassen omitted media image video audio sticker nachricht gelöscht gelöschte bearbeitet null https http www com').split(' '));
export const WORD_RE = /[\p{L}][\p{L}'’-]{2,}/gu;

export function longestStreak(a){
  const ds = [...new Set(a.msgs.map(m=>dayNum(m.t)))].sort((x,y)=>x-y);
  let best = ds.length ? 1 : 0, run = 1;
  for (let i=1;i<ds.length;i++){ run = ds[i]===ds[i-1]+1 ? run+1 : 1; if (run>best) best = run; }
  return best;
}

export function topWords(a, n=10){
  const names = new Set(a.persons.flatMap(p=>p.name.toLowerCase().split(/\s+/)));
  const c = new Map();
  for (const m of a.msgs){
    if (isMedia(m) || DELETED_RE.test(m.text) || JUNK_RE.test(m.text)) continue;
    for (const w of m.text.toLowerCase().replace(/https?:\S+/g,'').match(WORD_RE)||[]){
      const k = w.replace(/['’-]+$/,'');
      if (k.length<3 || STOPWORDS.has(k) || names.has(k)) continue;
      c.set(k,(c.get(k)||0)+1);
    }
  }
  return [...c].sort((x,y)=>y[1]-x[1]).slice(0,n);
}

export function topEmojis(a, n=8){
  const e = new Map();
  for (const p of a.persons) for (const [k,v] of Object.entries(p.emojis)) e.set(k,(e.get(k)||0)+v);
  return [...e].sort((x,y)=>y[1]-x[1]).slice(0,n);
}
