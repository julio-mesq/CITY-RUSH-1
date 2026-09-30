// City Rush — ponto de entrada: liga todos os módulos e roda o loop do jogo.
import * as THREE from 'three';
import { criarMundo, LUGARES, INT, colide, distanciaLivre } from './src/world.js';
import { criarDecoracoes } from './src/decor.js';
import { Jogador, teclas, animar, trocarArma, aplicarAparencia, K2, habilitarControles, limparControles, digitando } from './src/player.js';
import { Carro, MODELOS } from './src/vehicles.js';
import { criarNPCs, criarOrganizador } from './src/npcs.js';
import { ARMAS, FORMAS, ARMAS_GLB } from './src/weapons.js';
import * as Assets from './src/assets.js';
import * as A from './src/audio.js';
import * as UI from './src/ui.js';
import * as Esc from './src/choices.js';
import { atualizarCamera } from './src/pov.js';
import * as FX from './src/effects.js';
import * as M from './src/missions.js';
import * as Tel from './src/phone.js';
import * as DB from './src/db.js';
import * as MG from './src/minigames.js';
import * as TR from './src/traffic.js';
import { criarInterior } from './src/interiors.js';
import { criarClima } from './src/weather.js';
import * as Crt from './src/creator.js';
import { detectarMobile, iniciarControlesMobile } from './src/mobile.js';
import { prepararGraficos } from './src/graphics.js';
import * as Oficina from './src/workshop.js';
import * as Online from './src/multiplayer.js';
import { Arsenal, receberDano } from './src/combat.js';
import { criarPolicia } from './src/police.js';
import * as Moradia from './src/housing.js';
import * as Prog from './src/progression.js';
import * as Conq from './src/achievements.js';
import * as Pause from './src/pause.js';

const cv = document.getElementById('c'), $ = id => document.getElementById(id);
const mobile = detectarMobile();
document.body.classList.toggle('mobile', mobile);
const passo = async (p, t) => { $('cb').style.width = p + '%'; $('ct').textContent = t; await new Promise(r => setTimeout(r, 40)); }; // tela de carregamento
await passo(5, 'Abrindo banco de dados…'); await DB.abrir(); const save = await DB.ler() || {};Prog.carregar(save.progressao);Conq.carregar(save.conquistas);
const arsenal = new Arsenal(ARMAS,save.arsenal);

// Criação de personagem: só aparece se não houver personagem salvo (primeira vez)
const novoJogador = !save.personagem;
let personagem = save.personagem;
if (!personagem) { $('carga').classList.add('off'); personagem = await Crt.escolher(); $('carga').classList.remove('off'); }

await passo(15, 'Carregando veículos e personagens…');
await Assets.carregarEssenciais(f => { $('cb').style.width = (15 + f * 20) + '%'; });
const extrasEmSegundoPlano=Assets.carregarExtras(null,mobile); // prédios e detalhes continuam baixando sem prender a entrada

const memoria=navigator.deviceMemory||4;
const fraco = mobile || (navigator.hardwareConcurrency || 4) <= 4 || memoria<=4; // celular/notebook básico recebe perfil leve
const config=Object.assign({qualidade:fraco?'baixa':'media',sensibilidade:1,volume:.6},save.config||{});
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: !fraco });
renderer.setPixelRatio(config.qualidade==='baixa'?1:config.qualidade==='media'?Math.min(devicePixelRatio,1.35):Math.min(devicePixelRatio,2)); renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = config.qualidade!=='baixa'&&!fraco; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); scene.fog = new THREE.Fog(0x87ceeb, 150, fraco ? 500 : 900);
const cam = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, .1, 1500), cam2 = new THREE.PerspectiveCamera(70, 1, .1, 1500); scene.add(cam);
const cinema = prepararGraficos(renderer, scene, cam, fraco,config.qualidade);
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); cinema?.resize(innerWidth, innerHeight); });

