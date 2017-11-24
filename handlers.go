package media

import (
	"bytes"
	"image"
	"image/color"
	"image/draw"
	"image/gif"
	_ "image/jpeg"
	"io/ioutil"
	"math"

	"github.com/disintegration/imaging"
)

var mediaHandlers = make(map[string]MediaHandler)

// MediaHandler media library handler interface, defined which files could be handled, and the handler
type MediaHandler interface {
	CouldHandle(media Media) bool
	Handle(media Media, file FileInterface, option *Option) error
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

func resizeImageTo(img image.Image, size *Size) image.Image {
	var (
		imgSize    = img.Bounds().Size()
		background = imaging.New(size.Width, size.Height, color.NRGBA{0, 0, 0, 0})
		ratioX     = float64(size.Width) / float64(imgSize.X)
		ratioY     = float64(size.Height) / float64(imgSize.Y)
		// 100x200 -> 200x300  ==>  ratioX = 2,   ratioY = 1.5  ==> resize to (x1.5) = 150x300
		// 100x200 -> 20x50    ==>  ratioX = 0.2, ratioY = 0.4  ==> resize to (x0.2) = 20x40
		minRatio = math.Min(ratioX, ratioY)
	)
	img = imaging.Resize(img, int(float64(imgSize.X)*minRatio), int(float64(imgSize.Y)*minRatio), imaging.CatmullRom)
	return imaging.PasteCenter(background, img)
}

func (imageHandler) Handle(media Media, file FileInterface, option *Option) (err error) {
	var fileBuffer bytes.Buffer
	if fileBytes, err := ioutil.ReadAll(file); err == nil {
		fileBuffer.Write(fileBytes)

		if err = media.Store(media.URL("original"), option, &fileBuffer); err == nil {
			file.Seek(0, 0)

			if format, err := getImageFormat(media.URL()); err == nil {
				if *format == imaging.GIF {
					var buffer bytes.Buffer
					if g, err := gif.DecodeAll(file); err == nil {
						if cropOption := media.GetCropOption("original"); cropOption != nil {
							for i := range g.Image {
								img := imaging.Crop(g.Image[i], *cropOption)
								g.Image[i] = image.NewPaletted(img.Rect, g.Image[i].Palette)
								draw.Draw(g.Image[i], img.Rect, img, image.Pt(0, 0), draw.Src)
								if i == 0 {
									g.Config.Width = img.Rect.Dx()
									g.Config.Height = img.Rect.Dy()
								}
							}
						}

						gif.EncodeAll(&buffer, g)
						media.Store(media.URL(), option, &buffer)
					} else {
						return err
					}

					// save sizes image
					for key, size := range media.GetSizes() {
						file.Seek(0, 0)
						if g, err := gif.DecodeAll(file); err == nil {
							for i := range g.Image {
								var img image.Image = g.Image[i]
								if cropOption := media.GetCropOption(key); cropOption != nil {
									img = imaging.Crop(g.Image[i], *cropOption)
								}
								img = resizeImageTo(img, size)
								g.Image[i] = image.NewPaletted(image.Rect(0, 0, size.Width, size.Height), g.Image[i].Palette)
								draw.Draw(g.Image[i], image.Rect(0, 0, size.Width, size.Height), img, image.Pt(0, 0), draw.Src)
							}

							var result bytes.Buffer
							g.Config.Width = size.Width
							g.Config.Height = size.Height
							gif.EncodeAll(&result, g)
							media.Store(media.URL(key), option, &result)
						}
					}
				} else {
					if img, _, err := image.Decode(file); err == nil {
						// save original image
						if cropOption := media.GetCropOption("original"); cropOption != nil {
							img = imaging.Crop(img, *cropOption)
						}

						// Save default image
						var buffer bytes.Buffer
						imaging.Encode(&buffer, img, *format)
						media.Store(media.URL(), option, &buffer)

						// save sizes image
						for key, size := range media.GetSizes() {
							newImage := img
							if cropOption := media.GetCropOption(key); cropOption != nil {
								newImage = imaging.Crop(newImage, *cropOption)
							}

							var buffer bytes.Buffer
							imaging.Encode(&buffer, resizeImageTo(newImage, size), *format)
							media.Store(media.URL(key), option, &buffer)
						}
					} else {
						return err
					}
				}
			}
		} else {
			return err
		}
	}

	return err
}

func init() {
	RegisterMediaHandler("image_handler", imageHandler{})
}
