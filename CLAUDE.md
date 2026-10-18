# Projekt-Hinweise für Claude

## iPhone-/Home-Bildschirm-Icons

Icons für den iOS-Home-Bildschirm immer so einbauen (bewährt in Chatlupe und CoroaPDF):

- Das Icon als **180 × 180 PNG** erzeugen: quadratisch, volle Fläche, keine Transparenz, keine eigenen abgerundeten Ecken (iOS rundet selbst ab).
- Das PNG **als Base64-Data-URI direkt in `index.html` einbetten**, nicht als separate Datei verlinken. Sonst zeigt iOS oft nur einen Buchstaben-Platzhalter:
  ```html
  <link rel="apple-touch-icon" href="data:image/png;base64,…" sizes="180x180" type="image/png">
  ```
- Zusätzlich im `<head>`:
  ```html
  <link rel="manifest" href="/manifest.webmanifest">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-title" content="App-Name">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="theme-color" content="#…">
  <link rel="icon" href="/icon-32.png" sizes="32x32" type="image/png">
  ```
- `public/manifest.webmanifest` mit Icons in 192 und 512 px (für Android) anlegen, PNGs in `public/`.
- Die Quelle des Icons liegt als SVG vor; die PNGs werden daraus gerendert (z. B. mit Playwright/Chromium-Screenshot in 32, 180, 192, 512 px).
- Nach dem Deploy prüfen, dass `data:image/png;base64` im ausgelieferten `index.html` steht.
- Nutzern sagen: altes Icon vom Home-Bildschirm löschen, Safari-Website-Daten der Seite löschen, Seite in Safari neu öffnen und „Zum Home-Bildschirm“ wählen.

## Immobilien-Exposés von Nicole Pinto (LOC-IN)

Jedes Exposé bzw. jede Verkaufsunterlage für LOC-IN — Strategic Location & Asset Advisory (Nicole Pinto) enthält **immer** auf der letzten Seite den folgenden Text, wörtlich und vollständig. Nicht kürzen oder umformulieren; Änderungen nur auf ausdrücklichen Wunsch.

Gestaltung: Abschnitt mit der Überschrift „KÄUFERPROVISION“ (die ersten drei Absätze, Einleitungssatz fett), danach die beiden Absätze zu Haftung und Vertraulichkeit etwas zurückgenommen (z. B. hellere Schriftfarbe). Bei Wohnimmobilien (Wohnung/Einfamilienhaus) an Verbraucher vorher auf §§ 656a–d BGB hinweisen, weil die Käuferprovision dort nicht frei vereinbart werden darf.

```text
KÄUFERPROVISION

Der Erwerb ist mit einer Käuferprovision verbunden. Bei Erwerb eines oder mehrerer der angebotenen Objekte – einzeln, in Teilpaketen oder als Gesamtportfolio – zahlt der Käufer an LOC-IN eine Provision, die je nach Höhe des Kaufpreises zwischen 3 % und 5 % des im notariellen Kaufvertrag vereinbarten Gesamtkaufpreises beträgt, jeweils zuzüglich der gesetzlichen Umsatzsteuer (derzeit 19 %). Der für das jeweilige Objekt maßgebliche Provisionssatz wird dem Interessenten vor Übermittlung des objektbezogenen Unterlagensatzes und vor einer Besichtigung in Textform mitgeteilt.

Der Provisionsanspruch entsteht mit Abschluss eines wirksamen Kaufvertrags, der auf dem Nachweis oder der Vermittlung durch LOC-IN beruht, und ist mit dessen Abschluss fällig. Er besteht auch bei einem wirtschaftlich gleichwertigen Geschäft, insbesondere beim Erwerb von Anteilen an der Eigentümergesellschaft (Share Deal), bei Bestellung eines Erbbaurechts oder beim Erwerb durch eine mit dem Interessenten rechtlich oder wirtschaftlich eng verbundene Person oder Gesellschaft.

Mit der Anforderung weiterer Unterlagen, der Vereinbarung einer Besichtigung oder der sonstigen Inanspruchnahme der Tätigkeit von LOC-IN in Kenntnis dieses Provisionsverlangens kommt ein Maklervertrag zu den vorstehenden Bedingungen zustande. Ist dem Empfänger ein Objekt bereits bekannt, bitten wir um Mitteilung unter Angabe der Quelle innerhalb von fünf Werktagen in Textform. LOC-IN kann auch für die Verkäuferseite provisionspflichtig tätig sein. Verbrauchern steht ein gesetzliches Widerrufsrecht zu; die Widerrufsbelehrung wird vor Abschluss des Maklervertrags gesondert in Textform übermittelt.

Alle Angaben in diesem Portfolio-Exposé beruhen auf Unterlagen und Auskünften der jeweiligen Eigentümer sowie auf den zugrunde liegenden Objektexposés und wurden mit Sorgfalt zusammengestellt. Wo Angaben aus informellen Quellen oder öffentlich zugänglichen Betreiberinformationen stammen, ist dies im jeweiligen Kapitel gekennzeichnet. Für Richtigkeit und Vollständigkeit übernimmt LOC-IN keine Gewähr; die Haftung für Vorsatz und grobe Fahrlässigkeit sowie für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit bleibt unberührt. Zwischenverkauf, Irrtum und Änderungen bleiben vorbehalten.

Die genauen Objektanschriften werden aus Gründen der Vertraulichkeit erst nach Unterzeichnung der Vertraulichkeitserklärung mitgeteilt; Besichtigungen erfolgen ausschließlich nach Terminvereinbarung und in Begleitung von LOC-IN. Dieses Exposé ist vertraulich und ausschließlich für den Empfänger bestimmt. Eine Weitergabe an Dritte bedarf der vorherigen Zustimmung von LOC-IN; kommt infolge einer unbefugten Weitergabe ein Kaufvertrag mit einem Dritten zustande, haftet der Empfänger auf Ersatz des entstandenen Schadens.
```

Ebenfalls Standard bei LOC-IN-Exposés: Objekte anonymisieren — keine Straßennamen, Hausnummern, Flurstücks-/Grundbuchblattnummern oder Objekt-/Hotelnamen, über die Interessenten das Objekt selbst finden könnten. Postleitzahl und Stadtteil dürfen bleiben. Bei einem Einzelobjekt „Portfolio-Exposé“ im Text durch „Exposé“ ersetzen.
