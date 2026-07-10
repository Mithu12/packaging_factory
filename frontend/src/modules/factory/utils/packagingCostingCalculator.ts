/**
 * Packaging costing calculator - matches formulas and modes from Corrugated_Costing-4.html.
 */

export type CostingMode = "1b1c" | "1b2c" | "1b3c" | "1b4c" | "2b1c";

export interface CartonDimensionInput {
  L: number; // Carton Length (cm)
  W: number; // Carton Width (cm)
  H: number; // Carton Height (cm)
  Fo: number; // Cutting Allowance (mm)
  T: number; // Reel Allowance (mm)
}

export interface ModeDetails {
  key: CostingMode;
  label: string;
  labelBn: string;
  cl: number; // Cutting size (mm)
  cw: number; // Cutting width (cm)
  cpb: number; // Carton/Board (pcs)
  reel: number; // Reel size (inch)
  clRounded: number;
}

export interface CostingParametersInput {
  linerGsm: number;
  mediaGsm: number;
  linerRate: number;
  mediaRate: number;
  glueRate: number;
  ply: string;
  boardQty: number; // equals selected mode's cpb

  // individual cost rates per carton piece
  printCost: number;
  stitchCost: number;
  unloadCost: number;
  transportCost: number;
  starchCost: number;
  electricityCost: number;
  hanicomCost: number;
  topBottomCost: number;
  aitCost: number;
  otherCost: number;

  profitPct: number;
}

export interface CostingResult {
  kgLiner: number;
  kgMedia: number;
  kgGlue: number;
  valLiner: number;
  valMedia: number;
  valGlue: number;
  subtotal: number;
  profit: number;
  finalCost: number;
}

export interface PackagingCostingInput {
  customerName: string;
  itemName: string;
  description: string;
  jobReel: string;
  jobCutsize: string;
  cartonSize: CartonDimensionInput;
  mode: CostingMode;
  params: CostingParametersInput;
}

/**
 * Mimic Excel EVEN() function: round away from zero to the nearest even integer.
 */
export function evenUp(n: number): number {
  const sign = n < 0 ? -1 : 1;
  const absN = Math.abs(n);
  return sign * (Math.ceil(absN / 2) * 2);
}

/**
 * Compute derived values for all 5 layout/cutting modes.
 */
export function computeModes(dim: CartonDimensionInput): Record<CostingMode, ModeDetails> {
  const L = dim.L || 0;
  const W = dim.W || 0;
  const H = dim.H || 0;
  const Fo = dim.Fo || 0;
  const T = dim.T || 0;

  const baseCL = L + W;
  const baseCW = H + W;

  const rawModes: Record<CostingMode, { label: string; labelBn: string; cl: number; cw: number; cpb: number }> = {
    "1b1c": {
      label: "1 Broad 1 Carton",
      labelBn: "এক বোর্ডে এক কার্টন",
      cl: 2 * baseCL + Fo,
      cw: baseCW + T,
      cpb: 1,
    },
    "1b2c": {
      label: "1 Broad 2 Carton",
      labelBn: "এক বোর্ডে দুই কার্টন",
      cl: 2 * baseCL + Fo,
      cw: 2 * baseCW + T,
      cpb: 2,
    },
    "1b3c": {
      label: "1 Broad 3 Carton",
      labelBn: "এক বোর্ডে তিন কার্টন",
      cl: 2 * baseCL + Fo,
      cw: 3 * baseCW + T,
      cpb: 3,
    },
    "1b4c": {
      label: "1 Broad 4 Carton",
      labelBn: "এক বোর্ডে চার কার্টন",
      cl: 2 * baseCL + Fo,
      cw: 4 * baseCW + T,
      cpb: 4,
    },
    "2b1c": {
      label: "2 Broad 1 Carton",
      labelBn: "দুই বোর্ড মিলে এক কার্টন",
      cl: (2 * baseCL + Fo) / 2,
      cw: (2 * baseCW + T) / 2,
      cpb: 0.5,
    },
  };

  const modes = {} as Record<CostingMode, ModeDetails>;
  (Object.keys(rawModes) as CostingMode[]).forEach((key) => {
    const m = rawModes[key];
    const reel = evenUp(m.cw / 2.54);
    const clRounded = evenUp(m.cl);
    modes[key] = {
      key,
      ...m,
      reel,
      clRounded,
    };
  });

  return modes;
}

/**
 * Compute the itemized costs for a selected mode.
 */
export function computeCosting(
  reel: number,
  cl: number,
  params: CostingParametersInput
): CostingResult {
  const convFactor = 2.54;
  const boardQty = params.boardQty || 1;

  // J36 (liner kg) = (reel * convFactor * cutSize * linerGsm / boardQty) / 10,000,000
  const kgLiner = (reel * convFactor * cl * params.linerGsm / boardQty) / 10000000;
  const kgMedia = (reel * convFactor * cl * params.mediaGsm / boardQty) / 10000000;
  const kgGlue = kgMedia * 0.27;

  const valLiner = kgLiner * params.linerRate;
  const valMedia = kgMedia * params.mediaRate;
  const valGlue = kgGlue * params.glueRate;

  const subtotal =
    valLiner +
    valMedia +
    valGlue +
    params.printCost +
    params.stitchCost +
    params.unloadCost +
    params.transportCost +
    params.starchCost +
    params.electricityCost +
    params.hanicomCost +
    params.topBottomCost +
    params.aitCost +
    params.otherCost;

  const profitPctDec = params.profitPct / 100;
  const profit = subtotal * profitPctDec;
  const finalCost = subtotal + profit;

  return {
    kgLiner,
    kgMedia,
    kgGlue,
    valLiner,
    valMedia,
    valGlue,
    subtotal,
    profit,
    finalCost,
  };
}

/**
 * Get default inputs corresponding to original spreadsheet defaults.
 */
export function getDefaultPackagingCostingInput(): PackagingCostingInput {
  return {
    customerName: "",
    itemName: "",
    description: "",
    jobReel: "",
    jobCutsize: "",
    cartonSize: {
      L: 34.5,
      W: 26.5,
      H: 21.5,
      Fo: 4.0,
      T: 1.0,
    },
    mode: "1b2c",
    params: {
      linerGsm: 300,
      mediaGsm: 175,
      linerRate: 48,
      mediaRate: 44,
      glueRate: 24,
      ply: "3",
      boardQty: 2,
      printCost: 1.00,
      stitchCost: 0.15,
      unloadCost: 0.20,
      transportCost: 0.30,
      starchCost: 0.35,
      electricityCost: 0.05,
      hanicomCost: 0.05,
      topBottomCost: 0.05,
      aitCost: 0.05,
      otherCost: 0.05,
      profitPct: 30,
    },
  };
}
