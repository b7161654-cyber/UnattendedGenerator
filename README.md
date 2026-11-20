# Unattend-Generator

Erzeugt eine `autounattend.xml` für die unbeaufsichtigte Installation von Windows 10, Windows 11 und Windows Server – vollständig lokal im Browser, ohne Server, ohne Build-Schritt, ohne Bibliotheken und ohne Internetverbindung.

## Funktionsumfang

- Zielversion: Windows 11, Windows 10 oder Windows Server 2016–2025 mit Edition (Standard, Datacenter, Essentials bei 2016/2019, Datacenter: Azure Edition bei 2022/2025) und Installationsvariante (Server Core oder Desktop Experience); Architektur x64, x86 oder ARM64; Edition per gefilterter Liste, Index, Name oder interaktiv
- Vier Schnellprofile (Standard, Unternehmen, Datenschutz, Gaming), die eine komplette Grundkonfiguration in einem Klick setzen
- Eigene Vorlagen für Windows 10 Enterprise/IoT Enterprise LTSC 2019 und 2021 sowie Windows 11 Enterprise/IoT Enterprise LTSC 2024, inklusive der passenden Image-Namen und editionsabhängiger Prüfungen (Details unter „LTSC, IoT Enterprise und Azure Edition“)
- Sprache, Zeitzone und bis zu drei Tastaturlayouts (das erste ist das Standardlayout) für Setup und installiertes System
- Datenträger: GPT/UEFI oder MBR/BIOS neu anlegen, auf vorhandene Partition oder auf die erste freie Partition installieren
- Zusätzliche Treiberordner: Setup übernimmt entpackte Treiber vom Medium ins installierte Windows (Details unter „Treiber vom Installationsmedium“)
- Lokale Konten, Administratorkennwort, automatische Anmeldung, OOBE-Seiten ausblenden
- Domänenbeitritt mit Domänenkonto und optionaler Organisationseinheit (Details unter „Domänenbeitritt“)
- Produktschlüssel: eigener Schlüssel, Auswahl aus den offiziellen KMS-Clientschlüsseln (GVLK, Details unter „Volumenlizenz-Schlüssel (KMS)“) oder Schlüssel aus BIOS/UEFI (OEM), bei dem bewusst kein Schlüssel in der Datei steht
- Windows-11-Bypässe (TPM, Secure Boot, RAM, CPU)
- Registry-Eingriffe zu Telemetrie, Cortana, Websuche, Copilot, RDP, UAC, Schnellstart, OneDrive und vorinstallierten Apps
- Weitere Optimierungen: SmartScreen, Smart App Control, Game DVR, lange Pfade, Update-Neustart, BitLocker-Geräteverschlüsselung, Edge (Erstlauf, Startup-Boost, Desktop-Verknüpfung), Taskleiste, App-Vorschläge, Systemwiederherstellung, klassisches Kontextmenü
- Kontorichtlinien: Kennwortablauf und Kontosperrung über `net accounts`
- Statische IPv4-Konfiguration, eigene Befehle pro Pass und mehrzeilige PowerShell-Skripte, die als base64 an `-EncodedCommand` gehen
- Vorlagen, Export/Import der Konfiguration als JSON, automatisches Speichern im Browser
- Ampel über der Vorschau: jede Meldung ist Fehler, Warnung oder Hinweis; bei echten Fehlern bleibt der Download gesperrt

## Lokale Nutzung

1. Projektordner herunterladen bzw. klonen.
2. `index.html` im Browser öffnen – Doppelklick genügt, es wird kein Webserver benötigt.
3. Vorlage wählen oder Felder ausfüllen. Die Vorschau rechts aktualisiert sich bei jeder Änderung.
4. Auf **Herunterladen** klicken: Es entsteht `autounattend.xml`.

Die Oberfläche ist für schmale Bildschirme optimiert: einspaltiges Formular, mindestens 44 px hohe Tippflächen, 16-px-Felder gegen das automatische Zoomen auf iOS, waagerecht scrollbare Sprungmarken und ein schwebender Knopf "Vorschau & Download", der zur XML-Vorschau springt und verschwindet, sobald sie sichtbar ist.

Die Seite verwendet bewusst klassische `<script>`-Tags statt ES-Modulen, damit sie auch über `file://` funktioniert. Alle Daten bleiben im Browser; die Konfiguration wird lediglich im `localStorage` gespeichert und lässt sich dort über **Zurücksetzen** wieder verwerfen.

## Fehler, Warnungen, Hinweise

