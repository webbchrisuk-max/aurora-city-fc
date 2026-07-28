
/* ===================== M14 VIEW CONTROLLER ===================== */
const M14_VIEWS = {
  m13PaydayPlan:{
    title:"Payday Plan",
    subtitle:"Protect bills, reconcile the current account and complete every transfer once.",
    headings:[
      "Payday Mission Control"
    ]
  },
  m13Bills:{
    title:"Bills & Spending",
    subtitle:"Manage scheduled payments, actual spending, future costs and recurring commitments.",
    headings:[
      "Next 7 Days Bills","Bills Control Centre","Editable Future Costs",
      "Editable Yearly Recurring Costs","Editable Recurring Monthly Costs"
    ]
  },
  m13PotHealth:{
    title:"Pot Health",
    subtitle:"Review every savings pot, its priority, funding gap and the money genuinely protected.",
    headings:[
      "Pot Control Panel","Pot Health Radar","Grow Pot Engine","True Surplus Split"
    ]
  },
  m13HouseProject:{
    title:"House Project",
    subtitle:"Control renovation costs room by room, compare estimates with actual payments and update the House Pot.",
    headings:[
      "House Project Ledger"
    ]
  },
  m13Funding:{
    title:"Funding Engine",
    subtitle:"See how surplus money is routed and how your longer-term financial flight path changes.",
    headings:[
      "Aurora CFO Command Deck","Aurora Wealth Intelligence","Financial Freedom Flight Path",
      "Funding Engine"
    ]
  },
  m13History:{
    title:"History",
    subtitle:"Review category totals, yearly breakdowns and your saved Holding Pot movement.",
    headings:[
      "Category Breakdown","Yearly Breakdown"
    ]
  }
};
function m14AllPlannerSections(){
  return [...document.querySelectorAll("#m14WorkingPlanner .section")];
}
function m14Heading(section){
  return (section.querySelector("h2, .m15-hero h3, .m22-hero h3")?.textContent||"").trim();
}
function m14ShowDashboard(){
  document.getElementById("m13Dashboard").style.display="";
  document.getElementById("m14WorkingPlanner")?.classList.remove("view-active");
  document.getElementById("m14ViewHeader")?.classList.remove("active");
  m14AllPlannerSections().forEach(s=>s.classList.remove("m14-visible"));
  document.querySelectorAll("#m13Nav button").forEach(b=>b.classList.toggle("active",b.dataset.target==="m13Dashboard"));
  window.scrollTo({top:0,behavior:"smooth"});
}
function m14ShowView(target){
  const config=M14_VIEWS[target];
  if(!config){m14ShowDashboard();return}
  document.getElementById("m13Dashboard").style.display="none";
  document.getElementById("m14WorkingPlanner")?.classList.add("view-active");
  document.getElementById("m14ViewHeader")?.classList.add("active");
  document.getElementById("m14ViewTitle").textContent=config.title;
  document.getElementById("m14ViewSubtitle").textContent=config.subtitle;
  let count=0;
  m14AllPlannerSections().forEach(section=>{
    const visible=config.headings.includes(m14Heading(section));
    section.classList.toggle("m14-visible",visible);
    if(visible)count++;
  });
  let empty=document.getElementById("m14Empty");
  if(!count){
    if(!empty){
      empty=document.createElement("div");empty.id="m14Empty";empty.className="m14-empty";
      document.getElementById("m14WorkingPlanner").prepend(empty);
    }
    empty.textContent="No working sections were found for this view.";
    empty.style.display="";
  }else if(empty){empty.style.display="none"}
  document.querySelectorAll("#m13Nav button").forEach(b=>b.classList.toggle("active",b.dataset.target===target));
  window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll("#m13Nav button").forEach(btn=>{
  const fresh=btn.cloneNode(true);
  btn.parentNode.replaceChild(fresh,btn);
  fresh.addEventListener("click",()=>{
    fresh.dataset.target==="m13Dashboard"?m14ShowDashboard():m14ShowView(fresh.dataset.target);
  });
});
document.getElementById("m14BackDashboard")?.addEventListener("click",m14ShowDashboard);
