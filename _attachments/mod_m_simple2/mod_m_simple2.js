/* This file is part of the master-thesis
 * "A Web-Based System for Comparative Analysis of OpenStreetMap
 * Data by the use of CouchDB" by Markus Mayr.
 * 
 * This module performs a simplified check for location between two
 * different datasets. One is provided as an array, the other one as
 * an CouchDB-jQuery-connection object.
 * The check itself is performed by a WebWorker.
 * 
 * REQUIREMENTS:
 * - function: updateStatus( {title : '', status : ''} )
 * - function: gjsonToMap( geoJSON )
 * - function: checkFinished( {hit: '', miss: '', hitc: ''} )
 * 
 * MODULE INTERFACE:
 * - .start( {checkarray} , {settings} )
 * - .stop()
 * - .status()
 * 
 *  */

var mod_m_simple2 = (function() {
  var module_status;
  var module_percent = 0;
  var worker;
  
  return{
    start : function(checkarray,settings){
      module_status = 1;
      //console.log("mod_m_simple.start()");
      checkarray = input2array(checkarray);
      
      // start the web-worker
      worker = new Worker("mod_m_simple2/worker.js");
      var workerconnection = settings.connectionstring;
      worker.postMessage( {   command : "start",
                              checksettings : settings,
                              content : checkarray,
                              connection : workerconnection
                        });
      
      // call the "updateStatus" function provided by the main web-app
      updateStatus({title : "Matching ...", status : 0});
      
      // worker callback
      worker.onmessage = function(message){
        if (message.data.command == "info") {
          console.log("worker says: " + message.data.content);
      } else if (message.data.command == "status") {
          module_percent = message.data.content;
          updateStatus({title : "Matching ...", status : message.data.content});
      } else if (message.data.command == "finished") {
          console.log("WORKER HAS FINISHED");
          var lencheck = message.data.content.hit.length;
          var lenmiss = message.data.content.miss.length;
          updateStatus({title : "Matching",
                        status : "<b>" + lencheck + "</b>"+
                                 " Funde von <b>"+(lencheck+lenmiss)+"</b> möglichen"
                       });
          checkFinished(message.data.content);
          worker.terminate();
          delete worker;
      } else if (message.data.command == "inspect") {
          console.log("Worker sends the following object to inspect:")
          console.log(message.data.content);
      } else if (message.data.command == "addToMap") {
          gjsonToMap( message.data.content); //this function is external
          var drawlayer = message.data.content.layer;
          // only draw the search-extent when it was actually a search-element
          if (drawlayer == "hit" || drawlayer == "miss") {
            drawSearchExtent(message.data.content, settings);
          };
        };
      }; // END worker.onmessage
      module_status = 0;
      return(0);
    }, //start
    
    status : function(){
      if (module_status == 1) {
        return(this.module_percent);
      };
    }, //status
    
    stop : function(){
        // stop the web-worker
        if(worker){
            worker.terminate();
            module_status = 0;
            delete worker;
            return("stopped");
        };
    } //stop
  }; //return

  // draws a circle or a box around a specified feature and pushes it to the map
  function drawSearchExtent(feature, settings){
    if (settings.radiussearch){
      // build a circle
      var bboxgjson = buildRadius(feature,settings.searchradius);
      bboxgjson.layer = "checkdata";
    } else {
      // build a box
      var bboxgjson = buildGjsonBox(feature,settings.searchradius);
      bboxgjson.layer = "checkdata";
    };
    gjsonToMap(bboxgjson); //this function must be present externally
  };

  // transforms a FeatureCollecton to an array of geoJSON objects
  function input2array(geojsondata){
    // check if geojsondata is a FeatureCollection
    if (geojsondata.type == "FeatureCollection") {
      //console.log("mod_m_simple: detected FeatureCollection");
      return(geojsondata.features);
    } else if (geojsondata.type == "Feature") {
      //console.log("mod_m_simple: detected Feature");
      // if there is only one geoJSON feature, return it as an array
      var gtype = geojsondata.geometry.type;
      if (gtype == "Point" || gtype == "Polygon" || gtype == "LineString") {
        return( [geojsondata] );
      } else {
        //console.log("mod_m_simple: detected unsupported Type: " + gtype);
        // non of the above, nothing to do
        return([]);
      };
    } else {
      console.log("mod_m_simple: detected unsupported Type: " + geojsondata.type);
      return([]);
    };
  };

  // builds a geoJSON polygon describing a box around a point
  function buildGjsonBox(point,extent){
    cPoint = point.geometry.coordinates;
    if(point.geometry.type == "LineString"){
      var gjsonBox = {type : "Feature",
                      geometry : { type : "Polygon", coordinates : [[]] }
                      };
      
      var allx = [];
      var ally = [];
      for(var i=0;i<cPoint.length;i++){
        allx.push(cPoint[i][0]);
        ally.push(cPoint[i][1]);
      };
      var top = getMax(ally) + extent;
      var bottom = getMin(ally) - extent;
      var left = getMin(allx) - extent;
      var right = getMax(allx) + extent;
      
    } else if(point.geometry.type == "Point"){
      var top = cPoint[1] + extent;
      var bottom = cPoint[1] - extent;
      var left = cPoint[0] - extent;
      var right = cPoint[0] + extent;
    } else {
      console.log("Unsupported geometry type: " + point.geometry.type);
      var top = 0;
      var bottom = 0;
      var left = 0;
      var right = 0;
    };
    var gjsonBox = {type : "Feature",
                geometry : { type : "Polygon", coordinates : [[ [left,bottom],
                                                                [right,bottom],
                                                                [right,top],
                                                                [left,top],
                                                                [left,bottom] 
                                                             ]] }
                };
    return(gjsonBox);
    
  };

  // builds a geoJSON polygon describing a circle around a point
  function buildRadius(point,extent){
    // a radius search makes only sense when the element is a single point
    // this function is solely for generating a visual representation
    if (point.geometry.type == "Point"){
      var x = point.geometry.coordinates[0];
      var y = point.geometry.coordinates[1];
      var circleElement = {type : "Feature",
                           geometry : { type : "Polygon", coordinates : [[]]}
                           };
                           
      // loop until the circle is complete
      for (var i=0;i<=15;i++){
        var circlePosition = (i * 22.5) * Math.PI / 180;
        var singleCoord = [];
        singleCoord.push(x+extent*Math.cos(circlePosition));
        singleCoord.push(y+extent*Math.sin(circlePosition));
        circleElement.geometry.coordinates[0].push(singleCoord);
      };
      // the first coodinate needs to be the last for the polygon to be valid
      var singleCoord = [];
      singleCoord.push(x+extent*Math.cos(0));
      singleCoord.push(y+extent*Math.sin(0));
      circleElement.geometry.coordinates[0].push(singleCoord);
      return(circleElement);
    } else {
      // if the geometry is no point, use the default bounding box
      return( buildGjsonBox(point,extent) );
    };
  };
  
  // get the smallest entry of an array
  function getMin(inarray){
    var outvalue = inarray[0];
    for(var i=0;i<inarray.length;i++){
      if(outvalue > inarray[i]){outvalue = inarray[i]};
    }
    return(outvalue);
  };

  // get the biggest entry of an array
  function getMax(inarray){
    var outvalue = inarray[0];
    for(var i=0;i<inarray.length;i++){
      if(outvalue < inarray[i]){outvalue = inarray[i]};
    }
    return(outvalue);
  };
  
})();
