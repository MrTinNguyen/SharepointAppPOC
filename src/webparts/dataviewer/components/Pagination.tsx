import * as React from 'react';
import { DefaultButton, IconButton, Stack, Text } from '@fluentui/react';
import styles from './Dataviewer.module.scss';

export interface IPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function buildPaginationItems(totalPages: number, currentPage: number): (number | string)[] {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => Math.abs(p - currentPage) <= 2 || p === 1 || p === totalPages);
  const result: (number | string)[] = [];
  for (let i = 0; i < pages.length; i++) {
    if (i > 0 && pages[i] - pages[i - 1] > 1) {
      result.push(`ellipsis-${pages[i]}`);
    }
    result.push(pages[i]);
  }
  return result;
}

export const Pagination: React.FC<IPaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  const items = buildPaginationItems(totalPages, currentPage);

  return (
    <Stack
      horizontal
      horizontalAlign="center"
      verticalAlign="center"
      tokens={{ childrenGap: 8 }}
      className={styles.pagination}
    >
      <IconButton
        iconProps={{ iconName: 'ChevronLeft' }}
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        ariaLabel="Previous page"
      />
      {items.map(p =>
        typeof p === 'string' ? (
          <Text key={p} className={styles.paginationEllipsis}>…</Text>
        ) : (
          <DefaultButton
            key={p}
            text={String(p)}
            primary={p === currentPage}
            onClick={() => onPageChange(p)}
            className={styles.pageButton}
            ariaLabel={`Page ${p}`}
          />
        )
      )}
      <IconButton
        iconProps={{ iconName: 'ChevronRight' }}
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        ariaLabel="Next page"
      />
      <Text variant="small" className={styles.pageInfo}>
        Page {currentPage} of {totalPages}
      </Text>
    </Stack>
  );
};
