import { TabInstances, TabData, TabDataSave, TabInstance } from "common/types";
import { actions } from "common/actions";
import reducer from "common/reducers/reducer";

import { omit, each, size } from "underscore";

const initialState: TabInstances = {};

const emptyObj = {} as any;
const maxHistorySize = 50;

function trimHistory(ti: TabInstance): TabInstance {
  if (!ti || !ti.history) {
    return ti;
  }

  const historySize = size(ti.history);
  if (historySize <= maxHistorySize) {
    return ti;
  }

  let offset = maxHistorySize - historySize;
  let newIndex = ti.currentIndex - offset;
  let newHistory = ti.history.slice(offset);
  if (newIndex < 0 || newIndex >= size(newHistory)) {
    newIndex = size(newHistory) - 1;
  }

  return {
    ...ti,
    currentIndex: newIndex,
    history: newHistory,
  };
}

let deepFields = ["web"];

function merge(
  a: TabData,
  b: TabData,
  { shallow }: { shallow?: boolean }
): TabData {
  if (shallow) {
    return { ...a, ...b };
  }

  const res = {
    ...a,
    ...b,
  };
  for (const df of deepFields) {
    (res as any)[df] = {
      ...((a as any)[df] || emptyObj),
      ...((b as any)[df] || emptyObj),
    };
  }
  return res;
}

export default reducer<TabInstances>(initialState, on => {
  on(actions.windOpened, (state, action) => {
    const { initialURL } = action.payload;
    return {
      ...state,
      ["initial-tab"]: {
        history: [{ url: initialURL }],
        currentIndex: 0,
        sleepy: true,
        sequence: 0,
        data: {},
      },
    };
  });

  on(actions.tabDataFetched, (state, action) => {
    const { tab, data, shallow } = action.payload;
    const oldInstance = state[tab];
    if (!oldInstance) {
      // ignore fresh data for closed tabs
      return state;
    }

    let newData = merge(oldInstance.data, data, { shallow });

    return {
      ...state,
      [tab]: {
        ...omit(oldInstance, "sleepy"),
        data: newData,
      },
    };
  });

  on(actions.evolveTab, (state, action) => {
    const { tab, onlyIfMatchingURL, data = emptyObj } = action.payload;
    let { url, resource, replace } = action.payload;

    const oldInstance = state[tab];
    if (!oldInstance) {
      // ignore fresh data for closed tabs
      return state;
    }

    let { history, currentIndex } = oldInstance;
    if (history[currentIndex].url === url) {
      replace = true;
    } else if (onlyIfMatchingURL) {
      return state;
    }

    if (resource && /^collections\//.test(resource)) {
      url = `itch://${resource}`;
    }

    if (!resource && replace) {
      // keep the resource in case it's not specified
      resource = history[currentIndex].resource;
    }

    if (replace) {
      history = [
        ...history.slice(0, currentIndex),
        { url, resource },
        ...history.slice(currentIndex + 1),
      ];
    } else {
      history = [...history.slice(0, currentIndex + 1), { url, resource }];
      currentIndex = history.length - 1;
    }

    // merge old & new data
    let newInstance = {
      ...oldInstance,
      history,
      currentIndex,
      data: merge(oldInstance.data, data, { shallow: false }),
    };
    newInstance = trimHistory(newInstance);

    return {
      ...state,
      [tab]: newInstance,
    };
  });

  on(actions.tabWentToIndex, (state, action) => {
    const { tab, index } = action.payload;
    const instance = state[tab];

    if (index >= 0 && index < instance.history.length) {
      return {
        ...state,
        [tab]: {
          ...instance,
          currentIndex: index,
        },
      };
    }

    return state;
  });

  on(actions.tabFocused, (state, action) => {
    const { tab } = action.payload;
    const oldInstance = state[tab];

    // wake up any sleepy tabs
    if (oldInstance && oldInstance.sleepy) {
      return {
        ...state,
        [tab]: omit(oldInstance, "sleepy"),
      };
    }
    return state;
  });

  on(actions.tabsClosed, (state, action) => {
    const { tabs } = action.payload;
    return omit(state, ...tabs);
  });

  on(actions.tabOpened, (state, action) => {
    const { tab, url, resource, data = emptyObj } = action.payload;
    if (!tab) {
      return state;
    }
    return {
      ...state,
      [tab]: {
        history: [
          {
            url,
            resource,
          },
        ],
        currentIndex: 0,
        sequence: 0,
        data: { label: ["sidebar.loading"], ...data },
      },
    };
  });

  on(actions.tabLostWebContents, (state, action) => {
    const { tab } = action.payload;
    const oldInstance = state[tab];
    if (!oldInstance) {
      // ignore
      return state;
    }

    return {
      ...state,
      [tab]: {
        ...oldInstance,
        data: {
          ...oldInstance.data,
          web: null,
        },
      },
    };
  });

  on(actions.loggedOut, (state, action) => {
    return initialState;
  });

  on(actions.tabsRestored, (state, action) => {
    const { snapshot } = action.payload;

    let s = {};

    each(snapshot.items, (tabSave: TabDataSave) => {
      if (typeof tabSave !== "object") {
        return;
      }

      const { id, ...data } = tabSave;
      if (!id) {
        return;
      }

      s = {
        ...s,
        [tabSave.id]: trimHistory({
          ...data,
          data: {},
          sleepy: true,
          sequence: 0,
        }),
      };
    });

    return s;
  });

  on(actions.tabReloaded, (state, action) => {
    const { tab } = action.payload;
    return {
      ...state,
      [tab]: {
        ...state[tab],
        sequence: state[tab].sequence + 1,
      },
    };
  });
});
