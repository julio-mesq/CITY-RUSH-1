// Acabamento cinematográfico do render. O celular mantém o mesmo estilo visual,
// mas evita passes de pós-processamento para preservar a fluidez.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export function prepararGraficos(renderer, scene, camera, fraco, qualidade='media') {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = fraco ? .88 : .92;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Uma iluminação ambiente neutra dá leitura melhor a lataria, vidro e metais
  // dos modelos GLB sem exigir um mapa HDR externo pesado.
  if (!fraco) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const ambiente = pmrem.fromScene(new RoomEnvironment(), .04).texture;
    scene.environment = ambiente;
    pmrem.dispose();
  }

  if (fraco || !renderer.capabilities.isWebGL2) return null;
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(Math.min(devicePixelRatio, 1.35));
  const cena = new RenderPass(scene, camera);
  const brilho = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .08, .24, .95);
  const movimento = new AfterimagePass(.72); // rastro curto e discreto em alta velocidade
  const saida = new OutputPass();
  composer.addPass(cena);
  composer.addPass(brilho);
  composer.addPass(movimento);
  composer.addPass(saida);
  let ativa=true;
  const definir=q=>{ativa=q!=='baixa';brilho.enabled=q!=='baixa';movimento.enabled=q==='alta';};
  definir(qualidade);
  return {
    render(cam) { cena.camera = cam; ativa?composer.render():renderer.render(scene,cam); },
    resize(w, h) { composer.setSize(w, h); },
    qualidade:definir
  };
}
