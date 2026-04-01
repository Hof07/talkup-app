// ─── components/DeleteModal.tsx ───────────────────────────────────────────────

import { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { UserX } from "lucide-react-native";
import Colors from "../constants/colors";

interface Props {
  visible:   boolean;
  username:  string;
  onConfirm: () => void;
  onCancel:  () => void;
}

export const DeleteModal = ({ visible, username, onConfirm, onCancel }: Props) => {
  const scaleAnim   = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim,   { toValue: 1,    useNativeDriver: true, tension: 120, friction: 8 }),
        Animated.timing(opacityAnim, { toValue: 1,    duration: 180,         useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim,   { toValue: 0.85, duration: 150, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0,    duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onCancel}>
      {/* Dimmed backdrop */}
      <TouchableWithoutFeedback onPress={onCancel}>
        <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]} />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <View style={styles.center}>
        <Animated.View
          style={[
            styles.sheet,
            { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* Icon */}
          <View style={styles.iconWrap}>
            <UserX size={28} color={Colors.danger ?? "#E53935"} />
          </View>

          {/* Text */}
          <Text style={styles.title}>Remove friend?</Text>
          <Text style={styles.subtitle}>
            <Text style={styles.bold}>{username}</Text>
            {" "}will be removed from your friends and all messages will be deleted.
          </Text>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={onConfirm} activeOpacity={0.7}>
              <Text style={styles.deleteText}>Remove</Text>
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
  sheet: {
    width: "82%",
    backgroundColor: Colors.background,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFEBEE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: 18,
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: Colors.neutral500,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  bold: {
    fontFamily: "Outfit_600SemiBold",
    color: Colors.text,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
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
  deleteBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.danger ?? "#E53935",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 15,
    color: Colors.white,
  },
});