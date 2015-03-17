// initialize the map view and initialize the OSM background tiles
function initOpenLayers(){
  WGS = new OpenLayers.Projection("EPSG:4326");   // Transform from WGS 1984
  // OSM = new OpenLayers.Projection("EPSG:3857"); // to Spherical Mercator Projection
  OSM = new OpenLayers.Projection("EPSG:900913"); // to Spherical Mercator Projection
  geojsonFormat = new OpenLayers.Format.GeoJSON({ 'externalProjection': WGS, 'internalProjection': OSM});
  geojsonFormatNoProj = new OpenLayers.Format.GeoJSON();

  function syncLayers(event){
    //previewLayer.setVisibility( previewLayerPoint.getVisibility() );
  };

  function removeUnencoded(message){
    message = JSON.parse(JSON.stringify(message).replace("�",""));
    return(message);
  };
  
  function onFeatureSelectm(feature) {
    var popupContent = "";
    for(entry in feature.attributes){
      popupContent += "</br><i>"+entry+":</i>"+feature.attributes[entry];
    };
    var popup = new OpenLayers.Popup.FramedCloud("chicken",
      feature.geometry.getBounds().getCenterLonLat(),
      null,
      "<div style='font-size:.8em'><b>Kein Fund in OSM</b>: " +popupContent+"</div>",
      null, true, null
    );
    feature.popup = popup;
    map.addPopup(popup);
  };
  function onFeatureUnselectm(feature) {
    map.removePopup(feature.popup);
    feature.popup.destroy();
    feature.popup = null;
  };
  
  function onFeatureSelecth(feature) {
    var popup = new OpenLayers.Popup.FramedCloud("chicken",
      feature.geometry.getBounds().getCenterLonLat(),
      null,
      "<div style='font-size:.8em'><b>Fund in OSM</b>: " + JSON.stringify(feature.attributes)+"</div>",
      null, true, null
    );
    feature.popup = popup;
    map.addPopup(popup);
  };
  function onFeatureUnselecth(feature) {
    map.removePopup(feature.popup);
    feature.popup.destroy();
    feature.popup = null;
  };
  

  function onFeatureSelectp1(feature) {
    var poptext = "<div style='font-size:.8em'>";
    for(var cindex in feature.cluster){
      var clusterentry = feature.cluster[cindex];
      var singlepoptext = "";
      for(centry in clusterentry.attributes){
        singlepoptext += "</br><i>"+centry+":</i>"+clusterentry.attributes[centry];
      };
      poptext += "<b>OGD Info</b>" + singlepoptext + "</br></br>";
    };
    var popup = new OpenLayers.Popup.FramedCloud("chicken",
      feature.geometry.getBounds().getCenterLonLat(),
      null,
      poptext+"</div>",
      null, true, null
    );
    feature.popup = popup;
    map.addPopup(popup);
  };
  function onFeatureUnselectp1(feature) {
    map.removePopup(feature.popup);
    feature.popup.destroy();
    feature.popup = null;
  };
  function onFeatureSelectp2(feature) {
    var popupContent = "";
    for(entry in feature.attributes){
      popupContent += "</br><i>"+entry+":</i>"+feature.attributes[entry];
    };
    var popup = new OpenLayers.Popup.FramedCloud("chicken",
      feature.geometry.getBounds().getCenterLonLat(),
      null,
      "<div style='font-size:.8em'><b>OGD Info</b>: " +popupContent+"</div>",
      null, true, null
    );
    feature.popup = popup;
    map.addPopup(popup);
  };
  function onFeatureUnselectp2(feature) {
    map.removePopup(feature.popup);
    feature.popup.destroy();
    feature.popup = null;
  };
  
  map = new OpenLayers.Map("map",{
      eventListeners: {
        "changelayer": syncLayers
      }
    });
  
  var backlayer = new OpenLayers.Layer.OSM("OSM Background");
  backlayer.setOpacity(0.8);
  map.addLayer(backlayer);

  clusterStrategy = [new OpenLayers.Strategy.Cluster()];
  
  var hitStyleMap = new OpenLayers.StyleMap({ 'pointRadius': 4, 'fillColor': 'red', 'strokeWidth' : 0.3 });
  var missStyleMap = new OpenLayers.StyleMap({ 'pointRadius': 4, 'fillColor': 'blue', 'strokeWidth' : 0.3 });
  var otherStyleMap = new OpenLayers.StyleMap({ 'pointRadius': 4, 'fillColor': 'yellow', 'fillOpacity': 1, 'strokeColor' : 'black', 'strokeWidth' : 1 });
  var checkdataStyleMap = new OpenLayers.StyleMap({ 'pointRadius': 4, 'fillOpacity': 0, 'strokeColor' : 'black', 'strokeWidth' : 0.3 });
  var compStyleMap = new OpenLayers.StyleMap({ 'pointRadius': 4, 'fillColor': 'black', 'fillOpacity': 0.8, 'strokeColor' : 'black', 'strokeWidth' : 1 });
  var previewStyleMap = new OpenLayers.StyleMap({ 'pointRadius': 4, 'fillColor': 'yellow', 'strokeWidth' : 1.7, 'fillOpacity': 0.5, 'strokeColor': 'black' });
  
  var clusterStyle = new OpenLayers.Style({
      pointRadius: "${radius}",
      fillColor: "yellow",
      fillOpacity: 0.5,
      strokeColor: "black",
      //strokeWidth: "${width}",
      strokeOpacity: 0.8
    }, {
      context: {
        width: function(feature) {
          //return (feature.cluster) ? 2 : 1;
          return 1;
        },
        radius: function(feature) {
          var pix = 2;
          if(feature.cluster) {
              //pix = Math.min(feature.attributes.count, 7) + 2;
              pix = (Math.min(feature.attributes.count, 3)) *3.5;
          }
          return pix;
        }
      }
    });
  
  var clusterStyleMap = new OpenLayers.StyleMap(clusterStyle);

  otherLayer = new OpenLayers.Layer.Vector("Other",{styleMap: otherStyleMap, displayInLayerSwitcher:false});
  checkdataLayer = new OpenLayers.Layer.Vector("Match-Internals",{styleMap: checkdataStyleMap,visibility: false});
  compLayer = new OpenLayers.Layer.Vector("(OSM Matches)",{styleMap: compStyleMap,visibility: false});
  hitLayer = new OpenLayers.Layer.Vector("(Match)",{styleMap: hitStyleMap, projection: "EPSG:4326"});
  missLayer = new OpenLayers.Layer.Vector("(Kein Match)",{styleMap: missStyleMap});
  previewLayerPoint = new OpenLayers.Layer.Vector("Orig. OGD Datensatz",{displayInLayerSwitcher:false, styleMap: clusterStyleMap, strategies: clusterStrategy, attribution: "Datenquelle: Stadt Wien - data.wien.gv.at"});
  previewLayer = new OpenLayers.Layer.Vector("Orig. OGD Datensatz (p)",{styleMap: previewStyleMap, attribution: "OGD Vienna", displayInLayerSwitcher:false});
  //previewLayer = new OpenLayers.Layer.Vector("Preview",{styleMap: previewStyleMap, displayInLayerSwitcher:false});
  map.addLayer(hitLayer);
  map.addLayer(missLayer);
  map.addLayer(checkdataLayer);
  map.addLayer(compLayer);
  map.addLayer(otherLayer);
  map.addLayer(previewLayer);
  map.addLayer(previewLayerPoint);
  
  map.addControl(new OpenLayers.Control.LayerSwitcher({'ascending':false}));
  map.setCenter(new OpenLayers.LonLat(16.348, 48.208).transform( WGS, OSM),12);
  
  var selectControlm = new OpenLayers.Control.SelectFeature(missLayer,
    {onSelect: onFeatureSelectm, onUnselect: onFeatureUnselectm}
  );
  var selectControlh = new OpenLayers.Control.SelectFeature(hitLayer,
    {onSelect: onFeatureSelecth, onUnselect: onFeatureUnselecth}
  );
  var selectControlp1 = new OpenLayers.Control.SelectFeature(previewLayerPoint,
    {onSelect: onFeatureSelectp1, onUnselect: onFeatureUnselectp1}
  );
  var selectControlp2 = new OpenLayers.Control.SelectFeature(previewLayer,
    {onSelect: onFeatureSelectp2, onUnselect: onFeatureUnselectp2}
  );
  //previewLayer.events.on({"featureselected": onFeatureSelectp});
  //previewLayerPoint.events.on({"featureselected": onFeatureSelectp});
  
  map.addControl(selectControlm);
  map.addControl(selectControlh);
  map.addControl(selectControlp1);
  map.addControl(selectControlp2);
  selectControlm.activate();
  selectControlh.activate();
  selectControlp1.activate();
  selectControlp2.activate();
};

