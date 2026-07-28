
(function(){
  const el=document.getElementById('fmClock');
  if(!el) return;
  const update=()=>{
    const now=new Date();
    el.textContent=now.toLocaleDateString('en-GB',{
      weekday:'short',day:'2-digit',month:'short'
    })+' • '+now.toLocaleTimeString('en-GB',{
      hour:'2-digit',minute:'2-digit'
    });
  };
  update();
  setInterval(update,30000);
})();
