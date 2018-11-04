#if BRX_APP
using acApp = Bricscad.ApplicationServices.Application;
using Bricscad.ApplicationServices;
using Teigha.BoundaryRepresentation;
using Teigha.Colors;
using Teigha.DatabaseServices;
using Bricscad.EditorInput;
using Teigha.Geometry;
using Teigha.GraphicsInterface;
using Teigha.GraphicsSystem;
using Bricscad.PlottingServices;
using Bricscad.Runtime;
using Teigha.Runtime;
using Bricscad.Windows;
using BricscadDb;
using BricscadApp;
#elif ARX_APP
using acApp = Autodesk.AutoCAD.ApplicationServices.Application;
using Autodesk.AutoCAD.EditorInput;
using Autodesk.AutoCAD.Runtime;
#endif

using System;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using Newtonsoft.Json;

namespace WizFDS.Results
{
    public class GenResults
    {
        public Editor ed = acApp.DocumentManager.MdiActiveDocument.Editor;

        public double winWidth = 800;
        public double winHeight = 600;



        public List<dynamic> ReadSlcfFromFdsFile()
        {
            // TODO: sprawdzic spacje regex przy =
            try
            {
                dynamic slice = new System.Dynamic.ExpandoObject();
                var slices = new List<dynamic>();
                string path = "C:\\Users\\mateu\\ownCloud\\Python Scripts\\wyniki_sym\\obliczenia\\hebe_sym1.fds";
                var lines = File.ReadLines(path);
                Regex regEx = new Regex(@"&SLCF.*\((.*)\).*\[(.*)\].*", RegexOptions.IgnoreCase);
                Regex regExClip = new Regex(@"(\{.*\})", RegexOptions.IgnoreCase);
                Regex regExQuantity = new Regex( @"quantity=([""'])(.*?)\1", RegexOptions.IgnoreCase);
                Regex regExAxis = new Regex(@"pb(.)=([-0-9]*(?:\.[0-9]*))", RegexOptions.IgnoreCase);
                
                foreach (var line in lines)
                {
                    Match match = regEx.Match(line);
                    Match matchQuantity = regExQuantity.Match(line);
                    Match matchAxis = regExAxis.Match(line);
                    Match matchClip = regExClip.Match(line);
                    if (match.Success && matchQuantity.Success && matchAxis.Success)
                    {
                        dynamic bar = new System.Dynamic.ExpandoObject();
                        var barSplit = match.Groups[1].Value.Split(',');
                        bar.min = barSplit[0];
                        bar.max = barSplit[1];
                        bar.marked = barSplit[2];
                        
                        slice.bar = bar;
                        slice.times = match.Groups[2].Value.Split(',');
                        slice.quantity = matchQuantity.Groups[2].Value;
                        slice.axis = matchAxis.Groups[1].Value;

                        slice.axisValue = matchAxis.Groups[2].Value;
                        if (matchClip.Success) slice.clip = JsonConvert.DeserializeObject<dynamic>(matchClip.Groups[1].Value);
                        else slice.clip = null;

                        slices.Add(slice);
                    }
                }
                return slices;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage(e.Message);
                return null;
            }

        }
        public dynamic ReadMeshFromFdsFile()
        {
            // TODO: sprawdzic spacje regex przy =
            try
            {
                string path = "C:\\Users\\mateu\\ownCloud\\Python Scripts\\wyniki_sym\\obliczenia\\hebe_sym1.fds";
                var lines = File.ReadLines(path);
                Regex regExMesh = new Regex(@"&mesh.*xb=([,\d\s\.-]*)", RegexOptions.IgnoreCase);

                dynamic coordinates = new System.Dynamic.ExpandoObject();
                coordinates.xMin = null;
                coordinates.xMax = null;
                coordinates.yMin = null;
                coordinates.yMax = null;
                coordinates.zMin = null;
                coordinates.zMax = null;
                
                foreach (var line in lines)
                {
                    Match matchMesh = regExMesh.Match(line);
                    if (matchMesh.Success)
                    {
                        var coord = Array.ConvertAll(matchMesh.Groups[1].Value.Trim().Split(','), Double.Parse);

                        if (coordinates.xMin == null)
                            coordinates.xMin = coord[0];
                        if (coordinates.xMax == null)
                            coordinates.xMax = coord[1];
                        if (coordinates.yMin == null)
                            coordinates.yMin = coord[2];
                        if (coordinates.yMax == null)
                            coordinates.yMax = coord[3];
                        if (coordinates.zMin == null)
                            coordinates.zMin = coord[4];
                        if (coordinates.zMax == null)
                            coordinates.zMax = coord[5];

                        if (coord[0] < coordinates.xMin)
                            coordinates.xMin = coord[0];
                        if (coord[1] > coordinates.xMax)
                            coordinates.xMax = coord[1];
                        if (coord[2] < coordinates.yMin)
                            coordinates.yMin = coord[2];
                        if (coord[3] > coordinates.yMax)
                            coordinates.yMax = coord[3];
                        if (coord[4] < coordinates.zMin)
                            coordinates.zMin = coord[4];
                        if (coord[5] > coordinates.zMax)
                            coordinates.zMax = coord[5];
                    }
                }
                return coordinates;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage(e.Message);
                return null;
            }

        }
        public string ReadChidFromFdsFile()
        {
            try
            {
                string path = "C:\\Users\\mateu\\ownCloud\\Python Scripts\\wyniki_sym\\obliczenia\\hebe_sym1.fds";
                var lines = File.ReadLines(path);
                Regex regExChid = new Regex( @"chid=([""'])(.*?)\1", RegexOptions.IgnoreCase);
                string chid = "";
                
                foreach (var line in lines)
                {
                    Match match = regExChid.Match(line);
                    if (match.Success)
                    {
                        chid = match.Groups[2].Value;

                    }
                }
                return chid;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage(e.Message);
                return null;
            }


        }

