// Function to convert HSL or RGB to HEX
export function colorToHex(colorValue: string): string {
    if (colorValue.startsWith('hsl')) {
      // Convert HSL to HEX
      const match = colorValue.match(/(\d+(\.\d+)?)%?/g);
      if (match === null || match.length < 3) {
		throw new Error('Invalid HSL value');
	}

      const h = parseInt(match[0]) / 360;
      const s = parseInt(match[1]) / 100;
      const l = parseInt(match[2]) / 100;
  
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      const r = hue2rgb(p, q, h + 1 / 3);
      const g = hue2rgb(p, q, h);
      const b = hue2rgb(p, q, h - 1 / 3);
  
      const toHex = function (c: number) {
        const hex = Math.round(c * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      };
  
      const hex = '#' + toHex(r) + toHex(g) + toHex(b);
      return hex;
    } else if (colorValue.startsWith('rgb')) {
      // Convert RGB to HEX
      const sep = colorValue.indexOf(',') > -1 ? ',' : ' ';
      const rgbArray = colorValue.substr(4).split(')')[0].split(sep);
  
      let r = (+rgbArray[0]).toString(16),
        g = (+rgbArray[1]).toString(16),
        b = (+rgbArray[2]).toString(16);
  
      if (r.length == 1)
        r = '0' + r;
      if (g.length == 1)
        g = '0' + g;
      if (b.length == 1)
        b = '0' + b;
  
      return '#' + r + g + b;
    } else {
      // If the colorValue is neither RGB nor HSL, return the input
      return colorValue;
    }
}

// Function to convert HSL to RGB
function hue2rgb(p: number, q: number, t: number) {
	if (t < 0) t += 1;
	if (t > 1) t -= 1;
	if (t < 1 / 6) return p + (q - p) * 6 * t;
	if (t < 1 / 2) return q;
	if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
	return p;
}