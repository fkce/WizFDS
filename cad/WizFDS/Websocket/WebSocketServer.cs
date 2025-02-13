#if BRX_APP
using acApp = Bricscad.ApplicationServices.Application;
using Bricscad.ApplicationServices;
using Teigha.DatabaseServices;
using Bricscad.EditorInput;
using Teigha.Geometry;
using Teigha.Runtime;
#elif ARX_APP
using acApp = Autodesk.AutoCAD.ApplicationServices.Application;
using Autodesk.AutoCAD.EditorInput;
#elif GRX_APP
using acApp = Gssoft.Gscad.ApplicationServices.Application;
using Gssoft.Gscad.EditorInput;
#endif

using System;
using SuperSocket.SocketBase;
using SuperWebSocket;
using System.Windows.Forms;
using SuperSocket.SocketBase.Config;
using WizFDS.Ribbon;


//hoto: http://docs.supersocket.net/v1-6/en-US/SuperSocket-Basic-Configuration

namespace WizFDS.Websocket
{
    public class acWebSocketServer
    {
        static SyncControl syncControl;
        WebSocketServer server;
        String sessionId;
        Control[] ctrlArray;

        Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;

        public acWebSocketServer(SyncControl syncCtrl)
        {
            var rootConfig = new RootConfig();
            var serverConfig = new ServerConfig
                               {
                                   Name = "WizFDS Server",
                                   Ip = "Any",
                                   Port = 2012,
                                   MaxRequestLength = 80485760, // 80Mb 
                                   MaxConnectionNumber = 200,
                                   KeepAliveInterval = 1,
            };
            server = new WebSocketServer();
            acWebSocketServer.syncControl = syncCtrl;
            //ctrlArray=System.Windows.Forms.Control.ControlCollection.Find("wizFdsSyncControl", true);
            //this.syncControl = (SyncControl) ctrlArray[0];

            server.NewMessageReceived += new SessionHandler<WebSocketSession, string>(this.server_NewMessageReceived);
            server.NewSessionConnected += new SessionHandler<WebSocketSession>(this.server_NewConnection);
            server.SessionClosed += new SessionHandler<WebSocketSession, SuperSocket.SocketBase.CloseReason>(this.server_ConnectionClosed);

            server.Setup(rootConfig, serverConfig);
            server.Start();
        }

        public void answer(acWebSocketMessage message, String requestId)
        {
            message.setRequestID(requestId);
            sendMessage(message);
        }

        public void sendMessage(acWebSocketMessage message)
        {
            //server.GetSessionByID(this.sessionId).Send(message.toJSON());
            String serialized = message.toJSON();
            server.GetSessionByID(this.sessionId).Send(serialized);
        }

        public void server_NewMessageReceived(WebSocketSession session, string message)
        {
            //MessageBox.Show ("Message recived from Web", "My Application", MessageBoxButtons.OKCancel, MessageBoxIcon.Asterisk);
            
            //session.Send(message);
            acWebSocketMessage rawMessage = new acWebSocketMessage(message);
            
            if (rawMessage.getId() != "")
            {
                // Tutaj jest obsluga odpowiedzi z przegladarki - wyslane z AC
                if (rawMessage.getRequestID() != "" && rawMessage.getRequestID() != null)
                {
                    // requestID!=null -> answer for AC request, ???
                    //MessageBox.Show ("Komunikat powrotny z przegladarki po wyslaniu komunikatu z AC", "My Application", MessageBoxButtons.OKCancel, MessageBoxIcon.Asterisk);

                    syncControl.messages[rawMessage.getRequestID()].setAnswer(rawMessage);
                }
                // Tutaj jest obsluga gdy wysylamy komunikat z przegladarki do AC
                else
                {
                    //MessageBox.Show ("Komunikat pierwotny z przegladarki do AC", "My Application", MessageBoxButtons.OKCancel, MessageBoxIcon.Asterisk);
                    // Zapytanie  przychodzi z przegladarki 
                    //requestID==null -> request from browser, call method, wait for return and send result
                    syncControl.Invoke(receiveRequestDelegate, rawMessage);
                    //session.Send("{\"method\" : \"mth\", \"id\" : \"000\", \"requestID\" : \""+ rawMessage.getId() +"\" , \"data\" : \"Data from server\"}");
                }

            }
            else if (rawMessage.getStatus() == "error")
            {
                    MessageBox.Show ("NewMessegeReceived 5", "My Application", MessageBoxButtons.OKCancel, MessageBoxIcon.Asterisk);
                // wrong message
            }
        }

        public void server_NewConnection(WebSocketSession session)
        {
            syncControl.Invoke(connectionDelegate);
            this.sessionId = session.SessionID;
        }

        public void server_ConnectionClosed(WebSocketSession session, SuperSocket.SocketBase.CloseReason reason)
        {
            syncControl.Invoke(closedDelegate);
        }

        // najpierw deklaracja typu o takim samym typie zwracanym i argumentach
        delegate void DelMessage(acWebSocketMessage message);
        delegate void Del();
        // potem konstrukcja z argumentem - funkcja o tej samej sygnaturze co typ
        DelMessage receiveRequestDelegate = new DelMessage(receiveRequestHandler);
        DelMessage receiveAnswerDelegate = new DelMessage(receiveAnswerHandler);
        Del connectionDelegate = new Del(CallConnectionOpenedHandler);
        Del closedDelegate = new Del(CallConnectionClosedHandler);

        static void CallConnectionOpenedHandler()
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            ed.WriteMessage("Connection from localhost opened on port 2012 \n");
            Ribbon.Ribbon.WebSocketOpened();
            RibbonInit.isWebSockedInited = true;
        }

        static void CallConnectionClosedHandler()
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            ed.WriteMessage("Connection from localhost closed \n");
            Ribbon.Ribbon.WebSockedClosed();
            RibbonInit.isWebSockedInited = false;
        }

        // Co to za funkcje ponizej ??
        static void BackgroundProcess()
        {
            while (acWebSocketServer.syncControl.syncValue == "start")
            {
                //ed.WriteMessage("a\n");
            }

        }

        static void receiveRequestHandler(acWebSocketMessage message)
        {
            acWebSocketServer.syncControl.receiveRequest(message);
        }

        static void receiveAnswerHandler(acWebSocketMessage message)
        {
            //syncControl.messages[message.getRequestID()].setAnswer(message);
            //acWebSocketServer.syncControl.receiveAnswer(message);
        }

        static void CallMessageHandler(acWebSocketMessage message)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            ed.WriteMessage("Message received. Method: " + message.getMethod() + " id: " + message.getId() + "\n");
            ed.WriteMessage("Sync:" + acWebSocketServer.syncControl.syncValue);
            if (message.getMethod() == "start")
            {
                acWebSocketServer.syncControl.syncValue = "start";
                System.Threading.Thread thread = new System.Threading.Thread(
                   new System.Threading.ThreadStart(BackgroundProcess)
               );

                thread.Start();
            }
            else if (message.getMethod() == "stop")
            {
                acWebSocketServer.syncControl.syncValue = "stop";
            }
        }
    }
}