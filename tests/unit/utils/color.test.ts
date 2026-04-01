import { describe, it, expect } from 'vitest';
import {
  hexToGoogleColor,
  googleColorToHex,
} from '../../../src/utils/color';

describe('hexToGoogleColor', () => {
  it('converts #FF0000 to red', () => {
    expect(hexToGoogleColor('#FF0000')).toEqual({
      red: 1,
      green: 0,
      blue: 0,
      alpha: 1,
    });
  });

  it('converts #000000 to black', () => {
    expect(hexToGoogleColor('#000000')).toEqual({
      red: 0,
      green: 0,
      blue: 0,
      alpha: 1,
    });
  });

  it('converts #FFFFFF to white', () => {
    expect(hexToGoogleColor('#FFFFFF')).toEqual({
      red: 1,
      green: 1,
      blue: 1,
      alpha: 1,
    });
  });

  it('converts 3-char hex #F00 to red', () => {
    expect(hexToGoogleColor('#F00')).toEqual({
      red: 1,
      green: 0,
      blue: 0,
      alpha: 1,
    });
  });

  it('handles lowercase without hash', () => {
    expect(hexToGoogleColor('ff0000')).toEqual({
      red: 1,
      green: 0,
      blue: 0,
      alpha: 1,
    });
  });

  it('converts mid-range #336699', () => {
    const result = hexToGoogleColor('#336699');
    expect(result.red).toBeCloseTo(0.2, 1);
    expect(result.green).toBeCloseTo(0.4, 1);
    expect(result.blue).toBeCloseTo(0.6, 1);
    expect(result.alpha).toBe(1);
  });
});

describe('googleColorToHex', () => {
  it('converts red to #FF0000', () => {
    expect(googleColorToHex({ red: 1, green: 0, blue: 0 })).toBe('#FF0000');
  });

  it('converts empty object to #000000', () => {
    expect(googleColorToHex({})).toBe('#000000');
  });

  it('converts white to #FFFFFF', () => {
    expect(googleColorToHex({ red: 1, green: 1, blue: 1 })).toBe('#FFFFFF');
  });
});

describe('roundtrip', () => {
  it('hexToGoogleColor then googleColorToHex returns original for 6-char hex', () => {
    const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF', '#000000'];
    for (const hex of colors) {
      const googleColor = hexToGoogleColor(hex);
      expect(googleColorToHex(googleColor)).toBe(hex);
    }
  });
});
