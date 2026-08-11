<template>
  <canvas ref="canvasRef" class="particles-canvas" />
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps({
  enableMove: {
    type: Boolean,
    default: false,
  },
});

const num = ref(100);
const _x = 0;
const _y = 0;
const _z = 200;

const dtr = (d) => (d * Math.PI) / 180;
const rnd = () => Math.sin((Math.floor(Math.random() * 360) * Math.PI) / 180);

const cam = ref({
  obj: { x: _x, y: _y, z: _z },
  dest: { x: 0, y: 0, z: 1 },
  dist: { x: 0, y: 0, z: 200 },
  ang: { cplane: 0, splane: 0, ctheta: 0, stheta: 0 },
  zoom: 1,
  disp: { x: window.innerWidth / 2, y: window.innerHeight / 2, z: 0 },
  upd() {
    const dx = this.dest.x - this.obj.x;
    const dy = this.dest.y - this.obj.y;
    const dz = this.dest.z - this.obj.z;

    this.dist = { x: dx, y: dy, z: dz };

    const xzDist = Math.sqrt(dx * dx + dz * dz);
    this.ang.cplane = -dz / xzDist;
    this.ang.splane = dx / xzDist;

    const xyzDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    this.ang.ctheta = xzDist / xyzDist;
    this.ang.stheta = -dy / xyzDist;
  },
});

// 变换函数
const trans = {
  parts: {
    sz(p, sz) {
      return { x: p.x * sz.x, y: p.y * sz.y, z: p.z * sz.z };
    },
    rot: {
      x(p, rot) {
        return {
          x: p.x,
          y: p.y * Math.cos(dtr(rot.x)) - p.z * Math.sin(dtr(rot.x)),
          z: p.y * Math.sin(dtr(rot.x)) + p.z * Math.cos(dtr(rot.x)),
        };
      },
      y(p, rot) {
        return {
          x: p.x * Math.cos(dtr(rot.y)) + p.z * Math.sin(dtr(rot.y)),
          y: p.y,
          z: -p.x * Math.sin(dtr(rot.y)) + p.z * Math.cos(dtr(rot.y)),
        };
      },
      z(p, rot) {
        return {
          x: p.x * Math.cos(dtr(rot.z)) - p.y * Math.sin(dtr(rot.z)),
          y: p.x * Math.sin(dtr(rot.z)) + p.y * Math.cos(dtr(rot.z)),
          z: p.z,
        };
      },
    },
    pos(p, pos) {
      return { x: p.x + pos.x, y: p.y + pos.y, z: p.z + pos.z };
    },
  },
  pov: {
    plane(p) {
      return {
        x: p.x * cam.value.ang.cplane + p.z * cam.value.ang.splane,
        y: p.y,
        z: p.x * -cam.value.ang.splane + p.z * cam.value.ang.cplane,
      };
    },
    theta(p) {
      return {
        x: p.x,
        y: p.y * cam.value.ang.ctheta - p.z * cam.value.ang.stheta,
        z: p.y * cam.value.ang.stheta + p.z * cam.value.ang.ctheta,
      };
    },
    set(p) {
      return {
        x: p.x - cam.value.obj.x,
        y: p.y - cam.value.obj.y,
        z: p.z - cam.value.obj.z,
      };
    },
  },
  persp(p) {
    return {
      x: ((p.x * cam.value.dist.z) / p.z) * cam.value.zoom,
      y: ((p.y * cam.value.dist.z) / p.z) * cam.value.zoom,
      z: p.z * cam.value.zoom,
      p: cam.value.dist.z / p.z,
    };
  },
  disp(p, disp) {
    return {
      x: p.x + disp.x,
      y: -p.y + disp.y,
      z: p.z + disp.z,
      p: p.p,
    };
  },
  steps(_obj_, sz, rot, pos, disp) {
    let args = this.parts.sz(_obj_, sz);
    args = this.parts.rot.x(args, rot);
    args = this.parts.rot.y(args, rot);
    args = this.parts.rot.z(args, rot);
    args = this.parts.pos(args, pos);
    args = this.pov.plane(args);
    args = this.pov.theta(args);
    args = this.pov.set(args);
    args = this.persp(args);
    args = this.disp(args, disp);
    return args;
  },
};

// 3D 点类
class ThreeD {
  constructor(param) {
    this.transIn = {
      vtx: param.vtx,
      sz: param.sz,
      rot: param.rot,
      pos: param.pos,
    };
    this.transOut = {};
  }

  vupd() {
    this.transOut = trans.steps(
      this.transIn.vtx,
      this.transIn.sz,
      this.transIn.rot,
      this.transIn.pos,
      cam.value.disp,
    );
  }
}

