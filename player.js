// Jogador e humanos: modelo 3D real (com animações) quando carregado, com reserva
// procedural (proporções básicas + rosto pintado) caso o modelo não esteja disponível.
import * as THREE from 'three';
import { colide, destinoParkour } from './world.js';
import { clamp, smooth, direcao, pontoSalto } from './mechanics.js';
import { FORMAS, ARMAS_GLB, ARMAS_ROT_Y } from './weapons.js';
import * as Assets from './assets.js';
export const teclas = {};
let controlesAtivos = false;
export function habilitarControles(on) { controlesAtivos = on; if (!on) limparControles(); }
export function limparControles() { Object.keys(teclas).forEach(k => teclas[k] = false); }
export const digitando = e => /INPUT|TEXTAREA|SELECT/.test(e.target?.tagName) || e.target?.isContentEditable;
addEventListener('keydown', e => { if (!controlesAtivos || digitando(e)) return; if (['Space','ControlLeft','ControlRight'].includes(e.code)) e.preventDefault(); teclas[e.code] = true; });
addEventListener('keyup', e => teclas[e.code] = false);
addEventListener('blur', limparControles);
const K1 = { f: 'KeyW', b: 'KeyS', l: 'KeyA', r: 'KeyD', run: 'ShiftLeft', ag: 'KeyC', pulo: 'Space' };
export const K2 = { f: 'KeyI', b: 'KeyK', l: 'KeyJ', r: 'KeyL', run: 'ShiftRight', ag: 'KeyN', pulo: 'KeyU', giro: true }; // jogador 2 (split-screen)

// Cada "tipo" de humano 3D: qual modelo usar, prefixo dos clipes de animação daquele
// modelo, nomes dos clipes (idle/andar/correr/soco) e o nome do osso da mão direita
// (onde a arma é encaixada). Ajuste "mao"/rotação da arma em trocarArma() se, ao
// testar no navegador, a arma aparecer torta na mão — não há como conferir isso sem
// abrir o jogo de verdade.
const TIPOS_HUMANO = {
  jogador: { chave: 'homemNegocios', prefixo: 'CharacterArmature|', idle: 'Idle', andar: 'Walk', correr: 'Run', soco: 'Punch_Right', mao: 'Wrist.R', altura: 1.85, rotY: Math.PI },
  homem: { chave: 'homem', prefixo: 'HumanArmature|Man_', idle: 'Idle', andar: 'Walk', correr: 'Run', soco: 'Punch', mao: 'Palm.R', altura: 1.78 },
  mulher: { chave: 'mulher', prefixo: 'HumanArmature|Female_', idle: 'Idle', andar: 'Walk', correr: 'Run', soco: 'Punch', mao: 'Palm.R', altura: 1.72 },
  // Modelo extra do "City Pack" (rig Mixamo: ossos LeftHand/RightHand em vez de Palm.L/.R).
  mulher2: { chave: 'mulher2', prefixo: 'Armature|', idle: 'Idle', andar: 'Walking', correr: 'Running', soco: 'Punch', mao: 'RightHand', altura: 1.72 },
  soldado: { chave: 'soldado', prefixo: 'Armature|', idle: 'Standing', andar: 'Standing', correr: 'Standing', soco: 'Standing', mao: 'hand.R', altura: 1.78 },
};
// Material.name -> qual parâmetro de cor de criarHumano() tinge aquele material.
const TINGIVEIS = { cor: ['Suit', 'Shirt', 'Jacket'], calca: ['Pants'], cabelo: ['Hair', 'HairBase'], pele: ['Skin'] };
export function aplicarAparencia(g,cores){
  g.traverse(n=>{if(!n.isMesh||!n.material)return;const mats=Array.isArray(n.material)?n.material:[n.material];for(const mat of mats)for(const campo in TINGIVEIS)if(TINGIVEIS[campo].includes(mat.name)&&cores[campo]!==undefined){mat.color.setHex(cores[campo]);mat.needsUpdate=true;}});
}

function tingir(material, cores) {
  for (const campo in TINGIVEIS) if (TINGIVEIS[campo].includes(material.name)) { const m2 = material.clone(); m2.color.setHex(cores[campo]); return m2; }
  return material;
}

