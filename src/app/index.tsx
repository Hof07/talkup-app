import { forwardRef } from "react";
import { View } from "react-native";
import OnboardingScreen from "./components/landing";
// import OnboardingScreen from "./components/landing";

const Index = forwardRef<View>((props, ref) => {
  return <OnboardingScreen ref={ref} />;
});

Index.displayName = "Index";

export default Index;
