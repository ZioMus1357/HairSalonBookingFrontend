import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const easyAuthTokenKey = "maisonNoir.easyAuthToken";
let easyAuthToken: string | null | undefined;

export async function getMobileEasyAuthToken() {
  if (Platform.OS === "web") {
    return null;
  }

  if (easyAuthToken === undefined) {
    easyAuthToken = await SecureStore.getItemAsync(easyAuthTokenKey);
  }

  return easyAuthToken;
}

export async function setMobileEasyAuthToken(token: string) {
  easyAuthToken = token;
  if (Platform.OS !== "web") {
    await SecureStore.setItemAsync(easyAuthTokenKey, token);
  }
}

export async function clearMobileEasyAuthToken() {
  easyAuthToken = null;
  if (Platform.OS !== "web") {
    await SecureStore.deleteItemAsync(easyAuthTokenKey);
  }
}
