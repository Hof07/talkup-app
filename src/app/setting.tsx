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
  ScrollView,
  Alert,
  StatusBar,
} from "react-native";
import { useFonts } from "expo-font";
import {
  Outfit_400Regular,
  Outfit_700Bold,
  Outfit_600SemiBold,
} from "@expo-google-fonts/outfit";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ArrowLeft,
  Camera,
  LogOut,
  User,
  MessageSquare,
  Check,
  Lock,
  Mail,
  Calendar,
  ShieldCheck,
  Fingerprint,
  ChevronRight,
  LockIcon,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import * as LocalAuthentication from "expo-local-authentication";
import { supabase } from "../lib/supabase";
import Colors from "./constants/colors";
import AppLockModal from "./AppLockModal";

const { width } = Dimensions.get("window");

const PIN_KEY = "app_lock_pin";
const BIOMETRIC_KEY = "app_lock_biometric";

const SettingsScreen = forwardRef<View>((props, ref) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingUsername, setSavingUsername] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [session, setSession] = useState<any>(null);

  // App Lock state
  const [appLockModalVisible, setAppLockModalVisible] = useState(false);
  const [isPinSet, setIsPinSet] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_700Bold,
    Outfit_600SemiBold,
  });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
    loadProfile();
    loadLockSettings();
  }, []);

  const loadLockSettings = async () => {
    const pin = await AsyncStorage.getItem(PIN_KEY);
    const bio = await AsyncStorage.getItem(BIOMETRIC_KEY);
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setIsPinSet(!!pin);
    setIsBiometricEnabled(bio === "true");
    setBiometricAvailable(compatible && enrolled);
  };

  const handleLockModalClose = () => {
    setAppLockModalVisible(false);
    // Refresh lock status after modal closes
    loadLockSettings();
  };

  const loadProfile = async () => {
    try {
      const sessionStr = await AsyncStorage.getItem("userSession");
      if (!sessionStr) {
        router.replace("/signin");
        return;
      }

      const sess = JSON.parse(sessionStr);
      setSession(sess);

      await supabase.auth.setSession({
        access_token: sess.access_token,
        refresh_token: sess.refresh_token,
      });

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", sess.user?.id)
        .single();

      if (error) throw error;

      setCurrentUser(data);
      setUsername(data.username || "");
      setStatus(data.status || "Hey, I am using this app!");
      setAvatar(data.avatar_url || null);
    } catch (e: any) {
      console.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const pickAvatar = async () => {
    const { status: perm } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm !== "granted") {
      Alert.alert("Permission required", "Please allow access to your gallery");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as any,
      allowsEditing: true,
      aspect: [1, 1] as [number, number],
      quality: 0.8,
    });

    if (!result.canceled) {
      await uploadAvatar(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri: string) => {
    setUploadingAvatar(true);
    try {
      const uid = session.user?.id;
      const token = session.access_token;
      const fileName = `${uid}/avatar.jpg`;

      const formData = new FormData();
      formData.append("file", {
        uri: uri,
        name: "avatar.jpg",
        type: "image/jpeg",
      } as any);

      const uploadRes = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/avatars/${fileName}`,
        {
          method: "POST",
          headers: {
            apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          body: formData,
        },
      );

      if (!uploadRes.ok) {
        const updateRes = await fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/avatars/${fileName}`,
          {
            method: "PUT",
            headers: {
              apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
            body: formData,
          },
        );

        if (!updateRes.ok) {
          const err = await updateRes.json();
          throw new Error(err.message || "Upload failed");
        }
      }

      const avatarUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${fileName}?t=${Date.now()}`;

      await supabase
        .from("users")
        .update({ avatar_url: avatarUrl })
        .eq("id", uid);

      setAvatar(avatarUrl);
      Alert.alert("Success", "Profile photo updated!");
    } catch (e: any) {
      console.error("Upload error:", e);
      Alert.alert("Upload Failed", e.message || "Network request failed");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveUsername = async () => {
    if (!username.trim()) {
      Alert.alert("Error", "Username cannot be empty");
      return;
    }
    if (username.trim().length < 3) {
      Alert.alert("Error", "Username must be at least 3 characters");
      return;
    }
    if (username.trim() === currentUser?.username) return;

    setSavingUsername(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({ username: username.trim() })
        .eq("id", session.user?.id);

      if (error) {
        if (error.message.includes("unique")) {
          Alert.alert("Error", "Username already taken");
        } else {
          throw error;
        }
        return;
      }

      setCurrentUser((prev: any) => ({
        ...prev,
        username: username.trim(),
      }));
      Alert.alert("Saved", "Username updated!");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSavingUsername(false);
    }
  };

  const saveStatus = async () => {
    if (status.trim() === currentUser?.status) return;

    setSavingStatus(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({ status: status.trim() })
        .eq("id", session.user?.id);

      if (error) throw error;

      setCurrentUser((prev: any) => ({
        ...prev,
        status: status.trim(),
      }));
      Alert.alert("Saved", "Status updated!");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSavingStatus(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          await AsyncStorage.removeItem("userSession");
          router.replace("/signin");
        },
      },
    ]);
  };

  if (!fontsLoaded) return null;

  // Compose lock status label
  const lockStatusLabel = () => {
    if (!isPinSet) return "Not configured";
    const parts: string[] = ["PIN"];
    if (isBiometricEnabled && biometricAvailable) parts.push("Biometric");
    return parts.join(" + ") + " enabled";
  };

  return (
    <View ref={ref} style={s.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* Header */}
      <ImageBackground
        source={require("../../assets/images/bgPattern.png")}
        style={s.header}
        resizeMode="cover"
      >
        <View style={s.headerOverlay} />
        <Animated.View
          style={[
            s.headerContent,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Settings</Text>
          <View style={{ width: 38 }} />
        </Animated.View>

        {!loading && (
          <Animated.View style={[s.headerProfile, { opacity: fadeAnim }]}>
            <TouchableOpacity
              onPress={pickAvatar}
              activeOpacity={0.85}
              disabled={uploadingAvatar}
            >
              {uploadingAvatar ? (
                <View style={s.headerAvatarLoading}>
                  <ActivityIndicator color={Colors.primary} />
                </View>
              ) : avatar ? (
                <Image source={{ uri: avatar }} style={s.headerAvatar} />
              ) : (
                <View style={s.headerAvatarFallback}>
                  <Text style={s.headerAvatarInitial}>
                    {username.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={s.cameraBtn}>
                <Camera size={14} color="#fff" />
              </View>
            </TouchableOpacity>

            <View style={s.headerProfileText}>
              <Text style={s.headerProfileName}>{currentUser?.username}</Text>
              <Text style={s.headerProfileStatus} numberOfLines={1}>
                {currentUser?.status || "Hey, I am using this app!"}
              </Text>
            </View>
          </Animated.View>
        )}
      </ImageBackground>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator
            color={Colors.primary}
            size="large"
            style={{ marginTop: 60 }}
          />
        ) : (
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            {/* Username card */}
            <View style={s.sectionLabel}>
              <User size={13} color={Colors.neutral500} />
              <Text style={s.sectionLabelText}>USERNAME</Text>
            </View>

            <View style={s.card}>
              <View style={s.inputRow}>
                <TextInput
                  style={s.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Enter username"
                  placeholderTextColor={Colors.neutral400}
                  autoCapitalize="none"
                  maxLength={30}
                />
                <TouchableOpacity
                  style={[
                    s.saveBtn,
                    username.trim() === currentUser?.username &&
                      s.saveBtnDisabled,
                  ]}
                  onPress={saveUsername}
                  disabled={
                    savingUsername || username.trim() === currentUser?.username
                  }
                >
                  {savingUsername ? (
                    <ActivityIndicator size={16} color="#fff" />
                  ) : (
                    <Check size={16} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
              <Text style={s.hint}>Your username is visible to all users</Text>
            </View>

            {/* Status card */}
            <View style={s.sectionLabel}>
              <MessageSquare size={13} color={Colors.neutral500} />
              <Text style={s.sectionLabelText}>ABOUT / STATUS</Text>
            </View>

            <View style={s.card}>
              <View style={s.inputRow}>
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  value={status}
                  onChangeText={setStatus}
                  placeholder="Hey, I am using this app!"
                  placeholderTextColor={Colors.neutral400}
                  maxLength={100}
                  multiline
                />
                <TouchableOpacity
                  style={[
                    s.saveBtn,
                    status.trim() === currentUser?.status && s.saveBtnDisabled,
                  ]}
                  onPress={saveStatus}
                  disabled={
                    savingStatus || status.trim() === currentUser?.status
                  }
                >
                  {savingStatus ? (
                    <ActivityIndicator size={16} color="#fff" />
                  ) : (
                    <Check size={16} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
              <Text style={s.hint}>{status.length}/100</Text>
            </View>

            {/* ── App Lock ── */}
            <View style={s.sectionLabel}>
              <ShieldCheck size={13} color={Colors.neutral500} />
              <Text style={s.sectionLabelText}>APP LOCK</Text>
            </View>

            <TouchableOpacity
              style={s.card}
              activeOpacity={0.8}
              onPress={() => setAppLockModalVisible(true)}
            >
              <View style={s.lockRow}>
                {/* Left icon */}
                <View style={s.lockIconWrap}>
                  {isPinSet ? (
                    <ShieldCheck size={22} color={Colors.primary} />
                  ) : (
                    <Lock size={22} color={Colors.neutral400} />
                  )}
                </View>

                <View style={s.lockTextCol}>
                  <Text style={s.lockTitle}>
                    {isPinSet ? "App Lock Active" : "Set App Lock"}
                  </Text>
                  <Text style={s.lockSub}>{lockStatusLabel()}</Text>
                </View>

                <View style={s.lockRight}>
                  {isPinSet && (
                    <View style={s.lockBadge}>
                      <Text style={s.lockBadgeText}>PIN</Text>
                    </View>
                  )}
                  {isBiometricEnabled && biometricAvailable && (
                    <View style={[s.lockBadge, s.lockBadgeGreen]}>
                      <Fingerprint size={11} color="#16a34a" />
                    </View>
                  )}
                  <ChevronRight size={16} color={Colors.neutral300} />
                </View>
              </View>
            </TouchableOpacity>

            <View style={s.sectionLabel}>
              <Lock size={13} color={Colors.neutral500} />
              <Text style={s.sectionLabelText}>ACCOUNT</Text>
            </View>

            <View style={s.card}>
              <View style={s.infoRow}>
                <View style={s.infoLeft}>
                  <Mail size={15} color={Colors.neutral400} />
                  <Text style={s.infoLabel}>Email</Text>
                </View>
                <Text style={s.infoValue} numberOfLines={1}>
                  {currentUser?.email}
                </Text>
              </View>

              <View style={s.divider} />

              <View style={s.infoRow}>
                <View style={s.infoLeft}>
                  <Calendar size={15} color={Colors.neutral400} />
                  <Text style={s.infoLabel}>Member since</Text>
                </View>
                <Text style={s.infoValue}>
                  {currentUser?.created_at
                    ? new Date(currentUser.created_at).toLocaleDateString(
                        "en-US",
                        { day: "numeric", month: "short", year: "numeric" },
                      )
                    : "—"}
                </Text>
              </View>
            </View>

            <View style={s.sectionLabel}>
              <Text style={[s.sectionLabelText, { color: Colors.red }]}>
                DANGER ZONE
              </Text>
            </View>

            <TouchableOpacity
              style={s.logoutBtn}
              onPress={handleLogout}
              activeOpacity={0.85}
            >
              <LogOut size={18} color={Colors.red} />
              <Text style={s.logoutText}>Logout</Text>
            </TouchableOpacity>

            <Text style={s.version}>
              ChatApp v1.0.0 • End-to-end encrypted <LockIcon />
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      <AppLockModal
        visible={appLockModalVisible}
        onClose={handleLockModalClose}
        intent="setup"
      />
    </View>
  );
});

SettingsScreen.displayName = "SettingsScreen";
export default SettingsScreen;

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral100,
  },

  // Header
  header: {
    paddingTop: 55,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 20,
    color: "#fff",
  },

  headerProfile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  headerAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  headerAvatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.neutral700,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  headerAvatarLoading: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.neutral700,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarInitial: {
    fontFamily: "Outfit_700Bold",
    fontSize: 26,
    color: "#fff",
  },
  cameraBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  headerProfileText: { flex: 1 },
  headerProfileName: {
    fontFamily: "Outfit_700Bold",
    fontSize: 18,
    color: "#fff",
    marginBottom: 2,
  },
  headerProfileStatus: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
  },

  scroll: { flex: 1 },
  scrollContent: { paddingTop: 20, paddingBottom: 48 },

  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    marginBottom: 8,
    marginTop: 4,
  },
  sectionLabelText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 11,
    color: Colors.neutral500,
    letterSpacing: 0.8,
  },

  card: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.neutral100,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  saveBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  saveBtnDisabled: {
    backgroundColor: Colors.neutral300,
    elevation: 0,
    shadowOpacity: 0,
  },
  hint: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    color: Colors.neutral400,
    marginTop: 8,
  },

  lockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  lockIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.neutral100,
    alignItems: "center",
    justifyContent: "center",
  },
  lockTextCol: { flex: 1 },
  lockTitle: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  lockSub: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.neutral400,
    marginTop: 2,
  },
  lockRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  lockBadge: {
    backgroundColor: "#EEF2FF",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  lockBadgeText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 10,
    color: "#4F46E5",
  },
  lockBadgeGreen: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
  },

  // Info rows
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  infoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoLabel: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: Colors.neutral500,
  },
  infoValue: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.text,
    maxWidth: width * 0.5,
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.neutral100,
  },

  // Logout
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.red,
    elevation: 1,
    shadowColor: Colors.red,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logoutText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 15,
    color: Colors.red,
  },

  version: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    color: Colors.neutral400,
    textAlign: "center",
    marginTop: 8,
  },
});
