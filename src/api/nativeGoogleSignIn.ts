import { GoogleSignin, isSuccessResponse } from "@react-native-google-signin/google-signin";

let configuredWebClientId: string | undefined;

export async function nativeGoogleIdToken(webClientId: string) {
  if (configuredWebClientId !== webClientId) {
    GoogleSignin.configure({
      webClientId,
      offlineAccess: false
    });
    configuredWebClientId = webClientId;
  }

  await GoogleSignin.hasPlayServices();
  await GoogleSignin.signOut().catch(() => undefined);
  const response = await GoogleSignin.signIn();

  if (!isSuccessResponse(response)) {
    return null;
  }

  return response.data.idToken ?? null;
}
