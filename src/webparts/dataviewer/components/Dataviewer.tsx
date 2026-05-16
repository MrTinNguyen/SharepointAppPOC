import * as React from 'react';
import { Text } from '@fluentui/react';
import type { IDataviewerProps } from './IDataviewerProps';
import { ListViewPanel } from './ListViewPanel';
import styles from './Dataviewer.module.scss';

const Dataviewer: React.FC<IDataviewerProps> = ({
  viewConfigs,
  isDarkTheme,
  hasTeamsContext,
  spHttpClient,
  siteUrl
}) => {
  const rootClassName = [
    styles.dataviewer,
    hasTeamsContext ? styles.teams : '',
    isDarkTheme ? styles.dark : ''
  ].filter(Boolean).join(' ');

  if (!viewConfigs || viewConfigs.length === 0) {
    return (
      <section className={rootClassName}>
        <output className={styles.emptyState}>
          <Text variant="large">No list views configured.</Text>
          <Text variant="medium">Please open the web part property pane to add list views.</Text>
        </output>
      </section>
    );
  }

  return (
    <section className={rootClassName} aria-label="SharePoint Data Viewer">
      {viewConfigs.map(config => (
        <ListViewPanel
          key={config.id}
          spHttpClient={spHttpClient}
          siteUrl={siteUrl}
          config={config}
        />
      ))}
    </section>
  );
};

export default Dataviewer;
