/*
 * Prüfskript ohne externe Abhängigkeiten.
 *   node tests/run.js
 *
 * Enthält einen kleinen XML-Wohlgeformtheitsprüfer, damit die erzeugten
 * Dateien nicht nur "irgendwie" aussehen, sondern sauber verschachtelt sind.
 *
 * Helfer, die jeden Test kurz halten:
 *   build(overrides)      Konfiguration aus Vorgaben bauen und XML erzeugen
 *   warningText(overrides) dieselbe Konfiguration durch analyze() schicken
 *   has/hasNot(xml, …)    Teilstring muss vorkommen bzw. fehlen
 *   warns/doesNotWarn()   Warnung muss vorkommen bzw. fehlen
 *   assertWellFormed()    XML-Struktur prüfen (Tags, Kommentare, Attribute)
 *
 * Ein neuer Test ist eine `test('Name', function () { … })`-Zeile; die
 * Zählung am Ende läuft automatisch mit. Tests decken bewusst Logik ab
 * (XML-Ausgabe, Warnungen), nicht die Oberfläche.
 */
'use strict';

var assert = require('assert');
var G = require('../generator.js');
var D = require('../data.js');

/* ------------------------------------------------------------ XML-Prüfer */

function validateXml(xml) {
  var problems = [];
  var body = xml;

  var decl = body.match(/^<\?xml[^?]*\?>\r?\n/);
  if (!decl) problems.push('XML-Deklaration fehlt');
  else body = body.slice(decl[0].length);

  function checkEntities(value, where) {
    var stripped = value.replace(/&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);/g, '');
    if (stripped.indexOf('&') !== -1) problems.push('Unmaskiertes & ' + where);
    if (stripped.indexOf('<') !== -1) problems.push('Unmaskiertes < ' + where);
  }

  var i = 0;
  var stack = [];

  while (i < body.length) {
    var lt = body.indexOf('<', i);
    var text = lt === -1 ? body.slice(i) : body.slice(i, lt);
    if (text.trim() !== '') checkEntities(text, 'im Text: ' + text.trim().slice(0, 40));
    if (lt === -1) break;

    if (body.slice(lt, lt + 4) === '<!--') {
      var commentEnd = body.indexOf('-->', lt);
      if (commentEnd === -1) { problems.push('Kommentar nicht geschlossen'); break; }
      i = commentEnd + 3;
      continue;
    }

    var gt = body.indexOf('>', lt);
    if (gt === -1) { problems.push('Tag nicht geschlossen ab ' + lt); break; }

    var tag = body.slice(lt + 1, gt);
    i = gt + 1;

    if (tag.charAt(0) === '?') {
      problems.push('Unerwartete Anweisung: <' + tag.slice(0, 30) + '>');
      continue;
    }

    if (tag.charAt(0) === '/') {
      var closeName = tag.slice(1).trim();
      if (!stack.length) {
        problems.push('Schließendes Tag ohne öffnendes Tag: ' + closeName);
      } else if (stack[stack.length - 1] !== closeName) {
        problems.push('Verschachtelung kaputt: </' + closeName + '> statt </' + stack[stack.length - 1] + '>');
      } else {
        stack.pop();
      }
      continue;
    }

    var selfClosing = /\/\s*$/.test(tag);
    if (selfClosing) tag = tag.replace(/\/\s*$/, '');

    var nameMatch = tag.match(/^([A-Za-z_][\w:.-]*)/);
    if (!nameMatch) { problems.push('Ungültiger Elementname: <' + tag.slice(0, 40) + '>'); continue; }

    var name = nameMatch[1];
    var rest = tag.slice(name.length).trim();

    while (rest.length) {
      var attr = rest.match(/^([A-Za-z_][\w:.-]*)="([^"]*)"/);
      if (!attr) { problems.push('Ungültige Attribute in <' + name + '>: ' + rest.slice(0, 60)); break; }
      checkEntities(attr[2], 'im Attribut ' + attr[1]);
      rest = rest.slice(attr[0].length).trim();
    }

    if (!selfClosing) stack.push(name);
  }

  if (stack.length) problems.push('Nicht geschlossene Elemente: ' + stack.join(' > '));

  return problems;
}

/* ------------------------------------------------------------ Hilfsfunktionen */

var failures = 0;
var checks = 0;

function test(name, fn) {
  checks += 1;
  try {
    fn();
    console.log('  ok   ' + name);
  } catch (error) {
    failures += 1;
    console.log('  FAIL ' + name);
    console.log('       ' + String(error.message).split('\n').join('\n       '));
  }
}

function build(overrides) {
  var cfg = G.defaults();
  Object.keys(overrides || {}).forEach(function (key) { cfg[key] = overrides[key]; });
  return G.buildUnattend(cfg);
}

function assertWellFormed(xml) {
  var problems = validateXml(xml);
  assert.deepStrictEqual(problems, [], 'XML-Probleme: ' + problems.join(' | '));
}

function has(xml, snippet, message) {
  assert.ok(xml.indexOf(snippet) !== -1, (message || 'Erwartet') + ': ' + snippet);
}

function hasNot(xml, snippet, message) {
  assert.strictEqual(xml.indexOf(snippet), -1, (message || 'Darf nicht vorkommen') + ': ' + snippet);
}

/* ------------------------------------------------------------ Tests */

console.log('Unattend-Generator – Prüfungen');

test('alle Vorlagen erzeugen wohlgeformtes XML', function () {
  D.presets.forEach(function (preset) {
    var cfg = G.defaults();
    Object.keys(preset.config).forEach(function (key) { cfg[key] = preset.config[key]; });
    var xml = G.buildUnattend(cfg);
    assertWellFormed(xml);
    has(xml, '<unattend xmlns="urn:schemas-microsoft-com:unattend">');
    has(xml, 'pass="windowsPE"');
    has(xml, 'pass="specialize"');
    has(xml, 'pass="oobeSystem"');
  });
});

test('jede einzelne Option bleibt wohlgeformt', function () {
  var defaults = G.defaults();
  Object.keys(defaults).forEach(function (key) {
    if (typeof defaults[key] !== 'boolean') return;
    var on = G.defaults();
    on[key] = true;
    assertWellFormed(G.buildUnattend(on));

    var off = G.defaults();
    off[key] = false;
    assertWellFormed(G.buildUnattend(off));
  });
});

test('alle Architekturen und Zielversionen', function () {
  ['amd64', 'x86', 'arm64'].forEach(function (architecture) {
    ['windows11', 'windows10', 'server'].forEach(function (target) {
      var xml = build({ architecture: architecture, target: target });
      assertWellFormed(xml);
      has(xml, 'processorArchitecture="' + architecture + '"');
    });
  });
});