function requestOgdLayer(ogdLayerName){
  //testdata = mod_ogd.getLayer(ogdLayerName);
  
  mod_m_simple2.stop();
  $("#infobar_text").html('<img src="ajax-loader.gif" alt="loading image">&nbsp;&nbsp;lade Daten vom OGD Vienna Server ...');
  hitLayer.setVisibility(false);
  missLayer.setVisibility(false);
  compLayer.setVisibility(false);
  checkdataLayer.setVisibility(false);
  
  $.get("http://"+document.location.host+"/_ogdviennacap?version=1.1.0&service=WFS&request=GetFeature&srsName=EPSG:4326&typeName="+ogdLayerName+"&outputFormat=json",
    function(data){
      //data = removeUnencoded(data);
      //alert("got data");
      testdatatype = data.features[0].geometry.type;
      if(testdatatype == "Point"){
        data.layer = "previewp";
      }else{
        data.layer = "preview";
      };
      clearPreviewLayers();
      testdata = data;
      gjsonToMap(testdata);
      // var infotext = "OSM Datenbank vom: <b>"+osmdate+"</b>&nbsp;&nbsp;OGD Datensatz: <b>"+ogdLayerName.split(':')[1]+"&nbsp; </b>Type: <b>"+testdatatype+" &nbsp;</b>Anzahl Features: <b>"+ testdata.features.length+"</b>&nbsp;&nbsp;";
      var infotext = "OGD Datensatz: <b>"+ogdLayerName.split(':')[1]+"&nbsp; </b>Type: <b>"+testdatatype+" &nbsp;</b>Anzahl Features: <b>"+ testdata.features.length+"</b>&nbsp;&nbsp;";
      if(testdatatype == "Point"){
        previewLayer.setVisibility( false );
        previewLayerPoint.setVisibility( true );
        var buttontext = "   <button onclick='$(\"#dialog_matchproperties\").dialog(\"open\");' >Starte Match</button>";
        $("button").button();
        $("#infobar_text").html(infotext+buttontext);
      } else {
        previewLayer.setVisibility( true );
        previewLayerPoint.setVisibility( false );
        var buttontext = " <i>Matching is only possible for 'Point' type.</i>";
        $("#infobar_text").html(infotext+buttontext);
        $("#processmonitor").hide();
      };
    }
  );
};

