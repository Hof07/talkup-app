import { forwardRef, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
  ImageBackground,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import {
  Outfit_400Regular,
  Outfit_700Bold,
  Outfit_600SemiBold,
} from "@expo-google-fonts/outfit";

const { width, height } = Dimensions.get("window");

const OnboardingScreen = forwardRef<View>((props, ref) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const btnAnim = useRef(new Animated.Value(80)).current;

  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_700Bold,
    Outfit_600SemiBold,
  });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(btnAnim, {
        toValue: 0,
        duration: 1000,
        delay: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <ImageBackground
      source={require("../../../assets/images/bgPattern.png")}
      style={styles.bgImage}
      resizeMode="cover"
    >
      <View style={styles.overlay} />

      <View ref={ref} style={styles.container}>
        {/* Illustration */}
        <Animated.View
          style={[
            styles.imageContainer,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Image
            source={require("../../../assets/images/welcome.png")}
            style={styles.illustration}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Text */}
        <Animated.View
          style={[
            styles.textContainer,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Text style={styles.title}>Connect with Friends</Text>
          <Text style={styles.subtitle}>
            Chat, share and stay connected with your{"\n"}friends anytime,
            anywhere.
          </Text>
        </Animated.View>

        {/* Button */}
        <Animated.View
          style={[
            styles.btnWrapper,
            { opacity: fadeAnim, transform: [{ translateY: btnAnim }] },
          ]}
        >
          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.85}
            onPress={async () => {
              await AsyncStorage.setItem("hasLaunched", "true");
              router.replace("/login");
            }}
          >
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </ImageBackground>
  );
});

OnboardingScreen.displayName = "OnboardingScreen";

export default OnboardingScreen;

const styles = StyleSheet.create({
  bgImage: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20, 20, 20, 0.)", // 0.5 instead of 0.82
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingBottom: 48,
  },
  imageContainer: {
    width: width,
    height: height * 0.55,
    alignItems: "center",
    justifyContent: "center",
  },
  illustration: {
    width: width * 0.9,
    height: "100%",
  },
  textContainer: {
    alignItems: "center",
    paddingHorizontal: 32,
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: 32,
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 14,
  },
  subtitle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 16,
    color: "#aaaaaa",
    textAlign: "center",
    lineHeight: 26,
  },
  btnWrapper: {
    width: width - 48,
  },
  button: {
    backgroundColor: "#EAB308",
    borderRadius: 50,
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
  },
  buttonText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 18,
    color: "#1a1a1a",
    letterSpacing: 0.5,
  },
});