test('Server erhält die ServerManager-Komponente, Clients nicht', function () {
  has(build({ target: 'server' }), 'Microsoft-Windows-ServerManager-SvrMgrNc');
  hasNot(build({ target: 'windows11' }), 'Microsoft-Windows-ServerManager-SvrMgrNc');
});

test('GPT-Layout: EFI, MSR und Installation auf Partition 3', function () {
  var xml = build({ diskMode: 'gpt', diskId: '0' });
  has(xml, '<Type>EFI</Type>');
  has(xml, '<Type>MSR</Type>');
  has(xml, '<PartitionID>3</PartitionID>');
  has(xml, '<WillWipeDisk>true</WillWipeDisk>');
});

test('MBR-Layout: aktive Systempartition und Installation auf Partition 2', function () {
  var xml = build({ diskMode: 'mbr' });
  has(xml, '<Active>true</Active>');
  has(xml, '<InstallTo>');
  has(xml, '<PartitionID>2</PartitionID>');
});

test('vorhandene Partition nutzt DiskID/PartitionID aus der Konfiguration', function () {
  var xml = build({ diskMode: 'partition', diskId: '1', partitionId: '4', wipeDisk: false });
  has(xml, '<DiskID>1</DiskID>');
  has(xml, '<PartitionID>4</PartitionID>');
  has(xml, '<WillWipeDisk>false</WillWipeDisk>');
});

test('erste freie Partition nutzt InstallToAvailablePartition', function () {
  var xml = build({ diskMode: 'existing' });
  has(xml, '<InstallToAvailablePartition>true</InstallToAvailablePartition>');
  hasNot(xml, '<InstallTo>');
});

test('Edition per Index, per Name und interaktiv', function () {
  has(build({ editionMode: 'index', editionValue: '3' }), '<Key>/IMAGE/INDEX</Key>');
  has(build({ editionMode: 'index', editionValue: '3' }), '<Value>3</Value>');
  has(build({ editionMode: 'name', editionValue: 'Windows 11 Pro' }), '<Key>/IMAGE/NAME</Key>');
  has(build({ editionMode: 'name', editionValue: 'Windows 11 Pro' }), '<Value>Windows 11 Pro</Value>');
  hasNot(build({ editionMode: 'choose' }), '<InstallFrom>');
});

test('Sonderzeichen werden korrekt maskiert', function () {
  var xml = build({ computerName: 'PC-01', owner: 'Müller & Söhne <IT>', organization: 'A"B' });
  assertWellFormed(xml);
  has(xml, 'Müller &amp; Söhne &lt;IT&gt;');
  has(xml, 'A&quot;B');
});

test('Sprache, Tastatur und Zeitzone landen in beiden Pässen', function () {
  var xml = build({ uiLanguage: 'fr-FR', systemLocale: 'fr-FR', userLocale: 'fr-FR', inputLocale: '040C:0000040C', timezone: 'Romance Standard Time' });
  has(xml, '<SetupUILanguage>');
  has(xml, '<InputLocale>040C:0000040C</InputLocale>');
  assert.ok((xml.match(/<UILanguage>fr-FR<\/UILanguage>/g) || []).length >= 3);
  has(xml, '<TimeZone>Romance Standard Time</TimeZone>');
});

test('Konto, Kennwort und AutoLogon', function () {
  var xml = build({ userName: 'admin', userPassword: 'Start123!', administratorPassword: 'Anders!', autoLogon: true, autoLogonCount: '2' });
  has(xml, '<Name>admin</Name>');
  has(xml, '<DisplayName>admin</DisplayName>');
  has(xml, '<Group>Administrators</Group>');
  has(xml, '<Value>Start123!</Value>');
  has(xml, '<AdministratorPassword>');
  has(xml, '<LogonCount>2</LogonCount>');
  has(xml, '<Username>admin</Username>');
});

test('kein Konto und kein Kennwort: keine leeren Knoten', function () {
  var xml = build({ userName: '', userPassword: '', administratorPassword: '', autoLogon: false });
  hasNot(xml, '<LocalAccounts>');
  hasNot(xml, '<AdministratorPassword>');
  hasNot(xml, '<AutoLogon>');
  assertWellFormed(xml);
});

test('AutoLogon ohne Benutzer wird ausgelassen', function () {
  hasNot(build({ userName: '', autoLogon: true }), '<AutoLogon>');
});

test('Windows-11-Bypässe landen im windowsPE-Pass', function () {
  var xml = build({ bypassTpm: true, bypassSecureBoot: true, bypassRam: true, bypassCpu: true });
  has(xml, 'BypassTPMCheck');
  has(xml, 'BypassSecureBootCheck');
  has(xml, 'BypassRAMCheck');
  has(xml, 'BypassCPUCheck');
  var peStart = xml.indexOf('pass="windowsPE"');
  var specializeStart = xml.indexOf('pass="specialize"');
  assert.ok(xml.indexOf('BypassTPMCheck') > peStart && xml.indexOf('BypassTPMCheck') < specializeStart,
    'Bypass muss im windowsPE-Pass stehen');
});

test('BypassNRO landet im specialize-Pass', function () {
  var xml = build({ bypassMsAccount: true });
  has(xml, 'BypassNRO');
  assert.ok(xml.indexOf('BypassNRO') > xml.indexOf('pass="specialize"'));
});

test('System-Tweaks erzeugen passende Registry-Befehle', function () {
  var xml = build({ enableRdp: true, disableTelemetry: true, disableCortana: true, disableFastStartup: true, disableUac: true, numLockOn: true });
  has(xml, 'fDenyTSConnections');
  has(xml, 'AllowTelemetry');
  has(xml, 'AllowCortana');
  has(xml, 'HiberbootEnabled');
  has(xml, 'EnableLUA');
  has(xml, 'InitialKeyboardIndicators');
  has(xml, 'netsh advfirewall firewall add rule');
});

test('Desktop-Optionen laufen als FirstLogonCommand', function () {
  var xml = build({ showFileExtensions: true, darkMode: true });
  has(xml, '<FirstLogonCommands>');
  has(xml, 'HideFileExt');
  has(xml, 'AppsUseLightTheme');
});

test('eigene Befehle, Kommentarzeilen und Reihenfolge', function () {
  var xml = build({
    specializeCommands: 'reg add "HKLM\\TEST" /v A /t REG_DWORD /d 1 /f\n# Kommentar\n\n  whoami  ',
    firstLogonCommands: 'echo hallo\n# nichts'
  });
  has(xml, 'HKLM\\TEST');
  has(xml, 'whoami');
  has(xml, 'echo hallo');
  hasNot(xml, '# Kommentar');
  hasNot(xml, 'nichts');
  assertWellFormed(xml);
});

