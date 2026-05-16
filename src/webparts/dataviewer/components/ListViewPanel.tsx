import * as React from 'react';
import {
  DetailsList,
  DetailsListLayoutMode,
  IColumn,
  SelectionMode,
  Spinner,
  SpinnerSize,
  MessageBar,
  MessageBarType,
  SearchBox,
  Stack,
  Text,
  Shimmer,
  ShimmerElementType
} from '@fluentui/react';
import { SPHttpClient } from '@microsoft/sp-http';
import { IListViewConfig, IListItem, IListColumn } from '../models/IListView';
import { useListView } from '../hooks/useListView';
import { Pagination } from './Pagination';
import styles from './Dataviewer.module.scss';

export interface IListViewPanelProps {
  spHttpClient: SPHttpClient;
  siteUrl: string;
  config: IListViewConfig;
}

function renderCellValue(value: unknown): React.ReactElement {
  if (value === null || value === undefined) return <span>—</span>;
  if (typeof value === 'object') return <span>{JSON.stringify(value)}</span>;
  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  return <span>{`${value as string}`}</span>;
}

function buildItemCountLabel(totalCount: number): string {
  if (totalCount <= 0) return '';
  return `${totalCount} ${totalCount === 1 ? 'item' : 'items'}`;
}

function buildEmptyMessage(searchText: string): string {
  return searchText ? `No items found matching "${searchText}".` : 'No items found.';
}

export const ListViewPanel: React.FC<IListViewPanelProps> = ({ spHttpClient, siteUrl, config }) => {
  const {
    items,
    columns,
    totalCount,
    isLoading,
    error,
    currentPage,
    searchText,
    sortColumn,
    sortDescending,
    onSearchChange,
    onSortChange,
    onPageChange
  } = useListView(spHttpClient, siteUrl, config);

  const pageSize = config.pageSize || 10;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const detailsColumns: IColumn[] = columns.map((col: IListColumn) => {
    const isThisSorted = sortColumn === col.fieldName || sortColumn === col.key;
    return {
      key: col.key,
      name: col.name,
      fieldName: col.fieldName,
      minWidth: col.minWidth,
      maxWidth: col.maxWidth,
      isResizable: true,
      isSorted: isThisSorted,
      isSortedDescending: isThisSorted && sortDescending,
      onColumnClick: config.enableSort
        ? (_ev: React.MouseEvent, clickedCol: IColumn) => {
            const field = clickedCol.fieldName || clickedCol.key;
            const isDesc = sortColumn === field ? !sortDescending : false;
            onSortChange(field, isDesc);
          }
        : undefined,
      onRender: (item: IListItem) => renderCellValue(item[col.fieldName])
    };
  });

  const shimmerLines = Array.from({ length: Math.min(pageSize, 5) }, (_, i) => i);

  return (
    <section className={styles.listViewPanel} aria-label={config.title}>
      <Stack horizontal horizontalAlign="space-between" verticalAlign="center" className={styles.panelHeader}>
        <Text variant="xLarge" className={styles.viewTitle}>{config.title}</Text>
        <Text variant="small" className={styles.itemCount}>{buildItemCountLabel(totalCount)}</Text>
      </Stack>

      {config.enableSearch && (
        <SearchBox
          placeholder={`Search ${config.title}...`}
          value={searchText}
          onChange={(_ev, newVal) => onSearchChange(newVal || '')}
          onClear={() => onSearchChange('')}
          className={styles.searchBox}
          ariaLabel={`Search ${config.title}`}
        />
      )}

      {error && (
        <MessageBar messageBarType={MessageBarType.error} isMultiline={false} className={styles.errorBar}>
          {error}
        </MessageBar>
      )}

      {isLoading && items.length === 0 && (
        <div className={styles.shimmerContainer} aria-busy="true" aria-label="Loading data">
          {shimmerLines.map(i => (
            <Shimmer
              key={`shimmer-${i}`}
              shimmerElements={[
                { type: ShimmerElementType.line, height: 16, width: '30%' },
                { type: ShimmerElementType.gap, width: '2%' },
                { type: ShimmerElementType.line, height: 16, width: '25%' },
                { type: ShimmerElementType.gap, width: '2%' },
                { type: ShimmerElementType.line, height: 16, width: '35%' }
              ]}
              className={styles.shimmerLine}
            />
          ))}
        </div>
      )}

      {items.length === 0 && !isLoading && !error && (
        <output className={styles.emptyState}>
          <Text variant="medium">{buildEmptyMessage(searchText)}</Text>
        </output>
      )}

      {items.length > 0 && (
        <>
          <div className={styles.detailsListWrapper}>
            <DetailsList
              items={items}
              columns={detailsColumns}
              layoutMode={DetailsListLayoutMode.fixedColumns}
              selectionMode={SelectionMode.none}
              isHeaderVisible={true}
              compact={false}
            />
          </div>

          {isLoading && (
            <Spinner size={SpinnerSize.small} label="Loading..." className={styles.inlineSpinner} />
          )}

          {config.enablePagination && totalPages > 1 && (
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
          )}
        </>
      )}
    </section>
  );
};
