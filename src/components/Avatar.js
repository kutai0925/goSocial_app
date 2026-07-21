import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, ClipPath, Image as SvgImage, Defs, Text as SvgText } from 'react-native-svg';

const Avatar = ({ url, name, size = 42, style, textStyle }) => {
  const [imageFailed, setImageFailed] = useState(false);
  
  const flattenedStyle = StyleSheet.flatten(style) || {};
  const { borderWidth = 0, borderColor = 'transparent', ...restStyle } = flattenedStyle;
  
  const cleanUrl = url ? url.replace(/\s+/g, '') : null;
  const hasImage = cleanUrl && !imageFailed;
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  
  const radius = size / 2;
  const strokeOffset = borderWidth / 2;
  const innerRadius = radius - strokeOffset;

  return (
    <View style={[{ width: size, height: size }, restStyle, { borderWidth: 0, backgroundColor: 'rgba(255, 255, 255, 0.01)' }]}>
      <Svg width={size} height={size}>
        <Defs>
          <ClipPath id={`clip-${size}`}>
            <Circle cx={radius} cy={radius} r={innerRadius} />
          </ClipPath>
        </Defs>

        {/* Background circle */}
        <Circle cx={radius} cy={radius} r={innerRadius} fill="#8B4CC2" />

        {/* Profile Image or Initials */}
        {hasImage ? (
          <SvgImage
            x={strokeOffset}
            y={strokeOffset}
            width={size - borderWidth}
            height={size - borderWidth}
            preserveAspectRatio="xMidYMid slice"
            href={{ uri: cleanUrl }}
            clipPath={`url(#clip-${size})`}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <SvgText
            x={radius}
            y={radius + (size * 0.45 * 0.35)} // Adjust baseline for React Native SVG text centering
            fill="#FFFFFF"
            fontSize={size * 0.45}
            fontWeight="bold"
            textAnchor="middle"
          >
            {initial}
          </SvgText>
        )}

        {/* Border */}
        {borderWidth > 0 && (
          <Circle
            cx={radius}
            cy={radius}
            r={innerRadius}
            stroke={borderColor}
            strokeWidth={borderWidth}
            fill="none"
          />
        )}
      </Svg>
    </View>
  );
};

export default Avatar;