test('Befehle werden fortlaufend nummeriert', function () {
  var xml = build({ specializeCommands: 'a\nb\nc' });
  has(xml, '<Order>1</Order>');
  has(xml, '<Order>2</Order>');
  has(xml, '<Order>3</Order>');
});

test('statische IP erzeugt netsh-Befehle', function () {
  var xml = build({ staticIp: true, nicName: 'LAN', ip: '10.0.0.5', subnet: '255.255.255.0', gateway: '10.0.0.1', dns1: '10.0.0.1', dns2: '1.1.1.1' });
  has(xml, 'netsh interface ipv4 set address name=&quot;LAN&quot; static 10.0.0.5 255.255.255.0 10.0.0.1');
  has(xml, 'netsh interface ipv4 set dns name=&quot;LAN&quot; static 10.0.0.1');
  has(xml, 'netsh interface ipv4 add dns name=&quot;LAN&quot; 1.1.1.1 index=2');
});

test('Produktschlüssel landet in beiden Pässen', function () {
  var xml = build({ productKey: 'VK7JG-NPHTM-C97JM-9MPGT-3V66T' });
  assert.strictEqual((xml.match(/VK7JG-NPHTM-C97JM-9MPGT-3V66T/g) || []).length, 2);
});

test('fullName/organization nur wenn gesetzt', function () {
  var xml = build({ owner: '', organization: '' });
  hasNot(xml, '<FullName>');
  hasNot(xml, '<Organization>');
  hasNot(xml, '<RegisteredOwner>');
});

test('Warnungen für unsinnige Kombinationen', function () {
  var warnings = G.analyze({ target: 'windows11', diskMode: 'mbr', autoLogon: true, userName: 'x', userPassword: '' });
  assert.ok(warnings.some(function (w) { return w.indexOf('UEFI') !== -1; }), 'UEFI-Warnung fehlt');
  assert.ok(warnings.some(function (w) { return w.indexOf('Kennwort') !== -1; }), 'Kennwort-Warnung fehlt');

  var clean = G.analyze({ target: 'windows10', diskMode: 'gpt', userName: 'u', userPassword: 'p', autoLogon: false, productKey: 'X' });
  assert.deepStrictEqual(clean.filter(function (w) { return w.indexOf('Benutzername') !== -1; }), []);
});

test('Unbekannte Werte werden auf gültige Vorgaben zurückgesetzt', function () {
  var cfg = G.normalize({ architecture: 'mips', target: 'windows95', diskMode: 'raid', protectYourPC: '', diskId: '' });
  assert.strictEqual(cfg.architecture, 'amd64');
  assert.strictEqual(cfg.target, 'windows11');
  assert.strictEqual(cfg.diskMode, 'gpt');
  assert.strictEqual(cfg.protectYourPC, '3');
  assert.strictEqual(cfg.diskId, '0');
  assertWellFormed(G.buildUnattend(cfg));
});

test('Ergebnis ist stabil (zweimal bauen = identisch)', function () {
  var a = build({ userName: 'test' });
  var b = build({ userName: 'test' });
  assert.strictEqual(a, b);
});

test('XML-Prüfer erkennt kaputtes XML', function () {
  assert.ok(validateXml('<?xml version="1.0"?>\n<a><b></a>').length > 0);
  assert.ok(validateXml('<?xml version="1.0"?>\n<a>1 & 2</a>').length > 0);
  assert.deepStrictEqual(validateXml('<?xml version="1.0"?>\n<a x="1"><b /></a>'), []);
});

test('Copilot wird genau einmal gesetzt (HKLM-Policy im specialize)', function () {
  var xml = build({ disableCopilot: true });
  var matches = xml.match(/TurnOffWindowsCopilot/g) || [];
  assert.strictEqual(matches.length, 1, 'TurnOffWindowsCopilot kommt ' + matches.length + 'x vor');
  assert.ok(xml.indexOf('TurnOffWindowsCopilot') > xml.indexOf('pass="specialize"'));
  assert.ok(xml.indexOf('TurnOffWindowsCopilot') < xml.indexOf('pass="oobeSystem"'));
  hasNot(build({ disableCopilot: false }), 'TurnOffWindowsCopilot');
});

test('Server: alle Versionen und Varianten liefern Server-konforme Datei', function () {
  ['2016', '2019', '2022', '2025'].forEach(function (version) {
    ['core', 'desktop'].forEach(function (installType) {
      var xml = build({ target: 'server', serverVersion: version, serverInstallType: installType });
      assertWellFormed(xml);
      has(xml, 'Microsoft-Windows-ServerManager-SvrMgrNc');
      hasNot(xml, '<OOBE>');
      hasNot(xml, 'BypassTPMCheck');
      hasNot(xml, 'BypassNRO');
      hasNot(xml, 'Remove-AppxPackage');
    });
  });
});

test('Server: Client-Optionen entfallen, eigene Befehle bleiben', function () {
  var xml = build({
    target: 'server',
    bypassTpm: true, bypassSecureBoot: true, bypassRam: true, bypassCpu: true,
    bypassMsAccount: true, disableConsumerFeatures: true, disableCopilot: true,
    removeBloatware: true, uninstallOneDrive: true,
    hideEulaPage: true, hideOnlineAccountScreens: true, hideWirelessSetup: true,
    showFileExtensions: true, darkMode: true, disableWidgets: true,
    firstLogonCommands: 'echo eigener-befehl',
    specializeCommands: 'echo system-befehl',
    administratorPassword: 'Srv!2025'
  });
  assertWellFormed(xml);
  ['HideEULAPage', 'TurnOffWindowsCopilot', 'Remove-AppxPackage', 'OneDriveSetup',
    'HideFileExt', 'AppsUseLightTheme', 'TaskbarDa', 'BypassNRO', 'BypassTPMCheck',
    'DisableWindowsConsumerFeatures'].forEach(function (needle) {
    hasNot(xml, needle);
  });
  has(xml, 'echo eigener-befehl');
  has(xml, 'echo system-befehl');
  has(xml, '<AdministratorPassword>');
  has(xml, 'Microsoft-Windows-ServerManager-SvrMgrNc');
});