// tipo: 'jogador' | 'npc' (sorteia homem/mulher) | 'soldado' (NPC fixo do mini-jogo)
export function criarHumano(cor, pele = 0xe0ac82, cabelo = 0x2b1b12, calca = 0x2b2b3a, tipo = 'npc') {
  const g = new THREE.Group();
  const def = tipo === 'jogador' ? TIPOS_HUMANO.jogador : tipo === 'soldado' ? TIPOS_HUMANO.soldado : TIPOS_HUMANO[['homem', 'mulher', 'mulher2'][Math.random() * 3 | 0]];
  const cena = Assets.clonarCena(def.chave);
  if (cena) {
    // Normaliza a altura (o "l" do MODELOS não existe aqui — usamos uma altura-alvo fixa por tipo).
    const caixa = new THREE.Box3().setFromObject(cena), altura = (caixa.max.y - caixa.min.y) || 1, s = def.altura / altura;
    cena.scale.setScalar(s); cena.position.y -= caixa.min.y * s; cena.rotation.y = def.rotY || 0; // pés no chão + frente correta
    const cores = { cor, calca, cabelo, pele };
    cena.traverse(n => {
      if (!n.isMesh || !n.material) return;
      n.material = Array.isArray(n.material) ? n.material.map(mat => tingir(mat, cores)) : tingir(n.material, cores);
      n.castShadow = n.receiveShadow = true; n.frustumCulled = false; // esqueleto clonado/redimensionado: bounding box não acompanha a animação — sem isto ele some ao sair do box original
    });
    g.add(cena);
    const mixer = new THREE.AnimationMixer(cena), clipes = Assets.animacoesDe(def.chave);
    const pegar = nome => { const c = clipes.find(cl => cl.name === def.prefixo + nome); return c ? mixer.clipAction(c) : null; };
    const roll = clipes.find(c => /\|Roll$/.test(c.name));
    // Remove deslocamento embutido no clipe: a colisão controla o movimento.
    const rollLocal = roll?.clone(); if (rollLocal) rollLocal.tracks = rollLocal.tracks.filter(t => !t.name.endsWith('.position'));
    const jump = pegar('Jump');
    const tracks = [];
    if (!jump) for (const [nome,amplitude] of [['UpperLeg.L',-.9],['UpperLeg.R',-.55],['LowerLeg.L',1.1],['LowerLeg.R',.8],['UpperArm.L',-.6],['UpperArm.R',-.6]]) {
      const b = cena.getObjectByName(nome); if (b) tracks.push(new THREE.NumberKeyframeTrack(b.uuid+'.rotation[x]',[0,.16,.45,.75],[b.rotation.x,b.rotation.x+amplitude,b.rotation.x+amplitude*.7,b.rotation.x]));
    }
    const acoes = { idle: pegar(def.idle), andar: pegar(def.andar), correr: pegar(def.correr), soco: pegar(def.soco), pulo: jump || (tracks.length ? mixer.clipAction(new THREE.AnimationClip('salto',.75,tracks)) : null), rolar: rollLocal ? mixer.clipAction(rollLocal) : null };
    for (const a of [acoes.pulo,acoes.rolar]) if(a) {a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;}
    if (acoes.soco) { acoes.soco.setLoop(THREE.LoopOnce, 1); acoes.soco.clampWhenFinished = true; }
    acoes.idle?.play(); mixer.update(0); // mede depois de aplicar a pose, pois o esqueleto muda o tamanho aparente
    cena.updateMatrixWorld(true);
    const visivel = new THREE.Box3().setFromObject(cena, true);
    const alturaVisivel = visivel.max.y - visivel.min.y;
    if (Number.isFinite(alturaVisivel) && alturaVisivel > .01) {
      cena.scale.multiplyScalar(def.altura / alturaVisivel);
      cena.updateMatrixWorld(true);
      const ajustada = new THREE.Box3().setFromObject(cena, true);
      cena.position.y -= ajustada.min.y;
    }
    g.userData = { modelo3d: true, mixer, acoes, animAtual: 'idle', mao: cena.getObjectByName(def.mao) || null, gun: null };
  } else {
    // ---- reserva procedural (usada só se o modelo 3D ainda não carregou) ----
    const L = (c, r = .85) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
    const P = (geo, c, x, y, z, r) => { const o = new THREE.Mesh(geo, L(c, r)); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; return o; };
    const torso = P(new THREE.CapsuleGeometry(.2, .36, 8, 14), cor, 0, 1.3, 0); torso.scale.z = .6;
    const quad = P(new THREE.CapsuleGeometry(.19, .1, 8, 14), calca, 0, .98, 0); quad.scale.z = .62;
    const cab = P(new THREE.SphereGeometry(.12, 18, 16), pele, 0, 1.76, 0, .5); cab.scale.set(.92, 1.12, 1);
    const escuro = c => new THREE.Color(c).multiplyScalar(.6).getHex();
    const gola = P(new THREE.TorusGeometry(.1, .022, 6, 10), escuro(cor), 0, 1.52, 0, .9); gola.rotation.x = Math.PI / 2;
    const cinto = P(new THREE.BoxGeometry(.32, .05, .22), 0x1a1a1a, 0, 1.02, 0, .7);
    const fc = document.createElement('canvas'); fc.width = 64; fc.height = 64; const x = fc.getContext('2d');
    x.fillStyle = '#fff'; [20, 44].forEach(cx => { x.beginPath(); x.ellipse(cx, 28, 7, 4, 0, 0, 7); x.fill(); });
    x.fillStyle = '#3b2a1a'; [20, 44].forEach(cx => { x.beginPath(); x.arc(cx, 28, 3.2, 0, 7); x.fill(); });
    x.strokeStyle = '#' + cabelo.toString(16).padStart(6, '0'); x.lineWidth = 3; x.beginPath(); x.moveTo(12, 20); x.lineTo(28, 18); x.moveTo(36, 18); x.lineTo(52, 20); x.stroke();
    x.strokeStyle = '#8a3b3b'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(24, 50); x.quadraticCurveTo(32, 54, 40, 50); x.stroke();
    const tx = new THREE.CanvasTexture(fc); tx.colorSpace = THREE.SRGBColorSpace;
    const rosto = new THREE.Mesh(new THREE.PlaneGeometry(.17, .2), new THREE.MeshBasicMaterial({ map: tx, transparent: true })); rosto.position.set(0, 1.765, -.108);
    const perna = px => { const p = new THREE.Group(); p.position.set(px, .95, 0); p.add(P(new THREE.CapsuleGeometry(.085, .62, 5, 10), calca, 0, -.42, 0), P(new THREE.BoxGeometry(.13, .09, .29), 0x151515, 0, -.9, -.06, .4)); return p; };
    const braco = px => { const p = new THREE.Group(); p.position.set(px, 1.5, 0); p.add(P(new THREE.CapsuleGeometry(.065, .2, 5, 10), cor, 0, -.15, 0), P(new THREE.CapsuleGeometry(.05, .24, 5, 10), pele, 0, -.42, 0, .5), P(new THREE.SphereGeometry(.055, 10, 8), pele, 0, -.6, 0, .5)); return p; };
    g.userData = { modelo3d: false, pe: perna(-.1), pd: perna(.1), be: braco(-.27), bd: braco(.27) };
    g.add(torso, quad, cab, rosto, gola, cinto, P(new THREE.CylinderGeometry(.05, .06, .1, 8), pele, 0, 1.6, 0, .5), P(new THREE.SphereGeometry(.023, 8, 6), pele, 0, 1.75, -.118, .5),
      P(new THREE.SphereGeometry(.025, 8, 6), pele, -.115, 1.76, 0, .5), P(new THREE.SphereGeometry(.025, 8, 6), pele, .115, 1.76, 0, .5),
      P(new THREE.SphereGeometry(.13, 16, 12, 0, 6.283, 0, 1.35), cabelo, 0, 1.78, .01, .6), P(new THREE.SphereGeometry(.12, 12, 10), cabelo, 0, 1.74, .05, .6),
      P(new THREE.SphereGeometry(.08, 10, 8), cor, -.26, 1.5, 0), P(new THREE.SphereGeometry(.08, 10, 8), cor, .26, 1.5, 0), g.userData.pe, g.userData.pd, g.userData.be, g.userData.bd);
  }
  return g;
}
export function trocarArma(g, i) { // 0-5 armas; 6 = punhos (mãos livres)
  const u = g.userData; if (u.gun) { (u.mao || u.bd)?.remove(u.gun); u.gun = null; }
  const d = FORMAS[i]; u.armado = !!d; if (!d) return;
  const alvo = u.mao || u.bd; if (!alvo) return;
  const chave = ARMAS_GLB[i], modelo3d = chave && Assets.clonarCena(chave);
  if (modelo3d) {
    const caixa = new THREE.Box3().setFromObject(modelo3d), centro = new THREE.Vector3(); caixa.getCenter(centro);
    const tamanho = Math.max(caixa.max.x - caixa.min.x, caixa.max.y - caixa.min.y, caixa.max.z - caixa.min.z) || 1;
    const alvoTamanho = Math.max(...d), wrapper = new THREE.Group();
    modelo3d.position.set(-centro.x, -centro.y, -centro.z);
    wrapper.add(modelo3d); wrapper.scale.setScalar(alvoTamanho / tamanho);
    wrapper.position.set(0, -.05, .05); wrapper.rotation.set(0, ARMAS_ROT_Y[i] ?? Math.PI / 2, 0); // encaixe aproximado — ajuste fino ao testar
    wrapper.traverse(n => { if (n.isMesh) { n.castShadow = true; n.frustumCulled = false; } });
    u.gun = wrapper;
  } else {
    u.gun = new THREE.Mesh(new THREE.BoxGeometry(d[0], d[2], d[1]), new THREE.MeshStandardMaterial({ color: i === 5 ? 0x4a5d3a : 0x222222, roughness: .5 }));
    u.gun.position.set(0, -.5 - d[2] / 2 + .15, 0);
  }
  alvo.add(u.gun);
}
export function animar(g, vel, t, dt) {
  const u = g.userData;
  if (u.modelo3d) {
    u.mixer?.update(dt || 0);
    let alvo = 'idle';
    if (u.movimento === 'rolar') alvo = 'rolar'; else if (u.movimento === 'pulo' || u.movimento === 'parkour') alvo = 'pulo'; else if (u.socoAte && t < u.socoAte) alvo = 'soco'; else if (vel > 6) alvo = 'correr'; else if (vel > .15) alvo = 'andar';
    if (alvo !== u.animAtual) {
      const prox = u.acoes[alvo] || u.acoes.idle, atual = u.acoes[u.animAtual];
      if (prox && prox !== atual) { prox.reset().setEffectiveWeight(1).fadeIn(.12).play(); atual?.fadeOut(.12); } u.animAtual = alvo;
    }
    return;
  }
  // reserva procedural
  const a = Math.sin(t * 8) * Math.min(1, vel / 3) * .8; u.pe.rotation.x = a; u.pd.rotation.x = -a;
  if (u.socoAte && t < u.socoAte) { u.bd.rotation.x = 1.57; u.be.rotation.x = -.4; } // soco
  else if (u.armado) { u.bd.rotation.x = 1.45; u.be.rotation.x = 1.15; u.be.rotation.z = .3; } else { u.be.rotation.x = -a; u.bd.rotation.x = a; u.be.rotation.z = 0; }
}

