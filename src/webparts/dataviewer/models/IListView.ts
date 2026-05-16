export interface IListColumn {
  key: string;
  name: string;
  fieldName: string;
  minWidth: number;
  maxWidth?: number;
  isResizable?: boolean;
  isSorted?: boolean;
  isSortedDescending?: boolean;
}

export interface IListItem {
  id: string;
  [key: string]: unknown;
}

export interface IListView {
  id: string;
  title: string;
  listTitle: string;
  listUrl: string;
  viewXml?: string;
  columns: IListColumn[];
  items: IListItem[];
  totalCount: number;
}

export interface IListViewConfig {
  id: string;
  title: string;
  listTitle: string;
  viewName?: string;
  viewXml?: string;
  pageSize: number;
  enableSearch: boolean;
  enableSort: boolean;
  enablePagination: boolean;
}

export interface IDataviewerConfig {
  views: IListViewConfig[];
  defaultPageSize: number;
  enableSearch: boolean;
}

export interface ISharePointList {
  Id: string;
  Title: string;
  RootFolder: { ServerRelativeUrl: string };
}

export interface ISharePointView {
  Id: string;
  Title: string;
  ViewQuery: string;
  ViewFields: { Items: string[] };
}

export interface ISharePointField {
  InternalName: string;
  Title: string;
  FieldTypeKind: number;
}
