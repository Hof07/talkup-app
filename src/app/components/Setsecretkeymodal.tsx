// ─── components/SetSecretKeyModal.tsx ────────────────────────────────────────
//
// Shown when the user tries to hide a chat but has no secret key yet.
// Also reachable from Settings to change the key.

import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Lock } from "lucide-react-native";
import Colors from "../constants/colors";
import { setSecretKey } from "../home_compo/Hiddenchats";
// import { setSecretKey } from "../hiddenChats";

interface Props {
  visible:   boolean;
  onSaved:   () => void;
  onCancel:  () => void;
}

export const SetSecretKeyModal = ({ visible, onSaved, onCancel }: Props) => {
  const [key,     setKey]     = useState("");
  const [confirm, setConfirm] = useState("");
  const [error,   setError]   = useState("");

  const scaleAnim   = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setKey(""); setConfirm(""); setError("");
      Animated.parallel([
        Animated.spring(scaleAnim,   { toValue: 1, useNativeDriver: true, tension: 120, friction: 8 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 180,         useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim,   { toValue: 0.88, duration: 150, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0,    duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleSave = async () => {
    if (key.trim().length < 3) {
      setError("Key must be at least 3 characters.");
      return;
    }
    if (key !== confirm) {
      setError("Keys don't match. Try again.");
      return;
    }
    await setSecretKey(key.trim());
    onSaved();
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]} />
      </TouchableWithoutFeedback>

      <View style={styles.center}>
        <Animated.View
          style={[styles.card, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}
        >
          {/* Icon */}
          <View style={styles.iconWrap}>
            <Lock size={28} color={Colors.primary} />
          </View>

          <Text style={styles.title}>Set secret key</Text>
          <Text style={styles.subtitle}>
            Type this key in the search bar anytime to reveal hidden chats. Don't forget it!
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Secret key"
            placeholderTextColor={Colors.neutral400}
            value={key}
            onChangeText={(t) => { setKey(t); setError(""); }}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={false}
          />
          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            placeholder="Confirm secret key"
            placeholderTextColor={Colors.neutral400}
            value={confirm}
            onChangeText={(t) => { setConfirm(t); setError(""); }}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={false}
          />

          {error.length > 0 && (
            <Text style={styles.error}>{error}</Text>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.7}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "box-none",
  },
  card: {
    width: "85%",
    backgroundColor: Colors.background,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.neutral100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: 18,
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: Colors.neutral500,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
  },
  input: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.neutral100,
    paddingHorizontal: 16,
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: Colors.neutral200,
  },
  error: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: "#C62828",
    marginTop: 8,
    alignSelf: "flex-start",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 22,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.neutral200,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 15,
    color: Colors.neutral600,
  },
  saveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 15,
    color: Colors.black,
  },
});