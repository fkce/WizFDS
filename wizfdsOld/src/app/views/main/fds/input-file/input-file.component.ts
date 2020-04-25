import { Component, OnInit, ViewChild, OnDestroy, isDevMode, HostListener } from '@angular/core';

import * as CodeMirror from 'codemirror';
import 'codemirror/keymap/vim';
import 'codemirror/mode/fds/fds';
import 'codemirror/addon/dialog/dialog';
import 'codemirror/addon/scroll/simplescrollbars';
import 'codemirror/addon/hint/show-hint';
import 'codemirror/addon/hint/fds-hint';
import 'codemirror/addon/display/fullscreen';
import 'codemirror/addon/fold/foldcode';
import 'codemirror/addon/fold/foldgutter';
import 'codemirror/addon/fold/fds-fold';

import { MainService } from '@services/main/main.service';
import { Main } from '@services/main/main';
import { JsonFdsService } from '@services/json-fds/json-fds.service';
import { Library } from '@services/library/library';
import { LibraryService } from '@services/library/library.service';
import { FdsScenarioService } from '@services/fds-scenario/fds-scenario.service';

import { join, trim } from 'lodash';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-input-file',
  templateUrl: './input-file.component.html',
  styleUrls: ['./input-file.component.scss']
})
export class InputFileComponent implements OnInit, OnDestroy {

  @ViewChild('host', { static: false }) host;

  @HostListener('document:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (event.keyCode === 27 && this.cm.getOption('fullScreen')) {
      this.toggleFullScreen();
    }

