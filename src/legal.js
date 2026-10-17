import React from 'react';
import htm from 'htm';

const html = htm.bind(React.createElement);

// Angaben des Betreibers. Leere Felder erscheinen auf den Seiten als markierter Platzhalter.
export const OPERATOR = {
  name: 'Jorge Pinto', // Vor- und Nachname (bzw. Firma mit Rechtsform und Vertretungsberechtigtem)
  street: 'Heidelberger Landstr. 247', // Straße und Hausnummer (keine Postfachadresse)
  city: '64297 Darmstadt', // PLZ und Ort
  country: 'Deutschland',
  email: 'jorgepnt@web.de', // E-Mail-Adresse für Kontakt und Widerruf
  phone: '',           // optional
  vatId: '',           // USt-IdNr., falls vorhanden
  smallBusiness: true, // Kleinunternehmer nach § 19 UStG (keine Umsatzsteuer im Preis)
  updated: 'Oktober 2026'
};

export const LEGAL_PAGES = {
  impressum: 'Impressum',
  agb: 'AGB',
  widerruf: 'Widerrufsbelehrung',
  datenschutz: 'Datenschutzerklärung'
};

const O = OPERATOR;
const F = (v, label) => v ? v : html`<mark className="ph">[${label}]</mark>`;
const Address = () => html`<p>${F(O.name,'Vor- und Nachname')}<br/>${F(O.street,'Straße und Hausnummer')}<br/>${F(O.city,'PLZ und Ort')}<br/>${O.country}</p>`;
const Email = () => O.email ? html`<a href=${'mailto:'+O.email}>${O.email}</a>` : F('', 'E-Mail-Adresse');

function Impressum(){
  return html`<div>
    <h2>Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG)</h2>
    <${Address}/>
    <h2>Kontakt</h2>
    <p>E-Mail: <${Email}/>${O.phone && html`<br/>Telefon: ${O.phone}`}</p>
    <h2>Umsatzsteuer</h2>
    ${O.vatId ? html`<p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: ${O.vatId}</p>` : null}
    ${O.smallBusiness ? html`<p>Kleinunternehmer gemäß § 19 UStG. Es wird keine Umsatzsteuer berechnet und ausgewiesen.</p>` : !O.vatId ? html`<p>${F('','USt-IdNr. oder Hinweis zur Umsatzsteuer')}</p>` : null}
    <h2>Verbraucherstreitbeilegung</h2>
    <p>Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
    <h2>Haftung für Inhalte und Links</h2>
    <p>Die Inhalte dieser Seite werden mit Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität können wir dennoch keine Gewähr übernehmen. Die von der KI geschriebenen Reports sind automatisch erzeugt und geben keine Meinung des Betreibers wieder. Für Inhalte externer Seiten, auf die wir verlinken, sind ausschließlich deren Betreiber verantwortlich.</p>
  </div>`;
}

