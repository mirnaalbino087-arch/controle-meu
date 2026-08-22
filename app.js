const KEY="painelEmprestimos_v1";
let db=JSON.parse(localStorage.getItem(KEY)||'{"clients":[],"loans":[],"payments":[]}');

const $=id=>document.getElementById(id);
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const dateBR=v=>v?new Date(v+"T00:00:00").toLocaleDateString('pt-BR'):"—";
const save=()=>localStorage.setItem(KEY,JSON.stringify(db));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);

function client(id){return db.clients.find(x=>x.id===id)}
function loan(id){return db.loans.find(x=>x.id===id)}
function paid(loanId){return db.payments.filter(p=>p.loanId===loanId).reduce((s,p)=>s+Number(p.amount),0)}
function balance(l){return Math.max(0,Number(l.total)-paid(l.id))}
function nextDue(l){
  const n=Math.min(l.installments, Math.max(1, Math.floor(paid(l.id)/(Number(l.total)/l.installments))+1));
  const d=new Date(l.firstDue+"T00:00:00"); d.setMonth(d.getMonth()+n-1);
  return d.toISOString().slice(0,10);
}
function status(l){
  if(balance(l)<=0) return ["Quitado","done"];
  const d=new Date(nextDue(l)+"T00:00:00"), today=new Date(); today.setHours(0,0,0,0);
  return d<today?["Atrasado","late"]:["Ativo","ok"];
}
function daysUntil(dateStr){
  const d=new Date(dateStr+"T00:00:00"), t=new Date(); t.setHours(0,0,0,0);
  return Math.round((d-t)/86400000);
}
function alertInfo(l){
  const days=daysUntil(nextDue(l));
  if(balance(l)<=0) return null;
  if(days<0) return {label:`Atrasado há ${Math.abs(days)} dia(s)`, cls:"late", emoji:"🔴"};
  if(days===0) return {label:"Vence hoje", cls:"soon", emoji:"🚨"};
  if(days===1) return {label:"Vence amanhã", cls:"soon", emoji:"🟠"};
  if(days<=3) return {label:`Vence em ${days} dias`, cls:"soon", emoji:"🟡"};
  return null;
}
function whatsappUrl(phone, text){
  const digits=String(phone||"").replace(/\D/g,"");
  if(!digits) return null;
  const br=digits.startsWith("55")?digits:`55${digits}`;
  return `https://wa.me/${br}?text=${encodeURIComponent(text)}`;
}
function buildReminder(l){
  const c=client(l.clientId), info=alertInfo(l);
  const when=info?.label||`vence em ${dateBR(nextDue(l))}`;
  return `Olá, ${c?.name||"cliente"}! 👋\n\nEste é um lembrete sobre sua parcela do empréstimo.\n💰 Valor em aberto: ${money(balance(l))}\n📅 Vencimento: ${dateBR(nextDue(l))}\n🔔 Situação: ${when}.\n\nSe o pagamento já foi realizado, desconsidere esta mensagem. Obrigado!`;
}
function sendWhatsApp(id){
  const l=loan(id), c=l&&client(l.clientId);
  if(!l||!c) return alert("Cliente ou empréstimo não encontrado.");
  const url=whatsappUrl(c.phone, buildReminder(l));
  if(!url) return alert("Este cliente não tem um número de WhatsApp cadastrado. Edite o cliente e informe o telefone.");
  window.open(url,"_blank","noopener");
}

