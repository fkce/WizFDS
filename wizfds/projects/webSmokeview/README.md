# WebSmokeview

 It's a web version of smokeview.

## Installing webSmokeview
1. Update smokeview to latest realease: [google drive](https://drive.google.com/drive/folders/0B_wB1pJL2bFQc1F4cjJWY2duWTA)
1. Get Node.js: https://nodejs.org/en/download/ or install it using package manager:
- for exmaple: ``sudo apt-get install nodejs``
2. Download webSmokeview release: [download](https://github.com/fkce/webSmokeview/releases/download/0.0.0/webSmokeview.zip)
3. Unzip all files into ``webSmokeview`` directory
4. Run in terminal:
```
$ cd webSmokeview
$ npm install
```
5. Set up server config file: ``vim ./config/config.json`` (change only production variables)
- ``nodePort`` - port number you deploy server (remember to open this port on your firewall): default 4000
- ``pathToSimulations`` - path where you storage your simulations results
- ``protocol`` - use http or https, if you use https you have to set up paths to: ``privatekey.pem`` and ``fullchain.pem``

6. Set up your server host: ``vim ./public/assets/config/config.prod.json``
- if you set up smokeview on your personal computer put ``http://localhost:4000`` (remember to change port number regarding to step 5)
- if you set up smokeview on remote server put ``http://your_server_name:4000`` or ``https://your_server_name:4000`` (depending on your server config file in step 5)
7. Run your server: ``node app.js``
8. Open in web-browser address which you set up in step 5: ``http://localhost:4000`` or ``https://your_server_name:4000``

## Development server
