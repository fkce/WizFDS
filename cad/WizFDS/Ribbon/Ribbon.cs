#if BRX_APP
using acApp = Bricscad.ApplicationServices.Application;
using Bricscad.ApplicationServices;
using Bricscad.Windows;
#elif ARX_APP
using acApp = Autodesk.AutoCAD.ApplicationServices.Application;
using Autodesk.AutoCAD.ApplicationServices;
using Autodesk.Windows;
#endif

using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Windows.Media.Imaging;

namespace WizFDS.Ribbon
{
    // http://through-the-interface.typepad.com/through_the_interface/2016/02/disabling-the-autocad-ribbon-using-net.html
    // włacznie wylaczanie ribbona

    public class Ribbon
    {
        public static RibbonButton sWebsocketBtn = new RibbonButton();
        public static RibbonButton lHideFdsBtn = new RibbonButton();
        public static RibbonButton lHideOtherBtn = new RibbonButton();

        static RibbonPanel cfastPanel = new RibbonPanel();
        static RibbonPanel syncPanel = new RibbonPanel();

        public static RibbonCombo layersComboBtn = new RibbonCombo();
        //public RibbonCombo pan3ribcombo = new RibbonCombo();

        public Ribbon()
        {
            if (RibbonInit.isRibbonInited == false)
            {
                InitRibbon();
            }
#if ARX_APP
            layersComboBtn.CurrentChanged += new EventHandler<RibbonPropertyChangedEventArgs>(layersComboBtn_CurrentChanged);
#endif
        }

        private void layersComboBtn_CurrentChanged(object sender, RibbonPropertyChangedEventArgs e)
        {
            Document acDoc = acApp.DocumentManager.MdiActiveDocument;
            using (DocumentLock docLock = acDoc.LockDocument())
            {
                RibbonButton but = layersComboBtn.Current as RibbonButton;
                Utils.Layers.SetLayer(but.Text);
            }
        }

        public static void WebSocketOpened()
        {
#if ARX_APP
            sWebsocketBtn.LargeImage = Images.getBitmap(Properties.Resources.websocOpenLarge);
#endif
            sWebsocketBtn.Text = "WebSocket\nopened";
            syncPanel.IsEnabled = true;
        }
        public static void WebSockedClosed()
        {
#if ARX_APP
            sWebsocketBtn.LargeImage = Images.getBitmap(Properties.Resources.websocCloseLarge);
#endif
            sWebsocketBtn.Text = "WebSocket\nclosed";
            syncPanel.IsEnabled = false;
        }

