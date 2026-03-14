/**
 * Theme definitions for HTML rendering.
 */

export interface Theme {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  headingColor: string;
  linkColor: string;
  quoteBackground: string;
  quoteBorderColor: string;
  codeBackground: string;
  codeTextColor: string;
  dividerColor: string;
  calloutInfoBg: string;
  calloutInfoBorder: string;
  calloutWarningBg: string;
  calloutWarningBorder: string;
  calloutTipBg: string;
  calloutTipBorder: string;
}

export const THEMES: Record<string, Theme> = {
  default: {
    name: 'default',
    primaryColor: '#1a73e8',
    secondaryColor: '#5f6368',
    backgroundColor: '#ffffff',
    textColor: '#333333',
    headingColor: '#1a73e8',
    linkColor: '#1a73e8',
    quoteBackground: '#f8f9fa',
    quoteBorderColor: '#1a73e8',
    codeBackground: '#f6f8fa',
    codeTextColor: '#24292e',
    dividerColor: '#e8eaed',
    calloutInfoBg: '#e8f0fe',
    calloutInfoBorder: '#1a73e8',
    calloutWarningBg: '#fef7e0',
    calloutWarningBorder: '#f9ab00',
    calloutTipBg: '#e6f4ea',
    calloutTipBorder: '#34a853',
  },
  dark: {
    name: 'dark',
    primaryColor: '#8ab4f8',
    secondaryColor: '#9aa0a6',
    backgroundColor: '#1e1e1e',
    textColor: '#e8eaed',
    headingColor: '#8ab4f8',
    linkColor: '#8ab4f8',
    quoteBackground: '#2d2d2d',
    quoteBorderColor: '#8ab4f8',
    codeBackground: '#2d2d2d',
    codeTextColor: '#e8eaed',
    dividerColor: '#3c4043',
    calloutInfoBg: '#1e3a5f',
    calloutInfoBorder: '#8ab4f8',
    calloutWarningBg: '#3e3419',
    calloutWarningBorder: '#fdd663',
    calloutTipBg: '#1e3e2e',
    calloutTipBorder: '#81c995',
  },
  elegant: {
    name: 'elegant',
    primaryColor: '#6b4c3b',
    secondaryColor: '#8d7b6e',
    backgroundColor: '#faf8f5',
    textColor: '#3d3027',
    headingColor: '#6b4c3b',
    linkColor: '#6b4c3b',
    quoteBackground: '#f0ebe4',
    quoteBorderColor: '#6b4c3b',
    codeBackground: '#f0ebe4',
    codeTextColor: '#3d3027',
    dividerColor: '#d4c5b5',
    calloutInfoBg: '#e8e0d6',
    calloutInfoBorder: '#6b4c3b',
    calloutWarningBg: '#f5ead6',
    calloutWarningBorder: '#c49a2a',
    calloutTipBg: '#dfe8d8',
    calloutTipBorder: '#5a7a44',
  },
  tech: {
    name: 'tech',
    primaryColor: '#00bcd4',
    secondaryColor: '#78909c',
    backgroundColor: '#0d1117',
    textColor: '#c9d1d9',
    headingColor: '#00bcd4',
    linkColor: '#58a6ff',
    quoteBackground: '#161b22',
    quoteBorderColor: '#00bcd4',
    codeBackground: '#161b22',
    codeTextColor: '#c9d1d9',
    dividerColor: '#21262d',
    calloutInfoBg: '#0d2137',
    calloutInfoBorder: '#58a6ff',
    calloutWarningBg: '#2d1f00',
    calloutWarningBorder: '#d29922',
    calloutTipBg: '#0d2d1f',
    calloutTipBorder: '#3fb950',
  },
};

/**
 * Get a theme by name, with optional primary color override.
 */
export function getTheme(name: string, primaryColorOverride?: string): Theme {
  const base = THEMES[name] ?? THEMES['default'];
  if (primaryColorOverride) {
    return { ...base, primaryColor: primaryColorOverride, headingColor: primaryColorOverride };
  }
  return base;
}
