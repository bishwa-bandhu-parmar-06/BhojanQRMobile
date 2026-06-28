import React, { useState } from 'react';
import { View, Image, Text, StyleSheet, ImageStyle, StyleProp, ImageResizeMode } from 'react-native';
import { ImageOff } from 'lucide-react-native';

// Mirrors the website's MenuImage.jsx - dish/menu photo with a guaranteed
// fallback: a rendered icon, not another image file, so the placeholder
// itself can never fail to load.
interface MenuImageProps {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  resizeMode?: ImageResizeMode;
}

const MenuImage = ({ uri, style, resizeMode = 'cover' }: MenuImageProps) => {
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
    return (
      <View style={[styles.placeholder, style]}>
        <ImageOff size={28} color="#9ca3af" strokeWidth={1.75} />
        <Text style={styles.placeholderText}>No Image</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode={resizeMode}
      onError={() => setFailed(true)}
    />
  );
};

const styles = StyleSheet.create({
  placeholder: { alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#f3f4f6' },
  placeholderText: { fontSize: 9, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 },
});

export default MenuImage;