function Agb(){
  return html`<div>
    <p className="muted">Stand: ${O.updated}</p>
    <h2>1. Geltungsbereich und Anbieter</h2>
    <p>Diese Allgemeinen Geschäftsbedingungen gelten für alle Verträge über die Website Chatlupe zwischen dir und ${F(O.name,'Vor- und Nachname')}, ${F(O.street,'Straße und Hausnummer')}, ${F(O.city,'PLZ und Ort')} (im Folgenden „wir“). Abweichende Bedingungen gelten nur, wenn wir ihnen ausdrücklich zustimmen.</p>
    <h2>2. Leistungen</h2>
    <p>Chatlupe wertet einen von dir hochgeladenen WhatsApp-Export statistisch aus. Diese Auswertung ist kostenlos und läuft vollständig in deinem Browser.</p>
    <p>Kostenpflichtig ist der ausführliche Report: ein von einer KI (Claude von Anthropic) geschriebener Text über deinen Chat. Er wird nach der Zahlung erzeugt und in deinem Browser angezeigt. Innerhalb von 3 Stunden nach der Zahlung kannst du ihn für denselben Chat beliebig oft in einem anderen Ton neu schreiben lassen.</p>
    <p>Die Reports dienen der Unterhaltung. Sie sind keine psychologische, therapeutische oder rechtliche Beratung. Eine KI kann sich irren, Dinge falsch deuten oder überspitzen.</p>
    <h2>3. Vertragsschluss</h2>
    <p>Die Darstellung des Reports auf der Website ist noch kein verbindliches Angebot. Mit dem Abschluss der Zahlung über PayPal gibst du ein verbindliches Angebot zum Kauf eines Reports ab. Wir nehmen es an, indem wir den Report bereitstellen. Die Vertragssprache ist Deutsch. Der Vertragstext wird von uns nicht gespeichert.</p>
    <h2>4. Preise und Zahlung</h2>
    <p>Es gilt der beim Kauf angezeigte Preis. ${O.smallBusiness ? 'Nach § 19 UStG wird keine Umsatzsteuer berechnet.' : 'Alle Preise sind Endpreise und enthalten die gesetzliche Umsatzsteuer.'} Die Zahlung erfolgt über PayPal. Es gelten zusätzlich die Bedingungen von PayPal.</p>
    <h2>5. Bereitstellung und Speicherung</h2>
    <p>Der Report wird unmittelbar nach der Zahlung erzeugt und im Browser angezeigt. Wir speichern weder deinen Chat noch den Report. Sichere den Report deshalb selbst, zum Beispiel über „Report teilen“. Nach dem Schließen der Seite oder nach Ablauf der 3 Stunden können wir ihn nicht erneut bereitstellen.</p>
    <h2>6. Widerrufsrecht</h2>
    <p>Als Verbraucher hast du ein gesetzliches Widerrufsrecht. Einzelheiten stehen in der <a href="#widerruf">Widerrufsbelehrung</a>. Das Widerrufsrecht erlischt, wenn du vor dem Kauf ausdrücklich zustimmst, dass wir sofort mit der Ausführung beginnen, und bestätigst, dass du dadurch dein Widerrufsrecht verlierst.</p>
    <h2>7. Deine Pflichten</h2>
    <p>Lade nur Chats hoch, an denen du selbst teilgenommen hast und die du verwenden darfst. Berücksichtige die Interessen der anderen Personen im Chat, insbesondere wenn du einen Report mit ihnen teilst. Nutze Chatlupe nicht für rechtswidrige Zwecke.</p>
    <h2>8. Gewährleistung</h2>
    <p>Es gelten die gesetzlichen Vorschriften über digitale Produkte (§§ 327 ff. BGB). Wegen der Art der Leistung schulden wir keinen bestimmten Inhalt oder eine bestimmte Bewertung, wohl aber einen vollständigen, lesbaren Report zu deinem Chat.</p>
    <h2>9. Haftung</h2>
    <p>Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit, bei Verletzung von Leben, Körper oder Gesundheit sowie nach dem Produkthaftungsgesetz. Bei leichter Fahrlässigkeit haften wir nur für die Verletzung wesentlicher Vertragspflichten und begrenzt auf den vorhersehbaren, vertragstypischen Schaden. Im Übrigen ist die Haftung ausgeschlossen.</p>
    <h2>10. Schlussbestimmungen</h2>
    <p>Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Bist du Verbraucher, bleiben zwingende Schutzvorschriften des Staates, in dem du deinen gewöhnlichen Aufenthalt hast, unberührt. Sollte eine Bestimmung unwirksam sein, bleibt der Vertrag im Übrigen wirksam.</p>
  </div>`;
}

