import * as React from 'react';
import styles from './RootDocumentLibraryViewer.module.scss';
import type { IRootDocumentLibraryViewerProps } from './IRootDocumentLibraryViewerProps';
import { IRootDocumentLibraryViewerState } from './IRootDocumentLibraryViewerState';

import * as $ from 'jquery';
import 'jquery-ui-dist/jquery-ui';
import 'jquery-ui-dist/jquery-ui.css';
 
import { SPFI, spfi, SPFx } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/items";
import "@pnp/sp/folders";
import "@pnp/sp/lists";
import { IFolderInfo } from '@pnp/sp/folders';
import { ITreeItem } from './ITreeItem';
import FilesBrowser from './FilesBrowser';
import { SPHttpClient } from '@microsoft/sp-http';

export default class RootDocumentLibraryViewer extends React.Component<IRootDocumentLibraryViewerProps, IRootDocumentLibraryViewerState> {
  private sp:SPFI = spfi().using(SPFx(this.props.context));
  private leftPaneRef = React.createRef<HTMLDivElement>();
  private rightPaneRef = React.createRef<HTMLDivElement>();
  private treeContainer: React.RefObject<HTMLDivElement> = React.createRef();

  
  constructor(props: IRootDocumentLibraryViewerProps | Readonly<IRootDocumentLibraryViewerProps>)
  {
      super(props);
      this.state = {
          folders: [],
          currentURL: "",
               dataSource: [
                  {
                    title: '3D models',
                    contentType: '3Ds',
                    content: []
                  },
                  {
                    title: 'Images',
                    contentType: 'images',
                    content: []
                  },
                  {
                    title: 'Drawings',
                    contentType: 'drawings',
                    content: []
                  }
                ],
          searchQuery: "",
          isLoading: true
      } 
      this.treeContainer = React.createRef();
      this.getFoldersDocuments();
  }

  componentDidMount() {
      if (this.leftPaneRef.current) {
          ($(this.leftPaneRef.current) as any).resizable({
              handles: 'e',
              minWidth: 200,
              maxWidth: 600,
              resize: (event: JQuery.Event, ui: { element: JQuery; size: { width: number } }) => {
                  if (this.rightPaneRef.current) {
                      const containerWidth = ui.element.parent()?.width();
                      if (containerWidth) {
                          const rightWidth = containerWidth - ui.size.width;
                          $(this.rightPaneRef.current).width(rightWidth);
                      }
                  }
              }
          });
      }
  }

  componentWillUnmount() {
      if (this.leftPaneRef.current) {
          ($(this.leftPaneRef.current) as any).resizable('destroy');
      }
  }

  private async getFolders(rootFolders: IFolderInfo[]): Promise<ITreeItem[]> {
      try {
          const result: ITreeItem[] = await Promise.all(
              rootFolders.map(async (folder) => ({
                  id: folder.ServerRelativeUrl,
                  text: folder.Name,
                  items: await this.getFolders(await this.getFoldersById(folder.ServerRelativeUrl)),
                  expanded: false,
              }))
          );
  
          return result;
      } catch (error) {
          console.error("Error in getFolders:", error);
          return [];
      }
  }

  async getFoldersById(serverRelativeUrl: string): Promise<IFolderInfo[]> {
      try {
          const folder = this.sp.web.getFolderByServerRelativePath(serverRelativeUrl);
          const folders = await folder.folders();
          return folders;
      } catch (error) {
          console.error(`Error getting folders by ServerRelativeUrl: ${serverRelativeUrl}`, error);
          return [];
      }
  }

  
private async getFolderContent() {
  if (this.state.currentURL.length > 0) {    
    const encodedUrl = encodeURIComponent(this.state.currentURL);    
    const requestUrl = `${this.props.context.pageContext.web.absoluteUrl}/_api/web/getFolderByServerRelativeUrl('${encodedUrl}')/files`;
    
    try {
      const response = await this.props.context.spHttpClient.get(
        requestUrl, 
        SPHttpClient.configurations.v1
      );

      if (response.ok) {
        const responseJSON = await response.json();
        
        if (responseJSON?.value) {
          const files = responseJSON.value;
          
          const newDataSource = this.state.dataSource.map(item => {
            switch (item.contentType) {
              case '3Ds':
                return {
                  ...item,
                  content: files.filter((file: { Name: string }) => 
                    file.Name.toLowerCase().endsWith(".stl") ||
                    file.Name.toLowerCase().endsWith(".obj") ||
                    file.Name.toLowerCase().endsWith(".dxf")
                  )
                };
              case 'images':
                return {
                  ...item,
                  content: files.filter((file: { Name: {toLowerCase: any;endsWith: (arg0: string) => any;} }) =>               
                    file.Name.toLowerCase().endsWith(".jpg") || 
                    file.Name.toLowerCase().endsWith(".gif") || 
                    file.Name.toLowerCase().endsWith(".png")
                  )
                };
              case 'drawings':
                return {
                  ...item,
                  content: files.filter((file: { Name: { endsWith: (arg0: string) => any; }; }) => 
                    file.Name.endsWith(".pdf")
                  )
                };
              default:
                return item;
            }
          });

          this.setState({ 
            dataSource: newDataSource
          });
        }
      }
    } catch (error) {
      console.error('Error fetching folder content:', error);
    }
  }
}


