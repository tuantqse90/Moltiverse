// ═══════════════════════════════════════════════════════════════
// TRAIT POOLS
// ═══════════════════════════════════════════════════════════════

export const SHELL_COLORS = [
  { name: 'Classic Red', h: 0, s: 80, b: 90, rarity: 'common' },
  { name: 'Sunset Orange', h: 25, s: 85, b: 95, rarity: 'common' },
  { name: 'Cyber Blue', h: 200, s: 80, b: 95, rarity: 'uncommon' },
  { name: 'Toxic Green', h: 130, s: 75, b: 85, rarity: 'uncommon' },
  { name: 'Royal Purple', h: 270, s: 70, b: 85, rarity: 'rare' },
  { name: 'Bubblegum Pink', h: 330, s: 65, b: 95, rarity: 'rare' },
  { name: 'Golden', h: 45, s: 90, b: 95, rarity: 'epic' },
  { name: 'Shadow Chrome', h: 240, s: 10, b: 45, rarity: 'epic' },
  { name: 'Holographic', h: 180, s: 40, b: 98, rarity: 'legendary' },
  { name: 'Cosmic Void', h: 280, s: 95, b: 30, rarity: 'legendary' },
]

export const HEAD_SHAPES = [
  { name: 'Round Bot', rarity: 'common' },
  { name: 'Angular Mecha', rarity: 'common' },
  { name: 'Bubble Dome', rarity: 'uncommon' },
  { name: 'Skull Face', rarity: 'rare' },
  { name: 'Hammerhead', rarity: 'uncommon' },
  { name: 'Flat Top', rarity: 'common' },
  { name: 'Spike Head', rarity: 'rare' },
  { name: 'UFO Head', rarity: 'epic' },
]

export const EYES = [
  { name: 'Normal', rarity: 'common' },
  { name: 'Angry', rarity: 'common' },
  { name: 'Derp', rarity: 'uncommon' },
  { name: 'Cyclops', rarity: 'rare' },
  { name: 'Heart Eyes', rarity: 'rare' },
  { name: 'X_X Dead', rarity: 'uncommon' },
  { name: 'Laser', rarity: 'epic' },
  { name: 'Anime Sparkle', rarity: 'epic' },
  { name: 'Bitcoin', rarity: 'legendary' },
  { name: 'Hypno Spiral', rarity: 'legendary' },
]

export const MOUTHS = [
  { name: 'Grin', rarity: 'common' },
  { name: 'Teeth', rarity: 'common' },
  { name: 'Tongue Out', rarity: 'uncommon' },
  { name: 'Moustache', rarity: 'rare' },
  { name: 'Cigar', rarity: 'rare' },
  { name: 'Frown', rarity: 'uncommon' },
  { name: 'Blep', rarity: 'common' },
  { name: 'Scream', rarity: 'epic' },
]

export const CLAWS = [
  { name: 'Classic Pincers', rarity: 'common' },
  { name: 'Tiny Arms', rarity: 'common' },
  { name: 'Mech Gauntlets', rarity: 'uncommon' },
  { name: 'Hammer Fists', rarity: 'rare' },
  { name: 'Laser Pincers', rarity: 'rare' },
  { name: 'Peace Signs', rarity: 'uncommon' },
  { name: 'Diamond Claws', rarity: 'epic' },
  { name: 'Chainsaw', rarity: 'legendary' },
]

export const BODIES = [
  { name: 'Standard', rarity: 'common' },
  { name: 'Buff', rarity: 'uncommon' },
  { name: 'Slim', rarity: 'common' },
  { name: 'Tank Armor', rarity: 'rare' },
  { name: 'Mech Suit', rarity: 'epic' },
  { name: 'Noodle', rarity: 'uncommon' },
  { name: 'Crystal', rarity: 'rare' },
  { name: 'HODL Chest', rarity: 'legendary' },
]

