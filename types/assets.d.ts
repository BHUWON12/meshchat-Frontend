// types/custom.d.ts or assets.d.ts

// Declare module for .mp3 files
declare module '*.mp3' {
    const value: number; // Or string, depending on how your bundler/loader handles it.
                        // Expo often resolves assets to numbers (local URI) or strings (web URLs).
                        // Using 'any' is also an option if you're unsure or need flexibility.
    export default value;
  }
  
  // You can add declarations for other asset types here if needed
  declare module '*.png' {
    const value: import('react-native').ImageSourcePropType;
    export default value;
  }
  
  declare module '*.jpg' {
    const value: import('react-native').ImageSourcePropType;
    export default value;
  }
  
  declare module '*.jpeg' {
      const value: import('react-native').ImageSourcePropType;
      export default value;
  }
  
  declare module '*.svg' {
      import React from 'react';
      import { SvgProps } from 'react-native-svg';
      const content: React.FC<SvgProps>;
      export default content;
  }
  
  declare module '*.ttf' {
      const value: string;
      export default value;
  }
  
  // Add any other asset types you import directly