function render(){
  $("statClients").textContent=db.clients.length;
  $("statLoans").textContent=db.loans.filter(l=>balance(l)>0).length;
  $("statReceivable").textContent=money(db.loans.reduce((s,l)=>s+balance(l),0));
  $("statLate").textContent=db.loans.filter(l=>status(l)[0]==="Atrasado").length;

  const alerts=db.loans.filter(l=>alertInfo(l)).sort((a,b)=>daysUntil(nextDue(a))-daysUntil(nextDue(b)));
  $("alertsList").innerHTML=alerts.length?alerts.map(l=>{const c=client(l.clientId),info=alertInfo(l); return `<div class="alert-row"><div><b>${info.emoji} ${esc(c?.name||"Cliente removido")}</b><br><small>${esc(info.label)} · ${dateBR(nextDue(l))} · ${money(balance(l))}</small></div><button onclick="sendWhatsApp('${l.id}')">📱 Cobrar no WhatsApp</button></div>`}).join(""):'<div class="empty">✅ Nenhum alerta de cobrança no momento.</div>';

  const upcoming=db.loans.filter(l=>balance(l)>0).sort((a,b)=>nextDue(a).localeCompare(nextDue(b))).slice(0,8);
  $("upcomingList").innerHTML=upcoming.length?upcoming.map(l=>`<div class="upcoming"><span><b>${esc(client(l.clientId)?.name||"Cliente removido")}</b><br><small>${dateBR(nextDue(l))}</small></span><span><b>${money(balance(l))}</b><br><button class="secondary" onclick="sendWhatsApp('${l.id}')">📱 WhatsApp</button></span></div>`).join(""):'<div class="empty">Nenhum vencimento encontrado.</div>';

  const cs=$("clientSearch").value.toLowerCase();
  $("clientsTable").innerHTML=db.clients.filter(c=>(c.name+" "+(c.cpf||"")+" "+(c.phone||"")).toLowerCase().includes(cs)).map(c=>`<tr><td>${esc(c.name)}</td><td>${esc(c.cpf||"—")}</td><td>${esc(c.phone||"—")}</td><td>${esc(c.city||"—")}</td><td><button onclick="viewClient('${c.id}')">Ver</button> <button class="secondary" onclick="editClient('${c.id}')">Editar</button></td></tr>`).join("")||'<tr><td colspan="5" class="empty">Nenhum cliente.</td></tr>';

  const ls=$("loanSearch").value.toLowerCase();
  $("loansTable").innerHTML=db.loans.filter(l=>(client(l.clientId)?.name+" "+status(l)[0]).toLowerCase().includes(ls)).map(l=>{const st=status(l);return `<tr><td>${esc(client(l.clientId)?.name||"—")}</td><td>${money(l.amount)}</td><td>${l.installments}</td><td>${money(balance(l))}</td><td>${dateBR(nextDue(l))}</td><td><span class="status ${st[1]}">${st[0]}</span></td><td><button onclick="openPayment('${l.id}')">Pagar</button> <button class="secondary" onclick="sendWhatsApp('${l.id}')">📱 Cobrar</button></td></tr>`}).join("")||'<tr><td colspan="7" class="empty">Nenhum empréstimo.</td></tr>';

  $("paymentsTable").innerHTML=db.payments.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(p=>`<tr><td>${dateBR(p.date)}</td><td>${esc(client(loan(p.loanId)?.clientId)?.name||"—")}</td><td>${money(loan(p.loanId)?.amount||0)}</td><td>${money(p.amount)}</td><td>${p.installment||"—"}</td><td>${esc(p.notes||"—")}</td></tr>`).join("")||'<tr><td colspan="6" class="empty">Nenhum pagamento.</td></tr>';

  const lent=db.loans.reduce((s,l)=>s+Number(l.amount),0), recv=db.payments.reduce((s,p)=>s+Number(p.amount),0);
  $("repLent").textContent=money(lent); $("repPaid").textContent=money(recv); $("repBalance").textContent=money(db.loans.reduce((s,l)=>s+balance(l),0));
  $("reportText").innerHTML=`<p><b>${db.loans.length}</b> empréstimos cadastrados.</p><p><b>${db.payments.length}</b> pagamentos registrados.</p><p><b>${db.loans.filter(l=>status(l)[0]==="Atrasado").length}</b> empréstimos com vencimento atrasado.</p>`;
}

function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function showPage(name){
  document.querySelectorAll(".page").forEach(x=>x.classList.add("hidden"));
  $(name).classList.remove("hidden");
  document.querySelectorAll(".nav[data-page]").forEach(x=>x.classList.toggle("active",x.dataset.page===name));
  $("pageTitle").textContent={dashboard:"Dashboard",clients:"Clientes",loans:"Empréstimos",payments:"Pagamentos",reports:"Relatórios"}[name];
  render();
}
function fillClientSelect(){
  $("loanClient").innerHTML=db.clients.map(c=>`<option value="${c.id}">${esc(c.name)} — ${esc(c.phone||"sem WhatsApp")}</option>`).join("");
}
function fillLoanSelect(){
  $("paymentLoan").innerHTML=db.loans.filter(l=>balance(l)>0).map(l=>`<option value="${l.id}">${esc(client(l.clientId)?.name||"—")} — saldo ${money(balance(l))}</option>`).join("");
}

