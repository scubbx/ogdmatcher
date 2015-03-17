function(doc){
  var dat = doc.properties.timestamp.split(/[-T]+/);
  emit(dat[0]+dat[1]+dat[2],1);
};