function clearPreviewLayers(){
  $("#processmonitor").hide();
  previewLayer.setVisibility( true );
  previewLayer.removeAllFeatures();
  previewLayerPoint.setVisibility( true );
  previewLayerPoint.removeAllFeatures();
  clusterStrategy[0].features = [];
  hitLayer.removeAllFeatures();
  missLayer.removeAllFeatures();
  compLayer.removeAllFeatures();
  checkdataLayer.removeAllFeatures();
};

// sort the incoming GeoJSON by its layer-field and display in on the map
function gjsonToMap(gjson){
  if (gjson.layer == "hit") {
    hitLayer.addFeatures(geojsonFormat.read(gjson));
  } else if (gjson.layer == "miss"){
    missLayer.addFeatures(geojsonFormat.read(gjson));
  } else if (gjson.layer == "checkdata"){
    checkdataLayer.addFeatures(geojsonFormat.read(gjson));
  } else if (gjson.layer == "compdata"){
    compLayer.addFeatures(geojsonFormat.read(gjson));
  } else if (gjson.layer == "preview"){
    previewLayer.addFeatures(geojsonFormat.read(gjson))
  } else if (gjson.layer == "previewp"){
    previewLayerPoint.addFeatures(geojsonFormat.read(gjson))
  } else {
    otherLayer.addFeatures(geojsonFormat.read(gjson));
  };
};