function Widerruf(){
  return html`<div>
    <h2>Widerrufsrecht</h2>
    <p>Du hast das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsschlusses.</p>
    <p>Um dein Widerrufsrecht auszuüben, musst du uns (${F(O.name,'Vor- und Nachname')}, ${F(O.street,'Straße und Hausnummer')}, ${F(O.city,'PLZ und Ort')}, E-Mail: <${Email}/>) mittels einer eindeutigen Erklärung (zum Beispiel per E-Mail) über deinen Entschluss, diesen Vertrag zu widerrufen, informieren. Du kannst dafür das unten stehende Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.</p>
    <p>Zur Wahrung der Widerrufsfrist reicht es aus, dass du die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absendest.</p>
    <h2>Folgen des Widerrufs</h2>
    <p>Wenn du diesen Vertrag widerrufst, haben wir dir alle Zahlungen, die wir von dir erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über deinen Widerruf bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das du bei der ursprünglichen Transaktion eingesetzt hast, es sei denn, mit dir wurde ausdrücklich etwas anderes vereinbart. In keinem Fall werden dir wegen dieser Rückzahlung Entgelte berechnet.</p>
    <h2>Vorzeitiges Erlöschen des Widerrufsrechts</h2>
    <p>Das Widerrufsrecht erlischt bei einem Vertrag über digitale Inhalte, wenn wir mit der Ausführung des Vertrags begonnen haben, nachdem du ausdrücklich zugestimmt hast, dass wir vor Ablauf der Widerrufsfrist mit der Ausführung beginnen, und du deine Kenntnis davon bestätigt hast, dass du durch deine Zustimmung mit Beginn der Ausführung dein Widerrufsrecht verlierst (§ 356 Abs. 5 BGB). Diese Zustimmung erteilst du vor dem Kauf über das Kontrollkästchen über dem PayPal-Knopf.</p>
    <h2>Muster-Widerrufsformular</h2>
    <div className="formbox">
      <p>(Wenn du den Vertrag widerrufen willst, fülle bitte dieses Formular aus und sende es zurück.)</p>
      <p>An ${F(O.name,'Vor- und Nachname')}, ${F(O.street,'Straße und Hausnummer')}, ${F(O.city,'PLZ und Ort')}, E-Mail: <${Email}/></p>
      <p>Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über die Bereitstellung der folgenden digitalen Inhalte: Chatlupe-Report</p>
      <p>Bestellt am (*): ____________<br/>Name des/der Verbraucher(s): ____________<br/>Anschrift des/der Verbraucher(s): ____________<br/>PayPal-Transaktionsnummer: ____________<br/>Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier): ____________<br/>Datum: ____________</p>
      <p>(*) Unzutreffendes streichen.</p>
    </div>
  </div>`;
}

