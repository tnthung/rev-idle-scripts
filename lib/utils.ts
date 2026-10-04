import type { Planet, ZodiacSign, ZodiacStatType } from "./states.ts";


export async function pollFor(pred: () => boolean | Promise<boolean>, interval = 100, timeout = 5000) {
  while (!await pred() && timeout > 0) {
    await rev.sleep(interval);
    timeout -= interval;
  }

  return timeout > 0;
}


export function isStringNumeric(value: string): boolean {
  if (typeof value !== "string" || value.trim() === "") return false;
  return !isNaN(Number(value)) && !isNaN(parseFloat(value));
}


export type ColorBlendMode = "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten"
  | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion";

/**
 * Immutable sRGB color. RGB/RGBA channels use 0..255; other components and alpha use 0..1.
 * HSL, HSV, and HWB hue uses degrees and wraps at 360. Finite channels are clamped.
 * Numeric factories accept separate components or a tuple; conversions retain alpha.
 */
export class Color {
  private constructor(private r: number, private g: number, private b: number, private a = 255) {
    if (![r, g, b, a].every(Number.isFinite)) throw new Error("Invalid color channels.");
    this.r = Math.max(0, Math.min(255, r));
    this.g = Math.max(0, Math.min(255, g));
    this.b = Math.max(0, Math.min(255, b));
    this.a = Math.max(0, Math.min(255, a));
  }

  static fromRgb(rgb: readonly [number, number, number, number?]): Color;
  static fromRgb(r: number, g: number, b: number, a?: number): Color;
  static fromRgb(r: number | readonly [number, number, number, number?], g?: number, b?: number, a = 255) {
    return typeof r === "number" ? new Color(r, g!, b!, a) : new Color(...r);
  }

  static fromNormalizedRgb(rgb: readonly [number, number, number, number?]): Color;
  static fromNormalizedRgb(r: number, g: number, b: number, a?: number): Color;
  static fromNormalizedRgb(r: number | readonly [number, number, number, number?], g?: number, b?: number, a = 1): Color {
    if (typeof r !== "number") return Color.fromNormalizedRgb(...r);
    return new Color(r * 255, g! * 255, b! * 255, a * 255);
  }

  static fromLinearRgb(rgb: readonly [number, number, number, number?]): Color;
  static fromLinearRgb(r: number, g: number, b: number, a?: number): Color;
  static fromLinearRgb(r: number | readonly [number, number, number, number?], g?: number, b?: number, a = 1): Color {
    if (typeof r !== "number") return Color.fromLinearRgb(...r);
    if (![r, g, b, a].every(Number.isFinite)) throw new Error("Invalid linear RGB color.");
    return new Color(...[r, g!, b!].map(channel => {
      channel = Math.max(0, Math.min(1, channel));
      return 255 * (channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055);
    }) as [number, number, number], a * 255);
  }

  static fromHsl(hsl: readonly [number, number, number, number?]): Color;
  static fromHsl(h: number, s: number, l: number, a?: number): Color;
  static fromHsl(h: number | readonly [number, number, number, number?], s?: number, l?: number, a = 1): Color {
    if (typeof h !== "number") return Color.fromHsl(...h);
    if (![h, s, l, a].every(Number.isFinite)) throw new Error("Invalid HSL color.");
    s = Math.max(0, Math.min(1, s!));
    l = Math.max(0, Math.min(1, l!));
    const v = l + s * Math.min(l, 1 - l);
    return Color.fromHsv(h, v === 0 ? 0 : 2 * (1 - l / v), v, a);
  }

  static fromHsv(hsv: readonly [number, number, number, number?]): Color;
  static fromHsv(h: number, s: number, v: number, a?: number): Color;
  static fromHsv(h: number | readonly [number, number, number, number?], s?: number, v?: number, a = 1): Color {
    if (typeof h !== "number") return Color.fromHsv(...h);
    if (![h, s, v, a].every(Number.isFinite)) throw new Error("Invalid HSV color.");
    h = ((h % 360) + 360) % 360 / 60;
    s = Math.max(0, Math.min(1, s!));
    v = Math.max(0, Math.min(1, v!));
    const chroma = v * s;
    const x = chroma * (1 - Math.abs(h % 2 - 1));
    return new Color(...(h < 1 ? [chroma, x, 0] : h < 2 ? [x, chroma, 0]
      : h < 3 ? [0, chroma, x] : h < 4 ? [0, x, chroma]
      : h < 5 ? [x, 0, chroma] : [chroma, 0, x])
      .map(channel => (channel + v - chroma) * 255) as [number, number, number], a * 255);
  }

