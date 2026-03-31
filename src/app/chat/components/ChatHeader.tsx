import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { ArrowLeft, Video, Phone, MoreVertical } from "lucide-react-native";
import { router } from "expo-router";
import { ChatTheme } from "../../../lib/themes";
import { isOnline, formatLastSeen } from "../utils/messageHelpers";

const { width } = Dimensions.get("window");

interface Props {
  username: string;
  avatar_url: string;
  friendLastSeen: string | null;
  theme: ChatTheme;
  headerBgColor: string;
  onDotsPress: () => void;
}

export default function ChatHeader({
  username, avatar_url, friendLastSeen,
  theme, headerBgColor, onDotsPress,
}: Props) {
  const online = isOnline(friendLastSeen);

  return (
    <View style={[s.header, { backgroundColor: headerBgColor }]}>
      <View style={s.headerLeft}>
        <TouchableOpacity onPress={() => router.back()} style={s.circleBtn}>
          <ArrowLeft size={22} color={theme.headerIconColor} />
        </TouchableOpacity>
        <TouchableOpacity style={s.headerProfile} activeOpacity={0.8}>
          <View style={s.headerAvatarWrapper}>
            <Image
              source={{
                uri: avatar_url ||
                  `https://ui-avatars.com/api/?name=${username}&background=FFD700&color=000`,
              }}
              style={[s.headerAvatar, { borderColor: theme.sendBtnBg }]}
            />
            <View style={[s.headerOnlineDot, { backgroundColor: online ? "#22C55E" : "#aaa" }]} />
          </View>
          <View>
            <Text style={[s.headerName, { color: theme.headerText }]} numberOfLines={1}>
              {username}
            </Text>
            <Text style={[s.headerStatus, { color: online ? theme.headerStatusColor : theme.theirMetaColor }]}>
              {online ? "online" : formatLastSeen(friendLastSeen)}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
      <View style={s.headerRight}>
        <TouchableOpacity style={s.circleBtn}>
          <Video size={20} color={theme.headerIconColor} />
        </TouchableOpacity>
        <TouchableOpacity style={s.circleBtn}>
          <Phone size={19} color={theme.headerIconColor} />
        </TouchableOpacity>
        <TouchableOpacity style={s.circleBtn} onPress={onDotsPress}>
          <MoreVertical size={20} color={theme.headerIconColor} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: 52, paddingBottom: 12, paddingHorizontal: 12,
    elevation: 4, shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, zIndex: 100,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 6 },
  headerProfile: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  headerAvatarWrapper: { position: "relative" },
  headerAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#f0f0f0", borderWidth: 2 },
  headerOnlineDot: { position: "absolute", bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: "#fff" },
  headerName: { fontFamily: "Outfit_700Bold", fontSize: 16, maxWidth: width * 0.38 },
  headerStatus: { fontFamily: "Outfit_400Regular", fontSize: 11, marginTop: 1 },
  headerRight: { flexDirection: "row", alignItems: "center" },
  circleBtn: { padding: 8, borderRadius: 20 },
});