await passo(40, 'Construindo a cidade…');
const ceu = criarMundo(scene, fraco), interior = criarInterior(scene);
let decoracao = null;
extrasEmSegundoPlano.then(()=>{try{decoracao=criarDecoracoes(scene,fraco);UI.notificar('Detalhes da cidade carregados.');}catch(e){console.error('[decor] falhou ao criar decoração extra, seguindo sem ela:',e);}}); // prédios e objetos chegam sem travar a tela inicial
await passo(65, 'Criando pessoas, trânsito e aviões…');
const jog = new Jogador(scene, { cor: personagem.camisa, pele: personagem.pele, cabelo: personagem.cabelo, calca: personagem.calca }), jog2 = new Jogador(scene, { k: K2, cor: 0xb03a2e, x: 9 }), npcs = criarNPCs(scene, mobile ? 18 : 30), org = criarOrganizador(scene);
jog2.obj.visible = false;
FX.iniciar(scene);M.iniciar(scene,personagem.tipo,{dialogo:t=>Esc.abrir(t,[{t:'Continuar'}]),spawnAlvos:criarAlvosMissao}); MG.iniciar(scene);
const clima = criarClima(scene), sem = TR.criarSemaforos(scene), av = TR.criarAvioes(scene), transito = Array.from({ length: mobile ? 8 : TR.TIPOS_TRANSITO.length }, (_, i) => new TR.Transito(scene, i));
const policia=criarPolicia(scene);
{ // placa do organizador de mini-jogos
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#000a'; x.fillRect(0, 0, 256, 64); x.fillStyle = '#ffcc00'; x.font = 'bold 30px sans-serif'; x.textAlign = 'center'; x.fillText('MINI-JOGOS [G]', 128, 42);
  const s = new THREE.Mesh(new THREE.PlaneGeometry(1.6, .4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, side: THREE.DoubleSide })); s.position.set(0, 2.3, 0); org.obj.add(s);
}
const customizacoes = save.custom || {};
const carros = Array.from({ length: MODELOS.length }, (_, i) => { // um de cada modelo (inclui os 6 novos do City Pack: índices 13-18)
  const h = i % 2, rua = (i % 5 - 2) * 100, livre = (Math.random() - .5) * 400;
  const idx = i === 0 ? 1 : i, c = i === 0 ? new Carro(scene, 0, 32, MODELOS[idx], 0) : new Carro(scene, h ? livre : rua, h ? rua : livre, MODELOS[idx], h * Math.PI / 2);
  c.indiceModelo = idx; if (customizacoes[idx]) c.aplicarCustomizacao(customizacoes[idx]); return c;
});
const ossosCondutor = ['Hips', 'Chest', 'UpperLeg.L', 'UpperLeg.R', 'LowerLeg.L', 'LowerLeg.R', 'Foot.L', 'Foot.R', 'UpperArm.L', 'UpperArm.R', 'LowerArm.L', 'LowerArm.R'];
const transformacoesOriginais = new Map();
const ENCAIXES_CONDUTOR = {
  carroCompacto: { x: -.34, y: .14, z: -.35, s: .72 }, carroUrbano: { x: -.4, y: .16, z: -.48, s: .72 },
  suv: { x: -.43, y: .38, z: -.4, s: .76 }, esportivoPack: { x: -.38, y: .06, z: -.35, s: .68 },
  pickup: { x: -.48, y: .42, z: -.78, s: .77 }, van: { x: -.46, y: .62, z: -1.12, s: .78 },
  policial: { x: -.42, y: .18, z: -.48, s: .72 }, rollsroyce: { x: -.43, y: .2, z: -.72, s: .72 },
  dodge: { x: -.42, y: .18, z: -.54, s: .72 }, rx7: { x: -.38, y: .1, z: -.4, s: .68 },
  antigo: { x: -.36, y: .24, z: -.42, s: .72 }, onibus: { x: -.7, y: 1.05, z: -3.45, s: .82 },
  moto: { x: 0, y: .13, z: .08, s: .82 }, moto2: { x: 0, y: .15, z: .05, s: .82 }, bike: { x: 0, y: .08, z: .02, s: .78 }
};
function posarCondutor(c) {
  const modelo = jog.obj;
  const duasRodas = ['moto', 'moto2', 'bike'].includes(c.m.glb);
  const pose = duasRodas ? {
    Hips: { x: .16, py: -.0018 }, Chest: { x: .2 },
    'UpperLeg.L': { x: -1.38, z: .08 }, 'UpperLeg.R': { x: -1.38, z: -.08 },
    'LowerLeg.L': { x: 1.62 }, 'LowerLeg.R': { x: 1.62 }, 'Foot.L': { x: -.34 }, 'Foot.R': { x: -.34 },
    'UpperArm.L': { x: -1.18, z: -.18 }, 'UpperArm.R': { x: -1.18, z: .18 },
    'LowerArm.L': { x: -.62 }, 'LowerArm.R': { x: -.62 }
  } : {
    Hips: { x: .1, py: -.0015 }, Chest: { x: .08 },
    'UpperLeg.L': { x: -1.28, z: .06 }, 'UpperLeg.R': { x: -1.28, z: -.06 },
    'LowerLeg.L': { x: 1.5 }, 'LowerLeg.R': { x: 1.5 }, 'Foot.L': { x: -.24 }, 'Foot.R': { x: -.24 },
    'UpperArm.L': { x: -.92, z: -.12 }, 'UpperArm.R': { x: -.92, z: .12 },
    'LowerArm.L': { x: -.55 }, 'LowerArm.R': { x: -.55 }
  };
  ossosCondutor.forEach(nome => {
    const osso = modelo.getObjectByName(nome);
    if (!osso) return;
    if (!transformacoesOriginais.has(nome)) transformacoesOriginais.set(nome, {
      x: osso.rotation.x, y: osso.rotation.y, z: osso.rotation.z,
      px: osso.position.x, py: osso.position.y, pz: osso.position.z
    });
    const base = transformacoesOriginais.get(nome), a = pose[nome] || {};
    osso.rotation.set(base.x + (a.x || 0), base.y + (a.y || 0), base.z + (a.z || 0));
    osso.position.set(base.px + (a.px || 0), base.py + (a.py || 0), base.pz + (a.pz || 0));
  });
  modelo.updateMatrixWorld(true);
}
function liberarCondutor() {
  ossosCondutor.forEach(nome => {
    const osso = jog.obj.getObjectByName(nome);
    const base = transformacoesOriginais.get(nome);
    if (osso && base) { osso.rotation.set(base.x, base.y, base.z); osso.position.set(base.px, base.py, base.pz); }
  });
  const u = jog.obj.userData;
  u.acoes?.idle?.reset().play(); u.animAtual = 'idle';
}
const frota = new Map(); // carros comprados (garagem)
function chamar(i) {
  let c = frota.get(i); const p = jog.obj.position;
  if(c?.guardado)return UI.notificar('Este veículo está guardado em uma casa. Retire-o pelo modo construção (B).');
  if (!c) { c = new Carro(scene, p.x + 4, p.z + 4, MODELOS[i], jog.yaw); c.indiceModelo = i; if (customizacoes[i]) c.aplicarCustomizacao(customizacoes[i]); frota.set(i, c); carros.push(c); } else { c.obj.visible=true;c.obj.position.set(p.x + 4, 0, p.z + 4); c.hp = 100; c.v = 0; }
  UI.notificar('Seu ' + c.nome + ' chegou!');
}
const fp = new THREE.Group(); cam.add(fp); // arma visível na primeira pessoa
function armaFP(i) {
  fp.clear(); const d = FORMAS[i]; if (!d) return;
  const chave = ARMAS_GLB[i], modelo3d = chave && Assets.clonarCena(chave);
  if (modelo3d) {
    const caixa = new THREE.Box3().setFromObject(modelo3d), centro = new THREE.Vector3(); caixa.getCenter(centro);
    const tam = Math.max(caixa.max.x - caixa.min.x, caixa.max.y - caixa.min.y, caixa.max.z - caixa.min.z) || 1;
    modelo3d.position.set(-centro.x, -centro.y, -centro.z);
    const wrapper = new THREE.Group(); wrapper.add(modelo3d); wrapper.scale.setScalar(Math.max(...d) / tam);
    wrapper.position.set(.22, -.2, -.45 - d[2] / 2); wrapper.rotation.y = Math.PI / 2; wrapper.traverse(n => { if (n.isMesh) n.frustumCulled = false; }); fp.add(wrapper);
  } else {
    const g = new THREE.Mesh(new THREE.BoxGeometry(...d), new THREE.MeshLambertMaterial({ color: i === 5 ? 0x4a5d3a : 0x222222 })); g.position.set(.22, -.2, -.45 - d[2] / 2); fp.add(g);
  }
}
armaFP(0);

await passo(85, 'Carregando seu progresso…');
jog.dinheiro = save.dinheiro ?? personagem.dinheiro ?? 500; jog.colete = save.colete ?? 100; Tel.carregar(save.tel); M.definir(save.missao || 0);
Esc.carregar(save.karma || { karma: personagem.karma || 0, hist: [] });
if (novoJogador && personagem.casa != null) Tel.definirInicial(personagem.casa); // casa de brinde escolhida na criação do personagem
$('uname').textContent = personagem.nome + ' · ' + personagem.tipoNome;
$('menu').querySelector('p').textContent = 'Bem-vindo(a), ' + personagem.nome + '! Escolha como jogar';
if (mobile) $('controles').textContent = 'Use o controle redondo para se mover. Arraste o lado direito para olhar. Os botões mudam automaticamente ao entrar em um veículo.';
const rec = { corrida: save.corrida || 0, kills: save.kills || 0 };
let apagando = false;
let moradia=null;
const gravar = () => { if (!apagando) DB.gravar({ dinheiro: jog.dinheiro, tel: Tel.dados(), missao: M.indice(), karma: Esc.estado, corrida: rec.corrida, kills: rec.kills, personagem, custom: customizacoes, arsenal: arsenal.dados(), colete:jog.colete, moradia:moradia?.dados()||save.moradia,progressao:Prog.dados(),config,conquistas:Conq.dados() }); };
setInterval(gravar, 8000); addEventListener('beforeunload', () => { gravar(); Online.sair(); });
Tel.dados().garagem.forEach(i => { const c = new Carro(scene, 4 + (i % 4) * 5, 45 + i * 5, MODELOS[i], 0); c.indiceModelo = i; if (customizacoes[i]) c.aplicarCustomizacao(customizacoes[i]); frota.set(i, c); carros.push(c); }); // carros comprados aparecem perto do início

