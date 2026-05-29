import './global.css';

import { Text, View } from 'react-native';

export default function App() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
      }}
    >
      <Text style={{ fontSize: 28, fontWeight: '600', color: '#111111' }}>Hello world</Text>
    </View>
  );
}
