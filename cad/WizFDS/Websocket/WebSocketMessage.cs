using System;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace WizFDS.Websocket
{
    public class acWebSocketMessage
    {

        private String method;
        private dynamic data;
        private String id;
        private String status;
        private String requestID;
        class RawMessage
        {
            public String method;
            public Object data;
            public String id; // unikalne id wiadomosci - generowane po obydwu stornach
            public String status; // error, succes
            public String requestID; // id wiadomosci pierwotnej na ktora ta jest odpowiedzia

            public RawMessage(String id, String requestID, String status, String method, Object data) 
            {
                this.method = method;
                this.status = status;
                this.data = data;
                this.id = id;
                this.requestID = requestID;
            }
        }

        public acWebSocketMessage(String message) // konsturktor z websocket z przegladarki
        {
            dynamic rawMessage = new System.Dynamic.ExpandoObject();
            try
            {
                rawMessage = JsonConvert.DeserializeObject(message);

                try
                {
                    this.method = rawMessage.method;
                }
                catch (Exception e)
                {
                    this.method = "";
                }

                try
                {
                    this.data = rawMessage.data;
                }
                catch (Exception e)
                {
                    this.data = new Object();
                }

                try
                {
                    this.status = rawMessage.status;
                }
                catch (Exception e)
                {
                    this.status = "";
                }

                try
                {
                    this.id = rawMessage.id;
                }
                catch (Exception e)
                {
                    this.id = rawMessage.id; // "" ??
                }

                try
                {
                    this.requestID = rawMessage.requestID;
                }
                catch (Exception e)
                {
                    this.requestID = rawMessage.requestID; // "" ??
                }

            }
            catch (Exception e)
            {
                rawMessage.method = "";
                rawMessage.status = "error";
                rawMessage.data = "";
                rawMessage.id = "";
                rawMessage.requestid = "";
            }

            
        }
        public acWebSocketMessage(String status, String method, Object data, String requestID) // towrze wiadomosc z istniejacego obiektu / danych 
        {
            this.method = method;
            this.status = status;
            this.data = data;
            this.id = generateID();
            this.requestID = requestID;
        }

        public String getMethod()
        {
            return this.method;
        }
        public String getStatus()
        {
            return this.status;
        }

        public String getId()
        {
            return this.id;
        }
        public String getRequestID()
        {
            return this.requestID;
        }
        public void setRequestID(String id)
        {
            this.requestID = id;
        }
        public Object getData()
        {
            return this.data;
        }

        public String toJSON()
        {
            string json = "";
            RawMessage rawMessage = new RawMessage(this.id, this.requestID, this.status, this.method, this.data);
            /*
            dynamic rawMessage = new Object();
            rawMessage.method = this.method;
            rawMessage.data = this.data;
            rawMessage.id = this.id;
            rawMessage.requestid = this.requestID;
            */
            try
            {
                json = JsonConvert.SerializeObject(rawMessage);
            }
            catch (System.Exception e)
            {
                // nieudana serializacja wiadomości - komunikat: nieokreślony błąd serwera
                json = "{'status':'error'}";
            }
            return json;
        }

        public String generateID() 
        {
            Random rnd = new Random();
            long rand = rnd.Next(1,1000);
            long epochTime = (DateTime.UtcNow.Ticks - 621355968000000000) / 10000;
            long id = epochTime + rand;
            return id.ToString();
        }
    }
}
