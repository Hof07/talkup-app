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
  ActivityIndicator,
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "./constants/colors";

const { width, height } = Dimensions.get("window");

const SignIn = forwardRef<View>((props, ref) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const imageHeight = useRef(new Animated.Value(height * 0.45)).current;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_700Bold,
    Outfit_600SemiBold,
  });

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
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
        ]),
        Animated.delay(1500),
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 50,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ).start();

    // keyboard listeners stay same
    const showListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        Animated.timing(imageHeight, {
          toValue: height * 0.2,
          duration: 300,
          useNativeDriver: false,
        }).start();
      },
    );

    const hideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        Animated.timing(imageHeight, {
          toValue: height * 0.45,
          duration: 300,
          useNativeDriver: false,
        }).start();
      },
    );

    return () => {
      showListener.remove();
      hideListener.remove();
      fadeAnim.stopAnimation();
      slideAnim.stopAnimation();
    };
  }, []);

  const handleSignIn = async () => {
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

    setLoading(true);
    setError("");

    try {
      // Step 1 — Sign in with Supabase
      const signInRes = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({ email, password }),
        },
      );

      const signInData = await signInRes.json();

      if (!signInRes.ok) {
        setError(
          signInData.error_description ||
            signInData.msg ||
            "Invalid email or password",
        );
        return;
      }

      const userId = signInData.user?.id;
      const accessToken = signInData.access_token;

      // Step 2 — Check if user exists in public.users
      const userRes = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=id,username,avatar_url`,
        {
          headers: {
            apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const userData = await userRes.json();

      if (!userData || userData.length === 0) {
        router.replace({
          pathname: "/profile-setup",
          params: { email, password },
        });
        return;
      }

      // Step 3 — Save session permanently & navigate
      await AsyncStorage.setItem("userSession", JSON.stringify(signInData));
      await AsyncStorage.setItem("hasLaunched", "true");
      setTimeout(() => router.replace("/home"), 150);
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
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
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to your account</Text>

              {/* Form */}
              <View style={styles.formContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter email"
                  placeholderTextColor={Colors.neutral400}
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    setError("");
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  returnKeyType="next"
                />

                <TextInput
                  style={styles.input}
                  placeholder="Enter password"
                  placeholderTextColor={Colors.neutral400}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    setError("");
                  }}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleSignIn}
                />

                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </View>

              {/* Don't have account */}
              <TouchableOpacity
                style={styles.accountRow}
                onPress={() => router.replace("/login")}
              >
                <Text style={styles.accountText}>don't have an </Text>
                <Text style={styles.accountLink}>account?</Text>
              </TouchableOpacity>

              {/* Sign In Button */}
              <TouchableOpacity
                style={styles.button}
                activeOpacity={0.85}
                onPress={handleSignIn}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.black} />
                ) : (
                  <Text style={styles.buttonText}>Sign In</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
});

SignIn.displayName = "SignIn";

export default SignIn;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bgImage: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  scrollContent: { flexGrow: 1 },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
  },
  imageContainer: {
    width: width,
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  illustration: {
    width: width * 0.85,
    height: "100%",
  },
  bottomCard: {
    width: width,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 48,
    gap: 16,
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: 34,
    color: Colors.white,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    color: Colors.neutral400,
    marginTop: -8,
  },
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
