// ─── components/HomeHeader.tsx ────────────────────────────────────────────────

import { Animated, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Search, Settings, UserPlus, X } from "lucide-react-native";
import Colors from "../constants/colors";

interface Props {
  username:      string | undefined;
  fadeAnim:      Animated.Value;
  slideAnim:     Animated.Value;
  onSearchPress: () => void;
  searchActive:  boolean;
}

export const HomeHeader = ({
  username,
  fadeAnim,
  slideAnim,
  onSearchPress,
  searchActive,
}: Props) => (
  <ImageBackground
    source={require("../../../assets/images/bgPattern.png")}
    style={styles.header}
    resizeMode="cover"
  >
    <View style={styles.overlay} />
    <View style={styles.content}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <Text style={styles.greetingSmall}>Welcome back 👋</Text>
        <Text style={styles.greeting}>{username ?? "there"}</Text>
      </Animated.View>

      <View style={styles.icons}>
        {/* Search toggle */}
        <TouchableOpacity style={styles.iconBtn} onPress={onSearchPress}>
          {searchActive
            ? <X size={22} color={Colors.white} />
            : <Search size={22} color={Colors.white} />
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/add-friends")}>
          <UserPlus size={22} color={Colors.white} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/setting")}>
          <Settings size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  </ImageBackground>
);

const styles = StyleSheet.create({
  header: {
    paddingTop: 60,
    paddingBottom: 44,
    paddingHorizontal: 24,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greetingSmall: {
    fontFamily: "Outfit_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 2,
  },
  greeting: {
    fontFamily: "Outfit_700Bold",
    fontSize: 26,
    color: Colors.white,
  },
  icons: {
    flexDirection: "row",
    gap: 10,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
});