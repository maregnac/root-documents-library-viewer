import { ITreeItem } from "./ITreeItem";

export interface IRootDocumentLibraryViewerState {
  currentURL: string;
  folders: ITreeItem[];
  dataSource: Array<{
    title: string;
    contentType: '3Ds' | 'images' | 'drawings';
    content: any[];
  }>;
  searchQuery: string;
  isLoading: boolean;
}