test('Server: Warnungen für Architektur, Kennwort, Indizes und Core', function () {
  var warn = G.analyze({ target: 'server', architecture: 'x86', administratorPassword: '', editionMode: 'index' });
  assert.ok(warn.some(function (w) { return w.indexOf('nur für x64') !== -1; }), 'x64-Warnung fehlt');
  assert.ok(warn.some(function (w) { return w.indexOf('Administratorkennwort') !== -1; }), 'Kennwort-Warnung fehlt');
  assert.ok(warn.some(function (w) { return w.indexOf('Image-Indizes') !== -1; }), 'Index-Warnung fehlt');
  assert.ok(warn.some(function (w) { return w.indexOf('Client-Optionen') !== -1; }), 'Client-Hinweis fehlt');

  var core = G.analyze({ target: 'server', serverInstallType: 'core', administratorPassword: 'X1', firstLogonCommands: 'echo x' });
  assert.ok(core.some(function (w) { return w.indexOf('Server Core') !== -1; }), 'Core-Hinweis fehlt');

  var quiet = G.analyze({
    target: 'server', administratorPassword: 'X1', editionMode: 'name',
    editionValue: 'Windows Server 2022 Standard', architecture: 'amd64', userName: 'Administrator',
    bypassTpm: false, bypassSecureBoot: false, bypassRam: false, bypassCpu: false,
    bypassMsAccount: false, disableConsumerFeatures: false, disableCopilot: false,
    removeBloatware: false, uninstallOneDrive: false, hideEulaPage: false,
    hideOnlineAccountScreens: false, hideWirelessSetup: false, showFileExtensions: false,
    darkMode: false, disableWidgets: false
  });
  assert.strictEqual(quiet.filter(function (w) { return w.indexOf('Client-Optionen') !== -1; }).length, 0);
  assert.strictEqual(quiet.filter(function (w) { return w.indexOf('Server Core') !== -1; }).length, 0);
});

test('Server-Image-Namen passen zu den Vorlagen', function () {
  assert.strictEqual(D.serverImageName('2022', 'Standard', 'desktop'), 'Windows Server 2022 Standard (Desktop Experience)');
  assert.strictEqual(D.serverImageName('2025', 'Datacenter', 'core'), 'Windows Server 2025 Datacenter');
  var serverPresets = D.presets.filter(function (p) { return p.config.target === 'server'; });
  assert.ok(serverPresets.length >= 2, 'Server-Vorlagen fehlen');
  serverPresets.forEach(function (p) {
    assert.strictEqual(
      p.config.editionValue,
      D.serverImageName(p.config.serverVersion, p.config.serverEdition, p.config.serverInstallType),
      'Vorlage ' + p.id
    );
  });
});

test('Optimierungen: Registry-Werte wie in Optimizations.cs', function () {
  var xml = build({
    disableSac: true, disableSmartScreen: true, enableLongPaths: true,
    preventAutomaticReboot: true, preventDeviceEncryption: true, hideEdgeFre: true,
    disableEdgeStartupBoost: true, deleteEdgeDesktopIcon: true, allowPowerShellScripts: true,
    disableLastAccess: true, classicContextMenu: true, leftTaskbar: true,
    hideTaskViewButton: true, disableAppSuggestions: true, disableSystemRestore: true
  });
  assertWellFormed(xml);
  [
    'VerifiedAndReputablePolicyState', 'SmartScreenEnabled', 'LongPathsEnabled',
    'NoAutoRebootWithLoggedOnUsers', 'PreventDeviceEncryption', 'HideFirstRunExperience',
    'StartupBoostEnabled', 'disableLastAccess', 'TaskbarAl', 'ShowTaskViewButton',
    'SubscribedContent-338388Enabled', 'Disable-ComputerRestore', 'SmartScreenPuaEnabled'
  ].forEach(function (needle) { has(xml, needle, 'fehlt'); });
  has(xml, '/ve /t REG_DWORD /d 0 /f');
  has(xml, '/ve /f');
  hasNot(build({}), 'LongPathsEnabled', 'Standard darf keine Optimierung setzen');
});

test('Widgets laufen als Maschinenrichtlinie im specialize-Pass', function () {
  var xml = build({ disableWidgets: true });
  has(xml, 'Policies\\Microsoft\\Dsh');
  has(xml, 'AllowNewsAndInterests');
  hasNot(xml, 'TaskbarDa');
  assert.ok(xml.indexOf('AllowNewsAndInterests') > xml.indexOf('pass="specialize"'));
  assert.ok(xml.indexOf('AllowNewsAndInterests') < xml.indexOf('pass="oobeSystem"'));
});

test('Kontorichtlinien: net accounts', function () {
  has(build({ passwordMode: 'unlimited' }), 'net.exe accounts /maxpwage:UNLIMITED');
  has(build({ passwordMode: 'custom', passwordMaxAge: '30' }), 'net.exe accounts /maxpwage:30');
  hasNot(build({ passwordMode: 'default' }), 'maxpwage');
  has(build({ lockoutMode: 'disabled' }), 'net.exe accounts /lockoutthreshold:0');
  has(build({ lockoutMode: 'custom', lockoutThreshold: '5', lockoutDuration: '15', lockoutWindow: '15' }),
    'net.exe accounts /lockoutthreshold:5 /lockoutduration:15 /lockoutwindow:15');
  var warn = G.analyze({ lockoutMode: 'custom', lockoutThreshold: '3', lockoutDuration: '10', lockoutWindow: '20' });
  assert.ok(warn.some(function (w) { return w.indexOf('Sperrfenster') !== -1; }), 'Sperrfenster-Warnung fehlt');
  assertWellFormed(build({ lockoutMode: 'custom', lockoutThreshold: '5', lockoutDuration: '15', lockoutWindow: '15' }));
});

test('PowerShell-Skripte werden als UTF-16LE/base64 eingebettet', function () {
  var script = "Write-Output 'Hallo Welt'\nGet-ChildItem C:\\Temp";
  var xml = build({ specializeScript: script, firstLogonScript: 'Get-Date' });
  assertWellFormed(xml);

  var inSpecialize = xml.match(/<Path>powershell\.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ([A-Za-z0-9+/=]+)<\/Path>/);
  assert.ok(inSpecialize, 'EncodedCommand im specialize-Pass fehlt');
  assert.strictEqual(Buffer.from(inSpecialize[1], 'base64').toString('utf16le'), script);

  var inLogon = xml.match(/<CommandLine>powershell\.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ([A-Za-z0-9+/=]+)<\/CommandLine>/);
  assert.ok(inLogon, 'EncodedCommand in den FirstLogonCommands fehlt');
  assert.strictEqual(Buffer.from(inLogon[1], 'base64').toString('utf16le'), 'Get-Date');

  hasNot(build({}), 'EncodedCommand', 'Ohne Skript darf nichts kodiert werden');
});

