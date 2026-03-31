import { View, Image, Animated } from "react-native";
import { useEffect, useRef, forwardRef } from "react";

const Splash = forwardRef<View>((props, ref) => {
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View
      ref={ref}
      style={{
        flex: 1,
        backgroundColor: "#000",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Animated.Image
        source={require("../../../assets/images/splashImage.png")}
        style={{
          width: 350,
          height: 350,
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        }}
        resizeMode="contain"
      />
    </View>
  );
});

Splash.displayName = "Splash";

export default Splash;