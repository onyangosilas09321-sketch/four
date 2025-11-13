module.exports.rangeFromPreset = function(preset){
  const now = new Date();
  let from = null; let to = null;
  if(preset==='today'){
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    to = new Date(from.getTime()+86400000);
  } else if(preset==='week'){
    from = new Date(now.getTime()-7*86400000);
  } else if(preset==='month'){
    from = new Date(now.getTime()-30*86400000);
  }
  return {from,to};
}

module.exports.sumByDate = function(list, day, field){
  const d0 = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const d1 = new Date(d0.getTime()+86400000);
  return list.filter(o=>{
    const ts = o.get('timestamp') || o.createdAt;
    return ts>=d0 && ts<d1;
  }).reduce((s,o)=> s + (o.get(field)||0), 0);
}
