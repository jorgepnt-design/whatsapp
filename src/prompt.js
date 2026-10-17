import { MEDIA_RE } from './parser.js';
import { pct, fmtDate, fmtDur } from './format.js';
import { kindById } from './kinds.js';

export const TONES = {
  ehrlich:{label:'Ehrlich', desc:'direkt und ehrlich, aber fair, mit trockenem Humor'},
  liebevoll:{label:'Liebevoll', desc:'warm, wohlwollend und ermutigend'},
  frech:{label:'Frech', desc:'frech und spitz wie eine gute Freundin, die kein Blatt vor den Mund nimmt, aber nie verletzend: keine Beleidigungen, nichts über Aussehen oder Gesundheit'}
};
export function buildPrompt(a, tone, title, kind, lang='Deutsch'){
  const k = kindById(kind);
  const people = a.persons.slice(0,6).map(p=>({
    name:p.name, nachrichten:p.msgs, anteil:pct(p.msgs/a.total), woerterProNachricht:+p.wpm.toFixed(1),
    gespraechsstarter:p.starters, medianAntwortzeit:fmtDur(p.medianReply), nachtnachrichten:p.night,
    fragen:p.questions, lacher:p.laughs, herzen:p.hearts, doppelNachrichten:p.doubles, topEmojis:p.topEmojis.join(''),
    investitionsScore:pct(p.invest)
  }));
  const stats = { chat:title, zeitraum: fmtDate(a.first)+' bis '+fmtDate(a.last), nachrichtenGesamt:a.total,
    nachrichtenProTag:{frueher:+a.change.earlyPerDay.toFixed(1), jetzt:+a.change.latePerDay.toFixed(1)},
    anteilFrueherVsJetzt:a.change.persons.slice(0,6).map(p=>({name:p.name, frueher:pct(p.early), jetzt:pct(p.late)})),
    laengsteFunkstille:fmtDur(a.longest.gap), personen:people };
  const fmtLine = m => { const d=new Date(m.t); return `[${d.toLocaleDateString('de-DE')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}] ${m.name}: ${(MEDIA_RE.test(m.text)&&m.text.length<80)?'[Medien]':m.text.replace(/\n/g,' ').slice(0,220)}`; };
  const head = a.msgs.slice(0,50).map(fmtLine), tail = a.msgs.slice(-170).map(fmtLine);
  let excerpt = a.msgs.length<=220 ? a.msgs.map(fmtLine).join('\n') : head.join('\n')+'\n[…]\n'+tail.join('\n');
  if (excerpt.length>42000) excerpt = excerpt.slice(-42000);
  const names = people.map(p=>p.name).join(', ');
  return `Du bist Chatlupe, eine scharfsinnige Beobachterin von Chatverläufen. Lies die Statistiken und den Ausschnitt eines WhatsApp-Chats und sag der Person, die ihn hochgeladen hat, was du wirklich darüber denkst.

${k ? `Art des Chats laut Nutzer: ${k.label} (${k.hint}). Deute Rollen und Dynamik passend dazu.\n\n` : ''}Ton: ${TONES[tone].desc}. Schreib den gesamten Text auf ${lang} und sprich die Person locker und direkt an (auf Deutsch: duzen). Namen bleiben unverändert. Stütze jede Aussage auf die Zahlen oder den Ausschnitt, erfinde nichts. Keine Diagnosen, keine Ratschläge zu Trennung oder Ähnlichem als Tatsache formuliert.

STATISTIKEN (JSON):
${JSON.stringify(stats)}

AUSSCHNITT (Anfang und Ende des Chats):
${excerpt}

Schreib daraus einen Report im Stil einer pointierten Kolumne: Du erzählst in der Ich-Form als Chatlupe, mit konkreten Beobachtungen, Zahlen und kurzen Zitaten aus dem Ausschnitt. Insgesamt etwa 700 bis 900 Wörter.
Aufbau: eine Überschrift, eine Einleitung aus 3 bis 4 Absätzen, dann 4 bis 6 Kapitel. Jede der wichtigsten Personen (höchstens 4) bekommt ein eigenes Kapitel, ein Kapitel handelt davon, was sich zwischen früher und jetzt verändert hat. Am Ende ein Tipp.

Antworte nur mit einem JSON-Objekt in genau dieser Form:
{"titel":"pointierte Überschrift, max. 12 Wörter, darf mit 1-2 Emojis enden","untertitel":"ein Satz, worum es in diesem Chat eigentlich geht","intro":["Absatz","Absatz","Absatz"],"kapitel":[{"emoji":"ein passendes Emoji","titel":"Kapitelüberschrift, max. 8 Wörter","absaetze":["Absatz","Absatz"]}],"personen":[{"name":"exakt einer der Namen: ${names}","rolle":"2-4 Wörter"}],"tipp":"1-2 Sätze"}
Nimm jede der genannten Personen genau einmal in "personen" auf. Absätze sind normale Sätze ohne Markdown.`;
}
