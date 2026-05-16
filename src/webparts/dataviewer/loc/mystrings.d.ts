declare interface IDataviewerWebPartStrings {
  PropertyPaneDescription: string;
  ManageViewsGroup: string;
  AddViewButton: string;
  RemoveViewButton: string;
  NoViewsConfigured: string;
  ViewTitleLabel: string;
  ListTitleLabel: string;
  ListTitleDescription: string;
  ViewNameLabel: string;
  ViewNameDescription: string;
  PageSizeLabel: string;
  EnableSearchLabel: string;
  EnableSortLabel: string;
  EnablePaginationLabel: string;
  RequiredFieldError: string;
}

declare module 'DataviewerWebPartStrings' {
  const strings: IDataviewerWebPartStrings;
  export = strings;
}
