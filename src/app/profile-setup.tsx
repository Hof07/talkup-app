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
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import Colors from "./constants/colors";

const { width, height } = Dimensions.get("window");

const ProfileSetup = forwardRef<View>((props, ref) => {
  const { email, password } = useLocalSearchParams<{
    email: string;
    password: string;
  }>();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const imageHeight = useRef(new Animated.Value(height * 0.32)).current;

  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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
          toValue: height * 0.15,
          duration: 300,
          useNativeDriver: false,
        }).start();
      }
    );

    const hideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        Animated.timing(imageHeight, {
          toValue: height * 0.32,
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

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setError("Permission to access gallery is required");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as any,
      allowsEditing: true,
      aspect: [1, 1] as [number, number],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
      setError("");
    }
  };

  const uploadAvatar = async (
    userId: string,
    uri: string,
    token: string
  ): Promise<string> => {
    const fileName = `${userId}/avatar.jpg`;
    const fileResponse = await fetch(uri);
    const blob = await fileResponse.blob();

    const uploadRes = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/avatars/${fileName}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "image/jpeg",
          apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${token}`,
        },
        body: blob,
      }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.json();
      throw new Error(err.message || "Avatar upload failed");
    }

    return `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${fileName}`;
  };

  // Always upsert — never fails on duplicate
  const upsertPublicUser = async (
    userId: string,
    accessToken: string,
    avatarUrl: string | null,
    usernameVal: string
  ) => {
    const res = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/users`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${accessToken}`,
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify({
          id: userId,
          email,
          username: usernameVal.trim(),
          avatar_url: avatarUrl,
        }),
      }
    );

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Failed to save profile");
    }
  };

  const navigateHome = async (sessionData: any) => {
    await AsyncStorage.setItem("userSession", JSON.stringify(sessionData));
    await AsyncStorage.setItem("hasLaunched", "true");
    setTimeout(() => {
      router.replace("/home");
    }, 150);
  };

  // Get a valid token — sign in if exists, sign up if new
  const getAuthToken = async (): Promise<{
    userId: string;
    accessToken: string;
    sessionData: any;
  }> => {
    // Always try sign in first
    const signInRes = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({ email, password }),
      }
    );

    const signInData = await signInRes.json();

    // Sign in succeeded
    if (signInRes.ok && signInData.access_token) {
      return {
        userId: signInData.user?.id,
        accessToken: signInData.access_token,
        sessionData: signInData,
      };
    }

    // Sign in failed — try sign up
    const signUpRes = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/signup`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({ email, password }),
      }
    );

    const signUpData = await signUpRes.json();

    if (!signUpRes.ok) {
      throw new Error(
        signUpData.error_description || signUpData.msg || "Authentication failed"
      );
    }

    if (!signUpData.access_token) {
      throw new Error(
        "Please disable email confirmation in Supabase:\nAuthentication → Settings → Disable email confirmations"
      );
    }

    return {
      userId: signUpData.user?.id,
      accessToken: signUpData.access_token,
      sessionData: signUpData,
    };
  };

  const handleFinish = async () => {
    Keyboard.dismiss();

    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }

    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Step 1 — Get auth token (sign in or sign up)
      const { userId, accessToken, sessionData } = await getAuthToken();

      // Step 2 — Upload avatar if selected
      let avatarUrl = null;
      if (avatar) {
        try {
          avatarUrl = await uploadAvatar(userId, avatar, accessToken);
        } catch {
          // continue without avatar
        }
      }

      // Step 3 — Upsert public.users (never duplicate error)
      await upsertPublicUser(userId, accessToken, avatarUrl, username);

      // Step 4 — Save session and navigate
      await navigateHome(sessionData);

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

            {/* Top illustration */}
            <Animated.View style={[styles.topArea, { height: imageHeight }]}>
              <Animated.View
                style={{ opacity: fadeAnim, width: "100%", height: "100%" }}
              >
                <Image
                  source={require("../../assets/images/img2.png")}
                  style={styles.topIllustration}
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
              <Text style={styles.title}>Setup Profile</Text>
              <Text style={styles.subtitle}>Add your name and photo</Text>

              {/* Avatar picker */}
              <TouchableOpacity
                style={styles.avatarWrapper}
                onPress={pickImage}
                activeOpacity={0.8}
              >
                {avatar ? (
                  <Image source={{ uri: avatar }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarIcon}>📷</Text>
                    <Text style={styles.avatarPlaceholderText}>Add Photo</Text>
                  </View>
                )}
                <View style={styles.editBadge}>
                  <Text style={styles.editBadgeText}>✎</Text>
                </View>
              </TouchableOpacity>

              {/* Live preview */}
              {username.trim().length >= 3 && (
                <View style={styles.previewRow}>
                  <View style={styles.previewAvatar}>
                    {avatar ? (
                      <Image
                        source={{ uri: avatar }}
                        style={styles.previewAvatarImg}
                      />
                    ) : (
                      <Text style={styles.previewAvatarEmoji}>👤</Text>
                    )}
                  </View>
                  <View>
                    <Text style={styles.previewUsername}>
                      @{username.trim()}
                    </Text>
                    <Text style={styles.previewEmail}>{email}</Text>
                  </View>
                </View>
              )}

              {/* Username input */}
              <View style={styles.formContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter username"
                  placeholderTextColor={Colors.neutral400}
                  value={username}
                  onChangeText={(t) => {
                    setUsername(t);
                    setError("");
                  }}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleFinish}
                />
                {error ? (
                  <Text style={styles.errorText}>{error}</Text>
                ) : null}
              </View>

              {/* Button */}
              <TouchableOpacity
                style={styles.button}
                activeOpacity={0.85}
                onPress={handleFinish}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.black} />
                ) : (
                  <Text style={styles.buttonText}>Get Started 🎉</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
});

ProfileSetup.displayName = "ProfileSetup";

export default ProfileSetup;

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
  topArea: {
    width: width,
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  topIllustration: {
    width: width * 0.75,
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
  avatarWrapper: {
    position: "relative",
    marginVertical: 4,
  },
  avatarImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.neutral800,
    borderWidth: 3,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  avatarIcon: { fontSize: 28 },
  avatarPlaceholderText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.neutral400,
  },
  editBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: Colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  editBadgeText: {
    fontSize: 14,
    color: Colors.black,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.neutral800,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: "100%",
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  previewAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.neutral700,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  previewAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  previewAvatarEmoji: { fontSize: 22 },
  previewUsername: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 15,
    color: Colors.primary,
  },
  previewEmail: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.neutral400,
    marginTop: 2,
  },
  formContainer: {
    width: "100%",
    gap: 12,
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