import classNames from "classnames";
import { actions } from "common/actions";
import { Space } from "common/helpers/space";
import { Dispatch, ProxySource, BrowserViewMetrics } from "common/types";
import { ambientWind } from "common/util/navigation";
import React from "react";
import { hook } from "renderer/hocs/hook";
import { withSpace } from "renderer/hocs/withSpace";
import { MeatProps } from "renderer/scenes/HubScene/Meats/types";
import styled, * as styles from "renderer/styles";
import BrowserBar from "renderer/pages/BrowserPage/BrowserBar";
import BrowserContext from "renderer/pages/BrowserPage/BrowserContext";
import DisabledBrowser from "renderer/pages/BrowserPage/DisabledBrowser";
import ContainerDimensions from "react-container-dimensions";

const BrowserPageDiv = styled.div`
  ${styles.meat};
`;

const BrowserMain = styled.div`
  flex-grow: 1;
  display: flex;
  flex-direction: row;
  position: relative;
`;

const BrowserViewShell = styled.div`
  background: white;
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;

  &.fresh {
    background-color: ${props => props.theme.sidebarBackground};
    background-image: url("${require("static/images/logos/app-white.svg")}");
    background-position: 50% 50%;
    background-repeat: no-repeat;
  }
`;

class BrowserPage extends React.PureComponent<Props> {
  initialURL: string;
  mounted: boolean;

  constructor(props: BrowserPage["props"], context: any) {
    super(props, context);
    this.initialURL = props.space.url();
  }

  render() {
    const { space, disableBrowser, visible } = this.props;
    if (space.isSleepy() && !visible) {
      return null;
    }
    const fresh = !space.web().hadFirstLoad;

    return (
      <BrowserPageDiv>
        <BrowserBar />
        <BrowserMain>
          <BrowserViewShell className={classNames({ fresh })}>
            {disableBrowser ? (
              <DisabledBrowser />
            ) : (
              <ContainerDimensions>
                {({ width, height, top, left }) => {
                  this.setMetrics({ width, height, top, left });
                  return <></>;
                }}
              </ContainerDimensions>
            )}
          </BrowserViewShell>
        </BrowserMain>
        <BrowserContext />
      </BrowserPageDiv>
    );
  }

  componentDidUpdate(prevProps: Props, prevState: any) {
    if (!prevProps.disableBrowser && this.props.disableBrowser) {
      const { space, dispatch } = this.props;
      dispatch(space.makeFetch({ web: { loading: false } }));
    }
  }

  setMetrics = (metrics: BrowserViewMetrics) => {
    if (!this.mounted) {
      return;
    }
    const { space, dispatch } = this.props;
    dispatch(
      actions.tabGotWebContentsMetrics({
        wind: ambientWind(),
        tab: space.tab,
        initialURL: this.initialURL,
        metrics,
      })
    );
  };

  componentDidMount() {
    this.mounted = true;
  }

  componentWillUnmount() {
    this.mounted = false;
    const { dispatch, space } = this.props;
    dispatch(
      actions.tabLosingWebContents({
        wind: ambientWind(),
        tab: space.tab,
      })
    );
  }
}

interface Props extends MeatProps {
  space: Space;
  dispatch: Dispatch;

  proxy: string;
  proxySource: ProxySource;
  disableBrowser: boolean;
}

export default withSpace(
  hook(map => ({
    proxy: map(rs => rs.system.proxy),
    proxySource: map(rs => rs.system.proxySource),
    disableBrowser: map(rs => rs.preferences.disableBrowser),
  }))(BrowserPage)
);
