# Web application

## Instalation

1. Install nodejs and npm package.
2. Install `npm install @angular/cli`
3. Go into `gui/interface` and type: `npm install` (initialize/install required node_modules packages included in package.json).
4. Copy required codemirror additional files to codemirror module: `cp -r node_modules/codemirror_addons/* node_modules/codemirror/`

## Development server

1. Run `ng serve` for a dev server.
2. Navigate to `http://localhost:4200/`.

## Build

1. Run `ng build --prod --base-href="/view/` to build the project. 
2. The build artifacts is stored in the `dist/` directory.

## Backend server

Description ...

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## KaTex
While compiling --prod version katex module adds fonts to root folder of dist. To prevent this copy all fonts from `node_modules/katex/dist/fonts/` to `src/assets/fonts/` and replace relative to absolute path of @font-face in `node_modules/katex/dist/katex.css` and `node_modules/katex/dist/katex.min.css` (url: /view/assets/fonts/).

## mdi fonts
Copy node_modules/@mdi/angular-material/mdi.svg to src/assets/