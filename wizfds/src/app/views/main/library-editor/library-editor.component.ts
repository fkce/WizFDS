import { Component, OnInit, ViewChild, isDevMode, OnDestroy } from '@angular/core';
import { saveAs } from 'file-saver';

import { MainService } from '@services/main/main.service';
import { Main } from '@services/main/main';
import { Library } from '@services/library/library';
import { LibraryService } from '@services/library/library.service';
import { NotifierService } from '../../../../../node_modules/angular-notifier';

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

@Component({
  selector: 'app-library-editor',
  templateUrl: './library-editor.component.html',
  styleUrls: ['./library-editor.component.scss']
})
export class LibraryEditorComponent implements OnInit, OnDestroy {

  @ViewChild('host', {static: false}) host;

  file: any;
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
      //'F10': (cm) => { this.ampersNumbers(cm) },
      //  'F9': function (cm) { tabularize(cm) },
      //  'Ctrl-Q': function (cm) { cm.foldCode(cm.getCursor(), { scanUp: true }); },
      //  'Ctrl-1': function (cm) { foldAll(cm) },
      //  'Ctrl-2': function (cm) { unfoldAll(cm) },
      //  'F1': function (cm) { getHelp(cm) },
      //  'Ctrl-3': function (cm) { highlightErrors(cm) },
      //  'Ctrl-4': function (cm) { findNextError(cm) },
    },
    mode: { name: 'javascript', json: true },
    keyMap: 'normal',
    matchBrackets: true,
    showCursorWhenSelecting: true,
    tabSize: 6,
    indentUnit: 6,
    lineWrapping: true,
    completeSingle: false,
    viewportMargin: 10,
    scrollbarStyle: 'simple',
  }
  private cm = null;

  main: Main;
  lib: Library;

  mainSub;
  libSub;

  constructor(
    private mainService: MainService,
    private readonly notifierService: NotifierService,
    private libraryService: LibraryService
  ) {
  }

  ngOnInit() {
    console.clear();
    this.mainSub = this.mainService.getMain().subscribe(main => this.main = main);
    this.libSub = this.libraryService.libraryObservable.subscribe(lib => this.lib = lib);
  }

  ngAfterViewInit() {
    this.editorOptions.keyMap = this.main.editor;
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

    let input = JSON.stringify(this.lib.toJSON(), null, '\t');
    this.cm.setValue(input);
  }

  public tryParseJSON(jsonString) {
    try {
      var o = JSON.parse(jsonString);
      if (o && typeof o === "object") {
        return true;
      }
    }
    catch (e) { return e; }

    return false;
  }

  /**
   * Save modified library json
   */
  public saveLibrary() {
    let input = this.cm.getValue();
    let parseLibrary = this.tryParseJSON(input);

    if (parseLibrary == true) {
      let libJson = JSON.parse(input);
      this.libraryService.setLibrary(JSON.stringify(libJson));
      this.libraryService.updateLibrary();
    }
    else {
      this.notifierService.notify('error', parseLibrary);
    }
  }


  /**
   * Download library as text file
   */
  public downloadLibrary() {
    let input = this.cm.getValue();
    let blob = new Blob([input], { type: "text/plain;charset=utf-8" });
    saveAs(blob, "WizFDS_library.txt");
  }

  fileUpload(event) {
    this.file = event.target.files[0];

    let fileReader = new FileReader();
    fileReader.onload = (e) => {
      if (isDevMode()) console.log(fileReader.result);
      
      let parseLibrary = this.tryParseJSON(fileReader.result);
      if (parseLibrary == true) {
        let libJson = JSON.parse(<string>fileReader.result);
        this.libraryService.setLibrary(JSON.stringify(libJson));
        this.libraryService.updateLibrary();

        let input = JSON.stringify(this.lib.toJSON(), null, '\t');
        this.cm.setValue(input);
      }
      else {
        this.notifierService.notify('error', parseLibrary);
      }

    }
    fileReader.readAsText(this.file);
  }

}