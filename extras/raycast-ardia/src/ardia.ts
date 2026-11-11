import { open } from "@raycast/api";
import { runAppleScript, useCachedPromise } from "@raycast/utils";
import {
  activateScript,
  ARDIA_CLOSED,
  BUNDLE_ID,
  closeTabScript,
  focusTabScript,
  hasOpenWindowScript,
  isRunningScript,
  listProfilesScript,
  listTabsScript,
  newTabScript,
  newWindowScript,
  parseProfiles,
  parseTabs,
  profileNamed,
  showProfileScript,
  type NewWindowOptions,
  type Profile,
  type Tab,
} from "./scripts";

export type { Profile, Tab } from "./scripts";

export async function isRunning(): Promise<boolean> {
  return (await runAppleScript(isRunningScript())) === "true";
}

export async function getTabs(): Promise<Tab[]> {
  if (!(await isRunning())) throw new Error(ARDIA_CLOSED);
  return parseTabs(await runAppleScript(listTabsScript(), { timeout: 10_000 }));
}

export function useTabs() {
  return useCachedPromise(getTabs, [], { keepPreviousData: true, onError: keepSavedTabs });
}

function keepSavedTabs() {}

export async function hasOpenWindow(): Promise<boolean> {
  return (await isRunning()) && (await runAppleScript(hasOpenWindowScript())) === "true";
}

export async function focusTab(tab: Tab) {
  if (!(await hasOpenWindow())) {
    if (!tab.url) throw new Error("Ardia has no open window, and this tab has no address to reopen.");
    await open(tab.url, BUNDLE_ID);
    return;
  }
  await runAppleScript(focusTabScript(tab));
  await runAppleScript(activateScript());
}

export async function closeTab(tab: Tab) {
  await runAppleScript(closeTabScript(tab));
}

export async function getProfiles(): Promise<Profile[]> {
  return parseProfiles(await runAppleScript(listProfilesScript(), { timeout: 10_000 }));
}

export function useProfiles() {
  return useCachedPromise(getProfiles, [], { keepPreviousData: true });
}

export async function profileIdNamed(name: string) {
  return profileNamed(await getProfiles(), name).id;
}

export async function showProfile(profile: Profile) {
  await runAppleScript(showProfileScript(profile));
  await runAppleScript(activateScript());
}

export async function newWindow(options?: NewWindowOptions) {
  await runAppleScript(newWindowScript(options));
  await runAppleScript(activateScript());
}

export async function newTab(input: string) {
  await runAppleScript(newTabScript(input));
  await runAppleScript(activateScript());
}