Über der XML-Vorschau steht die Ampel: Sie zählt die Meldungen zur aktuellen Konfiguration.

- **Fehler** (rot) – die Datei kann so nicht arbeiten, weil Setup abbricht oder nicht tut, was eingestellt ist. Beispiele: Domänenbeitritt ohne gültige Domäne oder ohne Konto, Windows-11-Image bei Zielversion 10, x86 für Windows 11, Ziffer im Image-Namen, KMS-Schlüssel für ein anderes Produkt. Solange ein Fehler offen ist, bleibt **Herunterladen** gesperrt.
- **Warnungen** (gelb) – ein Risiko, aber die Datei läuft: Autologon ohne Kennwort, Partition ohne Löschen, Server ohne Administratorkennwort, Sperrfenster größer als die Sperrdauer.
- **Hinweise** (blau) – Erklärungen ohne Handlungsbedarf: GVLK aktiviert nur gegen einen KMS-Host, LTSC-Optionen laufen ins Leere, ohne Produktschlüssel fragt das Setup nach dem Schlüssel, ohne `AcceptEula` hält es an der Lizenzseite an.

Jede Meldung nennt außerdem das Feld, das sie ausgelöst hat: Ein Klick (oder Enter) springt dorthin und hebt die Zeile kurz hervor, damit der Fehler gleich behoben werden kann.

Im Code liefert `UnattendGenerator.issues(cfg)` die Objekte mit `level` (`error`, `warn`, `hint`), `text` und `field` (die id des betroffenen Feldes); `analyze(cfg)` gibt weiterhin nur die Texte zurück. Die Schweregrade und Felder stehen direkt an der jeweiligen Prüfung in `generator.js`; ein Test hält fest, dass jede Meldung ein vorhandenes Feld nennt.

## Datei auf das Installationsmedium legen

1. `autounattend.xml` in das **Wurzelverzeichnis** des Installationsmediums kopieren (USB-Stick oder der oberste Ordner der ISO) – nicht in `\sources`.
2. Bei einem USB-Stick: Datei direkt ins Stammverzeichnis legen, Stick muss für UEFI-Boot FAT32 sein.
3. Bei einer ISO: Datei vor dem Erzeugen des Mediums in die ISO-Wurzel aufnehmen (z. B. mit einem ISO-Bearbeitungswerkzeug).
4. Rechner vom Medium starten. Windows Setup liest die Datei automatisch und arbeitet die Pässe `windowsPE`, `specialize` und `oobeSystem` ab.

Wird die Datei nicht gefunden, ist sie meist eine Ebene zu tief abgelegt oder das Medium wurde nach dem Kopieren neu erstellt, ohne die Datei zu übernehmen. Der Dateiname muss exakt `autounattend.xml` lauten.

## Treiber vom Installationsmedium

Unter „Treiberordner“ lassen sich ein oder mehrere Pfade eintragen, ein Pfad pro Zeile (Zeilen mit `#` werden ignoriert). Der Generator schreibt sie als `Microsoft-Windows-PnpCustomizationsNonWinPE` in den Pass **`offlineServicing`**: Setup kopiert die Treiber während der Installation in den Treiberstore des installierten Windows.

Bewusst nicht `specialize`: Laut Microsoft-Dokumentation ist `PnpCustomizationsNonWinPE` nur in `offlineServicing` und `auditSystem` zulässig; im `specialize`-Pass würde die Komponente von WSIM als ungültig gemeldet und vom Setup ignoriert.

- Der Ordner braucht **entpackte** Treiber mit `.inf`-Dateien, keine ZIP- oder EXE-Archive.
- Der Laufwerksbuchstabe des Mediums kann beim Setup abweichen (meist `D:` oder `E:`). Wer unsicher ist, kopiert den Ordner vorher per `specialize`-Befehl auf das Zielsystem und trägt `C:\Drivers` ein.
- Für Treiber, die **Setup selbst** braucht (Speichercontroller, USB, Netzwerk in der Setup-Umgebung), ist der Pass `windowsPE` mit `Microsoft-Windows-PnpCustomizationsWinPE` zuständig – den deckt dieser Generator bewusst nicht ab.
- UNC-Pfade sind zulässig, funktionieren aber nur, wenn im `offlineServicing`-Pass schon eine Verbindung besteht. Zugangsdaten schreibt der Generator nicht in die Datei.

## Klartext-Kennwörter

Die Kennwörter stehen im Klartext in der Datei (`<PlainText>true</PlainText>`) – anders ist es technisch nicht möglich, weil das Setup sie ohne weitere Quelle lesen können muss.

