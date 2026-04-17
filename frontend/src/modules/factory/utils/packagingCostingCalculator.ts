/**
 * Packaging cost calculator — mirrors formulas in cost-analysis.xlsx (project root).
 */

export const CM_PER_INCH = 2.54;

/** Excel row 11/16 column G (constant divisor). */
export const SHEET_MASS_DIVISOR = 10_000_000;

/** Excel: H → I uses division by 4 (broad factor). */
export const SHEET_BROAD_DIVISOR = 4;

export interface DimensionCmInput {
  widthCm: number;
  heightCm: number;
  lengthCm: number;
  plusCm: number;
}

export interface DimensionDerived {
  sumWidthHeight: number;
  afterLengthMultiplier: number;
  linearCm: number;
  linearInch: number;
}

export function deriveDimension(input: DimensionCmInput): DimensionDerived {
  const { widthCm, heightCm, lengthCm, plusCm } = input;
  const sumWidthHeight = widthCm + heightCm;
  const afterLengthMultiplier = sumWidthHeight * lengthCm;
  const linearCm = afterLengthMultiplier + plusCm;
  const linearInch = linearCm / CM_PER_INCH;
  return {
    sumWidthHeight,
    afterLengthMultiplier,
    linearCm,
    linearInch,
  };
}

export interface PaperLineInput {
  width: number;
  height: number;
  gsm: number;
  rate: number;
  cmPerInch?: number;
  massDivisor?: number;
  broadDivisor?: number;
}

export interface PaperLineDerived {
  /** Excel F: W × H × GSM × 2.54 */
  productF: number;
  /** Excel H: F / 10_000_000 */
  afterDivisorH: number;
  /** Excel I: H / 4 (media broad for silicate block). */
  broadI: number;
  /** Excel K: I × rate */
  lineCost: number;
}

export function derivePaperLineCost(
  input: PaperLineInput
): PaperLineDerived {
  const cmPerInch = input.cmPerInch ?? CM_PER_INCH;
  const massDivisor = input.massDivisor ?? SHEET_MASS_DIVISOR;
  const broadDivisor = input.broadDivisor ?? SHEET_BROAD_DIVISOR;
  const productF = input.width * input.height * input.gsm * cmPerInch;
  const afterDivisorH = productF / massDivisor;
  const broadI = afterDivisorH / broadDivisor;
  const lineCost = broadI * input.rate;
  return { productF, afterDivisorH, broadI, lineCost };
}

export interface SilicateAndTotalsInput {
  /** Excel B22 = I16 — media row broad (I). */
  mediaBroad: number;
  /** Excel uses 25% (0.25). */
  silicateShareOfBroad: number;
  /** Excel D22 — multiplied by silicate portion (C22). */
  silicateRate: number;
  printingRate: number;
  mediaRateAdder: number;
  transportAdder: number;
  linerLineCost: number;
  mediaLineCost: number;
  /** Excel J22: 20% (0.2). */
  markupPercent?: number;
}

export interface SilicateAndTotalsDerived {
  silicatePortion: number;
  silicateCost: number;
  subtotalBeforeMarkup: number;
  markup: number;
  grandTotal: number;
}

export function deriveSilicateAndTotals(
  input: SilicateAndTotalsInput
): SilicateAndTotalsDerived {
  const markupPct = input.markupPercent ?? 0.2;
  const silicatePortion = input.mediaBroad * input.silicateShareOfBroad;
  const silicateCost = silicatePortion * input.silicateRate;
  const subtotalBeforeMarkup =
    input.linerLineCost +
    input.mediaLineCost +
    silicateCost +
    input.printingRate +
    input.mediaRateAdder +
    input.transportAdder;
  const markup = subtotalBeforeMarkup * markupPct;
  const grandTotal = subtotalBeforeMarkup + markup;
  return {
    silicatePortion,
    silicateCost,
    subtotalBeforeMarkup,
    markup,
    grandTotal,
  };
}

export interface PackagingCostingInput {
  customerName: string;
  itemName: string;
  description: string;
  rill: DimensionCmInput;
  cutting: DimensionCmInput;
  liner: PaperLineInput;
  media: PaperLineInput;
  silicateShareOfBroad: number;
  silicateRate: number;
  printingRate: number;
  mediaRateAdder: number;
  transportAdder: number;
  markupPercent?: number;
}

export interface PackagingCostingResult {
  rill: DimensionDerived;
  cutting: DimensionDerived;
  liner: PaperLineDerived;
  media: PaperLineDerived;
  silicateTotals: SilicateAndTotalsDerived;
}

export function computePackagingCosting(
  input: PackagingCostingInput
): PackagingCostingResult {
  const rill = deriveDimension(input.rill);
  const cutting = deriveDimension(input.cutting);
  const liner = derivePaperLineCost(input.liner);
  const media = derivePaperLineCost(input.media);
  const silicateTotals = deriveSilicateAndTotals({
    mediaBroad: media.broadI,
    silicateShareOfBroad: input.silicateShareOfBroad,
    silicateRate: input.silicateRate,
    printingRate: input.printingRate,
    mediaRateAdder: input.mediaRateAdder,
    transportAdder: input.transportAdder,
    linerLineCost: liner.lineCost,
    mediaLineCost: media.lineCost,
    markupPercent: input.markupPercent,
  });
  return { rill, cutting, liner, media, silicateTotals };
}

/** Default numeric inputs matching the sample workbook row values. */
export function getDefaultPackagingCostingInput(): PackagingCostingInput {
  return {
    customerName: "",
    itemName: "",
    description: "",
    rill: { widthCm: 22, heightCm: 21.5, lengthCm: 2, plusCm: 1 },
    cutting: { widthCm: 31.5, heightCm: 22, lengthCm: 2, plusCm: 5 },
    liner: {
      width: 46,
      height: 76,
      gsm: 150,
      rate: 45,
    },
    media: {
      width: 46,
      height: 76,
      gsm: 470,
      rate: 40,
    },
    silicateShareOfBroad: 0.25,
    silicateRate: 22,
    printingRate: 1,
    mediaRateAdder: 0.5,
    transportAdder: 0.2,
    markupPercent: 0.2,
  };
}