export class Jogador {
  constructor(scene, opt = {}) {
    this.k = opt.k || K1; this.obj = criarHumano(opt.cor || 0x1f4e79, opt.pele, opt.cabelo, opt.calca, 'jogador'); scene.add(this.obj); trocarArma(this.obj, 0); this.obj.position.set(opt.x ?? 6, 0, 30);
    Object.assign(this, { yaw: 0, cameraYaw: 0, pitch: 0, vy: 0, hp: 100, st: 100, dinheiro: 500, veiculo: null, olho: 0, mira: false, morto: false, tm: 0, tt: 0, agachado: false, vx:0, vz:0, rolando:0, esquivaCd:0, puloPressionado:false, ctrlPressionado:false, exausto:false, salto:null });
  }
  morrer() { this.morto = true; this.tm = 0; this.veiculo = null; }
  renascer() { this.morto = false; this.obj.rotation.x = 0; this.obj.scale.setScalar(1); this.yaw = this.cameraYaw = 0; this.vx = this.vz = this.vy = this.rolando = this.esquivaCd = 0; this.salto = null; this.st = 100; this.exausto = false; this.obj.userData.movimento = 'idle'; this.hp = 100; this.dinheiro = Math.floor(this.dinheiro * .9); this.obj.position.set(6, 0, 30); this.aoRenascer?.(); }
  atualizar(dt) {
    if (this.morto) { this.tm += dt; this.obj.rotation.x = Math.min(this.tm * 4, 1.5); this.obj.position.y = .2; if (this.tm > 3.5) this.renascer(); return; }
    if (this.veiculo) return;
    const k = this.k, p = this.obj.position;
    this.esquivaCd = Math.max(0,this.esquivaCd-dt); this.tt += dt;
    if(this.st < 1) this.exausto=true; if(this.st>24) this.exausto=false;
    this.agachado = !!teclas[k.ag] && !this.rolando && !this.salto;
    this.obj.scale.y = smooth(this.obj.scale.y,this.agachado?.7:1,14,dt);
    if (k.giro) this.yaw += ((teclas[k.l] ? 1 : 0) - (teclas[k.r] ? 1 : 0)) * 2.2 * dt;
    const fx = (teclas[k.f] ? 1 : 0) - (teclas[k.b] ? 1 : 0), sx = k.giro ? 0 : (teclas[k.r] ? 1 : 0) - (teclas[k.l] ? 1 : 0);
    const correr = teclas[k.run] && !this.exausto && !this.agachado && (fx || sx);
    const v = (correr ? 9 : this.agachado ? 2.2 : 4.5) * (this.mira ? .6 : 1);
    const direcaoCamera = k.giro ? this.yaw : this.cameraYaw, dir = direcao(fx,sx,direcaoCamera);
    const saltoNovo=!!teclas[k.pulo]&&!this.puloPressionado, ctrl=!!teclas[k.giro?'KeyB':'ControlLeft']||(!k.giro&&!!teclas.ControlRight), esquivaNova=ctrl&&!this.ctrlPressionado;
    this.puloPressionado=!!teclas[k.pulo];this.ctrlPressionado=ctrl;
    if(esquivaNova && !this.salto && p.y===0 && this.esquivaCd===0 && this.st>=24){
      this.rolando=.62;this.esquivaCd=1.1;this.st-=24;const d=fx||sx?dir:direcao(1,0,direcaoCamera);this.rollDir=d;this.yaw=Math.atan2(-d.x,-d.z);this.obj.userData.acoes?.rolar?.reset();
      dispatchEvent(new CustomEvent('city-event',{detail:{tipo:'esquiva'}}));
    }
    if(saltoNovo && !this.rolando && !this.salto && p.y===0){
      const alvo=destinoParkour(p,direcaoCamera);
      if(alvo && this.st>=12){this.st-=12;this.salto={inicio:{x:p.x,z:p.z},fim:alvo,t:0};dispatchEvent(new CustomEvent('city-event',{detail:{tipo:'parkour'}}));}
      else this.vy=6.2;
      this.obj.userData.acoes?.pulo?.reset();
    }
    this.vx=smooth(this.vx,dir.x*v,fx||sx?14:19,dt);this.vz=smooth(this.vz,dir.z*v,fx||sx?14:19,dt);
    let dx=this.vx*dt,dz=this.vz*dt;
    if(this.rolando>0){this.rolando=Math.max(0,this.rolando-dt);dx=this.rollDir.x*7.5*dt;dz=this.rollDir.z*7.5*dt;}
    if(this.salto){const s=this.salto;s.t+=dt;const q=pontoSalto(s.inicio,s.fim,s.t/.68,s.fim.h);p.set(q.x,q.y,q.z);if(s.t>=.68){this.salto=null;this.vy=0;}dx=dz=0;}
    else {if(!colide(p.x+dx,p.z,.35,p.y))p.x+=dx;else this.vx=0;if(!colide(p.x,p.z+dz,.35,p.y))p.z+=dz;else this.vz=0;}
    this.st = clamp(this.st + (correr && !this.rolando ? -18 : this.rolando||this.salto ? 0 : 13) * dt,0,100);
    if(!this.salto){
    this.vy -= 18 * dt; p.y = Math.max(0, p.y + this.vy * dt); if (p.y === 0) this.vy = 0;
    }
    if (!k.giro && (fx || sx) && !this.rolando) {
      const alvoYaw = Math.atan2(-dx, -dz), delta = Math.atan2(Math.sin(alvoYaw - this.yaw), Math.cos(alvoYaw - this.yaw));
      this.yaw += delta * Math.min(1, dt * 14); // corpo acompanha suavemente a direção do movimento
    } else if (!k.giro && this.mira) this.yaw = this.cameraYaw;
    this.obj.userData.movimento=this.salto?'parkour':this.rolando?'rolar':p.y>.05?'pulo':this.agachado?'agachado':correr?'correr':fx||sx?'andar':'idle';
    this.obj.rotation.y = this.yaw; animar(this.obj, Math.hypot(this.vx,this.vz), this.tt, dt);
  }
}
