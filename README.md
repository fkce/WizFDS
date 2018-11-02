![WizFDS](https://wizfds.fkce.pl/welcome/assets/wizfds.svg)

WizFDS is open-source project released under GNU v3.0 license founded by F&K Consulting Engineers Ltd.
The software is Graphical User Interface (GUI) for Fire Dynamics Simulator (FDS).

GUI is divided into 2 separated tools. All geometrical entities are created by AutoCAD/BricsCAD plugin [(download)](https://github.com/fkce/WizFDS/blob/master/CAD%20plugin/wizFDS.zip). Other boundary conditions are set in web application [(link)](https://wizfds.fkce.pl/login) which can communicate with AutoCAD through websocket.

## To get more information: 
1. Visit our official website: https://wizfds.com/
2. Visit wiki pages to find some tutorials: https://github.com/fkce/WizFDS/wiki

# Installing
## AutoCAD plugin
1. Install AutoCAD plugin [(download)](https://github.com/fkce/WizFDS/blob/master/CAD%20plugin/wizFDS.zip)
2. Run AutoCAD and type in command line:
```
netload
```
3. Choose wizFDS.dll file (default location: C:\Program Files\firemodels\WizFDS\wizFDS.dll)
4. Start drawing FDS entities
[show video](https://github.com/fkce/WizFDS/wiki)

## Web application
1. Register & Log in to [WizFDS](https://wizfds.fkce.pl/login)
2. Create new project and scenario
3. Connect with Autocad [(Read more about known problems with connecting)](https://github.com/fkce/WizFDS/blob/master/)
4. Set up boundary conditions
5. Edit your file in text/vim editor
6. Download it and run on your / external resources
[show video](https://github.com/fkce/WizFDS/wiki)

# Known problems / bugs
1. Connecting with insecure websocket (CAD serwer) in FireFox is forrbidden. To allow export data from CAD to browser you have to write in address "about:config", find entity "network.websocket.allowInsecureFromHTTPS" and set it value to "true".
