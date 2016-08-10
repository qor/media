package media_library

import (
	"bytes"
	"mime/multipart"

	"github.com/disintegration/imaging"
)

var mediaHandlers = make(map[string]MediaHandler)

// MediaHandler media library handler interface, defined which files could be handled, and the handler
type MediaHandler interface {
	CouldHandle(media Media) bool
	Handle(media Media, file multipart.File, option *Option) error
}

// RegisterMediaHandler register Media library handler
func RegisterMediaHandler(name string, handler MediaHandler) {
	mediaHandlers[name] = handler
}

// imageHandler default image handler
type imageHandler struct{}

func (imageHandler) CouldHandle(media Media) bool {
	return media.IsImage()
}

func (imageHandler) Handle(media Media, file multipart.File, option *Option) (err error) {
	if err = media.Store(media.URL("original"), option, file); err == nil {
		file.Seek(0, 0)

		if img, err := imaging.Decode(file); err == nil {
			if format, err := getImageFormat(media.URL()); err == nil {
				if cropOption := media.GetCropOption("original"); cropOption != nil {
					img = imaging.Crop(img, *cropOption)
				}

				// Save default image
				var buffer bytes.Buffer
				imaging.Encode(&buffer, img, *format)
				media.Store(media.URL(), option, &buffer)

				for key, size := range media.GetSizes() {
					newImage := img
					if cropOption := media.GetCropOption(key); cropOption != nil {
						newImage = imaging.Crop(newImage, *cropOption)
					}

					dst := imaging.Thumbnail(newImage, size.Width, size.Height, imaging.Lanczos)
					var buffer bytes.Buffer
					imaging.Encode(&buffer, dst, *format)
					media.Store(media.URL(key), option, &buffer)
				}
			}
		}
	}

	return err
}

func init() {
	RegisterMediaHandler("image_handler", imageHandler{})
}
