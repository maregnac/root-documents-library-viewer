import * as React from 'react';
import 'jquery-ui/dist/themes/base/jquery-ui.min.css';
import * as $ from 'jquery';
import 'jquery-ui/ui/widgets/accordion';
import { WebPartContext } from "@microsoft/sp-webpart-base";
import ImagesGallery from './ImagesGallery';
//import ThreeJsViewer from './ThreeJsViewer';
import ModelsGallery from './ModelsGallery';
import styles from './FilesBrowser.module.scss';
import PDFsGallery from './PDFsGallery';

export interface IFilesBrowserProps {
  dataSource: Array<{
    title: string;
    contentType: '3Ds' | 'images' | 'drawings';
    content: any[];
  }>;
  context: WebPartContext;
}

export interface IFilesBrowserState {
  requestUrl: string;
}

export default class FilesBrowser extends React.Component<IFilesBrowserProps, IFilesBrowserState> {
  private domen = "";
  private accordionRef = React.createRef<HTMLDivElement>();

  constructor(props: IFilesBrowserProps | Readonly<IFilesBrowserProps>) {
    super(props);
    this.state = {
      requestUrl: "",
    };
    const absoluteUrl = this.props.context.pageContext.site.absoluteUrl;
    const url = new URL(absoluteUrl);
    this.domen = url.protocol + "/" + url.hostname;
  }

  componentDidMount() {
    if (this.accordionRef.current) {
      ($(this.accordionRef.current) as any).accordion({
        active: 0,
        collapsible: true,
        heightStyle: "content",
        animate: 300
      });

      // Ensure the first panel is open
      setTimeout(() => {
        if (this.accordionRef.current) {
          ($(this.accordionRef.current) as any).accordion("option", "active", 0);
        }
      }, 0);
    }
  }

  componentDidUpdate(prevProps: IFilesBrowserProps) {
    if (prevProps.dataSource !== this.props.dataSource && this.accordionRef.current) {
      ($(this.accordionRef.current) as any).accordion('refresh');
      // Ensure first panel stays open after data update
      ($(this.accordionRef.current) as any).accordion("option", "active", 0);
    }
  }

  componentWillUnmount() {
    if (this.accordionRef.current) {
      ($(this.accordionRef.current) as any).accordion('destroy');
    }
  }

  private render3Ds = (data: any[]) => {
    return (
      <div>
        <ModelsGallery absoluteUrl={this.domen} data={data} />
      </div>
    );
  }

  private renderImages = (data: any[]) => {
    return (
      <div>
        <ImagesGallery absoluteUrl={this.domen} data={data} />
      </div>
    );
  }

  private renderDrawings = (data: any[]) => {
    return (
      <div>
          <PDFsGallery absoluteUrl={this.domen} data={data} />
      </div>
    );
  }

  private renderContent = (contentType: string, content: any[]) => {
    switch (contentType) {
      case '3Ds':
        return this.render3Ds(content);
      case 'images':
        return this.renderImages(content);
      case 'drawings':
        return this.renderDrawings(content);
      default:
        return <div>Unknown content type</div>;
    }
  }

  private getFilteredDataSource = () => {
    return this.props.dataSource.filter(item => item.content.length > 0);
  }

  public render(): JSX.Element {
    const filteredData = this.getFilteredDataSource();
    return (
      <div ref={this.accordionRef} className={styles.accordion}>
        {filteredData.map((item, index) => (
          <React.Fragment key={index}>
            <h3>{item.title}</h3>
            <div>
              {this.renderContent(item.contentType, item.content)}
            </div>
          </React.Fragment>
        ))}
      </div>
    );
  }
}