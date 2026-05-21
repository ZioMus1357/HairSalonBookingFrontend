import { ReactNode, useEffect, useMemo, useState } from "react";
import { Bell, CalendarDays, Grid2X2, Home, Image as ImageIcon, Lock, Menu, Scissors, Settings, Sparkles, UserRound, UsersRound, X } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Chip } from "../components/Primitives";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useRouter } from "../router/RouterContext";
import { colors, radii, shadow } from "../theme/tokens";
import { UserRole } from "../types/domain";
import { roleLabel } from "../utils/format";

type NavItem = {
  label: string;
  path: string;
  icon: ReactNode;
  roles?: Array<UserRole | "Guest">;
};

const publicNav: NavItem[] = [
  { label: "Home", path: "/", icon: <Home size={17} color={colors.gold} /> },
  { label: "Usługi", path: "/services", icon: <Sparkles size={17} color={colors.gold} /> },
  { label: "Fryzjerzy", path: "/hairdressers", icon: <Scissors size={17} color={colors.gold} /> },
  { label: "Galeria", path: "/gallery", icon: <ImageIcon size={17} color={colors.gold} /> },
  { label: "Opinie", path: "/reviews", icon: <Bell size={17} color={colors.gold} /> },
  { label: "Kontakt", path: "/contact", icon: <Bell size={17} color={colors.gold} /> }
];

const dashboardNav: NavItem[] = [
  { label: "Booking", path: "/booking", icon: <CalendarDays size={17} color={colors.gold} />, roles: ["Customer"] },
  { label: "Moje wizyty", path: "/my-visits", icon: <UserRound size={17} color={colors.gold} />, roles: ["Customer"] },
  { label: "Profil", path: "/profile", icon: <Settings size={17} color={colors.gold} />, roles: ["Customer"] },
  { label: "Panel fryzjera", path: "/hairdresser/dashboard", icon: <Scissors size={17} color={colors.gold} />, roles: ["Hairdresser"] },
  { label: "Wizyty fryzjera", path: "/hairdresser/appointments", icon: <CalendarDays size={17} color={colors.gold} />, roles: ["Hairdresser"] },
  { label: "Klienci fryzjera", path: "/hairdresser/customers", icon: <UsersRound size={17} color={colors.gold} />, roles: ["Hairdresser"] },
  { label: "Profil fryzjera", path: "/hairdresser/profile", icon: <Settings size={17} color={colors.gold} />, roles: ["Hairdresser"] },
  { label: "Admin", path: "/admin", icon: <Grid2X2 size={17} color={colors.gold} />, roles: ["Admin"] },
  { label: "Użytkownicy", path: "/admin/users", icon: <Lock size={17} color={colors.gold} />, roles: ["Admin"] },
  { label: "Klienci", path: "/admin/customers", icon: <UsersRound size={17} color={colors.gold} />, roles: ["Admin"] },
  { label: "Fryzjerzy", path: "/admin/hairdressers", icon: <Scissors size={17} color={colors.gold} />, roles: ["Admin"] },
  { label: "Usługi", path: "/admin/services", icon: <Sparkles size={17} color={colors.gold} />, roles: ["Admin"] },
  { label: "Wizyty", path: "/admin/appointments", icon: <CalendarDays size={17} color={colors.gold} />, roles: ["Admin"] },
  { label: "Opinie", path: "/admin/reviews", icon: <Bell size={17} color={colors.gold} />, roles: ["Admin"] },
  { label: "Galeria admin", path: "/admin/gallery", icon: <ImageIcon size={17} color={colors.gold} />, roles: ["Admin"] }
];

const roleHomePath = (role: UserRole | "Guest") => {
  if (role === "Admin") return "/admin";
  if (role === "Hairdresser") return "/hairdresser/dashboard";
  if (role === "Customer") return "/booking";
  return "/";
};

