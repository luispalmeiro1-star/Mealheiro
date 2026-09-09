import { useState, useEffect, useMemo } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { createClient } from "@supabase/supabase-js";

const SB_URL = "https://ptuqljedrqsywzmersxl.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0dXFsamVkcnFzeXd6bWVyc3hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NzM3MTcsImV4cCI6MjEwMjE0OTcxN30.QV4XHYqNT1j2trlqH9iHe-tu_w4KSmFU-3RoXLVEGw4";
const supabase = createClient(SB_URL, SB_KEY);
const VAPID_PUBLIC_KEY = "BKW_ApWBzs6bLipifF8L8xdDyxWbDuLpRGYlTDXZWf-BZ1BfXlzbFQhVqfSht-666Ri-wHMKfbaBLfdL1_DAttU";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function ativarLembretes(username, casaCodigo, userId) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    alert("O teu navegador não suporta notificações.");
    return false;
  }
  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") { alert("Não deste permissão para notificações."); return false; }
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) });
  }
  const raw = sub.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert({
    user_id: userId, username, casa_codigo: casaCodigo,
    endpoint: raw.endpoint, p256dh: raw.keys.p256dh, auth: raw.keys.auth,
  }, { onConflict: "endpoint" });
  if (error) { alert("Erro ao ativar lembretes: " + error.message); return false; }
  return true;
}

const CATEGORIAS = {
  receita: ["Salário", "Freelance", "Investimentos", "Rendas", "Outros"],
  despesa: ["Habitação", "Alimentação", "Transporte", "Saúde", "Lazer", "Educação", "Vestuário", "Outros"],
};
const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const CAT_COLORS = ["#F59E0B","#F43F5E","#C084FC","#38BDF8","#34D399","#FB923C","#818CF8","#A78BFA"];
const C = { bg:"#F7F5F2", surface:"#FFFFFF", border:"#E8E3DC", text:"#1C1917", muted:"#78716C", faint:"#EDE8E3", income:"#22C55E", expense:"#F43F5E", accent:"#F59E0B" };

const LISTA_PRODUTOS = {
  "🥛 Lacticínios": ["Leite meio-gordo","Leite magro","Leite gordo","Leite sem lactose","Manteiga","Margarina","Natas","Iogurte natural","Iogurte de frutas","Iogurte grego","Queijo flamengo","Queijo da Serra","Queijo fresco","Requeijão","Mozzarella","Queijo parmesão","Ovos"],
  "🍞 Padaria & Cereais": ["Pão de forma","Pão de mistura","Pão integral","Papo-secos","Croissants","Tostas","Bolachas de água e sal","Bolachas Maria","Bolachas de aveia","Cereais de pequeno-almoço","Muesli","Aveia","Flocos de milho","Granola"],
  "🥩 Carne": ["Frango inteiro","Peito de frango","Coxas de frango","Asas de frango","Carne picada de vaca","Bife de vaca","Entrecosto","Costeletas de porco","Lombinho de porco","Pernil","Chouriço","Linguiça","Morcela","Farinheira","Alheira","Bacon","Fiambre","Mortadela","Peru fatiado","Salsichas"],
  "🐟 Peixe & Marisco": ["Bacalhau salgado","Bacalhau congelado","Salmão","Pescada","Dourada","Robalo","Atum em lata","Sardinha em lata","Carapau","Cavala","Gambas","Camarão","Lulas","Polvo","Amêijoas","Mexilhão","Berbigão"],
  "🥦 Legumes & Verduras": ["Batatas","Cebolas","Alho","Cenouras","Tomates","Tomate cherry","Alface","Espinafres","Couve portuguesa","Couve-flor","Brócolos","Courgette","Beringela","Pimentos","Pepinos","Alho francês","Nabo","Aipo","Ervilhas","Feijão verde","Cogumelos","Abóbora"],
  "🍎 Frutas": ["Maçãs","Peras","Laranjas","Tangerinas","Limões","Bananas","Uvas","Morangos","Melão","Melancia","Ananás","Kiwis","Pêssegos","Ameixas","Cerejas","Mirtilos","Manga","Abacate"],
  "🥫 Mercearia & Conservas": ["Azeite","Óleo alimentar","Vinagre","Sal","Açúcar","Mel","Farinha de trigo","Farinha de milho","Maizena","Fermento","Arroz agulha","Arroz carolino","Massa esparguete","Massa penne","Massa fusilli","Massa lasanha","Feijão enlatado","Grão enlatado","Lentilhas","Tomate triturado","Polpa de tomate","Caldo de galinha","Caldo de carne","Leite de coco","Molho de tomate","Ketchup","Mostarda","Maionese","Molho de soja","Tabasco"],
  "🧂 Temperos & Especiarias": ["Pimenta preta","Colorau","Cominhos","Canela","Noz-moscada","Orégãos","Tomilho","Louro","Salsa seca","Coentros secos","Piri-piri","Açafrão","Caril","Paprika","Ervas de Provence"],
  "🧃 Bebidas": ["Água (garrafas)","Água com gás","Sumo de laranja","Sumo de maçã","Refrigerante cola","Refrigerante laranja","Refrigerante limão","Cerveja","Vinho tinto","Vinho branco","Vinho verde","Espumante","Café em grão","Café moído","Café cápsulas","Chá verde","Chá preto","Chá de camomila","Leite de aveia","Leite de amêndoa"],
  "🧁 Doces & Snacks": ["Chocolate negro","Chocolate de leite","Chocolate branco","Bolachas chocolate","Biscoitos","Croissants embalados","Batatas fritas","Pipocas","Barras de cereais","Frutos secos","Amêndoas","Nozes","Cajus","Passas","Gomas","Rebuçados"],
  "🧴 Higiene Pessoal": ["Sabonete","Gel de banho","Champô","Amaciador cabelo","Condicionador","Pasta de dentes","Escova de dentes","Fio dentário","Elixir bucal","Desodorizante","Creme hidratante","Creme de mãos","Protetor solar","Maquinilha de barbear","Espuma de barbear","Creme depilatório","Pensos higiénicos","Tampões","Preservativos","Fraldas","Toalhetes bebé"],
  "🧹 Limpeza da Casa": ["Detergente roupa líquido","Detergente roupa pó","Amaciador roupa","Detergente louça","Detergente máquina louça","Sal máquina louça","Brilhante máquina louça","Limpador multiusos","Limpador casa banho","Limpador cozinha","Limpador vidros","Lixívia","Desinfetante","Pastilhas sanita","Gel sanita","Ambientador spray","Ambientador elétrico","Sacos do lixo","Esponjas","Esfregão","Pano microfibra","Luvas borracha"],
  "🧻 Papel & Descartáveis": ["Papel higiénico","Papel de cozinha","Lenços de papel","Guardanapos","Papel de alumínio","Papel vegetal","Película aderente","Sacos congelar","Sacos para sandes","Copos descartáveis","Pratos descartáveis","Palhinhas"],
  "💊 Farmácia & Saúde": ["Paracetamol","Ibuprofeno","Aspirina","Antigripal","Xarope tosse","Descongestionante nasal","Vitamina C","Vitamina D","Magnésio","Probióticos","Pensos rápidos","Água oxigenada","Álcool 70%","Termómetro","Solução salina nasal"],
  "🐾 Animais de Estimação": ["Ração seca cão","Ração húmida cão","Ração seca gato","Ração húmida gato","Areia gato","Snacks cão","Snacks gato","Shampoo animal"],
  "🍳 Congelados": ["Legumes congelados","Ervilhas congeladas","Espinafres congelados","Batata frita congelada","Pizza congelada","Lasanha congelada","Peixe congelado","Camarão congelado","Gelados","Sobremesas congeladas"],
  "➕ Outros": [],
};