$("loginBtn").onclick=()=>{
  if($("loginUser").value==="admin" && $("loginPass").value==="123456"){
    $("login").classList.add("hidden");$("app").classList.remove("hidden");$("today").textContent=new Date().toLocaleDateString("pt-BR",{dateStyle:"full"});render();
  }else $("loginError").textContent="Usuário ou senha inválidos.";
};
$("logoutBtn").onclick=()=>{location.reload()};
document.querySelectorAll(".nav[data-page]").forEach(b=>b.onclick=()=>showPage(b.dataset.page));
$("clientSearch").oninput=render;$("loanSearch").oninput=render;
$("newClientBtn").onclick=()=>{ $("clientForm").reset();$("clientId").value="";$("clientDialogTitle").textContent="Novo cliente";$("clientDialog").showModal() };
$("newLoanBtn").onclick=()=>{if(!db.clients.length)return alert("Cadastre um cliente primeiro.");$("loanForm").reset();fillClientSelect();$("loanFirstDue").value=new Date().toISOString().slice(0,10);$("loanDialog").showModal()};
$("newLoanFromDash").onclick=()=>{if(!db.clients.length)return alert("Cadastre um cliente primeiro.");fillClientSelect();$("loanForm").reset();$("loanFirstDue").value=new Date().toISOString().slice(0,10);$("loanDialog").showModal()};
$("newPaymentBtn").onclick=()=>openPayment();
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>b.closest("dialog").close());

$("clientForm").onsubmit=e=>{
 e.preventDefault();
 const id=$("clientId").value||uid(), old=client(id);
 const obj={id,name:$("clientName").value.trim(),cpf:$("clientCpf").value.trim(),phone:$("clientPhone").value.trim(),address:$("clientAddress").value.trim(),city:$("clientCity").value.trim(),state:$("clientState").value.trim().toUpperCase(),notes:$("clientNotes").value.trim(),createdAt:old?.createdAt||new Date().toISOString()};
 if(old) Object.assign(old,obj); else db.clients.push(obj); save();$("clientDialog").close();render();
};

$("loanForm").onsubmit=e=>{
 e.preventDefault();
 db.loans.push({id:uid(),clientId:$("loanClient").value,amount:Number($("loanAmount").value),installments:Number($("loanInstallments").value),total:Number($("loanTotal").value),firstDue:$("loanFirstDue").value,notes:$("loanNotes").value.trim(),createdAt:new Date().toISOString()});
 save();$("loanDialog").close();render();
};

$("paymentForm").onsubmit=e=>{
 e.preventDefault();
 const id=$("paymentLoan").value, l=loan(id), val=Number($("paymentAmount").value);
 if(!l||val>balance(l)+0.001)return alert("O pagamento não pode ser maior que o saldo devedor.");
 db.payments.push({id:uid(),loanId:id,amount:val,date:$("paymentDate").value,installment:Number($("paymentInstallment").value||1),notes:$("paymentNotes").value.trim()});
 save();$("paymentDialog").close();render();
};

function openPayment(id){
  fillLoanSelect(); if(!db.loans.some(l=>balance(l)>0))return alert("Não há empréstimos em aberto.");
  if(id)$("paymentLoan").value=id;
  $("paymentDate").value=new Date().toISOString().slice(0,10);
  $("paymentAmount").value="";$("paymentNotes").value="";
  $("paymentDialog").showModal();
}
function editClient(id){
 const c=client(id); if(!c)return;
 $("clientId").value=c.id;$("clientDialogTitle").textContent="Editar cliente";
 $("clientName").value=c.name;$("clientCpf").value=c.cpf||"";$("clientPhone").value=c.phone||"";
 $("clientAddress").value=c.address||"";$("clientCity").value=c.city||"";$("clientState").value=c.state||"";$("clientNotes").value=c.notes||"";
 $("clientDialog").showModal();
}
function viewClient(id){
 const c=client(id), loans=db.loans.filter(l=>l.clientId===id);
 $("clientView").innerHTML=`<div class="client-detail"><h3>${esc(c.name)}</h3><p><b>CPF:</b> ${esc(c.cpf||"—")}</p><p><b>WhatsApp:</b> ${esc(c.phone||"—")}</p><p><b>Endereço:</b> ${esc(c.address||"—")} — ${esc(c.city||"")} / ${esc(c.state||"")}</p><hr><h4>Histórico de empréstimos</h4>${loans.length?loans.map(l=>`<p>${money(l.amount)} → saldo ${money(balance(l))} — <span class="status ${status(l)[1]}">${status(l)[0]}</span></p>`).join(""):"<p>Nenhum empréstimo."}</div>`;
 $("clientViewDialog").showModal();
}
$("backupBtn").onclick=()=>{
 const blob=new Blob([JSON.stringify(db,null,2)],{type:"application/json"}), a=document.createElement("a");
 a.href=URL.createObjectURL(blob);a.download="backup-emprestimos-"+new Date().toISOString().slice(0,10)+".json";a.click();URL.revokeObjectURL(a.href);
};