let rodando = false, telaAberta = false, pov = 0, povAntes = 0, estrelas = 0, semCrime = 0, arma = 0, tiroT = 0, tempoDia = .25, tempoJogo = 0, buf = '', passoT = 0, lento = 0, reduzido = false, crime = 0, semMouse = 0, split = false, cool2 = 0, saida = null, ultimoVeiculo = null,conqT=0;
const municao = arsenal.carregador;
let veiculoPainel = null;
function atualizarPainel(c) {
  const painel = $('vehicleHud'); painel.classList.toggle('on', !!c); if (!c) { veiculoPainel = null; return; }
  if (veiculoPainel !== c) { veiculoPainel = c; $('dashName').textContent = c.nome.toUpperCase(); }
  const kmh = Math.round(Math.abs(c.v) * 3.6), limite = c.vmaxBase * (1 + c.tuning.motor * .1 + (c.tuning.turbo ? .13 : 0)) * 3.6;
  $('dashSpeed').textContent = kmh; $('dashGear').textContent = c.marcha; $('dashRpm').textContent = Math.round(c.rpm / 100) * 100 + ' rpm'; $('dashHp').textContent = 'CARRO ' + Math.max(0, c.hp | 0) + '%';
  painel.style.setProperty('--speed', Math.min(100, kmh / Math.max(1, limite) * 100).toFixed(1));
}
jog.aoRenascer = () => { INT.on = false; UI.wasted(false); UI.notificar('Você foi levado ao hospital (-10% do dinheiro)'); };
function iniciarJogo(t) { const r = MG.comecar(t, jog); UI.notificar(r || (t === 'corrida' ? 'Corrida! Passe pelos 6 pontos em 90 s' : 'Sobreviva por 60 s!')); }
const aoAbrirTela = on => { telaAberta = on; habilitarControles(!on&&rodando); jog.mira=false; if (!mobile) { if (on) document.exitPointerLock(); else cv.requestPointerLock?.()?.catch?.(()=>{}); } };
Esc.configurar(aoAbrirTela);
function aplicarQualidade(q){config.qualidade=q;renderer.setPixelRatio(q==='baixa'?1:q==='media'?Math.min(devicePixelRatio,1.25):Math.min(devicePixelRatio,1.6));renderer.shadowMap.enabled=q==='alta'&&!fraco;clima.reduzir(q==='baixa'?400:q==='media'?650:900);cinema?.qualidade(q);cinema?.resize(innerWidth,innerHeight);gravar();}
Pause.iniciar(config,{aoAbrir:aoAbrirTela,qualidade:aplicarQualidade,volume:A.volume,salvar:gravar,conquistas:Conq.lista});
function retirarDaGaragem(casaIdx,modelo){
  let c=frota.get(modelo);if(!c){c=new Carro(scene,INT.x-7,INT.z+INT.d/2-4.2,MODELOS[modelo],0);c.indiceModelo=modelo;frota.set(modelo,c);carros.push(c);}
  c.guardado=false;c.obj.visible=true;c.hp=Math.max(25,c.hp);c.v=0;c.yaw=0;c.obj.position.set(INT.x-7,0,INT.z+INT.d/2-4.2);Moradia.removerGuardado(casaIdx,modelo);UI.notificar(c.nome+' retirado para a garagem.');
}
function guardarNaGaragem(casaIdx){
  const c=ultimoVeiculo;
  if(!c||c.indiceModelo==null||c.obj.position.distanceTo(new THREE.Vector3(INT.x-7,0,INT.z+4))>10)return UI.notificar('Estacione seu veículo dentro da garagem primeiro.');
  const erro=Moradia.registrarGuardado(casaIdx,c.indiceModelo);if(erro)return UI.notificar(erro);
  if(jog.veiculo===c){jog.veiculo=null;liberarCondutor();}c.v=0;c.guardado=true;c.obj.visible=false;UI.notificar(c.nome+' guardado nesta casa.');gravar();
}
moradia=Moradia.iniciar(interior.casaGrupo,jog,{aviso:UI.notificar,aoAbrir:aoAbrirTela,salvar:gravar,guardar:guardarNaGaragem,retirar:retirarDaGaragem,nomeVeiculo:i=>MODELOS[i]?.marca+' '+MODELOS[i]?.nome||'Veículo'},save.moradia||{});
for(const modelo of moradia.guardados()){const c=frota.get(modelo);if(c){c.guardado=true;c.obj.visible=false;}}
Tel.iniciar(jog, {
  ligar: (t, n) => UI.notificar(M.dar(t) ? n + ': "Tenho um trabalho pra você. Veja o GPS."' : 'Termine a missão atual primeiro.'),
  chamar, jogo: t => { Tel.alternar(false); iniciarJogo(t); }, aviso: UI.notificar, salvar: gravar,nivel:Prog.nivel,
  arma:i=>{arma=i;arsenal.reserva[i]+=ARMAS[i].mun*2;trocarArma(jog.obj,i);armaFP(i);UI.notificar(ARMAS[i].n+' adicionada ao inventário.');},
  roupa:r=>{personagem.camisa=r.camisa;personagem.calca=r.calca;aplicarAparencia(jog.obj,{cor:r.camisa,calca:r.calca,cabelo:personagem.cabelo,pele:personagem.pele});UI.notificar('Visual '+r.n+' equipado.');},
  aoAbrir: aoAbrirTela
});
$('vol').value=Math.round(config.volume*100);A.volume(config.volume);$('vol').oninput = e => {config.volume=e.target.value/100;A.volume(config.volume);gravar();};
$('pendrive').onclick = e => {
  e.stopPropagation();
  const url = new URL('https://city-rush-mobile.k49npkpmm2.chatgpt.site');
  const blob = new Blob(['[InternetShortcut]\r\nURL=' + url.href + '\r\n'], {type:'application/octet-stream'});
  const href = URL.createObjectURL(blob), a = document.createElement('a'); a.href = href; a.download = 'City-Rush.url'; a.click(); setTimeout(()=>URL.revokeObjectURL(href), 1000);
  $('pendriveHint').textContent = 'Copie City-Rush.url para o pendrive. Abra no Windows com internet. É um atalho para a versão atualizada; o progresso fica neste navegador.';
};
$('novo').onclick = async e => { e.stopPropagation(); apagando = true; await DB.apagar(); location.reload(); };
function comecar() { if (!mobile) cv.requestPointerLock?.()?.catch?.(()=>{}); rodando = true;habilitarControles(true); $('menu').classList.add('off'); A.iniciar(); A.click();M.ativar(); }
$('menu').onclick = comecar;
function adicionarChat(nome,texto,proprio=false){
  const p=document.createElement('p');if(proprio)p.className='me';if(nome==='SISTEMA')p.className='system';
  if(nome!=='SISTEMA'){const b=document.createElement('b');b.textContent=nome+': ';p.append(b);}p.append(document.createTextNode(texto));
  $('chatLog').append(p);while($('chatLog').children.length>40)$('chatLog').firstChild.remove();$('chatLog').scrollTop=$('chatLog').scrollHeight;
}
function abrirChat(){if(!Online.conectado())return UI.notificar('Entre em uma sala online para usar o chat.');$('chatPanel').classList.add('on');aoAbrirTela(true);setTimeout(()=>$('chatInput').focus(),0);}
function fecharChat(){if(!$('chatPanel').classList.contains('on'))return;$('chatPanel').classList.remove('on');$('chatInput').blur();aoAbrirTela(false);}
$('chatClose').onclick=fecharChat;$('mChat').onclick=e=>{e.preventDefault();abrirChat();};
$('chatForm').onsubmit=e=>{e.preventDefault();if(Online.enviarChat($('chatInput').value))$('chatInput').value='';};
const parametrosSala = new URLSearchParams(location.search), salaDaUrl = parametrosSala.get('sala'), modoDaUrl=parametrosSala.get('modo');
if (salaDaUrl) $('roomCode').value = salaDaUrl.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24) || 'cidade-1';
if(modoDaUrl==='deathmatch')$('roomMode').value='deathmatch';
$('soloPlay').onclick = e => { e.stopPropagation(); Online.sair(); $('netHud').textContent = 'SOZINHO'; $('shareRoom').classList.remove('on');$('chatPanel').classList.remove('on'); comecar(); };
$('shareRoom').onclick = async e => {
  e.stopPropagation();
  try { const convite = new URL('https://city-rush-mobile.k49npkpmm2.chatgpt.site'); const sala = new URLSearchParams(location.search).get('sala'); if(sala)convite.searchParams.set('sala',sala); await navigator.clipboard.writeText(convite.href); $('onlineMsg').textContent = 'LINK COPIADO'; UI.notificar('Link da sala copiado. Envie para seus amigos!'); }
  catch (_) { $('onlineMsg').textContent = 'COPIE O LINK DO NAVEGADOR'; UI.notificar('Copie o endereço desta página e envie para seus amigos.'); }
};
$('onlinePlay').onclick = async e => {
  e.stopPropagation(); const b = e.currentTarget, msg = $('onlineMsg'); b.disabled = true; msg.textContent = 'CONECTANDO…';
  try {
    const modo=$('roomMode').value;
    const codigo = await Online.entrar(scene, jog, personagem, $('roomCode').value, modo, {
      status:s => {
        const placar=s.modo==='deathmatch'?' · '+s.kills+'×'+s.deaths:'';
        $('netHud').textContent = s.online ? '● '+(s.modo==='deathmatch'?'DEATHMATCH':'COOP')+' · '+s.sala.toUpperCase()+' · '+s.jogadores+' jogador'+(s.jogadores===1?'':'es')+placar : 'SOZINHO';
        $('netHud').classList.toggle('on', s.online);
      },
      mensagem:adicionarChat,
      dano:(valor,nome)=>{const vivo=!jog.morto&&jog.hp>0;receberDano(jog,valor);if(vivo&&jog.hp<=0)UI.notificar(nome+' eliminou você.');return vivo&&jog.hp<=0;},
      reviver:nome=>{jog.morto=false;jog.tm=0;jog.hp=50;jog.st=60;jog.obj.rotation.x=0;jog.obj.position.y=0;UI.wasted(false);UI.notificar(nome+' reanimou você!');}
    });
    const url = new URL(location.href); url.searchParams.set('sala', codigo);url.searchParams.set('modo',modo); history.replaceState(null, '', url);
    $('shareRoom').classList.add('on'); msg.textContent = (modo==='deathmatch'?'DEATHMATCH · ':'COOP · ') + codigo.toUpperCase(); comecar(); UI.notificar('Online conectado. Enter abre o chat; copie o link para chamar seus amigos.');
  } catch (erro) {
    console.error('[online]', erro); msg.textContent = 'NÃO FOI POSSÍVEL CONECTAR'; UI.notificar('Modo online indisponível. Você ainda pode jogar sozinho.');
  } finally { b.disabled = false; }
};
document.addEventListener('pointerlockchange', () => { if (!mobile && !document.pointerLockElement && !telaAberta) { rodando = false;habilitarControles(false); $('menu').classList.remove('off'); } });
addEventListener('contextmenu', e => e.preventDefault());
addEventListener('mousedown', e => { if (!rodando || !document.pointerLockElement) return; if (e.button === 0) teclas.Mouse0 = true; if (e.button === 2) jog.mira = true; });
addEventListener('mouseup', e => { if (e.button === 0) teclas.Mouse0 = false; if (e.button === 2) jog.mira = false; });
addEventListener('mousemove', e => {
  if (!document.pointerLockElement) return; const s = (jog.mira ? .0012 : .0025)*config.sensibilidade; semMouse = 0;
  if (jog.veiculo) jog.olho -= e.movementX * s; else jog.cameraYaw -= e.movementX * s; // câmera livre a pé e no carro
  jog.pitch = Math.max(-1, Math.min(1, jog.pitch - e.movementY * s));
});