  private async getFoldersDocuments()
  {
      try {
          this.setState({ isLoading: true });
          const library = await this.sp.web.defaultDocumentLibrary();
          const rootFolders: IFolderInfo[] = await this.sp.web.lists
              .getById(library.Id)
              .rootFolder
              .folders();

          this.setState({
              folders: (await this.getFolders(rootFolders)).sort((a,b)=>a.text>b.text?1:-1),
              isLoading: false
          });
      } catch (error) {
          console.error('Error getting default document library:', error);
          this.setState({ isLoading: false });
      }
  }

  private initializeTreeView() {
      const container = this.treeContainer.current;
      if (!container) return;
      
      $(container).on('click', '.tree-item-content', (e) => {
          const target = $(e.currentTarget).parent('.tree-item');
          const id = target.data('id');
          
          $(container).find('.tree-item').removeClass('selected');
          target.addClass('selected');
          
          this.setState({currentURL: id}, () => {
              this.getFolderContent();
          });
          
          if ($(e.target).hasClass('expand-icon')) {
              const children = target.children('.tree-children');
              if (children.length) {
                  children.slideToggle();
                  target.toggleClass('expanded');

                  const icon = target.find('.expand-icon').first();
                  if (target.hasClass('expanded')) {
                      icon.html('−');
                  } else {
                      icon.html('+');
                  }
              }
          }
          
          e.stopPropagation();
      });
  }

  private renderTreeItem(item: ITreeItem): string {
      const hasChildren = item.items && item.items.length > 0;
      const isSelected = item.id === this.state.currentURL;
      
      const childrenHtml = hasChildren 
          ? `<div class="tree-children" style="display: ${item.expanded ? 'block' : 'none'}; margin-left: 20px;">
              ${item.items?.map(child => this.renderTreeItem(child)).join('')}
             </div>`
          : '';

      return `
          <div class="tree-item ${item.expanded ? 'expanded' : ''} ${isSelected ? 'selected' : ''}" data-id="${item.id}">
              <div class="tree-item-content" style="display: flex; align-items: center;">
                  ${hasChildren ? `<span class="expand-icon">${item.expanded ? '−' : '+'}</span>` : '<span style="width: 20px;"></span>'}
                  <span class="item-text">${item.text}</span>
              </div>
              ${childrenHtml}
          </div>
      `;
  }

  componentDidUpdate(prevProps: IRootDocumentLibraryViewerProps, prevState: IRootDocumentLibraryViewerState) {
      if (prevState.folders !== this.state.folders) {
          if (this.treeContainer.current) {
              this.treeContainer.current.innerHTML = this.state.folders
                  .map(folder => this.renderTreeItem(folder))
                  .join('');
              this.initializeTreeView();
          }
      }
  }

  private filterTree(items: ITreeItem[], searchQuery: string): ITreeItem[] {
      return items.reduce((filtered: ITreeItem[], item) => {
          const matchesSearch = item.text.toLowerCase().indexOf(searchQuery.toLowerCase()) !== -1;
          const filteredChildren = item.items ? this.filterTree(item.items, searchQuery) : [];
          
          if (matchesSearch || filteredChildren.length > 0) {
              filtered.push({
                  ...item,
                  items: filteredChildren,
                  expanded: searchQuery.length > 0
              });
          }
          return filtered;
      }, []);
  }

  private handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
      const searchQuery = event.target.value;
      this.setState({ searchQuery }, () => {
          if (this.treeContainer.current) {
              const filteredFolders = this.filterTree(this.state.folders, searchQuery);
              this.treeContainer.current.innerHTML = filteredFolders
                  .map(folder => this.renderTreeItem(folder))
                  .join('');
              this.initializeTreeView();
          }
      });
  };

public render(): React.ReactElement<IRootDocumentLibraryViewerProps> {
  return (
      <div className={styles.container}>
          {this.state.isLoading && (
              <div className={styles.loadingContainer}>
                  <div className={styles.loadingSpinner}>↻</div>
                  <div>Wait...</div>
              </div>
          )}
          <div ref={this.leftPaneRef} className={styles.leftPane}>
              <div className={styles.searchContainer}>
                  <input
                      type="text"
                      value={this.state.searchQuery}
                      onChange={this.handleSearch}
                      className={styles.searchInput}
                  />
              </div>
              <div 
                  ref={this.treeContainer}
                  className={styles['tree-container']}
                  style={{ height: 'calc(100vh - 50px)', overflowY: 'auto' }}
              >
              </div>
          </div>
          <div ref={this.rightPaneRef} className={styles.rightPane}>
              <FilesBrowser 
                  dataSource={this.state.dataSource}
                  context={this.props.context} 
              />
          </div>
      </div>
  );
}
}
