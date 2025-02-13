﻿#if BRX_APP
using acApp = Bricscad.ApplicationServices.Application;
using Bricscad.ApplicationServices;
using Teigha.DatabaseServices;
using Bricscad.EditorInput;
using Teigha.Geometry;
using Teigha.Runtime;
using Bricscad.Windows;
#elif ARX_APP
using acApp = Autodesk.AutoCAD.ApplicationServices.Application;
using Autodesk.AutoCAD.EditorInput;
using Autodesk.AutoCAD.Runtime;
using Autodesk.AutoCAD.ApplicationServices;
#elif GRX_APP
using acApp = Gssoft.Gscad.ApplicationServices.Application;
using Gssoft.Gscad.EditorInput;
using Gssoft.Gscad.Runtime;
using Gssoft.Gscad.ApplicationServices;
using Autodesk.Windows;
#endif

using System;
using System.Collections.Generic;
using System.Windows.Forms;
using System.Reflection;

namespace WizFDS.Websocket
{
    public class SyncControl : Control
    {
        public String syncValue;
        public acWebSocketServer server;
        public acWebSocketRouter router;

        public class MessageData
        {
            public String requestID;
            public acWebSocketMessage answer;
            public MessageData()
            {
                this.requestID = null;
                this.answer = null;
            }

            public void setAnswer(acWebSocketMessage answer)
            {
                this.answer = answer;
            }
            // Thread Handle
        }

        public Dictionary<String, MessageData> messages = new Dictionary<String, MessageData>();

        public void addMessage(String id)
        {
            messages.Add(id, new MessageData());
        }
        public void removeMessage(String messageId)
        {
            messages.Remove(messageId);
        }

        // ThreadData list
        public SyncControl() : base()
        {
            this.syncValue = "empty";
        }
        public void receiveRequest(acWebSocketMessage message)
        {
            acWebSocketMessage response = router.callMethod(message);
            server.sendMessage(response);
        }
        public void receiveAnswer(acWebSocketMessage message)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            ed.WriteMessage("Answer received. Calling method in current thread ..." + message.getId() + " - id\n");

            // receive message with requestId!=null
            // and send result to waiting thread
        }
        public acWebSocketMessage sendMessageAndWaitSync(acWebSocketMessage message)
        {
            Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
            // send message to webapp
            server.sendMessage(message);

            // add id to request array
            addMessage(message.getId());
            // wainting for answer
            while (messages[message.getId()].answer == null)
            {

            }
#if DEBUG
            ed.WriteMessage("\nAnswer from Web: " + messages[message.getId()].answer.toJSON().ToString());
#else
            ed.WriteMessage("\nData sent sucessfully");
#endif
            try
            {
                acWebSocketMessage answer = messages[message.getId()].answer;
                removeMessage(message.getId());
                return answer;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nWizFDS exception:" + e.ToString());
                removeMessage(message.getId());
                return null;
            }
        }
        public void sendMessageAndQuit(acWebSocketMessage message)
        {
            // send message to browser and don't wait for answer
            server.sendMessage(message);
        }
    }

    public class acWebSocketCtrl : IExtensionApplication
    {
        private static string version = Assembly.GetExecutingAssembly().GetName().Version.ToString(); 
        public static SyncControl syncCtrl;
        Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;
        Document acDoc = acApp.DocumentManager.MdiActiveDocument;

        public void Initialize()
        {
            try
            {
                // Dll loading from resources
                string resourceName = "";
                string resource = "";
                AppDomain.CurrentDomain.AssemblyResolve += (sender, args) =>
                {
                    resourceName = new AssemblyName(args.Name).Name + ".dll";
                    resource = Array.Find(this.GetType().Assembly.GetManifestResourceNames(), element => element.EndsWith(resourceName));
#if DEBUG
                    ed.WriteMessage(resourceName + "\n");
                    ed.WriteMessage(resource + "\n");
#endif
                    using (var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(resource))
                    {
                        Byte[] assemblyData = new Byte[stream.Length];
                        stream.Read(assemblyData, 0, assemblyData.Length);
                        return Assembly.Load(assemblyData);
                    }
                };

                var ico = Properties.Resources.defaultIco;

                syncCtrl = new SyncControl();

                syncCtrl.CreateControl();
                syncCtrl.Name = "wizFdsSyncControl";
                syncCtrl.server = new acWebSocketServer(syncCtrl);
                syncCtrl.router = new acWebSocketRouter();

#if ARX_APP || GRX_APP
                acDoc.SendStringToExecute("TASKBAR\n0\n", true, false, true);
#endif

                //Ustawienie pojedynczego okna - ewentualnie przetrzymywać orginalną zmienną
                ed.WriteMessage("\n\nInitializing WizFDS ver. "+ version);
                ed.WriteMessage("\nWizFDS sync turned on. Waiting for connection from web application ...");

                // Ribbon
                if (ComponentManager.Ribbon == null)
                {
                    //load the custom Ribbon on startup, but at this point
                    //the Ribbon control is not available, so register for
                    //an event and wait
#if ARX_APP || GRX_APP
                    ComponentManager.ItemInitialized +=
                        new EventHandler<RibbonItemEventArgs>(ComponentManager_ItemInitialized);
#elif BRX_APP
                    //ComponentManager.ItemInitialized +=
                    //    new EventHandler<RibbonItemEventArgs>(ComponentManager_ItemInitialized);
#endif
                }
                else
                {
                    //the assembly was loaded using NETLOAD, so the ribbon
                    //is available and we just create the ribbon
                    Ribbon.Ribbon rb = new Ribbon.Ribbon();
                }
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nWizFDS exception:" + e.ToString());
            }

        }
        public void Terminate()
        {

        }

        void ComponentManager_ItemInitialized(object sender, RibbonItemEventArgs ev)
        {
            try
            {
                if (ComponentManager.Ribbon.FindTab("wizfds_id2586") == null)
                {
                    Ribbon.Ribbon rb = new Ribbon.Ribbon();
                    //and remove the event handler
#if ARX_APP || GRX_APP
                    Autodesk.Windows.ComponentManager.ItemInitialized -=
                        new EventHandler<RibbonItemEventArgs>(ComponentManager_ItemInitialized);
#elif BRX_APP
                    //Autodesk.Windows.ComponentManager.ItemInitialized -=
                    //    new EventHandler<RibbonItemEventArgs>(ComponentManager_ItemInitialized);
#endif
                }
            }
            catch (System.Exception e)
            {
                ed.WriteMessage("\nWizFDS exception:" + e.ToString());
            }
        }

    }
}