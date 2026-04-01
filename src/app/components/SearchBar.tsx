// ─── components/SearchBar.tsx ─────────────────────────────────────────────────
//
// Dual-mode search bar:
//  • Normal mode  — filters visible friends by username
//  • Secret mode  — when query exactly matches the saved secret key,
//                   hidden chats are revealed in the list
//
// The caller decides what to show; this component just emits the query string.

import { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Text,
} from "react-native";
import { Lock, Search, X } from "lucide-react-native";
import Colors from "../constants/colors";

interface Props {
  value:          string;
  onChange:       (text: string) => void;
  onClear:        () => void;
  secretUnlocked: boolean;   // true = user typed the correct key
}

export const SearchBar = ({ value, onChange, onClear, secretUnlocked }: Props) => {
  const slideAnim = useRef(new Animated.Value(-16)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const inputRef  = useRef<TextInput>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start(() => inputRef.current?.focus());
  }, []);

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View
        style={[
          styles.inputRow,
          secretUnlocked && styles.inputRowUnlocked,
        ]}
      >
        {/* Icon — lock when unlocked, magnifier otherwise */}
        {secretUnlocked ? (
          <Lock size={18} color={Colors.primary} />
        ) : (
          <Search size={18} color={Colors.neutral400} />
        )}

        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={secretUnlocked ? "Hidden chats unlocked…" : "Search Your Friends.."}
          placeholderTextColor={secretUnlocked ? Colors.primary : Colors.neutral400}
          value={value}
          onChangeText={onChange}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={false}
        />

        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChange("")} style={styles.clearBtn}>
            <X size={16} color={Colors.neutral400} />
          </TouchableOpacity>
        )}
      </View>

      {/* Hint text */}
      {!secretUnlocked && value.length === 0 && (
        <Text style={styles.hint}>
          Type your secret key to reveal hidden chats
        </Text>
      )}
      {secretUnlocked && (
        <Text style={[styles.hint, styles.hintUnlocked]}>
          🔓 Hidden chats visible — close search to lock
        </Text>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 24,
    paddingBottom: 8,
    gap: 6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutral100,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    gap: 8,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  inputRowUnlocked: {
    borderColor: Colors.primary,
    backgroundColor: Colors.neutral100,
  },
  input: {
    flex: 1,
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    color: Colors.text,
  },
  clearBtn: {
    padding: 4,
  },
  hint: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    color: Colors.neutral400,
    paddingHorizontal: 4,
  },
  hintUnlocked: {
    color: Colors.primary,
  },
});