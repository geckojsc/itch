import { reject, omit, map, filter, difference } from "underscore";

import { NavigationState, TabDataSave } from "common/types";

import { actions } from "common/actions";
import reducer from "common/reducers/reducer";
import arrayMove from "array-move";

const initialState: NavigationState = {
  openTabs: ["initial-tab"],
  loadingTabs: {},
  tab: "initial-tab",
};

export default reducer<NavigationState>(initialState, on => {
  on(actions.tabLoading, (state, action) => {
    const { tab, loading } = action.payload;
    if (loading) {
      return {
        ...state,
        loadingTabs: {
          ...state.loadingTabs,
          [tab]: true,
        },
      };
    } else {
      return {
        ...state,
        loadingTabs: omit(state.loadingTabs, tab),
      };
    }
  });

  on(actions.tabOpened, (state, action) => {
    const { tab, background } = action.payload;
    if (!tab) {
      return state;
    }

    const { openTabs } = state;

    return {
      ...state,
      tab: background ? state.tab : tab,
      openTabs: [tab, ...openTabs],
    };
  });

  on(actions.tabFocused, (state, action) => {
    const { tab } = action.payload;

    return {
      ...state,
      tab,
    };
  });

  on(actions.moveTab, (state, action) => {
    const { before, after } = action.payload;

    const { openTabs } = state;

    const newOpenTabs = arrayMove(openTabs, before, after);

    return {
      ...state,
      openTabs: newOpenTabs,
    };
  });

  on(actions.tabsClosed, (state, action) => {
    const { tabs, andFocus } = action.payload;
    return {
      ...state,
      openTabs: difference(state.openTabs, tabs),
      loadingTabs: omit(state.loadingTabs, ...tabs),
      tab: andFocus ? andFocus : state.tab,
    };
  });

  on(actions.tabsRestored, (state, action) => {
    const { snapshot } = action.payload;

    const tab = snapshot.current || state.tab;
    const openTabs = filter(
      map(snapshot.items, (tab: TabDataSave) => {
        return tab.id;
      }),
      x => !!x
    );

    return {
      ...state,
      tab,
      openTabs,
    };
  });

  on(actions.loggedOut, (state, action) => {
    return initialState;
  });
});
