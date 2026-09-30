// Trânsito: semáforos (12 s de ciclo), carros dirigidos por NPCs e aviões no céu.
import * as THREE from 'three';
import { Carro, MODELOS } from './vehicles.js';
const CICLO = 12, verdeZ = t => Math.floor(t / (CICLO / 2)) % 2 === 0;
export const verde = (eixo, t) => (eixo === 'z') === verdeZ(t);
export function criarSemaforos(scene) {
  const N = 441, m = new THREE.Matrix4(), V = new THREE.Color(0x00ff44), R = new THREE.Color(0xff2200);
  const poste = new THREE.InstancedMesh(new THREE.CylinderGeometry(.12, .12, 6, 6), new THREE.MeshLambertMaterial({ color: 0x333333 }), N);
  const lz = new THREE.InstancedMesh(new THREE.SphereGeometry(.3, 6, 4), new THREE.MeshBasicMaterial(), N), lx = new THREE.InstancedMesh(new THREE.SphereGeometry(.3, 6, 4), new THREE.MeshBasicMaterial(), N);
  let n = 0;
  for (let a = -10; a <= 10; a++) for (let b = -10; b <= 10; b++) {
    const x = a * 100 + 8, z = b * 100 + 8; m.setPosition(x, 3, z); poste.setMatrixAt(n, m); m.setPosition(x, 6.4, z); lz.setMatrixAt(n, m); m.setPosition(x, 5.7, z); lx.setMatrixAt(n, m); lz.setColorAt(n, V); lx.setColorAt(n, R); n++;
  }
  for (const o of [poste, lz, lx]) { o.frustumCulled = false; scene.add(o); }
  let ult = -1;
  return { atualizar(t) { const f = Math.floor(t / (CICLO / 2)); if (f === ult) return; ult = f; const g = verdeZ(t); for (let i = 0; i < N; i++) { lz.setColorAt(i, g ? V : R); lx.setColorAt(i, g ? R : V); } if (lz.instanceColor) lz.instanceColor.needsUpdate = lx.instanceColor.needsUpdate = true; } };
}
// Carro de NPC: anda pela pista da direita, para no sinal vermelho e vira nas esquinas
// Índices em MODELOS (inclui os 6 novos do "City Pack": 13 lambo, 14 van, 15 pickup, 16 onibus, 17 moto2;
// bike (18) fica de fora do trânsito de propósito — bicicleta na pista em alta velocidade ficaria estranho).
// Lista em escopo de módulo (não recriada a cada carro) e exportada para main.js dimensionar a frota de trânsito
// de forma que TODOS os tipos apareçam pelo menos uma vez (antes, com só 10 carros de trânsito e 14 tipos aqui,
// os 4 últimos — van, pickup, onibus, moto2 — nunca eram sorteados).
export const TIPOS_TRANSITO = [0, 1, 2, 6, 5, 3, 8, 9, 10, 11, 13, 14, 15, 16, 17];
export class Transito {
  constructor(scene, i) { this.c = new Carro(scene, 0, 0, MODELOS[TIPOS_TRANSITO[i % TIPOS_TRANSITO.length]], 0); this.vel = 9 + Math.random() * 4; this.pausa = 0; this.reset(); }
  reset() { this.eixo = Math.random() < .5 ? 'z' : 'x'; this.dir = Math.random() < .5 ? 1 : -1; this.rua = Math.round((Math.random() * 2 - 1) * 8) * 100; this.pos = (Math.random() * 2 - 1) * 800; this.aplicar(); }
  aplicar() {
    const c = this.c, p = c.obj.position;
    if (this.eixo === 'z') { p.set(this.rua - 3.5 * this.dir, 0, this.pos); c.yaw = this.dir < 0 ? 0 : Math.PI; } else { p.set(this.pos, 0, this.rua + 3.5 * this.dir); c.yaw = this.dir > 0 ? -Math.PI / 2 : Math.PI / 2; }
    c.obj.rotation.y = c.yaw; c.v = this.pausa > 0 ? 0 : this.vel;
  }
  atualizar(dt, t, outros=[]) {
    if(this.c.hp<=0)return;
    if (this.pausa > 0) { this.pausa -= dt; return; }
    const p=this.c.obj.position;
    if(outros.some(o=>o!==this&&o.eixo===this.eixo&&o.dir===this.dir&&Math.abs(o.rua-this.rua)<1&&(o.pos-this.pos)*this.dir>0&&(o.pos-this.pos)*this.dir<Math.max(8,this.vel*.8))){this.c.v=0;return;}
    const ahead = this.dir > 0 ? Math.ceil(this.pos / 100) * 100 - this.pos : this.pos - Math.floor(this.pos / 100) * 100;
    if (ahead > 2 && ahead < 10 && !verde(this.eixo, t)) { this.c.v = 0; return; } // sinal vermelho
    const antes = Math.floor(this.pos / 100); this.pos += this.dir * this.vel * dt;
    if (Math.floor(this.pos / 100) !== antes && Math.random() < .35) {
      // Curva só na interseção; troca os eixos sem inverter a frente do veículo.
      const cruzamento = Math.round(this.pos / 100) * 100;
      const antigaRua = this.rua; this.rua = cruzamento; this.pos = antigaRua;
      this.eixo = this.eixo === 'z' ? 'x' : 'z'; this.dir = Math.random() < .5 ? 1 : -1;
    }
    if (Math.abs(this.pos) > 950) { this.pos = Math.sign(this.pos) * 949; this.dir *= -1; }
    this.aplicar();
  }
}
export function criarAvioes(scene) {
  const mt = new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }), lista = [];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Group(), fus = new THREE.CylinderGeometry(1.6, 1.2, 22, 8); fus.rotateZ(Math.PI / 2);
    const P = (geo, x, y, z) => { const o = new THREE.Mesh(geo, mt); o.position.set(x, y, z); g.add(o); };
    P(fus, 0, 0, 0); P(new THREE.BoxGeometry(5, .3, 28), 1, 0, 0); P(new THREE.BoxGeometry(3, .3, 9), -10, 0, 0); P(new THREE.BoxGeometry(3, 3.5, .3), -10, 2, 0);
    g.scale.setScalar(1.5); scene.add(g); lista.push({ g, a: Math.random() * 6.28, R: 350 + i * 120, h: 160 + i * 40, w: .09 - i * .015 });
  }
  return { atualizar(dt) { for (const o of lista) { o.a += o.w * dt; o.g.position.set(Math.cos(o.a) * o.R, o.h, Math.sin(o.a) * o.R); o.g.rotation.y = -(o.a + Math.PI / 2); } } };
}
