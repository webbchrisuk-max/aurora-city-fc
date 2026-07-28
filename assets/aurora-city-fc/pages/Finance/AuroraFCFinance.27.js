
(()=>{
  const app=document.querySelector('.m13-app');
  const refresh=document.getElementById('financeSidebarRefresh');
  const financeFolder=document.querySelector('.aurora-finance-folder');
  const forceOpen=()=>{app?.classList.remove('m13-sidebar-collapsed');if(financeFolder)financeFolder.open=true;};
  forceOpen();
  window.addEventListener('load',()=>setTimeout(forceOpen,20));
  window.addEventListener('resize',forceOpen);
  refresh?.addEventListener('click',()=>document.getElementById('m13Refresh')?.click());
  document.querySelectorAll('#m13Nav button').forEach(button=>button.addEventListener('click',()=>{if(financeFolder)financeFolder.open=true;}));
})();