function bypassCommandCount(xml) {
  var windowsPe = xml.slice(xml.indexOf('pass="windowsPE"'), xml.indexOf('pass="specialize"'));
  return (windowsPe.match(/<RunSynchronousCommand/g) || []).length;
}

test('Bypass-Befehle folgen eins zu eins den Häkchen', function () {
  var onlyTpm = build({ bypassTpm: true, bypassSecureBoot: false, bypassRam: false, bypassCpu: false });
  assert.strictEqual(bypassCommandCount(onlyTpm), 1);
  has(onlyTpm, 'BypassTPMCheck');
  hasNot(onlyTpm, 'BypassStorageCheck');

  var none = build({ bypassTpm: false, bypassSecureBoot: false, bypassRam: false, bypassCpu: false });
  assert.strictEqual(bypassCommandCount(none), 0);
  hasNot(none, 'BypassTPMCheck');

  var all = build({ bypassTpm: true, bypassSecureBoot: true, bypassRam: true, bypassCpu: true });
  assert.strictEqual(bypassCommandCount(all), 4);
});

test('Zahlenfelder werden bereinigt, ProtectYourPC bleibt gültig', function () {
  var cfg = G.normalize({ diskId: 'abc', partitionId: '4a', autoLogonCount: '', protectYourPC: '9' });
  assert.strictEqual(cfg.diskId, '0');
  assert.strictEqual(cfg.partitionId, '4');
  assert.strictEqual(cfg.autoLogonCount, '1');
  assert.strictEqual(cfg.protectYourPC, '3');

  assert.strictEqual(G.normalize({ protectYourPC: '2' }).protectYourPC, '2');
  assert.strictEqual(G.normalize({ diskId: ' 1 ' }).diskId, '1');

  var xml = G.buildUnattend(cfg);
  hasNot(xml, '<DiskID>abc</DiskID>');
  assertWellFormed(xml);
});

/* ------------------------------------------------------------ LTSC, IoT, Azure */

function warningText(overrides) {
  var cfg = G.defaults();
  Object.keys(overrides).forEach(function (key) { cfg[key] = overrides[key]; });
  return G.analyze(cfg).join('\n');
}

function warns(text, snippet) {
  assert.ok(text.indexOf(snippet) !== -1, 'Erwartete Warnung fehlt: ' + snippet + '\nVorhanden:\n' + text);
}

function doesNotWarn(text, snippet) {
  assert.strictEqual(text.indexOf(snippet), -1, 'Unerwartete Warnung: ' + snippet + '\nVorhanden:\n' + text);
}

test('LTSC-/IoT-Vorlagen nennen den Image-Namen und die passende Zielversion', function () {
  var editions = D.editionsFor('windows10').concat(D.editionsFor('windows11'))
    .filter(function (entry) { return entry.family; });
  assert.strictEqual(editions.length, 6);
  editions.forEach(function (preset) {
    assert.ok(/ LTSC \d{4}$/.test(preset.image), 'Image-Name endet nicht auf LTSC <Jahr>: ' + preset.image);
    if (preset.target === 'windows10') assert.ok(/^Windows 10 /.test(preset.image), preset.image);
    if (preset.target === 'windows11') assert.ok(/^Windows 11 /.test(preset.image), preset.image);
    if (preset.family === 'iot') assert.ok(/ IoT Enterprise LTSC /.test(preset.image), preset.image);
    if (preset.family === 'ltsc') assert.ok(/^Windows (?:10|11) Enterprise LTSC /.test(preset.image), preset.image);
    assert.strictEqual(G.normalize({ editionMode: 'name', editionValue: preset.image }).editionValue, preset.image);
  });
});

test('Azure Edition ist Server-Edition und erzeugt den richtigen Image-Namen', function () {
  var editions = D.serverEditions.map(function (entry) { return entry.id; });
  assert.ok(editions.indexOf('Datacenter: Azure Edition') !== -1, 'Server-Edition fehlt');
  assert.strictEqual(D.serverImageName('2025', 'Datacenter: Azure Edition', 'core'),
    'Windows Server 2025 Datacenter: Azure Edition');
  assert.strictEqual(D.serverImageName('2022', 'Datacenter: Azure Edition', 'desktop'),
    'Windows Server 2022 Datacenter: Azure Edition (Desktop Experience)');

  var cfg = G.normalize({
    target: 'server', serverVersion: '2022', serverEdition: 'Datacenter: Azure Edition',
    serverInstallType: 'desktop', editionMode: 'name',
    editionValue: D.serverImageName('2022', 'Datacenter: Azure Edition', 'desktop')
  });
  assert.strictEqual(cfg.serverEdition, 'Datacenter: Azure Edition', 'Edition wurde auf einen Standardwert zurückgesetzt');
  var xml = G.buildUnattend(cfg);
  has(xml, '<Value>Windows Server 2022 Datacenter: Azure Edition (Desktop Experience)</Value>');
  assertWellFormed(xml);
});

test('Azure-Vorlage erzeugt eine Server-Datei ohne Client-Block', function () {
  var preset = D.presets.filter(function (item) { return item.id === 'server-azure'; })[0];
  assert.ok(preset, 'Vorlage server-azure fehlt');
  var cfg = G.defaults();
  Object.keys(preset.config).forEach(function (key) { cfg[key] = preset.config[key]; });
  var xml = G.buildUnattend(cfg);
  has(xml, '<Value>Windows Server 2025 Datacenter: Azure Edition</Value>');
  has(xml, 'Microsoft-Windows-ServerManager-SvrMgrNc');
  hasNot(xml, '<OOBE>');
  assertWellFormed(xml);
});

test('Windows 11 IoT LTSC: keine TPM-/GPT-Warnung, Bypässe unnötig', function () {
  var base = {
    target: 'windows11', editionMode: 'name', editionValue: 'Windows 11 IoT Enterprise LTSC 2024',
    diskMode: 'gpt', bypassTpm: false, bypassSecureBoot: false
  };
  var text = warningText(base);
  doesNotWarn(text, 'TPM 2.0, Secure Boot und UEFI müssen vorhanden sein');
  doesNotWarn(text, 'Windows 11 benötigt UEFI mit GPT');

  assert.strictEqual(warningText({
    target: 'windows11', editionMode: 'name', editionValue: 'Windows 11 IoT Enterprise LTSC 2024',
    diskMode: 'mbr', bypassTpm: false, bypassSecureBoot: false
  }).indexOf('UEFI mit GPT'), -1);

  warns(warningText({ target: 'windows11', editionMode: 'name', editionValue: 'Windows 11 IoT Enterprise LTSC 2024', bypassTpm: true }),
    'IoT Enterprise LTSC hat TPM und Secure Boot optional');
});