function loja(t) {
  const c = t === 'mercado' ? 50 : 30; if (jog.dinheiro < c) return UI.notificar('Dinheiro insuficiente');
  jog.dinheiro -= c;
  if (t === 'mercado') { jog.hp = Math.min(100, jog.hp + 50); UI.notificar('Caixa: obrigado! (+50 de vida)'); } else { arsenal.reabastecer(); jog.colete=100; UI.notificar('Reserva de munição e colete reabastecidos. R para recarregar.'); }
}
function entrar(l) {
  INT.on = true; INT.tipo = l.tipo; INT.casa = l.idx || 0; interior.mostrar(l.tipo, l.idx || 0);
  if(l.tipo==='casa')moradia?.mostrarCasa(INT.casa);
  saida = { x: l.x, z: l.z + 18 }; povAntes = pov; pov = 1;
  jog.obj.position.set(INT.x, 0, INT.z + INT.d / 2 - 2); jog.yaw = jog.cameraYaw = 0; jog.pitch = 0;
  UI.notificar(l.tipo === 'casa' ? 'Bem-vindo à sua casa.' : l.tipo === 'oficina' ? 'City Customs: use o computador para modificar seu veículo.' : 'Vá até o balcão e aperte E para comprar.');
}
function sair() { INT.on = false; pov = povAntes; jog.obj.position.set(saida.x, 0, saida.z); }
function entrarGaragemCasa(l,c){
  INT.on=true;INT.tipo='casa';INT.casa=l.idx||0;interior.mostrar('casa',INT.casa);moradia?.mostrarCasa(INT.casa);
  saida={x:l.x,z:l.z+18};povAntes=pov;pov=0;ultimoVeiculo=c;
  c.guardado=false;c.obj.visible=true;c.obj.position.set(INT.x-7,0,INT.z+INT.d/2-4.2);c.yaw=0;c.v=0;jog.olho=0;
  UI.notificar('Você entrou na garagem. Estacione, saia e use B para guardar ou mobiliar.');
}
function sairGaragemCasa(c){INT.on=false;pov=povAntes;c.obj.position.set(saida.x,0,saida.z);c.yaw=0;c.v=0;UI.notificar('Você saiu da garagem.');}
function entrarOficinaComVeiculo(l, c) {
  INT.on = true; INT.tipo = 'oficina'; INT.casa = 0; interior.mostrar('oficina', 0);
  saida = { x: l.x, z: l.z + 18 }; povAntes = pov; pov = 0; ultimoVeiculo = c;
  c.obj.position.set(INT.x, 0, INT.z + INT.d / 2 - 4.2); c.yaw = 0; c.v = 0; jog.olho = 0;
  UI.notificar('Dirija até o elevador, estacione e saia do veículo para usar o computador.');
}
function sairOficinaComVeiculo(c) {
  INT.on = false; pov = povAntes; c.obj.position.set(saida.x, 0, saida.z); c.yaw = 0; c.v = 0;
  UI.notificar('Você saiu da oficina com o veículo.');
}
function casa(l) { if (Tel.possui(l.idx)) entrar(l); else UI.notificar('Casa à venda — compre pelo celular (T)'); }
function abrirOficina() {
  const alvo = ultimoVeiculo || [...frota.values()][0] || carros[0];
  Oficina.abrir(alvo, jog, {
    aviso: UI.notificar, aoAbrir: aoAbrirTela,
    salvar: c => { customizacoes[c.indiceModelo] = c.dadosCustomizacao(); gravar(); }
  });
}
// A casa selecionada na criação passa a ser o ponto inicial real do jogo.
const casaInicial = personagem.casa != null && LUGARES.find(l => l.tipo === 'casa' && l.idx === personagem.casa);
if (casaInicial && Tel.possui(personagem.casa)) entrar(casaInicial);