        public bool CreateSsfFile(dynamic slice)
        {
            try
            {

                // Set a variable to the My Documents path.
                string path = "C:\\Users\\mateu\\ownCloud\\Python Scripts\\wyniki_sym\\obliczenia\\ssf.txt";

                // Append text to an existing file named "WriteLines.txt".
                using (StreamWriter outputFile = new StreamWriter(path, false)) {
                    outputFile.WriteLine("LOADINIFILE");
                    outputFile.WriteLine(ReadChidFromFdsFile());
                    outputFile.WriteLine("RENDERDIR");
                    outputFile.WriteLine("../Results/");
                    outputFile.WriteLine("");
                    outputFile.WriteLine("LOADSLICE");
                    outputFile.WriteLine(slice.quantity);
                    string axis = "";
                    axis = (slice.axis.ToLower() == "x") ? "1": axis;
                    axis = (slice.axis.ToLower() == "y") ? "2": axis;
                    axis = (slice.axis.ToLower() == "z") ? "3": axis;
                    outputFile.WriteLine(" " + axis + " " + slice.axisValue);
                    outputFile.WriteLine("");
                    foreach (var time in slice.times)
                    {
                        outputFile.WriteLine("SETTIMEVAL");
                        outputFile.WriteLine(time);
                        outputFile.WriteLine("RENDERONCE");
                        outputFile.WriteLine(slice.quantity + "_PB" + slice.axis + slice.axisValue + "_" + time + "s");
                    }
                }
                return true;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage(e.ToString());
                return false;
            }
        }

