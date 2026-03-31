import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
  AppState,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import { Delete, Fingerprint, Send, ShieldCheck } from "lucide-react-native";
import Colors from "./constants/colors";

const PIN_KEY = "app_lock_pin";
const BIOMETRIC_KEY = "app_lock_biometric";

const KEYPAD = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "⌫"],
];

export default function AppLockGate({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [pin, setPin] = useState("");
  const [biometricAvail, setBiometricAvail] = useState(false);
  const [error, setError] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dotScale = [
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
  ];

  const appState = useRef(AppState.currentState);

  useEffect(() => {
    checkLock();

    const sub = AppState.addEventListener("change", (next) => {
      // Re-lock when app comes back from background
      if (
        appState.current.match(/inactive|background/) &&
        next === "active"
      ) {
        checkLock();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, []);

  const checkLock = async () => {
    const savedPin = await AsyncStorage.getItem(PIN_KEY);
    const biometricOn = await AsyncStorage.getItem(BIOMETRIC_KEY);
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();

    const hasBio = biometricOn === "true" && compatible && enrolled;
    setBiometricAvail(hasBio);

    if (!savedPin) {
      setLocked(false);
      setChecking(false);
      return;
    }

    setLocked(true);
    setChecking(false);

    Animated.timing(fadeAnim, {
      toValue: 1, duration: 300, useNativeDriver: true,
    }).start();

    if (hasBio) {
      triggerBiometric();
    }
  };

  const triggerBiometric = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Unlock to continue",
      cancelLabel: "Use PIN",
      disableDeviceFallback: false,
    });
    if (result.success) unlock();
  };

  const unlock = () => {
    Animated.timing(fadeAnim, {
      toValue: 0, duration: 200, useNativeDriver: true,
    }).start(() => {
      setLocked(false);
      setPin("");
    });
  };

  const shake = () => {
    setError(true);
    Vibration.vibrate(400);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start(() => setTimeout(() => setError(false), 800));
  };

  useEffect(() => {
    if (pin.length > 0) {
      Animated.sequence([
        Animated.timing(dotScale[pin.length - 1], {
          toValue: 1.5, duration: 70, useNativeDriver: true,
        }),
        Animated.timing(dotScale[pin.length - 1], {
          toValue: 1, duration: 70, useNativeDriver: true,
        }),
      ]).start();
    }
  }, [pin]);

  const handleKey = (key: string) => {
    if (key === "⌫") { setPin((p) => p.slice(0, -1)); return; }
    if (key === "" || pin.length >= 4) return;
    const next = pin + key;
    setPin(next);
    if (next.length === 4) setTimeout(() => verifyPin(next), 120);
  };

  const verifyPin = async (entered: string) => {
    const saved = await AsyncStorage.getItem(PIN_KEY);
    if (entered === saved) {
      unlock();
    } else {
      shake();
      setPin("");
    }
  };

  if (checking) {
    return (
      <View style={s.checkingWrap}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (!locked) return <>{children}</>;

  return (
    <>
      {children}
      <Animated.View style={[s.gate, { opacity: fadeAnim }]}>
        {/* Logo / icon */}
        <View style={s.iconWrap}>
          <Send size={44} style={{position: 'relative',right: 2}} color={Colors.primary} />
        </View>

        <Text style={s.appName}>TalkUp</Text>
        <Text style={s.prompt}>Enter your PIN to continue</Text>

        {/* Dots */}
        <Animated.View
          style={[s.dotsRow, { transform: [{ translateX: shakeAnim }] }]}
        >
          {[0, 1, 2, 3].map((i) => (
            <Animated.View
              key={i}
              style={[
                s.dot,
                i < pin.length && (error ? s.dotError : s.dotFilled),
                { transform: [{ scale: dotScale[i] }] },
              ]}
            />
          ))}
        </Animated.View>

        {error && <Text style={s.errorText}>Incorrect PIN</Text>}

        {/* Keypad */}
        <View style={s.keypad}>
          {KEYPAD.map((row, ri) => (
            <View key={ri} style={s.keyRow}>
              {row.map((key, ki) => (
                <TouchableOpacity
                  key={ki}
                  style={[s.key, key === "" && s.keyHidden]}
                  onPress={() => handleKey(key)}
                  activeOpacity={key === "" ? 1 : 0.55}
                  disabled={key === ""}
                >
                  {key === "⌫" ? (
                    <Delete size={22} color={Colors.text} />
                  ) : (
                    <Text style={s.keyText}>{key}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        {/* Biometric button */}
        {biometricAvail && (
          <TouchableOpacity style={s.bioBtn} onPress={triggerBiometric} activeOpacity={0.7}>
            <Fingerprint size={22} color={Colors.primary} />
            <Text style={s.bioBtnText}>Use Biometric</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </>
  );
}

const s = StyleSheet.create({
  checkingWrap: {
    flex: 1, alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.white,
  },
  gate: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    zIndex: 9999,
  },
  iconWrap: {
    position: "relative",
    
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.neutral100,
    alignItems: "center", justifyContent: "center",
    marginBottom: 16,
  },
  appName: {
    fontFamily: "Outfit_700Bold",
    fontSize: 28, color: Colors.text, marginBottom: 6,
  },
  prompt: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14, color: Colors.neutral400, marginBottom: 36,
  },
  dotsRow: {
    flexDirection: "row", gap: 20, marginBottom: 8,
  },
  dot: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.neutral300,
    backgroundColor: "transparent",
  },
  dotFilled: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dotError: {
    backgroundColor: Colors.red,
    borderColor: Colors.red,
  },
  errorText: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13, color: Colors.red, marginBottom: 16,
  },
  keypad: { gap: 10, marginTop: 24, marginBottom: 20 },
  keyRow: { flexDirection: "row", gap: 20 },
  key: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.neutral100,
    alignItems: "center", justifyContent: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 2,
  },
  keyHidden: {
    backgroundColor: "transparent", elevation: 0, shadowOpacity: 0,
  },
  keyText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 24, color: Colors.text,
  },
  bioBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: 14, borderWidth: 1.5,
    borderColor: Colors.primary,
    marginTop: 4,
  },
  bioBtnText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14, color: Colors.primary,
  },
});