- Die Datei nicht in Git, Cloud-Speichern oder Chats ablegen und nicht weitergeben.
- Datenträger nach der Installation formatieren oder sicher aufbewahren; ein verlorener Stick ist ein verlorenes Administratorkennwort.
- Keine wiederverwendeten oder zentral gültigen Kennwörter eintragen – pro Installation ein eigenes, starkes Kennwort verwenden.
- Windows legt während des Setups eine Kopie der Antwortdatei unter `C:\Windows\Panther\` ab. Die Kennwörter bleiben also auch auf dem installierten System lesbar und sollten nach der Einrichtung geändert werden.
- Wer das vermeiden will: Kennwortfelder leer lassen, ohne automatische Anmeldung arbeiten und die Zugangsdaten erst im OOBE bzw. anschließend setzen.

## Microsoft-Konto im OOBE umgehen

Der Generator legt im Konto-Bereich ein lokales Konto an und setzt `HideOnlineAccountScreens` im `oobeSystem`-Pass. Das ist der dokumentierte Weg: Setup legt das Konto aus der Antwortdatei an und überspringt die Seiten für Microsoft-Konto und Netzwerk.

Der frühere Registry-Wert `BypassNRO` wird bewusst nicht mehr geschrieben. Microsoft hat `oobe\bypassnro` mit Windows 11 24H2 entfernt, der Wert wird seither nicht mehr zuverlässig ausgewertet, und auch `start ms-cxh:localonly` ist in neueren Builds gesperrt. Eine Option, die auf aktuellen Images nichts bewirkt, gehört nicht in die Datei.

- Voraussetzung ist ein Benutzername im Konto-Bereich; ohne ihn fragt Setup die Zugangsdaten selbst ab.
- Ist „Microsoft-Konto-Anmeldung überspringen“ abgeschaltet, warnt der Generator: Das OOBE kann dann trotz lokalem Konto eine Online-Anmeldung verlangen.
- Auf Windows 10 und älteren Windows-11-Builds funktioniert derselbe Weg; ein zusätzlicher Registry-Eintrag ist dort nicht nötig, weil das lokale Konto ohnehin aus der Datei kommt.

## Domänenbeitritt

Mit „Rechner der Domäne hinzufügen“ schreibt der Generator `Microsoft-Windows-UnattendedJoin` in den `specialize`-Pass.

- **Domäne** vollständig als DNS-Name (`firma.local`, `ad.firma.de`), nicht als NetBIOS-Name.
- **Domänenkonto** mit dem Recht, Computerkonten anzulegen, plus Kennwort. Beides steht im Klartext in der Datei (siehe „Klartext-Kennwörter“).
- **Organisationseinheit** optional als Distinguished Name (`OU=Arbeitsplätze,DC=firma,DC=local`). Leer landet der Rechner im Standardcontainer `Computers`.
- **Computername** sollte fest gesetzt sein. Ohne ihn vergibt Windows einen Zufallsnamen, der als Computerkonto in der Domäne landet.
- Schlägt der Beitritt fehl (falsche Domäne, gesperrtes Konto, kein Netz), bricht das Setup im `specialize`-Pass ab. Das ist Absicht: Eine halbfertige Installation ohne Domäne wäre schwerer zu reparieren.
- Ein lokales Konto oder ein Administratorkennwort bleibt sinnvoll. Ohne erreichbaren Domänencontroller kommt man sonst nicht auf den Rechner; der Generator warnt, wenn beides fehlt.
- Die Reihenfolge innerhalb des `specialize`-Passes legt Windows fest, nicht die Stellung in der Datei. Skripte, die eine Domänenmitgliedschaft voraussetzen, gehören deshalb in `FirstLogonCommands` (nach der Anmeldung) und nicht in denselben Pass.

Geprüft werden FQDN-Form, Distinguished Name, vorhandenes Domänenkonto und ein fester Rechnername. Ein echter Beitritt gegen einen Domänencontroller war hier **nicht möglich** (kein AD, kein Hypervisor) – bitte einmal in der eigenen Testumgebung gegenprüfen.

Ohne Häkchen enthält die Datei keine `UnattendedJoin`-Komponente, und der Rechner bleibt in der Arbeitsgruppe.

## Vor dem Einsatz prüfen

Die erzeugte Datei vor jedem produktiven Einsatz mit dem **Windows System Image Manager (WSIM)** aus dem Windows ADK öffnen und validieren:

1. Windows ADK installieren (Komponente „Deployment Tools“).
2. `autounattend.xml` in WSIM öffnen, das zum Zielsystem passende Windows-Image bzw. den Katalog laden.
3. Die Meldungsliste auf Fehler und Warnungen prüfen und die Datei erst danach verwenden.

WSIM prüft die Datei gegen das Schema und die tatsächlich vorhandenen Komponenten der Zielversion. Das ist wichtig, weil sich einzelne Einstellungen je nach Windows-Build unterschiedlich verhalten – etwa die Microsoft-Konto-Umgehung, die ab Windows 11 24H2 nicht mehr zuverlässig greift. Eine fehlerhafte Antwortdatei kann das Setup abbrechen lassen.

## LTSC, IoT Enterprise und Azure Edition

Diese Editionen heißen im Medium anders als die „normalen“ Images, deshalb gibt es dafür je einen Eintrag unter „Edition (gefiltert nach Zielversion)“:

| Vorlage | Image-Name für `/IMAGE/NAME` |
|---|---|
| Windows 10 Enterprise LTSC 2019 | `Windows 10 Enterprise LTSC 2019` |
| Windows 10 IoT Enterprise LTSC 2019 | `Windows 10 IoT Enterprise LTSC 2019` |
| Windows 10 Enterprise LTSC 2021 | `Windows 10 Enterprise LTSC 2021` |
| Windows 10 IoT Enterprise LTSC 2021 | `Windows 10 IoT Enterprise LTSC 2021` |
| Windows 11 Enterprise LTSC 2024 | `Windows 11 Enterprise LTSC 2024` |
| Windows 11 IoT Enterprise LTSC 2024 | `Windows 11 IoT Enterprise LTSC 2024` |

Die Editionen richten sich nach der gewählten Server-Version: **Essentials** gibt es nur für Server 2016 und 2019, **Datacenter: Azure Edition** erst ab Server 2022. Beide Felder („Server-Edition“ und „Edition“) bieten deshalb nur die passenden Einträge an; eine unpassende Kombination aus einer importierten Konfiguration wird als Fehler gemeldet. Essentials gibt es nur mit Oberfläche: Die Installationsvariante ist dort festgelegt, und der Image-Name steht ohne Zusatz in der Datei (`Windows Server 2019 Essentials`).

Für **Windows Server Datacenter: Azure Edition** gibt es keine Client-Vorlage, sondern einen zusätzlichen Eintrag in „Server-Edition“. Der Image-Name wird wie bei den anderen Server-Editionen aus Version, Edition und Variante gebaut, also `Windows Server 2025 Datacenter: Azure Edition` bzw. `… (Desktop Experience)`. Azure Edition unterstützt beide Installationsvarianten, ist aber eine reine Virtualisierungs-Edition: Sie wird nur in Azure bzw. über Evaluierungsmedien ausgeliefert und über Azure aktiviert. Dazu gibt es eine eigene Vorlage (`Windows Server 2025 – Datacenter: Azure Edition, Server Core`).

Die Auswahl im Formular setzt nur einen Vorschlag – der Image-Name bleibt editierbar, weil die Medien je nach Sprach- und Lizenzstand abweichen können. Bitte mit `dism /Get-WimInfo /WimFile:<Laufwerk>:\sources\install.wim` gegenprüfen.

Was der Generator editionsabhängig prüft:

- **Windows 11 IoT Enterprise LTSC** hat TPM 2.0 und Secure Boot optional. Die Warnung „TPM 2.0, Secure Boot und UEFI müssen vorhanden sein“ und die GPT-Pflicht entfallen daher, und gesetzte Hardware-Bypässe werden als unnötig gemeldet. Für **Windows 11 Enterprise LTSC 2024** gelten weiterhin die vollen Windows-11-Anforderungen.
- **LTSC allgemein** bringt weder Store-Apps noch Consumer-Features. Optionen wie Apps entfernen, Werbeinhalte, App-Vorschläge oder OneDrive laufen dort ins Leere und werden als solche gemeldet. Außerdem wird von der Index-Auswahl abgeraten, weil die LTSC-Medien mehrere Images enthalten und der Index leicht die falsche Edition trifft.
- **Azure Edition** außerhalb der Zielversion „Windows Server“ sowie vertauschte Client-/Server-Image-Namen werden gemeldet, ebenso ein Windows-11-Image bei Zielversion Windows 10 (und umgekehrt).

## Volumenlizenz-Schlüssel (KMS)

Unter „Volumenlizenz-Schlüssel (KMS)“ stehen die von Microsoft veröffentlichten KMS-Clientschlüssel (GVLK) zur Auswahl: Windows 11/10 (Pro, Pro N, Pro for Workstations, Pro Education, Education, Enterprise, Enterprise G) sowie Enterprise LTSC und IoT Enterprise LTSC und alle Server-Editionen von 2016 bis 2025 (Standard, Datacenter, Datacenter: Azure Edition, Essentials). Die Auswahl trägt den Schlüssel in das Feld „Produktschlüssel“ ein, das weiterhin frei überschreibbar bleibt.

Diese Schlüssel sind **keine Lizenzen**: Sie schalten nur die Aktivierung gegen einen KMS-Host im eigenen Netz. Ohne KMS-Host bleibt Windows im Status „nicht aktiviert“. Den echten Schlüssel – MAK oder KMS-Host-Key – trägt man nach der Installation mit `slmgr /ipk <Schlüssel>` nach; ein neues Setup ist dafür nicht nötig. Ein im Feld eingetragener eigener Schlüssel hat Vorrang und wird unverändert in die Datei geschrieben.

Der Generator prüft die Zuordnung und meldet zum Beispiel einen Server-2022-Schlüssel bei Zielversion 2025, einen Client-Schlüssel auf einer Server-Installation oder eine abweichende Server-Edition. Quelle der Schlüssel: Microsoft Learn, [KMS client activation and product keys](https://learn.microsoft.com/windows-server/get-started/kms-client-activation-keys).

## Weiterentwickeln

Jede Datei beginnt mit einem Kopfkommentar, der ihren Aufbau beschreibt. Kurzfassung:

| Datei | Aufgabe |
|---|---|
| `generator.js` | Werte prüfen, XML bauen, warnen – reine Logik ohne DOM |
| `data.js` | Auswahllisten und Vorlagen (nur Daten) |
| `app.js` | Formular, Vorschau, Speichern/Laden |
| `index.html`, `styles.css` | Aufbau und Darstellung |
| `tests/run.js` | Prüfungen ohne externe Abhängigkeiten |

**Eine neue Option in fünf Schritten**

1. Schlüssel in `DEFAULTS` (`generator.js`) aufnehmen – das ist die Liste der erlaubten Konfigurationsschlüssel.
2. In `normalize()` prüfen und mit Vorgabe füllen; dort entstehen alle endgültigen Werte.
3. XML im richtigen Pass erzeugen: Setup und Image in `windowsPE`, System in `specialize`, Benutzer und Desktop in `oobeSystem`. Registry-Werte nur über `regAdd()`/`regSetDefault()` schreiben, nicht als handgeschriebene Zeile.
4. Bedienelement in `index.html` anlegen und seine `id` in `app.js` zu `TEXT_FIELDS` oder `BOOL_FIELDS` hinzufügen; abhängige Felder in `syncFieldStates()` sperren.
5. Test in `tests/run.js` ergänzen, `node tests/run.js` ausführen, README nachziehen.

**Eine Auswahlliste erweitern:** Ein Eintrag in `data.js` genügt (Sprachen, Tastaturen, Zeitzonen, Server-Versionen, Client-Editionen). Sonder-Images gehören in `EDITION_PRESETS`, vollständige Beispiele in `PRESETS`, die Kacheln oben in `QUICK_PROFILES`.

Alle Dateien müssen weiterhin ohne Build und ohne Abhängigkeiten auskommen: klassische `<script>`-Tags, `var` und Funktionen statt Module, keine externen Bibliotheken. Die Prüfungen laufen mit `node tests/run.js`, ohne dass etwas installiert werden muss.

## Veröffentlichen (Freebuff Sites)

`npm run build` (oder `node tools/build-site.js`) legt `freebuff-sites-build/` an: nur `index.html`, `styles.css`, `app.js`, `generator.js`, `data.js` und ein winziger Worker, der sie über `env.ASSETS.fetch` ausliefert. Tests, Screenshots und das Werkzeug selbst bleiben außen vor. `deploy.json` verweist auf dieses Verzeichnis.

Für die lokale Nutzung ändert das nichts: `index.html` läuft weiterhin per Doppelklick ohne Build und ohne Abhängigkeiten. Das Paket ist nur für das Hosting gedacht.

## Projektdateien

| Datei | Inhalt |
|---|---|
| `index.html` | Oberfläche und Formular |
| `generator.js` | Erzeugung der XML (auch in Node nutzbar) |
| `data.js` | Sprachen, Tastaturlayouts, Zeitzonen, Vorlagen |
| `app.js` | Formularlogik, Vorschau, Download, Import/Export |
| `styles.css` | Darstellung |
| `tests/run.js` | Prüfungen ohne externe Abhängigkeiten: `node tests/run.js` |

## Herkunft der Ideen

Die Optimierungs- und Kontorichtlinien sowie die Skript-Einbettung sind Übersetzungen aus dem C#-Projekt [unattend-generator](https://github.com/cschneegans/unattend-generator) von Christoph Schneegans (MIT-Lizenz, Copyright 2024–2025). Übersetzt wurde die Logik, nicht die Oberfläche: Die Registry-Pfade und Werte stammen aus `modifier/Optimizations.cs`, `modifier/Lockout.cs` und `modifier/PasswordExpiration.cs`. Anstelle der dort verwendeten Skriptdateien im Setup-Verzeichnis bettet dieser Generator Skripte als base64-kodierten `-EncodedCommand` ein, damit keine zusätzlichen Dateien auf dem Medium nötig sind.

Nicht übernommen wurden unter anderem: mehrere Benutzerkonten, WLAN-Profile, Startmenü-/Taskleisten-Layouts, Wallpaper und Designs, AppLocker, Bloatware-Auswahl pro App, Gasttools für VMs sowie die diskpart-basierte Datenträgereinrichtung.

Die Hardware-Anforderungen der IoT-Editionen folgen der Microsoft-Dokumentation „Minimum System Requirements for Windows IoT Enterprise“ (TPM und Secure Boot optional bei Windows 11 IoT Enterprise LTSC).

## Grenzen

Die XML-Struktur ist gegen das bekannte Unattend-Schema gebaut und automatisiert geprüft, ersetzt aber keine Prüfung mit WSIM und keinen Test auf echter Hardware. Verhalten und Verfügbarkeit einzelner Einstellungen hängen von Windows-Version, Build und Image ab. Für die Installation geprüfter Dateien und getesteter Konfigurationen wird keine Gewähr übernommen.

Wer die Edition interaktiv wählen lässt („Setup fragen lassen“), bekommt einen Platzhalter-Schlüssel mit `WillShowUI=Always` in die Datei, damit die Schlüssel- und Editionsseite überhaupt erscheint. Bei Multi-Edition-Images zeigt Setup trotzdem manchmal nur eine Edition; dann hilft eine eigene `sources\ei.cfg` neben dem `boot.wim` (nicht die im `boot.wim`), die der Generator nicht erzeugen kann.

**Teststand interaktive Edition:** Gegen den Referenzgenerator geprüft – der erzeugte `<ProductKey>`-Block ist elementweise identisch mit dessen Ausgabe (Platzhalter `00000-00000-00000-00000-00000` plus `WillShowUI=Always`), und in jeder der vier Betriebsarten enthält der Block einen `<Key>` (Testfall). Ein echter Setup-Lauf auf einem Multi-Edition-Image war hier **nicht möglich**: die Umgebung hat kein qemu, 3 GB RAM (Windows 11 verlangt 4 GB) und 9 GB freien Plattenplatz (ISO plus Systemdatenträger brauchen zusammen über 25 GB). Ob die Editionsliste bei mehreren Editionen vollständig erscheint und die Auswahl nach „Weiter“ erhalten bleibt, ist damit **nicht bestätigt** – das bitte einmal von Hand prüfen.

Bewusst nicht enthalten sind der Umbau zu einer bootfähigen ISO und der Import bestehender `autounattend.xml`-Dateien: Für beides müsste der Generator Bootsektoren schreiben bzw. fremde XML-Strukturen zurückrechnen, was ohne Bibliotheken unzuverlässig wäre. Import und Export der eigenen Konfiguration laufen deshalb als JSON.

Kennwortablauf und Kontosperrung werden per `net accounts` gesetzt. Ist der Rechner Mitglied einer Domäne, hat deren Gruppenrichtlinie Vorrang – der Wert gilt dann nicht mehr.

Windows-Server-Rollen (AD DS, DNS, DHCP, Hyper-V, IIS) lassen sich nicht über eine Antwortdatei installieren; der Generator deckt die Installation und Erstkonfiguration ab, nicht die Rolleneinrichtung. Client-Optionen wie Hardware-Bypass, Werbeinhalte, App-Entfernung und Desktop-Anpassungen werden für Server bewusst nicht in die Datei geschrieben, weil sie dort wirkungslos sind.
