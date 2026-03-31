import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
// import { supabase } from "";

export const logout = async () => {
  try {
    await supabase.auth.signOut();
    await AsyncStorage.removeItem("userSession");
    router.replace("/signin");
  } catch (error) {
    console.error("Logout failed:", error);
    router.replace("/signin");
  }
};