        public static void InitRibbon()
        {
            try
            {
                RibbonControl ribbonControl = ComponentManager.Ribbon;
                RibbonTab Tab = new RibbonTab();
                Tab.Title = "WizFDS";
                Tab.Id = "wizfds_id2586";
                ribbonControl.Tabs.Add(Tab);
                // Cfast Panel
                RibbonPanelSource cfastPanelSource = new RibbonPanelSource();
                cfastPanelSource.Title = "CFAST model";
                cfastPanel.Source = cfastPanelSource;
                Tab.Panels.Add(cfastPanel);

#if AAMKS
                #region Cfast panel
                // Cfast buttons
                RibbonButton cRoomBtn = new RibbonButton();
                cRoomBtn.Text = "Room";
#if ARX_APP
                cRoomBtn.Name = "Room";
                cRoomBtn.ShowText = true;
                cRoomBtn.ShowImage = true;
                cRoomBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                cRoomBtn.LargeImage = Images.getBitmap(Properties.Resources.obstLarge);
                cRoomBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                cRoomBtn.Size = RibbonItemSize.Large;
                cRoomBtn.CommandHandler = new RibbonCommandHandler();
#elif BRX_APP
                cRoomBtn.ExternalImage = true;
                cRoomBtn.Image = "C:\\Users\\mateu\\Desktop\\wizfds\\autocad\\wizFDS\\Resources\\obstLarge.png";
                cRoomBtn.LargeImage = "C:\\Users\\mateu\\Desktop\\wizfds\\autocad\\wizFDS\\Resources\\obstLarge.png";
                cRoomBtn.ButtonStyle = 0;
#endif

                RibbonButton cCorridorBtn = new RibbonButton();
                cCorridorBtn.Text = "Corridor";
#if ARX_APP
                cCorridorBtn.Name = "Corridor";
                cCorridorBtn.ShowText = true;
                cCorridorBtn.ShowImage = true;
                cCorridorBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                cCorridorBtn.LargeImage = Images.getBitmap(Properties.Resources.corridorLarge);
                cCorridorBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                cCorridorBtn.Size = RibbonItemSize.Large;
                cCorridorBtn.CommandHandler = new RibbonCommandHandler();
#elif BRX_APP
#endif

                RibbonButton cHallBtn = new RibbonButton();
                cHallBtn.Text = "Hall";
#if ARX_APP
                cHallBtn.Name = "Hall";
                cHallBtn.ShowText = true;
                cHallBtn.ShowImage = true;
                cHallBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                cHallBtn.LargeImage = Images.getBitmap(Properties.Resources.obstLarge);
                cHallBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                cHallBtn.Size = RibbonItemSize.Large;
                cHallBtn.CommandHandler = new RibbonCommandHandler();
#elif BRX_APP
#endif

                RibbonButton cStairBtn = new RibbonButton();
                cStairBtn.Text = "Staircase";
#if ARX_APP
                cStairBtn.Name = "Staircase";
                cStairBtn.ShowText = true;
                cStairBtn.ShowImage = true;
                cStairBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                cStairBtn.LargeImage = Images.getBitmap(Properties.Resources.staircaseLarge);
                cStairBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                cStairBtn.Size = RibbonItemSize.Large;
                cStairBtn.CommandHandler = new RibbonCommandHandler();
#elif BRX_APP
#endif

                // Add to main panel
                cfastPanelSource.Items.Add(cRoomBtn);
                cfastPanelSource.Items.Add(cCorridorBtn);
                cfastPanelSource.Items.Add(cHallBtn);
                cfastPanelSource.Items.Add(cStairBtn);
                cfastPanelSource.Items.Add(new RibbonSeparator());

                RibbonButton cDoorBtn = new RibbonButton();
                cDoorBtn.Text = "Door";
#if ARX_APP
                cDoorBtn.Name = "Door";
                cDoorBtn.ShowText = true;
                cDoorBtn.ShowImage = true;
                cDoorBtn.Image = Images.getBitmap(Properties.Resources.door);
                cDoorBtn.LargeImage = Images.getBitmap(Properties.Resources.doorLarge);
                cDoorBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                cDoorBtn.Size = RibbonItemSize.Large;
                cDoorBtn.CommandHandler = new RibbonCommandHandler();
#elif BRX_APP
#endif

                RibbonButton cWindowBtn = new RibbonButton();
                cWindowBtn.Text = "Window";
#if ARX_APP
                cWindowBtn.Name = "Window";
                cWindowBtn.ShowText = true;
                cWindowBtn.ShowImage = true;
                cWindowBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                cWindowBtn.LargeImage = Images.getBitmap(Properties.Resources.windowLarge);
                cWindowBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                cWindowBtn.Size = RibbonItemSize.Large;
                cWindowBtn.CommandHandler = new RibbonCommandHandler();
#elif BRX_APP
#endif

                RibbonButton cInletBtn = new RibbonButton();
                cInletBtn.Text = "Inlet";
#if ARX_APP
                cInletBtn.Name = "Inlet";
                cInletBtn.ShowText = true;
                cInletBtn.ShowImage = true;
                cInletBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                cInletBtn.LargeImage = Images.getBitmap(Properties.Resources.inletLarge);
                cInletBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                cInletBtn.Size = RibbonItemSize.Large;
                cInletBtn.CommandHandler = new RibbonCommandHandler();
#elif BRX_APP
#endif

                cfastPanelSource.Items.Add(cDoorBtn);
                cfastPanelSource.Items.Add(cWindowBtn);
                cfastPanelSource.Items.Add(cInletBtn);

                RibbonButton cVventBtn = new RibbonButton();
                cVventBtn.Text = "Vvent";
#if ARX_APP
                cVventBtn.Name = "Vvent";
                cVventBtn.ShowText = true;
                cVventBtn.ShowImage = true;
                cVventBtn.Image = Images.getBitmap(Properties.Resources.vent);
                cVventBtn.LargeImage = Images.getBitmap(Properties.Resources.defaultIcoLarge);
                cVventBtn.CommandHandler = new RibbonCommandHandler();
#elif BRX_APP
#endif

                RibbonButton cHoleBtn = new RibbonButton();
                cHoleBtn.Text = "Auto Hole";
#if ARX_APP
                cHoleBtn.Name = "Holeaut";
                cHoleBtn.ShowText = true;
                cHoleBtn.ShowImage = true;
                cHoleBtn.Image = Images.getBitmap(Properties.Resources.holeaut);
                cHoleBtn.LargeImage = Images.getBitmap(Properties.Resources.defaultIcoLarge);
                //cHoleBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                //cHoleBtn.Size = RibbonItemSize.Large;
                cHoleBtn.CommandHandler = new RibbonCommandHandler();
#elif BRX_APP
#endif

                RibbonButton cHolemanBtn = new RibbonButton();
                cHolemanBtn.Text = "Hole";
#if ARX_APP
                cHolemanBtn.Name = "Holeman";
                cHolemanBtn.ShowText = true;
                cHolemanBtn.ShowImage = true;
                cHolemanBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                cHolemanBtn.LargeImage = Images.getBitmap(Properties.Resources.defaultIcoLarge);
                cHolemanBtn.CommandHandler = new RibbonCommandHandler();
#elif BRX_APP
#endif

                // Create row panel 
                RibbonRowPanel cVentRow = new RibbonRowPanel();
                cVentRow.Items.Add(cVventBtn);
                cVentRow.Items.Add(new RibbonRowBreak());
                cVentRow.Items.Add(cHoleBtn);
                cVentRow.Items.Add(new RibbonRowBreak());
                cVentRow.Items.Add(cHolemanBtn);

                cfastPanelSource.Items.Add(cVentRow);

                #endregion
#endif

#if ARX_APP && WIZFDS

                #region FDS Geometry Panel
                // FDS Geometry Panel
                Autodesk.Windows.RibbonPanelSource fdsGeometryPanelSource = new RibbonPanelSource();
                fdsGeometryPanelSource.Title = "FDS Geometry";
                RibbonPanel fdsGeometryPanel = new RibbonPanel();
                fdsGeometryPanel.Source = fdsGeometryPanelSource;
                Tab.Panels.Add(fdsGeometryPanel);

                // FDS buttons
                RibbonButton fMeshBtn = new RibbonButton();
                fMeshBtn.Name = "Mesh";
                fMeshBtn.Text = "Mesh";
                fMeshBtn.ShowText = true;
                fMeshBtn.ShowImage = true;
                fMeshBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                fMeshBtn.LargeImage = Images.getBitmap(Properties.Resources.meshLarge);
                fMeshBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                fMeshBtn.Size = RibbonItemSize.Large;
                fMeshBtn.CommandHandler = new RibbonCommandHandler();
                RibbonToolTip fMeshTT = new RibbonToolTip();
                fMeshTT.Command = "FMESH";
                fMeshTT.Title = "Create MESH manually";
                fMeshTT.Content = "Create MESH using two points in drawing";
                fMeshTT.ExpandedContent = "Define Z min level, Z max level and than two points in drawing. Layer is changed automatically to !FDS_MESH.";
                fMeshBtn.ToolTip = fMeshTT;

                RibbonButton fMeshAutoBtn = new RibbonButton();
                fMeshAutoBtn.Name = "MeshAuto";
                fMeshAutoBtn.Text = "Mesh\nauto";
                fMeshAutoBtn.ShowText = true;
                fMeshAutoBtn.ShowImage = true;
                fMeshAutoBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                fMeshAutoBtn.LargeImage = Images.getBitmap(Properties.Resources.meshLarge);
                fMeshAutoBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                fMeshAutoBtn.Size = RibbonItemSize.Large;
                fMeshAutoBtn.CommandHandler = new RibbonCommandHandler();
                RibbonToolTip fMeshAutoTT = new RibbonToolTip();
                fMeshAutoTT.Command = "FMESHAUTO";
                fMeshAutoTT.Title = "Create MESH automatically";
                fMeshAutoTT.Content = "Create multiple MESHes using two points in drawing";
                fMeshAutoTT.ExpandedContent = "Define horizontal and vertical mesh numbers. Z level is automatically fitted to FDS geometry. Layer is changed automatically to !FDS_MESH.";
                fMeshAutoBtn.ToolTip = fMeshAutoTT;

                RibbonButton fOpenBtn = new RibbonButton();
                fOpenBtn.Name = "Open";
                fOpenBtn.Text = "Open";
                fOpenBtn.ShowText = true;
                fOpenBtn.ShowImage = true;
                fOpenBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                fOpenBtn.LargeImage = Images.getBitmap(Properties.Resources.openLarge);
                //fOpenBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                fOpenBtn.Size = RibbonItemSize.Standard;
                fOpenBtn.CommandHandler = new RibbonCommandHandler();

                RibbonButton fOpenVisualBtn = new RibbonButton();
                fOpenVisualBtn.Name = "OpenVisual";
                fOpenVisualBtn.Text = "Visual open";
                fOpenVisualBtn.ShowText = true;
                fOpenVisualBtn.ShowImage = true;
                fOpenVisualBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                fOpenVisualBtn.LargeImage = Images.getBitmap(Properties.Resources.openLarge);
                //fOpenVisualBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                fOpenVisualBtn.Size = RibbonItemSize.Standard;
                fOpenVisualBtn.CommandHandler = new RibbonCommandHandler();

                RibbonButton fOpenManualBtn = new RibbonButton();
                fOpenManualBtn.Name = "OpenManual";
                fOpenManualBtn.Text = "Manual open";
                fOpenManualBtn.ShowText = true;
                fOpenManualBtn.ShowImage = true;
                fOpenManualBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                fOpenManualBtn.LargeImage = Images.getBitmap(Properties.Resources.openLarge);
                //fOpenManualBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                fOpenManualBtn.Size = RibbonItemSize.Standard;
                fOpenManualBtn.CommandHandler = new RibbonCommandHandler();

                // Add to main panel
                RibbonRowPanel fOpenRow = new RibbonRowPanel();
                fOpenRow.Items.Add(fOpenBtn);
                fOpenRow.Items.Add(new RibbonRowBreak());
                fOpenRow.Items.Add(fOpenVisualBtn);
                fOpenRow.Items.Add(new RibbonRowBreak());
                fOpenRow.Items.Add(fOpenManualBtn);

                fdsGeometryPanelSource.Items.Add(fMeshBtn);
                fdsGeometryPanelSource.Items.Add(fMeshAutoBtn);
                fdsGeometryPanelSource.Items.Add(fOpenRow);
                fdsGeometryPanelSource.Items.Add(new RibbonSeparator());

                RibbonButton fObstBtn = new RibbonButton();
                fObstBtn.Name = "Obst";
                fObstBtn.Text = "Obst";
                fObstBtn.ShowText = true;
                fObstBtn.ShowImage = true;
                fObstBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                fObstBtn.LargeImage = Images.getBitmap(Properties.Resources.obstLarge);
                fObstBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                fObstBtn.Size = RibbonItemSize.Large;
                fObstBtn.CommandHandler = new RibbonCommandHandler();

                RibbonButton fHoleBtn = new RibbonButton();
                fHoleBtn.Name = "Hole";
                fHoleBtn.Text = "Hole";
                fHoleBtn.ShowText = true;
                fHoleBtn.ShowImage = true;
                fHoleBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                fHoleBtn.LargeImage = Images.getBitmap(Properties.Resources.obstLarge);
                fHoleBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                fHoleBtn.Size = RibbonItemSize.Large;
                fHoleBtn.CommandHandler = new RibbonCommandHandler();

                RibbonButton fWallBtn = new RibbonButton();
                fWallBtn.Name = "Wall";
                fWallBtn.Text = "Wall";
                fWallBtn.ShowText = true;
                fWallBtn.ShowImage = true;
                fWallBtn.Image = Images.getBitmap(Properties.Resources.wall);
                fWallBtn.LargeImage = Images.getBitmap(Properties.Resources.wallLarge);
                fWallBtn.CommandHandler = new RibbonCommandHandler();

                RibbonButton fCeilingBtn = new RibbonButton();
                fCeilingBtn.Name = "Ceiling";
                fCeilingBtn.Text = "Ceiling";
                fCeilingBtn.ShowText = true;
                fCeilingBtn.ShowImage = true;
                fCeilingBtn.Image = Images.getBitmap(Properties.Resources.ceiling);
                fCeilingBtn.LargeImage = Images.getBitmap(Properties.Resources.defaultIcoLarge);
                fCeilingBtn.CommandHandler = new RibbonCommandHandler();

                RibbonButton fCWallBtn = new RibbonButton();
                fCWallBtn.Name = "CWall";
                fCWallBtn.Text = "CWall";
                fCWallBtn.ShowText = true;
                fCWallBtn.ShowImage = true;
                fCWallBtn.Image = Images.getBitmap(Properties.Resources.cwall);
                fCWallBtn.LargeImage = Images.getBitmap(Properties.Resources.wallLarge);
                fCWallBtn.CommandHandler = new RibbonCommandHandler();

                // Create row panel 
                RibbonRowPanel fGeometryRow = new RibbonRowPanel();
                fGeometryRow.Items.Add(fWallBtn);
                fGeometryRow.Items.Add(new RibbonRowBreak());
                fGeometryRow.Items.Add(fCeilingBtn);
                fGeometryRow.Items.Add(new RibbonRowBreak());
                fGeometryRow.Items.Add(fCWallBtn);

                fdsGeometryPanelSource.Items.Add(fObstBtn);
                fdsGeometryPanelSource.Items.Add(fHoleBtn);
                fdsGeometryPanelSource.Items.Add(fGeometryRow);

                RibbonButton fGeomBtn = new RibbonButton();
                fGeomBtn.Name = "Geom";
                fGeomBtn.Text = "Complex\nauto";
                fGeomBtn.ShowText = true;
                fGeomBtn.ShowImage = true;
                fGeomBtn.Image = Images.getBitmap(Properties.Resources.geom);
                fGeomBtn.LargeImage = Images.getBitmap(Properties.Resources.geomLarge);
                fGeomBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                fGeomBtn.Size = RibbonItemSize.Large;
                fGeomBtn.CommandHandler = new RibbonCommandHandler();

                RibbonButton fGeomManBtn = new RibbonButton();
                fGeomManBtn.Name = "GeomMan";
                fGeomManBtn.Text = "Complex\nmanual";
                fGeomManBtn.ShowText = true;
                fGeomManBtn.ShowImage = true;
                fGeomManBtn.Image = Images.getBitmap(Properties.Resources.geomMan);
                fGeomManBtn.LargeImage = Images.getBitmap(Properties.Resources.geomManLarge);
                fGeomManBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                fGeomManBtn.Size = RibbonItemSize.Large;
                fGeomManBtn.CommandHandler = new RibbonCommandHandler();

                fdsGeometryPanelSource.Items.Add(new RibbonSeparator());
                fdsGeometryPanelSource.Items.Add(fGeomBtn);
                fdsGeometryPanelSource.Items.Add(fGeomManBtn);

                #endregion

                #region FDS Ventilation Panel
                // FDS Ventilation Panel
                Autodesk.Windows.RibbonPanelSource fdsVentilationPanelSource = new RibbonPanelSource();
                fdsVentilationPanelSource.Title = "FDS Ventilation";
                RibbonPanel fdsVentilationPanel = new RibbonPanel();
                fdsVentilationPanel.Source = fdsVentilationPanelSource;
                Tab.Panels.Add(fdsVentilationPanel);

                RibbonButton fVentBtn = new RibbonButton();
                fVentBtn.Name = "Vent";
                fVentBtn.Text = "Vent";
                fVentBtn.ShowText = true;
                fVentBtn.ShowImage = true;
                fVentBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                fVentBtn.LargeImage = Images.getBitmap(Properties.Resources.ventLarge);
                fVentBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                fVentBtn.Size = RibbonItemSize.Large;
                fVentBtn.CommandHandler = new RibbonCommandHandler();

                RibbonButton fJetfanBtn = new RibbonButton();
                fJetfanBtn.Name = "Jetfan";
                fJetfanBtn.Text = "Jetfan";
                fJetfanBtn.ShowText = true;
                fJetfanBtn.ShowImage = true;
                fJetfanBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                fJetfanBtn.LargeImage = Images.getBitmap(Properties.Resources.jetfanLarge);
                fJetfanBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                fJetfanBtn.Size = RibbonItemSize.Large;
                fJetfanBtn.CommandHandler = new RibbonCommandHandler();

                fdsVentilationPanelSource.Items.Add(fVentBtn);
                fdsVentilationPanelSource.Items.Add(fJetfanBtn);
                #endregion

                #region FDS Specie Panel
                // FDS Specie Panel
                Autodesk.Windows.RibbonPanelSource fdsSpeciePanelSource = new RibbonPanelSource();
                fdsSpeciePanelSource.Title = "FDS Specie";
                RibbonPanel fdsSpeciePanel = new RibbonPanel();
                fdsSpeciePanel.Source = fdsSpeciePanelSource;
                Tab.Panels.Add(fdsSpeciePanel);

                RibbonButton fSpecBtn = new RibbonButton();
                fSpecBtn.Name = "Specie";
                fSpecBtn.Text = "Specie";
                fSpecBtn.ShowText = true;
                fSpecBtn.ShowImage = true;
                fSpecBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                fSpecBtn.LargeImage = Images.getBitmap(Properties.Resources.ventLarge);
                fSpecBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                fSpecBtn.Size = RibbonItemSize.Large;
                fSpecBtn.CommandHandler = new RibbonCommandHandler();

                fdsSpeciePanelSource.Items.Add(fSpecBtn);
                #endregion

                #region FDS Fire Panel
                // FDS Fire Panel
                Autodesk.Windows.RibbonPanelSource fdsFirePanelSource = new RibbonPanelSource();
                fdsFirePanelSource.Title = "FDS Fire";
                RibbonPanel fdsFirePanel = new RibbonPanel();
                fdsFirePanel.Source = fdsFirePanelSource;
                Tab.Panels.Add(fdsFirePanel);

                RibbonButton fFireBtn = new RibbonButton();
                fFireBtn.Name = "Fire";
                fFireBtn.Text = "Fire";
                fFireBtn.ShowText = true;
                fFireBtn.ShowImage = true;
                fFireBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                fFireBtn.LargeImage = Images.getBitmap(Properties.Resources.fireLarge);
                fFireBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                fFireBtn.Size = RibbonItemSize.Large;
                fFireBtn.CommandHandler = new RibbonCommandHandler();

                fdsFirePanelSource.Items.Add(fFireBtn);
                #endregion

                #region FDS Output Panel
                // FDS Output Panel
                Autodesk.Windows.RibbonPanelSource fdsOutputPanelSource = new RibbonPanelSource();
                fdsOutputPanelSource.Title = "FDS Output";
                RibbonPanel fdsOutputPanel = new RibbonPanel();
                fdsOutputPanel.Source = fdsOutputPanelSource;
                Tab.Panels.Add(fdsOutputPanel);

                RibbonButton fDevcBtn = new RibbonButton();
                fDevcBtn.Name = "Devc";
                fDevcBtn.Text = "Devc";
                fDevcBtn.ShowText = true;
                fDevcBtn.ShowImage = true;
                fDevcBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                fDevcBtn.LargeImage = Images.getBitmap(Properties.Resources.deviceLarge);
                fDevcBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                fDevcBtn.Size = RibbonItemSize.Large;
                fDevcBtn.CommandHandler = new RibbonCommandHandler();

                RibbonButton fSlcfBtn = new RibbonButton();
                fSlcfBtn.Name = "Slcf";
                fSlcfBtn.Text = "Slcf";
                fSlcfBtn.ShowText = true;
                fSlcfBtn.ShowImage = true;
                fSlcfBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                fSlcfBtn.LargeImage = Images.getBitmap(Properties.Resources.sliceLarge);
                fSlcfBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                fSlcfBtn.Size = RibbonItemSize.Large;
                fSlcfBtn.CommandHandler = new RibbonCommandHandler();

                fdsOutputPanelSource.Items.Add(fDevcBtn);
                fdsOutputPanelSource.Items.Add(fSlcfBtn);
                #endregion

                #region Layers Panel
                // Layers Panel
                Autodesk.Windows.RibbonPanelSource layersPanelSource = new RibbonPanelSource();
                layersPanelSource.Title = "Layers";
                RibbonPanel layersPanel = new RibbonPanel();
                layersPanel.Source = layersPanelSource;
                Tab.Panels.Add(layersPanel);

                //CreateBasicLayers
                RibbonButton lCreateBasicBtn = new RibbonButton();
                lCreateBasicBtn.Name = "CreateBasic";
                lCreateBasicBtn.Text = "Create\nbasic";
                lCreateBasicBtn.ShowText = true;
                lCreateBasicBtn.ShowImage = true;
                lCreateBasicBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                lCreateBasicBtn.LargeImage = Images.getBitmap(Properties.Resources.layersLarge);
                lCreateBasicBtn.Size = RibbonItemSize.Large;
                lCreateBasicBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                lCreateBasicBtn.CommandHandler = new RibbonCommandHandler();

                //CreateFdsLayer
                RibbonButton lCreateFdsBtn = new RibbonButton();
                lCreateFdsBtn.Name = "CreateFds";
                lCreateFdsBtn.Text = "Create\nFDS";
                lCreateFdsBtn.ShowText = true;
                lCreateFdsBtn.ShowImage = true;
                lCreateFdsBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                lCreateFdsBtn.LargeImage = Images.getBitmap(Properties.Resources.layersLarge);
                lCreateFdsBtn.Size = RibbonItemSize.Large;
                lCreateFdsBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                lCreateFdsBtn.CommandHandler = new RibbonCommandHandler();

                //HideFdsLayer
                //RibbonButton lHideFdsBtn = new RibbonButton();
                lHideFdsBtn.Name = "HideFds";
                lHideFdsBtn.Text = "Hide\nFDS";
                lHideFdsBtn.ShowText = true;
                lHideFdsBtn.ShowImage = true;
                lHideFdsBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                lHideFdsBtn.LargeImage = Images.getBitmap(Properties.Resources.layerOffLarge);
                lHideFdsBtn.Size = RibbonItemSize.Large;
                lHideFdsBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                lHideFdsBtn.CommandHandler = new RibbonCommandHandler();

                //HideOtherLayer
                //RibbonButton lHideOtherBtn = new RibbonButton();
                lHideOtherBtn.Name = "HideOther";
                lHideOtherBtn.Text = "Hide\nother";
                lHideOtherBtn.ShowText = true;
                lHideOtherBtn.ShowImage = true;
                lHideOtherBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                lHideOtherBtn.LargeImage = Images.getBitmap(Properties.Resources.layerOffLarge);
                lHideOtherBtn.Size = RibbonItemSize.Large;
                lHideOtherBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                lHideOtherBtn.CommandHandler = new RibbonCommandHandler();

                //CreateLayersForLevel
                RibbonButton lCreateLevelBtn = new RibbonButton();
                lCreateLevelBtn.Name = "CreateFdsLevel";
                lCreateLevelBtn.Text = "Add level";
                lCreateLevelBtn.ShowText = true;
                lCreateLevelBtn.ShowImage = true;
                lCreateLevelBtn.Image = Images.getBitmap(Properties.Resources.levelAdd);
                lCreateLevelBtn.LargeImage = Images.getBitmap(Properties.Resources.defaultIcoLarge);
                lCreateLevelBtn.Size = RibbonItemSize.Standard;
                //lCreateLevelBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                lCreateLevelBtn.CommandHandler = new RibbonCommandHandler();

                //HideForLevel
                RibbonButton lHideLevelBtn = new RibbonButton();
                lHideLevelBtn.Name = "HideLevel";
                lHideLevelBtn.Text = "Hide level";
                lHideLevelBtn.ShowText = true;
                lHideLevelBtn.ShowImage = true;
                lHideLevelBtn.Image = Images.getBitmap(Properties.Resources.levelHide);
                lHideLevelBtn.LargeImage = Images.getBitmap(Properties.Resources.defaultIcoLarge);
                lHideLevelBtn.Size = RibbonItemSize.Standard;
                lHideLevelBtn.CommandHandler = new RibbonCommandHandler();

                //ShowForLevel
                RibbonButton lShowLevelBtn = new RibbonButton();
                lShowLevelBtn.Name = "ShowLevel";
                lShowLevelBtn.Text = "Show level";
                lShowLevelBtn.ShowText = true;
                lShowLevelBtn.ShowImage = true;
                lShowLevelBtn.Image = Images.getBitmap(Properties.Resources.levelShow);
                lShowLevelBtn.LargeImage = Images.getBitmap(Properties.Resources.defaultIcoLarge);
                lShowLevelBtn.Size = RibbonItemSize.Standard;
                lShowLevelBtn.CommandHandler = new RibbonCommandHandler();

                RibbonRowPanel lLayersLevelRow = new RibbonRowPanel();
                lLayersLevelRow.Items.Add(lCreateLevelBtn);
                lLayersLevelRow.Items.Add(new RibbonRowBreak());
                lLayersLevelRow.Items.Add(lHideLevelBtn);
                lLayersLevelRow.Items.Add(new RibbonRowBreak());
                lLayersLevelRow.Items.Add(lShowLevelBtn);


                layersPanelSource.Items.Add(lCreateBasicBtn);
                layersPanelSource.Items.Add(lCreateFdsBtn);
                layersPanelSource.Items.Add(new RibbonSeparator());
                layersPanelSource.Items.Add(lHideFdsBtn);
                layersPanelSource.Items.Add(lHideOtherBtn);
                layersPanelSource.Items.Add(new RibbonSeparator());
                layersPanelSource.Items.Add(lLayersLevelRow);
                #endregion

#endif

                #region Sync Panel

                // Sync Panel
                Autodesk.Windows.RibbonPanelSource syncPanelSource = new RibbonPanelSource();
                syncPanelSource.Title = "Sync";
                syncPanel.Source = syncPanelSource;
                Tab.Panels.Add(syncPanel);

#if AAMKS
                RibbonButton sCfastBtn = new RibbonButton();
                sCfastBtn.Name = "sCFAST";
                sCfastBtn.Text = "Export\nCFAST";
                sCfastBtn.ShowText = true;
                sCfastBtn.ShowImage = true;
                sCfastBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                sCfastBtn.LargeImage = Images.getBitmap(Properties.Resources.exportLarge);
                sCfastBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                sCfastBtn.Size = RibbonItemSize.Large;
                sCfastBtn.CommandHandler = new RibbonCommandHandler();
#endif
#if WIZFDS
                RibbonButton sFdsBtn = new RibbonButton();
                sFdsBtn.Name = "sFDS";
                sFdsBtn.Text = "Export\nFDS";
                sFdsBtn.ShowText = true;
                sFdsBtn.ShowImage = true;
                sFdsBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                sFdsBtn.LargeImage = Images.getBitmap(Properties.Resources.exportLarge);
                sFdsBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                sFdsBtn.Size = RibbonItemSize.Large;
                sFdsBtn.CommandHandler = new RibbonCommandHandler();

                RibbonButton sFdsSelectBtn = new RibbonButton();
                sFdsSelectBtn.Name = "sFDSSelect";
                sFdsSelectBtn.Text = "Select\nFDS object";
                sFdsSelectBtn.ShowText = true;
                sFdsSelectBtn.ShowImage = true;
                sFdsSelectBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                sFdsSelectBtn.LargeImage = Images.getBitmap(Properties.Resources.selectLarge);
                sFdsSelectBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                sFdsSelectBtn.Size = RibbonItemSize.Large;
                sFdsSelectBtn.CommandHandler = new RibbonCommandHandler();
#endif

                // Websocket button
                sWebsocketBtn.Name = "sWebsocket";
                if (RibbonInit.isWebSockedInited == false)
                {
                    sWebsocketBtn.Text = "Websocket\nclosed";
                    sWebsocketBtn.LargeImage = Images.getBitmap(Properties.Resources.websocCloseLarge);
                }
                else
                {
                    sWebsocketBtn.Text = "Websocket\nopened";
                    sWebsocketBtn.LargeImage = Images.getBitmap(Properties.Resources.websocOpenLarge);
                }
                sWebsocketBtn.ShowText = true;
                sWebsocketBtn.ShowImage = true;
                sWebsocketBtn.Image = Images.getBitmap(Properties.Resources.defaultIco);
                sWebsocketBtn.Orientation = System.Windows.Controls.Orientation.Vertical;
                sWebsocketBtn.Size = RibbonItemSize.Large;
                sWebsocketBtn.CommandHandler = new RibbonCommandHandler();

#if AAMKS
                syncPanelSource.Items.Add(sCfastBtn);
                syncPanelSource.Items.Add(new RibbonSeparator());
#endif
#if WIZFDS
                syncPanelSource.Items.Add(sFdsBtn);
                syncPanelSource.Items.Add(sFdsSelectBtn);
                syncPanelSource.Items.Add(new RibbonSeparator());
#endif
                syncPanelSource.Items.Add(sWebsocketBtn);
#endregion

                RibbonInit.isRibbonInited = true;
                if (RibbonInit.isWebSockedInited == false)
                    syncPanel.IsEnabled = false;
#if ARX_APP
                Tab.IsVisible = true;
                Tab.IsActive = true;
#endif

            }
            catch (System.Exception)
            {
               
            }
        }

