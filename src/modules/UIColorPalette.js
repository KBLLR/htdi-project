import '../css/style.css'

export default class UiColorPalette {
  constructor() {
    this.setColors();
    this.setCustomProperties();
  }

  setColors() {
    this.hue = ~~random(0, 660);
    this.complimentaryHue1 = this.hue + 30;
    this.complimentaryHue2 = this.hue + 60;

    this.saturation = 80;
    this.lightness = 50;

    this.baseColor = hsl(this.hue, this.saturation, this.lightness);

    this.complimentaryColor1 = hsl(
      this.complimentaryHue1,
      this.saturation,
      this.lightness
    );

    this.complimentaryColor2 = hsl(
      this.complimentaryHue2,
      this.saturation,
      this.lightness
    );

    this.colorChoices = [
      this.baseColor,
      this.complimentaryColor1,
      this.complimentaryColor2
    ];
  }

  randomColor() {
    // pick a random color
    return this.colorChoices[~~random(0, this.colorChoices.length)].replace(
      "#",
      "0x"
    );
  }

  setCustomProperties() {
    // set CSS custom properties so that the colors defined here can be used throughout the UI
    document.documentElement.style.setProperty("--hue", this.hue);
    document.documentElement.style.setProperty(
      "--hue-complimentary1",
      this.complimentaryHue1
    );
    document.documentElement.style.setProperty(
      "--hue-complimentary2",
      this.complimentaryHue2
    );
  }
}

sound.onmousemove = (e) => {
  const colors = [
    'MintCream',
    'DodgerBlue',
    'Aqua',
    'Chartreuse',
    'Coral',
    'GoldenRod',
    'GhostWhite',
    'DarkSalmon',
    'DarkTurquoise',
    'HotPink',
    'MediumSpringGreen',
    'PeachPuff',
    'Teal'
  ]
  const random = () => colors[Math.floor(Math.random() * colors.length)];
  document.documentElement.style.cssText = ` --hue: ${random()}; `
}


