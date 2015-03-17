var mod_ogd = (function() {
  return{
    getLayerList: function(){
      var ajaxObject = createAJAX();
      var query = "http://"+document.location.host+"/_ogdviennacap?version=1.1.0&service=WFS&request=GetCapabilities";
      ajaxObject.open("GET", query, false);
      ajaxObject.send(null);
      var response = ajaxObject.responseXML;
      delete ajaxObject;
      var data = xml2json(response);
      data = JSON.parse( data.replace("undefined","") );
      data = data["wfs:WFS_Capabilities"].FeatureTypeList.FeatureType;
      return(data);
    },
    getLayer: function(layername){
      var ajaxObject = createAJAX();
      var query = "http://"+document.location.host+"/_ogdviennacap?version=1.1.0&service=WFS&request=GetFeature&srsName=EPSG:4326&typeName="+layername+"&outputFormat=json";
      ajaxObject.open("GET", query, false);
      ajaxObject.send(null);
      var response = ajaxObject.responseText;
      var data = JSON.parse(response);
      delete ajaxObject;
      return(data);
    },
    
  }; //return
  
  // creates an AJAX object
  function createAJAX() {
    return new XMLHttpRequest();
  }

})();
