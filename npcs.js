// NPCs a pé: andam pelas calçadas, fogem ou brigam quando agredidos; policiais perseguem; organizador de mini-jogos.
import * as THREE from 'three';
import { criarHumano } from './player.js';
import { colide, distanciaLivre } from './world.js';
const R = (a, b) => a + Math.random() * (b - a);
const peles = [0xf1c27d, 0xc68642, 0x8d5524, 0xffdbac], roupas = [0xff0000, 0xffffff, 0x000000, 0x2e8b57, 0xffcc00, 0x6a5acd];
export class NPC {
  constructor(scene, policia, fixo, cor) {
    this.policia = policia; this.fixo = fixo; this.cacando = false; this.tt = 0; this.briga = 0; this.brigou = false;
    this.obj = criarHumano(cor ?? (policia ? 0x1e3a8a : roupas[Math.random() * 6 | 0]), peles[Math.random() * 4 | 0], [0x111111, 0x5a3825, 0xd8b45a, 0x8b2500][Math.random() * 4 | 0], [0x223355, 0x333333, 0x6b5b3e][Math.random() * 3 | 0], fixo ? 'soldado' : 'npc');
    this.obj.scale.setScalar(R(.94, 1.06));this.escalaBase=this.obj.scale.x; scene.add(this.obj); this.reset();
  }
  reset(perto) {
    this.hp = 100;this.missao=false;this.chefe=false;this.obj.scale.setScalar(this.escalaBase); this.fuga = 0; this.cacando = false; this.briga = 0; this.dir = Math.random() < .5 ? 1 : -1; this.eixo = Math.random() < .5 ? 'x' : 'z';
    const rua = Math.round(R(-9, 9)) * 100 + 10, p = R(-900, 900);
    this.obj.position.set(this.eixo === 'z' ? rua : p, 0, this.eixo === 'z' ? p : rua);
    if (this.fixo) this.obj.position.set(9, 0, 50);
    if(perto&&!this.fixo){const via=Math.round(perto.x/100)*100+10;this.obj.position.set(via,0,perto.z+(Math.random()<.5?-1:1)*R(45,130));this.eixo='z';}
    this.parado=0;this.rotina=R(5,14);this.velAtual=0;this.memoria=0;
  }
  hostil(x, z,missao=false,chefe=false) { this.obj.position.set(x, 0, z);this.missao=missao;this.chefe=chefe;this.hp=chefe?450:100;if(chefe)this.obj.scale.setScalar(this.escalaBase*1.35); this.briga = chefe?180:60; this.fuga = 0; }
  // Retorna o dano causado ao jogador neste frame
  atualizar(dt, alvo, estrelas, furtivo=false) {
    this.tt += dt; const p = this.obj.position, dx = alvo.x - p.x, dz = alvo.z - p.z, d = Math.hypot(dx, dz) || 1;
    if(!this.fixo&&!this.missao&&d>240){this.reset(alvo);return 0;}
    const andar=(vx,vz)=>{if(!colide(p.x+vx*dt,p.z,.3))p.x+=vx*dt;if(!colide(p.x,p.z+vz*dt,.3))p.z+=vz*dt;this.velAtual=Math.hypot(vx,vz);};
    if (this.briga > 0) { // briga: persegue e bate
      this.briga -= dt; this.brigou = true; this.obj.rotation.y = Math.atan2(-dx, -dz);
      if (d > 1.6) { andar(dx/d*4.5,dz/d*4.5); return 0; }
      this.obj.userData.socoAte = this.tt + .25; return 6 * dt;
    }
    if (this.brigou) { this.brigou = false; if (!this.fixo) this.reset(); }
    if (this.fixo) { if (d < 8) this.obj.rotation.y = Math.atan2(-dx, -dz); return 0; }
    if (this.policia && estrelas > 0) {
      const origem=p.clone().setY(1.4),dir=new THREE.Vector3(dx,0,dz).normalize();
      const ve=d<(furtivo?22:80)&&distanciaLivre(origem,dir,d)>=d-.6;
      if(ve){this.ultimoAlvo=alvo.clone();this.memoria=12;}else this.memoria=Math.max(0,this.memoria-dt);
      if(!this.memoria){this.cacando=false;this.velAtual=0;return 0;}
      this.cacando = true; this.obj.rotation.y = Math.atan2(-dx, -dz);
      if (d > 2.5) {const q=this.ultimoAlvo,vx=q.x-p.x,vz=q.z-p.z,l=Math.hypot(vx,vz)||1;andar(vx/l*(5+estrelas),vz/l*(5+estrelas));return 0; }
      this.obj.userData.socoAte = this.tt + .25; return 8 * dt;
    }
    if (this.cacando) this.reset();
    this.fuga = Math.max(0, this.fuga - dt);
    this.rotina-=dt;if(this.rotina<=0){this.parado=R(1,4);this.rotina=R(6,18);}
    if(this.parado>0 && this.fuga<=0){this.parado-=dt;this.velAtual=0;return 0;}
    const e = this.eixo, antes = Math.floor(p[e] / 100);
    const v=this.dir*(this.fuga>0?8:1.6);andar(e==='x'?v:0,e==='z'?v:0);
    if (p[e] > 950) this.dir = -1; else if (p[e] < -950) this.dir = 1;
    if (Math.floor(p[e] / 100) !== antes && Math.random() < .5) { p[e] = Math.round(p[e] / 100) * 100 + this.dir * 10; this.eixo = e === 'x' ? 'z' : 'x'; this.dir = Math.random() < .5 ? 1 : -1; }
    this.obj.rotation.y = this.eixo === 'x' ? -this.dir * Math.PI / 2 : (this.dir > 0 ? Math.PI : 0);
    return 0;
  }
}
export const criarNPCs = (scene, n = 30) => Array.from({ length: n }, (_, i) => new NPC(scene, i < 4));
export const criarOrganizador = scene => new NPC(scene, false, true, 0xff7a00);
