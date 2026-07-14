const Type = Object.freeze({
  BAR: {
    value: 'bar',
  },
  DOUGHNUT: {
    value: 'doughnut',
  },
  LINE: {
    value: 'line',
  },
});

const Direction = Object.freeze({
  HORIZONTAL: {
    value: 'horizontal',
  },
  VERTICAL: {
    value: 'vertical',
  },
});

const ScaleType = Object.freeze({
  LOGARITHMIC: {
    value: 'logarithmic',
  },
  LINEAR: {
    value: 'linear',
  },
});

const Donut = Object.freeze({
  SEGMENT_LIMIT: 10,
});

const ColorPaletteKey = Object.freeze({
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  OTHERS: 'others',
});

const ColorPalette = Object.freeze({
  PRIMARY: '#e5cc7a',
  SECONDARY: {
    DARK: [
      '#5fadc9',
      '#469bc6',
      '#4486c1',
      '#3a76bf',
      '#3768bf',
      '#4d5ec1',
      '#6b5dce',
      '#865fdd',
      '#9b63ea',
      '#b064f2',
    ],
    LIGHT: [
      '#81becc',
      '#62accc',
      '#629fcc',
      '#6194c6',
      '#6084cc',
      '#7676cc',
      '#8979cc',
      '#a385dd',
      '#ae91f2',
      '#baa4fc',
    ],
  },
  OTHERS: {
    DARK: '#7f7d90',
    LIGHT: '#ababab',
  },
});

export {
  ColorPalette,
  ColorPaletteKey,
  Direction,
  Donut,
  ScaleType,
  Type,
};
