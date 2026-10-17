import React, { useState } from 'react';
import htm from 'htm';

const html = htm.bind(React.createElement);

// Angaben des Betreibers. Leere Felder erscheinen auf den Seiten als markierter Platzhalter.
export const OPERATOR = {
  name: 'Jorge Pinto', // Vor- und Nachname (bzw. Firma mit Rechtsform und Vertretungsberechtigtem)
  phone: '',           // optional
  updated: 'Oktober 2026'
};

export const LEGAL_PAGES = {
  kontakt: 'Kontakt',
  agb: 'Nutzungsbedingungen',
  datenschutz: 'Datenschutzerklärung'
};

const O = OPERATOR;
const F = (v, label) => v ? v : html`<mark className="ph">[${label}]</mark>`;
const Address = () => html`<p>${F(O.name,'Vor- und Nachname')}</p>`;

function Terms(){
  return html`<div>
    <p className="muted">Stand: ${O.updated}</p>
    <h2>1. Anbieter und Geltungsbereich</h2>
    <p>Diese Bedingungen gelten für die Nutzung der Website Chatlupe, die von ${F(O.name,'Vor- und Nachname')} (im Folgenden „wir“) betrieben wird. Du erreichst uns über das <a href="#kontakt">Kontaktformular</a>.</p>
    <h2>2. Leistungen</h2>
    <p>Chatlupe wertet einen von dir hochgeladenen WhatsApp-Export statistisch aus. Diese Auswertung läuft vollständig in deinem Browser. Auf Wunsch schreibt eine KI (Claude von Anthropic) anschließend einen Report über deinen Chat. Die Nutzung ist kostenlos.</p>
    <p>Die Reports dienen der Unterhaltung. Sie sind keine psychologische, therapeutische oder rechtliche Beratung. Eine KI kann sich irren, Dinge falsch deuten oder überspitzen. Die Reports werden automatisch erzeugt und geben keine Meinung des Betreibers wieder.</p>
    <h2>3. Verfügbarkeit</h2>
    <p>Wir bemühen uns um einen störungsfreien Betrieb, schulden aber keine bestimmte Verfügbarkeit. Wir können den Dienst jederzeit ändern, einschränken oder einstellen, insbesondere die Zahl der KI-Reports begrenzen, um Missbrauch zu verhindern.</p>
    <h2>4. Speicherung</h2>
    <p>Wir speichern weder deinen Chat noch den Report. Sichere den Report deshalb selbst, zum Beispiel über „Report teilen“. Nach dem Schließen der Seite ist er weg.</p>
    <h2>5. Deine Pflichten</h2>
    <p>Lade nur Chats hoch, an denen du selbst teilgenommen hast und die du verwenden darfst. Berücksichtige die Interessen der anderen Personen im Chat, insbesondere wenn du einen Report mit ihnen teilst. Nutze Chatlupe nicht für rechtswidrige Zwecke und versuche nicht, die Begrenzungen des Dienstes zu umgehen.</p>
    <h2>6. Haftung</h2>
    <p>Da der Dienst unentgeltlich ist, haften wir nur für Vorsatz und grobe Fahrlässigkeit sowie unbeschränkt bei Verletzung von Leben, Körper oder Gesundheit und nach dem Produkthaftungsgesetz.</p>
    <h2>7. Schlussbestimmungen</h2>
    <p>Es gilt deutsches Recht. Bist du Verbraucher, bleiben zwingende Schutzvorschriften des Staates, in dem du deinen gewöhnlichen Aufenthalt hast, unberührt. Sollte eine Bestimmung unwirksam sein, bleiben die übrigen wirksam.</p>
  </div>`;
}