  static fromHwb(hwb: readonly [number, number, number, number?]): Color;
  static fromHwb(h: number, w: number, b: number, a?: number): Color;
  static fromHwb(h: number | readonly [number, number, number, number?], w?: number, b?: number, a = 1): Color {
    if (typeof h !== "number") return Color.fromHwb(...h);
    if (![h, w, b, a].every(Number.isFinite)) throw new Error("Invalid HWB color.");
    w = Math.max(0, Math.min(1, w!));
    b = Math.max(0, Math.min(1, b!));
    if (w + b >= 1) {
      const gray = w / (w + b) * 255;
      return new Color(gray, gray, gray, a * 255);
    }
    return new Color(...Color.fromHsv(h, 1, 1).toNormalizedRgb().slice(0, 3)
      .map(channel => (channel * (1 - w! - b!) + w!) * 255) as [number, number, number], a * 255);
  }

  /** Simple device CMYK conversion; no printer profile is applied. */
  static fromCmyk(cmyk: readonly [number, number, number, number, number?]): Color;
  static fromCmyk(c: number, m: number, y: number, k: number, a?: number): Color;
  static fromCmyk(c: number | readonly [number, number, number, number, number?], m?: number, y?: number, k?: number, a = 1): Color {
    if (typeof c !== "number") return Color.fromCmyk(...c);
    if (![c, m, y, k, a].every(Number.isFinite)) throw new Error("Invalid CMYK color.");
    k = Math.max(0, Math.min(1, k!));
    return new Color(
      (1 - Math.max(0, Math.min(1, c))) * (1 - k) * 255,
      (1 - Math.max(0, Math.min(1, m!))) * (1 - k) * 255,
      (1 - Math.max(0, Math.min(1, y!))) * (1 - k) * 255,
      a * 255,
    );
  }