let ultimaInteracao=0;
addEventListener('keydown', e => {
  if(e.code==='Escape'&&$('chatPanel').classList.contains('on')){fecharChat();return;}
  if(digitando(e))return;
  const k = e.code; buf = (buf + e.key).toLowerCase().slice(-7);
  if (buf === 'hesoyam') { jog.hp = 100; jog.dinheiro += 250000; UI.notificar('Cheat ativado!'); }
  if (k === 'Tab') e.preventDefault();
  if(k==='Escape'){
    if(Tel.aberto()){Tel.alternar(false);return;}if(Oficina.aberto()){Oficina.fechar();return;}if(Moradia.aberto()){Moradia.alternar(false);return;}if(Esc.aberto())return;
    if(rodando&&!jog.morto){Pause.alternar();return;}
  }
  if (!rodando || jog.morto) return;
  if(k==='Enter'){abrirChat();return;}
  if (k === 'KeyT') Tel.alternar();
  if (k === 'KeyB' && INT.on && INT.tipo==='casa' && !jog.veiculo) Moradia.alternar(true,INT.casa);
  if (Esc.aberto()) { // diálogo aberto: 1-3 escolhem
    const o = /^Digit[1-3]$/.test(k) && Esc.escolher(+k.slice(5) - 1);
    if (o) { if (o.mg) iniciarJogo(o.mg); if (o.d !== undefined) { jog.dinheiro += o.d; if (o.e) { estrelas = Math.min(5, estrelas + o.e); semCrime = 0; } UI.notificar('Karma: ' + Esc.rotulo()); } }
    return;
  }
  if(telaAberta)return;
  if (k === 'Tab') { UI.inventario(jog, ARMAS, municao, Esc.rotulo(), `Recorde de corrida: ${rec.corrida ? rec.corrida.toFixed(1) + ' s' : '—'} · Abates: ${rec.kills}`); UI.alternar('inv'); }
  if (k === 'KeyM') UI.alternar('mapa');
  if (k === 'KeyK') UI.notificar(clima.alternar() ? 'Chuva ligada' : 'Chuva desligada');
  if (k === 'KeyP') document.body.classList.toggle('foto');
  if (k === 'KeyY') { split = !split; jog2.obj.visible = split; if (split) { jog2.obj.position.copy(jog.obj.position); jog2.obj.position.x += 2; } $('hud2').style.display = split ? 'block' : 'none'; }
  if (jog.veiculo && (k === 'ArrowLeft' || k === 'ArrowRight')) UI.notificar('📻 ' + A.radio(k === 'ArrowRight' ? 1 : -1));
  if (k === 'KeyV') { if (jog.veiculo) pov = pov === 4 ? 0 : 4; else do pov = (pov + 1) % 5; while (pov === 4); } // no carro: 3ª pessoa <-> interno
  if (k === 'KeyQ') { let n=arma;do n=(n+1)%ARMAS.length;while(!Tel.temArma(n)&&n!==arma);arma=n;trocarArma(jog.obj, arma); armaFP(arma); A.click(); }
  if (k === 'KeyR' && arsenal.recarregar(arma)) A.click();
  if (/^Digit[1-7]$/.test(k)) {const n=+k.slice(5)-1;if(!Tel.temArma(n))return UI.notificar('Compre ou desbloqueie esta arma primeiro.');arma=n; trocarArma(jog.obj, arma); armaFP(arma); A.click(); }
  if (k === 'KeyH' && jog.veiculo) A.buzina();
  if (k === 'KeyG' && !jog.veiculo) {
    const revivido=Online.reanimarProximo(jog.obj.position,INT.on?INT.tipo+':'+(INT.tipo==='casa'?INT.casa:0):'world');
    if(revivido)UI.notificar('Você reanimou '+revivido+'!');
    else if (org.obj.position.distanceTo(jog.obj.position) < 5) Esc.abrir('Rafa: "Quer competir?"', [{ t: 'Corrida (6 pontos, 90 s)', mg: 'corrida' }, { t: 'Sobrevivência (60 s)', mg: 'sobrevivencia' }, { t: 'Agora não' }]);
    else if (npcs.some(n => !n.policia && n.obj.position.distanceTo(jog.obj.position) < 6)) Esc.abrir();
  }
  if (k === 'KeyE' && !e.repeat) {
    if(performance.now()-ultimaInteracao<600 || jog.rolando || jog.salto)return;ultimaInteracao=performance.now();
    const p = jog.obj.position;
    if (jog.veiculo) {
      const c = jog.veiculo, q = c.obj.position;
      const oficinaPerto = !INT.on && LUGARES.find(l => l.tipo === 'oficina' && Math.hypot(l.x - q.x, l.z - q.z) < 34);
      const casaPerto = !INT.on && LUGARES.find(l => l.tipo === 'casa' && Math.hypot(l.x-q.x,l.z-q.z)<34);
      const portaoSaida = INT.on && INT.tipo === 'oficina' && q.z > INT.z + INT.d / 2 - 3.4;
      const portaoCasa = INT.on && INT.tipo === 'casa' && q.z > INT.z + INT.d / 2 - 3.4;
      if (oficinaPerto) entrarOficinaComVeiculo(oficinaPerto, c);
      else if(casaPerto){if(Tel.possui(casaPerto.idx))entrarGaragemCasa(casaPerto,c);else UI.notificar('Compre esta casa antes de usar a garagem.');}
      else if (portaoSaida) sairOficinaComVeiculo(c);
      else if(portaoCasa)sairGaragemCasa(c);
      else {
        ultimoVeiculo = c; c.definirCameraInterna(false);
        let saiu=false;
        for(const lado of [1,-1,2,-2]){const x=q.x+Math.cos(c.yaw)*2*lado,z=q.z-Math.sin(c.yaw)*2*lado;if(!colide(x,z,.4)){p.set(x,0,z);saiu=true;break;}}
        if(!saiu)return UI.notificar('Sem espaço para sair. Afaste o veículo da parede.');
        c.v=0;jog.yaw = jog.cameraYaw = c.yaw; jog.olho = 0; jog.veiculo = null; jog.obj.scale.setScalar(1); liberarCondutor();
      }
    } else if (INT.on) {
      const estacionado=['oficina','casa'].includes(INT.tipo)&&carros.find(c=>!c.guardado&&c.obj.visible&&c.obj.position.distanceTo(p)<4.5);
      if(estacionado){jog.veiculo=estacionado;ultimoVeiculo=estacionado;jog.olho=0;jog.obj.userData.mixer?.stopAllAction();posarCondutor(estacionado);return;}
      const naSaida = p.z > INT.z + INT.d / 2 - 2.1;
      if (INT.tipo === 'casa') {
        if (Math.hypot(p.x - interior.cama.x, p.z - interior.cama.z) < 3) { jog.hp = 100;jog.st=100;tempoDia=.22; gravar(); UI.notificar('Você dormiu até de manhã. Vida, stamina e progresso recuperados!'); }
        else if (naSaida) sair(); else UI.notificar('Explore sua sala, cozinha, quarto e garagem.');
      } else if (INT.tipo === 'oficina') {
        if (Math.hypot(p.x - interior.oficina.x, p.z - interior.oficina.z) < 4) abrirOficina();
        else if (naSaida) sair(); else UI.notificar('Use o computador da bancada ou volte ao portão.');
      } else if (Math.hypot(p.x - interior.caixa.x, p.z - interior.caixa.z) < 4) loja(INT.tipo);
      else if (naSaida) sair(); else UI.notificar('Chegue perto do balcão para comprar ou volte à porta.');
    } else {
      const c = carros.find(v => !v.destruido && v.obj.visible && v.obj.position.distanceTo(p) < 5), l = LUGARES.find(l => Math.hypot(l.x - p.x, l.z - p.z) < 26);
      if (c) { jog.veiculo = c; ultimoVeiculo = c; jog.olho = 0; jog.obj.userData.mixer?.stopAllAction(); posarCondutor(c); }
      else if (l) l.tipo === 'casa' ? casa(l) : entrar(l);
    }
    A.click();
  }
});

