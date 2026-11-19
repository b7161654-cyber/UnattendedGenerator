/*
 * Oberfläche des Unattend-Generators.
 * Klassisches Script ohne Module, damit die Seite direkt per file:// läuft.
 *
 * Ablauf: buildSelects() füllt die Auswahllisten, bind() verdrahtet die
 * Ereignisse, dann läuft für jede Änderung genau eine Runde update():
 * Formular lesen -> buildUnattend() -> Vorschau, Zusammenfassung, Warnungen.
 * Danach wird die Konfiguration verzögert im localStorage gesichert.
 *
 * Ein neues Feld ergänzen:
 *   1. Bedienelement in index.html mit einer id anlegen.
 *   2. Die id in TEXT_FIELDS (Eingaben, Auswahlen) oder BOOL_FIELDS
 *      (Checkboxen) eintragen – damit wird sie automatisch gelesen,
 *      geschrieben, importiert und gespeichert.
 *   3. Falls das Feld andere Felder sperrt oder Auswahllisten füllt:
 *      syncFieldStates() bzw. einen apply*-Handler ergänzen.
 *   4. Die eigentliche XML-Ausgabe entsteht in generator.js.
 */
(function () {
  'use strict';

  var D = window.UnattendData;
  var G = window.UnattendGenerator;
  var STORAGE_KEY = 'unattend-generator.config.v1';

  /* Vertrag zwischen HTML und Logik: Jede dieser ids muss es in index.html
     geben. TEXT_FIELDS sind Eingabefelder und Auswahlen (immer Strings),
     BOOL_FIELDS sind Checkboxen (immer true/false). Beide Listen werden von
     readForm() und writeForm() verwendet; fehlt ein Feld dort, wird es beim
     Speichern, Laden und Importieren stillschweigend ignoriert. */
  var TEXT_FIELDS = [
    'target', 'architecture', 'editionMode', 'editionValue', 'productKey',
    'serverVersion', 'serverEdition', 'serverInstallType',
    'computerName', 'owner', 'organization',
    'uiLanguage', 'systemLocale', 'userLocale', 'inputLocale', 'inputLocale2', 'inputLocale3', 'timezone',
    'diskMode', 'diskId', 'partitionId', 'driverPaths',
    'userName', 'userDisplayName', 'userPassword', 'userGroup',
    'administratorPassword', 'autoLogonCount', 'protectYourPC',
    'nicName', 'ip', 'subnet', 'gateway', 'dns1', 'dns2',
    'passwordMode', 'passwordMaxAge', 'lockoutMode', 'lockoutThreshold', 'lockoutDuration', 'lockoutWindow',
    'specializeCommands', 'firstLogonCommands', 'specializeScript', 'firstLogonScript'
  ];

  var BOOL_FIELDS = [
    'acceptEula', 'enableFirewall', 'disableDynamicUpdate', 'wipeDisk',
    'autoLogon', 'hideEulaPage', 'hideOnlineAccountScreens', 'hideWirelessSetup',
    'bypassTpm', 'bypassSecureBoot', 'bypassRam', 'bypassCpu', 'bypassMsAccount',
    'disableConsumerFeatures', 'disableCopilot', 'removeBloatware', 'uninstallOneDrive',
    'disableTelemetry', 'disableCortana', 'disableWebSearch', 'enableRdp',
    'disableFastStartup', 'disableUac', 'numLockOn',
    'showFileExtensions', 'darkMode', 'disableWidgets',
    'disableSac', 'disableSmartScreen', 'disableSystemRestore', 'enableLongPaths',
    'preventAutomaticReboot', 'preventDeviceEncryption', 'hideEdgeFre', 'disableEdgeStartupBoost',
    'deleteEdgeDesktopIcon', 'disableAppSuggestions', 'allowPowerShellScripts', 'disableLastAccess',
    'classicContextMenu', 'leftTaskbar', 'hideTaskViewButton',
    'staticIp', 'oemProductKey', 'disableGameDvr'
  ];

  var form = document.getElementById('configForm');
  var preview = document.getElementById('xmlPreview');
  var warningsBox = document.getElementById('warnings');
  var summary = document.getElementById('summary');
  var presetSelect = document.getElementById('presetSelect');

  var currentXml = '';

  function byId(id) { return document.getElementById(id); }

  /* ------------------------------------------------------------ Auswahllisten */

  function fillLanguageSelect(select) {
    var fragment = document.createDocumentFragment();
    D.languages.forEach(function (language) {
      var option = document.createElement('option');
      option.value = language.code;
      option.textContent = language.code + ' – ' + language.label;
      fragment.appendChild(option);
    });
    select.appendChild(fragment);
  }

  function fillSimpleSelect(select, entries, valueKey, labelKey) {
    var fragment = document.createDocumentFragment();
    entries.forEach(function (entry) {
      var option = document.createElement('option');
      option.value = entry[valueKey];
      option.textContent = entry[labelKey];
      fragment.appendChild(option);
    });
    select.appendChild(fragment);
  }

  function buildSelects() {
    ['uiLanguage', 'systemLocale', 'userLocale'].forEach(function (id) {
      fillLanguageSelect(byId(id));
    });
    fillSimpleSelect(byId('inputLocale'), D.keyboards, 'id', 'label');
    ['inputLocale2', 'inputLocale3'].forEach(function (id) {
      var optional = document.createElement('option');
      optional.value = '';
      optional.textContent = 'kein weiteres Layout';
      byId(id).appendChild(optional);
      fillSimpleSelect(byId(id), D.keyboards, 'id', 'label');
    });
    fillSimpleSelect(byId('timezone'), D.timezones, 'id', 'label');
    fillSimpleSelect(byId('serverVersion'), D.serverVersions, 'id', 'label');
    fillSimpleSelect(byId('serverEdition'), D.serverEditions, 'id', 'label');
    fillSimpleSelect(byId('serverInstallType'), D.serverInstallTypes, 'id', 'label');
    fillKeyPresets();

    buildEditionOptions();

    var custom = document.createElement('option');
    custom.value = '';
    custom.textContent = 'Eigene Konfiguration';
    presetSelect.appendChild(custom);

    D.presets.forEach(function (preset) {
      var option = document.createElement('option');
      option.value = preset.id;
      option.textContent = preset.name;
      presetSelect.appendChild(option);
    });
  }

  /* ------------------------------------------------------------ Formular lesen/schreiben */

  function readForm() {
    var cfg = {};
    TEXT_FIELDS.forEach(function (id) {
      var element = byId(id);
      if (element) cfg[id] = element.value;
    });
    BOOL_FIELDS.forEach(function (id) {
      var element = byId(id);
      if (element) cfg[id] = element.checked;
    });
    return cfg;
  }

  function writeForm(cfg) {
    var merged = G.normalize(cfg);
    TEXT_FIELDS.forEach(function (id) {
      var element = byId(id);
      if (!element) return;
      var value = merged[id];
      element.value = value === undefined || value === null ? '' : String(value);
    });
    BOOL_FIELDS.forEach(function (id) {
      var element = byId(id);
      if (element) element.checked = !!merged[id];
    });
    buildEditionOptions();
    syncEditionPreset();
    syncKeyPreset();
  }

  function lockField(id, locked) {
    var field = byId(id);
    if (!field) return;
    field.disabled = locked;
    field.parentElement.classList.toggle('is-locked', locked);
  }

  /* Übernimmt den Server-Image-Namen aus Version, Edition und Variante. */
  function applyServerImage() {
    if (byId('target').value === 'server') {
      byId('editionMode').value = 'name';
      byId('editionValue').value = D.serverImageName(
        byId('serverVersion').value,
        byId('serverEdition').value,
        byId('serverInstallType').value
      );
      return;
    }
    /* Beim Wechsel zurück zum Client den automatisch gesetzten Server-Namen entfernen. */
    if (/^Windows Server /.test(byId('editionValue').value)) {
      byId('editionMode').value = 'index';
      byId('editionValue').value = '1';
    }
  }

  /* Editionen werden nach Zielversion gefiltert angeboten. */
  function buildEditionOptions() {
    var select = byId('editionPreset');
    var target = byId('target').value;
    var entries = D.editionsFor(target);
    var current = select.value;
    var keep = entries.filter(function (entry) { return entry.id === current; })[0];

    select.innerHTML = '';
    var custom = document.createElement('option');
    custom.value = 'custom';
    custom.textContent = target === 'server'
      ? 'wird aus Server-Version und -Edition erzeugt'
      : 'Andere Edition / freie Eingabe';
    select.appendChild(custom);

    entries.forEach(function (entry) {
      var option = document.createElement('option');
      option.value = entry.id;
      option.textContent = entry.image;
      select.appendChild(option);
    });
    select.value = keep ? current : 'custom';
  }

  /* Setzt den Image-Namen aus der gewählten Edition. */
  function applyEditionPreset() {
    var id = byId('editionPreset').value;
    var preset = D.editionsFor(byId('target').value).filter(function (item) { return item.id === id; })[0];
    if (!preset) return;
    byId('editionMode').value = 'name';
    byId('editionValue').value = preset.image;
  }

  /* Offizielle KMS-Clientschlüssel als Auswahl, gruppiert nach Produkt. */
  function fillKeyPresets() {
    var select = byId('productKeyPreset');
    var none = document.createElement('option');
    none.value = '';
    none.textContent = '– kein Katalogschlüssel –';
    select.appendChild(none);

    var groups = {};
    G.kmsKeys.forEach(function (entry) {
      var group = groups[entry.group];
      if (!group) {
        group = document.createElement('optgroup');
        group.label = entry.group;
        select.appendChild(group);
        groups[entry.group] = group;
      }
      var option = document.createElement('option');
      option.value = entry.id;
      option.textContent = entry.label;
      group.appendChild(option);
    });
  }

  /* Hält die Auswahl synchron, wenn der Schlüssel von Hand geändert wird. */
  function syncKeyPreset() {
    var match = G.kmsKeyFor(byId('productKey').value);
    byId('productKeyPreset').value = match ? match.id : '';
  }

  /* Trägt den gewählten Schlüssel ein; „kein Katalogschlüssel“ leert das Feld. */
  function applyKeyPreset() {
    var id = byId('productKeyPreset').value;
    var entry = G.kmsKeys.filter(function (item) { return item.id === id; })[0];
    byId('productKey').value = entry ? entry.key : '';
  }

  /* Hält die Vorlagenauswahl synchron, wenn der Name von Hand geändert wird. */
  function syncEditionPreset() {
    var value = byId('editionValue').value.trim();
    var match = D.editionsFor(byId('target').value).filter(function (item) { return item.image === value; })[0];
    byId('editionPreset').value = match ? match.id : 'custom';
  }

  function syncFieldStates() {
    var partitionMode = byId('diskMode').value === 'partition';
    lockField('partitionId', !partitionMode);

    var server = byId('target').value === 'server';
    ['serverVersion', 'serverEdition', 'serverInstallType'].forEach(function (id) {
      lockField(id, !server);
    });
    lockField('editionPreset', server);

    var editionChosen = byId('editionMode').value !== 'choose';
    byId('editionValue').disabled = !editionChosen;

    /* Mit Firmware-Schlüssel sind Schlüsselfeld und Katalog ohne Wirkung. */
    var oemKey = byId('oemProductKey').checked;
    lockField('productKey', oemKey);
    lockField('productKeyPreset', oemKey);

    var autoLogon = byId('autoLogon').checked;
    byId('autoLogonCount').disabled = !autoLogon;

    var staticIp = byId('staticIp').checked;
    ['nicName', 'ip', 'subnet', 'gateway', 'dns1', 'dns2'].forEach(function (id) {
      byId(id).disabled = !staticIp;
    });

    var customAge = byId('passwordMode').value === 'custom';
    lockField('passwordMaxAge', !customAge);

    var customLockout = byId('lockoutMode').value === 'custom';
    lockField('lockoutThreshold', !customLockout);
    lockField('lockoutDuration', !customLockout);
    lockField('lockoutWindow', !customLockout);
  }

  /* ------------------------------------------------------------ Darstellung */

  function colorize(xml) {
    var html = xml
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    html = html.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="cmt">$1</span>');
    html = html.replace(/(&lt;\/?)([\w:.-]+)/g, '$1<span class="tag">$2</span>');
    html = html.replace(/([\w:.-]+)=(&quot;[^&]*?&quot;)/g, '<span class="attr">$1</span>=<span class="val">$2</span>');
    return html;
  }

  function renderWarnings(list) {
    if (!list.length) {
      warningsBox.hidden = true;
      warningsBox.innerHTML = '';
      return;
    }
    warningsBox.hidden = false;
    warningsBox.innerHTML = '<ul>' + list.map(function (item) {
      return '<li>' + G.escape(item) + '</li>';
    }).join('') + '</ul>';
  }

  function updateSummary(xml) {
    var lines = xml.split('\r\n').length;
    var passes = (xml.match(/pass="/g) || []).length;
    summary.textContent = passes + ' Pass-Definitionen · ' + lines + ' Zeilen · ' +
      Math.round(xml.length / 1024) + ' KB';
  }

  var saveTimer = null;

  /* Zentrale Renderschleife: wird bei jeder Eingabe aufgerufen und ist der
     einzige Ort, der Vorschau, Warnungen und Speicherung aktualisiert. */
  function update() {
    syncFieldStates();
    var cfg = readForm();

    try {
      currentXml = G.buildUnattend(cfg);
      preview.innerHTML = colorize(currentXml);
      updateSummary(currentXml);
      renderWarnings(G.analyze(cfg));
    } catch (error) {
      currentXml = '';
      preview.textContent = 'Fehler beim Erzeugen der Datei:\n' + error.message;
      renderWarnings([]);
    }

    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
      } catch (error) {
        /* localStorage kann in privaten Fenstern gesperrt sein. */
      }
    }, 250);
  }

  /* ------------------------------------------------------------ Aktionen */

  function download(filename, content, mime) {
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(function () {
      URL.revokeObjectURL(url);
      link.remove();
    }, 1500);
  }

  function copyXml() {
    if (!currentXml) return;

    function fallback() {
      var range = document.createRange();
      range.selectNodeContents(preview);
      var selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (error) { ok = false; }
      selection.removeAllRanges();
      flash(byId('btnCopy'), ok ? 'Kopiert' : 'Bitte manuell kopieren');
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(currentXml).then(function () {
        flash(byId('btnCopy'), 'Kopiert');
      }, fallback);
    } else {
      fallback();
    }
  }

  function flash(button, label) {
    var original = button.textContent;
    button.textContent = label;
    button.disabled = true;
    setTimeout(function () {
      button.textContent = original;
      button.disabled = false;
    }, 1200);
  }

  function applyPreset(id) {
    var preset = D.presets.filter(function (item) { return item.id === id; })[0];
    if (!preset) return;
    presetSelect.value = id;
    var cfg = G.defaults();
    Object.keys(preset.config).forEach(function (key) { cfg[key] = preset.config[key]; });
    writeForm(cfg);
    applyServerImage();
    syncEditionPreset();
    update();
  }

  function loadStored() {
    var raw = null;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (error) { raw = null; }
    if (raw) {
      try {
        writeForm(JSON.parse(raw));
        return true;
      } catch (error) {
        /* beschädigte Daten ignorieren */
      }
    }
    return false;
  }

  /* ------------------------------------------------------------ Ereignisse */

  function bind() {
    form.addEventListener('input', function (event) {
      presetSelect.value = '';
      /* Nur bei direkter Eingabe in den Image-Namen nachziehen – beim Aufklappen
         einer Auswahl darf die Auswahl nicht vor dem change-Ereignis kippen. */
      if (event.target && event.target.id === 'editionValue') syncEditionPreset();
      if (event.target && event.target.id === 'productKey') syncKeyPreset();
      update();
    });
    form.addEventListener('change', function (event) {
      presetSelect.value = '';
      if (event.target && event.target.id === 'editionMode') {
        /* Ein Zahlenwert ist als Image-Name unbrauchbar – und umgekehrt. */
        var editionValue = byId('editionValue').value.trim();
        if (event.target.value === 'index' && !/^\d+$/.test(editionValue)) {
          byId('editionValue').value = '1';
        } else if (event.target.value === 'name' && (/^\d*$/.test(editionValue))) {
          byId('editionValue').value = 'Windows 11 Pro';
        }
      }
      if (event.target && event.target.id === 'uiLanguage') {
        var language = D.languages.filter(function (item) { return item.code === event.target.value; })[0];
        if (language) {
          byId('systemLocale').value = language.code;
          byId('userLocale').value = language.code;
          byId('inputLocale').value = language.inputLocale;
        }
      }
      if (event.target && event.target.id === 'productKeyPreset') {
        applyKeyPreset();
      }
      if (event.target && event.target.id === 'editionPreset') {
        applyEditionPreset();
      }
      if (event.target && event.target.id === 'target') {
        buildEditionOptions();
      }
      if (event.target && ['target', 'serverVersion', 'serverEdition', 'serverInstallType'].indexOf(event.target.id) !== -1) {
        applyServerImage();
      }
      syncEditionPreset();
      update();
    });

    presetSelect.addEventListener('change', function () {
      applyPreset(presetSelect.value);
    });

    byId('btnDownload').addEventListener('click', function () {
      if (!currentXml) return;
      download('autounattend.xml', currentXml, 'application/xml;charset=utf-8');
      flash(byId('btnDownload'), 'Gespeichert');
    });

    byId('btnCopy').addEventListener('click', copyXml);

    byId('btnExportConfig').addEventListener('click', function () {
      download('unattend-config.json', JSON.stringify(readForm(), null, 2), 'application/json');
    });

    byId('btnReset').addEventListener('click', function () {
      try { localStorage.removeItem(STORAGE_KEY); } catch (error) { /* egal */ }
      applyPreset(D.presets[0].id);
    });

    byId('importConfig').addEventListener('change', function (event) {
      var file = event.target.files && event.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          writeForm(JSON.parse(String(reader.result)));
          update();
        } catch (error) {
          alert('Die Datei konnte nicht gelesen werden: ' + error.message);
        }
      };
      reader.readAsText(file);
      event.target.value = '';
    });
  }

  /* ------------------------------------------------------------ Start */

  /* Schnellprofile: ein Klick setzt eine ganze Konfiguration. */
  function buildQuickProfiles() {
    var container = byId('quickProfiles');
    D.quickProfiles.forEach(function (profile) {
      var button = document.createElement('button');
      button.type = 'button';

      var title = document.createElement('strong');
      title.textContent = profile.label;
      var description = document.createElement('span');
      description.textContent = profile.description;

      button.appendChild(title);
      button.appendChild(description);
      button.addEventListener('click', function () {
        applyPreset(profile.preset);
      });
      container.appendChild(button);
    });
  }

  buildSelects();
  bind();
  buildQuickProfiles();

  if (!loadStored()) {
    presetSelect.value = D.presets[0].id;
    applyPreset(D.presets[0].id);
  } else {
    presetSelect.value = '';
    update();
  }
})();