export const HATS = [
  { name: 'None', rarity: 'common' },
  { name: 'Top Hat', rarity: 'uncommon' },
  { name: 'Beanie', rarity: 'common' },
  { name: 'Crown', rarity: 'epic' },
  { name: 'Propeller', rarity: 'uncommon' },
  { name: 'Chef Hat', rarity: 'uncommon' },
  { name: 'Devil Horns', rarity: 'rare' },
  { name: 'Halo', rarity: 'rare' },
  { name: 'Antenna', rarity: 'common' },
  { name: 'Doge Crown', rarity: 'legendary' },
]

export const ACCESSORIES = [
  { name: 'None', rarity: 'common' },
  { name: 'Headphones', rarity: 'common' },
  { name: 'Sunglasses', rarity: 'common' },
  { name: 'VR Headset', rarity: 'rare' },
  { name: 'Monocle', rarity: 'uncommon' },
  { name: 'Deal With It', rarity: 'epic' },
  { name: 'Earring', rarity: 'uncommon' },
  { name: 'Scar', rarity: 'rare' },
]

export const LEGS = [
  { name: 'Rocket Boosters', rarity: 'common' },
  { name: 'Twin Thrusters', rarity: 'common' },
  { name: 'Jet Flames', rarity: 'uncommon' },
  { name: 'Plasma Engines', rarity: 'uncommon' },
  { name: 'Nuclear Propulsion', rarity: 'rare' },
  { name: 'Ion Drives', rarity: 'rare' },
  { name: 'Quantum Thrusters', rarity: 'epic' },
  { name: 'Anti-Gravity', rarity: 'epic' },
  { name: 'Warp Drive', rarity: 'legendary' },
  { name: 'Monad Rockets', rarity: 'legendary' },
]

export const BG_COLORS = [
  { name: 'Sky Blue', r: 180, g: 220, b: 255 },
  { name: 'Sunset', r: 255, g: 200, b: 150 },
  { name: 'Neon Pink', r: 255, g: 150, b: 200 },
  { name: 'Mint', r: 180, g: 255, b: 220 },
  { name: 'Lavender', r: 220, g: 200, b: 255 },
  { name: 'Cream', r: 255, g: 250, b: 230 },
  { name: 'Dark Space', r: 20, g: 15, b: 40 },
  { name: 'Deep Ocean', r: 15, g: 40, b: 60 },
]

// ═══════════════════════════════════════════════════════════════
// SEEDED RANDOM
// ═══════════════════════════════════════════════════════════════
export class SeededRandom {
  private seed: number

  constructor(seed: number) {
    this.seed = seed
  }

  next(): number {
    this.seed = (this.seed * 16807 + 0) % 2147483647
    return (this.seed - 1) / 2147483646
  }

  nextInt(max: number): number {
    return Math.floor(this.next() * max)
  }

  pick<T>(arr: T[]): T {
    return arr[this.nextInt(arr.length)]
  }
}

// ═══════════════════════════════════════════════════════════════
// GENERATE TRAITS
// ═══════════════════════════════════════════════════════════════
export interface Trait {
  name: string
  rarity: string
  h?: number
  s?: number
  b?: number
  r?: number
  g?: number
}

export interface Traits {
  shellColor: Trait
  headShape: Trait
  eyes: Trait
  mouth: Trait
  claws: Trait
  body: Trait
  legs: Trait
  hat: Trait
  accessory: Trait
  bgColor: { name: string; r: number; g: number; b: number }
  eyeHue: number
  antennaStyle: number
  bodyDetail: number
  scarSide: number
}

export function generateTraits(seed: number): Traits {
  const rng = new SeededRandom(seed)
  return {
    shellColor: rng.pick(SHELL_COLORS),
    headShape: rng.pick(HEAD_SHAPES),
    eyes: rng.pick(EYES),
    mouth: rng.pick(MOUTHS),
    claws: rng.pick(CLAWS),
    body: rng.pick(BODIES),
    legs: rng.pick(LEGS),
    hat: rng.pick(HATS),
    accessory: rng.pick(ACCESSORIES),
    bgColor: rng.pick(BG_COLORS),
    eyeHue: rng.nextInt(360),
    antennaStyle: rng.nextInt(4),
    bodyDetail: rng.nextInt(5),
    scarSide: rng.nextInt(2),
  }
}

