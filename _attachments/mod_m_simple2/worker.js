/* This file is part of the master-thesis
 * "A Web-Based System for Comparative Analysis of OpenStreetMap
 * Data by the use of CouchDB" by Markus Mayr.
 * 
 * This is the WebWorker that performs the actual check for location
 * 
 * 
 * REQUIREMENTS:
 * - corresponding "mod_m_simple.js"
 *
 * MODULE INTERFACE:
 * - { command: "start", content: [ARRAY OF GeoJSON], connection: [URI to spatial view], checksettings: [settings-object] }
 * - { command: "stop" }
 * - { command: "status" }
 * 
 */

var statuslen = 0;
var checkelement;
var finalcheckhit = [];
var finalcheckmiss = [];
var finalcheckhit_c = [];
var alreadymatched_ids = [];

// if the worker receives a message from the parent web-application
onmessage = function(message){
  consolelog(" ---  init the mod_m_simple WebWorker");

  if (message.data.command == "start") {
    var checklen = message.data.content.length;
    var connectionstring = message.data.connection;
    var checkarray = message.data.content;
    var checksettings = message.data.checksettings;
    var filter = checksettings.filter;
    
    // iterate over all elements and perform check
    doiterate = 1;
    alreadymatched_ids = [];
    for (var i=0;i<checklen;i++){
      statuslen = i;
      checkelement = checkarray[i];
      
      // for every 1-percent-change post a status update
      if ( (Math.floor(100/checklen*statuslen)) % 1 == 0) {
        postStatus(Math.floor(100/checklen*statuslen));
      }

      
      // generate the query that has to be performed
      var sradius = checksettings.searchradius;

      
      var query = generateQuery(checkelement,connectionstring,sradius);
      // execute the query and gather its results
      var resultlist = doQuery(query).rows;
      if(resultlist == undefined){consolelog("error in the query: "+query);continue;};
      
      //resultlist = makePointType(resultlist);
      // clean the resultlist from elements that were already matched
      resultlist = removeAlreadyChecked(resultlist,alreadymatched_ids);
      resultlist = filterByFilter(resultlist,filter);
      
      // evaluate the results
      if (resultlist.length > 0){
        var result = postProcess(checkelement, resultlist,filter);
        checkelement.checkdistance = result.properties.checkdistance;

        
        // if specified, do a radius search
        if(checksettings.radiussearch == true &&
              checkelement.geometry.type == "Point" &&
              checkelement.checkdistance > checksettings.searchradius){
          consolelog("IN BBOX BUT NOT IN RADIUS: "+checkelement._id);
          checkelement.layer = "miss";
          finalcheckmiss.push(checkelement);
          pushToMap(checkelement);
          continue;
        };

        checkelement.layer = "hit";
        checkelement.partnerId = result._id;
        result.partnerId = checkelement._id;
        result.checkdistance = checkelement.checkdistance;
        result.layer = "hitc";
        alreadymatched_ids.push(result._id);
        finalcheckhit_c.push(result);
        pushToMap(checkelement);
        finalcheckhit.push(checkelement);
        // next the line connecting the matching-pair is drawn
        if(result.geometry.type == "Point"){
          var linefeat = getEmptyGeoJSON("LineString");
          linefeat.geometry.coordinates = [checkelement.geometry.coordinates,
                                           result.geometry.coordinates];
        } else {
          var linefeat = getEmptyGeoJSON("LineString");
          linefeat.geometry.coordinates = [checkelement.geometry.coordinates,
                                            result.geometry.coordinates[0]];
        };
        pushToMap( linefeat );
        result.layer = "compdata";
        pushToMap(result);
        
      } else {
        // when there is no result, the check is a MISS
        checkelement.layer = "miss";
        finalcheckmiss.push(checkelement);
        pushToMap(checkelement);
      }
    }; //loop over checkarray
    doiterate = 0;
    postMessage({command: "finished",
                 content: { hit: finalcheckhit,
                            miss: finalcheckmiss,
                            hitc: finalcheckhit_c,                           }
                });
    self.close();
    
  } else if (message.data.command == "stop") {
    consolelog("got command to stop worker");
    self.close();
    
  } else if (message.data.command == "status") {
    postStatus(Math.floor(100/checklen*statuslen));
  };

  // elements with their id in a list are removed from the 'resultlist'
  function removeAlreadyChecked(resultlist,alreadymatchedlist){
    var newresultlist = [];
    for(var i=0;i<resultlist.length;i++){
      var singleresult = resultlist[i];
      if(alreadymatchedlist.indexOf(singleresult.id) > -1){
        // this entry has already been checked
      }else{
        // this entry has not yet been checked
        newresultlist.push(singleresult);
      };
    };
    return(newresultlist);
  };

  // creates an empty geoJSON document
  function getEmptyGeoJSON(geojsonType){
    var geoJSON = {type: "Feature",
                   layer: "checkdata",
                   geometry : { type: "LineString",
                                coordinates: []
                              }
                  };
    geoJSON.geometry.type = geojsonType;
    return(geoJSON);
  };

  // sends a geoJSON to the map
  function pushToMap(element){
    postMessage( {command : "addToMap", content : element} );
  };

  // a debugging function for output to the console
  function consolelog(infos) {
    postMessage( {"command" : "info", content : infos} );
  }

  // for status-updates
  function postStatus(stat) {
      postMessage( {command : "status", content : stat} );
  }

  // create a http-query for a couchdb-boundingbox request
  function generateQuery(element,connectionstring,searchradius) {
    var bbox = buildBbox(element, searchradius);
    var query = connectionstring + "?bbox=" + bbox;
    return(query);
  }

  // create a bounding-box of a certain extent around a geoJSON-feature
  function buildBbox(element,extent){
    // "element" is GeoJSON
    // return is an array of coordinates
    var top,bottom,left,right;
    var ecoord = element.geometry.coordinates;
    
    if (element.geometry.type == "Point"){
      // with a single point, it is simple to create the bounding-box
      top = ecoord[1] + extent;
      bottom = ecoord[1] - extent;
      left = ecoord[0] - extent;
      right = ecoord[0] + extent;
    } else if (element.geometry.type == "LineString" ) {
      // with a linestring, take the most outer values, apply the extent
      // and create the bounding-box with these
      var allx = [];
      var ally = [];
      for(var i=0;i<ecoord.length;i++){
        allx.push(ecoord[i][0]);
        ally.push(ecoord[i][1]);
      };
      top = getMax(ally) + extent;
      bottom = getMin(ally) - extent;
      left = getMin(allx) - extent;
      right = getMax(allx) + extent;
      
    } else {
      consolelog("unsupported type: " + element.geometry.type);
      top = 0;
      bottom = 0;
      left = 0;
      right = 0;
    };
    var bbox = [left , bottom , right , top];
    return(bbox);
  };

  // performs a query AJAX-style and returns JSON
  function doQuery(query) {
    var request = createAJAX();
    request.open("GET", query, false);
    request.send(null);
    var response = request.responseText;
    delete request;
    return( eval("(" + response + ")"));
    // return(request.responseText);
  }

  // creates an AJAX object
  function createAJAX() {
    return new XMLHttpRequest();
  }

  // from multiple results refine and return just one
  function postProcess(checkelement,resultlist) {
    var posresult;
    if(checkelement.geometry.type == "Point"){
      var fromPoint = checkelement.geometry.coordinates;
    } else if (checkelement.geometry.type == "LineString"){
      //var fromPoint = checkelement.geometry.coordinates[0];
      var fromPoint = getCenterPoint(checkelement);
    } else if (checkelement.geometry.type == "Polygon"){
      var fromPoint = checkelement.geometry.coordinates[0][0];
    };
    
    // check every element of the resultlist
    for (var i=0;i<resultlist.length;i++){
      var currentelement = resultlist[i].value;
      // calculate the distance for every element
      var toPoint = currentelement.geometry.coordinates;
      currentelement.properties.checkdistance = calcDistance(fromPoint,toPoint);
      // overwrite the "key-value" entry in the array with just the modified "value"
      resultlist[i] = currentelement;
    };
    // determine the nearest result
    posresult = getMinInObject(resultlist,"checkdistance");
    return(posresult);
  }

  function makePointType(resultlist){
    // remove all non-point results
    var newResultList = [];
    for(ij in resultlist){
      if(resultlist[ij].geometry.type == "Point"){
        //consolelog("Point");
        newResultList.push(resultlist[ij]);
      }else if(resultlist[ij].geometry.type == "LineString"){
        //consolelog("LineString");
        //var tempgeometry = resultlist[ij].geometry.coordinates[0];
        var centerPoint = getCenterPoint(resultlist[ij]);
        resultlist[ij].geometry.type = "Point";
        resultlist[ij].geometry.coordinates = centerPoint;
        newResultList.push(resultlist[ij]);
      }else{
        consolelog(resultlist[ij].geometry.type);
      };
    };
    return(newResultList);
  };


  // removes entries that do not correspond to entries in the filter variable
  function filterByFilter(resultlist,filter){

    var newResultList = [];
    
    var key = filter[0];
    var value = filter[1];
    for(ij in resultlist){
      var entry = resultlist[ij].value.properties.tags;
      if(entry[key]){
        if(value == "*"){
          newResultList.push(resultlist[ij]);
        }else{
          if(entry[key] == value){
            newResultList.push(resultlist[ij]);
          };
        };
      };
    };
    return(newResultList);
  };

  //calculates the average coordinates of an array of points
  function getCenterPoint(element){
    var sumx = 0;
    var sumy = 0;
    for(var i=0;i<element.geometry.coordinates.length;i++){
      sumx += element.geometry.coordinates[i][0];
      sumy += element.geometry.coordinates[i][1];
    };
    var newx = sumx / element.geometry.coordinates.length;
    var newy = sumy / element.geometry.coordinates.length;
    // pushToMap({type:"Feature",geometry:{type:"Point",coordinates:[newx,newy]}});
    return([newx,newy]);
  };

  // get smallest value of array
  function getMin(inarray){
    var outvalue = inarray[0];
    for(var i=0;i<inarray.length;i++){
      if(outvalue > inarray[i]){outvalue = inarray[i]};
    }
    return(outvalue);
  }

  // get biggest value of array
  function getMax(inarray){
    var outvalue = inarray[0];
    for(var i=0;i<inarray.length;i++){
      if(outvalue < inarray[i]){outvalue = inarray[i]};
    }
    return(outvalue);
  }

  // get object of an array with smallest entry in property 'dfield'
  function getMinInObject(inarray,dfield){
    var result = inarray[0];
    for(var i=0;i<inarray.length;i++){
      if (result.properties[dfield] > inarray[i].properties[dfield]){
        result = inarray[i];
      }
    }
    return(result);
  }

  // calculates plain distance between two pairs of coordinates
  function calcDistance(p1,p2){
    // convert to radiants
    lon1 = p1[0] * Math.PI / 180;
    lat1 = p1[1] * Math.PI / 180;
    lon2 = p2[0] * Math.PI / 180;
    lat2 = p2[1] * Math.PI / 180;
    
    var x = (lon2-lon1) * Math.cos((lat1+lat2)/2);
    var y = (lat2-lat1);
    // var R = 6371000; // Radius of the earth in m
    // var d = Math.sqrt(x*x + y*y) * R; // necessary if distance wanted in m
    var d = Math.sqrt(x*x + y*y)
    
    // convert radiants back to degrees
    d = d * 180 / Math.PI;
    return(d);
  }
}; //onMessage
