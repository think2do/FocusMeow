import React from 'react';
import { Animated, Platform, StyleSheet, Text, TextInput } from 'react-native';

export const APP_FONT_DISPLAY_NAME = '华文宋体';
export const APP_FONT_FAMILY = Platform.OS === 'ios' ? 'STSong' : 'serif';

const FONT_STYLE = { fontFamily: APP_FONT_FAMILY };
const TEXT_STYLE_KEYS = new Set([
  'fontSize',
  'fontStyle',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
  'textAlign',
  'textDecorationLine',
  'textTransform',
]);

const hasOwn = (target, key) => Object.prototype.hasOwnProperty.call(target, key);

const looksLikeTextStyle = (style) => {
  if (!style || typeof style !== 'object' || Array.isArray(style)) return false;
  if (style.fontFamily) return false;
  return Array.from(TEXT_STYLE_KEYS).some((key) => hasOwn(style, key));
};

const withFontStyle = (style) => {
  if (!style) return FONT_STYLE;
  if (Array.isArray(style)) return [FONT_STYLE, ...style];
  if (style.fontFamily) return style;
  return [FONT_STYLE, style];
};

const withFontInStyleSheet = (style) => {
  if (!looksLikeTextStyle(style)) return style;
  return { fontFamily: APP_FONT_FAMILY, ...style };
};

if (!global.__FOCUSMEOW_APP_FONT_PATCHED__) {
  global.__FOCUSMEOW_APP_FONT_PATCHED__ = true;

  try {
    const originalCreateElement = React.createElement;
    React.createElement = (type, props, ...children) => {
      const isTextLike = type === Text || type === TextInput || type === Animated.Text;
      if (!isTextLike) {
        return originalCreateElement(type, props, ...children);
      }

      return originalCreateElement(
        type,
        {
          ...props,
          style: withFontStyle(props?.style),
        },
        ...children,
      );
    };
  } catch {
    // StyleSheet patch below still covers most app text styles if createElement is locked.
  }

  try {
    const originalStyleSheetCreate = StyleSheet.create;
    StyleSheet.create = (styles) => {
      const nextStyles = Object.keys(styles || {}).reduce((acc, key) => {
        acc[key] = withFontInStyleSheet(styles[key]);
        return acc;
      }, {});
      return originalStyleSheetCreate(nextStyles);
    };
  } catch {
    // If React Native locks StyleSheet in a future version, the createElement patch still covers rendered text.
  }
}
