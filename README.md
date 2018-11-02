# WizFDS
WizFDS is open-source project released under GNU v3.0 licence founded by F&K Consulting Engineers Ltd.
The software is Graphical User Interface (GUI) for Fire Dynamics Simulator (FDS).

GUI is divided into 2 separeta tools. All geometrical entities are created by AutoCAD/BricsCAD plugin [download](https://github.com/fkce/WizFDS/blob/master/CAD%20plugin/wizFDS.zip). Other boundary conditions are set in web-application [link](https://wizfds.fkce.pl/login) which can communicate with AutoCAD through websocket.

## To get more information: 
1. Visit our official website: https://wizfds.fkce.pl/
2. Visti wiki pages to find some tutorials: https://github.com/fkce/WizFDS/wiki

# Installing

# Known problems / bugs
1. Connecting with insecure websocket (CAD serwer) in FireFox is forrbidden. To allow export data from CAD to browser you have to write in address "about:config", find entity "network.websocket.allowInsecureFromHTTPS" and set it value to "true".