const mobileUI = mobile ? iniciarControlesMobile({
  teclas, jogador: () => jog,
  olhar: (dx, dy) => {
    const sensibilidade = .006*config.sensibilidade; semMouse = 0;
    if (jog.veiculo) jog.olho -= dx * sensibilidade; else jog.cameraYaw -= dx * sensibilidade;
    jog.pitch = Math.max(-1, Math.min(1, jog.pitch - dy * sensibilidade));
  }
}) : { atualizar() {} };

const ray = new THREE.Raycaster(), tmp = new THREE.Vector3();
function tracante(a, b) { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), new THREE.LineBasicMaterial({ color: 0xffdd95 })); scene.add(l); setTimeout(() => { scene.remove(l); l.geometry.dispose(); l.material.dispose(); }, 60); }
function dano(n, v) { // NPC ferido: foge ou revida
  n.hp -= v; crime = Math.max(crime, n.policia ? 2 : 1);
  if (n.hp <= 0) { jog.dinheiro += n.chefe?1000:50; M.matou(n.missao,n.chefe); rec.kills++; n.reset(); } else if (!n.policia) { if (Math.random() < .5||n.missao) n.briga = 20; else n.fuga = 6; }
}
function criarAlvosMissao(quantidade,chefe=false){
  const p=jog.veiculo?.obj.position||jog.obj.position,candidatos=npcs.filter(n=>!n.policia&&!n.fixo&&!n.missao).slice(0,quantidade);
  candidatos.forEach((n,i)=>{const a=i/Math.max(1,candidatos.length)*Math.PI*2,r=chefe?22:16+(i%3)*3;n.hostil(p.x+Math.cos(a)*r,p.z+Math.sin(a)*r,true,chefe);});
  UI.notificar(chefe?'⚠ Chefe de fase apareceu no mapa!':candidatos.length+' alvos da missão foram marcados.');
}
addEventListener('city-event',e=>Conq.registrar(e.detail?.tipo));
function socar(j) {
  j.obj.userData.socoAte = j.tt + .25; A.soco(); const p = j.obj.position, fx = -Math.sin(j.yaw), fz = -Math.cos(j.yaw);
  for (const n of npcs) { const dx = n.obj.position.x - p.x, dz = n.obj.position.z - p.z; if (Math.hypot(dx, dz) < 2.3 && dx * fx + dz * fz > 0) { dano(n, 20); break; } }
}
function atirar(t) {
  const a = ARMAS[arma];
  if (jog.veiculo || jog.morto || jog.rolando || jog.salto || t < tiroT + a.cad) return;
  if (a.melee) { tiroT = t; socar(jog); return; }
  if (!arsenal.disparar(arma)) { if(municao[arma]<=0)arsenal.recarregar(arma); return; }
  tiroT = t; A.tiro(arma); jog.pitch = Math.min(1, jog.pitch + .006 * (arma + 1)); // recuo
  ray.setFromCamera({ x: 0, y: 0 }, cam);
  const o = ray.ray.origin.clone(), ini = jog.obj.position.clone().setY(1.4);
  for (let p = 0; p < a.pel; p++) {
    const d = ray.ray.direction.clone().add(new THREE.Vector3(...[0, 0, 0].map(() => (Math.random() - .5) * a.esp * (jog.mira?.35:1)))).normalize(), r = new THREE.Ray(o, d);
    let alvo = null, carroAlvo = null, remoto=null, md = distanciaLivre(o,d,a.alc);
    for (const n of npcs) { tmp.copy(n.obj.position).add(new THREE.Vector3(0,1,0)); const hit=r.intersectSphere(new THREE.Sphere(tmp,.7),new THREE.Vector3());const di=hit?hit.distanceTo(o):Infinity; if (di < md) { alvo = n; md = di; } }
    for(const c of [...carros,...transito.map(t=>t.c),...policia.carros]){
      if(!c.obj.visible || c.hp<=0)continue;
      const box=new THREE.Box3().setFromObject(c.obj),hit=r.intersectBox(box,new THREE.Vector3()),di=hit?hit.distanceTo(o):Infinity;
      if(di<md){md=di;carroAlvo=c;alvo=null;}
    }
    remoto=Online.alvoDoRaio(r,md,INT.on?INT.tipo+':'+(INT.tipo==='casa'?INT.casa:0):'world');
    if(remoto){md=remoto.dist;alvo=carroAlvo=null;}
    const fim = o.clone().addScaledVector(d, md);
    tracante(ini, fim);
    if (alvo) {dano(alvo, a.dano);FX.impacto(fim,true);}
    else if(remoto){Online.danificar(remoto.id,a.dano);FX.impacto(fim,true);}
    else if(md<a.alc)FX.impacto(fim);
    if(carroAlvo){carroAlvo.hp-=a.dano*.55;crime=Math.max(crime,1);}
    if (a.area) { FX.explodir(fim, a.area); A.tiro(5); npcs.forEach(n => { if (n.obj.position.distanceTo(fim) < a.area) dano(n, 100); }); [...carros,...transito.map(t=>t.c)].forEach(c=>{if(c.obj.position.distanceTo(fim)<a.area)c.hp-=100;}); if(jog.obj.position.distanceTo(fim)<a.area)receberDano(jog,45); }
  }
  npcs.forEach(n => { if (n.obj.position.distanceTo(jog.obj.position) < 40 && n.briga <= 0) n.fuga = 4; });
}

