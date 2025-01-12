import * as React from 'react';
import styles from './PDFsGallery.module.scss';

export interface IPDFsGalleryProps {
  absoluteUrl: string;
  data: any[];
}

interface IPDFsGalleryState {
  selectedPdfIndex: number;
  isViewerOpen: boolean;
  thumbnails: { [key: string]: string };
}

export default class PDFsGallery extends React.Component<IPDFsGalleryProps, IPDFsGalleryState> {
  constructor(props: IPDFsGalleryProps) {
    super(props);
    this.state = {
      selectedPdfIndex: 0,
      isViewerOpen: false,
      thumbnails: {}
    };
  }

  componentDidMount() {
    this.generateThumbnails();
  }

  private generateThumbnails = async () => {
    const thumbnails: { [key: string]: string } = {};
    
    for (const item of this.props.data) {
      const pdfUrl = `${this.props.absoluteUrl.replace("/", "//") + item.ServerRelativeUrl.replace("/", "//")}`;
      thumbnails[item.Name] = `${pdfUrl}#page=1&view=FitH`;
    }

    this.setState({ thumbnails });
  };

  private openPdfViewer = (index: number) => {
    this.setState({
      selectedPdfIndex: index,
      isViewerOpen: true
    });
  };

  private closePdfViewer = () => {
    this.setState({ isViewerOpen: false });
  };

  private navigatePdf = (direction: 'prev' | 'next') => {
    this.setState(prevState => {
      let newIndex = direction === 'next' 
        ? prevState.selectedPdfIndex + 1 
        : prevState.selectedPdfIndex - 1;

      if (newIndex >= this.props.data.length) newIndex = 0;
      if (newIndex < 0) newIndex = this.props.data.length - 1;

      return { selectedPdfIndex: newIndex };
    });
  };

  public render(): React.ReactElement<IPDFsGalleryProps> {
    const { selectedPdfIndex, isViewerOpen, thumbnails } = this.state;
    const selectedPdf = this.props.data[selectedPdfIndex];

    return (
      <div className={styles.modelsGallery}>
        <div className={styles.modelsContainer}>
          {this.props.data.map((item, index) => (
            <div 
              key={index} 
              className={styles.modelItem}
              onClick={() => this.openPdfViewer(index)}
            >
              <div className={styles.modelTitle}>{item.Name}</div>
              <div className={styles.pdfThumbnail}>
                {thumbnails[item.Name] && (
                  <div className={styles.thumbnailWrapper}>
                    <iframe
                      src={thumbnails[item.Name]}
                      className={styles.thumbnail}
                      title={`${item.Name} thumbnail`}
                    />
                    <div className={styles.overlay}>
                      <span className={styles.viewIcon}>👁</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {isViewerOpen && (
          <div className={styles.pdfViewer}>
            <div className={styles.viewerOverlay} onClick={this.closePdfViewer} />
            <div className={styles.viewerContent}>
              <button 
                className={`${styles.navButton} ${styles.prevButton}`}
                onClick={(e) => {
                  e.stopPropagation();
                  this.navigatePdf('prev');
                }}
              >
                ❮
              </button>
              <iframe
                src={`${this.props.absoluteUrl.replace("/", "//") + selectedPdf.ServerRelativeUrl.replace("/", "//")}#view=FitH`}
                className={styles.pdfFrame}
                title={selectedPdf.Name}
              />
              <button 
                className={`${styles.navButton} ${styles.nextButton}`}
                onClick={(e) => {
                  e.stopPropagation();
                  this.navigatePdf('next');
                }}
              >
                ❯
              </button>
              <button 
                className={styles.closeButton}
                onClick={this.closePdfViewer}
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
}
 