export function AppShell({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = width >= 980;
  const { path, navigate } = useRouter();
  const auth = useAuth();
  const { toasts } = useToast();
  const [open, setOpen] = useState(false);

  const isHairdresserAppPath = path.startsWith("/hairdresser/");
  const inDashboard = path.startsWith("/admin") || isHairdresserAppPath || (auth.isAuthenticated && ["/booking", "/my-visits", "/profile"].includes(path));
  const showMenuButton = !isDesktop || !inDashboard;
  const showDrawer = open && showMenuButton;
  const items = useMemo(() => {
    if (!inDashboard) return publicNav;
    return dashboardNav.filter((item) => !item.roles || item.roles.includes(auth.role));
  }, [auth.role, inDashboard]);

  useEffect(() => {
    setOpen(false);
  }, [path]);

  useEffect(() => {
    if (!showMenuButton) {
      setOpen(false);
    }
  }, [showMenuButton]);

  const nav = (
    <View style={[styles.navPanel, inDashboard && styles.dashboardNav, !inDashboard && styles.publicDrawerPanel]}>
      <View style={styles.logoRow}>
        <View style={styles.logoMark}><Scissors color={colors.champagne} size={18} /></View>
        <View>
          <Text style={styles.logo}>Maison Noir</Text>
          <Text style={styles.logoSub}>{inDashboard ? "Studio system" : "Luxury hair studio"}</Text>
        </View>
      </View>
      <View style={styles.navItems}>
        {items.map((item) => (
          <Pressable key={item.path} onPress={() => { navigate(item.path); setOpen(false); }} style={[styles.navItem, path === item.path && styles.navItemActive]}>
            {item.icon}
            <Text style={[styles.navText, path === item.path && styles.navTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      {inDashboard ? (
        <Button label="Strona główna" variant="ghost" onPress={() => navigate("/")} icon={<Home size={17} color={colors.gold} />} />
      ) : auth.isAuthenticated ? (
        <Button label="Przejdź do panelu" onPress={() => navigate(roleHomePath(auth.role))} icon={<Grid2X2 size={17} color={colors.ink} />} />
      ) : (
        <Button label="Umów wizytę" onPress={() => navigate("/booking")} icon={<CalendarDays size={17} color={colors.ink} />} />
      )}
    </View>
  );

  return (
    <View style={styles.app}>
      {isDesktop && inDashboard ? nav : null}
      <View style={styles.main}>
        <View style={[styles.topbar, { paddingTop: styles.topbar.paddingTop + insets.top }]}>
          {showMenuButton ? (
            <Pressable style={styles.menuButton} onPress={() => setOpen((value) => !value)}>
              {open ? <X color={colors.ink} size={21} /> : <Menu color={colors.ink} size={21} />}
            </Pressable>
          ) : null}
          <Pressable onPress={() => navigate("/")} style={styles.mobileBrand}>
            <Text numberOfLines={1} style={styles.mobileBrandText}>Maison Noir</Text>
          </Pressable>
          {isDesktop && !inDashboard ? (
            <View style={styles.desktopLinks}>
              {publicNav.map((item) => (
                <Pressable key={item.path} onPress={() => navigate(item.path)} style={[styles.desktopLink, path === item.path && styles.desktopLinkActive]}>
                  <Text style={[styles.desktopLinkText, path === item.path && styles.desktopLinkTextActive]}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <View style={styles.userArea}>
            {auth.isAuthenticated ? (
              <>
                <Pressable style={styles.bell}>
                  <Bell color={colors.ink} size={18} />
                  {toasts.length ? <View style={styles.dot} /> : null}
                </Pressable>
                <Pressable onPress={() => navigate(inDashboard ? "/" : roleHomePath(auth.role))}><Text style={styles.linkStrong}>{inDashboard ? "Strona" : "Panel"}</Text></Pressable>
                <Chip label={roleLabel(auth.role)} active />
                <Pressable onPress={auth.logout}><Text style={styles.link}>Wyloguj</Text></Pressable>
              </>
            ) : (
              <>
                <Pressable onPress={() => navigate("/login")}><Text style={styles.linkStrong}>Zaloguj</Text></Pressable>
              </>
            )}
          </View>
        </View>
        {showDrawer ? <View style={[styles.mobileNav, { top: 70 + insets.top }]}>{nav}</View> : null}
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 96 + insets.bottom }]}>{children}</ScrollView>
        {!isDesktop && inDashboard ? (
          <View style={[styles.bottomNav, { bottom: 12 + insets.bottom }]}>
            {items.slice(0, 5).map((item) => (
              <Pressable key={item.path} onPress={() => navigate(item.path)} style={styles.bottomItem}>
                {item.icon}
                <Text numberOfLines={1} style={styles.bottomText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    minHeight: "100%",
    backgroundColor: colors.pearl,
    flexDirection: "row"
  },
  main: {
    flex: 1
  },
  topbar: {
    minHeight: 72,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(251,250,247,0.94)",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    zIndex: 5,
    position: "relative"
  },
  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.line
  },
  mobileBrand: {
    flexShrink: 1,
    minWidth: 0
  },
  mobileBrandText: {
    color: colors.ink,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "900"
  },
  userArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "nowrap",
    justifyContent: "flex-end",
    marginLeft: "auto",
    flexShrink: 0
  },
  desktopLinks: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8
  },
  desktopLink: {
    minHeight: 40,
    borderRadius: 999,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  desktopLinkActive: {
    backgroundColor: colors.ink
  },
  desktopLinkText: {
    color: colors.charcoal,
    fontWeight: "900"
  },
  desktopLinkTextActive: {
    color: colors.champagne
  },
  bell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center"
  },
  dot: {
    position: "absolute",
    right: 8,
    top: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gold
  },
  link: {
    color: colors.charcoal,
    fontWeight: "800"
  },
  linkStrong: {
    color: colors.gold,
    fontWeight: "900"
  },
  navPanel: {
    gap: 18,
    padding: 18,
    backgroundColor: colors.ink,
    borderRadius: radii.lg,
    ...shadow
  },
  publicDrawerPanel: {
    width: "100%",
    maxWidth: 340,
    minHeight: 0
  },
  dashboardNav: {
    width: 286,
    minHeight: "100%",
    borderRadius: 0
  },
  mobileNav: {
    position: "absolute",
    top: 70,
    left: 18,
    zIndex: 40
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  logoMark: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)"
  },
  logo: {
    color: colors.pearl,
    fontSize: 18,
    fontWeight: "900"
  },
  logoSub: {
    color: "rgba(251,250,247,0.58)",
    fontSize: 12,
    marginTop: 2
  },
  navItems: {
    gap: 8
  },
  navItem: {
    minHeight: 44,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  navItemActive: {
    backgroundColor: "rgba(217,193,132,0.16)"
  },
  navText: {
    color: "rgba(251,250,247,0.76)",
    fontWeight: "800"
  },
  navTextActive: {
    color: colors.champagne
  },
  content: {
    padding: 18,
    paddingBottom: 96,
    gap: 22,
    maxWidth: 1380,
    width: "100%",
    alignSelf: "center"
  },
  bottomNav: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    borderRadius: radii.lg,
    backgroundColor: colors.ink,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-around",
    ...shadow
  },
  bottomItem: {
    alignItems: "center",
    gap: 3,
    flex: 1
  },
  bottomText: {
    color: colors.pearl,
    fontSize: 10,
    fontWeight: "800"
  }
});