  static fromHex(hex: string) {
    hex = hex.trim().replace(/^#/, "");
    if (!/^(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(hex))
      throw new Error("Invalid hex color.");
    if (hex.length <= 4) hex = hex.split("").map(c => c + c).join("");
    return new Color(
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
      hex.length === 8 ? parseInt(hex.slice(6, 8), 16) : 255,
    );
  }

  /** Parse hex, transparent, rgb()/rgba(), hsl()/hsla(), or hwb(). */
  static fromCss(css: string) {
    css = css.trim().toLowerCase();
    if (css === "transparent") return new Color(0, 0, 0, 0);
    if (css.startsWith("#")) return Color.fromHex(css);
    const match = /^(rgba?|hsla?|hwb)\((.*)\)$/s.exec(css);
    if (!match) throw new Error("Unsupported CSS color.");
    const legacy = match[2].includes(",");
    let parts: string[];
    if (legacy) {
      if (match[2].includes("/") || match[1] === "hwb") throw new Error("Invalid CSS color.");
      parts = match[2].split(/\s*,\s*/).map(part => part.trim());
    } else {
      const separated = match[2].trim().split(/\s*\/\s*/);
      if (separated.length > 2 || separated.some(part => part.trim() === ""))
        throw new Error("Invalid CSS color.");
      parts = separated[0].trim().split(/\s+/);
      if (parts.length !== 3) throw new Error("Invalid CSS color.");
      if (separated.length === 2) parts.push(separated[1].trim());
    }
    if ((parts.length !== 3 && parts.length !== 4) || !parts.every((part, index) =>
      index === 0 && !match[1].startsWith("rgb")
        ? /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?(?:deg|grad|rad|turn)?$/.test(part)
        : /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?%?$/.test(part)))
      throw new Error("Invalid CSS color.");
    if (legacy && (match[1].startsWith("hsl") && parts.slice(1, 3).some(part => !part.endsWith("%"))
      || match[1].startsWith("rgb") && parts.slice(0, 3).some(part => part.endsWith("%") !== parts[0].endsWith("%"))))
      throw new Error("Invalid legacy CSS color.");
    const values = parts.map(part => parseFloat(part));
    if (!values.every(Number.isFinite)) throw new Error("Invalid CSS color.");
    const alpha = Math.max(0, Math.min(1, parts.length === 4 ? values[3] / (parts[3].endsWith("%") ? 100 : 1) : 1));
    if (match[1].startsWith("rgb"))
      return new Color(...values.slice(0, 3).map((value, index) =>
        parts[index].endsWith("%") ? value / 100 * 255 : value) as [number, number, number], alpha * 255);
    if (match[1] === "hwb" && Math.max(0, values[1]) + Math.max(0, values[2]) >= 100) {
      const gray = Math.max(0, values[1]) / (Math.max(0, values[1]) + Math.max(0, values[2])) * 255;
      return new Color(gray, gray, gray, alpha * 255);
    }
    return (match[1] === "hwb" ? Color.fromHwb : Color.fromHsl)(
      values[0] * (parts[0].endsWith("turn") ? 360 : parts[0].endsWith("grad") ? 0.9
        : parts[0].endsWith("rad") ? 180 / Math.PI : 1),
      values[1] / 100, values[2] / 100, alpha,
    );
  }

  /** Scale RGB channels while preserving alpha. */
  brightness(factor: number) {
    return new Color(this.r * factor, this.g * factor, this.b * factor, this.a);
  }

  /** Scale channel distance from middle gray; 1 keeps the original contrast. */
  contrast(factor: number) {
    return new Color(
      (this.r - 127.5) * factor + 127.5,
      (this.g - 127.5) * factor + 127.5,
      (this.b - 127.5) * factor + 127.5,
      this.a,
    );
  }

  /** Apply a positive gamma; values above 1 brighten the color. */
  gamma(value: number) {
    if (!Number.isFinite(value) || value <= 0) throw new Error("Invalid gamma.");
    return new Color(
      255 * (this.r / 255) ** (1 / value),
      255 * (this.g / 255) ** (1 / value),
      255 * (this.b / 255) ** (1 / value),
      this.a,
    );
  }

  rotateHue(degrees: number) {
    const hsl = this.toHsl();
    return Color.fromHsl(hsl[0] + degrees, hsl[1], hsl[2], hsl[3]);
  }

  /** Scale HSL saturation; 0 removes saturation and 1 keeps it. */
  saturation(factor: number) {
    const hsl = this.toHsl();
    return Color.fromHsl(hsl[0], hsl[1] * factor, hsl[2], hsl[3]);
  }

  /** Add to HSL lightness, using a 0..1 amount. */
  lighten(amount = 0.1) {
    const hsl = this.toHsl();
    return Color.fromHsl(hsl[0], hsl[1], hsl[2] + amount, hsl[3]);
  }

  darken(amount = 0.1) {
    return this.lighten(-amount);
  }

  /** Set opacity from 0 (transparent) to 1 (opaque). */
  opacity(value: number) {
    return new Color(this.r, this.g, this.b, value * 255);
  }

  /** Scale the existing alpha. */
  fade(factor: number) {
    return new Color(this.r, this.g, this.b, this.a * factor);
  }

  /** Interpolate RGBA channels; amount 0 keeps this color and 1 selects the other. */
  mix(other: Color, amount = 0.5) {
    if (!Number.isFinite(amount)) throw new Error("Invalid blend amount.");
    amount = Math.max(0, Math.min(1, amount));
    return new Color(
      this.r + (other.r - this.r) * amount,
      this.g + (other.g - this.g) * amount,
      this.b + (other.b - this.b) * amount,
      this.a + (other.a - this.a) * amount,
    );
  }

  tint(amount = 0.1) {
    return this.mix(new Color(255, 255, 255, this.a), amount);
  }

  shade(amount = 0.1) {
    return this.mix(new Color(0, 0, 0, this.a), amount);
  }

  invert(amount = 1) {
    return this.mix(new Color(255 - this.r, 255 - this.g, 255 - this.b, this.a), amount);
  }

  /** Convert to gray with the same relative luminance. */
  grayscale(amount = 1) {
    const luminance = this.luminance();
    const gray = 255 * (luminance <= 0.0031308 ? luminance * 12.92 : 1.055 * luminance ** (1 / 2.4) - 0.055);
    return this.mix(new Color(gray, gray, gray, this.a), amount);
  }

  sepia(amount = 1) {
    return this.mix(new Color(
      this.r * 0.393 + this.g * 0.769 + this.b * 0.189,
      this.r * 0.349 + this.g * 0.686 + this.b * 0.168,
      this.r * 0.272 + this.g * 0.534 + this.b * 0.131,
      this.a,
    ), amount);
  }

  /** Blend a source over this color, including alpha compositing. */
  blend(source: Color, mode: ColorBlendMode = "normal", amount = 1) {
    if (!Number.isFinite(amount)) throw new Error("Invalid blend amount.");
    const sourceAlpha = source.a / 255 * Math.max(0, Math.min(1, amount));
    const backdropAlpha = this.a / 255;
    const alpha = sourceAlpha + backdropAlpha * (1 - sourceAlpha);
    return new Color(...[this.r, this.g, this.b].map((channel, index) => {
      const backdrop = channel / 255;
      const foreground = [source.r, source.g, source.b][index] / 255;
      let blended: number;
      switch (mode) {
        case "normal":      blended = foreground; break;
        case "multiply":    blended = backdrop * foreground; break;
        case "screen":      blended = backdrop + foreground - backdrop * foreground; break;
        case "overlay":     blended = backdrop <= 0.5 ? 2 * backdrop * foreground : 1 - 2 * (1 - backdrop) * (1 - foreground); break;
        case "darken":      blended = Math.min(backdrop, foreground); break;
        case "lighten":     blended = Math.max(backdrop, foreground); break;
        case "color-dodge": blended = backdrop === 0 ? 0 : foreground === 1 ? 1 : Math.min(1, backdrop / (1 - foreground)); break;
        case "color-burn":  blended = backdrop === 1 ? 1 : foreground === 0 ? 0 : 1 - Math.min(1, (1 - backdrop) / foreground); break;
        case "hard-light":  blended = foreground <= 0.5 ? 2 * backdrop * foreground : 1 - 2 * (1 - backdrop) * (1 - foreground); break;
        case "soft-light":  blended = foreground <= 0.5 ? backdrop - (1 - 2 * foreground) * backdrop * (1 - backdrop)
          : backdrop + (2 * foreground - 1) * ((backdrop <= 0.25 ? ((16 * backdrop - 12) * backdrop + 4) * backdrop : Math.sqrt(backdrop)) - backdrop); break;
        case "difference":  blended = Math.abs(backdrop - foreground); break;
        case "exclusion":   blended = backdrop + foreground - 2 * backdrop * foreground; break;
        default: throw new Error("Invalid blend mode.");
      }
      return alpha === 0 ? 0 : 255 * ((1 - sourceAlpha) * backdropAlpha * backdrop
        + sourceAlpha * ((1 - backdropAlpha) * foreground + backdropAlpha * blended)) / alpha;
    }) as [number, number, number], alpha * 255);
  }

  over(background: Color) {
    return background.blend(this);
  }

  /** Relative sRGB luminance; composite with over() first to account for alpha. */
  luminance() {
    return this.toLinearRgb().slice(0, 3).reduce((sum, channel, index) =>
      sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  }

  contrastRatio(other: Color) {
    const a = this.luminance();
    const b = other.luminance();
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }

  /** Choose the black or white text color with greater contrast. */
  textColor() {
    return this.luminance() > Math.sqrt(0.0525) - 0.05 ? new Color(0, 0, 0) : new Color(255, 255, 255);
  }

  equals(other: Color, tolerance = 0) {
    if (!Number.isFinite(tolerance) || tolerance < 0) throw new Error("Invalid color tolerance.");
    return Math.abs(this.r - other.r) <= tolerance && Math.abs(this.g - other.g) <= tolerance
      && Math.abs(this.b - other.b) <= tolerance && Math.abs(this.a - other.a) <= tolerance;
  }

  complement() {
    return this.rotateHue(180);
  }

  analogous(angle = 30): [Color, Color, Color] {
    return [this.rotateHue(-angle), this, this.rotateHue(angle)];
  }

  triadic(): [Color, Color, Color] {
    return [this, this.rotateHue(120), this.rotateHue(240)];
  }

  tetradic(): [Color, Color, Color, Color] {
    return [this, this.rotateHue(90), this.rotateHue(180), this.rotateHue(270)];
  }

  splitComplementary(angle = 30): [Color, Color, Color] {
    return [this, this.rotateHue(180 - angle), this.rotateHue(180 + angle)];
  }

  toRgb(): [number, number, number, number] {
    return [Math.round(this.r), Math.round(this.g), Math.round(this.b), Math.round(this.a)];
  }

  toRbg(): [number, number, number, number] {
    return this.toRgb();
  }

  toNormalizedRgb(): [number, number, number, number] {
    return [this.r / 255, this.g / 255, this.b / 255, this.a / 255];
  }

  toLinearRgb(): [number, number, number, number] {
    return [...[this.r, this.g, this.b].map(channel => {
      channel /= 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number], this.a / 255];
  }

  toHsv(): [number, number, number, number] {
    const max = Math.max(this.r, this.g, this.b);
    const delta = max - Math.min(this.r, this.g, this.b);
    let hue = 0;
    if (delta !== 0) {
      if      (max === this.r) hue = (this.g - this.b) / delta;
      else if (max === this.g) hue = 2 + (this.b - this.r) / delta;
      else                    hue = 4 + (this.r - this.g) / delta;
      hue = (hue * 60 + 360) % 360;
    }
    return [hue, max === 0 ? 0 : delta / max, max / 255, this.a / 255];
  }

  toHsl(): [number, number, number, number] {
    const hsv = this.toHsv();
    const lightness = hsv[2] * (1 - hsv[1] / 2);
    return [hsv[0], lightness === 0 || lightness === 1 ? 0
      : (hsv[2] - lightness) / Math.min(lightness, 1 - lightness), lightness, hsv[3]];
  }

  toHwb(): [number, number, number, number] {
    return [this.toHsv()[0], Math.min(this.r, this.g, this.b) / 255,
      1 - Math.max(this.r, this.g, this.b) / 255, this.a / 255];
  }

  toCmyk(): [number, number, number, number, number] {
    const k = 1 - Math.max(this.r, this.g, this.b) / 255;
    if (k === 1) return [0, 0, 0, 1, this.a / 255];
    return [(1 - this.r / 255 - k) / (1 - k), (1 - this.g / 255 - k) / (1 - k),
      (1 - this.b / 255 - k) / (1 - k), k, this.a / 255];
  }

  toHex(includeAlpha = false) {
    return "#" + this.toRgb().slice(0, includeAlpha ? 4 : 3)
      .map(value => value.toString(16).padStart(2, "0")).join("");
  }

  toCss(format: "rgb" | "hsl" | "hwb" | "hex" = "rgb") {
    switch (format) {
      case "hex": return this.toHex(this.a < 255);
      case "rgb": return `rgba(${this.toRgb().slice(0, 3).join(", ")}, ${Number((this.a / 255).toFixed(6))})`;
      case "hsl":
      case "hwb": {
        const components = format === "hsl" ? this.toHsl() : this.toHwb();
        return `${format}(${Number(components[0].toFixed(6))} ${Number((components[1] * 100).toFixed(6))}% ${Number((components[2] * 100).toFixed(6))}% / ${Number(components[3].toFixed(6))})`;
      }
      default: throw new Error("Invalid CSS color format.");
    }
  }

  toString() {
    return this.toHex(this.a < 255);
  }

  toJSON() {
    return this.toRgb();
  }
}


const ZODIAC_LOADOUT_BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export class ZodiacLoadout {
  private name: string;
  private folded: boolean;
  private planets: Record<keyof typeof Planet, {
    sign: keyof typeof ZodiacSign | "Undefined";
    stats: (keyof typeof ZodiacStatType | "Undefined")[];
  }>;

  constructor(name = "") {
    this.name = name;
    this.folded = false;
    this.planets = {
      Sun: { sign: "Undefined", stats: [] },
      Moon: { sign: "Undefined", stats: [] },
      Mercury: { sign: "Undefined", stats: [] },
      Venus: { sign: "Undefined", stats: [] },
      Mars: { sign: "Undefined", stats: [] },
      Jupiter: { sign: "Undefined", stats: [] },
      Saturn: { sign: "Undefined", stats: [] },
      Uranus: { sign: "Undefined", stats: [] },
      Neptune: { sign: "Undefined", stats: [] },
      Pluto: { sign: "Undefined", stats: [] },
      Chiron: { sign: "Undefined", stats: [] },
      Fortune: { sign: "Undefined", stats: [] }
    };
  }

  public getName(): string {
    return this.name;
  }

  public setName(name: string): void {
    this.name = name;
  }

  public getFolded(): boolean {
    return this.folded;
  }

  public setFolded(folded: boolean): void {
    this.folded = folded;
  }

  public getPlanet(planet: keyof typeof Planet): {
    sign: keyof typeof ZodiacSign | "Undefined";
    stats: (keyof typeof ZodiacStatType | "Undefined")[];
  } {
    return this.planets[planet];
  }

  public setPlanet(planet: keyof typeof Planet, sign: keyof typeof ZodiacSign | "Undefined", stats: (keyof typeof ZodiacStatType | "Undefined")[]): void {
    this.planets[planet] = { sign, stats };
  }

  public getPlanets(): Record<keyof typeof Planet, {
    sign: keyof typeof ZodiacSign | "Undefined";
    stats: (keyof typeof ZodiacStatType | "Undefined")[];
  }> {
    return this.planets;
  }

  public setPlanets(planets: Record<keyof typeof Planet, {
    sign: keyof typeof ZodiacSign | "Undefined";
    stats: (keyof typeof ZodiacStatType | "Undefined")[];
  }>): void {
    this.planets = planets;
  }

  public encode(): string {
    // The game uses a public key; QuickJS's random source supplies the IV.
    const bytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
    for (const part of encodeURIComponent(JSON.stringify(this)).match(/%[0-9A-F]{2}|[^%]/g)!)
      bytes.push(part[0] === "%" ? parseInt(part.slice(1), 16) : part.charCodeAt(0));
    const padding = 16 - bytes.length % 16;
    for (let i = 0; i < padding; i++) bytes.push(padding);

    const encrypted = cryptZodiacLoadout(bytes, false);
    let encoded = "";
    for (let i = 0; i < encrypted.length; i += 3) {
      const word = (encrypted[i] << 16) | ((encrypted[i + 1] ?? 0) << 8) | (encrypted[i + 2] ?? 0);
      encoded += ZODIAC_LOADOUT_BASE64[word >>> 18] + ZODIAC_LOADOUT_BASE64[(word >>> 12) & 63]
        + (i + 1 < encrypted.length ? ZODIAC_LOADOUT_BASE64[(word >>> 6) & 63] : "=")
        + (i + 2 < encrypted.length ? ZODIAC_LOADOUT_BASE64[word & 63] : "=");
    }
    return encoded;
  }

  public static decode(encoded: string): ZodiacLoadout {
    encoded = encoded.replace(/\s/g, "");
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded))
      throw new Error("Invalid zodiac loadout Base64.");
    const bytes: number[] = [];
    for (let i = 0; i < encoded.length; i += 4) {
      const word = (ZODIAC_LOADOUT_BASE64.indexOf(encoded[i]) << 18)
        | (ZODIAC_LOADOUT_BASE64.indexOf(encoded[i + 1]) << 12)
        | ((encoded[i + 2] === "=" ? 0 : ZODIAC_LOADOUT_BASE64.indexOf(encoded[i + 2])) << 6)
        | (encoded[i + 3] === "=" ? 0 : ZODIAC_LOADOUT_BASE64.indexOf(encoded[i + 3]));
      bytes.push((word >>> 16) & 255);
      if (encoded[i + 2] !== "=") bytes.push((word >>> 8) & 255);
      if (encoded[i + 3] !== "=") bytes.push(word & 255);
    }
    if (bytes.length < 32 || bytes.length % 16 !== 0)
      throw new Error("Invalid zodiac loadout ciphertext length.");

    const decrypted = cryptZodiacLoadout(bytes, true);
    const padding = decrypted[decrypted.length - 1];
    if (padding < 1 || padding > 16 || decrypted.slice(-padding).some(byte => byte !== padding))
      throw new Error("Invalid zodiac loadout padding.");
    const result = JSON.parse(decodeURIComponent(decrypted.slice(16, -padding)
      .map(byte => `%${byte.toString(16).padStart(2, "0")}`).join("")));

    const zodiacLoadout = new ZodiacLoadout();
    Object.assign(zodiacLoadout, result);
    return zodiacLoadout;
  }
}

// AES-256-CBC, retaining the 16-byte IV prefix in both directions.
function cryptZodiacLoadout(bytes: number[], decrypt: boolean): number[] {
  const sbox = (
    "637c777bf26b6fc53001672bfed7ab76ca82c97dfa5947f0add4a2af9ca472c0"
    + "b7fd9326363ff7cc34a5e5f171d8311504c723c31896059a071280e2eb27b275"
    + "09832c1a1b6e5aa0523bd6b329e32f8453d100ed20fcb15b6acbbe394a4c58cf"
    + "d0efaafb434d338545f9027f503c9fa851a3408f929d38f5bcb6da2110fff3d2"
    + "cd0c13ec5f974417c4a77e3d645d197360814fdc222a908846eeb814de5e0bdb"
    + "e0323a0a4906245cc2d3ac629195e479e7c8376d8dd54ea96c56f4ea657aae08"
    + "ba78252e1ca6b4c6e8dd741f4bbd8b8a703eb5664803f60e613557b986c11d9e"
    + "e1f8981169d98e949b1e87e9ce5528df8ca1890dbfe6426841992d0fb054bb16"
  ).match(/../g)!.map(byte => parseInt(byte, 16));
  const inverse: number[] = [];
  if (decrypt) sbox.forEach((byte, i) => inverse[byte] = i);
  const key = Array.from("6uV8O+L(XpXr((,N)!tk7SJMd!kea.!3", char => char.charCodeAt(0));
  let rcon = 1;
  for (let i = 32; i < 240; i += 4) {
    const word = key.slice(i - 4, i);
    if (i % 32 === 0) {
      word.push(word.shift()!);
      for (let j = 0; j < 4; j++) word[j] = sbox[word[j]];
      word[0] ^= rcon;
      rcon = (rcon << 1) ^ (rcon & 128 ? 0x11b : 0);
    } else if (i % 32 === 16) {
      for (let j = 0; j < 4; j++) word[j] = sbox[word[j]];
    }
    for (let j = 0; j < 4; j++) key.push(key[i - 32 + j] ^ word[j]);
  }

  const result = bytes.slice(0, 16);
  for (let offset = 16; offset < bytes.length; offset += 16) {
    let state = bytes.slice(offset, offset + 16);
    for (let i = 0; i < 16; i++)
      state[i] ^= key[(decrypt ? 224 : 0) + i] ^ (decrypt ? 0 : result[offset - 16 + i]);
    for (let round = 1; round <= 14; round++) {
      state = state.map((_, i) => decrypt
        ? inverse[state[(i + 16 - (i % 4) * 4) % 16]]
        : sbox[state[(i + (i % 4) * 4) % 16]]);
      if (decrypt)
        for (let i = 0; i < 16; i++) state[i] ^= key[(14 - round) * 16 + i];
      if (round < 14) {
        for (let i = 0; i < 16; i += 4) {
          let [a, b, c, d] = state.slice(i, i + 4);
          if (decrypt) {
            let u = a ^ c, v = b ^ d;
            for (let j = 0; j < 2; j++) {
              u = (u << 1) ^ (u & 128 ? 0x11b : 0);
              v = (v << 1) ^ (v & 128 ? 0x11b : 0);
            }
            a ^= u; c ^= u;
            b ^= v; d ^= v;
          }
          const sum = a ^ b ^ c ^ d;
          state[i]     = a ^ sum ^ ((a ^ b) << 1) ^ ((a ^ b) & 128 ? 0x11b : 0);
          state[i + 1] = b ^ sum ^ ((b ^ c) << 1) ^ ((b ^ c) & 128 ? 0x11b : 0);
          state[i + 2] = c ^ sum ^ ((c ^ d) << 1) ^ ((c ^ d) & 128 ? 0x11b : 0);
          state[i + 3] = d ^ sum ^ ((d ^ a) << 1) ^ ((d ^ a) & 128 ? 0x11b : 0);
        }
      }
      if (!decrypt)
        for (let i = 0; i < 16; i++) state[i] ^= key[round * 16 + i];
    }
    if (decrypt)
      for (let i = 0; i < 16; i++) state[i] ^= bytes[offset - 16 + i];
    result.push(...state);
  }
  return result;
}


declare global {
  interface ObjectConstructor {
    map<T, U>(
      obj: Record<string, T>,
      fn: (key: string, value: T) => [string, U] | null | undefined,
    ): Record<string, U>;
  }

  interface Object {
    dbg<T>(this: T, message?: string): T;
  }
}

Object.map = function(obj, fn) {
  return Object.fromEntries(Object.entries(obj)
    .map(([key, value]) => fn(key, value))
    .filter(entry => entry != null));
};

Object.prototype.dbg = function(message?: string) {
  if (message) console.log(`${message}:`, stringify(this, 2));
  else         console.log(stringify(this, 2));
  return this;
};


export function stringify(value: any, space?: number | string): string {
  return JSON.stringify(value, function replacer(key, val) {
    if (val instanceof BigNum) return val.toString();
    if (val instanceof BigInt) return val.toString();
    if (val instanceof Set) return [...val];
    return val;
  }, space);
}


export function dbg<T>(value: T): T {
  console.log(stringify(value, 2));
  return value;
}


export function* range(start: number, end: number, step: number = 1) {
  if (start < end)      for (let i = start; i < end; i += step) yield i;
  else if (start > end) for (let i = start; i > end; i -= step) yield i;
}


export class GlobalVar<T extends RevValue> {
  private key: string;
  constructor(key: string) {
    this.key = `__global_var_${key}__`;
  }

  async get(): Promise<T | undefined> {
    using _ = await rev.mutex(this.key);
    return rev.global[this.key] as T;
  }

  async getOrSet(defaultValue: T): Promise<T> {
    using _ = await rev.mutex(this.key);
    if (rev.global[this.key] === undefined)
      rev.global[this.key] = defaultValue;
    return rev.global[this.key] as T;
  }

  getUnguarded(): T | undefined {
    return rev.global[this.key] as T;
  }

  async set(value: T): Promise<void> {
    using _ = await rev.mutex(this.key);
    rev.global[this.key] = value;
  }

  async setIfNotExists(value: T): Promise<void> {
    using _ = await rev.mutex(this.key);
    if (rev.global[this.key] === undefined)
      rev.global[this.key] = value;
  }

  setUnguarded(value: T) {
    rev.global[this.key] = value;
  }

  /** Remember to release the mutex guard after acquiring it. */
  async acquire(): Promise<[MutexGuard, T]> {
    const guard = await rev.mutex(this.key);
    const value = rev.global[this.key] as T;
    return [guard, value];
  }

  async update(fn: (value: T | undefined) => T): Promise<void> {
    using _ = await rev.mutex(this.key);
    rev.global[this.key] = fn(rev.global[this.key] as T);
  }

  updateUnguarded(fn: (value: T | undefined) => T): void {
    rev.global[this.key] = fn(rev.global[this.key] as T);
  }
}


export type ScreenScopeGuard = (label?: string) => Promise<ScreenOwnership>;
export async function screenScope(label: string, fn: (so: ScreenScopeGuard) => Promise<void>) {
  let so: Promise<ScreenOwnership> | undefined;
  const getScreenOwnership = async (newLabel?: string) => {
    if (!so) so = rev.screenOwnership(newLabel ?? label);
    if (newLabel != null) (await so).rename(newLabel);
    return await so;
  };

  try { await fn(getScreenOwnership); }
  finally { (await so)?.release(); }
}


export class Timer {
  static PAUSE_THRESHOLD = 200;
  static MIN_TICK_INTERVAL = 10;

  private running: boolean = false;
  private pausing:  boolean = false;
  private elapsed: number = 0;

  constructor(createStopped = false) {
    if (!createStopped) this.restart();
  }

  getElapsed() {
    return this.elapsed;
  }

  restart() {
    if (this.running) {
      this.elapsed = 0;
      return;
    }

    this.elapsed = 0;
    this.running = true;
    this.pausing = false;

    (async () => {
      try {
        let lastTickAt = Date.now();
        while (this.running) {
          await rev.sleep(Timer.MIN_TICK_INTERVAL);
          if (this.pausing) continue;

          const now = Date.now();
          const delta = now - lastTickAt;

          if (delta <= Timer.PAUSE_THRESHOLD)
            this.elapsed += delta;
          lastTickAt = now;
        }
      } catch (err) {
        console.error("Timer encountered an error:", err);
      } finally {
        this.running = false;
      }
    })()
  }

  stop() {
    this.running = false;
  }

  stopped() {
    return !this.running;
  }

  pause() {
    this.pausing = true;
  }

  resume() {
    this.pausing = false;
  }

  paused() {
    return this.pausing;
  }
}


export type Enumerate<N extends number, Acc extends number[] = []> =
  Acc['length'] extends N ? Acc[number] : Enumerate<N, [...Acc, Acc['length']]>;

export type Range<S extends number, E extends number> =
  Exclude<Enumerate<E>, Enumerate<S>>;


export enum UnityDirection {
  left,
  top,
  bottom,
  right,
}
