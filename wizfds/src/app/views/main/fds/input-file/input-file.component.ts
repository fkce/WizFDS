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

  @ViewChild('host', {static: false}) host;

  public onKey(event: any) {
    console.log(event);
  }

  private config = {};
  private editorOptions = {
    lineNumbers: true,
    styleActiveLine: true,
    theme: 'fds',
    extraKeys: {
      //  'Ctrl-Space': function (cm) { autoComplete(cm); },
      'F11': (cm) => {
        if (!cm.getOption("fullScreen")) cm.setOption('fullScreen', true);
        else if (cm.getOption("fullScreen")) cm.setOption('fullScreen', false);
      },
      "Esc": (cm) => {
        return false;
      }
      //'F10': (cm) => { this.ampersNumbers(cm) },
      //  'F9': function (cm) { tabularize(cm) },
      //  'Ctrl-Q': function (cm) { cm.foldCode(cm.getCursor(), { scanUp: true }); },
      //  'Ctrl-1': function (cm) { foldAll(cm) },
      //  'Ctrl-2': function (cm) { unfoldAll(cm) },
      //  'F1': function (cm) { getHelp(cm) },
      //  'Ctrl-3': function (cm) { highlightErrors(cm) },
      //  'Ctrl-4': function (cm) { findNextError(cm) },
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

  main: Main;
  lib: Library;

  mainSub;
  libSub;

  constructor(
    private mainService: MainService,
    private jsonFdsService: JsonFdsService,
    private libraryService: LibraryService,
    private fdsScenarioService: FdsScenarioService
  ) {
  }

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
    //let input = JSON.stringify(this.lib.toJSON(), null, '\t');
    this.cm.setValue(input);

    //this.cm.on('keydown', (editor: CodeMirror.Editor) => {
    //  console.log(editor);
    //});
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
   * 
   * @param cm CodeMirror instance
   */
  public ampersNumbers(cm) {
    let ampers = {};
    let word = /&\w+/;
    let re = new RegExp(word), match;
    let reRampId = new RegExp(/id.+?'(.+)?'/i), matchRampId;
    let rampId;
    let lineNumber = 0;
    cm.eachLine(function (line) {
      match = re.exec(line.text);
      if (match != null) {
        var info = cm.lineInfo(line);
        // Ramp handling
        if (match.toString().toUpperCase() == '&RAMP' && !(match.toString() in ampers)) {
          ampers[match.toString()] = 1;
          matchRampId = reRampId.exec(line.text);
          rampId = matchRampId[1].toString();
          cm.setGutterMarker(lineNumber, 'ampers', info.gutterMarkers ? null : this.makeMarker(match.toString().substr(1, 4) + ampers[match.toString()].toString()));
        } else if (match.toString().toUpperCase() == '&RAMP' && (match.toString() in ampers)) {
          matchRampId = reRampId.exec(line.text);
          if (rampId != matchRampId[1].toString()) {
            ampers[match.toString()] += 1;
            rampId = matchRampId[1].toString();
            cm.setGutterMarker(lineNumber, 'ampers', info.gutterMarkers ? null : this.makeMarker(match.toString().substr(1, 4) + ampers[match.toString()].toString()));
          }
        } else {
          // Other ampers handling
          if (!(match.toString() in ampers)) {
            ampers[match.toString()] = 1;
            cm.setGutterMarker(lineNumber, 'ampers', info.gutterMarkers ? null : this.makeMarker(match.toString().substr(1, 4) + ampers[match.toString()].toString()));
          } else {
            ampers[match.toString()] += 1;
            cm.setGutterMarker(lineNumber, 'ampers', info.gutterMarkers ? null : this.makeMarker(match.toString().substr(1, 4) + ampers[match.toString()].toString()));
          }
        }
      }
      lineNumber++;
    });
  }

  public makeMarker(amper) {
    let marker = document.createElement('div');
    marker.style.color = '#99cc00';
    marker.style.paddingLeft = '5px';
    marker.innerHTML = amper;
    return marker;
  }

}
