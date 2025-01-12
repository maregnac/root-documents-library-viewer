import * as React from 'react';
import styles from './ModelsGallery.module.scss';
import ThreeJsViewer from './ThreeJsViewer';

export interface IModelsGalleryProps {
  absoluteUrl: string;
  data: any[];
}

export default class ModelsGallery extends React.Component<IModelsGalleryProps> {
  public render(): React.ReactElement<IModelsGalleryProps> {
    return (
      <div className={styles.modelsGallery}>
        <div className={styles.modelsContainer}>
          {this.props.data.map((item, index) => (
            <div key={index} className={styles.modelItem}>
              <div className={styles.modelTitle}>{item.Name}</div>
              <ThreeJsViewer
                stlPath={this.props.absoluteUrl.replace("/", "//") + item.ServerRelativeUrl.replace("/", "//")}
                width={300}
                height={200}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }
}
 