const canvasRef = ref(null);
const ctx = ref(null);
const varr = ref([]);
const calc = ref([]);
const rotObj = ref({ x: 0, y: 0, z: 0 });
const objSz = ref({
  x: window.innerWidth / 5,
  y: window.innerHeight / 5,
  z: window.innerWidth / 5,
});
const toX = ref(_x);
const toY = ref(_y);
const vel = 0.04;
const lim = 360;
const diff = 200;
let animationFrameId = null;

const addParticle = () => {
  varr.value.push(
    new ThreeD({
      vtx: { x: rnd(), y: rnd(), z: rnd() },
      sz: { x: 0, y: 0, z: 0 },
      rot: { x: 20, y: -20, z: 0 },
      pos: {
        x: diff * Math.sin((360 * Math.random() * Math.PI) / 180),
        y: diff * Math.sin((360 * Math.random() * Math.PI) / 180),
        z: diff * Math.sin((360 * Math.random() * Math.PI) / 180),
      },
    }),
  );

  calc.value.push({
    x: 360 * Math.random(),
    y: 360 * Math.random(),
    z: 360 * Math.random(),
  });
};

const updateCamera = () => {
  cam.value.obj.x += (toX.value - cam.value.obj.x) * 0.05;
  cam.value.obj.y += (toY.value - cam.value.obj.y) * 0.05;
};

// 绘制粒子
const drawParticles = () => {
  ctx.value.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);
  cam.value.upd();

  rotObj.value.x += 0.1;
  rotObj.value.y += 0.1;
  rotObj.value.z += 0.1;

  varr.value.forEach((particle, i) => {
    calc.value[i].x += vel;
    calc.value[i].y += vel;
    calc.value[i].z += vel;

    if (calc.value[i].x > lim) calc.value[i].x = 0;
    if (calc.value[i].y > lim) calc.value[i].y = 0;
    if (calc.value[i].z > lim) calc.value[i].z = 0;
    particle.transIn.pos = {
      x: diff * Math.cos((calc.value[i].x * Math.PI) / 180),
      y: diff * Math.sin((calc.value[i].y * Math.PI) / 180),
      z: diff * Math.sin((calc.value[i].z * Math.PI) / 180),
    };

    particle.transIn.rot = rotObj.value;
    particle.transIn.sz = objSz.value;
    particle.vupd();

    if (particle.transOut.p < 0) return;

    const g = ctx.value.createRadialGradient(
      particle.transOut.x,
      particle.transOut.y,
      particle.transOut.p,
      particle.transOut.x,
      particle.transOut.y,
      particle.transOut.p * 2,
    );

    ctx.value.globalCompositeOperation = 'lighter';
    g.addColorStop(0, 'hsla(193, 71%, 100%, 1)');
    g.addColorStop(0.5, `hsla(${i + 2}, 71%, 100%, 1)`);
    g.addColorStop(1, `hsla(${i}, 71%, 100%, .5)`);

    ctx.value.fillStyle = g;
    ctx.value.beginPath();
    ctx.value.arc(
      particle.transOut.x,
      particle.transOut.y,
      particle.transOut.p * 2,
      0,
      Math.PI * 2,
    );
    ctx.value.fill();
    ctx.value.closePath();
  });
};

const animate = () => {
  updateCamera();
  drawParticles();
  animationFrameId = requestAnimationFrame(animate);
};

const init = () => {
  if (!canvasRef.value) return;

  canvasRef.value.width = window.innerWidth;
  canvasRef.value.height = window.innerHeight;
  ctx.value = canvasRef.value.getContext('2d');
  ctx.value.globalCompositeOperation = 'source-over';

  varr.value = [];
  calc.value = [];
  for (let i = 0; i < num.value; i++) {
    addParticle();
  }
  animate();
};

const handleMouseMove = (e) => {
  toX.value = (e.clientX - canvasRef.value.width / 2) * -0.8;
  toY.value = (e.clientY - canvasRef.value.height / 2) * 0.8;
};

const handleTouchMove = (e) => {
  e.preventDefault();
  toX.value = (e.touches[0].clientX - canvasRef.value.width / 2) * -0.8;
  toY.value = (e.touches[0].clientY - canvasRef.value.height / 2) * 0.8;
};

const handleResize = () => {
  if (!canvasRef.value) return;
  canvasRef.value.width = window.innerWidth;
  canvasRef.value.height = window.innerHeight;
  objSz.value = {
    x: window.innerWidth / 5,
    y: window.innerHeight / 5,
    z: window.innerWidth / 5,
  };
};

onMounted(() => {
  init();
  if (props.enableMove) {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
  }
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrameId);
  if (props.enableMove) {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('touchmove', handleTouchMove);
  }
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped>
.particles-canvas {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  pointer-events: none;
  background: transparent;
}
</style>
