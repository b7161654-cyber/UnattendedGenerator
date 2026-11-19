# Unattend-Generator

Erzeugt eine `autounattend.xml` für die unbeaufsichtigte Installation von Windows 10, Windows 11 und Windows Server – vollständig lokal im Browser, ohne Server, ohne Build-Schritt, ohne Bibliotheken und ohne Internetverbindung.

## Funktionsumfang

- Zielversion: Windows 11, Windows 10 oder Windows Server 2016–2025 mit Edition (Standard, Datacenter, Datacenter: Azure Edition) und Installationsvariante (Server Core oder Desktop Experience); Architektur x64, x86 oder ARM64; Edition per Index, Name oder interaktiv
- Eigene Vorlagen für Windows 10 Enterprise/IoT Enterprise LTSC 2019 und 2021 sowie Windows 11 Enterprise/IoT Enterprise LTSC 2024, inklusive der passenden Image-Namen und editionsabhängiger Prüfungen (Details unter „LTSC, IoT Enterprise und Azure Edition“)
- Sprache, Tastaturlayout, Zeitzone für Setup und installiertes System
- Datenträger: GPT/UEFI oder MBR/BIOS neu anlegen, auf vorhandene Partition oder auf die erste freie Partition installieren
- Lokale Konten, Administratorkennwort, automatische Anmeldung, OOBE-Seiten ausblenden
- Windows-11-Bypässe (TPM, Secure Boot, RAM, CPU, Microsoft-Konto)
- Registry-Eingriffe zu Telemetrie, Cortana, Websuche, Copilot, RDP, UAC, Schnellstart, OneDrive und vorinstallierten Apps
- Weitere Optimierungen: SmartScreen, Smart App Control, lange Pfade, Update-Neustart, BitLocker-Geräteverschlüsselung, Edge (Erstlauf, Startup-Boost, Desktop-Verknüpfung), Taskleiste, App-Vorschläge, Systemwiederherstellung, klassisches Kontextmenü
- Kontorichtlinien: Kennwortablauf und Kontosperrung über `net accounts`
- Statische IPv4-Konfiguration, eigene Befehle pro Pass und mehrzeilige PowerShell-Skripte, die als base64 an `-EncodedCommand` gehen
- Vorlagen, Export/Import der Konfiguration als JSON, automatisches Speichern im Browser

## Lokale Nutzung

1. Projektordner herunterladen bzw. klonen.
2. `index.html` im Browser öffnen – Doppelklick genügt, es wird kein Webserver benötigt.
3. Vorlage wählen oder Felder ausfüllen. Die Vorschau rechts aktualisiert sich bei jeder Änderung.
4. Auf **Herunterladen** klicken: Es entsteht `autounattend.xml`.

Die Seite verwendet bewusst klassische `<script>`-Tags statt ES-Modulen, damit sie auch über `file://` funktioniert. Alle Daten bleiben im Browser; die Konfiguration wird lediglich im `localStorage` gespeichert und lässt sich dort über **Zurücksetzen** wieder verwerfen.

## Datei auf das Installationsmedium legen

1. `autounattend.xml` in das **Wurzelverzeichnis** des Installationsmediums kopieren (USB-Stick oder der oberste Ordner der ISO) – nicht in `\sources`.
2. Bei einem USB-Stick: Datei direkt ins Stammverzeichnis legen, Stick muss für UEFI-Boot FAT32 sein.
3. Bei einer ISO: Datei vor dem Erzeugen des Mediums in die ISO-Wurzel aufnehmen (z. B. mit einem ISO-Bearbeitungswerkzeug).
4. Rechner vom Medium starten. Windows Setup liest die Datei automatisch und arbeitet die Pässe `windowsPE`, `specialize` und `oobeSystem` ab.

Wird die Datei nicht gefunden, ist sie meist eine Ebene zu tief abgelegt oder das Medium wurde nach dem Kopieren neu erstellt, ohne die Datei zu übernehmen. Der Dateiname muss exakt `autounattend.xml` lauten.

## Klartext-Kennwörter

Die Kennwörter stehen im Klartext in der Datei (`<PlainText>true</PlainText>`) – anders ist es technisch nicht möglich, weil das Setup sie ohne weitere Quelle lesen können muss.