test('Windows 11 Enterprise LTSC 2024 behält die TPM-Anforderung', function () {
  var text = warningText({
    target: 'windows11', editionMode: 'name', editionValue: 'Windows 11 Enterprise LTSC 2024',
    diskMode: 'gpt', bypassTpm: false, bypassSecureBoot: false
  });
  warns(text, 'TPM 2.0, Secure Boot und UEFI müssen vorhanden sein');
  doesNotWarn(text, 'Hardware-Bypässe sind unnötig');
});

test('LTSC meldet wirkungslose Client-Optionen', function () {
  var base = { target: 'windows10', editionMode: 'name', editionValue: 'Windows 10 IoT Enterprise LTSC 2021' };
  warns(warningText(Object.assign({}, base, {
    removeBloatware: true, uninstallOneDrive: true,
    disableConsumerFeatures: false, disableAppSuggestions: false, bypassMsAccount: false
  })), 'LTSC bringt weder Store-Apps noch Consumer-Features (Apps entfernen, OneDrive)');
  doesNotWarn(warningText(Object.assign({}, base, {
    removeBloatware: false, uninstallOneDrive: false, disableConsumerFeatures: false,
    disableAppSuggestions: false, bypassMsAccount: false
  })), 'LTSC bringt weder Store-Apps');
  doesNotWarn(warningText({ target: 'windows10', editionMode: 'index', editionValue: '1' }), 'LTSC');
});

test('Editionsfamilie und Zielversion werden gegengeprüft', function () {
  warns(warningText({ target: 'windows10', editionMode: 'name', editionValue: 'Windows 11 IoT Enterprise LTSC 2024' }),
    'gehört zu Windows 11, die Zielversion ist aber Windows 10');
  warns(warningText({ target: 'windows11', editionMode: 'name', editionValue: 'Windows 10 Enterprise LTSC 2021' }),
    'gehört zu Windows 10, die Zielversion ist aber Windows 11');
  warns(warningText({ target: 'server', editionMode: 'name', editionValue: 'Windows 11 IoT Enterprise LTSC 2024' }),
    'Zielversion steht aber auf Windows Server');
  warns(warningText({ target: 'windows11', editionMode: 'name', editionValue: 'Windows Server 2022 Datacenter: Azure Edition' }),
    'ist eine Server-Edition');
  warns(warningText({ target: 'server', editionMode: 'name', editionValue: 'Windows Server 2025 Datacenter: Azure Edition' }),
    'Virtualisierungs-Edition');
});

/* ------------------------------------------------------------ Registry-Hygiene */

function allOptionsOn() {
  var cfg = G.defaults();
  Object.keys(cfg).forEach(function (key) {
    if (typeof cfg[key] === 'boolean' && key !== 'staticIp' && key !== 'autoLogon') cfg[key] = true;
  });
  cfg.passwordMode = 'custom';
  cfg.lockoutMode = 'custom';
  return cfg;
}

test('kein Registry-Wert wird doppelt geschrieben', function () {
  var xml = G.buildUnattend(allOptionsOn());
  var commands = xml.match(/reg add &quot;[^&]+&quot; \/[ve][^<]*/g) || [];
  assert.ok(commands.length > 40, 'Zu wenige Registry-Befehle gefunden: ' + commands.length);

  var seen = {};
  var duplicates = [];
  commands.forEach(function (command) {
    var key = (command.match(/reg add &quot;([^&]+)&quot;/) || [])[1] || '';
    var name = (command.match(/\/v ([^ ]+)/) || [])[1] || '(Standardwert)';
    var id = key.toLowerCase() + '|' + name.toLowerCase();
    if (seen[id]) duplicates.push(key + ' /v ' + name);
    seen[id] = true;
  });
  assert.deepStrictEqual(duplicates, [], 'Doppelte Schreibvorgänge: ' + duplicates.join(' | '));
});

test('Server bekommt keine HKCU-Anpassungen, auch nicht über die Client-Pfade', function () {
  var cfg = allOptionsOn();
  cfg.target = 'server';
  var xml = G.buildUnattend(cfg);
  ['ContentDeliveryManager', 'TaskbarAl', 'ShowTaskViewButton', 'SmartScreenPuaEnabled',
    'AppsUseLightTheme', 'HideFileExt'].forEach(function (needle) {
    hasNot(xml, needle, 'Server darf keine Benutzer-Anpassung enthalten');
  });
  assertWellFormed(xml);
});

test('App-Vorschläge setzen die CloudContent-Policy genau einmal', function () {
  var only = build({ disableAppSuggestions: true, disableConsumerFeatures: false });
  var matches = only.match(/DisableWindowsConsumerFeatures/g) || [];
  assert.strictEqual(matches.length, 1, 'Policy fehlt oder doppelt: ' + matches.length);
  has(only, 'SubscribedContent-338389Enabled');

  var both = build({ disableAppSuggestions: true, disableConsumerFeatures: true });
  assert.strictEqual((both.match(/DisableWindowsConsumerFeatures/g) || []).length, 1);

  hasNot(build({ disableAppSuggestions: false, disableConsumerFeatures: false }), 'DisableWindowsConsumerFeatures');
});

test('REG_SZ-Werte werden immer gequotet', function () {
  var xml = build({ disableSmartScreen: true, numLockOn: true, leftTaskbar: true });
  has(xml, '/v SmartScreenEnabled /t REG_SZ /d &quot;Off&quot; /f');
  has(xml, '/v InitialKeyboardIndicators /t REG_SZ /d &quot;2&quot; /f');
  has(xml, '/v TaskbarAl /t REG_DWORD /d 0 /f');
  hasNot(xml, '/t REG_SZ /d Off /f');
});

/* ------------------------------------------------------------ Issues des C#-Originals */

test('interaktive Edition erhält Platzhalter-Schlüssel mit WillShowUI Always', function () {
  var xml = build({ editionMode: 'choose', editionValue: '1', productKey: '' });
  has(xml, '<Key>00000-00000-00000-00000-00000</Key>');
  has(xml, '<WillShowUI>Always</WillShowUI>');
  assertWellFormed(xml);

  var named = build({ editionMode: 'name', editionValue: 'Windows 11 Pro', productKey: '' });
  hasNot(named, '<ProductKey>');
  hasNot(named, '00000-00000-00000-00000-00000');

  var keyed = build({ editionMode: 'choose', productKey: 'VK7JG-NPHTM-C97JM-9MPGT-3V66T' });
  has(keyed, '<Key>VK7JG-NPHTM-C97JM-9MPGT-3V66T</Key>');
  has(keyed, '<WillShowUI>OnError</WillShowUI>');
  hasNot(keyed, '00000-00000-00000-00000-00000');
});

