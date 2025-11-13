window.UI = {
  toast(msg,type){
    const colors={success:'bg-emerald-600',danger:'bg-red-600',warning:'bg-amber-600',info:'bg-blue-600'};
    const el=document.createElement('div');
    el.className=`fixed inset-x-0 bottom-6 z-50 flex justify-center px-4`;
    el.innerHTML=`<div class='rounded-xl text-white px-4 py-3 shadow-lg ${colors[type]||'bg-neutral-900'}'>${msg}</div>`;
    document.body.appendChild(el); setTimeout(()=>el.remove(),2000);
  }
};