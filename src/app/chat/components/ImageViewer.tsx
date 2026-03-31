import {
  Modal,
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Text,
} from "react-native";
import { X, Download } from "lucide-react-native";
import { useState } from "react";

const { width, height } = Dimensions.get("window");

interface Props {
  visible: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

export default function ImageViewer({ visible, imageUrl, onClose }: Props) {
  const [error, setError] = useState(false);

  if (!imageUrl) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={s.container}>

        {/* Close button */}
        <TouchableOpacity style={s.closeBtn} onPress={onClose}>
          <X size={24} color="#fff" />
        </TouchableOpacity>

        {/* Image */}
        {error ? (
          <View style={s.errorBox}>
            <Text style={s.errorText}>Failed to load image</Text>
          </View>
        ) : (
          <Image
            source={{ uri: imageUrl }}
            style={s.image}
            resizeMode="contain"
            onError={() => setError(true)}
          />
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    position: "absolute",
    top: 52, right: 20,
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
    zIndex: 100,
  },
  image: {
    width: width,
    height: height,
  },
  errorBox: {
    alignItems: "center", justifyContent: "center",
  },
  errorText: {
    color: "#fff",
    fontFamily: "Outfit_400Regular",
    fontSize: 16,
  },
});