export const hex = (n, w = 2) => n.toString(16).toUpperCase().padStart(w, "0");

// Draws the sky as a fisheye looking straight up: zenith at the centre, horizon on a ring
// 90 deg out, with a little room below the horizon (the lowest stars dip ~3 deg under it).
export function drawSky(ctx, size, stars, caption) {
  const R = size * 0.47; // 95 deg from the zenith
  const c = size / 2;
  const s = size / 4096;

  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "rgb(11,14,32)";
  ctx.fillRect(0, 0, size, size);
  const sky = ctx.createRadialGradient(c, c, 0, c, c, R);
  sky.addColorStop(0, "rgb(3,4,10)");
  sky.addColorStop(0.5, "rgb(4,5,13)");
  sky.addColorStop(0.8, "rgb(7,9,21)");
  sky.addColorStop(1, "rgb(11,14,32)");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgb(40,46,70)";
  ctx.lineWidth = Math.max(1, 2 * s);
  ctx.beginPath();
  ctx.arc(c, c, (90 / 95) * R, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalCompositeOperation = "lighter";
  for (const st of stars) {
    const elev = Math.atan2(st.y, Math.hypot(st.x, st.z)) * (180 / Math.PI);
    const az = Math.atan2(st.x, st.z);
    const rad = ((90 - elev) / 95) * R;
    const px = c - rad * Math.sin(az);
    const py = c - rad * Math.cos(az);
    const [r, g, b] = st.color;
    // In-game each star is a rectangle `width` quarter-pixels wide; wider stars draw bigger here.
    const core = Math.max((0.6 + st.width * 0.32) * 2 * s, 0.35);
    const halo = core * 3.2;

    const haloAlpha = 0.1 * (st.width / 10) * 0.55;
    const hg = ctx.createRadialGradient(px, py, 0, px, py, halo * 3);
    hg.addColorStop(0, `rgba(${r},${g},${b},${haloAlpha})`);
    hg.addColorStop(1 / 3, `rgba(${r},${g},${b},${haloAlpha * 0.61})`);
    hg.addColorStop(2 / 3, `rgba(${r},${g},${b},${haloAlpha * 0.135})`);
    hg.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = hg;
    ctx.fillRect(px - halo * 3, py - halo * 3, halo * 6, halo * 6);

    // White-hot centre fading smoothly into the star's colour
    const mix = (v, w) => Math.round(v * (1 - w) + 255 * w);
    const cg = ctx.createRadialGradient(px, py, 0, px, py, core * 3);
    cg.addColorStop(0, `rgba(${mix(r, 0.7)},${mix(g, 0.7)},${mix(b, 0.7)},1)`);
    cg.addColorStop(0.2, `rgba(${mix(r, 0.45)},${mix(g, 0.45)},${mix(b, 0.45)},0.85)`);
    cg.addColorStop(1 / 3, `rgba(${r},${g},${b},0.55)`);
    cg.addColorStop(2 / 3, `rgba(${r},${g},${b},0.12)`);
    cg.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = cg;
    ctx.fillRect(px - core * 3, py - core * 3, core * 6, core * 6);
  }

  if (caption) {
    ctx.globalCompositeOperation = "source-over";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgb(220,214,230)";
    ctx.font = `${64 * s}px Georgia, serif`;
    ctx.fillText(`“${caption.name}”`, 60 * s, 50 * s);
    ctx.fillStyle = "rgb(140,140,165)";
    ctx.font = `${34 * s}px Georgia, serif`;
    ctx.fillText(`name bytes ${caption.bytes.map((b) => hex(b)).join(" ")}   seed 0x${hex(caption.seed, 8)}`,
      60 * s, 135 * s);
    ctx.fillText(caption.label, 60 * s, 185 * s);
    ctx.fillStyle = "rgb(90,92,120)";
    ctx.fillText("Majora's Mask night sky · looking straight up, ring = horizon", 60 * s, size - 90 * s);
  }
  ctx.restore();
}
