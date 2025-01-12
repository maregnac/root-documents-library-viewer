export interface ITreeItem {
  id: string;
  text: string;
  items?: ITreeItem[];
  children?: ITreeItem[];
  expanded?: boolean;
}