await passo(100, 'Pronto!'); $('carga').classList.add('off');
let ultimo = performance.now();
function loop(agora) {
  requestAnimationFrame(loop);
  const bruto = (agora - ultimo) / 1000, dt = Math.min(.05, bruto); ultimo = agora;
  if (!rodando) { A.motor(-1); A.sirene(false); return; }
  if(Pause.estaAberto()){A.motor(-1);A.sirene(false);return;}
  lento = bruto > 1 / 35 ? lento + bruto : Math.max(0, lento - bruto); // FPS baixo por 3 s => reduz qualidade
  if (lento > 2.2 && !reduzido) { reduzido = true; aplicarQualidade('baixa'); UI.notificar('Modo desempenho ativado para evitar travamentos.'); }
  tempoDia = (tempoDia + dt / 420) % 1; tempoJogo += dt;
  if((conqT+=dt)>=1){conqT=0;const td=Tel.dados();const novas=Conq.avaliar({tempo:tempoJogo,carros:td.garagem.length,casas:td.casas.length,missoes:M.indice(),estrelas,kills:rec.kills,rep:Prog.nivel(),dinheiro:jog.dinheiro,corrida:rec.corrida,custom:Object.keys(customizacoes).length,online:Online.conectado()});if(novas.length){novas.forEach(c=>UI.notificar('🏆 Conquista: '+c.nome));gravar();}}
  if(!telaAberta)arsenal.atualizar(dt);
  if(mobile)jog.mira=!!teclas.Mouse2 && !telaAberta;
  if(!telaAberta)jog.atualizar(dt); carros.forEach(c => { if (!INT.on || c === jog.veiculo) c.atualizar(telaAberta&&c===jog.veiculo?0:dt, c === jog.veiculo); });
  const escuro = Math.sin(tempoDia * Math.PI * 2) < .12;
  carros.forEach(c => c.definirFarol(c === jog.veiculo && escuro)); atualizarPainel(jog.veiculo);
  mobileUI.atualizar();
  if (split) { jog2.atualizar(dt); if (jog2.hp <= 0 && !jog2.morto) jog2.morrer(); if (teclas.KeyO && !jog2.morto && agora / 1000 > cool2 + .45) { cool2 = agora / 1000; socar(jog2); } }
  const alvo = jog.veiculo ? jog.veiculo.obj.position : jog.obj.position;
  decoracao?.atualizar(alvo);
  if (jog.veiculo) { semMouse += dt; if (semMouse > 2.5) jog.olho *= 1 - 3 * dt; } // câmera volta ao centro se o mouse parar
  const busca=policia.atualizar(dt,jog,estrelas,INT.on,npcs);
  let dn = busca.dano; if (!INT.on) npcs.forEach(n => { dn += n.atualizar(dt, alvo, estrelas,jog.agachado&&!jog.veiculo); if (n.obj.position.distanceToSquared(alvo) < 160 * 160) animar(n.obj, n.velAtual||0, n.tt, dt); });
  if (!INT.on) { org.atualizar(dt, alvo, 0); animar(org.obj, 0, org.tt, dt); }
  receberDano(jog,dn);
  if (jog.veiculo && Math.abs(jog.veiculo.v) > 8) npcs.forEach(n => { if (n.obj.position.distanceTo(alvo) < 2.6) { dano(n, 100); jog.veiculo.hp -= 3; } }); // atropelar
  if (!INT.on) { sem.atualizar(tempoJogo); av.atualizar(dt); }
  if (!INT.on) transito.forEach(t => { // carros de NPCs
    t.atualizar(dt, tempoJogo,transito); const tp = t.c.obj.position;
    if (t.pausa <= 0 && !INT.on) {
      if (t.c.hp<=0)return;
      if (!jog.veiculo && !jog.morto && tp.distanceTo(jog.obj.position) < 2.6) { receberDano(jog,35,true); t.pausa = 3; jog.vy = 5; UI.notificar('Você foi atropelado!'); }
      else if (jog.veiculo && tp.distanceTo(jog.veiculo.obj.position) < 3.8) { jog.veiculo.v *= -.3; jog.veiculo.hp -= 10; t.pausa = 2; A.buzina(); }
    }
  });
  [...carros,...transito.map(t=>t.c)].forEach(c => { // fumaça, explosão única e reposição após 12 segundos
    if(c.destruido){c.respawn-=dt;if(c.respawn<=0){c.destruido=false;c.obj.visible=true;c.hp=100;c.v=0;const tr=transito.find(t=>t.c===c);if(tr)tr.reset();else c.obj.position.set(3,0,32+Math.random()*100);}return;}
    if (c.hp > 0 && c.hp < 20 && Math.random() < dt * 8) FX.fumaca(c.obj.position);
    if (c.hp <= 0) {
      FX.explodir(c.obj.position, 8); A.tiro(5); npcs.forEach(n => { if (n.obj.position.distanceTo(c.obj.position) < 8) dano(n, 100); });
      if (jog.veiculo === c) { c.definirCameraInterna(false); liberarCondutor(); jog.veiculo = null; receberDano(jog,50); jog.obj.position.set(c.obj.position.x + 3, 0, c.obj.position.z); }
      c.destruido=true;c.respawn=12;c.v=0;c.obj.visible=false;UI.notificar('Veículo destruído!');
    }
  });
  FX.atualizar(dt); clima.atualizar(dt, alvo,INT.on); Tel.tick(dt);
  const zonaOnline=INT.on ? INT.tipo + ':' + (INT.tipo === 'casa' ? INT.casa : 0) : 'world';
  Online.atualizar(dt, zonaOnline);
  if (crime) { estrelas = Math.min(5, estrelas + crime); semCrime = 0; crime = 0; }
  const rm = M.atualizar(jog, estrelas);
  if (rm) {
    const extras=[];
    if(rm.arma!==undefined){Tel.adicionarArma(rm.arma);arma=rm.arma;arsenal.reserva[arma]+=ARMAS[arma].mun*2;trocarArma(jog.obj,arma);armaFP(arma);extras.push(ARMAS[arma].n);}
    if(rm.carro!==undefined){Tel.adicionarCarro(rm.carro);chamar(rm.carro);extras.push(MODELOS[rm.carro].marca+' '+MODELOS[rm.carro].nome);}
    const subiu=Prog.ganhar(rm.historia?(rm.fim?700:180):80),bonus=Math.round(rm.recompensa*(Prog.bonus()-1));jog.dinheiro+=bonus;if(subiu)extras.push('REP nível '+subiu);
    UI.notificar('Missão concluída! +$'+(rm.recompensa+bonus)+(extras.length?' · '+extras.join(' · '):''));gravar();if(rm.fim)Esc.final();
  }
  const rg = MG.atualizar(dt, jog, npcs);
  if (rg) { if (rg.ok) { jog.dinheiro += rg.premio;const nv=Prog.ganhar(120); UI.notificar('🏆 Mini-jogo vencido! +$' + rg.premio+(nv?' · REP nível '+nv:'')); if (rg.tempo && (!rec.corrida || rg.tempo < rec.corrida)) rec.corrida = rg.tempo; gravar(); } else UI.notificar('Mini-jogo perdido!'); }
  semCrime = busca.avistado ? 0 : semCrime+dt; if (estrelas > 0 && semCrime > 20) { estrelas--; semCrime = 0; }
  if (jog.hp <= 0 && !jog.morto) { jog.morrer(); estrelas = 0; UI.wasted(true); }
  if (!telaAberta && (teclas.KeyF || teclas.Mouse0)) atirar(agora / 1000);
  if (!jog.veiculo && !jog.morto && (teclas.KeyW || teclas.KeyA || teclas.KeyS || teclas.KeyD) && jog.obj.position.y === 0 && (passoT += dt) > (teclas.ShiftLeft ? .28 : .45)) { passoT = 0; A.passo(); }
  A.motor(jog.veiculo ? Math.abs(jog.veiculo.v) : -1); A.sirene(estrelas > 0);
  carros.forEach(c => c.definirCameraInterna(c === jog.veiculo && pov === 4));
  if (jog.veiculo) {
    const c = jog.veiculo;
    const e = ENCAIXES_CONDUTOR[c.m.glb] || { x: -.4, y: .18, z: -.45, s: .72 }, co = Math.cos(c.yaw), si = Math.sin(c.yaw);
    // O piloto fica visível e sentado apenas nas duas rodas. Nos automóveis ele
    // permanece dentro da cabine, sem cabeça ou braços atravessando o teto.
    jog.obj.scale.setScalar(e.s);
    jog.obj.position.set(c.obj.position.x + e.x * co + e.z * si, c.obj.position.y + e.y, c.obj.position.z - e.x * si + e.z * co);
    jog.obj.rotation.y = c.yaw; jog.obj.rotation.z = c.duasRodas ? c.obj.rotation.z : 0;
    jog.obj.visible = c.duasRodas && pov !== 4;
  } else {
    jog.obj.scale.x = jog.obj.scale.z = 1; jog.obj.rotation.z = 0;
    jog.obj.visible = pov !== 1 || jog.morto;
  }
  fp.visible = pov === 1 && !jog.veiculo && !jog.morto && arma < 6;
  atualizarCamera(cam, agora, dt, jog, pov, jog.mira && !jog.veiculo ? (arma === 4 ? 18 : 42) : 0); ceu(tempoDia, alvo);
  let dica = '';
  if (!jog.veiculo && !jog.morto) {
    const p = jog.obj.position;
    if (INT.on) {
      const naSaida = p.z > INT.z + INT.d / 2 - 2.1;
      if (INT.tipo === 'casa') dica = Math.hypot(p.x - interior.cama.x, p.z - interior.cama.z) < 3 ? 'E: dormir até de manhã' : naSaida ? 'E: sair de casa' : 'B: modo construção e garagem';
      else if (INT.tipo === 'oficina') dica = carros.some(c=>c.obj.position.distanceTo(p)<4.5)?'E: voltar ao veículo':Math.hypot(p.x - interior.oficina.x, p.z - interior.oficina.z) < 4 ? 'E: abrir City Customs' : naSaida ? 'E: sair da oficina' : '';
      else dica = Math.hypot(p.x - interior.caixa.x, p.z - interior.caixa.z) < 4 ? 'E: comprar ' + (INT.tipo === 'mercado' ? 'comida ($50)' : 'munição ($30)') : naSaida ? 'E: sair da loja' : '';
    }
    else { const c = carros.find(v => !v.destruido && v.obj.visible && v.obj.position.distanceTo(p) < 5), l = LUGARES.find(l => Math.hypot(l.x - p.x, l.z - p.z) < 26);
      dica = c ? 'E: entrar no ' + c.nome : l ? (l.tipo === 'casa' ? 'E: entrar em casa' : l.tipo === 'oficina' ? 'E: entrar na oficina' : 'E: entrar no ' + (l.tipo === 'mercado' ? 'mercado' : 'posto')) : org.obj.position.distanceTo(p) < 5 ? 'G: falar com o Rafa (mini-jogos)' : ''; }
  } else if (jog.veiculo) {
    const p = jog.veiculo.obj.position, oficinaPerto = !INT.on && LUGARES.some(l => l.tipo === 'oficina' && Math.hypot(l.x - p.x, l.z - p.z) < 34);
    const casaPerto=!INT.on&&LUGARES.some(l=>l.tipo==='casa'&&Tel.possui(l.idx)&&Math.hypot(l.x-p.x,l.z-p.z)<34);
    dica = oficinaPerto ? 'E: entrar na oficina com o veículo' : casaPerto?'E: entrar na garagem':INT.on && INT.tipo === 'oficina' && p.z > INT.z + INT.d / 2 - 3.4 ? 'E: sair da oficina com o veículo' : INT.on&&INT.tipo==='casa'&&p.z>INT.z+INT.d/2-3.4?'E: sair da garagem':'';
  }
  UI.dica(dica); $('missao').textContent = MG.texto() || M.texto(jog);
  UI.hud(jog, estrelas, ARMAS[arma], municao[arma], Esc.rotulo(), arsenal.reserva[arma], arsenal.recarga,Prog.nivel()); UI.mapas(jog, npcs, carros, MG.destino() || M.atual(),Online.posicoes(zonaOnline));
  if (split) {
    $('hud2').textContent = 'J2 ❤ ' + Math.max(0, jog2.hp | 0); const p2 = jog2.obj.position, w = innerWidth >> 1, h = innerHeight;
    cam2.position.lerp(new THREE.Vector3(p2.x + Math.sin(jog2.yaw) * 5, p2.y + 2.6, p2.z + Math.cos(jog2.yaw) * 5), 1 - Math.exp(-8 * dt)); cam2.lookAt(p2.x, p2.y + 1.5, p2.z);
    renderer.setScissorTest(true); renderer.setViewport(0, 0, w, h); renderer.setScissor(0, 0, w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); renderer.render(scene, cam);
    renderer.setViewport(w, 0, w, h); renderer.setScissor(w, 0, w, h); cam2.aspect = w / h; cam2.updateProjectionMatrix(); renderer.render(scene, cam2);
  } else { renderer.setScissorTest(false); renderer.setViewport(0, 0, innerWidth, innerHeight); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); cinema ? cinema.render(cam) : renderer.render(scene, cam); }
}
requestAnimationFrame(loop);
