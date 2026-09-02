// High-Definition Procedural 2.5D Textures, Shaders & Terrain Materials
export class TextureGenerator {
  public static oceanTexture: HTMLCanvasElement | null = null;
  public static cliffRockTexture: HTMLCanvasElement | null = null;
  public static soilGrassTexture: HTMLCanvasElement | null = null;
  public static mountainRockTexture: HTMLCanvasElement | null = null;
  public static sandTexture: HTMLCanvasElement | null = null;
  public static concreteTexture: HTMLCanvasElement | null = null;
  public static carrierDeckTexture: HTMLCanvasElement | null = null;
  public static metalArmorTexture: HTMLCanvasElement | null = null;

  public static init() {
    if (typeof document === 'undefined') return;
    this.oceanTexture = this.generateOceanTexture();
    this.cliffRockTexture = this.generateCliffRockTexture();
    this.soilGrassTexture = this.generateSoilGrassTexture();
    this.mountainRockTexture = this.generateMountainRockTexture();
    this.sandTexture = this.generateSandTexture();
    this.concreteTexture = this.generateConcreteTexture();
    this.carrierDeckTexture = this.generateCarrierDeckTexture();
    this.metalArmorTexture = this.generateMetalArmorTexture();
  }

  // High-Detail Geological Basalt, Granite & Sedimentary Cliff Rock Texture
  private static generateCliffRockTexture(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // Rich dark slate rock base with natural vertical gradient
    const rockGrad = ctx.createLinearGradient(0, 0, 0, 512);
    rockGrad.addColorStop(0, '#334155');
    rockGrad.addColorStop(0.3, '#1e293b');
    rockGrad.addColorStop(0.7, '#0f172a');
    rockGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = rockGrad;
    ctx.fillRect(0, 0, 512, 512);

    // Multi-octave organic grain noise
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 36;
      data[i] = Math.min(255, Math.max(0, data[i] + noise + 2));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise + 2));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise + 4));
    }
    ctx.putImageData(imgData, 0, 0);

    // Soft geological strata layers (natural blending, no harsh lines)
    for (let y = 0; y < 512; y += 18 + Math.floor(Math.random() * 12)) {
      const layerH = 14 + Math.floor(Math.random() * 20);
      const isWarm = Math.random() > 0.6;
      const alpha = 0.15 + Math.random() * 0.2;

      ctx.fillStyle = isWarm ? `rgba(180, 140, 100, ${alpha})` : `rgba(71, 85, 105, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= 512; x += 32) {
        const ny = y + Math.sin(x * 0.02 + y * 0.05) * 6 + (Math.random() - 0.5) * 3;
        ctx.lineTo(x, ny);
      }
      ctx.lineTo(512, y + layerH);
      ctx.lineTo(0, y + layerH);
      ctx.closePath();
      ctx.fill();
    }

    // Natural vertical joints and fracture fissures with ambient occlusion & subtle highlight
    for (let x = 16; x < 512; x += 32 + Math.floor(Math.random() * 40)) {
      ctx.strokeStyle = 'rgba(2, 6, 23, 0.6)';
      ctx.lineWidth = 1.5 + Math.random() * 1.5;
      ctx.beginPath();
      let cx = x;
      ctx.moveTo(cx, 0);
      for (let y = 0; y <= 512; y += 24) {
        cx += (Math.random() - 0.5) * 8;
        ctx.lineTo(cx, y);
      }
      ctx.stroke();

      // Right-side light catch on fractures
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx + 1.5, 0);
      for (let y = 0; y <= 512; y += 24) {
        ctx.lineTo(cx + 1.5, y);
      }
      ctx.stroke();
    }

    // Natural moss, lichen & vegetation patches
    for (let i = 0; i < 35; i++) {
      const px = Math.random() * 512;
      const py = Math.random() * 250; // more moss near top
      const radX = 8 + Math.random() * 20;
      const radY = 4 + Math.random() * 10;
      
      const mossGrad = ctx.createRadialGradient(px, py, 0, px, py, radX);
      mossGrad.addColorStop(0, 'rgba(74, 120, 20, 0.4)');
      mossGrad.addColorStop(0.7, 'rgba(54, 83, 20, 0.2)');
      mossGrad.addColorStop(1, 'rgba(54, 83, 20, 0)');
      
      ctx.fillStyle = mossGrad;
      ctx.beginPath();
      ctx.ellipse(px, py, radX, radY, (Math.random() - 0.5) * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    return canvas;
  }

  // Topsoil, Grass & Natural Vegetation Turf Texture
  private static generateSoilGrassTexture(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // Organic rich loam soil base
    const soilGrad = ctx.createLinearGradient(0, 0, 0, 128);
    soilGrad.addColorStop(0, '#15803d'); // upper lush root zone
    soilGrad.addColorStop(0.2, '#3f6212'); // olive sub-grass
    soilGrad.addColorStop(0.5, '#3b2816'); // rich brown humus
    soilGrad.addColorStop(1, '#1c1917'); // dark bedrock loam
    ctx.fillStyle = soilGrad;
    ctx.fillRect(0, 0, 512, 128);

    // Fine organic soil noise
    for (let i = 0; i < 600; i++) {
      const sx = Math.random() * 512;
      const sy = 25 + Math.random() * 100;
      const sz = 1 + Math.random() * 2.5;
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(120, 90, 60, 0.4)' : 'rgba(20, 15, 10, 0.5)';
      ctx.beginPath();
      ctx.arc(sx, sy, sz, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dense organic grass stalks with varied green/gold hues
    for (let x = 0; x < 512; x += 1.2) {
      const h = 18 + Math.sin(x * 0.1) * 8 + (Math.random() - 0.5) * 8;
      const lean = (Math.random() - 0.5) * 7;
      const palette = [
        '#22c55e', '#16a34a', '#15803d', '#4ade80', '#84cc16', '#65a30d', '#a3e635'
      ];
      ctx.strokeStyle = palette[Math.floor(Math.random() * palette.length)];
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(x, 26);
      ctx.quadraticCurveTo(x + lean * 0.4, 26 - h * 0.5, x + lean, 26 - h);
      ctx.stroke();
    }

    return canvas;
  }

  // Alpine Mountain Rock & Geological Crag Texture
  private static generateMountainRockTexture(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // Atmospheric mountain slate gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#475569');
    grad.addColorStop(0.5, '#334155');
    grad.addColorStop(1, '#1e293b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Natural mountain ridge facets with lighting angle
    for (let i = 0; i < 70; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const w = 40 + Math.random() * 80;
      const h = 30 + Math.random() * 60;

      // Sunlit mountain slope (top-left)
      ctx.fillStyle = 'rgba(203, 213, 225, 0.12)';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w * 0.5, y - h * 0.3);
      ctx.lineTo(x + w, y + h * 0.2);
      ctx.closePath();
      ctx.fill();

      // Shadowed mountain slope (bottom-right)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y + h * 0.2);
      ctx.lineTo(x + w * 0.4, y + h);
      ctx.closePath();
      ctx.fill();
    }

    return canvas;
  }

  // Shoreline Sand, Silt & Pebble Dune Texture
  private static generateSandTexture(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const sandGrad = ctx.createLinearGradient(0, 0, 0, 128);
    sandGrad.addColorStop(0, '#eab308'); // dry sunny sand
    sandGrad.addColorStop(0.4, '#ca8a04'); // coastal berm
    sandGrad.addColorStop(0.8, '#a16207'); // damp tide sand
    sandGrad.addColorStop(1, '#713f12'); // submerged wet sand
    ctx.fillStyle = sandGrad;
    ctx.fillRect(0, 0, 256, 128);

    // Fine mineral speckles
    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(254, 240, 138, 0.4)' : 'rgba(69, 26, 3, 0.3)';
      ctx.fillRect(Math.random() * 256, Math.random() * 128, 1.5, 1.5);
    }

    return canvas;
  }

  // Realistic Ocean Water Texture with smooth depth gradations
  private static generateOceanTexture(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#0284c7');
    grad.addColorStop(0.3, '#0369a1');
    grad.addColorStop(0.7, '#075985');
    grad.addColorStop(1, '#082f49');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    // Subtle soft water caustic shimmer
    for (let y = 0; y < 256; y += 6) {
      for (let x = 0; x < 512; x += 16) {
        const wave = Math.sin(x * 0.04 + y * 0.06) * Math.cos(x * 0.02 - y * 0.03);
        if (wave > 0.3) {
          ctx.fillStyle = `rgba(186, 230, 253, ${wave * 0.18})`;
          ctx.beginPath();
          ctx.ellipse(x, y, 12, 3, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    return canvas;
  }

  // Military concrete airfield tarmac texture
  private static generateConcreteTexture(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.fillStyle = '#3f3f46';
    ctx.fillRect(0, 0, 512, 128);

    // Asphalt noise
    const imgData = ctx.getImageData(0, 0, 512, 128);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 20;
      data[i] += n;
      data[i + 1] += n;
      data[i + 2] += n;
    }
    ctx.putImageData(imgData, 0, 0);

    // Concrete slab expansion joints
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 2;
    for (let x = 0; x < 512; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 128);
      ctx.stroke();
    }

    return canvas;
  }

  // Aircraft Carrier non-skid steel flight deck texture
  private static generateCarrierDeckTexture(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 256, 128);

    // Anti-slip diamond/grit coating
    for (let y = 0; y < 128; y += 4) {
      for (let x = 0; x < 256; x += 4) {
        if ((x + y) % 8 === 0) {
          ctx.fillStyle = 'rgba(51, 65, 85, 0.4)';
          ctx.fillRect(x, y, 2, 2);
        }
      }
    }

    ctx.strokeStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.lineWidth = 1.5;
    for (let x = 0; x < 256; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 128);
      ctx.stroke();
    }

    return canvas;
  }

  // Metallic armor plate texture
  private static generateMetalArmorTexture(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const grad = ctx.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, '#64748b');
    grad.addColorStop(0.5, '#475569');
    grad.addColorStop(1, '#334155');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    ctx.fillStyle = '#94a3b8';
    for (let x = 8; x < 128; x += 24) {
      for (let y = 8; y < 128; y += 24) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    return canvas;
  }
}
