// global variables (settings)
var appname = "ogdmatcher";
var databasename = getDbNameFromLocation();
var WGS, OSM;
var testdata;
var testdatatype;
var osmdate = "calculating ...";
var map;

$(function() {
  initJQueryUi();
  initOpenLayers();
  initOgdLayers();
  // too slow // initOSMdb();
});

// calculates the newest entry in the OSM database to determine its age
function initOSMdb(){
  $.couch.db(databasename).view(appname+"/date",{
    success: function(data){
      var maxval = 0;
      for(index in data.rows){
        if(maxval < data.rows[index].key){
          maxval = data.rows[index].key;
        };
      };
      osmdate = maxval.substr(6,2)+"."+maxval.substr(4,2)+"."+maxval.substr(0,4);
    },
    reduce: false
  });
};

// initialize bindings for jQuery UI objects and define parameters for modal dialogues
function initJQueryUi(){
  //$("#accordion").accordion({autoHeight:false});
  $("#accordion").accordion({autoHeight:true, heightStyle: "fill"});
  $(".tabs").tabs();
  $("button").button();
  $(".radios").buttonset();
  //$("#radio_ogddata").buttonset();

  //make the map follow the scroll
  var el=$('#tabs-tab');
  var elpos=el.offset().top;
  $(window).scroll(function () {
    var y=$(this).scrollTop();
    if(y<elpos){el.stop().animate({'top':0},500);}
    else{el.stop().animate({'top':y-elpos},500);}
  });
  
  function setSize(){
    /*
    $("#content").css("height",window.innerHeight-40);
    $("#tabs-tab").css("height",window.innerHeight-80);
    $("#map-tab").css("height",window.innerHeight-100);
    $("#info-tab").css("height",window.innerHeight-100);
    $("#map").css("height",window.innerHeight-220);
    */
    $("#content").css("height", $(window).height()-40);
    $("#tabs-tab").css("height",$(window).height()-80);
    $("#map-tab").css("height",$(window).height()-100);
    $("#info-tab").css("height",$(window).height()-100);
    $("#map").css("height",$(window).height()-220);
  };
  setSize();
  $(window).resize(function(){
    setSize();
  });
  
  //define dialogs
  $("#dialog_matchproperties").dialog({
    autoOpen: false,
    modal: true,
    width: 600,
    height: 250,
    buttons: {
      "Starte Match": function(){
        startMatch();
        $(this).dialog("close");
      },
      "Cancel": function(){
        $(this).dialog("close");
      }
    }
  });
  $("#dialog_welcome").dialog({
    autoOpen: false,
    modal: true,
    width: 600,
    height: 350,
    buttons: {
      "Close": function(){
        $(this).dialog("close");
      }
    }
  });
  
  messageForIE();
};



// load all available OGD Layers - this version converts the xml to json before processing
function initOgdLayers(){
  
  $.get("http://"+document.location.host+"/_ogdviennacap?version=1.1.0&service=WFS&request=GetCapabilities",
    {timeout:5000, tryCount:0, retryLimit: 5},
    function(data){
      var data = xml2json(data);
      data = JSON.parse( data.replace("undefined","") );
      var ogdlayers = data["wfs:WFS_Capabilities"].FeatureTypeList.FeatureType;
      
      var outhtml = "<ul id='menu_od' >";
      for(i in ogdlayers){
        var ogdlayer = ogdlayers[i];
        if(ogdlayer.Name != "ogdwien:GELAENDEOGD"){
          var onclickcommand = "requestOgdLayer('"+ogdlayer.Name+"');";
          outhtml += '<li><a id="' + ogdlayer.Name + '" onclick=\"' + onclickcommand + '\")">'+ogdlayer.Title+'</a></li>';
        };
      };
      outhtml += "</ul>";
      $("#radio_ogddata").html(outhtml);
      $( "#menu_od" ).menu();
    }
  );
  
};



/*
// load all available OGD Layers - this version reads the xml directly
function initOgdLayers(){
  
  $.get("http://"+document.location.host+"/_ogdviennacap?version=1.1.0&service=WFS&request=GetCapabilities",
    {timeout:5000, tryCount:0, retryLimit: 5},
    function(data){
      //console.log(data);
      var ogdlayers = (data.getElementsByTagName("FeatureType"));
      var outhtml = "<ul id='menu_od' >";
      //console.log(ogdlayers.item());
      
      for(var i = 0; i < ogdlayers.length; i++){
        var ogdlayer = ogdlayers[i];
        var ogdlayerattribs = ogdlayer.childNodes;
        for(var j = 0; j < ogdlayerattribs.length; j++){
          var ogdlayerTitle = ogdlayerattribs[0].textContent;
          var ogdlayerName = ogdlayerattribs[1].textContent;
          
          console.log(ogdlayerTitle);
          console.log(ogdlayerName);
        };
      };
    }
  );
};
*/




function checkFinished(results){
  console.log(results);
};

function updateStatus(data){
  //$('#processmonitor_title').html(data.title);
  if(data.status.length > 3) {
      $('#processmonitor_process').html(data.status);
      $("#processmonitor_process_bar").progressbar({value: 0});
      $("#processmonitor_process_bar").hide();
  }else{
      $('#processmonitor_process').html(data.status + "%");
      $("#processmonitor_process_bar").progressbar({value: data.status});
      $("#processmonitor_process_bar").show();
  };
};

function startMatch(){
  var settings = { connectionstring: "http://"+document.location.host+"/"+databasename+"/_design/"+appname+"/_spatial/simple",
                    searchradius: parseFloat($("#input_radius").val()),
                    radiussearch: false,
                    filter: [$("#input_key").val(),$("#input_value").val()]};
  console.log(settings);
  //var checkarray = buildGjsonFeatureCollection(compLayer.features);
  clearPreviewLayers();
  hitLayer.removeAllFeatures();
  missLayer.removeAllFeatures();
  checkdataLayer.removeAllFeatures();
  compLayer.removeAllFeatures();
  hitLayer.setVisibility(true);
  missLayer.setVisibility(true);
  previewLayerPoint.setVisibility(false);
  previewLayer.setVisibility(false);
  $("#processmonitor").show();
  mod_m_simple2.start(testdata,settings);
};

// this function only works as long as location.pathname contains the name of the database
function getDbNameFromLocation(){
  var databasename = location.pathname.split("/")[1];
  return(databasename);
};


/*
function buildGjsonFeatureCollection(features){
  var gjsonfeatures = [];
  for(var i=0;i<features.length;i++){
    var singlefeature = {type:"Feature",geometry:{type:"Point",coordinates:[]},properties:""};
    var centroid = features[i].geometry.getCentroid();
    var coord = centroid.transform(OSM,WGS);
    //var coord = features[i].geometry;
    singlefeature.geometry.coordinates = [coord.x,coord.y];
    singlefeature.properties = features[i].attributes;
    gjsonfeatures.push(singlefeature);
  };
  return ( { type:"FeatureCollection", features: gjsonfeatures } );
};
*/

function messageForIE(){
  var browserName=navigator.appName; 
  if (browserName=="Microsoft Internet Explorer")
   { alert("Diese Anwendung ist unter Microsoft Internet Explorer sehr träge. Eine schnellere Alternative sind zum Beispiel die Web Browser Mozilla Firefox oder Google Crome."); };
  
};