    // Autocomplete
    if (this.cm.hasFocus()) {
      let cursor = this.cm.getDoc().getCursor();
      let token = this.cm.getTokenAt(cursor);

      if (!this.cm.state.completionActive &&
        !this.excludedIntelliSenseTriggerKeys[(event.keyCode || event.which).toString()] &&
        ((token.type != 'comment' && token.type != null) || (token.state.inAmper == true))) {
        if (this.cm.options.keyMap == 'vim-insert' && CodeMirror.Vim.maybeInitVimState_(this.cm).insertMode == true) {
          CodeMirror.commands.autocomplete(this.cm, null, { completeSingle: false });
        } else if (this.cm.options.keyMap == 'default') {
          CodeMirror.commands.autocomplete(this.cm, null, { completeSingle: false });
        }
      }
    }
    //event.preventDefault();
  }

  main: Main;
  lib: Library;

  mainSub;
  libSub;

  private config = {};
  private editorOptions = {
    lineNumbers: true,
    styleActiveLine: true,
    theme: 'fds',
    extraKeys: {
      'Ctrl-Space': (cm) => { this.autoComplete(cm); },
      'F11': (cm) => {
        cm.getOption('fullScreen') ? cm.setOption('fullScreen', false) : cm.setOption('fullScreen', true);
      },
      'F10': (cm) => { this.numberAmpers(cm) },
      'F9': () => { this.tabularize() },
      'Ctrl-Q': (cm) => { cm.foldCode(cm.getCursor(), { scanUp: true }); },
      // 'F1': function (cm) { getHelp(cm) },
      // 'Ctrl-3': function (cm) { highlightErrors(cm) },
      // 'Ctrl-4': function (cm) { findNextError(cm) },
    },
    mode: { name: 'fds', globalVars: true },
    keyMap: 'normal',
    matchBrackets: true,
    showCursorWhenSelecting: true,
    tabSize: 6,
    indentUnit: 6,
    lineWrapping: true,
    completeSingle: false,
    viewportMargin: 10,
    scrollbarStyle: 'simple',
    foldGutter: true,
    gutters: ['ampers', 'CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
  }
  private cm = null;
  private excludedIntelliSenseTriggerKeys = {
    //'8': 'backspace', '9': 'tab',
    '13': 'enter', '16': 'shift', '17': 'ctrl', '18': 'alt', '19': 'pause', '20': 'capslock',
    '27': 'escape', '33': 'pageup', '34': 'pagedown', '35': 'end', '36': 'home', '37': 'left',
    '38': 'up', '39': 'right', '40': 'down', '45': 'insert', '46': 'delete', '91': 'left window key',
    '92': 'right window key', '93': 'select', '107': 'add', '109': 'subtract', '110': 'decimal point', '111': 'divide',
    '112': 'f1', '113': 'f2', '114': 'f3', '115': 'f4', '116': 'f5', '117': 'f6',
    '118': 'f7', '119': 'f8', '120': 'f9', '121': 'f10', '122': 'f11', '123': 'f12',
    '144': 'numlock', '145': 'scrolllock', '186': 'semicolon', '187': 'equalsign', '188': 'comma', '189': 'dash',
    '190': 'period', '191': 'slash', '192': 'graveaccent', '220': 'backslash', '222': 'quote'
  }
  isAmperNumber: boolean = true;


  constructor(
    private mainService: MainService,
    private jsonFdsService: JsonFdsService,
    private libraryService: LibraryService,
    private fdsScenarioService: FdsScenarioService
  ) { }

  ngOnInit() {
    console.clear();
    this.mainSub = this.mainService.getMain().subscribe(main => this.main = main);
    this.libSub = this.libraryService.getLibrary().subscribe(lib => this.lib = lib);
  }

  /**
   * On component view init
   */
  ngAfterViewInit() {
    this.editorOptions.keyMap = this.main.settings.editor;
    this.config = this.editorOptions || {};
    this.codemirrorInit(this.config);
    setTimeout(() => {
      this.numberAmpers(this.cm);
    }, 200);
  }

  ngOnDestroy() {
    this.mainSub.unsubscribe();
    this.libSub.unsubscribe();
  }

  /**
   * Initialize codemirror
   */
  codemirrorInit(config) {
    this.cm = CodeMirror.fromTextArea(this.host.nativeElement, config);

    let input = join(this.jsonFdsService.json2fds(this.main.currentFdsScenario.fdsObject), '\n');
    this.cm.setValue(input);

  }

  /**
   * Returns regexp matches
   * @param string 
   * @param regex 
   * @param index 
   */
  public getMatches(string, regex, index) {
    index || (index = 1); // default to the first capturing group
    var matches = [];
    var match;
    while (match = regex.exec(string)) {
      matches.push(match[index]);
    }
    return matches;

    // HOWTO
    //var regExp = /(\&.*?\/)/g
    //var matches = this.getMatches(match[1], regExp, 1);
    //console.log(matches);
  }

  /**
   * Download file from editor
   */
  public downloadFile() {
    let blob = new Blob([this.cm.getValue()], { type: "text/plain;charset=utf-8" });
    saveAs(blob, this.main.currentFdsScenario.name + ".fds");
  }

  /**
   * Save user defined section in db
   */
  public saveFile() {
    if (isDevMode()) {
      console.log('Save input file');
    }
    let input = this.cm.getValue();
    input = input.replace(/[\n\r\t]/g, ' ');

    var myRegexp = /\/\*\*\sUser-defined\sinput(.*)\*\*\//g;
    if (myRegexp.test(input)) {
      // Reset regexp position
      myRegexp.lastIndex = 0;

      var match = myRegexp.exec(input);
      this.main.currentFdsScenario.fdsFile = trim(match[1]);
      setTimeout(() => {
        this.fdsScenarioService.updateFdsScenario(this.main.currentFdsScenario.projectId, this.main.currentFdsScenario.id, 'input');
      }, 100);
    }
  }


  /**
   * Numerate each amper and set it to gutter
   * @param cm CodeMirror instance
   */
  public numberAmpers(cm) {

    if (!cm) cm = this.cm;

    let ampers = {};
    let word = /&\w+/;
    let re = new RegExp(word), match;
    let reRampId = new RegExp(/id.+?'(.+)?'/i), matchRampId;
    let rampId;
    let lineNumber = 0;

    cm.eachLine((line) => {

      // Find amper line &XXXX
      match = re.exec(line.text);
      if (match != null) {
        match = match.toString();
        var info = cm.lineInfo(line);

        // Ramp handling
        if (match.toUpperCase() == '&RAMP' && !(match in ampers)) {
          ampers[match] = 1;
          matchRampId = reRampId.exec(line.text);
          rampId = matchRampId[1];
          cm.setGutterMarker(lineNumber, 'ampers', info.gutterMarkers || !this.isAmperNumber ? null : this.makeMarker(match.substr(1) + ampers[match].toString()));
        } else if (match.toUpperCase() == '&RAMP' && (match in ampers)) {
          matchRampId = reRampId.exec(line.text);
          if (rampId != matchRampId[1]) {
            ampers[match] += 1;
            rampId = matchRampId[1];
            cm.setGutterMarker(lineNumber, 'ampers', info.gutterMarkers || !this.isAmperNumber ? null : this.makeMarker(match.substr(1) + ampers[match].toString()));
          }
        } else {
          // Other ampers handling
          if (!(match in ampers)) {
            ampers[match] = 1;
            cm.setGutterMarker(lineNumber, 'ampers', info.gutterMarkers || !this.isAmperNumber ? null : this.makeMarker(match.substr(1) + ampers[match].toString()));
          } else {
            ampers[match] += 1;
            cm.setGutterMarker(lineNumber, 'ampers', info.gutterMarkers || !this.isAmperNumber ? null : this.makeMarker(match.substr(1) + ampers[match].toString()));
          }
        }
      }
      lineNumber++;
    });

    // Update isAmperNumber
    this.isAmperNumber = !this.isAmperNumber;
  }

  public makeMarker(amper) {
    let marker = document.createElement('div');
    marker.style.color = '#777777';
    marker.style.paddingLeft = '5px';
    marker.style.fontSize = '11px';
    marker.innerHTML = amper;
    return marker;
  }

  /**
   * Fold / unfold 
   */
  public foldAll() {
    for (var l = this.cm.firstLine(); l <= this.cm.lastLine(); ++l)
      this.cm.foldCode({ line: l, ch: 0 }, null, "fold");
  }
  public unfoldAll() {
    for (var i = 0; i < this.cm.lineCount(); i++) {
      this.cm.foldCode({ line: i, ch: 0 }, null, "unfold");
    }
  }


  public tabularize() {

    var match, k = 0;
    var commaMax = {};
    var commaLines = {};
    var commaPos = [];

    var anchor = this.cm.listSelections()[0].anchor.line;
    var head = this.cm.listSelections()[0].head.line;
    var i = anchor;

    if (anchor > head) {
      anchor = head;
      head = i;
      i = anchor;
    }

    // Find max commas positions
    this.cm.eachLine((anchor != head) ? anchor : null, (anchor != head) ? head + 1 : null, (line: any) => {
      for (var j = 0; j < line.text.length; j++) {
        match = line.text[j].indexOf(',');
        if (match > -1) {
          k++;
          if (commaMax[k] == null) {
            commaMax[k] = j;
            //this.cm.setCursor({line: i, ch: j});
          } else {
            if (commaMax[k] < j) {
              commaMax[k] = j;
              //this.cm.setCursor({line: i, ch: j});
            }
          }
          commaPos.push(j);
        }
      }
      if (k > 0) commaLines[i] = commaPos;
      commaPos = [];
      i++;
      k = 0;
    });

    var commaArray;
    var actualPos;
    var maxPos;
    var lineInt;

    // Sprawdzanie, czy po przesunieciu actualPos nie bedzie wieksza niz
    // maxPos, jezeli tak to uaktualnia obiekt commaMax
    for (var line in commaLines) {
      commaArray = commaLines[line];
      //console.log(commaArray);
      lineInt = parseInt(line);
      for (i = 0; i < commaArray.length; i++) {
        if (i == 0) {
          actualPos = commaArray[i];
          //console.log('actualPos: ' + actualPos);
          maxPos = commaMax[i + 1];
          //console.log('maxPos: ' + maxPos);
        } else {
          actualPos = commaMax[i] + (commaArray[i] - commaArray[i - 1]);
          //console.log('actualPos: ' + actualPos);
          maxPos = commaMax[i + 1];
          //console.log('maxPos: ' + maxPos);
          if (actualPos > maxPos) commaMax[i + 1] = actualPos;
        }
      }
    }

    // Add spaces to align to commaMax
    for (var line in commaLines) {
      commaArray = commaLines[line];
      //console.log(commaArray);
      lineInt = parseInt(line);
      for (i = 0; i < commaArray.length; i++) {
        if (i == 0) {
          actualPos = commaArray[i];
          //console.log('actualPos: ' + actualPos);
          maxPos = commaMax[i + 1];
          //console.log('maxPos: ' + maxPos);
          this.cm.setCursor({ line: lineInt, ch: actualPos });
          if (maxPos > actualPos) this.cm.replaceSelection(" ".repeat(maxPos - actualPos));
        } else {
          actualPos = commaMax[i] + (commaArray[i] - commaArray[i - 1]);
          //console.log('actualPos: ' + actualPos);
          maxPos = commaMax[i + 1];
          //console.log('maxPos: ' + maxPos);
          this.cm.setCursor({ line: lineInt, ch: actualPos });
          if (maxPos > actualPos) this.cm.replaceSelection(" ".repeat(maxPos - actualPos));
          if (actualPos > maxPos) commaMax[i + 1] = actualPos; // Second checking of maxPos position
        }
      }
    }
  }

  /**
   * Toggle fullscreen
   */
  public toggleFullScreen() {
    this.cm.getOption('fullScreen') ? this.cm.setOption('fullScreen', false) : this.cm.setOption('fullScreen', true);
  }

  public autoComplete(cm) {
    if (!cm) cm = this.cm;

    CodeMirror.commands.autocomplete(cm, null, { completeSingle: false, ac: true });
  }
}
