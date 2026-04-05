import { forwardRef, useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { Slot, router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Splash from "./components/splash";
import AppLockGate from "./AppLockGate";
import { ThemeProvider } from "./constants/ThemeContext";

const Layout = forwardRef<View>((props, ref) => {
  const [showSplash, setShowSplash] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const hasLaunched = await AsyncStorage.getItem("hasLaunched");
        const userSessionStr = await AsyncStorage.getItem("userSession");

        let isLoggedIn = false;

        if (userSessionStr) {
          try {
            const session = JSON.parse(userSessionStr);
            const refreshToken = session?.refresh_token;

            if (refreshToken) {
              // Try to refresh the session
              const res = await fetch(
                `${process.env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
                  },
                  body: JSON.stringify({ refresh_token: refreshToken }),
                }
              );

              const data = await res.json();

              if (res.ok && data.access_token) {
                // Save refreshed session permanently
                await AsyncStorage.setItem("userSession", JSON.stringify(data));
                isLoggedIn = true;
              } else {
                // Refresh failed — clear session
                await AsyncStorage.removeItem("userSession");
              }
            }
          } catch {
            await AsyncStorage.removeItem("userSession");
          }
        }

        setTimeout(async () => {
          setShowSplash(false);
          setIsReady(true);

          if (hasLaunched === null) {
            await AsyncStorage.setItem("hasLaunched", "true");
            router.replace("/");
          } else if (isLoggedIn) {
            router.replace("/home");
          } else {
            router.replace("/signin");
          }
        }, 2000);
      } catch {
        setTimeout(() => {
          setShowSplash(false);
          setIsReady(true);
          router.replace("/signin");
        }, 2000);
      }
    };

    checkSession();
  }, []);

  if (showSplash || !isReady) {
    return (
      <View style={styles.root}>
        <Splash />
      </View>
    );
  }

  return (
    <View ref={ref} style={styles.root}>
      <Slot />
    </View>
  );
});

Layout.displayName = "Layout";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppLockGate>
        <Layout />
      </AppLockGate>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});