function Datenschutz(){
  return html`<div>
    <p className="muted">Stand: ${O.updated}</p>
    <h2>1. Verantwortlicher</h2>
    <${Address}/>
    <p>Kontakt: über das <a href="#kontakt">Kontaktformular</a> auf dieser Website.</p>
    <h2>2. Das Wichtigste in Kürze</h2>
    <ul>
      <li>Die Statistik zu deinem Chat wird ausschließlich in deinem Browser berechnet. Dein Chat wird dafür nicht hochgeladen und nicht gespeichert.</li>
      <li>Nur wenn du einen KI-Report erstellen lässt, gehen die Statistik und ein Ausschnitt von rund 220 Nachrichten über unseren Server an Anthropic, damit die KI den Text schreiben kann.</li>
      <li>Wir setzen keine Cookies und keine Analyse- oder Werbedienste ein.</li>
    </ul>
    <h2>3. Hosting und Server-Protokolle</h2>
    <p>Die Website wird bei Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA, gehostet. Beim Aufruf der Seite verarbeitet Vercel technisch notwendige Daten wie IP-Adresse, Datum und Uhrzeit, aufgerufene Adresse, Browser und Betriebssystem, um die Seite auszuliefern und vor Missbrauch zu schützen. Rechtsgrundlage ist unser berechtigtes Interesse an einem sicheren und stabilen Betrieb (Art. 6 Abs. 1 lit. f DSGVO). Die Protokolle werden nur so lange aufbewahrt, wie es dafür nötig ist. Die Übermittlung in die USA stützt sich auf das EU-US Data Privacy Framework bzw. auf EU-Standardvertragsklauseln.</p>
    <p>Um Missbrauch des Report-Dienstes zu verhindern, merkt sich unser Server die IP-Adresse von Anfragen für höchstens 10 Minuten im Arbeitsspeicher. Sie wird nicht dauerhaft gespeichert.</p>
    <h2>4. Auswertung deines Chats im Browser</h2>
    <p>Die Datei oder der Text, den du einfügst, wird in deinem Browser gelesen und ausgewertet. Wir erhalten davon nichts. Namen, die du unter „Namen aufräumen“ vergibst, bleiben ebenfalls in deinem Browser. Beim Schließen der Seite sind alle Daten weg.</p>
    <h2>5. KI-Report (Anthropic)</h2>
    <p>Lässt du einen Report erstellen, übermitteln wir dafür folgende Daten an Anthropic (Anthropic PBC, USA, bzw. Anthropic Ireland, Limited): die berechneten Kennzahlen (zum Beispiel Nachrichtenanzahl, Antwortzeiten, Emojis), die Namen der Teilnehmenden, wie sie im Chat bzw. nach deiner Bearbeitung stehen, die gewählte Art des Chats, Sprache und Ton sowie einen Ausschnitt mit den ersten 50 und den letzten 170 Nachrichten samt Zeitstempel und Absendernamen.</p>
    <p>Rechtsgrundlage ist die Bereitstellung des von dir angeforderten Dienstes (Art. 6 Abs. 1 lit. b DSGVO). Soweit der Ausschnitt Nachrichten anderer Personen aus dem Chat enthält, stützen wir die Verarbeitung auf unser und dein berechtigtes Interesse an der gewünschten Auswertung (Art. 6 Abs. 1 lit. f DSGVO); wir übermitteln dafür nur einen begrenzten Ausschnitt und speichern nichts. Nach den Angaben von Anthropic werden Daten aus der API nicht zum Training der Modelle verwendet und nur für begrenzte Zeit gespeichert. Die Übermittlung in die USA stützt sich auf das EU-US Data Privacy Framework bzw. auf EU-Standardvertragsklauseln. Wir selbst speichern weder den Ausschnitt noch den fertigen Report.</p>
    <h2>6. Schriften und lokale Speicherung</h2>
    <p>Alle Schriften werden von unserem eigenen Server geladen; es findet keine Verbindung zu Google statt. Die Website verwendet weder Cookies noch den lokalen Speicher deines Browsers.</p>
    <h2>7. Kontaktformular</h2>
    <p>Wenn du uns über das Kontaktformular schreibst, verarbeiten wir deine Nachricht sowie freiwillig angegebenen Namen und E-Mail-Adresse, um dein Anliegen zu beantworten (Art. 6 Abs. 1 lit. b bzw. f DSGVO). Die Nachricht wird über den Versanddienst Resend (Resend, Inc., USA) als E-Mail an unser Postfach bei Google (Gmail) zugestellt. Die Übermittlung in die USA stützt sich auf das EU-US Data Privacy Framework bzw. auf EU-Standardvertragsklauseln. Wir löschen die Nachricht, wenn sie nicht mehr benötigt wird. Um Missbrauch zu verhindern, merkt sich unser Server die IP-Adresse von Anfragen für höchstens eine Stunde im Arbeitsspeicher.</p>
    <h2>8. Deine Rechte</h2>
    <p>Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21). Schreib uns dafür über das <a href="#kontakt">Kontaktformular</a>. Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren, zum Beispiel bei der Behörde deines Wohnorts oder der für uns zuständigen Behörde: Der Hessische Beauftragte für Datenschutz und Informationsfreiheit, Wiesbaden.</p>
    <h2>9. Änderungen</h2>
    <p>Wir passen diese Datenschutzerklärung an, wenn sich die Website oder die Rechtslage ändert. Es gilt die jeweils hier veröffentlichte Fassung.</p>
  </div>`;
}