export function calculateRarityScore(traits: Traits): { score: number; overall: string } {
  const rarityMap: Record<string, number> = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 }
  const traitList = [
    traits.shellColor,
    traits.headShape,
    traits.eyes,
    traits.mouth,
    traits.claws,
    traits.body,
    traits.legs,
    traits.hat,
    traits.accessory,
  ]
  const score = traitList.reduce((s, t) => s + (rarityMap[t.rarity] || 0), 0)

  let overall = 'Common'
  if (score >= 32) overall = 'LEGENDARY'
  else if (score >= 25) overall = 'Epic'
  else if (score >= 18) overall = 'Rare'
  else if (score >= 14) overall = 'Uncommon'

  return { score, overall }
}

// ═══════════════════════════════════════════════════════════════
// DRAW FULL LOBSTER
// ═══════════════════════════════════════════════════════════════
export function drawFullLobster(canvas: HTMLCanvasElement, currentSeed: number, scale: number = 3) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const t = generateTraits(currentSeed)
  const sc = scale
  canvas.width = 64 * sc
  canvas.height = 64 * sc

  const px = (x: number, y: number, color: string) => {
    ctx.fillStyle = color
    ctx.fillRect(x * sc, y * sc, sc, sc)
  }

  const pxRect = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color
    ctx.fillRect(x * sc, y * sc, w * sc, h * sc)
  }

  const hsl = (h: number, s: number, l: number) => `hsl(${h}, ${s}%, ${l}%)`
  const rgb = (r: number, g: number, b: number, a: number = 1) => `rgba(${r}, ${g}, ${b}, ${a})`

  const shellH = t.shellColor.h || 0
  const shellS = t.shellColor.s || 80
  const shellB = t.shellColor.b || 90
  const sh = hsl(shellH, shellS, shellB * 0.5)
  const sd = hsl(shellH, shellS + 5, (shellB - 20) * 0.5)
  const ml = rgb(170, 170, 180)
  const md = rgb(120, 120, 130)
  const eyeC = hsl(t.eyeHue, 80, 50)
  const outC = rgb(20, 20, 30)

  // Background
  ctx.fillStyle = rgb(t.bgColor.r, t.bgColor.g, t.bgColor.b)
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  if (t.bgColor.r < 50) {
    for (let i = 0; i < 30; i++) {
      const sx = (i * 17 + shellH * 3) % 64
      const sy = (i * 23 + t.eyeHue * 2) % 64
      px(sx, sy, rgb(255, 255, 200, 0.7))
    }
  }

  // Body
  const bx = 22, by = 30
  pxRect(bx - 1, by - 1, 22, 22, outC)
  pxRect(bx, by, 20, 20, sh)
  pxRect(bx + 2, by + 2, 16, 16, sd)
  pxRect(bx + 4, by + 4, 12, 8, ml)
  pxRect(bx + 6, by + 6, 8, 4, md)
  pxRect(bx + 2, by + 14, 16, 2, sd)
  pxRect(bx + 2, by + 17, 16, 2, sd)

  // Claws
  const cy = by + 4
  pxRect(5, cy - 1, 14, 10, outC)
  pxRect(43, cy - 1, 16, 10, outC)
  pxRect(6, cy, 12, 6, sh)
  pxRect(4, cy - 2, 4, 4, sd)
  pxRect(4, cy + 4, 4, 4, sd)
  pxRect(44, cy, 12, 6, sh)
  pxRect(54, cy - 2, 4, 4, sd)
  pxRect(54, cy + 4, 4, 4, sd)

  // Head
  const hx = 20, hy = 6
  pxRect(hx - 1, hy - 1, 26, 24, outC)
  pxRect(hx, hy, 24, 20, sh)
  pxRect(hx + 2, hy - 2, 20, 2, sh)
  pxRect(hx + 4, hy - 4, 16, 2, sd)
  pxRect(hx, hy + 16, 24, 6, ml)
  pxRect(hx + 2, hy + 20, 20, 2, md)

  // Antenna
  pxRect(31, 0, 2, hy, ml)
  pxRect(30, 0, 4, 2, eyeC)

  // Eyes
  const ex1 = hx + 4, ex2 = hx + 14, ey = hy + 4
  pxRect(ex1, ey, 6, 6, rgb(17, 17, 17))
  pxRect(ex2, ey, 6, 6, rgb(17, 17, 17))
  pxRect(ex1 + 1, ey + 1, 4, 4, eyeC)
  pxRect(ex2 + 1, ey + 1, 4, 4, eyeC)
  pxRect(ex1 + 2, ey + 2, 2, 2, rgb(255, 255, 255))
  pxRect(ex2 + 2, ey + 2, 2, 2, rgb(255, 255, 255))

  // Mouth
  const mx = hx + 4, my = hy + 16
  pxRect(mx + 2, my + 2, 12, 2, rgb(17, 17, 17))
  px(mx + 4, my + 2, eyeC)
  px(mx + 12, my + 2, eyeC)

  // Hat
  const hatIdx = HATS.findIndex(h => h.name === t.hat.name)
  if (hatIdx === 3) {
    pxRect(hx - 2, hy - 4, 28, 6, rgb(255, 204, 0))
    pxRect(hx, hy - 8, 4, 6, rgb(255, 204, 0))
    pxRect(hx + 10, hy - 10, 4, 8, rgb(255, 204, 0))
    pxRect(hx + 20, hy - 8, 4, 6, rgb(255, 204, 0))
    px(hx + 1, hy - 7, rgb(255, 51, 85))
    px(hx + 11, hy - 9, rgb(85, 170, 255))
    px(hx + 21, hy - 7, rgb(68, 255, 68))
  } else if (hatIdx === 1) {
    pxRect(hx - 2, hy - 2, 28, 2, rgb(34, 34, 34))
    pxRect(hx + 4, hy - 10, 16, 10, rgb(51, 51, 51))
    pxRect(hx + 2, hy - 10, 20, 2, rgb(68, 68, 68))
    pxRect(hx + 6, hy - 6, 12, 1, eyeC)
  } else if (hatIdx === 9) {
    pxRect(hx - 4, hy - 4, 32, 6, rgb(255, 170, 0))
    pxRect(hx - 2, hy - 8, 4, 6, rgb(255, 187, 34))
    pxRect(hx + 6, hy - 10, 4, 8, rgb(255, 187, 34))
    pxRect(hx + 16, hy - 10, 4, 8, rgb(255, 187, 34))
    pxRect(hx + 24, hy - 8, 4, 6, rgb(255, 187, 34))
  }

  // Accessory
  const accIdx = ACCESSORIES.findIndex(a => a.name === t.accessory.name)
  if (accIdx === 2) {
    pxRect(hx + 2, hy + 4, 20, 8, rgb(17, 17, 17))
    pxRect(hx + 4, hy + 6, 6, 4, rgb(51, 51, 51))
    pxRect(hx + 14, ey + 2, 6, 4, rgb(51, 51, 51))
  } else if (accIdx === 5) {
    pxRect(hx - 2, ey, 28, 2, rgb(17, 17, 17))
    pxRect(hx + 2, ey, 8, 6, rgb(17, 17, 17))
    pxRect(hx + 14, ey, 8, 6, rgb(17, 17, 17))
  }

  // Legs / Rockets
  const legIdx = LEGS.findIndex(l => l.name === t.legs.name)
  const ly = by + 18
  const flameC = rgb(255, 100, 0)
  const flameC2 = rgb(255, 200, 0)

  if (legIdx === 0) {
    pxRect(bx + 2, ly, 4, 8, ml)
    pxRect(bx + 3, ly + 1, 2, 6, md)
    pxRect(bx + 1, ly + 8, 6, 4, flameC)
    pxRect(bx + 2, ly + 10, 4, 3, flameC2)
    pxRect(bx + 14, ly, 4, 8, ml)
    pxRect(bx + 15, ly + 1, 2, 6, md)
    pxRect(bx + 13, ly + 8, 6, 4, flameC)
    pxRect(bx + 14, ly + 10, 4, 3, flameC2)
  } else if (legIdx === 1) {
    pxRect(bx, ly, 3, 6, ml)
    pxRect(bx + 4, ly, 3, 6, ml)
    pxRect(bx - 1, ly + 6, 5, 3, flameC)
    pxRect(bx + 3, ly + 6, 5, 3, flameC)
    pxRect(bx + 13, ly, 3, 6, ml)
    pxRect(bx + 17, ly, 3, 6, ml)
    pxRect(bx + 12, ly + 6, 5, 3, flameC)
    pxRect(bx + 16, ly + 6, 5, 3, flameC)
  } else if (legIdx === 2) {
    pxRect(bx + 4, ly, 5, 5, ml)
    pxRect(bx + 11, ly, 5, 5, ml)
    pxRect(bx + 2, ly + 5, 9, 5, flameC)
    pxRect(bx + 9, ly + 5, 9, 5, flameC)
    pxRect(bx + 4, ly + 8, 5, 4, flameC2)
    pxRect(bx + 11, ly + 8, 5, 4, flameC2)
    pxRect(bx + 5, ly + 10, 3, 3, rgb(255, 255, 200))
    pxRect(bx + 12, ly + 10, 3, 3, rgb(255, 255, 200))
  } else if (legIdx === 3) {
    pxRect(bx + 2, ly, 6, 6, rgb(100, 200, 255))
    pxRect(bx + 12, ly, 6, 6, rgb(100, 200, 255))
    pxRect(bx + 3, ly + 1, 4, 4, rgb(150, 230, 255))
    pxRect(bx + 13, ly + 1, 4, 4, rgb(150, 230, 255))
    pxRect(bx + 1, ly + 6, 8, 4, rgb(50, 150, 255))
    pxRect(bx + 11, ly + 6, 8, 4, rgb(50, 150, 255))
    pxRect(bx + 3, ly + 8, 4, 4, rgb(200, 240, 255))
    pxRect(bx + 13, ly + 8, 4, 4, rgb(200, 240, 255))
  } else if (legIdx === 4) {
    pxRect(bx + 2, ly, 6, 7, rgb(100, 255, 100))
    pxRect(bx + 12, ly, 6, 7, rgb(100, 255, 100))
    pxRect(bx + 4, ly + 2, 2, 3, rgb(200, 255, 100))
    pxRect(bx + 14, ly + 2, 2, 3, rgb(200, 255, 100))
    pxRect(bx, ly + 7, 10, 5, rgb(50, 255, 50, 0.7))
    pxRect(bx + 10, ly + 7, 10, 5, rgb(50, 255, 50, 0.7))
    px(bx + 5, ly + 4, rgb(255, 255, 0))
    px(bx + 15, ly + 4, rgb(255, 255, 0))
  } else if (legIdx === 5) {
    pxRect(bx + 3, ly, 4, 8, rgb(80, 80, 120))
    pxRect(bx + 13, ly, 4, 8, rgb(80, 80, 120))
    pxRect(bx + 2, ly + 8, 6, 3, rgb(100, 150, 255))
    pxRect(bx + 12, ly + 8, 6, 3, rgb(100, 150, 255))
    pxRect(bx + 3, ly + 9, 4, 3, rgb(150, 200, 255))
    pxRect(bx + 13, ly + 9, 4, 3, rgb(150, 200, 255))
    px(bx + 4, ly + 10, rgb(255, 255, 255))
    px(bx + 14, ly + 10, rgb(255, 255, 255))
  } else if (legIdx === 6) {
    pxRect(bx + 2, ly, 5, 6, rgb(200, 100, 255))
    pxRect(bx + 13, ly, 5, 6, rgb(200, 100, 255))
    pxRect(bx, ly + 6, 9, 4, rgb(150, 50, 255))
    pxRect(bx + 11, ly + 6, 9, 4, rgb(150, 50, 255))
    px(bx + 1, ly + 8, rgb(255, 100, 255))
    px(bx + 7, ly + 7, rgb(100, 255, 255))
    px(bx + 12, ly + 8, rgb(255, 100, 255))
    px(bx + 18, ly + 7, rgb(100, 255, 255))
    pxRect(bx + 3, ly + 8, 3, 4, rgb(255, 200, 255))
    pxRect(bx + 14, ly + 8, 3, 4, rgb(255, 200, 255))
  } else if (legIdx === 7) {
    pxRect(bx + 2, ly + 2, 6, 6, rgb(150, 255, 255))
    pxRect(bx + 12, ly + 2, 6, 6, rgb(150, 255, 255))
    pxRect(bx + 3, ly + 3, 4, 4, rgb(200, 255, 255))
    pxRect(bx + 13, ly + 3, 4, 4, rgb(200, 255, 255))
    px(bx + 4, ly + 4, rgb(255, 255, 255))
    px(bx + 14, ly + 4, rgb(255, 255, 255))
    pxRect(bx, ly + 8, 10, 1, rgb(100, 200, 255, 0.5))
    pxRect(bx + 10, ly + 8, 10, 1, rgb(100, 200, 255, 0.5))
    pxRect(bx + 1, ly + 10, 8, 1, rgb(100, 200, 255, 0.3))
    pxRect(bx + 11, ly + 10, 8, 1, rgb(100, 200, 255, 0.3))
  } else if (legIdx === 8) {
    pxRect(bx + 1, ly, 8, 8, rgb(100, 50, 200))
    pxRect(bx + 11, ly, 8, 8, rgb(100, 50, 200))
    pxRect(bx + 2, ly + 1, 6, 6, rgb(150, 100, 255))
    pxRect(bx + 12, ly + 1, 6, 6, rgb(150, 100, 255))
    pxRect(bx + 3, ly + 2, 4, 4, rgb(200, 150, 255))
    pxRect(bx + 13, ly + 2, 4, 4, rgb(200, 150, 255))
    px(bx + 4, ly + 3, rgb(255, 255, 255))
    px(bx + 14, ly + 3, rgb(255, 255, 255))
    pxRect(bx, ly + 8, 10, 2, rgb(150, 100, 255, 0.6))
    pxRect(bx + 10, ly + 8, 10, 2, rgb(150, 100, 255, 0.6))
    pxRect(bx + 2, ly + 10, 6, 3, rgb(200, 150, 255, 0.4))
    pxRect(bx + 12, ly + 10, 6, 3, rgb(200, 150, 255, 0.4))
  } else {
    pxRect(bx + 1, ly, 7, 8, rgb(130, 80, 200))
    pxRect(bx + 12, ly, 7, 8, rgb(130, 80, 200))
    pxRect(bx + 2, ly + 1, 5, 6, rgb(160, 100, 230))
    pxRect(bx + 13, ly + 1, 5, 6, rgb(160, 100, 230))
    pxRect(bx - 1, ly + 8, 11, 5, rgb(180, 100, 255))
    pxRect(bx + 10, ly + 8, 11, 5, rgb(180, 100, 255))
    pxRect(bx + 1, ly + 10, 7, 4, rgb(200, 150, 255))
    pxRect(bx + 12, ly + 10, 7, 4, rgb(200, 150, 255))
    pxRect(bx + 3, ly + 12, 3, 2, rgb(255, 200, 255))
    pxRect(bx + 14, ly + 12, 3, 2, rgb(255, 200, 255))
    px(bx + 3, ly + 3, rgb(255, 255, 255))
    px(bx + 4, ly + 2, rgb(255, 255, 255))
    px(bx + 5, ly + 3, rgb(255, 255, 255))
    px(bx + 14, ly + 3, rgb(255, 255, 255))
    px(bx + 15, ly + 2, rgb(255, 255, 255))
    px(bx + 16, ly + 3, rgb(255, 255, 255))
  }
}
