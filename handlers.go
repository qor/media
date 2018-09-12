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

func resizeImageTo(img image.Image, size *Size, format imaging.Format) image.Image {
	imgSize := img.Bounds().Size()

	switch {
	case size.Padding:
		var (
			backgroundColor = image.NewUniform(color.Transparent)
			ratioX          = float64(size.Width) / float64(imgSize.X)
			ratioY          = float64(size.Height) / float64(imgSize.Y)
			// 100x200 -> 200x300  ==>  ratioX = 2,   ratioY = 1.5  ==> resize to (x1.5) = 150x300
			// 100x200 -> 20x50    ==>  ratioX = 0.2, ratioY = 0.4  ==> resize to (x0.2) = 20x40
			// 100x200 -> 50x0     ==>  ratioX = 0.5, ratioY = 0    ==> resize to (x0.5) = 50x100
			minRatio = math.Min(ratioX, ratioY)
		)

		if format == imaging.JPEG {
			backgroundColor = image.NewUniform(color.White)
		}

		background := imaging.New(size.Width, size.Height, backgroundColor)
		fixFloat := func(x float64, y int) int {
			if math.Abs(x-float64(y)) < 1 {
				return y
			}
			return int(x)
		}

		if minRatio == 0 {
			minRatio = math.Max(ratioX, ratioY)

			if size.Width == 0 && size.Height != 0 {
				// size 50x0, source 100x200 => crop to 50x100
				newWidth := int(float64(imgSize.X) / float64(imgSize.Y) * float64(size.Height))
				background = imaging.New(newWidth, size.Height, backgroundColor)
			} else if size.Height == 0 && size.Width != 0 {
				// size 0x50, source 100x200 => crop to 25x50
				newHeight := int(float64(imgSize.Y) / float64(imgSize.X) * float64(size.Width))
				background = imaging.New(size.Width, newHeight, backgroundColor)
			} else if size.Height == 0 && size.Width == 0 {
				minRatio = 1
				background = imaging.New(imgSize.X, imgSize.Y, backgroundColor)
			}
		}

		backgroundSize := background.Bounds().Size()
		img = imaging.Resize(img, fixFloat(float64(imgSize.X)*minRatio, backgroundSize.X), fixFloat(float64(imgSize.Y)*minRatio, backgroundSize.Y), imaging.CatmullRom)
		return imaging.PasteCenter(background, img)
	default:
		width, height := size.Width, size.Height
		if width == 0 && height != 0 {
			// size 50x0, source 100x200 => crop to 50x100
			width = int(float64(imgSize.X) / float64(imgSize.Y) * float64(size.Height))
		} else if height == 0 && width != 0 {
			// size 0x50, source 100x200 => crop to 25x50
			height = int(float64(imgSize.Y) / float64(imgSize.X) * float64(size.Width))
		} else if height == 0 && width == 0 {
			width, height = imgSize.X, imgSize.Y
		}
		return imaging.Thumbnail(img, width, height, imaging.Lanczos)
	}
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
							var firstImage image.Image
							for i := range g.Image {
								if i == 0 {
									firstImage = g.Image[0]
								}
								var img image.Image = g.Image[i]
								//use first image as backgroud for small image
								if !img.Bounds().Min.Eq(firstImage.Bounds().Min) || !img.Bounds().Max.Eq(firstImage.Bounds().Max) {
									firstImagePaletted := imaging.Clone(firstImage)
									draw.Draw(firstImagePaletted, img.Bounds(), img, img.Bounds().Min, draw.Src)
									img = firstImagePaletted
								}
								img = imaging.Crop(img, *cropOption)
								g.Image[i] = image.NewPaletted(img.Bounds(), g.Image[i].Palette)
								draw.Draw(g.Image[i], img.Bounds(), img, image.Pt(0, 0), draw.Src)
								if i == 0 {
									g.Config.Width = img.Bounds().Dx()
									g.Config.Height = img.Bounds().Dy()
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
						if key == "original" {
							continue
						}
						file.Seek(0, 0)
						if g, err := gif.DecodeAll(file); err == nil {
							// Don't crop or resize when gif size equal to defined size
							if g.Config.Width == size.Width && g.Config.Height == size.Height {
								var result bytes.Buffer
								gif.EncodeAll(&result, g)
								media.Store(media.URL(key), option, &result)
								continue
							}
							var firstImage image.Image
							for i := range g.Image {
								var img image.Image = g.Image[i]
								if i == 0 {
									firstImage = g.Image[0]
								}
								//use first image as backgroud for small image
								if !img.Bounds().Min.Eq(firstImage.Bounds().Min) || !img.Bounds().Max.Eq(firstImage.Bounds().Max) {
									firstImagePaletted := imaging.Clone(firstImage)
									draw.Draw(firstImagePaletted, img.Bounds(), img, img.Bounds().Min, draw.Src)
									img = firstImagePaletted
								}
								if cropOption := media.GetCropOption(key); cropOption != nil {
									img = imaging.Crop(img, *cropOption)
								}

								img = resizeImageTo(img, size, *format)
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
						if len(media.GetSizes()) == 0 {
							if cropOption := media.GetCropOption("original"); cropOption != nil {
								img = imaging.Crop(img, *cropOption)
							}
						}

						// Save default image
						var buffer bytes.Buffer
						imaging.Encode(&buffer, img, *format)
						media.Store(media.URL(), option, &buffer)

						// save sizes image
						for key, size := range media.GetSizes() {
							if key == "original" {
								continue
							}

							newImage := img
							if cropOption := media.GetCropOption(key); cropOption != nil {
								newImage = imaging.Crop(newImage, *cropOption)
							}

							var buffer bytes.Buffer
							imaging.Encode(&buffer, resizeImageTo(newImage, size, *format), *format)
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
