import classNames from "classnames";
import { actions } from "common/actions";
import { Space } from "common/helpers/space";
import { Dispatch, TabWeb } from "common/types";
import { ambientWind, transformUrl } from "common/util/navigation";
import React from "react";
import listensToClickOutside from "react-onclickoutside";
import IconButton from "renderer/basics/IconButton";
import { hook } from "renderer/hocs/hook";
import { withSpace } from "renderer/hocs/withSpace";
import * as styles from "renderer/styles";
import styled, { css } from "renderer/styles";
import { modalWidgets } from "renderer/modal-widgets";
import modals from "main/reactors/modals";

const HTTPS_RE = /^https:\/\//;
const ITCH_RE = /^itch:\/\//;

const NavigationBarDiv = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;

  padding-right: 4px;

  flex-grow: 1;
  position: relative;

  &.loading {
    &::after {
      position: absolute;
      bottom: -6px;
      content: " ";
      width: 100%;
      height: 2px;
      background: ${props => props.theme.accent};
      animation: ${styles.animations.lineSpinner} 2s ease-in-out infinite;
    }
  }
`;

const browserAddressSizing = css`
  height: 28px;
  line-height: 28px;
  border-radius: 2px;
`;

const browserAddressStyle = css`
  ${browserAddressSizing};
  ${styles.singleLine};
  font-size: 14px;
  text-shadow: 0 0 1px black;
  padding: 0;
  padding-left: 8px;
  padding-right: 12px;
  width: 100%;
  color: #fdfdfd;

  border: none;
  background: rgba(255, 255, 255, 0.1);
  box-shadow: none;

  &:focus {
    outline: none;
  }
`;

const AddressWrapper = styled.div`
  ${browserAddressSizing};
  margin: 0 6px;
  transition: all 0.4s;
  border: 1px solid transparent;
  flex-grow: 1;

  &.editing {
    border-color: rgba(255, 255, 255, 0.4);
  }
`;

const AddressInput = styled.input`
  ${browserAddressStyle};

  text-shadow: 0 0 1px transparent;
  color: white;
`;

const AddressDiv = styled.div`
  ${browserAddressStyle};

  .security-theater-bit {
    color: rgb(138, 175, 115);
  }

  .fluff-bit {
    color: rgb(148, 184, 218);
  }
`;

function isHTMLInput(el: HTMLElement): el is HTMLInputElement {
  return el.tagName === "INPUT";
}

class NavigationBar extends React.PureComponent<Props> {
  fresh = true;
  browserAddress: HTMLInputElement | HTMLElement;

  // event handlers
  goBack = () =>
    this.props.dispatch(
      actions.tabGoBack({ wind: ambientWind(), tab: this.props.space.tab })
    );
  showBackHistory = (ev: React.MouseEvent) => {
    this.props.dispatch(
      actions.openTabBackHistory({
        wind: ambientWind(),
        tab: this.props.space.tab,
        clientX: ev.clientX,
        clientY: ev.clientY,
      })
    );
  };
  goForward = () =>
    this.props.dispatch(
      actions.tabGoForward({
        wind: ambientWind(),
        tab: this.props.space.tab,
      })
    );
  showForwardHistory = (ev: React.MouseEvent) => {
    this.props.dispatch(
      actions.openTabForwardHistory({
        wind: ambientWind(),
        tab: this.props.space.tab,
        clientX: ev.clientX,
        clientY: ev.clientY,
      })
    );
  };
  stop = () =>
    this.props.dispatch(
      actions.tabStop({ wind: ambientWind(), tab: this.props.space.tab })
    );
  reload = () =>
    this.props.dispatch(
      actions.tabReloaded({
        wind: ambientWind(),
        tab: this.props.space.tab,
      })
    );

  render() {
    const { space, loading } = this.props;
    const canGoBack = space.canGoBack();
    const canGoForward = space.canGoForward();

    return (
      <NavigationBarDiv className={classNames({ loading })}>
        <IconButton
          icon="arrow-left"
          disabled={!canGoBack}
          onClick={this.goBack}
          onContextMenu={this.showBackHistory}
        />
        <IconButton
          icon="arrow-right"
          disabled={!canGoForward}
          onClick={this.goForward}
          onContextMenu={this.showForwardHistory}
        />
        {this.renderAddressBar(space)}
      </NavigationBarDiv>
    );
  }

  renderAddressBar(sp: Space) {
    const { loading } = this.props;
    const url = sp.url();

    if (!this.props.showAddressBar) {
      return null;
    }

    let { editingAddress } = sp.web();

    return (
      <>
        {loading ? (
          <IconButton icon="cross" onClick={this.stop} />
        ) : (
          <IconButton icon="repeat" onClick={this.reload} />
        )}
        <AddressWrapper className={classNames({ editing: editingAddress })}>
          {editingAddress ? (
            <AddressInput
              className="browser-address"
              type="search"
              innerRef={this.onBrowserAddress as any}
              defaultValue={url}
              onKeyUp={this.addressKeyUp}
              onBlur={this.addressBlur}
            />
          ) : (
            <AddressDiv
              className={classNames("browser-address")}
              innerRef={this.onBrowserAddress}
              onClick={this.startEditingAddress}
            >
              {this.renderURL(url)}
            </AddressDiv>
          )}
        </AddressWrapper>
      </>
    );
  }

  renderURL(url: string): JSX.Element {
    if (HTTPS_RE.test(url)) {
      return (
        <span>
          <span className="security-theater-bit">{"https://"}</span>
          {url.replace(HTTPS_RE, "")}
        </span>
      );
    }

    if (ITCH_RE.test(url)) {
      return (
        <span>
          <span className="fluff-bit">{"itch://"}</span>
          {url.replace(ITCH_RE, "")}
        </span>
      );
    }

    return <>{url}</>;
  }

  onBrowserAddress = (browserAddress: HTMLElement | HTMLInputElement) => {
    this.browserAddress = browserAddress;

    if (!browserAddress) {
      return;
    }

    const { space } = this.props;
    if (this.fresh && space.internalPage() === "new-tab") {
      this.fresh = false;
      this.startEditingAddress();
    }

    if (isHTMLInput(browserAddress)) {
      browserAddress.focus();
      browserAddress.select();
    }
  };

  addressKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const input = e.currentTarget.value;
      const url = transformUrl(input);

      const { space, dispatch } = this.props;
      dispatch(space.makeEvolve({ url, replace: false }));
      this.pushWeb({ editingAddress: false });
    } else if (e.key === "Escape") {
      this.pushWeb({ editingAddress: false });
    }
  };

  startEditingAddress = () => {
    this.pushWeb({ editingAddress: true });
  };

  addressBlur = () => {
    this.pushWeb({ editingAddress: false });
  };

  pushWeb(web: Partial<TabWeb>) {
    const { dispatch, space } = this.props;
    dispatch(space.makeFetch({ web }));
  }

  handleClickOutside = () => {
    this.addressBlur();
  };
}

interface Props {
  space: Space;
  dispatch: Dispatch;
  loading: boolean;
  showAddressBar?: boolean;
}

const intermediate = withSpace(listensToClickOutside(NavigationBar));
export default hook()(intermediate);
