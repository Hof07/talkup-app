import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  FlatList,
} from "react-native";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react-native";
import { ChatTheme } from "../../../lib/themes";
import { Message } from "../utils/types";

interface Props {
  visible: boolean;
  messages: Message[];
  theme: ChatTheme;
  onClose: () => void;
  onJumpToMessage: (messageId: string) => void;
}

export default function SearchInChat({
  visible,
  messages,
  theme,
  onClose,
  onJumpToMessage,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Message[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const slideAnim = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : -60,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setCurrentIndex(0);
      return;
    }
    const q = query.toLowerCase();
    const found = messages.filter(
      (m) =>
        m.content &&
        !m.deleted_for_everyone &&
        m.message_type !== "image" &&
        m.message_type !== "image_group" &&
        m.message_type !== "sticker" &&
        m.content.toLowerCase().includes(q)
    );
    setResults(found);
    setCurrentIndex(0);
    if (found.length > 0) {
      onJumpToMessage(found[0].id);
    }
  }, [query]);

  const goNext = () => {
    if (results.length === 0) return;
    const next = (currentIndex + 1) % results.length;
    setCurrentIndex(next);
    onJumpToMessage(results[next].id);
  };

  const goPrev = () => {
    if (results.length === 0) return;
    const prev = (currentIndex - 1 + results.length) % results.length;
    setCurrentIndex(prev);
    onJumpToMessage(results[prev].id);
  };

  const handleClose = () => {
    setQuery("");
    setResults([]);
    setCurrentIndex(0);
    onClose();
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        s.container,
        {
          backgroundColor: theme.headerBg,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={s.searchRow}>
        <TouchableOpacity onPress={handleClose} style={s.closeBtn}>
          <X size={20} color={theme.headerText || "#fff"} />
        </TouchableOpacity>

        <View style={[s.inputBox, { backgroundColor: `${theme.inputBoxBg || "#fff"}30` }]}>
          <Search size={16} color={theme.headerText || "#fff"} />
          <TextInput
            style={[s.input, { color: theme.headerText || "#fff" }]}
            placeholder="Search messages..."
            placeholderTextColor={`${theme.headerText || "#fff"}80`}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <X size={14} color={theme.headerText || "#fff"} />
            </TouchableOpacity>
          )}
        </View>

        {results.length > 0 && (
          <View style={s.navBtns}>
            <Text style={[s.countText, { color: theme.headerText || "#fff" }]}>
              {currentIndex + 1}/{results.length}
            </Text>
            <TouchableOpacity onPress={goPrev} style={s.navBtn}>
              <ChevronUp size={18} color={theme.headerText || "#fff"} />
            </TouchableOpacity>
            <TouchableOpacity onPress={goNext} style={s.navBtn}>
              <ChevronDown size={18} color={theme.headerText || "#fff"} />
            </TouchableOpacity>
          </View>
        )}

        {query.length > 0 && results.length === 0 && (
          <Text style={[s.noResults, { color: `${theme.headerText || "#fff"}80` }]}>
            No results
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    paddingTop: 50,
    paddingBottom: 10,
    paddingHorizontal: 12,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  inputBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    fontFamily: "Outfit_400Regular",
    fontSize: 15,
    padding: 0,
  },
  navBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  navBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 11,
    marginRight: 2,
  },
  noResults: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
  },
});
