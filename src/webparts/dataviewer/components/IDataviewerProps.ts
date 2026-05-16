import { SPHttpClient } from '@microsoft/sp-http';
import { IListViewConfig } from '../models/IListView';

export interface IDataviewerProps {
  siteUrl: string;
  viewConfigs: IListViewConfig[];
  isDarkTheme: boolean;
  hasTeamsContext: boolean;
  userDisplayName: string;
  spHttpClient: SPHttpClient;
}