function Kontakt(){
  const [f,setF] = useState({name:'', email:'', message:'', website:''});
  const [st,setSt] = useState('idle');
  const [err,setErr] = useState('');
  const set = k => e => setF(o=>({...o, [k]:e.target.value}));
  async function send(e){
    e.preventDefault();
    setSt('sending'); setErr('');
    try{
      const r = await fetch('/api/kontakt', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(f) });
      const d = await r.json().catch(()=>({}));
      if (r.ok) { setSt('sent'); return; }
      setErr({
        message_missing:'Bitte schreib eine Nachricht.',
        email_invalid:'Die E-Mail-Adresse sieht nicht richtig aus.',
        rate_limited:'Du hast gerade mehrere Nachrichten geschickt. Versuch es später noch einmal.',
        not_configured:'Das Kontaktformular ist noch nicht eingerichtet.'
      }[d.error] || 'Die Nachricht konnte nicht gesendet werden. Versuch es später noch einmal.');
    }catch{ setErr('Keine Verbindung. Versuch es später noch einmal.'); }
    setSt('idle');
  }
  if (st==='sent') return html`<div className="contact-ok"><b>Danke, deine Nachricht ist angekommen.</b><p>Wenn du eine E-Mail-Adresse angegeben hast, melden wir uns dort.</p></div>`;
  return html`<form className="contact" onSubmit=${send}>
    <p>Fragen, Feedback oder ein Anliegen zum Datenschutz? Schreib uns hier.</p>
    <label>Name <span className="muted">(freiwillig)</span><input className="field" value=${f.name} onInput=${set('name')} maxLength="100" autoComplete="name"/></label>
    <label>E-Mail-Adresse <span className="muted">(freiwillig, nur wenn du eine Antwort möchtest)</span><input className="field" type="email" value=${f.email} onInput=${set('email')} maxLength="200" autoComplete="email"/></label>
    <label>Nachricht<textarea className="field" required minLength="5" maxLength="5000" rows="6" value=${f.message} onInput=${set('message')}></textarea></label>
    <label className="hp" aria-hidden="true">Website<input tabIndex="-1" autoComplete="off" value=${f.website} onInput=${set('website')}/></label>
    ${err && html`<p className="err" role="alert">${err}</p>`}
    <div><button className="btn btn-ink" type="submit" disabled=${st==='sending'}>${st==='sending' ? 'Wird gesendet…' : 'Nachricht senden'}</button></div>
    <p className="muted small">Mit dem Absenden wird deine Nachricht per E-Mail an uns zugestellt. Mehr dazu in der <a href="#datenschutz">Datenschutzerklärung</a>.</p>
  </form>`;
}

const CONTENT = { kontakt:Kontakt, agb:Terms, datenschutz:Datenschutz };

export function LegalPage({page, onBack}){
  const Body = CONTENT[page];
  const missing = !O.name;
  return html`<div className="wrap legal">
    <header className="top"><button className="btn btn-ghost" onClick=${onBack}>← Zurück</button></header>
    <h1 className="legal-h">${LEGAL_PAGES[page]}</h1>
    ${missing && html`<p className="ph-note">Die markierten Angaben fehlen noch (in <code>src/legal.js</code>).</p>`}
    <div className="legal-body"><${Body}/></div>
    <${LegalLinks}/>
  </div>`;
}

export function LegalLinks(){
  return html`<nav className="legal-links" aria-label="Rechtliches">
    ${Object.entries(LEGAL_PAGES).map(([k,v])=>html`<a key=${k} href=${'#'+k}>${v}</a>`)}
  </nav>`;
}