test('Produktschlüssel-Knoten ist nie leer (Issue #463 des Originals)', function () {
  var variants = [
    { editionMode: 'choose', editionValue: '1', productKey: '' },
    { editionMode: 'index', editionValue: '1', productKey: '' },
    { editionMode: 'name', editionValue: 'Windows 11 Pro', productKey: '' },
    { editionMode: 'name', editionValue: 'Windows 11 Pro', productKey: 'VK7JG-NPHTM-C97JM-9MPGT-3V66T' }
  ];
  variants.forEach(function (overrides) {
    var xml = build(overrides);
    var blocks = xml.match(/<ProductKey>[\s\S]*?<\/ProductKey>/g) || [];
    blocks.forEach(function (block) {
      assert.ok(block.indexOf('<Key>') !== -1, 'ProductKey ohne Key: ' + block);
    });
    hasNot(xml, '<ProductKey></ProductKey>');
    hasNot(xml, '<ProductKey/>');
  });

  /* Interaktiv muss genau ein ProductKey-Block mit Platzhalter existieren. */
  var interactive = build({ editionMode: 'choose', editionValue: '1', productKey: '' });
  assert.strictEqual((interactive.match(/<ProductKey>/g) || []).length, 1);
});

/* ------------------------------------------------------------ KMS-GVLK */

test('KMS-Katalog enthält die offiziellen Volumenlizenz-Schlüssel', function () {
  var keys = G.kmsKeys;
  assert.strictEqual(keys.length, 27);

  var seenIds = {};
  var seenKeys = {};
  keys.forEach(function (entry) {
    assert.ok(/^[A-Z0-9]{5}(-[A-Z0-9]{5}){4}$/.test(entry.key), 'Schlüsselformat: ' + entry.key);
    assert.ok(!seenIds[entry.id], 'Doppelte id: ' + entry.id);
    assert.ok(!seenKeys[entry.key], 'Doppelter Schlüssel: ' + entry.key);
    assert.ok(entry.group && entry.label, 'Gruppe/Label fehlt: ' + entry.id);
    seenIds[entry.id] = true;
    seenKeys[entry.key] = true;
  });

  function keyOf(id) {
    var entry = keys.filter(function (item) { return item.id === id; })[0];
    assert.ok(entry, 'Katalogeintrag fehlt: ' + id);
    return entry.key;
  }

  /* Stichproben gegen die Liste von Microsoft Learn. */
  assert.strictEqual(keyOf('win-pro'), 'W269N-WFGWX-YVC9B-4J6C9-T83GX');
  assert.strictEqual(keyOf('win-enterprise'), 'NPPR9-FWDCX-D2C8J-H872K-2YT43');
  assert.strictEqual(keyOf('ltsc-enterprise'), 'M7XTQ-FN8P6-TTKYV-9D4CC-J462D');
  assert.strictEqual(keyOf('server2016-datacenter'), 'CB7KF-BWN84-R7R2Y-793K2-8XDDG');
  assert.strictEqual(keyOf('server2019-essentials'), 'WVDHN-86M7X-466P6-VHXV7-YY726');
  assert.strictEqual(keyOf('server2022-datacenter'), 'WX4NM-KYWYW-QJJR4-XV3QB-6VM33');
  assert.strictEqual(keyOf('server2025-azure'), 'XGN3F-F394H-FD2MY-PP6FD-8MCRC');

  /* Nachschlagen unabhängig von Schreibweise und Leerzeichen. */
  assert.strictEqual(G.kmsKeyFor(' w269n-wfgwx-yvc9b-4j6c9-t83gx ').id, 'win-pro');
  assert.strictEqual(G.kmsKeyFor(''), null);
  assert.strictEqual(G.kmsKeyFor('XXXXX-XXXXX-XXXXX-XXXXX-XXXXX'), null);
});

test('Katalogschlüssel landen unverändert in beiden Pässen', function () {
  var entry = G.kmsKeys.filter(function (item) { return item.id === 'win-pro'; })[0];
  var xml = build({ productKey: entry.key });
  assert.strictEqual((xml.match(new RegExp(entry.key, 'g')) || []).length, 2);
  assertWellFormed(xml);
});

test('KMS-Schlüssel werden erkannt und als GVLK erklärt', function () {
  var text = warningText({ productKey: 'W269N-WFGWX-YVC9B-4J6C9-T83GX' });
  warns(text, 'KMS-Clientschlüssel (GVLK)');
  warns(text, 'slmgr /ipk');

  doesNotWarn(warningText({ productKey: 'VK7JG-NPHTM-C97JM-9MPGT-3V66T' }), 'GVLK');

  /* Schreibweise und Leerzeichen ändern die Zuordnung nicht. */
  warns(warningText({ productKey: ' w269n-wfgwx-yvc9b-4j6c9-t83gx ' }), 'GVLK');
});

test('KMS-Schlüssel werden gegen Zielsystem, Version und Edition geprüft', function () {
  var server2022 = {
    target: 'server',
    serverVersion: '2022',
    serverEdition: 'Datacenter',
    editionMode: 'name',
    editionValue: 'Windows Server 2022 Datacenter (Desktop Experience)',
    administratorPassword: 'x',
    productKey: 'WX4NM-KYWYW-QJJR4-XV3QB-6VM33'
  };

  var matching = warningText(server2022);
  doesNotWarn(matching, 'die Zielversion ist');
  doesNotWarn(matching, 'Server-Edition ist');
  doesNotWarn(matching, 'Client-Betriebssystem');

  /* 2025 als Zielversion, aber der Schlüssel gehört zu 2022. */
  warns(warningText(Object.assign({}, server2022, { serverVersion: '2025' })), 'die Zielversion ist 2025');

  /* Passende Version, falsche Edition. */
  warns(warningText(Object.assign({}, server2022, { serverEdition: 'Standard' })), 'Server-Edition ist Standard');

  /* Server-Schlüssel auf einer Client-Installation. */
  warns(warningText({ target: 'windows11', productKey: 'TVRH6-WHNXV-R9WG3-9XRFY-MY832' }), 'Client-Betriebssystem');

  /* Client-Schlüssel auf einer Server-Installation. */
  warns(warningText({
    target: 'server',
    serverVersion: '2025',
    serverEdition: 'Standard',
    administratorPassword: 'x',
    productKey: 'NPPR9-FWDCX-D2C8J-H872K-2YT43'
  }), 'die Zielversion ist aber Windows Server');
});

