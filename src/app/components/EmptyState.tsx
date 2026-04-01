// ─── components/EmptyState.tsx ───────────────────────────────────────────────

import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { MessageCircle, SearchX, UserPlus } from "lucide-react-native";
import Colors from "../constants/colors";

interface Props {
  searching?: boolean;  // true when user typed a query but got no results
}

export const EmptyState = ({ searching = false }: Props) => {
  if (searching) {
    return (
      <View style={styles.container}>
        <SearchX size={56} color={Colors.neutral300} />
        <Text style={styles.title}>No results</Text>
        <Text style={styles.subtitle}>No friends match your search</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MessageCircle size={56} color={Colors.neutral300} />
      <Text style={styles.title}>No chats yet</Text>
      <Text style={styles.subtitle}>Add friends to start chatting</Text>
      <TouchableOpacity style={styles.btn} onPress={() => router.push("/add-friends")}>
        <UserPlus size={16} color={Colors.black} />
        <Text style={styles.btnText}>Add Friends</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  title: {
    fontFamily: "Outfit_700Bold",
    fontSize: 20,
    color: Colors.text,
    marginTop: 8,
  },
  subtitle: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: Colors.neutral400,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 50,
    marginTop: 8,
  },
  btnText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 14,
    color: Colors.black,
  },
});