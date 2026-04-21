import { Image } from 'react-native';
import Share from 'react-native-share';

const FALLBACK_SHARE_IMAGE = require('../assets/first_logo.png');

const resolveAssetUri = (source) => {
  if (!source) return '';
  const resolved = Image.resolveAssetSource(source);
  return typeof resolved?.uri === 'string' ? resolved.uri : '';
};

export async function shareImageWithMessage({
  title = 'Focus Meow',
  message = '',
  imageSource = FALLBACK_SHARE_IMAGE,
  filename = 'focusmeow-share.png',
}) {
  const safeMessage = String(message || '').trim();
  const imageUri = resolveAssetUri(imageSource) || resolveAssetUri(FALLBACK_SHARE_IMAGE);
  const linkMetadata = imageUri
    ? {
        title,
        icon: imageUri,
        image: imageUri,
      }
    : undefined;

  return Share.open({
    title,
    subject: title,
    message: safeMessage,
    url: imageUri || undefined,
    type: imageUri ? 'image/png' : undefined,
    filename: imageUri ? filename : undefined,
    failOnCancel: false,
    activityItemSources: imageUri
      ? [
          {
            placeholderItem: { type: 'url', content: imageUri },
            item: { default: { type: 'url', content: imageUri } },
            dataTypeIdentifier: { default: 'public.png' },
            thumbnailImage: { default: imageUri },
            linkMetadata,
          },
          {
            placeholderItem: { type: 'text', content: safeMessage || title },
            item: { default: { type: 'text', content: safeMessage || title } },
            subject: { default: title },
            linkMetadata,
          },
        ]
      : undefined,
  });
}
