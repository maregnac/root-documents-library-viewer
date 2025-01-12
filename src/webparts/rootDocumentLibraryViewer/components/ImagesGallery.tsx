import * as React from 'react';
import * as $ from 'jquery';
import styles from './ImagesGallery.module.scss';

export interface IImagesGalleryProps {
    absoluteUrl: string;
    data: any[];
}

interface IImagesGalleryState {
    currentIndex: number;
}

export default class ImagesGallery extends React.Component<IImagesGalleryProps, IImagesGalleryState> {
    private galleryRef: React.RefObject<HTMLDivElement>;

    constructor(props: IImagesGalleryProps) {
        super(props);
        this.state = {
            currentIndex: 0
        };
        this.galleryRef = React.createRef();
    }

    componentDidMount() {
        this.initializeGallery();
    }

    componentDidUpdate(prevProps: IImagesGalleryProps) {
        if (prevProps.data !== this.props.data) {
            this.initializeGallery();
        }
    }

    private initializeGallery() {
        if (!this.galleryRef.current) return;
        const $gallery = $(this.galleryRef.current as HTMLDivElement);
        const $images = $gallery.find('.gallery-image');
        const $prevButton = $gallery.find(`.${styles.navButton}.${styles.prev}`);
        const $nextButton = $gallery.find(`.${styles.navButton}.${styles.next}`);
        const $indicators = $gallery.find(`.${styles.indicator}`);

        const updateGallery = (index: number) => {
            $images.hide();
            $($images[index]).fadeIn();
            $indicators.removeClass('active');
            $($indicators[index]).addClass('active');
            this.setState({ currentIndex: index });
        };

        // Очищаем старые обработчики перед добавлением новых
        $prevButton.off('click');
        $nextButton.off('click');
        $indicators.off('click');

        $prevButton.on('click', () => {
            let newIndex = this.state.currentIndex - 1;
            if (newIndex < 0) newIndex = $images.length - 1;
            updateGallery(newIndex);
        });

        $nextButton.on('click', () => {
            let newIndex = this.state.currentIndex + 1;
            if (newIndex >= $images.length) newIndex = 0;
            updateGallery(newIndex);
        });

        $indicators.on('click', function() {
            const index = $(this).index();
            updateGallery(index);
        });

        // Показываем первое изображение
        updateGallery(0);
    }

    render() {
        const dataSource = this.props.data.map(item => ({
            original: this.props.absoluteUrl.replace("/","//") + item.ServerRelativeUrl.replace("/","//")
        }));

        if (!dataSource.length) {
            return (
                <div className={styles.messageContainer}>
                    No images found
                </div>
            );
        }

        return (
            <div ref={this.galleryRef} className={styles.galleryContainer}>
                <div className={styles.mainGallery}>
                    {dataSource.map((item, index) => (
                        <div
                            key={index}
                            className={`gallery-image ${styles.galleryImage}`}
                        >
                            <img
                                src={item.original}
                                alt={`gallery item ${index + 1}`}
                            />
                        </div>
                    ))}
                    
                    <button className={`${styles.navButton} ${styles.prev}`}>❮</button>
                    <button className={`${styles.navButton} ${styles.next}`}>❯</button>
                </div>

                <div className={styles.thumbnailStrip}>
                    {dataSource.map((item, index) => (
                        <div
                            key={index}
                            className={`${styles.thumbnail} ${index === this.state.currentIndex ? styles.active : ''}`}
                            onClick={() => {
                                if (!this.galleryRef.current) return;
                                const $gallery = $(this.galleryRef.current as HTMLDivElement);
                                const $images = $gallery.find('.gallery-image');
                                $images.hide();
                                $($images[index]).fadeIn();
                                this.setState({ currentIndex: index });
                            }}
                        >
                            <img
                                src={item.original}
                                alt={`thumbnail ${index + 1}`}
                            />
                        </div>
                    ))}
                </div>
            </div>
        );
    }
}
 

