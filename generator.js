/*
 * Unattend-Generator – reine Logik, ohne DOM-Abhängigkeiten.
 * Erzeugt aus einem Konfigurationsobjekt eine vollständige autounattend.xml
 * mit den Pässen windowsPE, specialize und oobeSystem.
 *
 * Läuft im Browser (window.UnattendGenerator) und in Node (module.exports).
 *
 * Teile der Optimierungen, Kontorichtlinien und der Skript-Einbettung sind
 * Übersetzungen aus dem C#-Projekt "unattend-generator" von Christoph
 * Schneegans (https://github.com/cschneegans/unattend-generator), MIT-Lizenz.
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.UnattendGenerator = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var WCM_NS = 'http://schemas.microsoft.com/WMIConfig/2002/State';
  var XSI_NS = 'http://www.w3.org/2001/XMLSchema-instance';
  var PUBLIC_KEY_TOKEN = '31bf3856ad364e35';

  /* Offizielle KMS-Clientschlüssel (GVLK), veröffentlicht von Microsoft:
     https://learn.microsoft.com/windows-server/get-started/kms-client-activation-keys
     Sie aktivieren ausschließlich gegen einen KMS-Host im eigenen Netz und
     sind keine Lizenz – der echte Schlüssel wird später per
     "slmgr /ipk <Schlüssel>" nachgetragen. */
  var KMS_KEYS = [
    { id: 'win-pro', group: 'Windows 11 / 10', label: 'Pro', scope: 'client', key: 'W269N-WFGWX-YVC9B-4J6C9-T83GX' },
    { id: 'win-pro-n', group: 'Windows 11 / 10', label: 'Pro N', scope: 'client', key: 'MH37W-N47XK-V7XM9-C7227-GCQG9' },
    { id: 'win-pro-workstations', group: 'Windows 11 / 10', label: 'Pro for Workstations', scope: 'client', key: 'NRG8B-VKK3Q-CXVCJ-9G2XF-6Q84J' },
    { id: 'win-pro-workstations-n', group: 'Windows 11 / 10', label: 'Pro for Workstations N', scope: 'client', key: '9FNHH-K3HBT-3W4TD-6383H-6XYWF' },
    { id: 'win-pro-education', group: 'Windows 11 / 10', label: 'Pro Education', scope: 'client', key: '6TP4R-GNPTD-KYYHQ-7B7DP-J447Y' },
    { id: 'win-pro-education-n', group: 'Windows 11 / 10', label: 'Pro Education N', scope: 'client', key: 'YVWGF-BXNMC-HTQYQ-CPQ99-66QFC' },
    { id: 'win-education', group: 'Windows 11 / 10', label: 'Education', scope: 'client', key: 'NW6C2-QMPVW-D7KKK-3GKT6-VCFB2' },
    { id: 'win-education-n', group: 'Windows 11 / 10', label: 'Education N', scope: 'client', key: '2WH4N-8QGBV-H22JP-CT43Q-MDWWJ' },
    { id: 'win-enterprise', group: 'Windows 11 / 10', label: 'Enterprise', scope: 'client', key: 'NPPR9-FWDCX-D2C8J-H872K-2YT43' },
    { id: 'win-enterprise-n', group: 'Windows 11 / 10', label: 'Enterprise N', scope: 'client', key: 'DPH2V-TTNVB-4X9Q3-TJR4H-KHJW4' },
    { id: 'win-enterprise-g', group: 'Windows 11 / 10', label: 'Enterprise G', scope: 'client', key: 'YYVX9-NTFWV-6MDM3-9PT4T-4M68B' },
    { id: 'win-enterprise-g-n', group: 'Windows 11 / 10', label: 'Enterprise G N', scope: 'client', key: '44RPN-FTY23-9VTTB-MP9BX-T84FV' },
    { id: 'ltsc-enterprise', group: 'LTSC / IoT Enterprise', label: 'Enterprise LTSC (2019, 2021, 2024)', scope: 'client', key: 'M7XTQ-FN8P6-TTKYV-9D4CC-J462D' },
    { id: 'ltsc-enterprise-n', group: 'LTSC / IoT Enterprise', label: 'Enterprise N LTSC (2019, 2021, 2024)', scope: 'client', key: '92NFX-8DJQP-P6BBQ-THF9C-7CG2H' },
    { id: 'iot-enterprise-ltsc', group: 'LTSC / IoT Enterprise', label: 'IoT Enterprise LTSC (2021, 2024)', scope: 'client', key: 'KBN8V-HFGQ4-MGXVD-347P6-PDQGT' },
    { id: 'server2025-standard', group: 'Windows Server 2025', label: 'Standard', scope: 'server', version: '2025', edition: 'Standard', key: 'TVRH6-WHNXV-R9WG3-9XRFY-MY832' },
    { id: 'server2025-datacenter', group: 'Windows Server 2025', label: 'Datacenter', scope: 'server', version: '2025', edition: 'Datacenter', key: 'D764K-2NDRG-47T6Q-P8T8W-YP6DF' },
    { id: 'server2025-azure', group: 'Windows Server 2025', label: 'Datacenter: Azure Edition', scope: 'server', version: '2025', edition: 'Datacenter: Azure Edition', key: 'XGN3F-F394H-FD2MY-PP6FD-8MCRC' },
    { id: 'server2022-standard', group: 'Windows Server 2022', label: 'Standard', scope: 'server', version: '2022', edition: 'Standard', key: 'VDYBN-27WPP-V4HQT-9VMD4-VMK7H' },
    { id: 'server2022-datacenter', group: 'Windows Server 2022', label: 'Datacenter', scope: 'server', version: '2022', edition: 'Datacenter', key: 'WX4NM-KYWYW-QJJR4-XV3QB-6VM33' },
    { id: 'server2022-azure', group: 'Windows Server 2022', label: 'Datacenter: Azure Edition', scope: 'server', version: '2022', edition: 'Datacenter: Azure Edition', key: 'NTBV8-9K7Q8-V27C6-M2BTV-KHMXV' },
    { id: 'server2019-standard', group: 'Windows Server 2019', label: 'Standard', scope: 'server', version: '2019', edition: 'Standard', key: 'N69G4-B89J2-4G8F4-WWYCC-J464C' },
    { id: 'server2019-datacenter', group: 'Windows Server 2019', label: 'Datacenter', scope: 'server', version: '2019', edition: 'Datacenter', key: 'WMDGN-G9PQG-XVVXX-R3X43-63DFG' },
    { id: 'server2019-essentials', group: 'Windows Server 2019', label: 'Essentials', scope: 'server', version: '2019', edition: 'Essentials', key: 'WVDHN-86M7X-466P6-VHXV7-YY726' },
    { id: 'server2016-standard', group: 'Windows Server 2016', label: 'Standard', scope: 'server', version: '2016', edition: 'Standard', key: 'WC2BQ-8NRM3-FDDYY-2BFGV-KHKQY' },
    { id: 'server2016-datacenter', group: 'Windows Server 2016', label: 'Datacenter', scope: 'server', version: '2016', edition: 'Datacenter', key: 'CB7KF-BWN84-R7R2Y-793K2-8XDDG' },
    { id: 'server2016-essentials', group: 'Windows Server 2016', label: 'Essentials', scope: 'server', version: '2016', edition: 'Essentials', key: 'JCKRF-N37P4-C2D82-9YXRT-4M63B' }
  ];

  /* Sucht einen Katalogschlüssel, unabhängig von Schreibweise und Leerzeichen. */
  function findKmsKey(key) {
    var value = String(key === undefined || key === null ? '' : key).trim().toUpperCase();
    if (!value) return null;
    for (var i = 0; i < KMS_KEYS.length; i++) {
      if (KMS_KEYS[i].key === value) return KMS_KEYS[i];
    }
    return null;
  }

  var DEFAULTS = {
    target: 'windows11',
    architecture: 'amd64',
    serverVersion: '2022',
    serverEdition: 'Standard',
    serverInstallType: 'desktop',
    editionMode: 'index',
    editionValue: '1',
    productKey: '',
    computerName: '',
    owner: '',
    organization: '',
    uiLanguage: 'de-DE',
    systemLocale: 'de-DE',
    userLocale: 'de-DE',
    inputLocale: '0407:00000407',
    timezone: 'W. Europe Standard Time',
    acceptEula: true,
    enableFirewall: true,
    disableDynamicUpdate: true,
    diskMode: 'gpt',
    diskId: '0',
    partitionId: '3',
    wipeDisk: true,
    userName: 'Benutzer',
    userDisplayName: '',
    userPassword: '',
    userGroup: 'Administrators',
    administratorPassword: '',
    autoLogon: false,
    autoLogonCount: '1',
    hideEulaPage: true,
    hideOnlineAccountScreens: true,
    hideWirelessSetup: true,
    protectYourPC: '3',
    bypassTpm: true,
    bypassSecureBoot: true,
    bypassRam: true,
    bypassCpu: true,
    bypassMsAccount: true,
    disableConsumerFeatures: true,
    disableCopilot: false,
    removeBloatware: false,
    uninstallOneDrive: false,
    disableTelemetry: false,
    disableCortana: false,
    disableWebSearch: false,
    enableRdp: false,
    disableFastStartup: false,
    disableUac: false,
    numLockOn: false,
    showFileExtensions: false,
    darkMode: false,
    disableWidgets: false,
    disableSac: false,
    disableSmartScreen: false,
    disableSystemRestore: false,
    enableLongPaths: false,
    preventAutomaticReboot: false,
    preventDeviceEncryption: false,
    hideEdgeFre: false,
    disableEdgeStartupBoost: false,
    deleteEdgeDesktopIcon: false,
    disableAppSuggestions: false,
    allowPowerShellScripts: false,
    disableLastAccess: false,
    classicContextMenu: false,
    leftTaskbar: false,
    hideTaskViewButton: false,
    passwordMode: 'default',
    passwordMaxAge: '42',
    lockoutMode: 'default',
    lockoutThreshold: '10',
    lockoutDuration: '30',
    lockoutWindow: '30',
    specializeScript: '',
    firstLogonScript: '',
    staticIp: false,
    nicName: 'Ethernet',
    ip: '',
    subnet: '255.255.255.0',
    gateway: '',
    dns1: '',
    dns2: '',
    specializeCommands: '',
    firstLogonCommands: ''
  };

  var ARCHITECTURES = ['amd64', 'x86', 'arm64'];
  var TARGETS = ['windows11', 'windows10', 'server'];
  var SERVER_VERSIONS = ['2016', '2019', '2022', '2025'];
  var SERVER_EDITIONS = ['Standard', 'Datacenter', 'Datacenter: Azure Edition'];
  var SERVER_INSTALL_TYPES = ['core', 'desktop'];
  var EDITION_MODES = ['index', 'name', 'choose'];
  var DISK_MODES = ['gpt', 'mbr', 'existing', 'partition'];

  /* ------------------------------------------------------------------ *
   * XML-Grundgerüst
   * ------------------------------------------------------------------ */

  function esc(value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function n(name, attrs, children) {
    return { name: name, attrs: attrs || null, children: children || [] };
  }

  function v(name, value) {
    if (value === undefined || value === null) return null;
    return n(name, null, [String(value)]);
  }

  function compact(list) {
    return list.filter(function (item) {
      return item !== null && item !== undefined && item !== false;
    });
  }

  function render(node, depth) {
    var pad = new Array(depth + 1).join('  ');
    if (typeof node === 'string') return pad + esc(node);

    var attrs = '';
    if (node.attrs) {
      Object.keys(node.attrs).forEach(function (key) {
        var value = node.attrs[key];
        if (value === undefined || value === null) return;
        attrs += ' ' + key + '="' + esc(value) + '"';
      });
    }

    if (!node.children || node.children.length === 0) {
      return pad + '<' + node.name + attrs + ' />';
    }

    /* Reine Textinhalte bleiben in einer Zeile, damit Windows Setup exakte
       Werte erhält (kein zusätzlicher Leerraum). */
    var textOnly = node.children.every(function (child) { return typeof child === 'string'; });
    if (textOnly) {
      var text = node.children.map(function (child) { return esc(child); }).join('');
      return pad + '<' + node.name + attrs + '>' + text + '</' + node.name + '>';
    }

    var inner = node.children
      .map(function (child) { return render(child, depth + 1); })
      .join('\r\n');

    return pad + '<' + node.name + attrs + '>\r\n' + inner + '\r\n' + pad + '</' + node.name + '>';
  }

  function component(name, architecture, children) {
    return n('component', {
      name: name,
      processorArchitecture: architecture,
      publicKeyToken: PUBLIC_KEY_TOKEN,
      language: 'neutral',
      versionScope: 'nonSxS',
      'xmlns:wcm': WCM_NS,
      'xmlns:xsi': XSI_NS
    }, compact(children));
  }

  /* ------------------------------------------------------------------ *
   * Konfiguration normalisieren
   * ------------------------------------------------------------------ */

  function bool(value) {
    return value === true || value === 1 || value === '1' || value === 'true' || value === 'on';
  }

  function str(value, fallback) {
    var result = value === undefined || value === null ? '' : String(value).trim();
    return result === '' ? (fallback === undefined ? '' : fallback) : result;
  }

  /* Nur Ziffern: verhindert ungültige Werte wie <DiskID>abc</DiskID>, wenn
     jemand falsch tippt oder eine fremde JSON-Datei importiert. */
  function int(value, fallback) {
    var digits = String(value === undefined || value === null ? '' : value).replace(/[^0-9]/g, '');
    return digits === '' ? fallback : digits;
  }

  /* REG_SZ-Werte werden immer gequotet: sonst zerlegt cmd Werte mit Leerzeichen
     und der Aufrufer müsste die Anführungszeichen selbst mitliefern. */
  function regValue(type, value) {
    var text = String(value);
    return type === 'REG_SZ' ? '"' + text + '"' : text;
  }

  /* Einheitliche Schreibweise für Registry-Befehle in allen Pässen. */
  function regAdd(key, name, type, value) {
    return 'reg add "' + key + '" /v ' + name + ' /t ' + type + ' /d ' + regValue(type, value) + ' /f';
  }

  /* Setzt den Standardwert eines Schlüssels (/ve). */
  function regSetDefault(key, type, value) {
    if (type === undefined) return 'reg add "' + key + '" /ve /f';
    return 'reg add "' + key + '" /ve /t ' + type + ' /d ' + value + ' /f';
  }

  /* Lesbarer Einzeiler für feste PowerShell-Befehle. */
  function psCommand(script) {
    return 'powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "' + script + '"';
  }

  var BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  function base64FromBytes(bytes) {
    var out = '';
    var index = 0;
    while (index < bytes.length) {
      var b0 = bytes[index++];
      var b1 = index < bytes.length ? bytes[index++] : undefined;
      var b2 = index < bytes.length ? bytes[index++] : undefined;
      out += BASE64_CHARS.charAt(b0 >> 2);
      out += BASE64_CHARS.charAt(((b0 & 0x03) << 4) | (b1 === undefined ? 0 : b1 >> 4));
      out += b1 === undefined ? '=' : BASE64_CHARS.charAt(((b1 & 0x0f) << 2) | (b2 === undefined ? 0 : b2 >> 6));
      out += b2 === undefined ? '=' : BASE64_CHARS.charAt(b2 & 0x3f);
    }
    return out;
  }

  /* PowerShell erwartet -EncodedCommand als base64-kodiertes UTF-16LE. */
  function encodePowerShell(script) {
    var text = String(script === undefined || script === null ? '' : script);
    var bytes = [];
    for (var i = 0; i < text.length; i += 1) {
      var code = text.charCodeAt(i);
      bytes.push(code & 0xff, (code >> 8) & 0xff);
    }
    return base64FromBytes(bytes);
  }

  /* Mehrzeilige Skripte werden eingebettet, statt sie in Anführungszeichen zu quetschen. */
  function scriptCommands(script) {
    var text = String(script === undefined || script === null ? '' : script);
    if (text.trim() === '') return [];
    return ['powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ' + encodePowerShell(text)];
  }

  function isServer(cfg) {
    return cfg.target === 'server';
  }

  function lines(value) {
    return String(value === undefined || value === null ? '' : value)
      .split(/\r?\n/)
      .map(function (line) { return line.trim(); })
      .filter(function (line) { return line !== '' && line.charAt(0) !== '#'; });
  }

  function normalize(input) {
    var cfg = {};
    var key;
    for (key in DEFAULTS) {
      if (Object.prototype.hasOwnProperty.call(DEFAULTS, key)) cfg[key] = DEFAULTS[key];
    }
    if (input && typeof input === 'object') {
      for (key in input) {
        if (Object.prototype.hasOwnProperty.call(input, key) && input[key] !== undefined) {
          cfg[key] = input[key];
        }
      }
    }

    for (key in cfg) {
      if (typeof DEFAULTS[key] === 'boolean') cfg[key] = bool(cfg[key]);
    }

    cfg.target = TARGETS.indexOf(cfg.target) === -1 ? 'windows11' : cfg.target;
    cfg.architecture = ARCHITECTURES.indexOf(cfg.architecture) === -1 ? 'amd64' : cfg.architecture;
    cfg.serverVersion = SERVER_VERSIONS.indexOf(cfg.serverVersion) === -1 ? '2022' : cfg.serverVersion;
    cfg.serverEdition = SERVER_EDITIONS.indexOf(cfg.serverEdition) === -1 ? 'Standard' : cfg.serverEdition;
    cfg.serverInstallType = SERVER_INSTALL_TYPES.indexOf(cfg.serverInstallType) === -1 ? 'desktop' : cfg.serverInstallType;
    cfg.editionMode = EDITION_MODES.indexOf(cfg.editionMode) === -1 ? 'index' : cfg.editionMode;
    cfg.diskMode = DISK_MODES.indexOf(cfg.diskMode) === -1 ? 'gpt' : cfg.diskMode;

    cfg.diskId = int(cfg.diskId, '0');
    cfg.partitionId = int(cfg.partitionId, '3');
    cfg.autoLogonCount = int(cfg.autoLogonCount, '1');
    cfg.editionValue = str(cfg.editionValue, cfg.editionMode === 'name' ? 'Windows 11 Pro' : '1');
    cfg.protectYourPC = str(cfg.protectYourPC, '3');
    if (['1', '2', '3'].indexOf(cfg.protectYourPC) === -1) cfg.protectYourPC = '3';

    cfg.passwordMode = ['default', 'unlimited', 'custom'].indexOf(cfg.passwordMode) === -1 ? 'default' : cfg.passwordMode;
    cfg.lockoutMode = ['default', 'disabled', 'custom'].indexOf(cfg.lockoutMode) === -1 ? 'default' : cfg.lockoutMode;
    cfg.passwordMaxAge = int(cfg.passwordMaxAge, '42');
    cfg.lockoutThreshold = int(cfg.lockoutThreshold, '10');
    cfg.lockoutDuration = int(cfg.lockoutDuration, '30');
    cfg.lockoutWindow = int(cfg.lockoutWindow, '30');
    cfg.specializeScript = String(cfg.specializeScript === undefined ? '' : cfg.specializeScript);
    cfg.firstLogonScript = String(cfg.firstLogonScript === undefined ? '' : cfg.firstLogonScript);
    cfg.userGroup = str(cfg.userGroup, 'Administrators');
    cfg.timezone = str(cfg.timezone, 'UTC');
    cfg.uiLanguage = str(cfg.uiLanguage, 'en-US');
    cfg.systemLocale = str(cfg.systemLocale, cfg.uiLanguage);
    cfg.userLocale = str(cfg.userLocale, cfg.uiLanguage);
    cfg.inputLocale = str(cfg.inputLocale, '0409:00000409');
    cfg.nicName = str(cfg.nicName, 'Ethernet');

    cfg.userName = str(cfg.userName);
    cfg.userDisplayName = str(cfg.userDisplayName);
    cfg.computerName = str(cfg.computerName);
    cfg.owner = str(cfg.owner);
    cfg.organization = str(cfg.organization);
    cfg.productKey = str(cfg.productKey);
    cfg.specializeCommands = String(cfg.specializeCommands === undefined ? '' : cfg.specializeCommands);
    cfg.firstLogonCommands = String(cfg.firstLogonCommands === undefined ? '' : cfg.firstLogonCommands);
    cfg.administratorPassword = String(cfg.administratorPassword === undefined ? '' : cfg.administratorPassword);
    cfg.userPassword = String(cfg.userPassword === undefined ? '' : cfg.userPassword);

    return cfg;
  }

  /* ------------------------------------------------------------------ *
   * windowsPE
   * ------------------------------------------------------------------ */

  function internationalCore(name, cfg, withSetupUi) {
    var children = [
      v('InputLocale', cfg.inputLocale),
      v('SystemLocale', cfg.systemLocale),
      v('UILanguage', cfg.uiLanguage),
      v('UserLocale', cfg.userLocale)
    ];
    if (withSetupUi) {
      children.push(n('SetupUILanguage', null, [v('UILanguage', cfg.uiLanguage)]));
    }
    return component(name, cfg.architecture, children);
  }

  function diskConfiguration(cfg) {
    var willShowUi = v('WillShowUI', 'OnError');

    if (cfg.diskMode === 'existing') {
      return n('DiskConfiguration', null, [willShowUi]);
    }

    if (cfg.diskMode === 'partition') {
      return n('DiskConfiguration', null, [
        n('Disk', { 'wcm:action': 'add' }, [
          v('DiskID', cfg.diskId),
          v('WillWipeDisk', cfg.wipeDisk ? 'true' : 'false')
        ]),
        willShowUi
      ]);
    }

    if (cfg.diskMode === 'mbr') {
      return n('DiskConfiguration', null, [
        n('Disk', { 'wcm:action': 'add' }, [
          n('CreatePartitions', null, [
            n('CreatePartition', { 'wcm:action': 'add' }, [
              v('Order', 1),
              v('Size', 500),
              v('Type', 'Primary')
            ]),
            n('CreatePartition', { 'wcm:action': 'add' }, [
              v('Order', 2),
              v('Extend', 'true'),
              v('Type', 'Primary')
            ])
          ]),
          n('ModifyPartitions', null, [
            n('ModifyPartition', { 'wcm:action': 'add' }, [
              v('Active', 'true'),
              v('Format', 'NTFS'),
              v('Label', 'System'),
              v('Order', 1),
              v('PartitionID', 1)
            ]),
            n('ModifyPartition', { 'wcm:action': 'add' }, [
              v('Format', 'NTFS'),
              v('Label', 'Windows'),
              v('Letter', 'C'),
              v('Order', 2),
              v('PartitionID', 2)
            ])
          ]),
          v('DiskID', cfg.diskId),
          v('WillWipeDisk', cfg.wipeDisk ? 'true' : 'false')
        ]),
        willShowUi
      ]);
    }

    /* UEFI / GPT: EFI (1), MSR (2), Windows (3) */
    return n('DiskConfiguration', null, [
      n('Disk', { 'wcm:action': 'add' }, [
        n('CreatePartitions', null, [
          n('CreatePartition', { 'wcm:action': 'add' }, [
            v('Order', 1),
            v('Size', 100),
            v('Type', 'EFI')
          ]),
          n('CreatePartition', { 'wcm:action': 'add' }, [
            v('Order', 2),
            v('Size', 16),
            v('Type', 'MSR')
          ]),
          n('CreatePartition', { 'wcm:action': 'add' }, [
            v('Order', 3),
            v('Extend', 'true'),
            v('Type', 'Primary')
          ])
        ]),
        n('ModifyPartitions', null, [
          n('ModifyPartition', { 'wcm:action': 'add' }, [
            v('Format', 'FAT32'),
            v('Label', 'System'),
            v('Order', 1),
            v('PartitionID', 1)
          ]),
          n('ModifyPartition', { 'wcm:action': 'add' }, [
            v('Format', 'NTFS'),
            v('Label', 'Windows'),
            v('Letter', 'C'),
            v('Order', 2),
            v('PartitionID', 3)
          ])
        ]),
        v('DiskID', cfg.diskId),
        v('WillWipeDisk', cfg.wipeDisk ? 'true' : 'false')
      ]),
      willShowUi
    ]);
  }

  function targetPartition(cfg) {
    if (cfg.diskMode === 'gpt') return '3';
    if (cfg.diskMode === 'mbr') return '2';
    return cfg.partitionId;
  }

  function imageInstall(cfg) {
    var children = [];

    if (cfg.editionMode !== 'choose') {
      children.push(n('InstallFrom', null, [
        n('MetaData', { 'wcm:action': 'add' }, [
          v('Key', cfg.editionMode === 'name' ? '/IMAGE/NAME' : '/IMAGE/INDEX'),
          v('Value', cfg.editionValue)
        ])
      ]));
    }

    if (cfg.diskMode === 'existing') {
      children.push(v('InstallToAvailablePartition', 'true'));
    } else {
      children.push(n('InstallTo', null, [
        v('DiskID', cfg.diskId),
        v('PartitionID', targetPartition(cfg))
      ]));
    }

    children.push(v('WillShowUI', 'OnError'));

    return n('ImageInstall', null, [
      n('OSImage', null, children)
    ]);
  }

  function userData(cfg) {
    var children = [v('AcceptEula', 'true')];
    if (cfg.owner) children.push(v('FullName', cfg.owner));
    if (cfg.organization) children.push(v('Organization', cfg.organization));
    if (cfg.productKey) {
      children.push(n('ProductKey', null, [
        v('Key', cfg.productKey),
        v('WillShowUI', 'OnError')
      ]));
    } else if (cfg.editionMode === 'choose') {
      /* Interaktive Schlüssel-/Editionswahl braucht einen Platzhalter und
         WillShowUI=Always – ohne den Knoten überspringt Setup die Seite
         (im C#-Original als Issue #415 behoben). */
      children.push(n('ProductKey', null, [
        v('Key', '00000-00000-00000-00000-00000'),
        v('WillShowUI', 'Always')
      ]));
    }
    return n('UserData', null, children);
  }

  function hardwareBypassCommands(cfg) {
    var commands = [];
    var lab = 'HKLM\\SYSTEM\\Setup\\LabConfig';

    /* Die Hardwareprüfungen (TPM, Secure Boot, RAM, CPU) gibt es nur bei Client-Setups. */
    if (isServer(cfg)) return commands;

    if (cfg.bypassTpm) commands.push(regAdd(lab, 'BypassTPMCheck', 'REG_DWORD', 1));
    if (cfg.bypassSecureBoot) commands.push(regAdd(lab, 'BypassSecureBootCheck', 'REG_DWORD', 1));
    if (cfg.bypassRam) commands.push(regAdd(lab, 'BypassRAMCheck', 'REG_DWORD', 1));
    if (cfg.bypassCpu) commands.push(regAdd(lab, 'BypassCPUCheck', 'REG_DWORD', 1));
    return commands;
  }

  function runSynchronous(commands) {
    return n('RunSynchronous', null, commands.map(function (command, index) {
      return n('RunSynchronousCommand', { 'wcm:action': 'add' }, [
        v('Order', index + 1),
        v('Path', command),
        v('Description', 'Unattend Setup ' + (index + 1))
      ]);
    }));
  }

  function setupComponent(cfg) {
    var children = [];
    children.push(diskConfiguration(cfg));

    if (cfg.disableDynamicUpdate) {
      children.push(n('DynamicUpdate', null, [
        v('Enable', 'false'),
        v('WillShowUI', 'OnError')
      ]));
    }
    if (cfg.enableFirewall) children.push(v('EnableFirewall', 'true'));

    children.push(imageInstall(cfg));

    var bypass = hardwareBypassCommands(cfg);
    if (bypass.length) children.push(runSynchronous(bypass));

    children.push(userData(cfg));

    return component('Microsoft-Windows-Setup', cfg.architecture, children);
  }

  /* ------------------------------------------------------------------ *
   * specialize
   * ------------------------------------------------------------------ */

  function shellSetupSpecialize(cfg) {
    var children = [];
    if (cfg.computerName) children.push(v('ComputerName', cfg.computerName));
    if (cfg.productKey) {
      children.push(n('ProductKey', null, [
        v('Key', cfg.productKey),
        v('WillShowUI', 'Never')
      ]));
    }
    if (cfg.organization) children.push(v('RegisteredOrganization', cfg.organization));
    if (cfg.owner) children.push(v('RegisteredOwner', cfg.owner));
    children.push(v('TimeZone', cfg.timezone));

    return component('Microsoft-Windows-Shell-Setup', cfg.architecture, children);
  }

  /* ------------------------------------------------------------------ *
   * Optimierungen – übersetzt aus modifier/Optimizations.cs des
   * C#-Generators von Christoph Schneegans (MIT-Lizenz).
   * ------------------------------------------------------------------ */

  function systemOptimizations(cfg) {
    var commands = [];
    var client = !isServer(cfg);

    function reg(key, name, type, value) {
      commands.push(regAdd(key, name, type, value));
    }

    if (client && cfg.disableWidgets) {
      reg('HKLM\\SOFTWARE\\Policies\\Microsoft\\Dsh', 'AllowNewsAndInterests', 'REG_DWORD', 0);
    }
    if (cfg.disableSac) {
      reg('HKLM\\SYSTEM\\CurrentControlSet\\Control\\CI\\Policy', 'VerifiedAndReputablePolicyState', 'REG_DWORD', 0);
    }
    if (client && cfg.disableSmartScreen) {
      reg('HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer', 'SmartScreenEnabled', 'REG_SZ', 'Off');
      var wtds = 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WTDS\\Components';
      reg(wtds, 'ServiceEnabled', 'REG_DWORD', 0);
      reg(wtds, 'NotifyMalicious', 'REG_DWORD', 0);
      reg(wtds, 'NotifyPasswordReuse', 'REG_DWORD', 0);
      reg(wtds, 'NotifyUnsafeApp', 'REG_DWORD', 0);
      reg('HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows Defender Security Center\\Systray', 'HideSystray', 'REG_DWORD', 1);
    }
    if (cfg.enableLongPaths) {
      reg('HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem', 'LongPathsEnabled', 'REG_DWORD', 1);
    }
    if (cfg.preventAutomaticReboot) {
      reg('HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU', 'AUOptions', 'REG_DWORD', 4);
      reg('HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU', 'NoAutoRebootWithLoggedOnUsers', 'REG_DWORD', 1);
    }
    if (cfg.preventDeviceEncryption) {
      reg('HKLM\\SYSTEM\\CurrentControlSet\\Control\\BitLocker', 'PreventDeviceEncryption', 'REG_DWORD', 1);
    }
    if (client && cfg.hideEdgeFre) {
      reg('HKLM\\Software\\Policies\\Microsoft\\Edge', 'HideFirstRunExperience', 'REG_DWORD', 1);
    }
    if (client && cfg.disableEdgeStartupBoost) {
      reg('HKLM\\Software\\Policies\\Microsoft\\Edge\\Recommended', 'BackgroundModeEnabled', 'REG_DWORD', 0);
      reg('HKLM\\Software\\Policies\\Microsoft\\Edge\\Recommended', 'StartupBoostEnabled', 'REG_DWORD', 0);
    }
    if (client && cfg.deleteEdgeDesktopIcon) {
      commands.push('cmd /c del /f /q "C:\\Users\\Public\\Desktop\\Microsoft Edge.lnk"');
    }
    if (cfg.allowPowerShellScripts) {
      commands.push(psCommand('Set-ExecutionPolicy -Scope LocalMachine -ExecutionPolicy RemoteSigned -Force'));
    }
    if (cfg.disableLastAccess) {
      commands.push('fsutil.exe behavior set disableLastAccess 1');
    }

    /* Kontorichtlinien (aus Lockout.cs und PasswordExpiration.cs) */
    if (cfg.passwordMode === 'unlimited') {
      commands.push('net.exe accounts /maxpwage:UNLIMITED');
    } else if (cfg.passwordMode === 'custom') {
      commands.push('net.exe accounts /maxpwage:' + cfg.passwordMaxAge);
    }
    if (cfg.lockoutMode === 'disabled') {
      commands.push('net.exe accounts /lockoutthreshold:0');
    } else if (cfg.lockoutMode === 'custom') {
      commands.push('net.exe accounts /lockoutthreshold:' + cfg.lockoutThreshold +
        ' /lockoutduration:' + cfg.lockoutDuration +
        ' /lockoutwindow:' + cfg.lockoutWindow);
    }

    return commands;
  }

  /* Läuft ausschließlich über firstLogonCommandList und damit nur bei
     Client-Installationen – Serverprüfungen wären hier toter Code. */
  function userOptimizations(cfg) {
    var commands = [];

    function reg(key, name, type, value) {
      commands.push(regAdd(key, name, type, value));
    }

    var advanced = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced';

    if (cfg.disableSmartScreen) {
      commands.push(regSetDefault('HKCU\\Software\\Microsoft\\Edge\\SmartScreenEnabled', 'REG_DWORD', 0));
      commands.push(regSetDefault('HKCU\\Software\\Microsoft\\Edge\\SmartScreenPuaEnabled', 'REG_DWORD', 0));
      reg('HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\AppHost', 'EnableWebContentEvaluation', 'REG_DWORD', 0);
      reg('HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\AppHost', 'PreventOverride', 'REG_DWORD', 0);
    }
    if (cfg.classicContextMenu) {
      commands.push(regSetDefault('HKCU\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32'));
      commands.push('cmd /c "taskkill /f /im explorer.exe & start explorer.exe"');
    }
    if (cfg.leftTaskbar) {
      reg(advanced, 'TaskbarAl', 'REG_DWORD', 0);
    }
    if (cfg.hideTaskViewButton) {
      reg(advanced, 'ShowTaskViewButton', 'REG_DWORD', 0);
    }
    if (cfg.disableAppSuggestions) {
      var names = [
        'ContentDeliveryAllowed', 'FeatureManagementEnabled', 'OEMPreInstalledAppsEnabled',
        'PreInstalledAppsEnabled', 'PreInstalledAppsEverEnabled', 'SilentInstalledAppsEnabled',
        'SoftLandingEnabled', 'SubscribedContentEnabled', 'SubscribedContent-310093Enabled',
        'SubscribedContent-338387Enabled', 'SubscribedContent-338388Enabled', 'SubscribedContent-338389Enabled',
        'SubscribedContent-338393Enabled', 'SubscribedContent-353694Enabled', 'SubscribedContent-353696Enabled',
        'SubscribedContent-353698Enabled', 'SystemPaneSuggestionsEnabled'
      ];
      var cdm = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager';
      names.forEach(function (name) { reg(cdm, name, 'REG_DWORD', 0); });
    }
    if (cfg.disableSystemRestore) {
      commands.push(psCommand("Disable-ComputerRestore -Drive 'C:\\'"));
    }
    if (cfg.deleteEdgeDesktopIcon) {
      commands.push('cmd /c del /f /q "%USERPROFILE%\\Desktop\\Microsoft Edge.lnk"');
    }

    return commands;
  }

  function specializeCommandList(cfg) {
    var commands = [];

    function reg(key, name, type, value) {
      commands.push(regAdd(key, name, type, value));
    }

    if (cfg.bypassMsAccount && !isServer(cfg)) {
      reg('HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\OOBE', 'BypassNRO', 'REG_DWORD', 1);
    }
    if (cfg.disableTelemetry) {
      reg('HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection', 'AllowTelemetry', 'REG_DWORD', 0);
      reg('HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\DataCollection', 'AllowTelemetry', 'REG_DWORD', 0);
    }
    /* Das Original setzt die CloudContent-Policy bei „App-Vorschläge“ immer mit,
       weil die per-User-Werte allein nur das bestehende Profil treffen. */
    if ((cfg.disableConsumerFeatures || cfg.disableAppSuggestions) && !isServer(cfg)) {
      reg('HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent', 'DisableWindowsConsumerFeatures', 'REG_DWORD', 1);
    }
    if (cfg.disableCortana) {
      reg('HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search', 'AllowCortana', 'REG_DWORD', 0);
      reg('HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search', 'DisableSearchBoxSuggestions', 'REG_DWORD', 1);
    }
    if (cfg.disableWebSearch) {
      reg('HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search', 'ConnectedSearchUseWeb', 'REG_DWORD', 0);
      reg('HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search', 'DisableWebSearch', 'REG_DWORD', 1);
    }
    if (cfg.disableCopilot && !isServer(cfg)) {
      reg('HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsCopilot', 'TurnOffWindowsCopilot', 'REG_DWORD', 1);
    }
    if (cfg.disableFastStartup) {
      reg('HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power', 'HiberbootEnabled', 'REG_DWORD', 0);
    }
    if (cfg.disableUac) {
      reg('HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System', 'EnableLUA', 'REG_DWORD', 0);
    }
    if (cfg.numLockOn) {
      reg('HKU\\.DEFAULT\\Control Panel\\Keyboard', 'InitialKeyboardIndicators', 'REG_SZ', 2);
    }
    if (cfg.enableRdp) {
      reg('HKLM\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server', 'fDenyTSConnections', 'REG_DWORD', 0);
      commands.push('netsh advfirewall firewall add rule name="Remote Desktop (TCP-In) 3389" dir=in action=allow protocol=TCP localport=3389');
    }

    if (cfg.staticIp && cfg.ip) {
      var address = 'netsh interface ipv4 set address name="' + cfg.nicName + '" static ' + cfg.ip + ' ' + cfg.subnet;
      if (cfg.gateway) address += ' ' + cfg.gateway;
      commands.push(address);

      if (cfg.dns1) {
        commands.push('netsh interface ipv4 set dns name="' + cfg.nicName + '" static ' + cfg.dns1);
      }
      if (cfg.dns2) {
        commands.push('netsh interface ipv4 add dns name="' + cfg.nicName + '" ' + cfg.dns2 + ' index=2');
      }
    }

    return commands.concat(systemOptimizations(cfg));
  }

  function deploymentSpecialize(cfg) {
    var commands = specializeCommandList(cfg)
      .concat(lines(cfg.specializeCommands), scriptCommands(cfg.specializeScript));
    if (!commands.length) return null;
    return component('Microsoft-Windows-Deployment', cfg.architecture, [runSynchronous(commands)]);
  }

  /* ------------------------------------------------------------------ *
   * oobeSystem
   * ------------------------------------------------------------------ */

  function firstLogonCommandList(cfg) {
    var commands = [];

    var advanced = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced';
    var personalize = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize';

    if (cfg.showFileExtensions) {
      commands.push(regAdd(advanced, 'HideFileExt', 'REG_DWORD', 0));
    }
    if (cfg.darkMode) {
      commands.push(regAdd(personalize, 'AppsUseLightTheme', 'REG_DWORD', 0));
      commands.push(regAdd(personalize, 'SystemUsesLightTheme', 'REG_DWORD', 0));
    }
    if (cfg.uninstallOneDrive) {
      commands.push('cmd /c "taskkill /F /IM OneDrive.exe & C:\\Windows\\SysWOW64\\OneDriveSetup.exe /uninstall"');
    }
    if (cfg.removeBloatware) {
      commands.push('powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-AppxPackage -AllUsers | Where-Object { $_.Name -match \'Xbox|Zune|SkypeApp|BingNews|BingWeather|Solitaire|GetHelp|Getstarted|OfficeHub|People|CommunicationsApps|FeedbackHub|Teams|Clipchamp|3DViewer|MixedReality\' } | Remove-AppxPackage -AllUsers -ErrorAction SilentlyContinue"');
    }

    return commands.concat(userOptimizations(cfg));
  }

  function passwordNode(tag, value) {
    return n(tag, null, [v('Value', value), v('PlainText', 'true')]);
  }

  function localAccountNode(cfg) {
    var user = cfg.userName;
    return n('LocalAccount', { 'wcm:action': 'add' }, compact([
      cfg.userPassword ? passwordNode('Password', cfg.userPassword) : null,
      v('Description', 'Lokales Benutzerkonto'),
      v('DisplayName', cfg.userDisplayName || user),
      v('Group', cfg.userGroup),
      v('Name', user)
    ]));
  }

  function shellSetupOobe(cfg) {
    var children = [];

    /* Die OOBE-Seiten (EULA, Microsoft-Konto, WLAN) gibt es nur beim Client-Setup. */
    if (!isServer(cfg)) {
      children.push(n('OOBE', null, [
        v('HideEULAPage', cfg.hideEulaPage ? 'true' : 'false'),
        v('HideOnlineAccountScreens', cfg.hideOnlineAccountScreens ? 'true' : 'false'),
        v('HideWirelessSetupInOOBE', cfg.hideWirelessSetup ? 'true' : 'false'),
        v('ProtectYourPC', cfg.protectYourPC)
      ]));
    }

    var accountChildren = [];
    if (cfg.administratorPassword) {
      accountChildren.push(passwordNode('AdministratorPassword', cfg.administratorPassword));
    }
    if (cfg.userName) {
      accountChildren.push(n('LocalAccounts', null, [localAccountNode(cfg)]));
    }
    if (accountChildren.length) {
      children.push(n('UserAccounts', null, accountChildren));
    }

    if (cfg.autoLogon && cfg.userName) {
      children.push(n('AutoLogon', null, compact([
        cfg.userPassword ? passwordNode('Password', cfg.userPassword) : null,
        v('Enabled', 'true'),
        v('LogonCount', cfg.autoLogonCount),
        v('Username', cfg.userName)
      ])));
    }

    /* Auf Server nur eigene Befehle und Skripte: Dateiendungen, Design, Widgets,
       Apps und OneDrive betreffen ausschließlich Client-Installationen. */
    var firstLogon = (isServer(cfg) ? [] : firstLogonCommandList(cfg))
      .concat(lines(cfg.firstLogonCommands), scriptCommands(cfg.firstLogonScript));
    if (firstLogon.length) {
      children.push(n('FirstLogonCommands', null, firstLogon.map(function (command, index) {
        return n('SynchronousCommand', { 'wcm:action': 'add' }, [
          v('Order', index + 1),
          v('CommandLine', command),
          v('Description', 'FirstLogon ' + (index + 1)),
          v('RequiresUserInput', 'false')
        ]);
      })));
    }

    return component('Microsoft-Windows-Shell-Setup', cfg.architecture, children);
  }

  /* ------------------------------------------------------------------ *
   * Zusammenbau
   * ------------------------------------------------------------------ */

  function buildUnattend(input) {
    var cfg = normalize(input);

    var windowsPe = n('settings', { pass: 'windowsPE' }, [
      internationalCore('Microsoft-Windows-International-Core-WinPE', cfg, true),
      setupComponent(cfg)
    ]);

    var specialize = n('settings', { pass: 'specialize' }, compact([
      shellSetupSpecialize(cfg),
      deploymentSpecialize(cfg),
      cfg.target === 'server'
        ? component('Microsoft-Windows-ServerManager-SvrMgrNc', cfg.architecture, [v('DoNotOpenServerManagerAtLogon', 'true')])
        : null,
      component('Microsoft-Windows-Security-SPP', cfg.architecture, [v('SkipRearm', 1)])
    ]));

    var oobe = n('settings', { pass: 'oobeSystem' }, [
      shellSetupOobe(cfg),
      internationalCore('Microsoft-Windows-International-Core', cfg, false)
    ]);

    var root = n('unattend', { xmlns: 'urn:schemas-microsoft-com:unattend' }, [windowsPe, specialize, oobe]);

    return [
      '<?xml version="1.0" encoding="utf-8"?>',
      '<!-- autounattend.xml, erzeugt mit dem lokalen Unattend-Generator. -->',
      render(root, 0),
      ''
    ].join('\r\n');
  }

  /* ------------------------------------------------------------------ *
   * Plausibilitätsprüfung
   * ------------------------------------------------------------------ */

  function hasClientOnlyOptions(cfg) {
    return cfg.bypassTpm || cfg.bypassSecureBoot || cfg.bypassRam || cfg.bypassCpu ||
      cfg.bypassMsAccount || cfg.disableConsumerFeatures || cfg.disableCopilot ||
      cfg.removeBloatware || cfg.uninstallOneDrive || cfg.hideEulaPage ||
      cfg.hideOnlineAccountScreens || cfg.hideWirelessSetup || cfg.showFileExtensions ||
      cfg.darkMode || cfg.disableWidgets || cfg.disableSmartScreen || cfg.hideEdgeFre ||
      cfg.disableEdgeStartupBoost || cfg.deleteEdgeDesktopIcon || cfg.disableAppSuggestions ||
      cfg.classicContextMenu || cfg.leftTaskbar || cfg.hideTaskViewButton || cfg.disableSystemRestore;
  }

  /* Welche Editionsfamilie steckt im Image-Namen? Die Familie entscheidet
     über Prüfungen und darüber, ob Client-Optionen überhaupt greifen. */
  function editionFamily(editionValue) {
    var name = String(editionValue === undefined || editionValue === null ? '' : editionValue);
    if (/Datacenter: Azure Edition/i.test(name)) return 'azure';
    if (/^Windows (?:10|11) IoT Enterprise/i.test(name)) return 'iot';
    if (/^Windows (?:10|11) Enterprise (?:N )?LTSC/i.test(name)) return 'ltsc';
    if (/^Windows Server /i.test(name)) return 'server';
    if (/^Windows 10/i.test(name)) return 'client10';
    if (/^Windows 11/i.test(name)) return 'client11';
    return 'unknown';
  }

  function analyze(input) {
    var cfg = normalize(input);
    var warnings = [];
    var family = editionFamily(cfg.editionValue);
    var iot = family === 'iot';
    var ltscLike = family === 'ltsc' || iot;

    if (cfg.target === 'windows11' && cfg.architecture === 'x86') {
      warnings.push('Windows 11 gibt es nur für x64 und ARM64. Für x86 bitte Windows 10 oder Server wählen.');
    }
    if (cfg.target === 'windows11' && cfg.diskMode === 'mbr' && !iot) {
      warnings.push('Windows 11 benötigt UEFI mit GPT. Der MBR-Modus ist nur für Windows 10/Server im BIOS-Modus sinnvoll.');
    }
    if (cfg.target === 'windows11' && cfg.diskMode === 'gpt' && !cfg.bypassTpm && !cfg.bypassSecureBoot && !iot) {
      warnings.push('Windows 11 ohne Hardware-Bypass: TPM 2.0, Secure Boot und UEFI müssen vorhanden sein.');
    }
    if (cfg.autoLogon && !cfg.userName) {
      warnings.push('Automatische Anmeldung ist aktiv, aber kein Benutzername gesetzt – AutoLogon wird weggelassen.');
    }
    if (cfg.autoLogon && cfg.userName && !cfg.userPassword) {
      warnings.push('AutoLogon ohne Kennwort funktioniert nicht zuverlässig. Bitte ein Kennwort für das Konto setzen.');
    }
    if (cfg.computerName && cfg.computerName.length > 15) {
      warnings.push('Der Computername ist länger als 15 Zeichen. Windows kürzt ihn beim Setup.');
    }
    if (cfg.computerName && !/^[A-Za-z0-9*-]+$/.test(cfg.computerName)) {
      warnings.push('Der Computername enthält ungültige Zeichen. Erlaubt sind Buchstaben, Ziffern, "-" und "*".');
    } else if (cfg.computerName === '*') {
      /* Windows vergibt dann selbst einen Namen (DESKTOP-XXXXXXX). */
    } else if (cfg.computerName && cfg.computerName.indexOf('*') !== -1) {
      warnings.push('Ein „*“ erzeugt nur allein einen Zufallsnamen. „' + cfg.computerName + '“ wird von Setup nicht als Muster verstanden – bitte einen festen Namen eintragen oder das Feld leer lassen.');
    } else if (cfg.computerName && /^\d+$/.test(cfg.computerName)) {
      warnings.push('Der Computername darf nicht nur aus Ziffern bestehen.');
    }
    if (cfg.staticIp && !cfg.ip) {
      warnings.push('Statische IP ist aktiv, aber keine IP-Adresse angegeben – die Netzwerkkonfiguration wird weggelassen.');
    }
    if (cfg.staticIp && cfg.ip && !cfg.gateway) {
      warnings.push('Statische IP ohne Gateway: Der Rechner erreicht nur das lokale Subnetz.');
    }
    if (cfg.diskMode === 'partition' && !cfg.wipeDisk) {
      warnings.push('Bestehende Partition ohne Löschen: Windows wird auf die angegebene Partition installiert, vorhandene Daten bleiben erhalten.');
    }
    if (!isServer(cfg) && !cfg.userName && !cfg.administratorPassword) {
      warnings.push('Weder lokales Konto noch Administratorkennwort gesetzt – Windows fragt die Zugangsdaten im OOBE ab.');
    }
    if (cfg.editionMode === 'name' && /^\d+$/.test(cfg.editionValue)) {
      warnings.push('Edition wird über den Namen gewählt, der Wert ist aber eine Zahl. Bitte den Image-Namen eintragen (z. B. "Windows 11 Pro").');
    }
    if (cfg.userName) {
      var reservedNames = ['administrator', 'guest', 'defaultaccount', 'system',
        'network service', 'local service', 'none', 'wdagutilityaccount'];
      if (cfg.userName.length > 20) {
        warnings.push('Der Benutzername ist länger als 20 Zeichen – Windows kürzt ihn beim Anlegen des Kontos.');
      } else if (/[/\\[\]:;|=,+*?<>"%]/.test(cfg.userName)) {
        warnings.push('Der Benutzername enthält Zeichen, die Windows nicht zulässt: / \\ [ ] : ; | = , + * ? < > " %.');
      } else if (/\.$/.test(cfg.userName)) {
        warnings.push('Der Benutzername darf nicht mit einem Punkt enden.');
      } else if (reservedNames.indexOf(cfg.userName.toLowerCase()) !== -1) {
        warnings.push('„' + cfg.userName + '“ ist ein reservierter Kontoname (u. a. Administrator, Guest, DefaultAccount, WDAGUtilityAccount) und kann nicht angelegt werden.');
      }
    }
    if (cfg.productKey === '') {
      if (cfg.editionMode === 'choose') {
        warnings.push('Interaktive Edition: Das Setup bekommt den Platzhalter-Schlüssel 00000-00000-00000-00000-00000 und zeigt die Schlüssel- und Editionsseite. Bei Multi-Edition-Images erscheint trotzdem manchmal nur eine Edition – dann hilft eine eigene sources\\ei.cfg neben dem boot.wim.');
      } else {
        warnings.push('Ohne Produktschlüssel fragt das Setup nach dem Schlüssel.');
      }
    }

    var kms = findKmsKey(cfg.productKey);
    if (kms) {
      var kmsName = kms.scope === 'server'
        ? 'Windows Server ' + kms.version + ' ' + kms.edition
        : kms.label;
      warnings.push('„' + kms.key + '“ ist der offizielle KMS-Clientschlüssel (GVLK) für ' + kmsName +
        ': Er aktiviert nur gegen einen KMS-Host im eigenen Netz und ist keine Lizenz. Den echten Schlüssel später mit „slmgr /ipk“ nachtragen – ohne KMS-Host bleibt Windows nicht aktiviert.');
      if (kms.scope === 'server' && !isServer(cfg)) {
        warnings.push('Der KMS-Schlüssel gehört zu ' + kmsName + ', die Zielversion ist aber ein Client-Betriebssystem.');
      }
      if (kms.scope === 'client' && isServer(cfg)) {
        warnings.push('Der KMS-Schlüssel gehört zu einer Client-Edition, die Zielversion ist aber Windows Server.');
      }
      if (kms.scope === 'server' && kms.version !== cfg.serverVersion) {
        warnings.push('Der KMS-Schlüssel gehört zu Windows Server ' + kms.version + ', die Zielversion ist ' + cfg.serverVersion + '.');
      }
      if (kms.scope === 'server' && kms.edition !== cfg.serverEdition) {
        warnings.push('Der KMS-Schlüssel gehört zu ' + kms.edition + ', die Server-Edition ist ' + cfg.serverEdition + '.');
      }
    }

    var imageVersion = (/^Windows (10|11)\b/i.exec(cfg.editionValue) || [])[1];
    if (imageVersion && !isServer(cfg) && cfg.target !== 'windows' + imageVersion) {
      warnings.push('Der Image-Name gehört zu Windows ' + imageVersion + ', die Zielversion ist aber Windows ' +
        (cfg.target === 'windows10' ? '10' : '11') + '.');
    }
    if ((ltscLike || family === 'client10' || family === 'client11') && isServer(cfg)) {
      warnings.push('Der Image-Name gehört zu einer Client-Edition, die Zielversion steht aber auf Windows Server.');
    }
    if (family === 'azure' && !isServer(cfg)) {
      warnings.push('„Datacenter: Azure Edition“ ist eine Server-Edition – bitte die Zielversion auf Windows Server stellen.');
    }
    if (ltscLike) {
      var pointless = [];
      if (cfg.removeBloatware) pointless.push('Apps entfernen');
      if (cfg.disableConsumerFeatures) pointless.push('Werbeinhalte');
      if (cfg.disableAppSuggestions) pointless.push('App-Vorschläge');
      if (cfg.uninstallOneDrive) pointless.push('OneDrive');
      if (cfg.bypassMsAccount) pointless.push('Microsoft-Konto-Bypass');
      if (pointless.length) {
        warnings.push('LTSC bringt weder Store-Apps noch Consumer-Features (' + pointless.join(', ') + ') – diese Optionen laufen ins Leere.');
      }
    }
    if (iot && cfg.target === 'windows11' && (cfg.bypassTpm || cfg.bypassSecureBoot)) {
      warnings.push('Windows 11 IoT Enterprise LTSC hat TPM und Secure Boot optional – die Hardware-Bypässe sind unnötig.');
    }
    if (family === 'azure') {
      warnings.push('Datacenter: Azure Edition gibt es nur als Virtualisierungs-Edition (Azure bzw. Evaluierungsmedium) und nur mit Aktivierung über Azure. Das Image muss auf dem Medium vorhanden sein.');
    }

    if (cfg.lockoutMode === 'custom' && Number(cfg.lockoutWindow) > Number(cfg.lockoutDuration)) {
      warnings.push('Das Sperrfenster darf nicht größer als die Sperrdauer sein – net accounts lehnt diese Kombination ab.');
    }
    if (encodePowerShell(cfg.specializeScript).length > 7000) {
      warnings.push('Das specialize-Skript ist sehr lang. Die kodierte Befehlszeile kann das Windows-Limit von 32.767 Zeichen überschreiten.');
    }
    if (encodePowerShell(cfg.firstLogonScript).length > 7000) {
      warnings.push('Das FirstLogon-Skript ist sehr lang. Die kodierte Befehlszeile kann das Windows-Limit von 32.767 Zeichen überschreiten.');
    }

    if (isServer(cfg)) {
      if (cfg.architecture !== 'amd64') {
        warnings.push('Windows Server 2016 und neuer gibt es nur für x64. Bitte die Architektur auf amd64 stellen.');
      }
      if (!cfg.administratorPassword) {
        warnings.push('Server fragt ohne Kennwort interaktiv nach dem Administratorkennwort. Bitte „Kennwort des integrierten Administrators“ setzen.');
      }
      if (cfg.editionMode !== 'name') {
        warnings.push('Server-Medien haben je nach Version und Sprache unterschiedliche Image-Indizes. Die Auswahl über den Image-Namen ist eindeutiger.');
      }
      if (hasClientOnlyOptions(cfg)) {
        warnings.push('Client-Optionen (Hardware-Bypass, Microsoft-Konto, Werbeinhalte, Apps, OneDrive, Desktop-Anpassungen) werden für Server nicht in die Datei übernommen.');
      }
      if (cfg.serverInstallType === 'core' && lines(cfg.firstLogonCommands).length) {
        warnings.push('Server Core hat keinen Desktop: FirstLogonCommands laufen erst nach einer interaktiven Anmeldung. Systemweite Befehle gehören in den specialize-Pass.');
      }
    }

    return warnings;
  }

  return {
    defaults: function () {
      var copy = {};
      for (var key in DEFAULTS) {
        if (Object.prototype.hasOwnProperty.call(DEFAULTS, key)) copy[key] = DEFAULTS[key];
      }
      return copy;
    },
    normalize: normalize,
    buildUnattend: buildUnattend,
    analyze: analyze,
    kmsKeys: KMS_KEYS,
    escape: esc
  };
});
