// The in-game view: the stars drawn the way Environment_DrawSkyboxStarsImpl draws them, into a
// 320x240 frame with the game's default 60 degree field of view.
//
// Each star is projected to the screen, snapped to quarter pixels (the texture rectangle's
// 10.2 fixed-point coordinates) and drawn as a rectangle `width` quarter-pixels wide and one
// pixel tall. The render mode (G_RM_AA_XLU_LINE) uses pixel coverage as alpha, so a star
// narrower than a pixel draws faint and changes brightness as it crosses pixel boundaries.
// Coverage is modelled here as overlap area rounded down to eighths (the RDP's 8 samples per pixel).

export const W = 320;
export const H = 240;
const FOVY = 60;
const T = Math.tan((FOVY / 2) * (Math.PI / 180));
const ASPECT = W / H;

// Stand-ins for the skybox and scenery, which this page doesn't have
const ZENITH = [3, 5, 18];
const HORIZON = [22, 30, 62];
const GROUND = [7, 8, 11];

export class LookAround {
  constructor(canvas) {
    this.canvas = canvas;
    canvas.width = W;
    canvas.height = H;
    this.ctx = canvas.getContext("2d");
    this.image = this.ctx.createImageData(W, H);
    this.stars = [];
    this.yaw = Math.PI;              // facing -Z, towards the shared blue constellation
    this.pitch = (30 * Math.PI) / 180;

    // Per-pixel view-ray terms that don't depend on the camera
    this.rayX = new Float32Array(W * H);
    this.rayY = new Float32Array(W * H);
    this.invLen = new Float32Array(W * H);
    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const i = py * W + px;
        const rx = ((px + 0.5 - W / 2) / (W / 2)) * T * ASPECT;
        const ry = (-(py + 0.5 - H / 2) / (H / 2)) * T;
        this.rayX[i] = rx;
        this.rayY[i] = ry;
        this.invLen[i] = 1 / Math.hypot(1, rx, ry);
      }
    }
  }

  setStars(stars) {
    this.stars = stars;
    this.render();
  }

  look(dYaw, dPitch) {
    this.yaw += dYaw;
    const lim = (89 * Math.PI) / 180;
    this.pitch = Math.max(-lim, Math.min(lim, this.pitch + dPitch));
    this.render();
  }

  render() {
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const f = [Math.sin(this.yaw) * cp, sp, Math.cos(this.yaw) * cp]; // forward
    const s = [-f[2] / Math.hypot(f[0], f[2]), 0, f[0] / Math.hypot(f[0], f[2])]; // right = f x up
    const u = [s[1] * f[2] - s[2] * f[1], s[2] * f[0] - s[0] * f[2], s[0] * f[1] - s[1] * f[0]]; // up = s x f

    const d = this.image.data;
    const ground = new Uint8Array(W * H);

    // Sky gradient by elevation of each pixel's view ray
    for (let i = 0; i < W * H; i++) {
      const sinElev = (f[1] + u[1] * this.rayY[i]) * this.invLen[i]; // s[1] is always 0
      const o = i * 4;
      if (sinElev < 0) {
        ground[i] = 1;
      }
      const t = Math.min(1, Math.max(0, sinElev)) ** 0.6;
      d[o] = HORIZON[0] + (ZENITH[0] - HORIZON[0]) * t;
      d[o + 1] = HORIZON[1] + (ZENITH[1] - HORIZON[1]) * t;
      d[o + 2] = HORIZON[2] + (ZENITH[2] - HORIZON[2]) * t;
      d[o + 3] = 255;
    }

    for (const st of this.stars) {
      const w = st.x * f[0] + st.y * f[1] + st.z * f[2];
      if (w < 1) continue;
      const nx = (st.x * s[0] + st.z * s[2]) / (w * T * ASPECT);
      const ny = (st.x * u[0] + st.y * u[1] + st.z * u[2]) / (w * T);
      if (!(nx > -1 && nx < 1 && ny > -1 && ny < 1)) continue;

      // Same screen mapping and u32 truncation as the game: quarter-pixel units
      const xl = Math.trunc((nx * (W / 2) + W / 2) * 4);
      const yl = Math.trunc((ny * -(H / 2) + H / 2) * 4);
      const xh = xl + st.width;
      const yh = yl + 4;
      const [r, g, b] = st.color;

      for (let py = yl >> 2; py <= (yh - 1) >> 2 && py < H; py++) {
        const vq = Math.min(yh, py * 4 + 4) - Math.max(yl, py * 4);
        for (let px = xl >> 2; px <= (xh - 1) >> 2 && px < W; px++) {
          const hq = Math.min(xh, px * 4 + 4) - Math.max(xl, px * 4);
          const a = Math.floor((hq * vq) / 2) / 8; // overlap in 16ths -> coverage in 8ths
          if (a <= 0) continue;
          const o = (py * W + px) * 4;
          d[o] += (r - d[o]) * a;
          d[o + 1] += (g - d[o + 1]) * a;
          d[o + 2] += (b - d[o + 2]) * a;
        }
      }
    }

    // Scenery is drawn after the stars in-game, so the ground hides the few just below the horizon
    for (let i = 0; i < W * H; i++) {
      if (!ground[i]) continue;
      const o = i * 4;
      d[o] = GROUND[0];
      d[o + 1] = GROUND[1];
      d[o + 2] = GROUND[2];
    }

    this.ctx.putImageData(this.image, 0, 0);
  }
}
