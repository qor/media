package vips

import (
	"bytes"
	"io"

	"path"
	"strings"

	"github.com/qor/media"
	"github.com/theplant/bimg"
)

var (
	enableGenerateWebp = false
)

type Config struct {
	EnableGenerateWebp bool
}

type bimgImageHandler struct{}

func (bimgImageHandler) CouldHandle(media media.Media) bool {
	return media.IsImage()
}

func (bimgImageHandler) Handle(media media.Media, file media.FileInterface, option *media.Option) (err error) {
	// Crop & Resize
	var buffer bytes.Buffer
	if _, err := io.Copy(&buffer, file); err != nil {
		return err
	}

	// Save Original Image
	{
		img := copyImage(buffer.Bytes())
		bimgOption := bimg.Options{Lossless: true, Palette: true}
		// Process & Save original image
		if buf, err := img.Process(bimgOption); err == nil {
			media.Store(media.URL("original"), option, bytes.NewReader(buf))
		} else {
			return err
		}
		if err = generateWebp(media, option, bimgOption, buffer.Bytes(), "original"); err != nil {
			return err
		}
	}

	// Handle default image
	{
		img := copyImage(buffer.Bytes())
		bimgOption := bimg.Options{Palette: true}

		// Crop original image if specified
		if cropOption := media.GetCropOption("original"); cropOption != nil {
			bimgOption.Top = cropOption.Min.Y
			bimgOption.Left = cropOption.Min.X
			bimgOption.AreaWidth = cropOption.Max.X - cropOption.Min.X
			bimgOption.AreaHeight = cropOption.Max.Y - cropOption.Min.Y
		}

		if buf, err := img.Process(bimgOption); err == nil {
			if err = media.Store(media.URL(), option, bytes.NewReader(buf)); err != nil {
				return err
			}
			if err = generateWebp(media, option, bimgOption, buf); err != nil {
				return err
			}
		} else {
			return err
		}
	}

	// Handle size images
	for key, size := range media.GetSizes() {
		if key == "original" {
			continue
		}
		img := copyImage(buffer.Bytes())
		//bimgOption :=  bimg.Options{}
		if cropOption := media.GetCropOption(key); cropOption != nil {
			if _, err := img.Extract(cropOption.Min.Y, cropOption.Min.X, cropOption.Max.X-cropOption.Min.X, cropOption.Max.Y-cropOption.Min.Y); err != nil {
				return err
			}
		}
		// Process & Save size image
		if buf, err := img.Process(bimg.Options{
			Width:   size.Width,
			Height:  size.Height,
			Palette: true,
			Enlarge: true,
		}); err == nil {
			if err = media.Store(media.URL(key), option, bytes.NewReader(buf)); err != nil {
				return err
			}
			if err = generateWebp(media, option, bimg.Options{}, buf, key); err != nil {
				return err
			}
		} else {
			return err
		}
	}
	return
}

func generateWebp(media media.Media, option *media.Option, bimgOption bimg.Options, buffer []byte, size ...string) (err error) {
	if !enableGenerateWebp {
		return
	}
	img := copyImage(buffer)
	bimgOption.Type = bimg.WEBP
	if buf, err := img.Process(bimgOption); err == nil {
		url := media.URL(size...)
		ext := path.Ext(url)
		extArr := strings.Split(ext, "?")
		i := strings.LastIndex(url, ext)
		webpUrl := url[:i] + strings.Replace(url[i:], extArr[0], ".webp", 1)
		media.Store(webpUrl, option, bytes.NewReader(buf))
	} else {
		return err
	}
	return
}

func copyImage(buffer []byte) (img *bimg.Image) {
	bs := make([]byte, len(buffer))
	copy(bs, buffer)
	img = bimg.NewImage(bs)
	return
}

func UseVips(cfg Config) {
	if cfg.EnableGenerateWebp {
		enableGenerateWebp = true
	}
	media.RegisterMediaHandler("image_handler", bimgImageHandler{})
}