        public bool CreateIniFile(string chid, dynamic meshes)
        {
            try
            {

                // Set a variable to the My Documents path.
                string path = "C:\\Users\\mateu\\ownCloud\\Python Scripts\\wyniki_sym\\obliczenia\\" + chid + ".ini";

                // Append text to an existing file named "WriteLines.txt".
                using (StreamWriter outputFile = new StreamWriter(path, false)) {
                    outputFile.WriteLine("COLORBAR");
                    outputFile.WriteLine("12");
                    outputFile.WriteLine("0.00 0.00 1.00");
                    outputFile.WriteLine("0.00 0.28 0.96");
                    outputFile.WriteLine("0.00 0.54 0.84");
                    outputFile.WriteLine("0.00 0.76 0.65");
                    outputFile.WriteLine("0.00 0.91 0.41");
                    outputFile.WriteLine("0.00 0.99 0.14");
                    outputFile.WriteLine("0.14 0.99 0.00");
                    outputFile.WriteLine("0.41 0.91 0.00");
                    outputFile.WriteLine("0.65 0.76 0.00");
                    outputFile.WriteLine("0.84 0.54 0.00");
                    outputFile.WriteLine("0.96 0.28 0.00");
                    outputFile.WriteLine("1.00 0.00 0.00");
                    outputFile.WriteLine("WINDOWWIDTH");
                    outputFile.WriteLine(" 1280");
                    outputFile.WriteLine("WINDOWHEIGHT");
                    outputFile.WriteLine(" 768");
                    outputFile.WriteLine("SHOWTITLE");
                    outputFile.WriteLine(" 0");
                    outputFile.WriteLine("FontSize");
                    outputFile.WriteLine(" 2");
                    outputFile.WriteLine("SHOWFRAMELABEL");
                    outputFile.WriteLine(" 0");
                    outputFile.WriteLine(CreateViewpoint(meshes));
                }
                return true;
            }
            catch (System.Exception e)
            {
                ed.WriteMessage(e.ToString());
                return false;
            }



/*
    iniFile.write('VIEWPOINT5\n')
    iniFile.write(' 0 0 2\n')
    camera = setCamera(var)
    if 'xi' not in camera:        
        camera['xi'] = ''
    if 'xa' not in camera:        
        camera['xa'] = ''
    if 'yi' not in camera:        
        camera['yi'] = ''
    if 'ya' not in camera:        
        camera['ya'] = ''
    if 'zi' not in camera:        
        camera['zi'] = ''
    if 'za' not in camera:        
        camera['za'] = ''
    iniFile.write(' '+ camera['kx'] +' '+ camera['kz'] +' '+ camera['ky'] +' 1.000000 2\n') # pierwsze 2 punk z ktorego sie patrzy
    iniFile.write(' 0.000000 0.000000 0.000000 0\n')
    iniFile.write(' '+ camera['vx'] +' '+ camera['vy'] +' 0.0\n')
    iniFile.write(' '+ camera['ox'] +' '+ camera['oy'] +'\n')
    iniFile.write(' 1.000000 0.000000 0.000000 0.000000\n')
    iniFile.write(' 0.000000 1.000000 0.000000 0.000000\n')
    iniFile.write(' 0.000000 0.000000 1.000000 0.000000\n')
    iniFile.write(' 0.000000 0.000000 0.000000 1.000000\n')
    iniFile.write(' 0 0 0 0 0 0 0\n')
    iniFile.write(' -0.056550 -0.032400 -0.002700 56.606548 32.432400 2.702700\n')
    iniFile.write('przekroj\n')
    iniFile.write('LABELSTARTUPVIEW\n')
    iniFile.write(' przekroj\n')
    iniFile.write('V_SLICE\n')
    if quantity == 'temperature':
        if param == "ew":
            iniFile.write(' 1 0.000000 1 306.00000 temp\n')
        elif param == "ek" or param == "ek105":
            iniFile.write(' 1 0.000000 1 440.00000 temp\n')
        elif param == "ek120":
            iniFile.write(' 1 0.000000 1 450.00000 temp\n')
        elif param == "f3":
            iniFile.write(' 1 0.000000 1 430.10000 temp\n')
        elif param == "f4":
            iniFile.write(' 1 0.000000 1 595.10000 temp\n')
    if quantity == 'visibility':
        iniFile.write(' 1 0.000000 1 30.00000 VIS_Soot\n')
    iniFile.write('OUTLINEMODE\n')
    iniFile.write('0\n')
    iniFile.write('SHOWOPENVENTS\n')
    iniFile.write('0\n')
    iniFile.write('FONTSIZE\n')
    iniFile.write('1\n')
    iniFile.write('SHOWBLOCKLABEL\n')
    iniFile.write('0\n')
    iniFile.write('SHOWDUMMYVENTS\n')
    iniFile.write('0\n')
    if camera['xi'] != '' or camera['xa'] != '' or camera['yi'] != '' or camera['ya'] != '' or camera['zi'] != '' or camera['za'] != '':
        iniFile.write('XYZCLIP\n')
        iniFile.write('1\n')
        if camera['xi'] != '':
            iniFile.write('1 '+str(camera['xi']+' '))
        else:
            iniFile.write('0 0.0 ')
        if camera['xa'] != '':
            iniFile.write('1 '+str(camera['xa'])+'\n')
        else:
            iniFile.write('0 0.0\n')
        if camera['yi'] != '':
            iniFile.write('1 '+str(camera['yi']+' '))
        else:
            iniFile.write('0 0.0 ')
        if camera['ya'] != '':
            iniFile.write('1 '+str(camera['ya'])+'\n')
        else:
            iniFile.write('0 0.0\n')
        if camera['zi'] != '':
            iniFile.write('1 '+str(camera['zi']+' '))
        else:
            iniFile.write('0 0.0 ')
        if camera['za'] != '':
            iniFile.write('1 '+str(camera['za'])+'\n')
        else:
            iniFile.write('0 0.0\n')
            */
  

        }

