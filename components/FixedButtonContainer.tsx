
import React from 'react';
import { View } from 'react-native';
import tw from 'twrnc';

interface FixedButtonContainerProps {
  children: React.ReactNode;
}

const FixedButtonContainer: React.FC<FixedButtonContainerProps> = ({ children }) => {
  return (
    <View style={tw`px-6 py-4 border-gray-200`}>
      {children}
    </View>
  );
};

export default FixedButtonContainer;
