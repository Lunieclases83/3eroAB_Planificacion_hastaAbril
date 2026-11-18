(() => {
'use strict';
const STORE='cajpd-html-seguimiento-v1';
const STATES=['Pendiente','No impartida','En proceso','Impartida','Evaluada'];
const BSTATES=['No iniciado','En proceso','Completado','Evaluado'];
let published={},drafts={},loadWarning='';
try{drafts=validate(JSON.parse(localStorage.getItem(STORE)||'{"version":1,"records":{}}')).records;}catch(e){loadWarning='No se pudo leer el registro local. Puede importar una copia de respaldo.';}
function escape(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function validate(v){
 if(!v||v.version!==1||!v.records||typeof v.records!=='object'||Array.isArray(v.records))throw Error('Formato de seguimiento no válido.');
 const clean={};for(const [k,r] of Object.entries(v.records)){
  if(!/^([1-9]|1[0-7])\|3\.º [AB]$/.test(k)||!r||!STATES.includes(r.status)||!Array.isArray(r.blocks)||r.blocks.some(x=>!BSTATES.includes(x)))throw Error('Registro o estado no válido.');
  if(r.actualDate&&!/^\d{4}-\d{2}-\d{2}$/.test(r.actualDate))throw Error('Fecha no válida.');
  clean[k]={status:r.status,actualDate:String(r.actualDate||''),notes:String(r.notes||'').slice(0,5000),evidence:String(r.evidence||'').slice(0,2000),blocks:r.blocks.slice(0,10),updatedAt:String(r.updatedAt||'')};
 }return {version:1,records:clean};
}
const key=(id,g)=>id+'|'+g;
function record(id,g){const k=key(id,g);return drafts[k]||published[k]||{status:'Pendiente',actualDate:'',notes:'',evidence:'',blocks:[]};}
function combined(){return {...published,...drafts};}
function opts(values,value){return values.map(v=>`<option ${v===value?'selected':''}>${escape(v)}</option>`).join('');}
const style=document.createElement('style');style.textContent='.tracking{margin:24px 0;padding:24px;border:1px solid #aac8ba;background:#edf5ef;border-radius:14px}.tracking label{display:block;margin:12px 0}.tracking textarea{display:block;width:100%;min-height:80px;padding:10px;font:inherit;border:1px solid #bbccc2;border-radius:7px}.tracking-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.tracking select{max-width:100%}.tracking-message{font-weight:600}.block-state{margin-top:10px}.statechip{display:inline-block;margin:3px 5px 3px 0;background:#e4ece5;padding:3px 9px;border-radius:12px;font-size:12px}.state-No-impartida{background:#f7dfda}.state-Evaluada,.state-Impartida{background:#d5eadc}@media(max-width:650px){.tracking-grid{grid-template-columns:1fr}}@media print{.tracking textarea{min-height:45px}.tracking button,.tracking .import-label{display:none}.tracking{background:white;padding:12px}}';document.head.append(style);
const originalRender=renderLesson;
renderLesson=function(){originalRender();draw();};
const originalSchedule=schedule;
schedule=function(){originalSchedule();document.querySelectorAll('#scheduleRows tr').forEach(row=>{const btn=row.querySelector('button');if(!btn)return;const match=btn.getAttribute('onclick').match(/\d+/);if(!match)return;const id=Number(match[0]);const cell=row.cells[1];cell.querySelector('.status')?.remove();const b=document.createElement('div');for(const g of ['3.º A','3.º B']){const state=record(id,g).status;const tag=document.createElement('span');tag.className='statechip state-'+state.replaceAll(' ','-');tag.textContent=g+': '+state;b.append(tag);}cell.append(b);});};
function draw(){
 const id=Number(document.querySelector('#lessonSelect').value),g=document.querySelector('#group').value,x=lessons.find(x=>x.id===id);if(!x)return;
 const r=record(id,g),local=!!drafts[key(id,g)];
 document.querySelector('#lessonContent .note')?.remove();
 const panel=document.createElement('div');panel.className='tracking';panel.id='trackingPanel';
 panel.innerHTML=`<h2>Registro de ejecución · ${escape(g)}</h2><p>Fecha planificada: <strong>${date(x.date)}</strong>. Este registro pertenece solo a esta sección y esta secuencia.</p><div class="tracking-grid"><label>Estado de la clase<select id="executionStatus">${opts(STATES,r.status)}</select></label><label>Fecha real de impartición (si aplica)<input id="actualDate" type="date" value="${escape(r.actualDate)}"></label></div><p><small>Pendiente: aún por confirmar · No impartida: no pudo realizarse · En proceso: se trabajó parcialmente · Impartida: secuencia completada · Evaluada: evaluación aplicada.</small></p><label>Observaciones, motivo o punto donde quedó la clase<textarea id="executionNotes">${escape(r.notes)}</textarea></label><label>Evidencias o referencia del trabajo realizado<textarea id="executionEvidence">${escape(r.evidence)}</textarea></label><button id="saveExecution">Guardar registro de esta sección</button><p id="executionMessage" class="tracking-message" role="status">${escape(loadWarning||(local?'Registro guardado en este navegador; pendiente de publicar para compartir.':'Mostrando registro publicado; si no existe, queda pendiente.'))}</p><details class="noprint"><summary>Compartir el seguimiento con el coordinador</summary><p>Los cambios se guardan en este navegador y no se sincronizan automáticamente. Descarga seguimiento.json y reemplaza el archivo del mismo nombre en la raíz del repositorio de GitHub. El coordinador verá esa versión publicada. No incluyas datos personales de estudiantes en las observaciones.</p><button id="exportTracking">Descargar seguimiento.json</button><label class="import-label">Importar respaldo (reemplaza los registros locales)<input type="file" id="importTracking" accept="application/json,.json"></label><p>Antes de importar, descarga una copia de tus registros actuales. Imprimir la clase también incluye el estado y las observaciones.</p></details>`;
 const target=document.querySelector('#lessonContent');target.querySelector('h2')?.before(panel);
 document.querySelectorAll('#lessonContent .block').forEach((b,i)=>{const label=document.createElement('label');label.className='block-state';label.textContent='Avance de este bloque ';const sel=document.createElement('select');sel.className='executionBlock';sel.setAttribute('aria-label','Estado del bloque '+(i+1));sel.innerHTML=opts(BSTATES,r.blocks[i]||'No iniciado');label.append(sel);b.lastElementChild.append(label);});
 let dirty=false;panel.querySelectorAll('input:not([type=file]),select,textarea').forEach(e=>e.addEventListener('input',()=>{dirty=true;document.querySelector('#executionMessage').textContent='Hay cambios sin guardar.';}));document.querySelectorAll('.executionBlock').forEach(e=>e.addEventListener('change',()=>{dirty=true;document.querySelector('#executionMessage').textContent='Hay cambios sin guardar.';}));
 document.querySelector('#saveExecution').onclick=()=>{
  const v={status:document.querySelector('#executionStatus').value,actualDate:document.querySelector('#actualDate').value,notes:document.querySelector('#executionNotes').value,evidence:document.querySelector('#executionEvidence').value,blocks:[...document.querySelectorAll('.executionBlock')].map(e=>e.value),updatedAt:new Date().toISOString()};
  if(v.status==='No impartida'&&v.blocks.some(x=>x!=='No iniciado')){document.querySelector('#executionMessage').textContent='Si hubo bloques trabajados, usa «En proceso». Si no hubo clase, deja los bloques en «No iniciado».';return;}
  const next={...drafts,[key(id,g)]:v};try{localStorage.setItem(STORE,JSON.stringify({version:1,records:next}));drafts=next;dirty=false;document.querySelector('#executionMessage').textContent='Guardado en este navegador para '+g+'. Descarga seguimiento.json para compartirlo.';schedule();}catch(e){document.querySelector('#executionMessage').textContent='No se pudo guardar. El navegador no permite almacenamiento local.';}
 };
 document.querySelector('#exportTracking').onclick=()=>{if(dirty){document.querySelector('#executionMessage').textContent='Guarda primero los cambios de esta sección antes de descargar.';return;}const blob=new Blob([JSON.stringify({version:1,records:combined()},null,2)],{type:'application/json'});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download='seguimiento.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
 document.querySelector('#importTracking').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>500000)throw Error('Archivo demasiado grande.');const data=validate(JSON.parse(await f.text()));localStorage.setItem(STORE,JSON.stringify(data));drafts=data.records;renderLesson();schedule();document.querySelector('#executionMessage').textContent='Respaldo importado y guardado en este navegador.';}catch(err){document.querySelector('#executionMessage').textContent='No se importó: '+err.message;}};
}
document.querySelector('#group').onchange=()=>renderLesson();
document.querySelector('#lessonSelect').onchange=()=>renderLesson();
document.querySelector('#month').onchange=()=>schedule();
fetch('seguimiento.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>{published=validate(d).records;}).catch(()=>{loadWarning='No se pudo cargar seguimiento.json. Se mantienen los registros locales disponibles.';}).finally(()=>{if(lessons.length){renderLesson();schedule();}});
})();
