import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField,
  PropertyPaneToggle,
  PropertyPaneSlider,
  PropertyPaneButton,
  PropertyPaneButtonType,
  PropertyPaneLabel
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { IReadonlyTheme } from '@microsoft/sp-component-base';

import * as strings from 'DataviewerWebPartStrings';
import Dataviewer from './components/Dataviewer';
import { IDataviewerProps } from './components/IDataviewerProps';
import { IListViewConfig } from './models/IListView';

export interface IDataviewerWebPartProps {
  viewConfigs: IListViewConfig[];
}

export default class DataviewerWebPart extends BaseClientSideWebPart<IDataviewerWebPartProps> {

  private _isDarkTheme: boolean = false;
  private _editingViewIndex: number = 0;

  public render(): void {
    const element: React.ReactElement<IDataviewerProps> = React.createElement(
      Dataviewer,
      {
        siteUrl: this.context.pageContext.web.absoluteUrl,
        viewConfigs: this.properties.viewConfigs || [],
        isDarkTheme: this._isDarkTheme,
        hasTeamsContext: !!this.context.sdks.microsoftTeams,
        userDisplayName: this.context.pageContext.user.displayName,
        spHttpClient: this.context.spHttpClient
      }
    );

    ReactDom.render(element, this.domElement);
  }

  protected onInit(): Promise<void> {
    if (!this.properties.viewConfigs) {
      this.properties.viewConfigs = [];
    }
    return Promise.resolve();
  }

  protected onThemeChanged(currentTheme: IReadonlyTheme | undefined): void {
    if (!currentTheme) return;
    this._isDarkTheme = !!currentTheme.isInverted;
    const { semanticColors } = currentTheme;
    if (semanticColors) {
      this.domElement.style.setProperty('--bodyText', semanticColors.bodyText || null);
      this.domElement.style.setProperty('--link', semanticColors.link || null);
      this.domElement.style.setProperty('--linkHovered', semanticColors.linkHovered || null);
    }
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  private _addView(): void {
    const views = [...(this.properties.viewConfigs || [])];
    const newView: IListViewConfig = {
      id: `view_${Date.now()}`,
      title: `List View ${views.length + 1}`,
      listTitle: '',
      viewName: '',
      pageSize: 10,
      enableSearch: true,
      enableSort: true,
      enablePagination: true
    };
    views.push(newView);
    this.properties.viewConfigs = views;
    this._editingViewIndex = views.length - 1;
    this.context.propertyPane.refresh();
    this.render();
  }

  private _removeView(index: number): void {
    const views = [...(this.properties.viewConfigs || [])];
    views.splice(index, 1);
    this.properties.viewConfigs = views;
    this._editingViewIndex = Math.max(0, index - 1);
    this.context.propertyPane.refresh();
    this.render();
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    const views = this.properties.viewConfigs || [];
    const viewIndex = Math.min(this._editingViewIndex, views.length - 1);

    const viewGroups = views.map((view, idx) => ({
      groupName: view.title || `View ${idx + 1}`,
      isCollapsed: idx !== viewIndex,
      groupFields: [
        PropertyPaneLabel(`viewLabel_${idx}`, {
          text: `Editing: ${view.title || '(untitled)'}`
        }),
        PropertyPaneTextField(`viewConfigs[${idx}].title`, {
          label: strings.ViewTitleLabel,
          value: view.title,
          onGetErrorMessage: (val: string) => val ? '' : strings.RequiredFieldError
        }),
        PropertyPaneTextField(`viewConfigs[${idx}].listTitle`, {
          label: strings.ListTitleLabel,
          value: view.listTitle,
          description: strings.ListTitleDescription,
          onGetErrorMessage: (val: string) => val ? '' : strings.RequiredFieldError
        }),
        PropertyPaneTextField(`viewConfigs[${idx}].viewName`, {
          label: strings.ViewNameLabel,
          value: view.viewName || '',
          description: strings.ViewNameDescription
        }),
        PropertyPaneSlider(`viewConfigs[${idx}].pageSize`, {
          label: strings.PageSizeLabel,
          min: 5,
          max: 100,
          step: 5,
          value: view.pageSize
        }),
        PropertyPaneToggle(`viewConfigs[${idx}].enableSearch`, {
          label: strings.EnableSearchLabel,
          checked: view.enableSearch
        }),
        PropertyPaneToggle(`viewConfigs[${idx}].enableSort`, {
          label: strings.EnableSortLabel,
          checked: view.enableSort
        }),
        PropertyPaneToggle(`viewConfigs[${idx}].enablePagination`, {
          label: strings.EnablePaginationLabel,
          checked: view.enablePagination
        }),
        PropertyPaneButton(`removeView_${idx}`, {
          text: strings.RemoveViewButton,
          buttonType: PropertyPaneButtonType.Normal,
          icon: 'Delete',
          onClick: () => { this._removeView(idx); return ''; }
        })
      ]
    }));

    return {
      pages: [
        {
          header: { description: strings.PropertyPaneDescription },
          groups: [
            {
              groupName: strings.ManageViewsGroup,
              groupFields: [
                PropertyPaneButton('addView', {
                  text: strings.AddViewButton,
                  buttonType: PropertyPaneButtonType.Primary,
                  icon: 'Add',
                  onClick: () => { this._addView(); return ''; }
                }),
                ...(views.length === 0 ? [
                  PropertyPaneLabel('noViewsLabel', { text: strings.NoViewsConfigured })
                ] : [])
              ]
            },
            ...viewGroups
          ]
        }
      ]
    };
  }
}