- Die Datei nicht in Git, Cloud-Speichern oder Chats ablegen und nicht weitergeben.
- Datenträger nach der Installation formatieren oder sicher aufbewahren; ein verlorener Stick ist ein verlorenes Administratorkennwort.
- Keine wiederverwendeten oder zentral gültigen Kennwörter eintragen – pro Installation ein eigenes, starkes Kennwort verwenden.
- Windows legt während des Setups eine Kopie der Antwortdatei unter `C:\Windows\Panther\` ab. Die Kennwörter bleiben also auch auf dem installierten System lesbar und sollten nach der Einrichtung geändert werden.
- Wer das vermeiden will: Kennwortfelder leer lassen, ohne automatische Anmeldung arbeiten und die Zugangsdaten erst im OOBE bzw. anschließend setzen.

## Vor dem Einsatz prüfen

Die erzeugte Datei vor jedem produktiven Einsatz mit dem **Windows System Image Manager (WSIM)** aus dem Windows ADK öffnen und validieren:

1. Windows ADK installieren (Komponente „Deployment Tools“).
2. `autounattend.xml` in WSIM öffnen, das zum Zielsystem passende Windows-Image bzw. den Katalog laden.
3. Die Meldungsliste auf Fehler und Warnungen prüfen und die Datei erst danach verwenden.

WSIM prüft die Datei gegen das Schema und die tatsächlich vorhandenen Komponenten der Zielversion. Das ist wichtig, weil sich einzelne Einstellungen je nach Windows-Build unterschiedlich verhalten – etwa die Microsoft-Konto-Umgehung, die ab Windows 11 24H2 nicht mehr zuverlässig greift. Eine fehlerhafte Antwortdatei kann das Setup abbrechen lassen.

## LTSC, IoT Enterprise und Azure Edition

Diese Editionen heißen im Medium anders als die „normalen“ Images, deshalb gibt es dafür je einen Eintrag unter „Edition-Vorlage (LTSC / IoT)“:

| Vorlage | Image-Name für `/IMAGE/NAME` |
|---|---|
| Windows 10 Enterprise LTSC 2019 | `Windows 10 Enterprise LTSC 2019` |
| Windows 10 IoT Enterprise LTSC 2019 | `Windows 10 IoT Enterprise LTSC 2019` |
| Windows 10 Enterprise LTSC 2021 | `Windows 10 Enterprise LTSC 2021` |
| Windows 10 IoT Enterprise LTSC 2021 | `Windows 10 IoT Enterprise LTSC 2021` |
| Windows 11 Enterprise LTSC 2024 | `Windows 11 Enterprise LTSC 2024` |
| Windows 11 IoT Enterprise LTSC 2024 | `Windows 11 IoT Enterprise LTSC 2024` |

Für **Windows Server Datacenter: Azure Edition** gibt es keine Client-Vorlage, sondern einen zusätzlichen Eintrag in „Server-Edition“. Der Image-Name wird wie bei den anderen Server-Editionen aus Version, Edition und Variante gebaut, also `Windows Server 2025 Datacenter: Azure Edition` bzw. `… (Desktop Experience)`. Azure Edition unterstützt beide Installationsvarianten, ist aber eine reine Virtualisierungs-Edition: Sie wird nur in Azure bzw. über Evaluierungsmedien ausgeliefert und über Azure aktiviert. Dazu gibt es eine eigene Vorlage (`Windows Server 2025 – Datacenter: Azure Edition, Server Core`).

Die Auswahl im Formular setzt nur einen Vorschlag – der Image-Name bleibt editierbar, weil die Medien je nach Sprach- und Lizenzstand abweichen können. Bitte mit `dism /Get-WimInfo /WimFile:<Laufwerk>:\sources\install.wim` gegenprüfen.

Was der Generator editionsabhängig prüft:

- **Windows 11 IoT Enterprise LTSC** hat TPM 2.0 und Secure Boot optional. Die Warnung „TPM 2.0, Secure Boot und UEFI müssen vorhanden sein“ und die GPT-Pflicht entfallen daher, und gesetzte Hardware-Bypässe werden als unnötig gemeldet. Für **Windows 11 Enterprise LTSC 2024** gelten weiterhin die vollen Windows-11-Anforderungen.
- **LTSC allgemein** bringt weder Store-Apps noch Consumer-Features. Optionen wie Apps entfernen, Werbeinhalte, App-Vorschläge, OneDrive oder Microsoft-Konto-Bypass laufen dort ins Leere und werden als solche gemeldet. Außerdem wird von der Index-Auswahl abgeraten, weil die LTSC-Medien mehrere Images enthalten und der Index leicht die falsche Edition trifft.
- **Azure Edition** außerhalb der Zielversion „Windows Server“ sowie vertauschte Client-/Server-Image-Namen werden gemeldet, ebenso ein Windows-11-Image bei Zielversion Windows 10 (und umgekehrt).

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

Kennwortablauf und Kontosperrung werden per `net accounts` gesetzt. Ist der Rechner Mitglied einer Domäne, hat deren Gruppenrichtlinie Vorrang – der Wert gilt dann nicht mehr.

Windows-Server-Rollen (AD DS, DNS, DHCP, Hyper-V, IIS) lassen sich nicht über eine Antwortdatei installieren; der Generator deckt die Installation und Erstkonfiguration ab, nicht die Rolleneinrichtung. Client-Optionen wie Hardware-Bypass, Microsoft-Konto-Umgehung, Werbeinhalte, App-Entfernung und Desktop-Anpassungen werden für Server bewusst nicht in die Datei geschrieben, weil sie dort wirkungslos sind.