const fmt = n => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(n || 0);
const monthKey = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}`; };
const today = () => new Date().toISOString().slice(0, 10);

function Card({ children, style }) { return <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:20, ...style }}>{children}</div>; }
function ProgressBar({ pct, color, height=7 }) { return <div style={{ background:C.faint, borderRadius:99, height, overflow:"hidden" }}><div style={{ width:`${Math.min(pct,100)}%`, height, background:color, borderRadius:99, transition:"width 0.5s" }} /></div>; }
function Spinner() { return <div style={{ width:18, height:18, border:`2px solid ${C.border}`, borderTop:`2px solid ${C.text}`, borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />; }

// ── Ecrã de Login ─────────────────────────────────────────────────────────────
// Login/registo passam por funções RPC no Supabase (registar_utilizador, resolver_email):
// a password nunca é guardada nem comparada em texto simples — quem trata disso é o
// Supabase Auth. Depois de autenticado, o resto da app segue a sessão via onAuthStateChange.
function EcraLogin() {
  const [passo, setPasso] = useState("inicio"); // inicio | login | registo | juntar
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [codigoCasa, setCodigoCasa] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function fazerLogin() {
    if (!username.trim() || !password.trim()) return setErro("Preenche todos os campos.");
    setLoading(true); setErro("");
    const { data: email } = await supabase.rpc("resolver_email", { p_username: username.trim() });
    if (!email) { setErro("Utilizador ou password incorretos."); setLoading(false); return; }
    const { error } = await supabase.auth.signInWithPassword({ email, password: password.trim() });
    if (error) { setErro("Utilizador ou password incorretos."); setLoading(false); return; }
    setLoading(false);
  }

  async function registar(comCasa) {
    if (!username.trim() || !password.trim()) return setErro("Preenche todos os campos.");
    if (password.trim().length < 6) return setErro("A password tem de ter pelo menos 6 caracteres.");
    if (comCasa && !codigoCasa.trim()) return setErro("Indica o código da casa.");
    setLoading(true); setErro("");

    const { error } = await supabase.rpc("registar_utilizador", {
      p_username: username.trim(),
      p_password: password.trim(),
      p_casa_codigo: comCasa ? codigoCasa.trim() : null,
    });
    if (error) { setErro(error.message); setLoading(false); return; }

    const { data: email } = await supabase.rpc("resolver_email", { p_username: username.trim() });
    const { error: erroLogin } = await supabase.auth.signInWithPassword({ email, password: password.trim() });
    if (erroLogin) { setErro("Conta criada. Agora entra com o teu utilizador e password."); setPasso("login"); setLoading(false); return; }
    setLoading(false);
  }

  const inputStyle = { width:"100%", padding:"12px 14px", borderRadius:10, border:`1.5px solid ${C.border}`, background:C.bg, color:C.text, fontSize:15, outline:"none", boxSizing:"border-box", marginBottom:12 };
  const btnPrimary = { width:"100%", padding:"13px 0", borderRadius:12, border:"none", background:C.text, color:"#fff", cursor:"pointer", fontWeight:700, fontSize:15, opacity:loading?0.7:1, marginBottom:8 };
  const btnSecondary = { width:"100%", padding:"13px 0", borderRadius:12, border:`1.5px solid ${C.border}`, background:"none", color:C.text, cursor:"pointer", fontWeight:600, fontSize:15 };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"'Inter',system-ui,sans-serif", padding:24 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ width:"100%", maxWidth:360 }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ fontSize:52, marginBottom:10 }}>🐷</div>
          <h1 style={{ margin:"0 0 6px", fontSize:28, fontWeight:800, color:C.text, letterSpacing:"-0.5px" }}>Mealheiro</h1>
          <p style={{ margin:0, color:C.muted, fontSize:15 }}>Finanças da família</p>
        </div>

        {passo === "inicio" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <button onClick={()=>setPasso("login")} style={btnPrimary}>Entrar</button>
            <button onClick={()=>setPasso("registo")} style={btnSecondary}>Criar conta nova</button>
            <button onClick={()=>setPasso("juntar")} style={{...btnSecondary, marginTop:4}}>Juntar a uma casa existente</button>
          </div>
        )}

        {passo === "login" && (
          <Card>
            <h3 style={{ margin:"0 0 18px", fontSize:18, fontWeight:800 }}>Entrar</h3>
            <input placeholder="Utilizador" value={username} onChange={e=>setUsername(e.target.value)} style={inputStyle} />
            <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&fazerLogin()} style={inputStyle} />
            {erro && <p style={{ color:C.expense, fontSize:13, marginBottom:10 }}>{erro}</p>}
            <button onClick={fazerLogin} disabled={loading} style={btnPrimary}>{loading?"A entrar…":"Entrar"}</button>
            <button onClick={()=>{setPasso("inicio");setErro("");}} style={btnSecondary}>Voltar</button>
          </Card>
        )}

        {passo === "registo" && (
          <Card>
            <h3 style={{ margin:"0 0 6px", fontSize:18, fontWeight:800 }}>🏠 Nova conta</h3>
            <p style={{ margin:"0 0 16px", fontSize:13, color:C.muted }}>Cria a tua conta e uma casa nova. Partilha o código com a família.</p>
            <input placeholder="Utilizador (ex: luis)" value={username} onChange={e=>setUsername(e.target.value)} style={inputStyle} />
            <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} style={inputStyle} />
            {erro && <p style={{ color:C.expense, fontSize:13, marginBottom:10 }}>{erro}</p>}
            <button onClick={()=>registar(false)} disabled={loading} style={btnPrimary}>{loading?"A criar…":"Criar conta e casa"}</button>
            <button onClick={()=>{setPasso("inicio");setErro("");}} style={btnSecondary}>Voltar</button>
          </Card>
        )}

        {passo === "juntar" && (
          <Card>
            <h3 style={{ margin:"0 0 6px", fontSize:18, fontWeight:800 }}>🔑 Juntar a uma casa</h3>
            <p style={{ margin:"0 0 16px", fontSize:13, color:C.muted }}>Cria a tua conta e junta-te à casa da família com o código.</p>
            <input placeholder="Utilizador (ex: ines)" value={username} onChange={e=>setUsername(e.target.value)} style={inputStyle} />
            <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} style={inputStyle} />
            <input placeholder="Código da casa (ex: ABC-XYZ)" value={codigoCasa} onChange={e=>setCodigoCasa(e.target.value.toUpperCase())} style={{...inputStyle, letterSpacing:2, fontWeight:700}} />
            {erro && <p style={{ color:C.expense, fontSize:13, marginBottom:10 }}>{erro}</p>}
            <button onClick={()=>registar(true)} disabled={loading} style={btnPrimary}>{loading?"A entrar…":"Criar conta e entrar"}</button>
            <button onClick={()=>{setPasso("inicio");setErro("");}} style={btnSecondary}>Voltar</button>
          </Card>
        )}
      </div>
    </div>
  );
}

const TABS = ["Resumo", "Transações", "Orçamentos", "Metas", "Compras", "Bebé", "Prendas", "Relatórios"];

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = ainda não sabemos, null = sem sessão
  const [user, setUser] = useState(undefined); // undefined = a verificar, null = sem sessão, {..} = autenticado

  const [tab, setTab] = useState("Resumo");
  const [txs, setTxs] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [goals, setGoals] = useState([]);
  const [lista, setLista] = useState([]); // [{produto, quantidade}]
  const [stock, setStock] = useState([]);
  const [desejos, setDesejos] = useState([]);
  const [customProds, setCustomProds] = useState({}); // { categoria: [produtos] }
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [avisos, setAvisos] = useState([]);
  const [notifOn, setNotifOn] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready.then(reg => reg.pushManager.getSubscription()).then(sub => setNotifOn(!!sub)).catch(()=>{});
  }, []);

  const casaCodigo = user?.casa_codigo;

  // Segue a sessão do Supabase Auth — login/registo/logout mexem só na sessão,
  // isto reage e carrega o utilizador da casa correspondente.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    if (!session) { setUser(null); return; }
    // Se já temos o utilizador certo carregado (ex: apenas o token foi renovado
    // automaticamente), não voltamos a mostrar o ecrã de loading nem a repetir o pedido.
    if (user && user.id !== undefined && session.user.id === user.auth_id) return;
    setLoading(true);
    supabase.from("utilizadores").select("id,username,casa_codigo,auth_id").eq("auth_id", session.user.id).single()
      .then(({ data }) => setUser(data || null));
  }, [session]);

  async function loadAll(isFirstLoad = false) {
    if (!casaCodigo) return;
    setSyncing(true);
    const [tr, br, gr, lr, sr, cr, dr] = await Promise.all([
      supabase.from("transacoes").select("*").eq("casa_codigo", casaCodigo).order("id", { ascending: false }),
      supabase.from("orcamentos").select("*").eq("casa_codigo", casaCodigo),
      supabase.from("metas").select("*").eq("casa_codigo", casaCodigo),
      supabase.from("lista_compras").select("*").eq("casa_codigo", casaCodigo).order("id", { ascending: false }),
      supabase.from("stock_bebe").select("*").eq("casa_codigo", casaCodigo),
      supabase.from("custom_produtos").select("*").eq("casa_codigo", casaCodigo),
      supabase.from("desejos").select("*").eq("casa_codigo", casaCodigo).order("id", { ascending: false }),
    ]);
    const t = tr.data || [], b = br.data || [], g = gr.data || [], l = lr.data || [], s = sr.data || [], c = cr.data || [], d = dr.data || [];

    // Detect changes since last visit
    if (isFirstLoad) {
      const lastVisit = localStorage.getItem("ml_last_visit");
      if (lastVisit) {
        const novos = [];
        const txsNovos = t.filter(tx => tx.pessoa !== user.username && new Date(tx.created_at) > new Date(lastVisit));
        txsNovos.forEach(tx => novos.push(`${tx.pessoa} adicionou uma ${tx.tipo === "receita" ? "receita" : "despesa"}: ${tx.descricao || tx.categoria} (${parseFloat(tx.valor).toFixed(2)}€)`));
        const listaNova = l.filter(item => new Date(item.created_at) > new Date(lastVisit) && (!item.adicionado_por || item.adicionado_por !== user.username));
        if (listaNova.length > 0) novos.push(`A lista de compras foi atualizada — ${listaNova.length} produto${listaNova.length>1?"s adicionados":" adicionado"}`);
        if (novos.length > 0) setAvisos(novos);
      }
    }

    const cpMap = {};
    c.forEach(row => { cpMap[row.categoria] = [...(cpMap[row.categoria]||[]), row.produto]; });

    // Save last visit AFTER we've seen everything
    localStorage.setItem("ml_last_visit", new Date().toISOString());
    setTxs(t); setBudgets(b); setGoals(g); setLista(l); setStock(s); setCustomProds(cpMap); setDesejos(d);
    setLoading(false); setSyncing(false);
  }

  useEffect(() => { if (user) loadAll(true); }, [casaCodigo]);

  // Ouve alterações feitas por outras pessoas da casa (ex: Luis adiciona, Ines vê logo)
  useEffect(() => {
    if (!casaCodigo) return;
    const tabelas = ["transacoes", "orcamentos", "metas", "lista_compras", "stock_bebe", "custom_produtos", "desejos"];
    const channel = supabase.channel(`casa-${casaCodigo}`);
    tabelas.forEach(tabela => {
      channel.on("postgres_changes", { event: "*", schema: "public", table: tabela, filter: `casa_codigo=eq.${casaCodigo}` }, () => loadAll(false));
    });
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [casaCodigo]);

  // Save last_visit when user leaves the app, e atualiza dados quando volta a ficar visível
  useEffect(() => {
    function handleHide() {
      if (document.hidden) { localStorage.setItem("ml_last_visit", new Date().toISOString()); }
      else if (casaCodigo) { loadAll(false); }
    }
    document.addEventListener("visibilitychange", handleHide);
    return () => document.removeEventListener("visibilitychange", handleHide);
  }, [casaCodigo]);

  async function sair() {
    await supabase.auth.signOut();
    setTxs([]); setBudgets([]); setGoals([]); setLista([]); setStock([]); setCustomProds({}); setDesejos([]);
  }

  const now = new Date();
  const curMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const monthTxs = useMemo(() => txs.filter(t => monthKey(t.data) === curMonth), [txs, curMonth]);
  const receitas = useMemo(() => monthTxs.filter(t=>t.tipo==="receita").reduce((s,t)=>s+parseFloat(t.valor),0), [monthTxs]);
  const despesas = useMemo(() => monthTxs.filter(t=>t.tipo==="despesa").reduce((s,t)=>s+parseFloat(t.valor),0), [monthTxs]);

  async function addTx(tx) {
    const { data, error } = await supabase.from("transacoes").insert({...tx, casa_codigo:casaCodigo, pessoa:user.username}).select();
    if (error) { alert("Erro ao guardar transação: " + error.message); return; }
    if (data && data[0]) setTxs(p=>[data[0],...p]);
    setShowForm(false);
  }
  async function deleteTx(id) {
    const { error } = await supabase.from("transacoes").delete().eq("id", id);
    if (error) { alert("Erro ao remover transação: " + error.message); return; }
    setTxs(p=>p.filter(t=>t.id!==id));
  }
  async function saveBudget(categoria, limite) {
    const { error } = await supabase.from("orcamentos").upsert({categoria, limite, casa_codigo:casaCodigo}, { onConflict: "casa_codigo,categoria" });
    if (error) { alert("Erro ao guardar orçamento: " + error.message); return; }
    setBudgets(p=>{ const ex=p.find(b=>b.categoria===categoria); return ex?p.map(b=>b.categoria===categoria?{...b,limite}:b):[...p,{categoria,limite}]; });
  }
  async function addGoal(g) {
    const { data, error } = await supabase.from("metas").insert({...g, casa_codigo:casaCodigo}).select();
    if (error) { alert("Erro ao criar meta: " + error.message); return; }
    if (data && data[0]) setGoals(p=>[...p,data[0]]);
  }
  async function updateGoal(id, patch) {
    const { error } = await supabase.from("metas").update(patch).eq("id", id);
    if (error) { alert("Erro ao atualizar meta: " + error.message); return; }
    setGoals(p=>p.map(g=>g.id===id?{...g,...patch}:g));
  }
  async function deleteGoal(id) {
    const { error } = await supabase.from("metas").delete().eq("id", id);
    if (error) { alert("Erro ao remover meta: " + error.message); return; }
    setGoals(p=>p.filter(g=>g.id!==id));
  }

  if (session === undefined || user === undefined) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <Spinner />
    </div>
  );

  if (!user) return <EcraLogin />;

  if (loading) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16, fontFamily:"system-ui" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ fontSize:44 }}>🐷</div>
      <p style={{ color:C.muted, fontSize:14, margin:0 }}>A carregar…</p>
      <Spinner />
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'Inter',system-ui,sans-serif", color:C.text }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } * { box-sizing: border-box; }`}</style>
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, padding:"0 20px", position:"sticky", top:0, zIndex:10 }}>
        <div style={{ maxWidth:860, margin:"0 auto" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 0 10px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:24 }}>🐷</span>
              <div>
                <h1 style={{ margin:0, fontSize:17, fontWeight:800, letterSpacing:"-0.4px" }}>Mealheiro</h1>
                <p style={{ margin:0, fontSize:11, color:C.muted }}>{user.username} · {MESES[now.getMonth()]} {now.getFullYear()}</p>
              </div>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <button onClick={()=>loadAll(false)} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 10px", cursor:"pointer", display:"flex", alignItems:"center" }}>{syncing?<Spinner />:<span style={{ fontSize:14, color:C.muted }}>↻</span>}</button>
              <button onClick={async()=>{ const ok = await ativarLembretes(user.username, casaCodigo, user.auth_id); if (ok) { setNotifOn(true); alert("Lembretes ativados! Vais receber uma notificação ao meio-dia e às 21h se ainda não tiveres registado nada nesse dia."); } }} style={{ background:notifOn?C.text:"none", color:notifOn?"#fff":C.muted, border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 10px", cursor:"pointer", fontSize:14 }} title="Ativar lembretes diários">{notifOn?"🔔":"🔕"}</button>
              <button onClick={sair} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 10px", cursor:"pointer", fontSize:12, color:C.muted }}>Sair</button>
              <button onClick={()=>setShowForm(true)} style={{ background:C.text, color:"#fff", border:"none", borderRadius:10, padding:"9px 18px", cursor:"pointer", fontWeight:700, fontSize:13 }}>+ Adicionar</button>
            </div>
          </div>
          <div style={{ display:"flex", overflowX:"auto" }}>
            {TABS.map(t=><button key={t} onClick={()=>setTab(t)} style={{ background:"none", border:"none", borderBottom:tab===t?`2px solid ${C.text}`:"2px solid transparent", color:tab===t?C.text:C.muted, padding:"10px 12px", cursor:"pointer", fontWeight:tab===t?700:400, fontSize:13, whiteSpace:"nowrap" }}>{t}{t==="Compras"&&lista.length>0?` (${lista.length})`:""}</button>)}
          </div>
        </div>
      </div>

      {avisos.length > 0 && (
        <div style={{ background:"#FEF3C7", borderBottom:"1px solid #FDE68A", padding:"12px 20px" }}>
          <div style={{ maxWidth:860, margin:"0 auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <p style={{ margin:"0 0 4px", fontSize:12, fontWeight:700, color:"#92400E" }}>🔔 Novidades desde a última vez</p>
                {avisos.map((a,i) => <p key={i} style={{ margin:"2px 0", fontSize:13, color:"#78350F" }}>• {a}</p>)}
              </div>
              <button onClick={()=>setAvisos([])} style={{ background:"none", border:"none", cursor:"pointer", color:"#92400E", fontSize:16, padding:"0 0 0 12px", flexShrink:0 }}>✕</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ maxWidth:860, margin:"0 auto", padding:"24px 16px" }}>
        {showForm && <TransacaoModal username={user.username} onClose={()=>setShowForm(false)} onSave={addTx} />}
        {tab==="Resumo" && <Resumo monthTxs={monthTxs} receitas={receitas} despesas={despesas} casaCodigo={casaCodigo} username={user.username} />}
        {tab==="Transações" && <Transacoes txs={txs} onDelete={deleteTx} />}
        {tab==="Orçamentos" && <Orcamentos monthTxs={monthTxs} budgets={budgets} onSave={saveBudget} />}
        {tab==="Metas" && <Metas goals={goals} onAdd={addGoal} onUpdate={updateGoal} onDelete={deleteGoal} />}
        {tab==="Compras" && <ListaCompras lista={lista} setLista={setLista} casaCodigo={casaCodigo} username={user.username} customProds={customProds} setCustomProds={setCustomProds} />}
        {tab==="Bebé" && <StockBebe stock={stock} setStock={setStock} casaCodigo={casaCodigo} lista={lista} setLista={setLista} username={user.username} />}
        {tab==="Prendas" && <Prendas desejos={desejos} setDesejos={setDesejos} casaCodigo={casaCodigo} username={user.username} />}
        {tab==="Relatórios" && <Relatorios txs={txs} now={now} />}
      </div>
    </div>
  );
}

function TransacaoModal({ username, onClose, onSave }) {
  const [f, setF] = useState({ tipo:"despesa", valor:"", categoria:"Alimentação", descricao:"", data:today() });
  const [saving, setSaving] = useState(false);
  const set = k => v => setF(p=>({...p,[k]:v}));
  async function save() { if (!f.valor||isNaN(parseFloat(f.valor))) return; setSaving(true); await onSave({tipo:f.tipo,valor:parseFloat(f.valor),categoria:f.categoria,descricao:f.descricao,data:f.data}); setSaving(false); }
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(28,25,23,0.55)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={onClose}>
      <div style={{ background:C.surface, borderRadius:20, padding:28, width:"100%", maxWidth:360, border:`1px solid ${C.border}` }} onClick={e=>e.stopPropagation()}>
        <h3 style={{ margin:"0 0 4px", fontSize:17, fontWeight:800 }}>Nova Transação</h3>
        <p style={{ margin:"0 0 16px", fontSize:12, color:C.muted }}>A registar como <strong>{username}</strong></p>
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          {[["despesa","🔴 Despesa"],["receita","🟢 Receita"]].map(([val,label])=>(
            <button key={val} onClick={()=>setF(p=>({...p,tipo:val,categoria:CATEGORIAS[val][0]}))} style={{ flex:1, padding:"9px 0", borderRadius:10, border:`1.5px solid ${f.tipo===val?C.text:C.border}`, background:f.tipo===val?C.text:"none", color:f.tipo===val?"#fff":C.muted, cursor:"pointer", fontWeight:700, fontSize:13 }}>{label}</button>
          ))}
        </div>
        {[{l:"Valor (€)",k:"valor",t:"number",ph:"0,00"},{l:"Descrição",k:"descricao",t:"text",ph:"Ex: Supermercado"},{l:"Data",k:"data",t:"date"}].map(({l,k,t,ph})=>(
          <div key={k} style={{ marginBottom:12 }}>
            <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.muted, marginBottom:4 }}>{l}</label>
            <input type={t} placeholder={ph} value={f[k]} onChange={e=>set(k)(e.target.value)} style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1.5px solid ${C.border}`, background:C.bg, color:C.text, fontSize:14, outline:"none" }} />
          </div>
        ))}
        <div style={{ marginBottom:18 }}>
          <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.muted, marginBottom:4 }}>Categoria</label>
          <select value={f.categoria} onChange={e=>set("categoria")(e.target.value)} style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1.5px solid ${C.border}`, background:C.bg, color:C.text, fontSize:14 }}>
            {CATEGORIAS[f.tipo].map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={onClose} style={{ flex:1, padding:"11px 0", borderRadius:10, border:`1.5px solid ${C.border}`, background:"none", color:C.muted, cursor:"pointer", fontWeight:600 }}>Cancelar</button>
          <button onClick={save} disabled={saving} style={{ flex:2, padding:"11px 0", borderRadius:10, border:"none", background:C.text, color:"#fff", cursor:"pointer", fontWeight:700, fontSize:14, opacity:saving?0.7:1 }}>{saving?"A guardar…":"Guardar"}</button>
        </div>
      </div>
    </div>
  );
}

function Resumo({ monthTxs, receitas, despesas, casaCodigo, username }) {
  const saldo = receitas - despesas;
  const [membros, setMembros] = useState([]);
  const [showCodigo, setShowCodigo] = useState(false);

  useEffect(() => {
    if (!casaCodigo) return;
    function carregar() {
      supabase.from("utilizadores").select("*").eq("casa_codigo", casaCodigo).then(({ data }) => setMembros(data || []));
    }
    carregar();
    const channel = supabase.channel(`membros-${casaCodigo}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "utilizadores", filter: `casa_codigo=eq.${casaCodigo}` }, carregar)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [casaCodigo]);

  const contrib = useMemo(() => {
    const m = {};
    membros.forEach(mb => { m[mb.username] = monthTxs.filter(t=>t.tipo==="receita"&&t.pessoa===mb.username).reduce((s,t)=>s+parseFloat(t.valor),0); });
    return m;
  }, [monthTxs, membros]);
  const totalContrib = Object.values(contrib).reduce((s,v)=>s+v,0);

  const expByCat = useMemo(() => {
    const m={};
    monthTxs.filter(t=>t.tipo==="despesa").forEach(t=>{m[t.categoria]=(m[t.categoria]||0)+parseFloat(t.valor);});
    return Object.entries(m).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
  }, [monthTxs]);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
        {[{l:"Receitas",v:receitas,c:C.income,icon:"↑"},{l:"Despesas",v:despesas,c:C.expense,icon:"↓"},{l:"Saldo",v:saldo,c:saldo>=0?C.income:C.expense,icon:"="}].map(({l,v,c,icon})=>(
          <Card key={l} style={{ padding:"14px 16px" }}>
            <p style={{ margin:"0 0 4px", fontSize:10, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:0.8 }}>{icon} {l}</p>
            <p style={{ margin:0, fontSize:18, fontWeight:800, color:c, letterSpacing:"-0.5px" }}>{fmt(v)}</p>
          </Card>
        ))}
      </div>

      <Card style={{ padding:"12px 18px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <p style={{ margin:0, fontSize:12, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:0.8 }}>Código da casa</p>
            {showCodigo ? <p style={{ margin:"4px 0 0", fontSize:20, fontWeight:800, letterSpacing:3, color:C.text }}>{casaCodigo}</p> : <p style={{ margin:"4px 0 0", fontSize:13, color:C.muted }}>Partilha com a tua família para se juntarem</p>}
          </div>
          <button onClick={()=>setShowCodigo(s=>!s)} style={{ padding:"7px 14px", borderRadius:9, border:`1.5px solid ${C.border}`, background:"none", color:C.text, cursor:"pointer", fontSize:13, fontWeight:600 }}>{showCodigo?"Esconder":"Ver código"}</button>
        </div>
        {membros.length > 0 && (
          <div style={{ marginTop:8, display:"flex", flexWrap:"wrap", gap:6 }}>
            {membros.map(m => (
              <span key={m.id} onClick={async () => {
                if (m.username === username) return alert("Não podes remover a tua própria conta.");
                if (window.confirm(`Remover o membro "${m.username}"?`)) {
                  const { error } = await supabase.rpc("remover_membro", { p_utilizador_id: m.id });
                  if (error) { alert("Erro ao remover membro: " + error.message); return; }
                  setMembros(prev => prev.filter(x => x.id !== m.id));
                }
              }} style={{ fontSize:12, color:C.muted, background:C.faint, borderRadius:99, padding:"3px 10px", cursor: m.username===username?"default":"pointer", border:`1px solid ${C.border}` }}>
                👤 {m.username}{m.username !== username ? " ✕" : ""}
              </span>
            ))}
          </div>
        )}
      </Card>

      {membros.length > 1 && (
        <Card>
          <p style={{ margin:"0 0 12px", fontSize:12, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:0.8 }}>Contribuições este mês</p>
          {membros.map((mb,i)=>{
            const v=contrib[mb.username]||0;
            const pct=totalContrib>0?(v/totalContrib)*100:0;
            const color=CAT_COLORS[i%CAT_COLORS.length];
            return (
              <div key={mb.username} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:24, height:24, borderRadius:"50%", background:color+"22", border:`2px solid ${color}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color }}>{mb.username[0].toUpperCase()}</div>
                    <span style={{ fontSize:14, fontWeight:600 }}>{mb.username}</span>
                    {mb.username===username && <span style={{ fontSize:10, fontWeight:700, background:color+"22", color, borderRadius:6, padding:"1px 6px" }}>Tu</span>}
                  </div>
                  <span style={{ fontSize:14, fontWeight:700, color }}>{fmt(v)}</span>
                </div>
                <ProgressBar pct={pct} color={color} height={5} />
              </div>
            );
          })}
          {totalContrib===0 && <p style={{ color:C.muted, fontSize:13, textAlign:"center" }}>Nenhuma receita este mês.</p>}
        </Card>
      )}

      {expByCat.length > 0 && (
        <Card>
          <p style={{ margin:"0 0 14px", fontSize:12, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:0.8 }}>Despesas por categoria</p>
          <div style={{ display:"flex", gap:16, alignItems:"center" }}>
            <ResponsiveContainer width={130} height={130}>
              <PieChart><Pie data={expByCat} cx="50%" cy="50%" innerRadius={35} outerRadius={62} paddingAngle={2} dataKey="value" strokeWidth={0}>{expByCat.map((_,i)=><Cell key={i} fill={CAT_COLORS[i%CAT_COLORS.length]} />)}</Pie></PieChart>
            </ResponsiveContainer>
            <div style={{ flex:1 }}>
              {expByCat.slice(0,5).map((item,i)=>(
                <div key={item.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:CAT_COLORS[i%CAT_COLORS.length] }} />
                    <span style={{ fontSize:13, color:C.muted }}>{item.name}</span>
                  </div>
                  <span style={{ fontSize:13, fontWeight:700 }}>{fmt(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      <Card>
        <p style={{ margin:"0 0 12px", fontSize:12, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:0.8 }}>Últimas transações</p>
        {monthTxs.length===0
          ? <p style={{ color:C.muted, fontSize:13, textAlign:"center", padding:"16px 0" }}>Nenhuma transação este mês.</p>
          : monthTxs.slice(0,6).map(t=>(
            <div key={t.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:`1px solid ${C.faint}` }}>
              <div style={{ width:36, height:36, borderRadius:10, background:t.tipo==="receita"?C.income+"18":C.expense+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>{t.tipo==="receita"?"💚":"🔴"}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ margin:0, fontSize:14, fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{t.descricao||t.categoria}</p>
                <p style={{ margin:"1px 0 0", fontSize:11, color:C.muted }}>{t.categoria} · {t.data} · <strong>{t.pessoa||""}</strong></p>
              </div>
              <span style={{ fontWeight:800, fontSize:14, color:t.tipo==="receita"?C.income:C.expense, flexShrink:0 }}>{t.tipo==="receita"?"+":"-"}{fmt(t.valor)}</span>
            </div>
          ))
        }
      </Card>
    </div>
  );
}

function Transacoes({ txs, onDelete }) {
  const [filtro, setFiltro] = useState("todos");
  const [search, setSearch] = useState("");
  const lista = txs.filter(t=>(filtro==="todos"||t.tipo===filtro)&&(!search||(t.descricao+t.categoria).toLowerCase().includes(search.toLowerCase())));
  return (
    <Card>
      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar…" style={{ flex:1, minWidth:140, padding:"8px 12px", borderRadius:9, border:`1.5px solid ${C.border}`, background:C.bg, color:C.text, fontSize:13, outline:"none" }} />
        {["todos","receita","despesa"].map(f=>(
          <button key={f} onClick={()=>setFiltro(f)} style={{ padding:"7px 12px", borderRadius:9, border:`1.5px solid ${filtro===f?C.text:C.border}`, background:filtro===f?C.text:"none", color:filtro===f?"#fff":C.muted, cursor:"pointer", fontSize:12, fontWeight:600 }}>{f==="todos"?"Todos":f==="receita"?"Receitas":"Despesas"}</button>
        ))}
      </div>
      {lista.length===0
        ? <p style={{ color:C.muted, textAlign:"center", padding:"20px 0", fontSize:13 }}>Nenhuma transação encontrada.</p>
        : lista.map(t=>(
          <div key={t.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:`1px solid ${C.faint}` }}>
            <div style={{ width:36, height:36, borderRadius:10, background:t.tipo==="receita"?C.income+"18":C.expense+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>{t.tipo==="receita"?"💚":"🔴"}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ margin:0, fontSize:14, fontWeight:500 }}>{t.descricao||t.categoria}</p>
              <p style={{ margin:"2px 0 0", fontSize:11, color:C.muted }}>{t.categoria} · {t.data} · <strong>{t.pessoa||""}</strong></p>
            </div>
            <span style={{ fontWeight:800, fontSize:14, color:t.tipo==="receita"?C.income:C.expense, marginRight:8, flexShrink:0 }}>{t.tipo==="receita"?"+":"-"}{fmt(t.valor)}</span>
            <button onClick={()=>onDelete(t.id)} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:7, color:C.muted, cursor:"pointer", padding:"5px 9px", fontSize:12, flexShrink:0 }}>✕</button>
          </div>
        ))
      }
    </Card>
  );
}

function Orcamentos({ monthTxs, budgets, onSave }) {
  const getLimit = cat => { const b=budgets.find(b=>b.categoria===cat); return b?parseFloat(b.limite):0; };
  const [locals, setLocals] = useState({});
  // Se outra pessoa mudar um orçamento, esquece o valor que estava a ser editado
  // localmente para o input voltar a refletir o que está guardado.
  useEffect(() => { setLocals({}); }, [budgets]);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      <p style={{ margin:"0 0 8px", color:C.muted, fontSize:13 }}>Define limites mensais por categoria.</p>
      {CATEGORIAS.despesa.map((cat,i)=>{
        const spent=monthTxs.filter(t=>t.tipo==="despesa"&&t.categoria===cat).reduce((s,t)=>s+parseFloat(t.valor),0);
        const limit=locals[cat]!==undefined?locals[cat]:getLimit(cat);
        const pct=limit>0?(spent/limit)*100:0;
        const over=limit>0&&spent>limit;
        const color=over?C.expense:CAT_COLORS[i%CAT_COLORS.length];
        return (
          <Card key={cat} style={{ padding:"14px 18px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <span style={{ fontSize:14, fontWeight:600 }}>{cat}</span>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:13, color:over?C.expense:C.muted }}>{fmt(spent)}</span>
                <span style={{ color:C.border }}>/</span>
                <input type="number" value={limit||""} placeholder="sem limite" onChange={e=>setLocals(l=>({...l,[cat]:parseFloat(e.target.value)||0}))} onBlur={()=>{if(locals[cat]!==undefined)onSave(cat,locals[cat]);}} style={{ width:85, padding:"5px 8px", borderRadius:8, border:`1.5px solid ${C.border}`, background:C.bg, color:C.text, fontSize:13, textAlign:"right", outline:"none" }} />
                <span style={{ fontSize:12, color:C.muted }}>€</span>
              </div>
            </div>
            <ProgressBar pct={pct} color={color} />
            {over&&<p style={{ margin:"5px 0 0", fontSize:11, color:C.expense, fontWeight:600 }}>⚠ Excedido em {fmt(spent-limit)}</p>}
          </Card>
        );
      })}
    </div>
  );
}

function Metas({ goals, onAdd, onUpdate, onDelete }) {
  const [showAdd, setShowAdd] = useState(false);
  const [f, setF] = useState({nome:"",objetivo:"",atual:"",prazo:""});
  const [deposits, setDeposits] = useState({});
  const [saving, setSaving] = useState(false);
  async function addGoal() { if(!f.nome||!f.objetivo) return; setSaving(true); await onAdd({nome:f.nome,objetivo:parseFloat(f.objetivo),atual:parseFloat(f.atual)||0,prazo:f.prazo||null}); setF({nome:"",objetivo:"",atual:"",prazo:""}); setShowAdd(false); setSaving(false); }
  async function deposit(goal) { const amt=parseFloat(deposits[goal.id]); if(!amt) return; const novo=Math.min(parseFloat(goal.atual)+amt,parseFloat(goal.objetivo)); await onUpdate(goal.id,{atual:novo}); setDeposits(d=>({...d,[goal.id]:""})); }
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <p style={{ margin:0, color:C.muted, fontSize:13 }}>Metas de poupança da família.</p>
        <button onClick={()=>setShowAdd(s=>!s)} style={{ background:C.text, color:"#fff", border:"none", borderRadius:9, padding:"8px 14px", cursor:"pointer", fontWeight:700, fontSize:13 }}>+ Nova Meta</button>
      </div>
      {showAdd && (
        <Card style={{ marginBottom:16 }}>
          <h4 style={{ margin:"0 0 14px", fontSize:15, fontWeight:700 }}>Nova Meta de Poupança</h4>
          {[{l:"Nome",k:"nome",t:"text",ph:"Ex: Férias no Algarve"},{l:"Objetivo (€)",k:"objetivo",t:"number",ph:"3000"},{l:"Já poupado (€)",k:"atual",t:"number",ph:"0"},{l:"Prazo",k:"prazo",t:"date"}].map(({l,k,t,ph})=>(
            <div key={k} style={{ marginBottom:12 }}>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.muted, marginBottom:4 }}>{l}</label>
              <input type={t} placeholder={ph} value={f[k]} onChange={e=>setF(p=>({...p,[k]:e.target.value}))} style={{ width:"100%", padding:"9px 12px", borderRadius:9, border:`1.5px solid ${C.border}`, background:C.bg, color:C.text, fontSize:14, outline:"none" }} />
            </div>
          ))}
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>setShowAdd(false)} style={{ flex:1, padding:"9px 0", borderRadius:9, border:`1.5px solid ${C.border}`, background:"none", color:C.muted, cursor:"pointer" }}>Cancelar</button>
            <button onClick={addGoal} disabled={saving} style={{ flex:2, padding:"9px 0", borderRadius:9, border:"none", background:C.text, color:"#fff", cursor:"pointer", fontWeight:700, opacity:saving?0.7:1 }}>{saving?"A guardar…":"Guardar"}</button>
          </div>
        </Card>
      )}
      {goals.length===0&&!showAdd&&<p style={{ color:C.muted, textAlign:"center", padding:"30px 0", fontSize:13 }}>Nenhuma meta ainda.</p>}
      {goals.map((goal,i)=>{
        const pct=Math.round((parseFloat(goal.atual)/parseFloat(goal.objetivo))*100);
        const done=pct>=100;
        const color=done?C.income:CAT_COLORS[i%CAT_COLORS.length];
        return (
          <Card key={goal.id} style={{ marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
              <div><p style={{ margin:0, fontSize:15, fontWeight:700 }}>{goal.nome}</p>{goal.prazo&&<p style={{ margin:"2px 0 0", fontSize:11, color:C.muted }}>Prazo: {goal.prazo}</p>}</div>
              <div style={{ textAlign:"right" }}><p style={{ margin:0, fontSize:16, fontWeight:800, color }}>{pct}%</p><p style={{ margin:"1px 0 0", fontSize:11, color:C.muted }}>{fmt(goal.atual)} / {fmt(goal.objetivo)}</p></div>
            </div>
            <ProgressBar pct={pct} color={color} height={8} />
            {done?<p style={{ margin:"10px 0 0", fontSize:13, color:C.income, fontWeight:700 }}>🎉 Meta atingida!</p>:(
              <div style={{ display:"flex", gap:8, marginTop:12 }}>
                <input type="number" placeholder="Adicionar €" value={deposits[goal.id]||""} onChange={e=>setDeposits(d=>({...d,[goal.id]:e.target.value}))} style={{ flex:1, padding:"8px 10px", borderRadius:9, border:`1.5px solid ${C.border}`, background:C.bg, color:C.text, fontSize:13, outline:"none" }} />
                <button onClick={()=>deposit(goal)} style={{ padding:"8px 16px", borderRadius:9, border:"none", background:C.text, color:"#fff", cursor:"pointer", fontWeight:600, fontSize:13 }}>+ Poupar</button>
                <button onClick={()=>onDelete(goal.id)} style={{ padding:"8px 10px", borderRadius:9, border:`1.5px solid ${C.border}`, background:"none", color:C.muted, cursor:"pointer", fontSize:12 }}>✕</button>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function ListaCompras({ lista, setLista, casaCodigo, username, customProds, setCustomProds }) {
  const [view, setView] = useState("selecionar");
  const [search, setSearch] = useState("");
  const [catAberta, setCatAberta] = useState(null);
  const [addingTo, setAddingTo] = useState(null);
  const [novoNome, setNovoNome] = useState("");

  const listaAtiva = lista.map(r => r.produto);
  const qtdMap = useMemo(() => { const m={}; lista.forEach(r=>{ if(r.quantidade) m[r.produto]=r.quantidade; }); return m; }, [lista]);

  const catalogoCompleto = useMemo(()=>{
    const base={...LISTA_PRODUTOS};
    Object.entries(customProds).forEach(([cat,prods])=>{ base[cat]=[...(base[cat]||[]),...prods]; });
    // Add any lista items not in any category to "Outros"
    const todosNosCats = Object.values(base).flat();
    const foraDosCats = listaAtiva.filter(p => !todosNosCats.includes(p));
    if (foraDosCats.length > 0) base["➕ Outros"] = [...(base["➕ Outros"]||[]), ...foraDosCats];
    return base;
  },[customProds, listaAtiva]);

  async function toggle(p) {
    if (listaAtiva.includes(p)) {
      const { error } = await supabase.from("lista_compras").delete().eq("casa_codigo", casaCodigo).eq("produto", p);
      if (error) { alert("Erro: " + error.message); return; }
      setLista(l=>l.filter(r=>r.produto!==p));
    } else {
      const { data, error } = await supabase.from("lista_compras").insert({casa_codigo:casaCodigo, produto:p, quantidade:null, adicionado_por:username}).select();
      if (error) { alert("Erro: " + error.message); return; }
      if (data && data[0]) setLista(l=>[...l, data[0]]);
    }
  }

  async function comprado(p) {
    const { error } = await supabase.from("lista_compras").delete().eq("casa_codigo", casaCodigo).eq("produto", p);
    if (error) { alert("Erro: " + error.message); return; }
    setLista(l=>l.filter(r=>r.produto!==p));
  }

  async function limpar() {
    if (window.confirm("Limpar toda a lista?")) {
      const { error } = await supabase.from("lista_compras").delete().eq("casa_codigo", casaCodigo);
      if (error) { alert("Erro: " + error.message); return; }
      setLista([]);
    }
  }

  async function atualizarQtd(p, qtd) {
    const { error } = await supabase.from("lista_compras").update({quantidade:qtd}).eq("casa_codigo", casaCodigo).eq("produto", p);
    if (error) { alert("Erro: " + error.message); return; }
    setLista(l=>l.map(r=>r.produto===p?{...r,quantidade:qtd}:r));
  }

  async function adicionarProduto(cat) {
    const n=novoNome.trim(); if(!n) return;
    const { error: erroCustom } = await supabase.from("custom_produtos").insert({casa_codigo:casaCodigo, categoria:cat, produto:n});
    if (erroCustom) { alert("Erro ao adicionar produto: " + erroCustom.message); return; }
    setCustomProds(prev=>({...prev,[cat]:[...(prev[cat]||[]),n]}));
    const { data, error } = await supabase.from("lista_compras").insert({casa_codigo:casaCodigo, produto:n, quantidade:null, adicionado_por:username}).select();
    if (error) { alert("Erro ao adicionar à lista: " + error.message); return; }
    if (data && data[0]) setLista(l=>[...l,data[0]]);
    setNovoNome(""); setAddingTo(null);
  }

  async function removerCustom(cat, prod) {
    const { error } = await supabase.from("custom_produtos").delete().eq("casa_codigo", casaCodigo).eq("categoria", cat).eq("produto", prod);
    if (error) { alert("Erro ao remover produto: " + error.message); return; }
    setCustomProds(prev=>({...prev,[cat]:(prev[cat]||[]).filter(p=>p!==prod)}));
    comprado(prod);
  }

  const produtosFiltrados = search ? Object.entries(catalogoCompleto).reduce((acc,[cat,prods])=>{ const f=prods.filter(p=>p.toLowerCase().includes(search.toLowerCase())); if(f.length) acc[cat]=f; return acc; },{}) : catalogoCompleto;

  if (view==="ir_compras") {
    const porCat = Object.entries(catalogoCompleto).reduce((acc,[cat,prods])=>{ const ativos=prods.filter(p=>listaAtiva.includes(p)); if(ativos.length) acc[cat]=ativos; return acc; },{});
    return (
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div><h2 style={{ margin:0, fontSize:17, fontWeight:800 }}>🛒 Lista de Compras</h2><p style={{ margin:"2px 0 0", fontSize:12, color:C.muted }}>{lista.length} produto{lista.length!==1?"s":""} para comprar</p></div>
          <button onClick={()=>setView("selecionar")} style={{ background:"none", border:`1.5px solid ${C.border}`, borderRadius:9, padding:"7px 14px", cursor:"pointer", fontSize:13, color:C.muted, fontWeight:600 }}>← Editar</button>
        </div>
        {lista.length===0?<Card><p style={{ color:C.muted, textAlign:"center", padding:"20px 0" }}>Lista vazia!</p></Card>:Object.entries(porCat).map(([cat,prods])=>(
          <Card key={cat} style={{ marginBottom:12, padding:"14px 18px" }}>
            <p style={{ margin:"0 0 10px", fontSize:13, fontWeight:700, color:C.muted }}>{cat}</p>
            {prods.map(p=>(
              <div key={p} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:`1px solid ${C.faint}` }}>
                <div onClick={()=>comprado(p)} style={{ width:22, height:22, borderRadius:6, border:`2px solid ${C.border}`, background:C.bg, flexShrink:0, cursor:"pointer" }} />
                <span onClick={()=>comprado(p)} style={{ fontSize:15, flex:1, cursor:"pointer" }}>{p}</span>
                {qtdMap[p] && <span style={{ fontSize:13, fontWeight:700, color:C.muted, background:C.faint, borderRadius:6, padding:"3px 10px", flexShrink:0 }}>{qtdMap[p]}</span>}
              </div>
            ))}
          </Card>
        ))}
        {lista.length>0&&<button onClick={limpar} style={{ width:"100%", marginTop:8, padding:"12px 0", borderRadius:12, border:`1.5px solid ${C.border}`, background:"none", color:C.muted, cursor:"pointer", fontSize:14, fontWeight:600 }}>🗑 Limpar lista (já comprei tudo)</button>}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div><h2 style={{ margin:0, fontSize:17, fontWeight:800 }}>O que está a faltar?</h2><p style={{ margin:"2px 0 0", fontSize:12, color:C.muted }}>{lista.length} produto{lista.length!==1?"s":""} selecionado{lista.length!==1?"s":""}</p></div>
        {lista.length>0&&<button onClick={()=>setView("ir_compras")} style={{ background:C.text, color:"#fff", border:"none", borderRadius:10, padding:"10px 18px", cursor:"pointer", fontWeight:700, fontSize:13 }}>🛒 Ir às compras</button>}
      </div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Pesquisar produto…" style={{ width:"100%", padding:"11px 14px", borderRadius:12, border:`1.5px solid ${C.border}`, background:C.surface, color:C.text, fontSize:14, marginBottom:14, outline:"none" }} />
      {Object.entries(produtosFiltrados).map(([cat,prods])=>{
        const aberta=catAberta===cat||!!search;
        const selecionados=prods.filter(p=>listaAtiva.includes(p)).length;
        return (
          <Card key={cat} style={{ marginBottom:10, padding:"0" }}>
            <div onClick={()=>!search&&setCatAberta(aberta&&!search?null:cat)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 18px", cursor:search?"default":"pointer" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:16 }}>{cat.split(" ")[0]}</span>
                <span style={{ fontSize:14, fontWeight:700 }}>{cat.substring(cat.indexOf(" ")+1)}</span>
                {selecionados>0&&<span style={{ background:C.text, color:"#fff", borderRadius:99, padding:"1px 8px", fontSize:11, fontWeight:700 }}>{selecionados}</span>}
              </div>
              {!search&&<span style={{ color:C.muted, fontSize:16 }}>{aberta?"▲":"▼"}</span>}
            </div>
            {aberta&&(
              <div style={{ padding:"0 18px 14px", borderTop:`1px solid ${C.faint}` }}>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8, paddingTop:12 }}>
                  {prods.map(p=>{
                    const sel=listaAtiva.includes(p);
                    const isCustom=(customProds[cat]||[]).includes(p);
                    return (
                      <div key={p} style={{ display:"inline-flex", alignItems:"center", gap:4 }}>
                        <div style={{ position:"relative", display:"inline-flex", alignItems:"center" }}>
                          <button onClick={()=>toggle(p)} style={{ padding:"7px 13px", borderRadius:99, border:`1.5px solid ${sel?C.text:C.border}`, background:sel?C.text:C.bg, color:sel?"#fff":C.text, cursor:"pointer", fontSize:13, fontWeight:sel?600:400, paddingRight:isCustom?28:13 }}>{sel?"✓ ":""}{p}</button>
                          {isCustom&&<button onClick={e=>{e.stopPropagation();removerCustom(cat,p);}} style={{ position:"absolute", right:6, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:sel?"#ffffff88":C.muted, fontSize:11, padding:0 }}>✕</button>}
                        </div>
                        {sel&&<input type="text" placeholder="qtd" defaultValue={qtdMap[p]||""} onBlur={e=>atualizarQtd(p,e.target.value)} style={{ width:52, padding:"5px 7px", borderRadius:99, border:`1.5px solid ${C.border}`, background:C.bg, color:C.text, fontSize:12, outline:"none", textAlign:"center" }} />}
                      </div>
                    );
                  })}
                  {addingTo===cat?(
                    <div style={{ display:"flex", gap:6, alignItems:"center", width:"100%", marginTop:4 }}>
                      <input autoFocus value={novoNome} onChange={e=>setNovoNome(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")adicionarProduto(cat);if(e.key==="Escape"){setAddingTo(null);setNovoNome("");}}} placeholder="Nome do produto…" style={{ flex:1, padding:"7px 11px", borderRadius:99, border:`1.5px solid ${C.text}`, background:C.bg, color:C.text, fontSize:13, outline:"none" }} />
                      <button onClick={()=>adicionarProduto(cat)} style={{ padding:"7px 14px", borderRadius:99, border:"none", background:C.text, color:"#fff", cursor:"pointer", fontSize:13, fontWeight:700 }}>Adicionar</button>
                      <button onClick={()=>{setAddingTo(null);setNovoNome("");}} style={{ padding:"7px 10px", borderRadius:99, border:`1.5px solid ${C.border}`, background:"none", color:C.muted, cursor:"pointer", fontSize:13 }}>✕</button>
                    </div>
                  ):<button onClick={()=>{setAddingTo(cat);setNovoNome("");}} style={{ padding:"7px 13px", borderRadius:99, border:`1.5px dashed ${C.border}`, background:"none", color:C.muted, cursor:"pointer", fontSize:13 }}>+ produto</button>}
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function Relatorios({ txs, now }) {
  const last6 = useMemo(()=>{
    return Array.from({length:6},(_,i)=>{
      const d=new Date(now.getFullYear(),now.getMonth()-5+i,1);
      const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      const mt=txs.filter(t=>monthKey(t.data)===key);
      return { name:MESES[d.getMonth()], receitas:mt.filter(t=>t.tipo==="receita").reduce((s,t)=>s+parseFloat(t.valor),0), despesas:mt.filter(t=>t.tipo==="despesa").reduce((s,t)=>s+parseFloat(t.valor),0) };
    });
  },[txs,now]);
  const tooltip = { background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, color:C.text, fontSize:12 };
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <Card>
        <p style={{ margin:"0 0 16px", fontSize:12, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:0.8 }}>Receitas vs Despesas (6 meses)</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={last6} barCategoryGap="35%">
            <XAxis dataKey="name" tick={{fill:C.muted,fontSize:12}} axisLine={false} tickLine={false} />
            <YAxis tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v} />
            <Tooltip formatter={v=>fmt(v)} contentStyle={tooltip} />
            <Bar dataKey="receitas" name="Receitas" fill={C.income} radius={[5,5,0,0]} />
            <Bar dataKey="despesas" name="Despesas" fill={C.expense} radius={[5,5,0,0]} />
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display:"flex", gap:16, justifyContent:"center", marginTop:8 }}>
          {[["Receitas",C.income],["Despesas",C.expense]].map(([n,c])=>(
            <div key={n} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12 }}>
              <div style={{ width:10, height:10, borderRadius:3, background:c }} /><span style={{ color:C.muted }}>{n}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <p style={{ margin:"0 0 16px", fontSize:12, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:0.8 }}>Saldo mensal</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={last6.map(m=>({...m,saldo:m.receitas-m.despesas}))}>
            <XAxis dataKey="name" tick={{fill:C.muted,fontSize:12}} axisLine={false} tickLine={false} />
            <YAxis tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false} />
            <Tooltip formatter={v=>fmt(v)} contentStyle={tooltip} />
            <Line type="monotone" dataKey="saldo" name="Saldo" stroke={C.accent} strokeWidth={2.5} dot={{fill:C.accent,r:4,strokeWidth:0}} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

// ── Stock Bebé ────────────────────────────────────────────────────────────────
const PRODUTOS_BEBE = [
  { nome: "Fraldas RN", unidade: "unid" },
  { nome: "Fraldas Tamanho 1", unidade: "unid" },
  { nome: "Fraldas Tamanho 2", unidade: "unid" },
  { nome: "Fraldas Tamanho 3", unidade: "unid" },
  { nome: "Toalhetes húmidos", unidade: "pacotes" },
  { nome: "Leite em pó / fórmula", unidade: "latas" },
  { nome: "Creme para assaduras", unidade: "unid" },
  { nome: "Gel de banho bebé", unidade: "unid" },
  { nome: "Champô bebé", unidade: "unid" },
  { nome: "Chupetas", unidade: "unid" },
  { nome: "Sacos para fraldas", unidade: "rolos" },
  { nome: "Algodão", unidade: "pacotes" },
  { nome: "Soro fisiológico", unidade: "unid" },
  { nome: "Paracetamol bebé", unidade: "unid" },
];

function StockBebe({ stock, setStock, casaCodigo, lista, setLista, username }) {
  const [editando, setEditando] = useState(null); // id do produto a editar
  const [showAdicionar, setShowAdicionar] = useState(false);
  const [novoProduto, setNovoProduto] = useState("");
  const [novaUnidade, setNovaUnidade] = useState("unid");
  const [saving, setSaving] = useState(false);
  const [pendingIds, setPendingIds] = useState(() => new Set()); // itens com um +/- em curso, para evitar cliques rápidos a perderem-se

  const listaAtiva = lista.map(r => r.produto);

  async function adicionarProduto(nome, unidade) {
    if (!nome.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from("stock_bebe").insert({ casa_codigo: casaCodigo, produto: nome.trim(), quantidade: 0, minimo: 0, unidade }).select();
    if (error) { alert("Erro ao adicionar produto: " + error.message); setSaving(false); return; }
    if (data && data[0]) setStock(p => [...p, data[0]]);
    setNovoProduto(""); setNovaUnidade("unid"); setShowAdicionar(false);
    setSaving(false);
  }

  async function adicionarProdutoBase(prod) {
    const existe = stock.find(s => s.produto === prod.nome);
    if (existe) return;
    const { data, error } = await supabase.from("stock_bebe").insert({ casa_codigo: casaCodigo, produto: prod.nome, quantidade: 0, minimo: 0, unidade: prod.unidade }).select();
    if (error) { alert("Erro ao adicionar produto: " + error.message); return; }
    if (data && data[0]) setStock(p => [...p, data[0]]);
  }

  async function atualizarQtd(id, delta) {
    if (pendingIds.has(id)) return; // já há um pedido em curso para este item — ignora cliques repetidos
    const item = stock.find(s => s.id === id);
    if (!item) return;
    setPendingIds(prev => new Set(prev).add(id));
    try {
      const novaQtd = Math.max(0, item.quantidade + delta);
      const { error } = await supabase.from("stock_bebe").update({ quantidade: novaQtd }).eq("id", id);
      if (error) { alert("Erro ao atualizar quantidade: " + error.message); return; }
      const atualizado = { ...item, quantidade: novaQtd };
      setStock(p => p.map(s => s.id === id ? atualizado : s));

      // Auto-add to lista de compras if below minimum
      if (novaQtd <= item.minimo && item.minimo > 0 && !listaAtiva.includes(item.produto)) {
        const { data } = await supabase.from("lista_compras").insert({ casa_codigo: casaCodigo, produto: item.produto, quantidade: null, adicionado_por: username }).select();
        if (data && data[0]) setLista(l => [...l, data[0]]);
      }
      // Remove from lista if above minimum
      if (novaQtd > item.minimo && listaAtiva.includes(item.produto)) {
        const { error: erroLista } = await supabase.from("lista_compras").delete().eq("casa_codigo", casaCodigo).eq("produto", item.produto);
        if (!erroLista) setLista(l => l.filter(r => r.produto !== item.produto));
      }
    } finally {
      setPendingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  }

  async function atualizarMinimo(id, minimo) {
    const { error } = await supabase.from("stock_bebe").update({ minimo: parseInt(minimo) || 0 }).eq("id", id);
    if (error) { alert("Erro ao atualizar mínimo: " + error.message); return; }
    setStock(p => p.map(s => s.id === id ? { ...s, minimo: parseInt(minimo) || 0 } : s));
    setEditando(null);
  }

  async function removerProduto(id) {
    if (!window.confirm("Remover este produto do stock?")) return;
    const { error } = await supabase.from("stock_bebe").delete().eq("id", id);
    if (error) { alert("Erro ao remover produto: " + error.message); return; }
    setStock(p => p.filter(s => s.id !== id));
  }

  const emFalta = stock.filter(s => s.minimo > 0 && s.quantidade <= s.minimo);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div>
          <h2 style={{ margin:0, fontSize:17, fontWeight:800 }}>👶 Stock do Bebé</h2>
          {emFalta.length > 0 && <p style={{ margin:"4px 0 0", fontSize:12, color:C.expense, fontWeight:600 }}>⚠ {emFalta.length} produto{emFalta.length>1?"s":""} a acabar — adicionado{emFalta.length>1?"s":""} à lista de compras</p>}
        </div>
        <button onClick={()=>setShowAdicionar(s=>!s)} style={{ background:C.text, color:"#fff", border:"none", borderRadius:9, padding:"8px 14px", cursor:"pointer", fontWeight:700, fontSize:13 }}>+ Produto</button>
      </div>

      {/* Adicionar produto personalizado */}
      {showAdicionar && (
        <Card style={{ marginBottom:14 }}>
          <h4 style={{ margin:"0 0 12px", fontSize:14, fontWeight:700 }}>Novo produto</h4>
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            <input value={novoProduto} onChange={e=>setNovoProduto(e.target.value)} placeholder="Nome do produto" style={{ flex:2, padding:"9px 12px", borderRadius:9, border:`1.5px solid ${C.border}`, background:C.bg, color:C.text, fontSize:13, outline:"none" }} />
            <input value={novaUnidade} onChange={e=>setNovaUnidade(e.target.value)} placeholder="unid" style={{ flex:1, padding:"9px 12px", borderRadius:9, border:`1.5px solid ${C.border}`, background:C.bg, color:C.text, fontSize:13, outline:"none" }} />
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>setShowAdicionar(false)} style={{ flex:1, padding:"8px 0", borderRadius:9, border:`1.5px solid ${C.border}`, background:"none", color:C.muted, cursor:"pointer" }}>Cancelar</button>
            <button onClick={()=>adicionarProduto(novoProduto, novaUnidade)} disabled={saving} style={{ flex:2, padding:"8px 0", borderRadius:9, border:"none", background:C.text, color:"#fff", cursor:"pointer", fontWeight:700 }}>Adicionar</button>
          </div>
          {/* Produtos sugeridos não adicionados */}
          <div style={{ marginTop:14, borderTop:`1px solid ${C.faint}`, paddingTop:12 }}>
            <p style={{ margin:"0 0 8px", fontSize:12, color:C.muted, fontWeight:600 }}>Sugestões</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {PRODUTOS_BEBE.filter(p=>!stock.find(s=>s.produto===p.nome)).map(p=>(
                <button key={p.nome} onClick={()=>adicionarProdutoBase(p)} style={{ padding:"5px 11px", borderRadius:99, border:`1.5px dashed ${C.border}`, background:"none", color:C.muted, cursor:"pointer", fontSize:12 }}>+ {p.nome}</button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {stock.length === 0 && !showAdicionar && (
        <Card>
          <p style={{ color:C.muted, textAlign:"center", padding:"20px 0", fontSize:13 }}>Nenhum produto ainda. Adiciona o primeiro!</p>
        </Card>
      )}

      {stock.map(item => {
        const emFalta = item.minimo > 0 && item.quantidade <= item.minimo;
        const naLista = listaAtiva.includes(item.produto);
        return (
          <Card key={item.id} style={{ marginBottom:10, padding:"14px 18px", borderLeft: emFalta ? `3px solid ${C.expense}` : `3px solid ${C.border}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <p style={{ margin:0, fontSize:14, fontWeight:700 }}>{item.produto}</p>
                  {emFalta && <span style={{ fontSize:10, fontWeight:700, background:C.expense+"18", color:C.expense, borderRadius:6, padding:"1px 6px" }}>A acabar</span>}
                  {naLista && <span style={{ fontSize:10, fontWeight:700, background:C.income+"18", color:C.income, borderRadius:6, padding:"1px 6px" }}>Na lista</span>}
                </div>
                {editando === item.id ? (
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:6 }}>
                    <span style={{ fontSize:12, color:C.muted }}>Mínimo:</span>
                    <input type="number" defaultValue={item.minimo} onBlur={e=>atualizarMinimo(item.id, e.target.value)} autoFocus style={{ width:60, padding:"3px 7px", borderRadius:7, border:`1.5px solid ${C.text}`, background:C.bg, color:C.text, fontSize:13, outline:"none" }} />
                    <span style={{ fontSize:12, color:C.muted }}>{item.unidade}</span>
                    <button onClick={()=>setEditando(null)} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:12 }}>✕</button>
                  </div>
                ) : (
                  <p onClick={()=>setEditando(item.id)} style={{ margin:"3px 0 0", fontSize:12, color:C.muted, cursor:"pointer" }}>
                    Mínimo: {item.minimo} {item.unidade} · <span style={{ color:C.accent }}>editar</span>
                  </p>
                )}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <button disabled={pendingIds.has(item.id)} onClick={()=>atualizarQtd(item.id,-1)} style={{ width:32, height:32, borderRadius:"50%", border:`1.5px solid ${C.border}`, background:"none", cursor:pendingIds.has(item.id)?"default":"pointer", opacity:pendingIds.has(item.id)?0.5:1, fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", color:C.text }}>−</button>
                <div style={{ textAlign:"center", minWidth:36 }}>
                  <p style={{ margin:0, fontSize:20, fontWeight:800, color: emFalta?C.expense:C.text }}>{item.quantidade}</p>
                  <p style={{ margin:0, fontSize:10, color:C.muted }}>{item.unidade}</p>
                </div>
                <button disabled={pendingIds.has(item.id)} onClick={()=>atualizarQtd(item.id,1)} style={{ width:32, height:32, borderRadius:"50%", border:`1.5px solid ${C.border}`, background:"none", cursor:pendingIds.has(item.id)?"default":"pointer", opacity:pendingIds.has(item.id)?0.5:1, fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", color:C.text }}>+</button>
                <button onClick={()=>removerProduto(item.id)} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:14, marginLeft:4 }}>🗑</button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ── Prendas / Lista de desejos ──────────────────────────────────────────────
const OCASIOES_SUGERIDAS = ["🎄 Natal", "🎂 Aniversário", "🎁 Outro"];

function Prendas({ desejos, setDesejos, casaCodigo, username }) {
  const [showAdd, setShowAdd] = useState(false);
  const [f, setF] = useState({ ocasiao: OCASIOES_SUGERIDAS[0], titulo: "", paraQuem: "", link: "", preco: "" });
  const [saving, setSaving] = useState(false);
  const [mostrarComprados, setMostrarComprados] = useState(false);

  async function addDesejo() {
    if (!f.titulo.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from("desejos").insert({
      casa_codigo: casaCodigo,
      ocasiao: f.ocasiao,
      titulo: f.titulo.trim(),
      para_quem: f.paraQuem.trim() || null,
      link: f.link.trim() || null,
      preco: f.preco ? parseFloat(f.preco) : null,
      adicionado_por: username,
    }).select();
    if (error) { alert("Erro ao adicionar: " + error.message); setSaving(false); return; }
    if (data && data[0]) setDesejos(p => [data[0], ...p]);
    setF({ ocasiao: f.ocasiao, titulo: "", paraQuem: "", link: "", preco: "" });
    setShowAdd(false);
    setSaving(false);
  }

  async function toggleComprado(item) {
    const novoValor = !item.comprado;
    const { error } = await supabase.from("desejos").update({ comprado: novoValor, comprado_por: novoValor ? username : null }).eq("id", item.id);
    if (error) { alert("Erro: " + error.message); return; }
    setDesejos(p => p.map(d => d.id === item.id ? { ...d, comprado: novoValor, comprado_por: novoValor ? username : null } : d));
  }

  async function remover(id) {
    if (!window.confirm("Remover esta ideia da lista?")) return;
    const { error } = await supabase.from("desejos").delete().eq("id", id);
    if (error) { alert("Erro ao remover: " + error.message); return; }
    setDesejos(p => p.filter(d => d.id !== id));
  }

  const porOcasiao = useMemo(() => {
    const m = {};
    desejos.filter(d => mostrarComprados || !d.comprado).forEach(d => { m[d.ocasiao] = [...(m[d.ocasiao] || []), d]; });
    return m;
  }, [desejos, mostrarComprados]);

  const totalPendentes = desejos.filter(d => !d.comprado).length;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div>
          <h2 style={{ margin:0, fontSize:17, fontWeight:800 }}>🎁 Prendas & Desejos</h2>
          <p style={{ margin:"2px 0 0", fontSize:12, color:C.muted }}>{totalPendentes} ideia{totalPendentes!==1?"s":""} por comprar</p>
        </div>
        <button onClick={()=>setShowAdd(s=>!s)} style={{ background:C.text, color:"#fff", border:"none", borderRadius:9, padding:"8px 14px", cursor:"pointer", fontWeight:700, fontSize:13 }}>+ Ideia</button>
      </div>

      {showAdd && (
        <Card style={{ marginBottom:14 }}>
          <h4 style={{ margin:"0 0 12px", fontSize:14, fontWeight:700 }}>Nova ideia de prenda</h4>
          <div style={{ marginBottom:10 }}>
            <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.muted, marginBottom:4 }}>Ocasião</label>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {OCASIOES_SUGERIDAS.map(o => (
                <button key={o} onClick={()=>setF(p=>({...p,ocasiao:o}))} style={{ padding:"6px 12px", borderRadius:99, border:`1.5px solid ${f.ocasiao===o?C.text:C.border}`, background:f.ocasiao===o?C.text:"none", color:f.ocasiao===o?"#fff":C.text, cursor:"pointer", fontSize:12, fontWeight:600 }}>{o}</button>
              ))}
              <input value={OCASIOES_SUGERIDAS.includes(f.ocasiao)?"":f.ocasiao} onChange={e=>setF(p=>({...p,ocasiao:e.target.value}))} placeholder="Outra ocasião…" style={{ padding:"6px 12px", borderRadius:99, border:`1.5px solid ${C.border}`, background:C.bg, color:C.text, fontSize:12, outline:"none", minWidth:110 }} />
            </div>
          </div>
          <div style={{ marginBottom:10 }}>
            <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.muted, marginBottom:4 }}>O quê</label>
            <input value={f.titulo} onChange={e=>setF(p=>({...p,titulo:e.target.value}))} placeholder="Ex: Livro de receitas" style={{ width:"100%", padding:"9px 12px", borderRadius:9, border:`1.5px solid ${C.border}`, background:C.bg, color:C.text, fontSize:14, outline:"none" }} />
          </div>
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            <div style={{ flex:1 }}>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.muted, marginBottom:4 }}>Para quem</label>
              <input value={f.paraQuem} onChange={e=>setF(p=>({...p,paraQuem:e.target.value}))} placeholder="Ex: Ines" style={{ width:"100%", padding:"9px 12px", borderRadius:9, border:`1.5px solid ${C.border}`, background:C.bg, color:C.text, fontSize:13, outline:"none" }} />
            </div>
            <div style={{ width:100 }}>
              <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.muted, marginBottom:4 }}>Preço (€)</label>
              <input type="number" value={f.preco} onChange={e=>setF(p=>({...p,preco:e.target.value}))} placeholder="0" style={{ width:"100%", padding:"9px 12px", borderRadius:9, border:`1.5px solid ${C.border}`, background:C.bg, color:C.text, fontSize:13, outline:"none" }} />
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.muted, marginBottom:4 }}>Link (opcional)</label>
            <input value={f.link} onChange={e=>setF(p=>({...p,link:e.target.value}))} placeholder="https://…" style={{ width:"100%", padding:"9px 12px", borderRadius:9, border:`1.5px solid ${C.border}`, background:C.bg, color:C.text, fontSize:13, outline:"none" }} />
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>setShowAdd(false)} style={{ flex:1, padding:"9px 0", borderRadius:9, border:`1.5px solid ${C.border}`, background:"none", color:C.muted, cursor:"pointer" }}>Cancelar</button>
            <button onClick={addDesejo} disabled={saving} style={{ flex:2, padding:"9px 0", borderRadius:9, border:"none", background:C.text, color:"#fff", cursor:"pointer", fontWeight:700, opacity:saving?0.7:1 }}>{saving?"A guardar…":"Guardar"}</button>
          </div>
        </Card>
      )}

      {desejos.length === 0 && !showAdd && (
        <Card><p style={{ color:C.muted, textAlign:"center", padding:"20px 0", fontSize:13 }}>Ainda não há nenhuma ideia. Adiciona a primeira!</p></Card>
      )}

      {Object.entries(porOcasiao).map(([ocasiao, itens]) => (
        <div key={ocasiao} style={{ marginBottom:18 }}>
          <p style={{ margin:"0 0 8px", fontSize:13, fontWeight:700, color:C.muted }}>{ocasiao}</p>
          {itens.map(item => (
            <Card key={item.id} style={{ marginBottom:8, padding:"12px 16px", opacity:item.comprado?0.55:1 }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                <div onClick={()=>toggleComprado(item)} style={{ width:22, height:22, borderRadius:6, border:`2px solid ${item.comprado?C.income:C.border}`, background:item.comprado?C.income:C.bg, flexShrink:0, cursor:"pointer", marginTop:2, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:13 }}>{item.comprado?"✓":""}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ margin:0, fontSize:14, fontWeight:600, textDecoration:item.comprado?"line-through":"none" }}>{item.titulo}</p>
                  <p style={{ margin:"2px 0 0", fontSize:11, color:C.muted }}>
                    {item.para_quem && <>Para <strong>{item.para_quem}</strong> · </>}
                    {item.preco!=null && <>{fmt(item.preco)} · </>}
                    {item.link && <a href={item.link} target="_blank" rel="noreferrer" style={{ color:C.accent }}>ver link</a>}
                    {!item.link && <span>adicionado por {item.adicionado_por}</span>}
                  </p>
                  {item.comprado && <p style={{ margin:"2px 0 0", fontSize:11, color:C.income }}>✓ Comprado por {item.comprado_por}</p>}
                </div>
                <button onClick={()=>remover(item.id)} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:7, color:C.muted, cursor:"pointer", padding:"5px 9px", fontSize:12, flexShrink:0 }}>✕</button>
              </div>
            </Card>
          ))}
        </div>
      ))}

      {desejos.some(d=>d.comprado) && (
        <button onClick={()=>setMostrarComprados(s=>!s)} style={{ width:"100%", padding:"10px 0", borderRadius:12, border:`1.5px solid ${C.border}`, background:"none", color:C.muted, cursor:"pointer", fontSize:13, fontWeight:600 }}>
          {mostrarComprados ? "Esconder já comprados" : `Mostrar já comprados (${desejos.filter(d=>d.comprado).length})`}
        </button>
      )}
    </div>
  );
}
