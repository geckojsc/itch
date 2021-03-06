import { Watcher } from "common/util/watcher";

import { app, Menu } from "electron";

import { createSelector } from "reselect";

import { actions } from "common/actions";
import {
  getTray,
  rememberNotificationAction,
} from "main/reactors/tray-persistent-state";

import { Store, RootState, I18nState, MenuTemplate } from "common/types";
import { fleshOutTemplate } from "main/reactors/context-menu/flesh-out-template";
import { memoize } from "common/util/lru-memoize";
import { currentRuntime } from "common/os/runtime";

const setTrayMenu = memoize(1, function(template: MenuTemplate, store: Store) {
  const fleshedOut = fleshOutTemplate(
    "root",
    store,
    currentRuntime(),
    template
  );
  const menu = Menu.buildFromTemplate(fleshedOut);

  if (process.platform === "darwin") {
    // don't have a tray icon on macOS, we just live in the dock
    app.dock.setMenu(menu);
  } else {
    getTray(store).setContextMenu(menu);
  }
});

async function go(store: Store, url: string) {
  // TODO: should navigate focus the window anyway ?
  store.dispatch(actions.focusWind({ wind: "root" }));
  store.dispatch(actions.navigate({ wind: "root", url }));
}

function refreshTray(store: Store, i18n: I18nState) {
  // TODO: make the tray a lot more useful? that'd be good.
  // (like: make it display recent stuff / maybe the last few tabs)

  const menuTemplate: MenuTemplate = [
    {
      localizedLabel: ["sidebar.owned"],
      click: () => go(store, "itch://library"),
    },
    {
      localizedLabel: ["sidebar.dashboard"],
      click: () => go(store, "itch://dashboard"),
    },
  ];

  if (process.platform !== "darwin") {
    menuTemplate.push({ type: "separator" });
    menuTemplate.push({
      localizedLabel: ["menu.file.quit"],
      click: () => store.dispatch(actions.quit({})),
    });
  }
  setTrayMenu(menuTemplate, store);
}

export default function(watcher: Watcher) {
  watcher.onStateChange({
    makeSelector: (store, schedule) =>
      createSelector(
        (rs: RootState) => rs.i18n,
        i18n => {
          schedule(() => refreshTray(store, i18n));
        }
      ),
  });

  watcher.on(actions.notify, async (store, action) => {
    const { onClick } = action.payload;
    rememberNotificationAction(onClick);
  });
}
