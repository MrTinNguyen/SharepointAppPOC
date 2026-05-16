import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { SPHttpClient } from '@microsoft/sp-http';
import { SharePointListService, IFetchListDataResult } from '../services/SharePointListService';
import { IListViewConfig, IListItem, IListColumn } from '../models/IListView';
import { useDebounce } from './useDebounce';

const SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_PAGE_SIZE = 10;

interface State {
  visibleItems: IListItem[];
  columns: IListColumn[];
  totalCount: number;
  isLoading: boolean;
  error: string | undefined;
  currentPage: number;
  searchText: string;
  sortColumn: string;
  sortDescending: boolean;
}

type Action =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; columns: IListColumn[]; totalCount: number; visibleItems: IListItem[] }
  | { type: 'LOAD_ERROR'; error: string }
  | { type: 'SET_SEARCH'; text: string }
  | { type: 'SET_SORT'; column: string; descending: boolean }
  | { type: 'SET_PAGE'; page: number; visibleItems: IListItem[] };

const initialState: State = {
  visibleItems: [],
  columns: [],
  totalCount: 0,
  isLoading: false,
  error: undefined,
  currentPage: 1,
  searchText: '',
  sortColumn: '',
  sortDescending: false
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, isLoading: true, error: undefined };
    case 'LOAD_SUCCESS':
      return {
        ...state,
        isLoading: false,
        columns: action.columns,
        totalCount: action.totalCount,
        visibleItems: action.visibleItems,
        currentPage: 1
      };
    case 'LOAD_ERROR':
      return { ...state, isLoading: false, error: action.error };
    case 'SET_SEARCH':
      return { ...state, searchText: action.text };
    case 'SET_SORT':
      return { ...state, sortColumn: action.column, sortDescending: action.descending };
    case 'SET_PAGE':
      return { ...state, currentPage: action.page, visibleItems: action.visibleItems };
    default:
      return state;
  }
}

export interface IUseListViewState {
  items: IListItem[];
  columns: IListColumn[];
  totalCount: number;
  isLoading: boolean;
  error: string | undefined;
  currentPage: number;
  searchText: string;
  sortColumn: string;
  sortDescending: boolean;
  onSearchChange: (text: string) => void;
  onSortChange: (column: string, descending: boolean) => void;
  onPageChange: (page: number) => void;
}

export function useListView(
  spHttpClient: SPHttpClient,
  siteUrl: string,
  config: IListViewConfig
): IUseListViewState {
  const [state, dispatch] = useReducer(reducer, initialState);
  const debouncedSearch = useDebounce(state.searchText, SEARCH_DEBOUNCE_MS);
  const pageSize = config.pageSize || DEFAULT_PAGE_SIZE;

  const service = useMemo(
    () => new SharePointListService(spHttpClient, siteUrl),
    [spHttpClient, siteUrl]
  );

  // Full result set cached for instant client-side pagination.
  const allItemsRef = useRef<IListItem[]>([]);
  // Read-only access to current pageSize from the fetch effect — changing pageSize alone
  // must not trigger a refetch, just a re-slice.
  const pageSizeRef = useRef(pageSize);
  pageSizeRef.current = pageSize;

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: 'LOAD_START' });

    service
      .fetchListData(config, debouncedSearch, state.sortColumn, state.sortDescending)
      .then((result: IFetchListDataResult) => {
        if (cancelled) return;
        allItemsRef.current = result.items;
        dispatch({
          type: 'LOAD_SUCCESS',
          columns: result.columns,
          totalCount: result.items.length,
          visibleItems: result.items.slice(0, pageSizeRef.current)
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
        dispatch({ type: 'LOAD_ERROR', error: message });
      });

    return () => { cancelled = true; };
  }, [service, config, debouncedSearch, state.sortColumn, state.sortDescending]);

  // pageSize changed without other inputs changing — re-slice cached items, no refetch.
  useEffect(() => {
    dispatch({
      type: 'SET_PAGE',
      page: 1,
      visibleItems: allItemsRef.current.slice(0, pageSize)
    });
  }, [pageSize]);

  const onSearchChange = useCallback((text: string) => {
    dispatch({ type: 'SET_SEARCH', text });
  }, []);

  const onSortChange = useCallback((column: string, descending: boolean) => {
    dispatch({ type: 'SET_SORT', column, descending });
  }, []);

  const onPageChange = useCallback((page: number) => {
    const start = (page - 1) * pageSize;
    dispatch({
      type: 'SET_PAGE',
      page,
      visibleItems: allItemsRef.current.slice(start, start + pageSize)
    });
  }, [pageSize]);

  return {
    items: state.visibleItems,
    columns: state.columns,
    totalCount: state.totalCount,
    isLoading: state.isLoading,
    error: state.error,
    currentPage: state.currentPage,
    searchText: state.searchText,
    sortColumn: state.sortColumn,
    sortDescending: state.sortDescending,
    onSearchChange,
    onSortChange,
    onPageChange
  };
}
