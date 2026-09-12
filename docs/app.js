// Published with locally stored Schmerling plan previews for PDF reports.
let data=[],assets={};const missing="לא צוין באתר שמרלינג";
const $=s=>document.querySelector(s),arr=v=>!v?[]:Array.isArray(v)?v:[v];
const dimParts=v=>{const p=String(v||"").trim().split(/[xX×]/).map(x=>x.trim());return p.length===3&&p.every(Boolean)?p:null};
const dim=v=>{const p=dimParts(v);return p?`אורך ${p[0]} מטר · רוחב ${p[1]} מטר · גובה ${p[2]} מטר`:missing};
function dimensions(v){const p=dimParts(v);return p?`<div class="dim" aria-label="אורך ${p[0]} מטר, רוחב ${p[1]} מטר, גובה ${p[2]} מטר"><div><span>אורך</span><b>${p[0]} מטר</b></div><div><span>רוחב</span><b>${p[1]} מטר</b></div><div><span>גובה</span><b>${p[2]} מטר</b></div></div>`:`<div class="dim missing-dim"><b>${missing}</b></div>`}
const num=v=>v&&/^\d[\d,.]*$/.test(String(v).trim())?v:missing;
const modelOf=g=>[g.room65?.model,g.canopy65?.model,g.canopy75?.model].find(v=>v&&/^[A-Z0-9-]+S$/i.test(v))||missing;
const planName=(url,i)=>{const u=decodeURIComponent(url),view=u.includes("מבט-על")?"מבט על":u.includes("חתך")?"חתך":u.includes("מבט-צד")?"מבט צד":`תוכנית ${i+1}`,use=u.includes("למגורים")?"למגורים":u.includes("למסחר")?"למסחר / תעשייה":"";return `${view}${use?` · ${use}`:""}`};
const exhaustNote="אם האגזוז עולה לגג או שקצה האגזוז מרוחק מהגנרטור יותר מ־10 מטר, נדרש להגדיל את קוטר האגזוז.";
function metric(n,v,u="",note=""){return `<div class="metric"><span>${n}</span><b>${v}${v!==missing&&u?` ${u}`:""}</b>${note?`<small>${note}</small>`:""}</div>`}
function planPreview(url){const a=assets[url]||{};return a.preview||a.image||null}
function plans(v,label){if(!v)return `<p>תצורה זו אינה זמינה באתר שמרלינג.</p>`;const p=arr(v.plans).filter(x=>!decodeURIComponent(x).includes("ללא-השתקה"));let html=p.length?p.map((url,i)=>{const preview=planPreview(url);return preview?`<button type="button" class="plan-view" data-plan-src="${preview}" data-plan-title="${planName(url,i)}" onclick="openPlan(this.dataset.planSrc,this.dataset.planTitle)">הצגת ${planName(url,i)}</button>`:""}).join(""):`<span>לא צורפה תוכנית מתאימה באתר שמרלינג</span>`;html+=`<a class="source" href="${v.url}" target="_blank" rel="noopener">מקור רשמי</a><small class="dxf-note">לקבלת קובצי DXF יש לעבור לאתר שמרלינג באמצעות כפתור „מקור רשמי”.</small>`;return `<div class="plans">${html}</div>`}
function drawingLinks(v){if(!v)return[];const seen=new Set;return arr(v.plans).filter(x=>!decodeURIComponent(x).includes("ללא-השתקה")).flatMap((url,i)=>{const path=planPreview(url);return path?[{label:planName(url,i),url:new URL(path,location.href).href}]:[]}).filter(x=>!seen.has(x.url)&&seen.add(x.url))}
window.openPlan=(src,title)=>{window.closePlan();document.body.classList.add("modal-open");const overlay=document.createElement("div");overlay.className="plan-overlay";overlay.innerHTML=`<div class="plan-dialog" role="dialog" aria-modal="true" aria-label="${title}"><div class="plan-toolbar"><h3>${title}</h3><div><button type="button" class="plan-back" onclick="closePlan()">← חזור</button><button type="button" class="plan-close" onclick="closePlan()" aria-label="סגירה">×</button></div></div><div class="plan-stage"><img src="${new URL(src,location.href).href}" alt="${title}"></div></div>`;overlay.addEventListener("click",e=>{if(e.target===overlay)window.closePlan()});document.body.append(overlay)};
window.closePlan=()=>{document.querySelector(".plan-overlay")?.remove();if(!document.querySelector(".share-overlay"))document.body.classList.remove("modal-open")};
document.addEventListener("keydown",e=>{if(e.key==="Escape")window.closePlan()});
function sectionText(g,key){const r=g.room65,a=g.canopy65,b=g.canopy75;const linkText=v=>{const links=drawingLinks(v);return links.length?`\nשרטוטים:\n${links.map(x=>`- ${x.label}: ${x.url}`).join("\n")}`:"\nלא צורפו שרטוטים מתאימים באתר שמרלינג."};if(key==="generator")return `מידות הגנרטור\n${dim(r?.generatorDimensions)}\nמשקל: ${num(r?.generatorWeight)} ק״ג\nקוטר אגזוז: ${num(r?.exhaust)} אינץ׳\nהערה: ${exhaustNote}`;if(key==="room")return `חדר מושתק למגורים\n${dim(r?.roomDimensions)}\nכניסת אוויר: ${num(r?.silencedAirIn)} מ״ר\nיציאת אוויר: ${num(r?.silencedAirOut)} מ״ר${linkText(r)}`;if(key==="canopy65")return `חופה למגורים · 65dB ב־7 מטר\n${dim(a?.dimensions)}\nמשקל כולל: ${num(a?.weight)} ק״ג${linkText(a)}`;return `חופה למסחר / תעשייה · 75dB ב־7 מטר\n${dim(b?.dimensions)}\nמשקל כולל: ${num(b?.weight)} ק״ג${linkText(b)}`}
function summary(g,keys=["generator","room","canopy65","canopy75"]){return `משרד טיקטין חשמל\n${g.kva} KVA\nדגם: ${modelOf(g)}\n\n${keys.map(k=>sectionText(g,k)).join("\n\n")}\n\nמבוסס על נתוני שמרלינג. יש לאמת לפני ביצוע.\nפותח ע״י יובל טיקטין בסיוע AI.`}
const shareChoices=[{key:"generator",label:"פרטי הגנרטור · תמיד נכללים",locked:true},{key:"room",label:"חדר מושתק למגורים"},{key:"canopy65",label:"חופה למגורים · 65dB"},{key:"canopy75",label:"חופה למסחר / תעשייה · 75dB"}];
function selectedShareKeys(){return [...document.querySelectorAll('.share-options input:checked')].map(x=>x.value)}
function updateShareButtons(){const disabled=!selectedShareKeys().length;document.querySelectorAll('.share-submit').forEach(b=>b.disabled=disabled);const hint=document.querySelector('.share-hint');if(hint)hint.textContent=disabled?"יש לבחור לפחות אפשרות אחת.":"ב־PDF יופיעו רק הנתונים והשרטוטים שסומנו."}
window.openShare=k=>{document.querySelector('.share-overlay')?.remove();document.body.classList.add('modal-open');const box=document.createElement('div');box.className='share-overlay';box.innerHTML=`<div class="share-dialog" role="dialog" aria-modal="true" aria-labelledby="share-title"><button class="share-close" onclick="closeShare()" aria-label="סגירה">×</button><h3 id="share-title">מה תרצו להוסיף ל־PDF?</h3><p>פרטי הגנרטור תמיד נכללים. אפשר לבחור אפשרות נוספת אחת או יותר.</p><div class="share-options">${shareChoices.map(x=>`<label class="${x.locked?"locked":""}"><input type="checkbox" value="${x.key}" checked ${x.locked?"disabled":""} onchange="updateShareButtons()"><span>${x.label}</span></label>`).join("")}</div><p class="share-hint">ב־PDF יופיעו רק הנתונים והשרטוטים שסומנו.</p><div class="share-steps"><b>לאחר פתיחת הדוח תוכלו לשמור אותו או לשלוח את קובץ ה־PDF במייל.</b></div><div class="share-actions"><button class="share-submit" onclick="pdfSelected(${k})">פתיחת PDF / שליחה במייל</button><button class="cancel" onclick="closeShare()">ביטול</button></div><small>במכשירים תומכים ה־PDF יצורף ישירות דרך חלון השיתוף. במכשיר שאינו תומך תוצג חלופה ברורה.</small></div>`;box.addEventListener('click',e=>{if(e.target===box)closeShare()});document.body.append(box);box.querySelector('input:not(:disabled)')?.focus()}
window.closeShare=()=>{document.querySelector('.share-overlay')?.remove();document.body.classList.remove('modal-open')};
window.updateShareButtons=updateShareButtons;
window.emailSelected=k=>pdfSelected(k);
function reportDim(v){const p=dimParts(v);return p?`<div class="report-dim"><div><span>אורך</span><b>${p[0]} מטר</b></div><div><span>רוחב</span><b>${p[1]} מטר</b></div><div><span>גובה</span><b>${p[2]} מטר</b></div></div>`:`<div class="report-dim missing-report">${missing}</div>`}
function reportMetric(name,value,unit,note=""){return `<div class="report-metric"><span>${name}</span><b>${value}${value!==missing?` ${unit}`:""}</b>${note?`<small style="display:block;margin-top:4px;color:#8a5a16;font-size:9px;line-height:1.35">${note}</small>`:""}</div>`}
function reportCards(g,keys){const r=g.room65,a=g.canopy65,b=g.canopy75;let html="";if(keys.includes("generator"))html+=`<section class="report-card"><h2>01 · הגנרטור</h2>${reportDim(r?.generatorDimensions)}<div class="report-metrics">${reportMetric("משקל",num(r?.generatorWeight),"ק״ג")}${reportMetric("קוטר אגזוז",num(r?.exhaust),"אינץ׳",exhaustNote)}</div></section>`;if(keys.includes("room"))html+=`<section class="report-card"><h2>02 · חדר מושתק למגורים</h2>${reportDim(r?.roomDimensions)}<div class="report-metrics">${reportMetric("כניסת אוויר",num(r?.silencedAirIn),"מ״ר")}${reportMetric("יציאת אוויר",num(r?.silencedAirOut),"מ״ר")}</div></section>`;const canopies=[];if(keys.includes("canopy65"))canopies.push(`<div class="report-canopy"><h3>למגורים · 65dB ב־7 מטר</h3>${reportDim(a?.dimensions)}${reportMetric("משקל כולל",num(a?.weight),"ק״ג")}</div>`);if(keys.includes("canopy75"))canopies.push(`<div class="report-canopy"><h3>מסחר / תעשייה · 75dB ב־7 מטר</h3>${reportDim(b?.dimensions)}${reportMetric("משקל כולל",num(b?.weight),"ק״ג")}</div>`);if(canopies.length)html+=`<section class="report-card report-wide"><h2>03 · חופות אקוסטיות</h2><div class="report-canopies">${canopies.join("")}</div></section>`;return html}
function reportPlanImages(v,group){if(!v)return[];return arr(v.plans).filter(x=>!decodeURIComponent(x).includes("ללא-השתקה")).flatMap((url,i)=>{const a=assets[url]||{},path=a.preview||a.image;return path?[{group,label:planName(url,i),src:new URL(path,location.href).href}]:[]})}
function selectedPlanImages(g,keys){const result=[];if(keys.includes("room"))result.push(...reportPlanImages(g.room65,"חדר מושתק למגורים"));if(keys.includes("canopy65"))result.push(...reportPlanImages(g.canopy65,"חופה למגורים · 65dB"));if(keys.includes("canopy75"))result.push(...reportPlanImages(g.canopy75,"חופה למסחר / תעשייה · 75dB"));return result}
window.pdfSelected=k=>{const g=data.find(x=>x.kva===k),keys=selectedShareKeys();if(!keys.length)return;const drawings=selectedPlanImages(g,keys),date=new Intl.DateTimeFormat("he-IL",{year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date()),tiktin=new URL("tiktin-logo.png",location.href).href,shmerling=new URL("shmerling-logo.png",location.href).href,planPages=drawings.map(x=>`<section class="plan-page"><div class="plan-heading"><b>${x.group}</b><span>${x.label}</span></div><img src="${x.src}" alt="${x.label}"></section>`).join("");const reportHtml=`<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><title>פרטי גנרטור ${k} KVA</title><style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box}body{margin:0;background:#f2f7f6;color:#173b39;font-family:Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}.print-bar{position:sticky;top:0;z-index:5;display:flex;justify-content:center;flex-wrap:wrap;gap:12px;padding:10px;background:#103534}.print-bar button{border:0;border-radius:9px;padding:11px 20px;background:#ef6a25;color:white;font:700 16px Arial;cursor:pointer}.print-bar button.secondary{background:#2f6f65}.print-bar button.back{background:white;color:#103534;border:1px solid #c8dad7}.print-bar button:disabled{opacity:.65;cursor:wait}.report-page{min-height:185mm;padding:8mm;background:#f2f7f6}.report-header{display:grid;grid-template-columns:180px 1fr 150px;align-items:center;gap:16px;margin-bottom:7mm}.report-header img{width:100%;height:58px;object-fit:contain;background:white;border-radius:9px;padding:4px}.report-title{text-align:center}.report-title h1{font-size:29px;margin:0 0 5px}.report-title p{margin:3px 0;font-size:14px}.report-title small{color:#607572}.report-grid{display:grid;grid-template-columns:1fr 1fr;gap:5mm}.report-card{background:white;border-radius:16px;padding:6mm;box-shadow:0 5px 20px #173b3910}.report-card h2{margin:0 0 5mm;font-size:20px}.report-wide{grid-column:1/-1}.report-dim{display:grid;grid-template-columns:repeat(3,1fr);background:#eef7f5;border-radius:12px;padding:4mm;margin-bottom:4mm}.report-dim>div{padding:0 4mm;border-left:1px solid #d6e5e2}.report-dim>div:last-child{border-left:0}.report-dim span,.report-metric span{display:block;color:#607572;font-size:12px}.report-dim b{display:block;margin-top:3px;font-size:18px}.report-metrics{display:grid;grid-template-columns:1fr 1fr;gap:3mm}.report-metric{border:1px solid #dce9e7;border-radius:10px;padding:3mm}.report-metric b{display:block;margin-top:3px;font-size:16px}.report-canopies{display:grid;grid-template-columns:repeat(${Math.max(1,keys.filter(x=>x.startsWith("canopy")).length)},1fr);gap:4mm}.report-canopy{border:1px solid #dce9e7;border-radius:13px;padding:4mm}.report-canopy h3{margin:0 0 3mm;font-size:16px}.report-footer{margin-top:5mm;text-align:center;color:#607572;font-size:11px}.plan-page{page-break-before:always;min-height:185mm;background:white;padding:5mm;display:flex;flex-direction:column}.plan-heading{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #ef6a25;padding-bottom:3mm;margin-bottom:4mm;font-size:16px}.plan-heading span{color:#607572}.plan-page img{width:100%;height:165mm;object-fit:contain}.missing-report{display:block;color:#7a5555}.no-plans{page-break-before:always;padding:20mm;text-align:center}@media print{.print-bar{display:none}.report-page{padding:0}.plan-page{padding:0}}</style></head><body><div class="print-bar"><button class="back" onclick="goBackToApp()">← חזור לאפליקציה</button><button onclick="print()">הדפסה</button><button class="secondary" id="save-pdf" onclick="saveReportPdf()">שמירה כ־PDF</button><button class="secondary" id="share-pdf" onclick="shareReportPdf()">שליחת PDF במייל</button></div><div id="report-document"><section class="report-page"><header class="report-header"><img src="${tiktin}" alt="טיקטין"><div class="report-title"><h1>פרטי גנרטור ${k.toLocaleString()} KVA</h1><p>מבוסס על סרגל נתונים של חברת שמרלינג</p><small>תאריך הפקה: ${date} · דגם: ${modelOf(g)}</small></div><img src="${shmerling}" alt="שמרלינג"></header><main class="report-grid">${reportCards(g,keys)}</main><footer class="report-footer">הנתונים מבוססים על אתר שמרלינג ונדרש לאמתם לפני תכנון או ביצוע.</footer></section>${planPages||`<section class="no-plans"><h2>לא צורפו שרטוטים מתאימים לבחירה זו באתר שמרלינג.</h2></section>`}</div><script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script><script>
function goBackToApp(){
  if(window.opener&&!window.opener.closed)window.opener.focus();
  window.close();
  setTimeout(function(){history.back()},80);
}
async function waitForReportImages(){
  await Promise.all(Array.from(document.images).map(function(img){
    if(img.decode)return img.decode().catch(function(){});
    return img.complete?Promise.resolve():new Promise(function(resolve){
      img.addEventListener("load",resolve,{once:true});
      img.addEventListener("error",resolve,{once:true});
    });
  }));
}
async function createReportPdf(){
  if(typeof html2pdf==="undefined")throw new Error("pdf-library");
  await waitForReportImages();
  var filename="פרטי-גנרטור-${k}-KVA.pdf";
  var subject="פרטי גנרטור ${k.toLocaleString()} KVA";
  var body="מצורף קובץ PDF שהופק באפליקציית בחירת הגנרטורים של משרד טיקטין חשמל.";
  var blob=await html2pdf().set({
    margin:0,
    filename:filename,
    image:{type:"jpeg",quality:.97},
    html2canvas:{scale:1.5,useCORS:true,backgroundColor:"#f2f7f6"},
    jsPDF:{unit:"mm",format:"a4",orientation:"landscape"},
    pagebreak:{mode:["css","legacy"]}
  }).from(document.getElementById("report-document")).outputPdf("blob");
  return {blob:blob,file:new File([blob],filename,{type:"application/pdf"}),filename:filename,subject:subject,body:body};
}
function setBusy(button,label){
  button.dataset.original=button.textContent;
  button.disabled=true;
  button.textContent=label;
}
function clearBusy(button){
  button.disabled=false;
  button.textContent=button.dataset.original||button.textContent;
}
function downloadPdf(blob,filename){
  var url=URL.createObjectURL(blob);
  var link=document.createElement("a");
  link.href=url;
  link.download=filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(function(){URL.revokeObjectURL(url)},60000);
}
async function saveReportPdf(){
  var button=document.getElementById("save-pdf");
  setBusy(button,"מכין PDF…");
  try{
    var pdf=await createReportPdf();
    downloadPdf(pdf.blob,pdf.filename);
  }catch(error){
    alert("לא ניתן לשמור PDF בדפדפן זה. אפשר להשתמש בכפתור הדפסה.");
  }finally{
    clearBusy(button);
  }
}
async function shareReportPdf(){
  var button=document.getElementById("share-pdf");
  setBusy(button,"מכין PDF…");
  try{
    var pdf=await createReportPdf();
    if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[pdf.file]}))){
      await navigator.share({files:[pdf.file],title:pdf.subject,text:pdf.body});
      return;
    }
    downloadPdf(pdf.blob,pdf.filename);
    alert("הדפדפן אינו מאפשר לצרף קובץ ישירות. ה-PDF נשמר; כעת ייפתח יישום הדואר ויש לצרף אליו את הקובץ.");
    location.href="mailto:?subject="+encodeURIComponent(pdf.subject)+"&body="+encodeURIComponent(pdf.body+"\\n\\nיש לצרף את קובץ ה-PDF שנשמר במכשיר.");
  }catch(error){
    if(error&&error.name==="AbortError")return;
    alert("לא ניתן להכין את קובץ ה-PDF לשליחה בדפדפן זה. אפשר להשתמש בכפתור שמירה כ-PDF.");
  }finally{
    clearBusy(button);
  }
}
</script></body></html>`;sessionStorage.setItem("tiktin-generator-report",reportHtml);location.href="report.html"}
function show(g,msg=""){const r=g.room65,a=g.canopy65,b=g.canopy75;$("#notice").innerHTML=msg?`<div class="notice">${msg}</div>`:"";$("#result").className="";$("#result").innerHTML=`<button class="back" onclick="back()">← חזור לבחירת גנרטור</button><div class="top"><div><small>הגנרטור המתאים</small><h2>${modelOf(g)}</h2><b>${g.kva.toLocaleString()} KVA Standby</b></div><div class="actions"><button onclick="copyData(${g.kva})">העתקת נתונים</button><button onclick="openShare(${g.kva})">שליחה במייל / PDF</button><button onclick="back()">חזור</button></div></div><div class="grid"><section class="card"><h3>01 · הגנרטור</h3>${dimensions(r?.generatorDimensions)}<div class="metrics">${metric("משקל",num(r?.generatorWeight),"ק״ג")}${metric("קוטר אגזוז",num(r?.exhaust),"אינץ׳",exhaustNote)}</div></section><section class="card"><h3>02 · חדר מושתק למגורים</h3>${dimensions(r?.roomDimensions)}<div class="metrics">${metric("כניסת אוויר",num(r?.silencedAirIn),"מ״ר")}${metric("יציאת אוויר",num(r?.silencedAirOut),"מ״ר")}</div>${plans(r,"חדר")}</section><section class="card wide"><h3>03 · חופות אקוסטיות</h3><div class="canopies"><div class="canopy"><b>למגורים · 65dB ב־7 מטר</b>${dimensions(a?.dimensions)}${metric("משקל כולל",num(a?.weight),"ק״ג")}${plans(a,"65")}</div><div class="canopy"><b>מסחר / תעשייה · 75dB ב־7 מטר</b>${dimensions(b?.dimensions)}${metric("משקל כולל",num(b?.weight),"ק״ג")}${plans(b,"75")}</div></div></section></div>`;scrollTo({top:0,behavior:"smooth"})}
function choose(n){if(!n)return;const exact=data.find(x=>x.kva===n),g=exact||data.find(x=>x.kva>=n);if(!g){$("#notice").innerHTML=`<div class="notice">מעל ${data.at(-1).kva} KVA נדרש תכנון מיוחד</div>`;return}show(g,exact?"":`מוצג ההספק הקרוב כלפי מעלה: ${g.kva} KVA`)}
window.back=()=>{$("#notice").innerHTML="";$("#result").className="empty";$("#result").textContent="בחרו הספק כדי להתחיל";$("#kva").value="";$("#models").value=""};
window.copyData=k=>navigator.clipboard.writeText(summary(data.find(x=>x.kva===k)));
Promise.all([fetch("data.json").then(r=>r.json()),fetch("plan-assets.json").then(r=>r.json()).catch(()=>({}))]).then(([d,a])=>{data=d;assets=a;$("#models").innerHTML+=data.map(x=>`<option value="${x.kva}">${x.kva.toLocaleString()} KVA · ${modelOf(x)}</option>`).join("")});
$("#selector").addEventListener("submit",e=>{e.preventDefault();choose(Number($("#kva").value))});$("#models").addEventListener("change",e=>choose(Number(e.target.value)));