test('Server-Schlüssel auf Client-Ziel erzeugt nur eine Zuordnungswarnung', function () {
  var text = warningText({ target: 'windows11', productKey: 'TVRH6-WHNXV-R9WG3-9XRFY-MY832' });
  var lines = text.split('\n').filter(function (line) { return line.indexOf('KMS-Schlüssel gehört') !== -1; });
  assert.strictEqual(lines.length, 1, 'Zuordnungswarnungen: ' + lines.join(' | '));
  doesNotWarn(text, 'die Zielversion ist 2022');
});

test('Bis zu drei Tastaturlayouts landen in einem InputLocale-Wert', function () {
  var one = build({ inputLocale: '0407:00000407' });
  has(one, '<InputLocale>0407:00000407</InputLocale>');

  var three = build({
    inputLocale: '0407:00000407',
    inputLocale2: '0409:00000409',
    inputLocale3: '040C:0000040C'
  });
  has(three, '<InputLocale>0407:00000407;0409:00000409;040C:0000040C</InputLocale>');
  hasNot(three, ';;');
  assertWellFormed(three);

  /* Doppelte Layouts werden nicht doppelt geschrieben. */
  var duplicate = build({ inputLocale: '0407:00000407', inputLocale2: '0407:00000407' });
  has(duplicate, '<InputLocale>0407:00000407</InputLocale>');
});

test('Firmware-Schlüssel lässt den ProductKey-Knoten weg', function () {
  var xml = build({ oemProductKey: true, productKey: 'W269N-WFGWX-YVC9B-4J6C9-T83GX' });
  hasNot(xml, '<ProductKey>');
  hasNot(xml, 'W269N-WFGWX-YVC9B-4J6C9-T83GX');
  assertWellFormed(xml);

  var interactive = build({ oemProductKey: true, editionMode: 'choose', editionValue: '1' });
  hasNot(interactive, '<ProductKey>');
  hasNot(interactive, '00000-00000-00000-00000-00000');

  var text = warningText({ oemProductKey: true, productKey: 'X' });
  warns(text, 'wird deshalb nicht in die Datei geschrieben');
  doesNotWarn(text, 'fragt das Setup nach dem Schlüssel');
});

test('Editionsliste wird nach Zielversion gefiltert', function () {
  var win11 = D.editionsFor('windows11');
  var win10 = D.editionsFor('windows10');

  assert.ok(win11.some(function (entry) { return entry.image === 'Windows 11 Home'; }));
  assert.ok(win11.some(function (entry) { return entry.image === 'Windows 11 Pro for Workstations'; }));
  assert.ok(win10.some(function (entry) { return entry.image === 'Windows 10 Pro'; }));
  assert.strictEqual(win11.filter(function (entry) { return /^Windows 10 /.test(entry.image); }).length, 0);
  assert.strictEqual(win10.filter(function (entry) { return /^Windows 11 /.test(entry.image); }).length, 0);

  /* LTSC- und IoT-Vorlagen sind je Zielversion enthalten. */
  assert.ok(win11.some(function (entry) { return entry.image === 'Windows 11 Enterprise LTSC 2024'; }));
  assert.ok(win10.some(function (entry) { return entry.image === 'Windows 10 IoT Enterprise LTSC 2021'; }));

  var ids = {};
  win11.concat(win10).forEach(function (entry) {
    assert.ok(!ids[entry.id], 'Doppelte Editions-ID: ' + entry.id);
    ids[entry.id] = true;
  });

  assert.deepStrictEqual(D.editionsFor('server'), []);
});

test('Schnellprofile verweisen auf vorhandene Vorlagen', function () {
  assert.strictEqual(D.quickProfiles.length, 4);
  D.quickProfiles.forEach(function (profile) {
    var preset = D.presets.filter(function (item) { return item.id === profile.preset; })[0];
    assert.ok(preset, 'Vorlage fehlt: ' + profile.preset);
    assert.ok(profile.label && profile.description, 'Label/Beschreibung fehlt: ' + profile.preset);
  });
});

test('Game DVR wird über beide HKCU-Werte abgeschaltet', function () {
  var xml = build({ disableGameDvr: true, userName: 'u' });
  has(xml, '/v GameDVR_Enabled /t REG_DWORD /d 0 /f');
  has(xml, '/v AppCaptureEnabled /t REG_DWORD /d 0 /f');
  hasNot(build({ disableGameDvr: false }), 'GameDVR_Enabled');
});

test('Computernamen: Zufall nur als einzelnes *, keine reinen Ziffern', function () {
  var star = warningText({ computerName: '*' });
  doesNotWarn(star, 'Zufallsnamen');

  warns(warningText({ computerName: 'PC-*' }), 'nur allein einen Zufallsnamen');
  warns(warningText({ computerName: '12345' }), 'nicht nur aus Ziffern');
  doesNotWarn(warningText({ computerName: 'PC-01' }), 'nicht nur aus Ziffern');
  doesNotWarn(warningText({ computerName: 'PC-01' }), 'Zufallsnamen');
});

test('interaktive Edition warnt vor ei.cfg', function () {
  assert.ok(warningText({ editionMode: 'choose' }).indexOf('ei.cfg') !== -1);
  assert.strictEqual(warningText({ editionMode: 'name', editionValue: 'Windows 11 Pro', productKey: 'X' }).indexOf('ei.cfg'), -1);
});

test('Benutzernamen werden auf ungültige und reservierte Werte geprüft', function () {
  warns(warningText({ userName: 'Max"Mustermann' }), 'Zeichen, die Windows nicht zulässt');
  warns(warningText({ userName: 'Max%Mustermann' }), 'Zeichen, die Windows nicht zulässt');
  warns(warningText({ userName: 'Max/Mustermann' }), 'Zeichen, die Windows nicht zulässt');
  warns(warningText({ userName: 'Mustermann.' }), 'nicht mit einem Punkt enden');
  warns(warningText({ userName: 'Administrator' }), 'reservierter Kontoname');
  warns(warningText({ userName: 'WDAGUtilityAccount' }), 'reservierter Kontoname');
  warns(warningText({ userName: 'AVeryLongUserName12345' }), 'länger als 20 Zeichen');

  var clean = warningText({ userName: 'Max Mustermann', userPassword: 'x' });
  doesNotWarn(clean, 'Zeichen, die Windows nicht zulässt');
  doesNotWarn(clean, 'reservierter Kontoname');
  doesNotWarn(clean, 'länger als 20 Zeichen');
});

/* ------------------------------------------------------------ Ergebnis */

console.log('');
if (failures) {
  console.log(failures + ' von ' + checks + ' Prüfungen fehlgeschlagen.');
  process.exit(1);
}
console.log('Alle ' + checks + ' Prüfungen bestanden.');