        public class RibbonCommandHandler : System.Windows.Input.ICommand
        {
            public bool CanExecute(object parameter)
            {
                return true;
            }

            public event EventHandler CanExecuteChanged;

            public void Execute(object parameter)
            {
                Document acDoc = acApp.DocumentManager.MdiActiveDocument;
                if (parameter is RibbonButton)
                {
                    RibbonButton button = parameter as RibbonButton;
#if BRX_APP
                    switch (button.Text)
#elif ARX_APP
                    switch (button.Name)
#endif
                    {
                        // CFAST
                        case "Room":
                            acDoc.SendStringToExecute("cRoom\n", true, false, true);
                            break;
                        case "Corridor":
                            acDoc.SendStringToExecute("cCorridor\n", true, false, true);
                            break;
                        case "Hall":
                            acDoc.SendStringToExecute("cHall\n", true, false, true);
                            break;
                        case "Staircase":
                            acDoc.SendStringToExecute("cStaircase\n", true, false, true);
                            break;
                        case "Door":
                            acDoc.SendStringToExecute("cDoor\n", true, false, true);
                            break;
                        case "Window":
                            acDoc.SendStringToExecute("cWindow\n", true, false, true);
                            break;
                        case "Inlet":
                            acDoc.SendStringToExecute("cInlet\n", true, false, true);
                            break;
                        case "Vvent":
                            acDoc.SendStringToExecute("cVvent\n", true, false, true);
                            break;
                        case "Mvent":
                            acDoc.SendStringToExecute("cMvent\n", true, false, true);
                            break;
                        case "Holeaut":
                            acDoc.SendStringToExecute("cHole\n", true, false, true);
                            break;
                        case "Holeman":
                            acDoc.SendStringToExecute("cHoleman\n", true, false, true);
                            break;

                        // FDS
                        case "Mesh":
                            acDoc.SendStringToExecute("fMesh\n", true, false, true);
                            break;
                        case "MeshAuto":
                            acDoc.SendStringToExecute("fMeshauto\n", true, false, true);
                            break;
                        case "Open":
                            acDoc.SendStringToExecute("fOpen\n", true, false, true);
                            break;
                        case "OpenVisual":
                            acDoc.SendStringToExecute("fOpenVisual\n", true, false, true);
                            break;
                        case "OpenManual":
                            acDoc.SendStringToExecute("fOpenManual\n", true, false, true);
                            break;
                        case "Obst":
                            acDoc.SendStringToExecute("fObst\n", true, false, true);
                            break;
                        case "Hole":
                            acDoc.SendStringToExecute("fHole\n", true, false, true);
                            break;
                        case "Wall":
                            acDoc.SendStringToExecute("fWall\n", true, false, true);
                            break;
                        case "Ceiling":
                            acDoc.SendStringToExecute("fCeiling\n", true, false, true);
                            break;
                        case "CWall":
                            acDoc.SendStringToExecute("fCWall\n", true, false, true);
                            break;
                        case "Geom":
                            acDoc.SendStringToExecute("fSolMesh\n", true, false, true);
                            break;
                        case "GeomMan":
                            acDoc.SendStringToExecute("_MeshOptions\n", true, false, true);
                            break;
                        case "Vent":
                            acDoc.SendStringToExecute("fVent\n", true, false, true);
                            break;
                        case "Jetfan":
                            acDoc.SendStringToExecute("fJetfan\n", true, false, true);
                            break;
                        case "Specie":
                            acDoc.SendStringToExecute("fSpec\n", true, false, true);
                            break;
                        case "Fire":
                            acDoc.SendStringToExecute("fFire\n", true, false, true);
                            break;
                        case "Devc":
                            acDoc.SendStringToExecute("fDevc\n", true, false, true);
                            break;
                        case "Slcf":
                            acDoc.SendStringToExecute("fSlcf\n", true, false, true);
                            break;
                        case "CreateBasic":
                            acDoc.SendStringToExecute("fCreateBasicLayers\n", true, false, true);
                            break;
                        case "CreateFds":
                            acDoc.SendStringToExecute("fCreateFdsLayer\n", true, false, true);
                            break;
                        case "CreateLevel":
                            acDoc.SendStringToExecute("\n", true, false, true);
                            break;
                        case "HideFds":
                            if(RibbonInit.isFdsLayersHidden)
                            {
                                acDoc.SendStringToExecute("fShowFdsLayers\n", true, false, true);
                                RibbonInit.isFdsLayersHidden = false;
                                lHideFdsBtn.Text = "Hide\nFDS";
                                // Tutaj zmiana ikonki, tekstu
                            }
                            else
                            {
                                acDoc.SendStringToExecute("fHideFdsLayers\n", true, false, true);
                                RibbonInit.isFdsLayersHidden = true;
                                lHideFdsBtn.Text = "Show\nFDS";
                                // Tutaj zmiana ikonki, tekstu
                            }
                            break;
                        case "HideOther":
                            if(RibbonInit.isOtherLayersHidden)
                            {
                                acDoc.SendStringToExecute("fShowOtherLayers\n", true, false, true);
                                RibbonInit.isOtherLayersHidden = false;
                                lHideOtherBtn.Text = "Hide\nother";
                                // Tutaj zmiana ikonki, tekstu
                            }
                            else
                            {
                                acDoc.SendStringToExecute("fHideOtherLayers\n", true, false, true);
                                RibbonInit.isOtherLayersHidden = true;
                                lHideOtherBtn.Text = "Show\nother";
                                // Tutaj zmiana ikonki, tekstu
                            }
                            break;
                        case "HideLevel":
                            acDoc.SendStringToExecute("fHideLevel\n", true, false, true);
                            break;
                        case "ShowLevel":
                            acDoc.SendStringToExecute("fShowLevel\n", true, false, true);
                            break;
                        case "CreateFdsLevel":
                            acDoc.SendStringToExecute("fCreateLevel\n", true, false, true);
                            break;
                        
                        // Sync
                        case "sFDS":
                            acDoc.SendStringToExecute("fExport\n", true, false, true);
                            break;
                        case "sFDSSelect":
                            acDoc.SendStringToExecute("fSelect\n", true, false, true);
                            break;
                        case "sCFAST":
                            acDoc.SendStringToExecute("cExport\n", true, false, true);
                            break;

                        // Utils
                        case "3dorbit":
                            acDoc.SendStringToExecute("_3dorbit\n", true, false, true);
                            break;
                        case "zoomextents":
                            acDoc.SendStringToExecute("_zoom _e\n", true, false, true);
                            break;
                        case "dist":
                            acDoc.SendStringToExecute("_dist\n", true, false, true);
                            break;
                        case "area":
                            acDoc.SendStringToExecute("_measuregeom _ar\n", true, false, true);
                            break;
                        case "Top":
                            acDoc.SendStringToExecute("_-view _top\n", true, false, true);
                            break;
                        case "Bottom":
                            acDoc.SendStringToExecute("_-view _bottom\n", true, false, true);
                            break;
                        case "Front":
                            acDoc.SendStringToExecute("_-view _front\n", true, false, true);
                            break;
                        case "Back":
                            acDoc.SendStringToExecute("_-view _back\n", true, false, true);
                            break;
                        case "Right":
                            acDoc.SendStringToExecute("_-view _right\n", true, false, true);
                            break;
                        case "Left":
                            acDoc.SendStringToExecute("_-view _left\n", true, false, true);
                            break;
                        
                    }
                }
            }
        }

#if ARX_APP
        public class Images
        {
            public static BitmapImage getBitmap(Bitmap image)
            {
                MemoryStream stream = new MemoryStream();
                image.Save(stream, ImageFormat.Png);
                BitmapImage bmp = new BitmapImage();
                bmp.BeginInit();
                bmp.StreamSource = stream;
                bmp.EndInit();

                return bmp;
            }
            public static BitmapImage DrawFilledRectangle(int x, int y, Autodesk.AutoCAD.Colors.Color color)
            {
                Bitmap bmp = new Bitmap(x, y);
                using (Graphics graph = Graphics.FromImage(bmp))
                {
                    Rectangle ImageSize = new Rectangle(0,0,x,y);
                    graph.FillRectangle(new SolidBrush(System.Drawing.Color.FromArgb(255, (byte)color.ColorValue.R, (byte)color.ColorValue.G, (byte)color.ColorValue.B)), ImageSize);
                    graph.DrawLine(new Pen(Brushes.Black, 1), new Point(0, 0), new Point(0, 15));
                    graph.DrawLine(new Pen(Brushes.Black, 1), new Point(0, 0), new Point(15, 0));
                    graph.DrawLine(new Pen(Brushes.Black, 1), new Point(0, 15), new Point(15, 15));
                    graph.DrawLine(new Pen(Brushes.Black, 1), new Point(15, 0), new Point(15, 15));
                }
                MemoryStream ms = new MemoryStream();
                ((System.Drawing.Bitmap)bmp).Save(ms, System.Drawing.Imaging.ImageFormat.Bmp);
                BitmapImage image = new BitmapImage();
                image.BeginInit();
                ms.Seek(0, SeekOrigin.Begin);
                image.StreamSource = ms;
                image.EndInit();
                return image;
            }
        }
#endif
    }
}