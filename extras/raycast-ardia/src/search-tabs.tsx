import { Action, ActionPanel, closeMainWindow, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { getFavicon, showFailureToast } from "@raycast/utils";
import { useMemo, useState } from "react";
import { closeTab, focusTab, useTabs, type Tab } from "./ardia";
import { rank } from "./match";
import { hostOf } from "./scripts";

const searchFields = (tab: Tab) => ({ title: tab.title, host: tab.url ? hostOf(tab.url) : "" });

export default function Command() {
  const { isLoading, data, error, revalidate, mutate } = useTabs();
  const [searchText, setSearchText] = useState("");
  const windowCount = new Set(data?.map((tab) => tab.windowId)).size;
  const { matches, others } = useMemo(() => rank(data ?? [], searchText, searchFields), [data, searchText]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search tabs…"
      filtering={false}
      onSearchTextChange={setSearchText}
    >
      {error && !data?.length ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Couldn't read Ardia's tabs"
          description="Is Ardia running, and may Raycast control it (System Settings › Privacy & Security › Automation)?"
        />
      ) : (
        <List.EmptyView icon={Icon.AppWindowList} title={searchText.trim() ? "No matching tabs" : "No open tabs"} />
      )}
      {matches.map(item)}
      {others.length > 0 && <List.Section title="Other matches">{others.map(item)}</List.Section>}
    </List>
  );

  function item(tab: Tab) {
    return (
      <List.Item
        key={`${tab.windowId}-${tab.tabId}`}
        title={tab.title || (tab.url ? hostOf(tab.url) : "New Tab")}
        subtitle={tab.url ? hostOf(tab.url) : undefined}
        icon={tab.url ? getFavicon(tab.url, { fallback: Icon.Globe }) : Icon.Plus}
        accessories={[
          ...(tab.isPinned ? [{ icon: Icon.Pin, tooltip: "Pinned" }] : []),
          ...(tab.isFocused && tab.windowIndex === 1 ? [{ tag: "Current" }] : []),
          ...(windowCount > 1 ? [{ text: `Window ${tab.windowIndex}` }] : []),
        ]}
        actions={
          <ActionPanel>
            <Action
              title="Switch to Tab"
              icon={Icon.ArrowRight}
              onAction={async () => {
                try {
                  await closeMainWindow();
                  await focusTab(tab);
                } catch (e) {
                  await showFailureToast(e, { title: "Couldn't switch to the tab" });
                }
              }}
            />
            {tab.url && (
              <Action.CopyToClipboard title="Copy URL" content={tab.url} shortcut={Keyboard.Shortcut.Common.Copy} />
            )}
            <Action
              title="Close Tab"
              icon={Icon.XMarkCircle}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={() => void close(tab)}
            />
            <Action
              title="Reload Tabs"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={revalidate}
            />
          </ActionPanel>
        }
      />
    );
  }

  async function close(tab: Tab) {
    try {
      await mutate(closeTab(tab), {
        optimisticUpdate: (tabs) => tabs?.filter((t) => !(t.windowId === tab.windowId && t.tabId === tab.tabId)),
      });
      await showToast({ style: Toast.Style.Success, title: "Closed tab" });
    } catch (e) {
      await showFailureToast(e, { title: "Couldn't close the tab" });
    }
  }
}
