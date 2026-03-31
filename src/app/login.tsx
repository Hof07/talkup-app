import { forwardRef, useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
  ImageBackground,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
} from "react-native";
import { useFonts } from "expo-font";
import {
  Outfit_400Regular,
  Outfit_700Bold,
  Outfit_600SemiBold,
} from "@expo-google-fonts/outfit";
import { router } from "expo-router";
import Colors from "./constants/colors";

const { width, height } = Dimensions.get("window");

const LoginScreen = forwardRef<View>((props, ref) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const imageHeight = useRef(new Animated.Value(height * 0.48)).current;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

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
    ]).start();

    const showListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        Animated.timing(imageHeight, {
          toValue: height * 0.2,
          duration: 300,
          useNativeDriver: false,
        }).start();
      }
    );

    const hideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        Animated.timing(imageHeight, {
          toValue: height * 0.48,
          duration: 300,
          useNativeDriver: false,
        }).start();
      }
    );

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  const handleContinue = () => {
    Keyboard.dismiss();

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setError("");
    router.push({
      pathname: "/profile-setup",
      params: { email, password },
    });
  };

  if (!fontsLoaded) return null;

  return (
    <ImageBackground
      source={require("../../assets/images/bgPattern.png")}
      style={styles.bgImage}
      resizeMode="cover"
    >
      <View style={styles.overlay} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View ref={ref} style={styles.container}>

            {/* Illustration */}
            <Animated.View
              style={[styles.imageContainer, { height: imageHeight }]}
            >
              <Animated.View
                style={{ opacity: fadeAnim, width: "100%", height: "100%" }}
              >
                <Image
                  source={require("../../assets/images/img2.png")}
                  style={styles.illustration}
                  resizeMode="contain"
                />
              </Animated.View>
            </Animated.View>

            {/* Bottom card */}
            <Animated.View
              style={[
                styles.bottomCard,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              ]}
            >
              {/* Title */}
              <Text style={styles.title}>Create Account</Text>

              {/* Inputs */}
              <View style={styles.formContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter email"
                  placeholderTextColor={Colors.neutral400}
                  value={email}
                  onChangeText={(t) => { setEmail(t); setError(""); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                />

                <TextInput
                  style={styles.input}
                  placeholder="Enter password"
                  placeholderTextColor={Colors.neutral400}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(""); }}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleContinue}
                />

                {error ? (
                  <Text style={styles.errorText}>{error}</Text>
                ) : null}
              </View>

              {/* Already have account */}
              <TouchableOpacity
                style={styles.accountRow}
                onPress={() => router.push("/signin")}
              >
                <Text style={styles.accountText}>already have </Text>
                <Text style={styles.accountLink}>account?</Text>
              </TouchableOpacity>

              {/* Button */}
              <TouchableOpacity
                style={styles.button}
                activeOpacity={0.85}
                onPress={handleContinue}
              >
                <Text style={styles.buttonText}>Continue</Text>
              </TouchableOpacity>

            </Animated.View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
});

LoginScreen.displayName = "LoginScreen";

export default LoginScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bgImage: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0, 0.3)",
  },
  scrollContent: { flexGrow: 1 },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
  },

  // Illustration
  imageContainer: {
    width: width,
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  illustration: {
   marginTop: 52,
    width: width * 0.98,
    height: "100%",
  },

  // Bottom section
  bottomCard: {
    width: width,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
    gap: 20,
  },

  // Title
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: 34,
    color: Colors.white,
    textAlign: "center",
    marginBottom: 4,
  },

  // Form
  formContainer: {
    width: "100%",
    gap: 16,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 50,
    paddingVertical: 20,
    paddingHorizontal: 26,
    fontFamily: "Outfit_400Regular",
    fontSize: 16,
    color: Colors.text,
  },
  errorText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.red,
    textAlign: "center",
  },

  // Already have account
  accountRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  accountText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 15,
    color: Colors.white,
  },
  accountLink: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 15,
    color: Colors.primary,
  },

  // Button
  button: {
    width: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 50,
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
  },
  buttonText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 18,
    color: Colors.black,
    letterSpacing: 0.5,
  },
});