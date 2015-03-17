function(doc){
  if(doc.type == 'Feature'){
    if(doc.geometry.type == 'Point' || doc.geometry.type == 'LineString'){
      emit(doc.geometry,doc);
    };
  };
};
