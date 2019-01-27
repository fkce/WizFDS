import { Main } from '@services/main/main';
import { MainService } from '@services/main/main.service';
import { Ramp } from '@services/fds-object/ramp/ramp';
import { Component, OnInit, OnChanges, ViewChild, ElementRef, Input, ViewEncapsulation } from '@angular/core';

import * as d3Selection from 'd3-selection';
import * as d3Scale from 'd3-scale';
import * as d3Shape from 'd3-shape';
import * as d3Array from 'd3-array';
import * as d3Axis from 'd3-axis';

import { saveAs } from 'file-saver';
import { toString, round, last, toNumber } from 'lodash';
import { LibraryService } from '@services/library/library.service';
import { Library } from '@services/library/library';

@Component({
  selector: 'parabola-chart',
  templateUrl: './parabola-chart.component.html',
  styleUrls: ['./parabola-chart.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ParabolaChartComponent implements OnInit, OnChanges {

  @ViewChild('parabolaChart') private chartContainer: ElementRef;
  @Input() private maxHrr: number;
  @Input() private maxTime: number;
  @Input() private xLabel: string;
  @Input() private yLabel: string;
  @Input() private units: string[];
  @Input() private alpha: any;
  @Input() private objectType: string;
  @Input() private editor: string;

  public main: Main;
  public lib: Library;

  private mainSub;
  private libSub;

  private margin = { top: 10, right: 20, bottom: 50, left: 70 };
  private width: number;
  private height: number;
  private x: any;
  private y: any;
  private xAxis: any;
  private yAxis: any;
  private svg: any;
  private curve: d3Shape.Line<[number, number]>;
  private line: d3Shape.Line<[number, number]>;

  constructor(private mainService: MainService, private libraryService: LibraryService) { }

  ngOnInit() {
    this.mainSub = this.mainService.getMain().subscribe(main => this.main = main);
    this.libSub = this.libraryService.getLibrary().subscribe(lib => this.lib = lib);

    if (!this.svg) {
      this.createChart();
      this.updateChart();
    }
  }

  ngOnChanges() {
    if (this.svg) {
      this.updateChart();
    }
  }

  ngOnDestroy() {
    this.mainSub.unsubscribe();
    this.libSub.unsubscribe();
  }

  /** 
   * Prepare data befor ploting 
   */
  private prepareData(): any[] {

    // Alpha * t2 function
    let fn = (x) => {
      return this.alpha * Math.pow(x, 2);
    };

    // Set step for 20 values
    let step = parseInt(toString(this.maxTime / 20));
    //Prepare data steps
    let points = d3Array.range(0, this.maxTime, step).map(function (d) {
      return { x: d, y: fn(d) };
    });
    // Add last step
    points.push({ x: toNumber(this.maxTime), y: toNumber(this.maxHrr) });

    return points;
  }

  /**
   * Init chart
   */
  private createChart() {
    // Init chart
    const element = this.chartContainer.nativeElement;

    // Width & height is canvas element minus margins
    this.width = element.offsetWidth - this.margin.left - this.margin.right;
    this.height = element.offsetHeight - this.margin.top - this.margin.bottom;

    this.svg = d3Selection.select(element).append('svg')
      .attr('width', this.width + this.margin.left + this.margin.right)
      .attr('height', this.height + this.margin.top + this.margin.bottom);

    // Init axis
    this.x = d3Scale.scaleLinear()
      .range([0, this.width]);

    this.y = d3Scale.scaleLinear()
      .range([this.height, 0]);

    this.xAxis = d3Axis.axisBottom(this.x);
    this.yAxis = d3Axis.axisLeft(this.y);

    // Prepare alpha * t2 curve
    this.curve = d3Shape.line()
      .x((d: any) => this.x(d.x))
      .y((d: any) => this.y(d.y))
      .curve(d3Shape.curveBasis);

    // Prepare constant HRR line
    this.line = d3Shape.line()
      .x((d: any) => this.x(d.x))
      .y((d: any) => this.y(d.y))
      .curve(d3Shape.curveLinear);
  }

  /** Update chart */
  public updateChart() {

    // Remove previous plot and axis
    this.svg.selectAll('.line').remove();
    this.svg.selectAll('.axis').remove();
    this.svg.selectAll('g').remove();

    // Prepare curve data
    let dataCurve = this.prepareData();
    // Prepare line data
    let dataLine = [
      { x: last(dataCurve).x, y: last(dataCurve).y },
      { x: this.main.currentFdsScenario.fdsObject.general.time.t_end, y: last(dataCurve).y }
    ];
    // Prepare dot data
    let dataDot = [
      { x: last(dataCurve).x, y: last(dataCurve).y },
    ];

    // Axis domains - values on axis
    let maxXData = d3Array.max(dataCurve, function (d) { return d.x; }) > this.main.currentFdsScenario.fdsObject.general.time.t_end ?
      d3Array.max(dataCurve, function (d) { return d.x; }) :
      this.main.currentFdsScenario.fdsObject.general.time.t_end;

    let maxYData = d3Array.max(dataCurve, function (d) { return d.y; });

    this.x.domain([0, maxXData + maxXData * 0.05]);
    this.y.domain([0, maxYData + maxYData * 0.05]);

    // Draw axis
    this.svg.append('g')
      .attr('class', 'axis')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top + this.height})`)
      .call(this.xAxis);

    this.svg.append('g')
      .attr('class', 'axis')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`)
      .call(this.yAxis);

    // Draw x axis label
    this.svg.append("text")
      .attr("class", "x label")
      .attr("fill", "rgb(250,250,250)")
      .attr("text-anchor", "middle")
      .attr("x", this.margin.left + this.width / 2)
      .attr("y", this.height + this.margin.top + this.margin.bottom - 10)
      .text(this.xLabel + ' [' + this.units[0] + ']');

    // Draw y axis label
    this.svg.append("text")
      .attr("class", "y label")
      .attr("fill", "rgb(250,250,250)")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -(this.margin.top + this.height / 2))
      .attr("y", 20)
      .text(this.yLabel + ' [' + this.units[1] + ']');

    // Draw curve
    this.svg.append('path')
      .datum(dataCurve)
      .attr('d', this.curve)
      .attr("class", "line")
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`)
      .attr('stroke-width', 6)
      .attr('stroke', 'rgb(120,120,145)')
      .attr('fill', 'none');

    // Draw line
    this.svg.append('path')
      .datum(dataLine)
      .attr('d', this.line)
      .attr("class", "line")
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`)
      .attr('stroke-width', 6)
      .attr('stroke', 'rgb(120,120,145)')
      .attr('fill', 'none');

    let gdots = this.svg.selectAll("g.dot")
      .data(dataDot)
      .enter().append('g');

    // Draw dot
    gdots.append("circle")
      .attr("class", "dot")
      .attr("r", 6)
      .attr("fill", "rgb(0,168,243)")
      .attr("cx", (d) => { return this.x(d.x); })
      .attr("cy", (d) => { return this.y(d.y); })
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`);

    // Draw dot label
    gdots.append("text")
      .text((d) => { return round(d.y, 2); })
      .attr("x", (d) => { return this.x(d.x); })
      .attr("y", (d) => { return this.y(d.y); })
      .attr('transform', `translate(${this.margin.left - 10}, ${this.margin.top - 10})`);
  }

  /**
   * Save ramp chart
   */
  public saveChart() {
    // Create svg string
    var svgString = this.getSVGString(this.svg.node());
    // Export string and save image
    this.svgString2Image(svgString, 2 * this.width, 2 * this.height, 'png'); 
  }

  /**
   * Generate svn string
   * @param svgNode 
   */
  private getSVGString(svgNode: any) {
    svgNode.setAttribute('xlink', 'http://www.w3.org/1999/xlink');
    let cssStyleText = "text { fill: #000; font-size: 10pt;}";

    var serializer = new XMLSerializer();
    var svgString = serializer.serializeToString(svgNode);
    // Add custom style
    svgString = svgString.replace('xlink">', 'xlink"><style xmlns="http://www.w3.org/1999/xhtml" type="text/css">'+ cssStyleText +'</style>');
    // Fix root xlink without namespace
    svgString = svgString.replace(/(\w+)?:?xlink=/g, 'xmlns:xlink='); 
    // Safari NS namespace fix
    svgString = svgString.replace(/NS\d+:href/g, 'xlink:href'); 

    return svgString;
  }

  /**
   * Convert svg to image
   * @param svgString 
   * @param width 
   * @param height 
   * @param format 
   */
  public svgString2Image(svgString: string, width: number, height: number, format: string) {
    var format = format ? format : 'png';

    // Convert SVG string to data URL
    var imgsrc = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString))); 

    var canvas = document.createElement("canvas");
    var context = canvas.getContext("2d");

    canvas.width = width;
    canvas.height = height;

    var image = new Image();
    image.onload = () => {
      context.clearRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      canvas.toBlob((blob) => {
        saveAs(blob, this.xLabel +'-'+ this.yLabel +'-ramp.png'); 
      });
    };

    image.src = imgsrc;
  }

}
