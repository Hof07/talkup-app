import { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  Alert,
  Vibration,
} from "react-native";
import { Fingerprint, X, Delete, ShieldCheck, Eye, EyeOff } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import Colors from "./constants/colors";

type Mode = "menu" | "set_pin" | "confirm_pin" | "enter_pin";

interface Props {
  visible: boolean;
  onClose: () => void;
  /** "setup" = first time configuring, "verify" = unlocking the app */
  intent: "setup" | "verify";
  onVerified?: () => void;
}

const PIN_KEY = "app_lock_pin";
const BIOMETRIC_KEY = "app_lock_biometric";

const KEYPAD = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "⌫"],
];

export default function AppLockModal({ visible, onClose, intent, onVerified }: Props) {
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dotScale = [
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
  ];

  const [mode, setMode] = useState<Mode>(intent === "verify" ? "enter_pin" : "menu");
  const [pin, setPin] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [existingPin, setExistingPin] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 260, useNativeDriver: true,
      }).start();
      checkBiometric();
      loadSettings();
      setPin("");
      if (intent === "verify") {
        setMode("enter_pin");
      } else {
        setMode("menu");
      }
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible, intent]);

  useEffect(() => {
    switch (mode) {
      case "menu":
        setTitle("App Lock"); setSubtitle("Choose how to secure your app"); break;
      case "set_pin":
        setTitle("Set PIN"); setSubtitle("Enter a 4-digit PIN"); break;
      case "confirm_pin":
        setTitle("Confirm PIN"); setSubtitle("Enter your PIN again"); break;
      case "enter_pin":
        setTitle("Enter PIN"); setSubtitle("Enter your PIN to continue"); break;
    }
  }, [mode]);

  useEffect(() => {
    if (pin.length > 0) {
      Animated.sequence([
        Animated.timing(dotScale[pin.length - 1], {
          toValue: 1.4, duration: 80, useNativeDriver: true,
        }),
        Animated.timing(dotScale[pin.length - 1], {
          toValue: 1, duration: 80, useNativeDriver: true,
        }),
      ]).start();
    }
  }, [pin]);

  const checkBiometric = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setBiometricAvailable(compatible && enrolled);
  };

  const loadSettings = async () => {
    const savedPin = await AsyncStorage.getItem(PIN_KEY);
    const savedBio = await AsyncStorage.getItem(BIOMETRIC_KEY);
    setExistingPin(savedPin);
    setBiometricEnabled(savedBio === "true");
  };

  const shake = () => {
    Vibration.vibrate(400);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleKey = (key: string) => {
    if (key === "⌫") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (key === "" || pin.length >= 4) return;
    const newPin = pin + key;
    setPin(newPin);

    if (newPin.length === 4) {
      setTimeout(() => handlePinComplete(newPin), 120);
    }
  };

  const handlePinComplete = async (entered: string) => {
    if (mode === "set_pin") {
      setFirstPin(entered);
      setPin("");
      setMode("confirm_pin");
      return;
    }

    if (mode === "confirm_pin") {
      if (entered !== firstPin) {
        shake();
        setPin("");
        Alert.alert("Mismatch", "PINs do not match. Try again.");
        setMode("set_pin");
        setFirstPin("");
        return;
      }
      await AsyncStorage.setItem(PIN_KEY, entered);
      setExistingPin(entered);
      setPin("");
      Alert.alert("✓ PIN Set", "Your app lock PIN has been saved.");
      onClose();
      return;
    }

    if (mode === "enter_pin") {
      const savedPin = await AsyncStorage.getItem(PIN_KEY);
      if (entered === savedPin) {
        setPin("");
        onVerified?.();
        onClose();
      } else {
        shake();
        setPin("");
      }
      return;
    }
  };

  const handleBiometric = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Authenticate to toggle biometric lock",
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
    });
    if (result.success) {
      const next = !biometricEnabled;
      setBiometricEnabled(next);
      await AsyncStorage.setItem(BIOMETRIC_KEY, next ? "true" : "false");
      Alert.alert(next ? "Biometric Enabled" : "Biometric Disabled",
        next ? "You can now use Face/Fingerprint to unlock." : "Biometric lock turned off.");
    }
  };

  const handleRemovePin = () => {
    Alert.alert("Remove PIN", "This will disable your app lock PIN.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem(PIN_KEY);
          await AsyncStorage.removeItem(BIOMETRIC_KEY);
          setExistingPin(null);
          setBiometricEnabled(false);
          Alert.alert("Removed", "App lock disabled.");
          onClose();
        },
      },
    ]);
  };

  const renderDots = () => (
    <View style={s.dotsRow}>
      {[0, 1, 2, 3].map((i) => (
        <Animated.View
          key={i}
          style={[
            s.dot,
            i < pin.length && s.dotFilled,
            { transform: [{ scale: dotScale[i] }] },
          ]}
        />
      ))}
    </View>
  );

  const renderKeypad = () => (
    <View style={s.keypad}>
      {KEYPAD.map((row, ri) => (
        <View key={ri} style={s.keyRow}>
          {row.map((key, ki) => (
            <TouchableOpacity
              key={ki}
              style={[s.key, key === "" && s.keyHidden]}
              onPress={() => handleKey(key)}
              activeOpacity={key === "" ? 1 : 0.6}
              disabled={key === ""}
            >
              {key === "⌫" ? (
                <Delete size={20} color={Colors.text} />
              ) : (
                <Text style={s.keyText}>{key}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );

  const renderMenu = () => (
    <View style={s.menuList}>
      {/* Set / Change PIN */}
      <TouchableOpacity
        style={s.menuItem}
        activeOpacity={0.75}
        onPress={() => { setPin(""); setMode("set_pin"); }}
      >
        <View style={[s.menuIcon, { backgroundColor: "#EEF2FF" }]}>
          <ShieldCheck size={20} color="#4F46E5" />
        </View>
        <View style={s.menuText}>
          <Text style={s.menuTitle}>{existingPin ? "Change PIN" : "Set PIN"}</Text>
          <Text style={s.menuSub}>{existingPin ? "Update your 4-digit PIN" : "Create a 4-digit PIN"}</Text>
        </View>
        {existingPin && (
          <View style={s.activePill}>
            <Text style={s.activePillText}>ON</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Biometric */}
      {biometricAvailable && (
        <TouchableOpacity
          style={s.menuItem}
          activeOpacity={0.75}
          onPress={handleBiometric}
        >
          <View style={[s.menuIcon, { backgroundColor: "#F0FDF4" }]}>
            <Fingerprint size={20} color="#16a34a" />
          </View>
          <View style={s.menuText}>
            <Text style={s.menuTitle}>Face / Fingerprint</Text>
            <Text style={s.menuSub}>Use biometric to unlock</Text>
          </View>
          <View style={[s.toggle, biometricEnabled && s.toggleOn]}>
            <View style={[s.toggleThumb, biometricEnabled && s.toggleThumbOn]} />
          </View>
        </TouchableOpacity>
      )}

      {/* Remove PIN */}
      {existingPin && (
        <TouchableOpacity
          style={s.menuItem}
          activeOpacity={0.75}
          onPress={handleRemovePin}
        >
          <View style={[s.menuIcon, { backgroundColor: "#FFF0F0" }]}>
            <EyeOff size={20} color="#ef4444" />
          </View>
          <View style={s.menuText}>
            <Text style={[s.menuTitle, { color: "#ef4444" }]}>Remove Lock</Text>
            <Text style={s.menuSub}>Disable app lock entirely</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Animated.View style={[s.overlay, { opacity: fadeAnim }]}>
        <View style={s.sheet}>
          {/* Handle */}
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <View>
              <Text style={s.title}>{title}</Text>
              <Text style={s.subtitle}>{subtitle}</Text>
            </View>
            {mode !== "enter_pin" && (
              <TouchableOpacity style={s.closeBtn} onPress={onClose}>
                <X size={18} color={Colors.neutral500} />
              </TouchableOpacity>
            )}
          </View>

          {mode === "menu" ? (
            renderMenu()
          ) : (
            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              {renderDots()}
              {renderKeypad()}
            </Animated.View>
          )}

          {mode !== "menu" && mode !== "enter_pin" && (
            <TouchableOpacity style={s.backLink} onPress={() => { setPin(""); setFirstPin(""); setMode("menu"); }}>
              <Text style={s.backLinkText}>← Back</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  handle: {
    width: 40, height: 4,
    backgroundColor: Colors.neutral200,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 20,
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: 22,
    color: Colors.text,
  },
  subtitle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.neutral400,
    marginTop: 2,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.neutral100,
    alignItems: "center", justifyContent: "center",
  },

  // Menu
  menuList: { gap: 4, paddingBottom: 8 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 14,
  },
  menuIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },
  menuText: { flex: 1 },
  menuTitle: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 15, color: Colors.text,
  },
  menuSub: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12, color: Colors.neutral400, marginTop: 2,
  },
  activePill: {
    backgroundColor: "#EEF2FF",
    borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  activePillText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 11, color: "#4F46E5",
  },

  // Toggle
  toggle: {
    width: 44, height: 26, borderRadius: 13,
    backgroundColor: Colors.neutral200,
    justifyContent: "center", paddingHorizontal: 3,
  },
  toggleOn: { backgroundColor: "#16a34a" },
  toggleThumb: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.white,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2, shadowRadius: 2,
  },
  toggleThumbOn: { alignSelf: "flex-end" },

  // PIN dots
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginVertical: 28,
  },
  dot: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: Colors.neutral300,
    backgroundColor: "transparent",
  },
  dotFilled: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  // Keypad
  keypad: { gap: 6 },
  keyRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  key: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: Colors.neutral100,
    alignItems: "center", justifyContent: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2,
  },
  keyHidden: {
    backgroundColor: "transparent",
    elevation: 0, shadowOpacity: 0,
  },
  keyText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 22, color: Colors.text,
  },

  backLink: { alignSelf: "center", marginTop: 20 },
  backLinkText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14, color: Colors.neutral400,
  },
});