        public string CreateViewpoint(dynamic mesh)
        {


            /*
              float local_aperture_default;
  float width;
  float asp;

  local_aperture_default=zoom2aperture(1.0);
  asp=(float)screenHeight/(float)screenWidth;
  width=xbar;
  if(zbar/asp>xbar){
    width=zbar/asp;
  }
  eyeyfactor = -1.10*width/2.0/tan(local_aperture_default*DEG2RAD/2.0);
  camera_data->eye[1]=eyeyfactor*xyzbox;
  if(viscolorbarpath==1){
    camera_data->eye[0]=0.7;
    camera_data->eye[1]=-2.25;
    camera_data->eye[2]=0.5;
  }
  camera_data->isometric_y=(eyeyfactor-1.0)*xyzbox;
  */



            double rad2deg = 57.29577951;
            double deg2rad = 0.01745329;
            double asp = 45.0;
            double deltaX, deltaY, deltaZ, winFactor, eyeX, eyeY, eyeZ, width, eyeFactor, ap;
            deltaX = Math.Abs(mesh.xMax - mesh.xMin);
            deltaY = Math.Abs(mesh.yMax - mesh.yMin);
            deltaZ = Math.Abs(mesh.zMax - mesh.zMin);
            winFactor = winHeight / winWidth;
            eyeX = (deltaX < deltaY) ? deltaX / deltaY / 2 : 0.5;
            eyeY = (deltaY < deltaX) ? deltaY / deltaX / 2 : 0.0;
            eyeZ = deltaZ / Math.Max(deltaX, deltaY) / 2;


            ap = 2.0*rad2deg*Math.Atan(Math.Tan(45.0*deg2rad/2.0)/1.0);

            //width = ((deltaY / deltaX) / winFactor >= winFactor) ? (deltaY / deltaX) / winFactor : 1.0;
            //width = (deltaY / deltaX >= winFactor) ? (deltaY / deltaX) / winFactor : 1.0;
            width = (deltaX / deltaY) / rad2deg;
            eyeFactor = -1.1 * width / 2 / Math.Tan(winFactor * deg2rad / 2);

            string viewpoint = "";
            viewpoint += "\nVIEWPOINT5";
            viewpoint += "\n 0 0 2";
            viewpoint += "\n " + eyeX.ToString() + " " + eyeFactor.ToString() + " " + eyeY.ToString() + " 1.0 2";
            viewpoint += "\n 0.0 0.0 0.0 0";
            viewpoint += "\n 0.5 0.5 0.0";
            viewpoint += "\n 0.0 90.0";
            viewpoint += "\n 1.000000 0.000000 0.000000 0.000000";
            viewpoint += "\n 0.000000 1.000000 0.000000 0.000000";
            viewpoint += "\n 0.000000 0.000000 1.000000 0.000000";
            viewpoint += "\n 0.000000 0.000000 0.000000 1.000000";
            viewpoint += "\n 0 0 0 0 0 0 0";
            viewpoint += "\n " + mesh.xMin.ToString() + " " + mesh.xMax.ToString() + " " + mesh.yMin.ToString() + " " + mesh.yMax.ToString() + " " + mesh.zMin.ToString() + " " + mesh.zMax.ToString();
            viewpoint += "\n startupView";
            viewpoint += "\nLABELSTARTUPVIEW";
            viewpoint += "\n startupView";

            return viewpoint;
        }

        [CommandMethod("fFfDS")]
        public void Run()
        {
            var slices = ReadSlcfFromFdsFile();
            var meshes = ReadMeshFromFdsFile();
            var chid = ReadChidFromFdsFile();
            if(slices.Count > 0)
            {
                foreach(var slice in slices)
                {

                    CreateIniFile(chid, meshes);
                    if (CreateSsfFile(slice))
                    {
                        ed.WriteMessage(JsonConvert.SerializeObject(slice, Formatting.Indented).ToString());
                    }
                }
            }

        }


        // Na wejściu dostaję chid, siatki, czasy, rodzaj przekroju, oś, zakres wartości, wartość podświetlaną, clipy,

    }
}