function Datenschutz(){
  return html`<div>
    <p className="muted">Stand: ${O.updated}</p>
    <h2>1. Verantwortlicher</h2>
    <${Address}/>
    <p>E-Mail: <${Email}/></p>
    <h2>2. Das Wichtigste in Kürze</h2>
    <ul>
      <li>Die Statistik zu deinem Chat wird ausschließlich in deinem Browser berechnet. Dein Chat wird dafür nicht hochgeladen und nicht gespeichert.</li>
      <li>Nur wenn du den kostenpflichtigen Report kaufst, gehen die Statistik und ein Ausschnitt von rund 220 Nachrichten über unseren Server an Anthropic, damit die KI den Text schreiben kann.</li>
      <li>Für die Zahlung nutzen wir PayPal. Wir setzen selbst keine Cookies und keine Analyse- oder Werbedienste ein.</li>
    </ul>
    <h2>3. Hosting und Server-Protokolle</h2>
    <p>Die Website wird bei Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA, gehostet. Beim Aufruf der Seite verarbeitet Vercel technisch notwendige Daten wie IP-Adresse, Datum und Uhrzeit, aufgerufene Adresse, Browser und Betriebssystem, um die Seite auszuliefern und vor Missbrauch zu schützen. Rechtsgrundlage ist unser berechtigtes Interesse an einem sicheren und stabilen Betrieb (Art. 6 Abs. 1 lit. f DSGVO). Die Protokolle werden nur so lange aufbewahrt, wie es dafür nötig ist. Die Übermittlung in die USA stützt sich auf das EU-US Data Privacy Framework bzw. auf EU-Standardvertragsklauseln.</p>
    <p>Um Missbrauch des Report-Dienstes zu verhindern, merkt sich unser Server die IP-Adresse von Anfragen für höchstens 10 Minuten im Arbeitsspeicher. Sie wird nicht dauerhaft gespeichert.</p>
    <h2>4. Auswertung deines Chats im Browser</h2>
    <p>Die Datei oder der Text, den du einfügst, wird in deinem Browser gelesen und ausgewertet. Wir erhalten davon nichts. Namen, die du unter „Namen aufräumen“ vergibst, bleiben ebenfalls in deinem Browser. Beim Schließen der Seite sind alle Daten weg.</p>
    <h2>5. Kostenpflichtiger KI-Report (Anthropic)</h2>
    <p>Kaufst du einen Report, übermitteln wir zur Erstellung folgende Daten an Anthropic (Anthropic PBC, USA, bzw. Anthropic Ireland, Limited): die berechneten Kennzahlen (zum Beispiel Nachrichtenanzahl, Antwortzeiten, Emojis), die Namen der Teilnehmenden, wie sie im Chat bzw. nach deiner Bearbeitung stehen, die gewählte Art des Chats, Sprache und Ton sowie einen Ausschnitt mit den ersten 50 und den letzten 170 Nachrichten samt Zeitstempel und Absendernamen.</p>
    <p>Rechtsgrundlage ist die Erfüllung des Vertrags mit dir (Art. 6 Abs. 1 lit. b DSGVO). Soweit der Ausschnitt Nachrichten anderer Personen aus dem Chat enthält, stützen wir die Verarbeitung auf unser und dein berechtigtes Interesse an der gewünschten Auswertung (Art. 6 Abs. 1 lit. f DSGVO); wir übermitteln dafür nur einen begrenzten Ausschnitt und speichern nichts. Nach den Angaben von Anthropic werden Daten aus der API nicht zum Training der Modelle verwendet und nur für begrenzte Zeit gespeichert. Die Übermittlung in die USA stützt sich auf das EU-US Data Privacy Framework bzw. auf EU-Standardvertragsklauseln. Wir selbst speichern weder den Ausschnitt noch den fertigen Report.</p>
    <h2>6. Zahlung mit PayPal</h2>
    <p>Für die Zahlung nutzen wir PayPal (Europe) S.à r.l. et Cie, S.C.A., 22–24 Boulevard Royal, L-2449 Luxemburg. Erst wenn du die Bezahlseite des Reports öffnest, wird die Bezahlschaltfläche von PayPal geladen. Dabei erhält PayPal technische Daten wie deine IP-Adresse und kann eigene Cookies setzen. Bei der Zahlung verarbeitet PayPal deine Zahlungsdaten in eigener Verantwortung; Einzelheiten stehen in der Datenschutzerklärung von PayPal.</p>
    <p>Wir erhalten von PayPal eine Bestätigung der Zahlung mit Betrag, Zeitpunkt und Transaktionsnummer sowie die Angaben, die PayPal uns zu Käufern übermittelt (in der Regel Name und E-Mail-Adresse). Rechtsgrundlage ist die Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO). Diese Daten bewahren wir auf, solange gesetzliche Aufbewahrungspflichten bestehen (bis zu zehn Jahre nach § 147 AO und § 257 HGB).</p>
    <h2>7. Schriften und lokale Speicherung</h2>
    <p>Alle Schriften werden von unserem eigenen Server geladen; es findet keine Verbindung zu Google statt. Die Website verwendet weder Cookies noch den lokalen Speicher deines Browsers.</p>
    <h2>8. Kontakt per E-Mail</h2>
    <p>Wenn du uns schreibst, verarbeiten wir deine Angaben, um deine Anfrage zu beantworten (Art. 6 Abs. 1 lit. b bzw. f DSGVO), und löschen sie, wenn sie nicht mehr benötigt werden und keine Aufbewahrungspflichten bestehen.</p>
    <h2>9. Deine Rechte</h2>
    <p>Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21). Wende dich dafür an <${Email}/>. Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren, zum Beispiel bei der Behörde deines Wohnorts oder der für uns zuständigen Behörde: Der Hessische Beauftragte für Datenschutz und Informationsfreiheit, Wiesbaden.</p>
    <h2>10. Änderungen</h2>
    <p>Wir passen diese Datenschutzerklärung an, wenn sich die Website oder die Rechtslage ändert. Es gilt die jeweils hier veröffentlichte Fassung.</p>
  </div>`;
}

const CONTENT = { impressum:Impressum, agb:Agb, widerruf:Widerruf, datenschutz:Datenschutz };

export function LegalPage({page, onBack}){
  const Body = CONTENT[page];
  const missing = !O.name || !O.street || !O.city || !O.email;
  return html`<div className="wrap legal">
    <header className="top"><button className="btn btn-ghost" onClick=${onBack}>← Zurück</button></header>
    <h1 className="legal-h">${LEGAL_PAGES[page]}</h1>
    ${missing && html`<p className="ph-note">Die markierten Angaben fehlen noch und müssen vor dem Verkauf ergänzt werden (in <code>src/legal.js</code>).</p>`}
    <div className="legal-body"><${Body}/></div>
    <${LegalLinks}/>
  </div>`;
}

export function LegalLinks(){
  return html`<nav className="legal-links" aria-label="Rechtliches">
    ${Object.entries(LEGAL_PAGES).map(([k,v])=>html`<a key=${k} href=${'#'+k}>${v}</a>`)}
  </nav>`;
}
