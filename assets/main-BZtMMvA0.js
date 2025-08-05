import{i as w,r as T,t as n}from"./i18n-B09WZxBh.js";const g=document.getElementById("search-input"),h=document.getElementById("office-part-filter"),I=document.getElementById("mode-filter"),l=document.getElementById("results-container"),b=document.getElementById("results-count"),v=document.getElementById("prev-page-btn"),y=document.getElementById("next-page-btn"),$=document.getElementById("page-info");let P=[],s=[],a=1;const d=100,L={al:"Alleluia",an:"Antiphona",ca:"Canticum",co:"Communio",gr:"Graduale",hy:"Hymnus",im:"Improperia",in:"Introitus",ky:"Kyriale",of:"Offertorium",or:"Toni Communes",pa:"Prosa",pr:"Praefationes",ps:"Psalmus",rb:"Responsorium breve",re:"Responsorium",rh:"Rhythmus",se:"Sequentia",su:"Supplicatio",tp:"Tropa",tr:"Tractus",va:"Varia"},A={al:"#b0d2e8",an:"#e0c85c",ca:"#707070",co:"#909050",gr:"#b0e070",hy:"#c0a080",im:"#8c5c44",in:"#d04040",ky:"#4040a0",of:"#809070",or:"#e0e0a0",pa:"#a050a0",pr:"#d080a0",ps:"#8090a0",rb:"#9c7c60",re:"#9c7c60",rh:"#e09050",se:"#a09070",su:"#d04040",tp:"#80d0d0",tr:"#c09060",va:"#d0d0d0"},B="#cccccc";function k(e,t=300){let c;return function(...r){clearTimeout(c),c=window.setTimeout(()=>e.apply(this,r),t)}}async function M(){try{const e=await fetch("/data/chants.json");if(!e.ok)throw new Error(`HTTP error! status: ${e.status}`);P=await e.json(),u()}catch{l.innerHTML=`<p class="loading-message">${n("loading_error")}</p>`}}function u(){const e=g.value.toLowerCase(),t=h.value,c=I.value;s=P.filter(r=>r.incipit.toLowerCase().includes(e)&&(!t||r["office-part"]===t)&&(!c||r.mode===c)),a=1,m()}function _(e){switch(e){case"1":return"I";case"2":return"II";case"3":return"III";case"4":return"IV";case"5":return"V";case"6":return"VI";case"7":return"VII";case"8":return"VIII";default:return"N/A"}}function m(){l.innerHTML="";const e=Math.ceil(s.length/d);if(b.textContent=n("search_results_found",{count:s.length}),$.textContent=n("page_info",{currentPage:a,totalPages:e||1}),v.disabled=a===1,y.disabled=a>=e,s.length===0){l.innerHTML=`<p class="loading-message">${n("no_results")}</p>`;return}const t=(a-1)*d,c=s.slice(t,t+d),r=document.createDocumentFragment();for(const o of c){const i=document.createElement("a");i.className="result-card",i.href=`chant.html?id=${o.id}`;const p=o["office-part"],C=L[p]||p||"N/A",E=A[p]||B;i.innerHTML=`
      <div class="card-title">
        <h3 class="card-incipit" title="${o.incipit}">${o.incipit}</h3>
      </div>
      <div class="card-image-wrapper">
        <img src="https://gregobase.selapa.net/chant_img.php?id=${o.id}" alt="${n("chant_visualization_alt",{incipit:o.incipit})}" loading="lazy">
      </div>
      <div class="card-info">
        <div class="card-details">
          <span>
            <span class="color-chip" style="background-color: ${E};"></span>
            ${C}
          </span>
          <span><strong>${n("mode")}:</strong> ${_(o.mode)||"N/A"}</span>
          <span><strong>${n("version")}:</strong> ${o.version||"N/A"}</span>
        </div>
      </div>
    `,r.appendChild(i)}l.appendChild(r)}function f(){document.querySelectorAll("[data-t]").forEach(e=>{const t=e.getAttribute("data-t");e.textContent=n(t)}),document.querySelectorAll("[data-t-placeholder]").forEach(e=>{const t=e.getAttribute("data-t-placeholder");e.placeholder=n(t)})}async function x(){await w(),f(),T(f),M(),g.addEventListener("input",k(u)),h.addEventListener("change",u),I.addEventListener("change",u),v.addEventListener("click",()=>{a>1&&(a--,m(),window.scrollTo(0,0))}),y.addEventListener("click",()=>{a<Math.ceil(s.length/d)&&(a++,m(),window.scrollTo(0,0))})}x();
