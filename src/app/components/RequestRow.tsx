// ─── components/RequestRow.tsx ────────────────────────────────────────────────

import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Colors from "../constants/colors";
import { FriendRequest } from "../home_compo/types";
// import { FriendRequest } from "../types";

interface Props {
  item:     FriendRequest;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}

export const RequestRow = ({ item, onAccept, onReject }: Props) => (
  <View style={styles.row}>
    {/* Avatar */}
    {item.sender?.avatar_url ? (
      <Image source={{ uri: item.sender.avatar_url }} style={styles.avatar} />
    ) : (
      <View style={styles.avatarPlaceholder}>
        <Text style={styles.avatarInitial}>
          {item.sender?.username?.charAt(0).toUpperCase()}
        </Text>
      </View>
    )}

    {/* Info */}
    <View style={styles.info}>
      <Text style={styles.username}>{item.sender?.username}</Text>
      <Text style={styles.label}>wants to be your friend</Text>
    </View>

    {/* Actions */}
    <View style={styles.actions}>
      <TouchableOpacity style={styles.acceptBtn} onPress={() => onAccept(item.id)}>
        <Text style={styles.acceptBtnText}>✓</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.rejectBtn} onPress={() => onReject(item.id)}>
        <Text style={styles.rejectBtnText}>✕</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 12,
  },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  avatarPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.neutral200,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontFamily: "Outfit_700Bold",
    fontSize: 18,
    color: Colors.neutral600,
  },
  info: { flex: 1 },
  username: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 15,
    color: Colors.text,
  },
  label: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: Colors.neutral400,
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  acceptBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptBtnText: {
    fontSize: 16,
    color: Colors.black,
    fontWeight: "bold",
  },
  rejectBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.neutral200,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectBtnText: {
    fontSize: 14,
    color: Colors.neutral500,
  },
});