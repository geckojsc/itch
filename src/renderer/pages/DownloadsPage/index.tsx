import { actions } from "common/actions";
import { Download, GameUpdate } from "common/butlerd/messages";
import { Space } from "common/helpers/space";
import { Dispatch } from "common/types";
import {
  getFinishedDownloads,
  getPendingDownloads,
} from "main/reactors/downloads/getters";
import React from "react";
import Button from "renderer/basics/Button";
import EmptyState from "renderer/basics/EmptyState";
import Link from "renderer/basics/Link";
import LoadingCircle from "renderer/basics/LoadingCircle";
import { hook } from "renderer/hocs/hook";
import { withSpace } from "renderer/hocs/withSpace";
import GameUpdateRow from "renderer/pages/DownloadsPage/GameUpdateRow";
import Row from "renderer/pages/DownloadsPage/Row";
import { Title } from "renderer/pages/PageStyles/games";
import { MeatProps } from "renderer/scenes/HubScene/Meats/types";
import styled, * as styles from "renderer/styles";
import { T } from "renderer/t";
import { first, isEmpty, map, rest, size } from "underscore";
import { FilterSpacer } from "renderer/pages/common/SortsAndFilters";

const PauseResumeButton = styled(Button)`
  min-width: 210px;
`;

const DownloadsDiv = styled.div`
  ${styles.meat};
`;

const DownloadsContentDiv = styled.div`
  overflow-y: auto;
  padding: 0 20px 20px 10px;
  padding-top: 15px;
  position: relative;

  .global-controls {
    float: right;
  }

  .section-bar {
    display: flex;
    flex-direction: row;
    align-items: center;
    margin: 20px 0 20px 10px;
    flex-shrink: 0;

    .spacer {
      height: 1px;
      width: 1em;
    }

    .filler {
      flex-grow: 1;
    }

    .clear {
      margin-left: 8px;
      ${styles.clickable};
    }
  }

  .game-actions .main-action {
    padding: 3px 10px;
  }
`;

class DownloadsPage extends React.PureComponent<Props> {
  componentDidMount() {
    const { dispatch, space } = this.props;
    dispatch(
      space.makeFetch({
        label: ["sidebar.downloads"],
      })
    );
  }

  render() {
    return <DownloadsDiv>{this.renderContents()}</DownloadsDiv>;
  }

  renderContents() {
    const { items, finishedItems, updates, dispatch } = this.props;

    const allEmpty =
      isEmpty(items) && isEmpty(finishedItems) && isEmpty(updates);
    if (allEmpty) {
      return (
        <DownloadsContentDiv>
          {this.renderControls()}
          <EmptyState
            className="no-active-downloads"
            icon="download"
            bigText={["status.downloads.no_active_downloads"]}
            smallText={["status.downloads.no_active_downloads_subtext"]}
            buttonIcon="earth"
            buttonText={["status.downloads.find_games_button"]}
            buttonAction={() =>
              dispatch(
                actions.navigate({ wind: "root", url: "itch://featured" })
              )
            }
          />
        </DownloadsContentDiv>
      );
    }

    const firstItem = first(items);
    const queuedItems = rest(items);

    return (
      <DownloadsContentDiv>
        {this.renderControls()}
        {this.renderFirstItem(firstItem)}
        {this.renderQueuedItems(queuedItems)}
        {this.renderRecentActivity()}
        {this.renderUpdates()}
      </DownloadsContentDiv>
    );
  }

  renderFirstItem(firstItem: Download): JSX.Element {
    if (!firstItem) {
      return null;
    }

    return (
      <>
        <div className="section-bar">
          <Title>{T(["status.downloads.category.active"])}</Title>
        </div>

        <Row key={firstItem.id} item={firstItem} first />
      </>
    );
  }

  renderQueuedItems(queuedItems: Download[]): JSX.Element {
    if (isEmpty(queuedItems)) {
      return null;
    }

    return (
      <>
        <div className="section-bar">
          <Title>{T(["status.downloads.category.queued"])}</Title>
        </div>
        {map(queuedItems, (item, i) => <Row key={item.id} item={item} />)}
      </>
    );
  }

  renderUpdates(): JSX.Element {
    const { updates, updateCheckHappening, updateCheckProgress } = this.props;

    if (isEmpty(updates) && !updateCheckHappening) {
      return null;
    }

    return (
      <>
        <div className="section-bar">
          <Title className="finished-header">
            <span>
              {T(["status.downloads.updates_available"])} ({size(updates)})
            </span>
          </Title>
          <FilterSpacer />
          <Link
            label={T(["status.downloads.update_all"])}
            onClick={this.onUpdateAll}
          />
          {updateCheckHappening ? (
            <>
              <div className="spacer" />
              <LoadingCircle progress={updateCheckProgress} />
            </>
          ) : null}
        </div>
        {map(updates, (update, k) => <GameUpdateRow key={k} update={update} />)}
      </>
    );
  }

  renderControls(): JSX.Element {
    return (
      <>
        <div className="global-controls">
          {this.props.downloadsPaused ? (
            <PauseResumeButton
              discreet
              icon="triangle-right"
              onClick={this.onTogglePause}
            >
              {T(["status.downloads.resume_downloads"])}
            </PauseResumeButton>
          ) : (
            <PauseResumeButton
              discreet
              icon="pause"
              onClick={this.onTogglePause}
            >
              {T(["status.downloads.pause_downloads"])}
            </PauseResumeButton>
          )}
        </div>
      </>
    );
  }

  onTogglePause = () => {
    const { downloadsPaused, dispatch } = this.props;
    dispatch(actions.setDownloadsPaused({ paused: !downloadsPaused }));
  };

  renderRecentActivity(): JSX.Element {
    const { finishedItems, dispatch } = this.props;

    if (isEmpty(finishedItems)) {
      return null;
    }

    return (
      <>
        <div key="finished-header" className="section-bar">
          <Title className="finished-header">
            {T(["status.downloads.category.recent_activity"])}
          </Title>
          <FilterSpacer />
          <Link
            className="downloads-clear-all"
            onClick={() => dispatch(actions.clearFinishedDownloads({}))}
          >
            {T(["status.downloads.clear_all_finished"])}
          </Link>
        </div>
        {map(finishedItems, item => <Row key={item.id} item={item} finished />)}
      </>
    );
  }

  onUpdateAll = () => {
    const { dispatch } = this.props;
    dispatch(actions.queueAllGameUpdates({}));
  };
}

interface Props extends MeatProps {
  space: Space;
  dispatch: Dispatch;
  items: Download[];
  finishedItems: Download[];
  updates: {
    [caveId: string]: GameUpdate;
  };
  updateCheckHappening: boolean;
  updateCheckProgress: number;
  downloadsPaused: boolean;
}

export default withSpace(
  hook(map => ({
    items: map(rs => getPendingDownloads(rs.downloads)),
    finishedItems: map(rs => getFinishedDownloads(rs.downloads)),
    updates: map(rs => rs.gameUpdates.updates),
    updateCheckHappening: map(rs => rs.gameUpdates.checking),
    updateCheckProgress: map(rs => rs.gameUpdates.progress),
    downloadsPaused: map(rs => rs.downloads.paused),
  }))(DownloadsPage)
);
