import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import {
  IListColumn,
  IListItem,
  ISharePointField,
  ISharePointList,
  ISharePointView,
  IListViewConfig
} from '../models/IListView';
import { assertODataIdentifier, odataStringLiteral } from '../utils/odata';

export interface IFetchListDataResult {
  items: IListItem[];
  totalCount: number;
  columns: IListColumn[];
}

export class SharePointListError extends Error {
  public readonly status: number | undefined;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'SharePointListError';
    this.status = status;
  }
}

const MAX_ITEMS = 5000;
const HIDDEN_VIEW_FIELDS = new Set(['LinkTitle', 'LinkTitleNoMenu']);

export class SharePointListService {
  private readonly _spHttpClient: SPHttpClient;
  private readonly _siteUrl: string;

  constructor(spHttpClient: SPHttpClient, siteUrl: string) {
    this._spHttpClient = spHttpClient;
    this._siteUrl = siteUrl.replace(/\/$/, '');
  }

  public async getLists(): Promise<ISharePointList[]> {
    const url = `${this._siteUrl}/_api/web/lists?$filter=Hidden eq false and BaseTemplate eq 100&$select=Id,Title,RootFolder/ServerRelativeUrl&$expand=RootFolder`;
    return this._getJson<{ value: ISharePointList[] }>(url, 'lists').then(d => d.value);
  }

  public async getViews(listTitle: string): Promise<ISharePointView[]> {
    const url = `${this._siteUrl}/_api/web/lists/getbytitle('${odataStringLiteral(listTitle)}')/views?$select=Id,Title,ViewQuery,ViewFields`;
    return this._getJson<{ value: ISharePointView[] }>(url, `views for "${listTitle}"`).then(d => d.value);
  }

  public async getListFields(listTitle: string): Promise<ISharePointField[]> {
    const url = `${this._siteUrl}/_api/web/lists/getbytitle('${odataStringLiteral(listTitle)}')/fields?$filter=Hidden eq false and ReadOnlyField eq false&$select=InternalName,Title,FieldTypeKind`;
    return this._getJson<{ value: ISharePointField[] }>(url, `fields for "${listTitle}"`).then(d => d.value);
  }

  public async fetchListData(
    config: IListViewConfig,
    searchText: string,
    sortColumn: string,
    sortDescending: boolean
  ): Promise<IFetchListDataResult> {
    const { columns, selectFields } = await this._resolveColumns(config);

    const queryParts = [`$select=${selectFields.join(',')}`];

    if (searchText) {
      queryParts.push(`$filter=substringof('${odataStringLiteral(searchText)}',Title)`);
    }

    if (sortColumn) {
      assertODataIdentifier(sortColumn, 'sort column');
      queryParts.push(`$orderby=${sortColumn} ${sortDescending ? 'desc' : 'asc'}`);
    }

    queryParts.push(`$top=${MAX_ITEMS}`);

    const itemsUrl = `${this._siteUrl}/_api/web/lists/getbytitle('${odataStringLiteral(config.listTitle)}')/items?${queryParts.join('&')}`;
    const data = await this._getJson<{ value: Record<string, unknown>[] }>(itemsUrl, 'items');

    const items: IListItem[] = data.value.map(item => {
      const rawId = item['Id'];
      const id = typeof rawId === 'number' || typeof rawId === 'string' ? `${rawId}` : '';
      return { ...item, id };
    });

    return { items, totalCount: items.length, columns };
  }

  private async _resolveColumns(config: IListViewConfig): Promise<{ columns: IListColumn[]; selectFields: string[] }> {
    if (config.viewName) {
      const views = await this.getViews(config.listTitle);
      const matchedView = views.find(v => v.Title === config.viewName);
      const viewFields = matchedView?.ViewFields?.Items?.filter(f => !HIDDEN_VIEW_FIELDS.has(f)) ?? [];
      if (viewFields.length > 0) {
        return {
          columns: viewFields.map((f, i) => buildColumn(f, f, i)),
          selectFields: ['Id', ...viewFields]
        };
      }
    }

    const fields = await this.getListFields(config.listTitle);
    const topFields = fields.slice(0, 8);
    return {
      columns: topFields.map((f, i) => buildColumn(f.InternalName, f.Title, i)),
      selectFields: ['Id', ...topFields.map(f => f.InternalName)]
    };
  }

  private async _getJson<T>(url: string, context: string): Promise<T> {
    const response: SPHttpClientResponse = await this._spHttpClient.get(url, SPHttpClient.configurations.v1);
    if (!response.ok) {
      throw new SharePointListError(`Failed to fetch ${context}: ${response.statusText}`, response.status);
    }
    return response.json() as Promise<T>;
  }
}

function buildColumn(fieldName: string, displayName: string, index: number): IListColumn {
  return {
    key: fieldName,
    name: displayName,
    fieldName,
    minWidth: 80,
    maxWidth: index === 0 ? 250 : 180,
    isResizable: true
  };
}
