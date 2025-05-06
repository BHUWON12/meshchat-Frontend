import React from 'react';
import { 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  ViewStyle,
  TextStyle
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../../constants/Colors';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  gradient?: boolean;
  icon?: React.ReactNode;
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  gradient = false,
  icon
}: ButtonProps) {
  // Define button styles based on variant
  const getButtonStyle = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return styles.primaryButton;
      case 'secondary':
        return styles.secondaryButton;
      case 'outline':
        return styles.outlineButton;
      case 'text':
        return styles.textButton;
      default:
        return styles.primaryButton;
    }
  };

  // Define text styles based on variant
  const getTextStyle = (): TextStyle => {
    switch (variant) {
      case 'primary':
        return styles.primaryText;
      case 'secondary':
        return styles.secondaryText;
      case 'outline':
        return styles.outlineText;
      case 'text':
        return styles.textButtonText;
      default:
        return styles.primaryText;
    }
  };

  // Define size styles
  const getSizeStyle = (): ViewStyle => {
    switch (size) {
      case 'small':
        return styles.smallButton;
      case 'medium':
        return styles.mediumButton;
      case 'large':
        return styles.largeButton;
      default:
        return styles.mediumButton;
    }
  };

  // Define text size styles
  const getTextSizeStyle = (): TextStyle => {
    switch (size) {
      case 'small':
        return styles.smallText;
      case 'medium':
        return styles.mediumText;
      case 'large':
        return styles.largeText;
      default:
        return styles.mediumText;
    }
  };

  // Combined styles
  const buttonStyles = [
    styles.button,
    getButtonStyle(),
    getSizeStyle(),
    fullWidth && styles.fullWidth,
    disabled && styles.disabledButton,
    style,
  ];

  const textStyles = [
    styles.text,
    getTextStyle(),
    getTextSizeStyle(),
    disabled && styles.disabledText,
    textStyle,
  ];

  // For primary gradient buttons
  if (gradient && variant === 'primary' && !disabled) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        style={[styles.buttonContainer, fullWidth && styles.fullWidth, style]}
      >
        <LinearGradient
          colors={[Colors.primary[600], Colors.primary[500]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.button, getSizeStyle(), fullWidth && styles.fullWidth]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              {icon && icon}
              <Text style={textStyles}>{title}</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator 
          color={variant === 'primary' ? '#fff' : Colors.primary[500]} 
          size="small" 
        />
      ) : (
        <>
          {icon && icon}
          <Text style={textStyles}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  // Variant styles
  primaryButton: {
    backgroundColor: Colors.primary[500],
  },
  primaryText: {
    color: Colors.common.white,
  },
  secondaryButton: {
    backgroundColor: Colors.primary[100],
  },
  secondaryText: {
    color: Colors.primary[700],
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary[500],
  },
  outlineText: {
    color: Colors.primary[500],
  },
  textButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  textButtonText: {
    color: Colors.primary[500],
  },
  // Size styles
  smallButton: {
    height: 32,
    paddingHorizontal: 12,
  },
  mediumButton: {
    height: 44,
    paddingHorizontal: 16,
  },
  largeButton: {
    height: 52,
    paddingHorizontal: 24,
  },
  // Text size styles
  smallText: {
    fontSize: 12,
  },
  mediumText: {
    fontSize: 14,
  },
  largeText: {
    fontSize: 16,
  },
  // Width style
  fullWidth: {
    width: '100%',
  },
  // Disabled style
  disabledButton: {
    backgroundColor: Colors.common.gray[200],
    borderColor: Colors.common.gray[200],
  },
  disabledText: {
    color: Colors.common.gray[500],
  },
});