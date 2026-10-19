/**
 * Code 128 (subset B) encoder — for the invoice-serial barcode printed on
 * every receipt (hardware doc §2.6: scanning the receipt on the returns
 * screen finds the invoice). Pure: returns module widths; the caller draws.
 */

/** Bar/space widths for symbol values 0–106 (106 = stop, 7 elements). */
const PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];

const START_B = 104;
const STOP = 106;

export function code128Patterns(): readonly string[] {
  return PATTERNS;
}

/**
 * Encode printable ASCII (32–126) as Code 128B. Returns alternating
 * bar/space widths in modules, starting with a bar, including the checksum
 * and stop symbol.
 */
export function encodeCode128B(text: string): number[] {
  const values: number[] = [];
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code < 32 || code > 126) throw new RangeError(`Code128B cannot encode "${ch}"`);
    values.push(code - 32);
  }
  const checksum = values.reduce((sum, v, i) => sum + v * (i + 1), START_B) % 103;
  const symbols = [START_B, ...values, checksum, STOP];
  return symbols.flatMap((s) => PATTERNS[s]!.split('').map(Number));
}

/** An inline SVG barcode (black bars on white, with the 10-module quiet zone). */
export function code128Svg(text: string, opts: { moduleWidth?: number; height?: number } = {}): string {
  const mw = opts.moduleWidth ?? 2;
  const h = opts.height ?? 60;
  const widths = encodeCode128B(text);
  const quiet = 10 * mw;
  let x = quiet;
  const rects: string[] = [];
  widths.forEach((w, i) => {
    if (i % 2 === 0) rects.push(`<rect x="${x}" y="0" width="${w * mw}" height="${h}"/>`);
    x += w * mw;
  });
  const total = x + quiet;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${h}" viewBox="0 0 ${total} ${h}" shape-rendering="crispEdges"><rect width="${total}" height="${h}" fill="#fff"/><g fill="#000">${rects.join('')}</g></svg>`;
}
