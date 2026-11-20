/*
 * Statische Auswahllisten und Vorlagen für den Unattend-Generator.
 * Klassisches Script (kein Modul), damit die Seite auch per file:// funktioniert.
 *
 * Hier stehen nur Daten, keine Logik. Was hier hinzukommt, erscheint direkt
 * in der Oberfläche:
 *   - LANGUAGES   weitere Sprache  -> Eintrag mit code, label und inputLocale
 *   - KEYBOARDS   weiteres Layout  -> Eintrag mit id (Sprache:Layout) und label
 *   - TIMEZONES   weitere Zone     -> Eintrag mit Windows-Zeitzonen-id und label
 *   - SERVER_*    weitere Version  -> Eintrag in SERVER_VERSIONS/…EDITIONS
 *   - CLIENT_EDITIONS             -> Image-Namen je Zielversion, ohne Präfix
 *   - EDITION_PRESETS             -> Sonder-Images (LTSC/IoT) mit vollem Namen
 *   - PRESETS                     -> vollständige Beispielkonfigurationen
 *   - QUICK_PROFILES              -> Kacheln, die auf eine PRESET-id zeigen
 *
 * Die Regeln für gültige Werte (und damit die Warnungen) prüft generator.js.
 */
var UnattendData = (function () {
  'use strict';

  /* code = Sprache für Setup/System, inputLocale = Standardtastatur dazu. */
  var LANGUAGES = [
    { code: 'de-DE', label: 'Deutsch (Deutschland)', inputLocale: '0407:00000407' },
    { code: 'de-AT', label: 'Deutsch (Österreich)', inputLocale: '0C07:00000407' },
    { code: 'de-CH', label: 'Deutsch (Schweiz)', inputLocale: '0807:00000807' },
    { code: 'en-US', label: 'English (United States)', inputLocale: '0409:00000409' },
    { code: 'en-GB', label: 'English (United Kingdom)', inputLocale: '0809:00000809' },
    { code: 'fr-FR', label: 'Français (France)', inputLocale: '040C:0000040C' },
    { code: 'it-IT', label: 'Italiano (Italia)', inputLocale: '0410:00000410' },
    { code: 'es-ES', label: 'Español (España)', inputLocale: '0C0A:0000040A' },
    { code: 'nl-NL', label: 'Nederlands (Nederland)', inputLocale: '0413:00000413' },
    { code: 'pl-PL', label: 'Polski (Polska)', inputLocale: '0415:00000415' },
    { code: 'cs-CZ', label: 'Čeština (Česká republika)', inputLocale: '0405:00000405' },
    { code: 'da-DK', label: 'Dansk (Danmark)', inputLocale: '0406:00000406' },
    { code: 'sv-SE', label: 'Svenska (Sverige)', inputLocale: '041D:0000041D' },
    { code: 'nb-NO', label: 'Norsk Bokmål (Norge)', inputLocale: '0414:00000414' },
    { code: 'fi-FI', label: 'Suomi (Suomi)', inputLocale: '040B:0000040B' },
    { code: 'pt-BR', label: 'Português (Brasil)', inputLocale: '0416:00000416' },
    { code: 'pt-PT', label: 'Português (Portugal)', inputLocale: '0816:00000816' },
    { code: 'ru-RU', label: 'Русский (Россия)', inputLocale: '0419:00000419' },
    { code: 'tr-TR', label: 'Türkçe (Türkiye)', inputLocale: '041F:0000041F' },
    { code: 'el-GR', label: 'Ελληνικά (Ελλάδα)', inputLocale: '0408:00000408' },
    { code: 'hu-HU', label: 'Magyar (Magyarország)', inputLocale: '040E:0000040E' },
    { code: 'ro-RO', label: 'Română (România)', inputLocale: '0418:00000418' },
    { code: 'ja-JP', label: '日本語 (日本)', inputLocale: '0411:00000411' },
    { code: 'ko-KR', label: '한국어 (대한민국)', inputLocale: '0412:00000412' },
    { code: 'zh-CN', label: '中文 (简体, 中国)', inputLocale: '0804:00000804' },
    { code: 'zh-TW', label: '中文 (繁體, 台灣)', inputLocale: '0404:00000404' }
  ];

  /* id ist das Paar "Sprache:Layout" aus der Windows-Registry, z. B.
     0407:00000407 für Deutsch (QWERTZ). */
  var KEYBOARDS = [
    { id: '0407:00000407', label: 'Deutsch (QWERTZ)' },
    { id: '0409:00000409', label: 'Englisch (US)' },
    { id: '0809:00000809', label: 'Englisch (UK)' },
    { id: '040C:0000040C', label: 'Französisch (AZERTY)' },
    { id: '0410:00000410', label: 'Italienisch' },
    { id: '0C0A:0000040A', label: 'Spanisch' },
    { id: '0413:00000413', label: 'Niederländisch' },
    { id: '0415:00000415', label: 'Polnisch' },
    { id: '0405:00000405', label: 'Tschechisch' },
    { id: '0406:00000406', label: 'Dänisch' },
    { id: '041D:0000041D', label: 'Schwedisch' },
    { id: '0414:00000414', label: 'Norwegisch' },
    { id: '040B:0000040B', label: 'Finnisch' },
    { id: '0416:00000416', label: 'Portugiesisch (Brasilien)' },
    { id: '0419:00000419', label: 'Russisch' },
    { id: '041F:0000041F', label: 'Türkisch' },
    { id: '0411:00000411', label: 'Japanisch' },
    { id: '0804:00000804', label: 'Chinesisch (vereinfacht)' },
    { id: '0407:00010407', label: 'Deutsch (IBM)' },
    { id: '0409:00010409', label: 'US-Dvorak' }
  ];

  /* id ist der Windows-Name der Zeitzone (nicht der Anzeigename). */
  var TIMEZONES = [
    { id: 'W. Europe Standard Time', label: '(UTC+01:00) Amsterdam, Berlin, Bern, Rom, Stockholm, Wien' },
    { id: 'Central Europe Standard Time', label: '(UTC+01:00) Belgrad, Bratislava, Budapest, Ljubljana, Prag' },
    { id: 'Central European Standard Time', label: '(UTC+01:00) Sarajevo, Skopje, Warschau, Zagreb' },
    { id: 'Romance Standard Time', label: '(UTC+01:00) Brüssel, Kopenhagen, Madrid, Paris' },
    { id: 'GMT Standard Time', label: '(UTC+00:00) Dublin, Edinburgh, Lissabon, London' },
    { id: 'UTC', label: '(UTC+00:00) UTC' },
    { id: 'GTB Standard Time', label: '(UTC+02:00) Athen, Bukarest' },
    { id: 'FLE Standard Time', label: '(UTC+02:00) Helsinki, Kiew, Riga, Sofia, Tallinn, Vilnius' },
    { id: 'E. Europe Standard Time', label: '(UTC+02:00) Chisinau' },
    { id: 'Russian Standard Time', label: '(UTC+03:00) Moskau, St. Petersburg' },
    { id: 'Turkey Standard Time', label: '(UTC+03:00) Istanbul' },
    { id: 'Israel Standard Time', label: '(UTC+02:00) Jerusalem' },
    { id: 'Arabian Standard Time', label: '(UTC+04:00) Dubai' },
    { id: 'Arabic Standard Time', label: '(UTC+03:00) Bagdad' },
    { id: 'India Standard Time', label: '(UTC+05:30) Chennai, Kalkutta, Mumbai, Neu-Delhi' },
    { id: 'SE Asia Standard Time', label: '(UTC+07:00) Bangkok, Hanoi, Jakarta' },
    { id: 'China Standard Time', label: '(UTC+08:00) Peking, Chongqing, Hongkong, Ürümqi' },
    { id: 'Tokyo Standard Time', label: '(UTC+09:00) Osaka, Sapporo, Tokio' },
    { id: 'Korea Standard Time', label: '(UTC+09:00) Seoul' },
    { id: 'AUS Eastern Standard Time', label: '(UTC+10:00) Canberra, Melbourne, Sydney' },
    { id: 'New Zealand Standard Time', label: '(UTC+12:00) Auckland, Wellington' },
    { id: 'Eastern Standard Time', label: '(UTC-05:00) Eastern Time (USA, Kanada)' },
    { id: 'Central Standard Time', label: '(UTC-06:00) Central Time (USA, Kanada)' },
    { id: 'Mountain Standard Time', label: '(UTC-07:00) Mountain Time (USA, Kanada)' },
    { id: 'Pacific Standard Time', label: '(UTC-08:00) Pacific Time (USA, Kanada)' },
    { id: 'Atlantic Standard Time', label: '(UTC-04:00) Atlantik (Kanada)' },
    { id: 'E. South America Standard Time', label: '(UTC-03:00) Brasília' },
    { id: 'Argentina Standard Time', label: '(UTC-03:00) Buenos Aires' },
    { id: 'South Africa Standard Time', label: '(UTC+02:00) Pretoria, Johannesburg' },
    { id: 'Egypt Standard Time', label: '(UTC+02:00) Kairo' },
    { id: 'Iran Standard Time', label: '(UTC+03:30) Teheran' },
    { id: 'Pakistan Standard Time', label: '(UTC+05:00) Islamabad, Karatschi' }
  ];

  var SERVER_VERSIONS = [
    { id: '2025', label: 'Windows Server 2025' },
    { id: '2022', label: 'Windows Server 2022' },
    { id: '2019', label: 'Windows Server 2019' },
    { id: '2016', label: 'Windows Server 2016' }
  ];

  /* Server-Editionen mit der Einschränkung, für welche Versionen es sie gibt:
     Essentials endet mit Server 2019, Datacenter: Azure Edition gibt es erst
     ab Server 2022. Ohne `versions` gilt der Eintrag für alle Versionen. */
  var SERVER_EDITIONS = [
    { id: 'Standard', label: 'Standard' },
    { id: 'Datacenter', label: 'Datacenter' },
    { id: 'Datacenter: Azure Edition', label: 'Datacenter: Azure Edition', versions: ['2022', '2025'] },
    { id: 'Essentials', label: 'Essentials', versions: ['2016', '2019'] }
  ];

  /* Editionen, die es für die gewählte Server-Version tatsächlich gibt. */
  function serverEditionsFor(version) {
    return SERVER_EDITIONS.filter(function (entry) {
      return !entry.versions || entry.versions.indexOf(version) !== -1;
    });
  }

  /* Bekannte Client-Image-Namen für LTSC und IoT Enterprise. Der Name muss
     exakt dem Image auf dem Medium entsprechen – daher bleibt das Feld
     editierbar und die Auswahl setzt nur einen Vorschlag. */
  var EDITION_PRESETS = [
    { id: 'ltsc2019', target: 'windows10', image: 'Windows 10 Enterprise LTSC 2019', family: 'ltsc' },
    { id: 'iot2019', target: 'windows10', image: 'Windows 10 IoT Enterprise LTSC 2019', family: 'iot' },
    { id: 'ltsc2021', target: 'windows10', image: 'Windows 10 Enterprise LTSC 2021', family: 'ltsc' },
    { id: 'iot2021', target: 'windows10', image: 'Windows 10 IoT Enterprise LTSC 2021', family: 'iot' },
    { id: 'ltsc2024', target: 'windows11', image: 'Windows 11 Enterprise LTSC 2024', family: 'ltsc' },
    { id: 'iot2024', target: 'windows11', image: 'Windows 11 IoT Enterprise LTSC 2024', family: 'iot' }
  ];

  /* Client-Editionen, wie sie im Installationsmedium heißen – je Zielversion.
     Die Auswahl setzt nur einen Vorschlag; der Image-Name bleibt editierbar. */
  var CLIENT_EDITIONS = {
    windows11: ['Home', 'Home N', 'Home Single Language', 'Pro', 'Pro N',
      'Pro for Workstations', 'Pro Education', 'Education', 'Education N',
      'Enterprise', 'Enterprise N', 'Enterprise G', 'Enterprise Multi-Session'],
    windows10: ['Home', 'Home N', 'Home Single Language', 'Home Country Specific',
      'Pro', 'Pro N', 'Pro for Workstations', 'Pro Education', 'Education',
      'Education N', 'Enterprise', 'Enterprise N', 'Enterprise G', 'Enterprise Multi-Session']
  };

  /* Alle auswählbaren Image-Namen einer Zielversion: Standard-Editionen plus
     die LTSC-/IoT-Vorlagen. */
  function editionsFor(target) {
    var prefix = target === 'windows10' ? 'Windows 10 ' : 'Windows 11 ';
    var standard = (CLIENT_EDITIONS[target] || []).map(function (name) {
      return {
        id: target + '-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        target: target,
        image: prefix + name
      };
    });
    var special = EDITION_PRESETS.filter(function (entry) { return entry.target === target; });
    return standard.concat(special);
  }

  var SERVER_INSTALL_TYPES = [
    { id: 'desktop', label: 'Desktop Experience (mit GUI)' },
    { id: 'core', label: 'Server Core (ohne GUI)' }
  ];

  /* Windows Setup erwartet die Image-Namen genau in dieser Schreibweise:
     "Windows Server 2022 Standard" bzw. "... Standard (Desktop Experience)".
     Essentials gibt es nur mit Oberfläche; das Medium führt das Image ohne
     Zusatz, deshalb entfällt dort die Variante im Namen. */
  function serverImageName(version, edition, installType) {
    var name = 'Windows Server ' + version + ' ' + edition;
    if (edition === 'Essentials') return name;
    return installType === 'desktop' ? name + ' (Desktop Experience)' : name;
  }

  /* Gemeinsame Grundlage der deutschen Windows-11-Beispiele: Sprache,
     Zeitzone, GPT und die ausgeblendeten OOBE-Seiten. Spart in jeder Vorlage
     ein Dutzend gleicher Zeilen. */
  var WIN11_BASE = {
    target: 'windows11',
    architecture: 'amd64',
    uiLanguage: 'de-DE',
    systemLocale: 'de-DE',
    userLocale: 'de-DE',
    inputLocale: '0407:00000407',
    timezone: 'W. Europe Standard Time',
    diskMode: 'gpt',
    userName: 'Benutzer',
    userGroup: 'Administrators',
    hideEulaPage: true,
    hideOnlineAccountScreens: true,
    hideWirelessSetup: true
  };

  function withBase(overrides) {
    var config = {};
    Object.keys(WIN11_BASE).forEach(function (key) { config[key] = WIN11_BASE[key]; });
    Object.keys(overrides).forEach(function (key) { config[key] = overrides[key]; });
    return config;
  }

  /* Vollständige Beispielkonfigurationen: id (intern), name (Auswahlliste)
     und config (Teilmenge von DEFAULTS aus generator.js). Fehlende Schlüssel
     ergänzt die Oberfläche beim Anwenden aus den Vorgaben, deshalb muss hier
     nur stehen, was von der Vorgabe abweicht. */
  var PRESETS = [
    {
      id: 'win11-de',
      name: 'Windows 11 – Deutsch, Standard-PC',
      config: withBase({
        bypassTpm: true,
        bypassSecureBoot: true,
        bypassRam: true,
        bypassCpu: true,
        disableConsumerFeatures: true,
        removeBloatware: true,
        showFileExtensions: true
      })
    },
    {
      id: 'win11-minimal',
      name: 'Windows 11 – minimal, ohne Eingriffe',
      config: {
        target: 'windows11',
        architecture: 'amd64',
        uiLanguage: 'en-US',
        systemLocale: 'en-US',
        userLocale: 'en-US',
        inputLocale: '0409:00000409',
        timezone: 'UTC',
        diskMode: 'gpt',
        userName: 'User',
        userGroup: 'Administrators',
        bypassTpm: false,
        bypassSecureBoot: false,
        bypassRam: false,
        bypassCpu: false,
        disableConsumerFeatures: false,
        removeBloatware: false,
        showFileExtensions: false
      }
    },
    {
      id: 'win10-de',
      name: 'Windows 10 – Deutsch, BIOS oder UEFI',
      config: {
        target: 'windows10',
        architecture: 'amd64',
        uiLanguage: 'de-DE',
        systemLocale: 'de-DE',
        userLocale: 'de-DE',
        inputLocale: '0407:00000407',
        timezone: 'W. Europe Standard Time',
        diskMode: 'gpt',
        userName: 'Benutzer',
        userGroup: 'Administrators',
        disableConsumerFeatures: true,
        showFileExtensions: true,
        numLockOn: true
      }
    },
    {
      id: 'vm-win11',
      name: 'VM (Hyper-V / VirtualBox / Proxmox) – Windows 11',
      config: {
        target: 'windows11',
        architecture: 'amd64',
        uiLanguage: 'de-DE',
        systemLocale: 'de-DE',
        userLocale: 'de-DE',
        inputLocale: '0407:00000407',
        timezone: 'W. Europe Standard Time',
        diskMode: 'gpt',
        userName: 'admin',
        userPassword: 'Start123!',
        administratorPassword: 'Start123!',
        autoLogon: true,
        autoLogonCount: '1',
        enableRdp: true,
        bypassTpm: true,
        bypassSecureBoot: true,
        bypassRam: true,
        bypassCpu: true,
        disableConsumerFeatures: true,
        removeBloatware: true,
        showFileExtensions: true
      }
    },
    {
      id: 'server-desktop',
      name: 'Windows Server 2022 – Standard, Desktop Experience',
      config: {
        target: 'server',
        serverVersion: '2022',
        serverEdition: 'Standard',
        serverInstallType: 'desktop',
        architecture: 'amd64',
        uiLanguage: 'de-DE',
        systemLocale: 'de-DE',
        userLocale: 'de-DE',
        inputLocale: '0407:00000407',
        timezone: 'W. Europe Standard Time',
        diskMode: 'gpt',
        editionMode: 'name',
        editionValue: 'Windows Server 2022 Standard (Desktop Experience)',
        userName: '',
        userGroup: 'Administrators',
        administratorPassword: '',
        autoLogon: false,
        hideEulaPage: false,
        hideOnlineAccountScreens: false,
        hideWirelessSetup: false,
        bypassTpm: false,
        bypassSecureBoot: false,
        bypassRam: false,
        bypassCpu: false,
        disableConsumerFeatures: false,
        removeBloatware: false,
        showFileExtensions: false
      }
    },
    {
      id: 'server-azure',
      name: 'Windows Server 2025 – Datacenter: Azure Edition, Server Core',
      config: {
        target: 'server',
        serverVersion: '2025',
        serverEdition: 'Datacenter: Azure Edition',
        serverInstallType: 'core',
        architecture: 'amd64',
        uiLanguage: 'de-DE',
        systemLocale: 'de-DE',
        userLocale: 'de-DE',
        inputLocale: '0407:00000407',
        timezone: 'W. Europe Standard Time',
        diskMode: 'gpt',
        editionMode: 'name',
        editionValue: 'Windows Server 2025 Datacenter: Azure Edition',
        userName: '',
        userGroup: 'Administrators',
        administratorPassword: '',
        autoLogon: false,
        enableRdp: true,
        hideEulaPage: false,
        hideOnlineAccountScreens: false,
        hideWirelessSetup: false,
        bypassTpm: false,
        bypassSecureBoot: false,
        bypassRam: false,
        bypassCpu: false,
        disableConsumerFeatures: false,
        removeBloatware: false,
        uninstallOneDrive: false,
        showFileExtensions: false,
        darkMode: false,
        disableWidgets: false
      }
    },
    {
      id: 'server-core',
      name: 'Windows Server 2025 – Datacenter, Server Core',
      config: {
        target: 'server',
        serverVersion: '2025',
        serverEdition: 'Datacenter',
        serverInstallType: 'core',
        architecture: 'amd64',
        uiLanguage: 'de-DE',
        systemLocale: 'de-DE',
        userLocale: 'de-DE',
        inputLocale: '0407:00000407',
        timezone: 'W. Europe Standard Time',
        diskMode: 'gpt',
        editionMode: 'name',
        editionValue: 'Windows Server 2025 Datacenter',
        userName: '',
        userGroup: 'Administrators',
        administratorPassword: '',
        autoLogon: false,
        enableRdp: true,
        hideEulaPage: false,
        hideOnlineAccountScreens: false,
        hideWirelessSetup: false,
        bypassTpm: false,
        bypassSecureBoot: false,
        bypassRam: false,
        bypassCpu: false,
        disableConsumerFeatures: false,
        removeBloatware: false,
        uninstallOneDrive: false,
        showFileExtensions: false,
        darkMode: false,
        disableWidgets: false
      }
    },
    {
      id: 'quick-company',
      name: 'Windows 11 – Unternehmen, schlank',
      config: withBase({
        bypassTpm: true,
        bypassSecureBoot: true,
        bypassRam: true,
        bypassCpu: true,
        disableConsumerFeatures: true,
        disableAppSuggestions: true,
        removeBloatware: true,
        disableTelemetry: true,
        disableCortana: true,
        disableWebSearch: true,
        enableRdp: true,
        showFileExtensions: true
      })
    },
    {
      id: 'quick-privacy',
      name: 'Windows 11 – Datenschutz, gehärtet',
      config: withBase({
        disableConsumerFeatures: true,
        disableAppSuggestions: true,
        removeBloatware: true,
        uninstallOneDrive: true,
        disableTelemetry: true,
        disableCortana: true,
        disableWebSearch: true,
        disableCopilot: true
      })
    },
    {
      id: 'quick-gaming',
      name: 'Windows 11 – Gaming, Leistung',
      config: withBase({
        bypassTpm: true,
        bypassSecureBoot: true,
        bypassRam: true,
        bypassCpu: true,
        disableConsumerFeatures: true,
        removeBloatware: true,
        disableGameDvr: true,
        disableWidgets: true,
        disableCortana: true,
        disableWebSearch: true,
        showFileExtensions: true,
        numLockOn: true
      })
    }
  ];

  /* Die vier Schnellprofile der Oberfläche: Verweis auf eine Vorlage plus
     kurze Beschreibung. */
  var QUICK_PROFILES = [
    { preset: 'win11-de', label: 'Standard', description: 'Deutsch, GPT, Windows-11-Bypässe, Apps entfernt – der übliche Heimumbau.' },
    { preset: 'quick-company', label: 'Unternehmen', description: 'Schlank ohne Consumer-Inhalte; Telemetrie, Cortana und Websuche aus, RDP an.' },
    { preset: 'quick-privacy', label: 'Datenschutz', description: 'Telemetrie, Werbung, Cortana und OneDrive aus; TPM- und Secure-Boot-Pflicht bleibt.' },
    { preset: 'quick-gaming', label: 'Gaming', description: 'Bloatware, Widgets und Game DVR aus, Hardware-Bypässe an.' }
  ];

  return {
    languages: LANGUAGES,
    keyboards: KEYBOARDS,
    timezones: TIMEZONES,
    presets: PRESETS,
    serverVersions: SERVER_VERSIONS,
    serverEditions: SERVER_EDITIONS,
    serverEditionsFor: serverEditionsFor,
    serverInstallTypes: SERVER_INSTALL_TYPES,
    serverImageName: serverImageName,
    editionsFor: editionsFor,
    quickProfiles: QUICK_PROFILES
  };
})();

if (typeof module === 'object' && module.exports) {
  module.exports = UnattendData;
}
