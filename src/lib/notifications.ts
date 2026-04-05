import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { supabase } from "./supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true, 
    shouldShowList: true,   
  }),
});

export async function registerPushToken(userId: string) {
  try {
    if (!Device.isDevice) {
      console.log("Must use physical device for push notifications");
      return;
    }

    // 🔐 Check permissions
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Permission not granted");
      return;
    }

    // 📱 Android channel setup
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    // 🎯 Get Expo Push Token
    const token = (await Notifications.getExpoPushTokenAsync()).data;

    console.log("Push Token:", token);

    // 💾 Save token to Supabase
    const { error } = await supabase
      .from("users")
      .update({ push_token: token })
      .eq("id", userId);

    if (error) {
      console.log("Error saving token:", error.message);
    }

    return token;
  } catch (err) {
    console.log("Push registration error:", err);
  }
}