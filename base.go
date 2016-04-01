package media_library

import (
	"bytes"
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
	"html/template"
	"image"
	"io"
	"mime/multipart"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"

	"github.com/disintegration/imaging"
	"github.com/jinzhu/gorm"
	"github.com/jinzhu/inflection"
	"github.com/qor/admin"
	"github.com/qor/qor"
	"github.com/qor/qor/resource"
	"github.com/qor/qor/utils"
)

// CropOption includes crop options
type CropOption struct {
	X, Y, Width, Height int
}

// FileHeader is an interface, for matched values, when call its `Open` method will return `multipart.File`
type FileHeader interface {
	Open() (multipart.File, error)
}

type fileWrapper struct {
	*os.File
}

func (fileWrapper *fileWrapper) Open() (multipart.File, error) {
	return fileWrapper.File, nil
}

// Base defined a base struct for storages
type Base struct {
	FileName    string
	Url         string
	CropOptions map[string]*CropOption `json:",omitempty"`
	Crop        bool                   `json:"-"`
	Delete      bool                   `json:"-"`
	FileHeader  FileHeader             `json:"-"`
	Reader      io.Reader              `json:"-"`
	cropped     bool
}

// Scan scan files, crop options, db values into struct
func (b *Base) Scan(data interface{}) (err error) {
	switch values := data.(type) {
	case *os.File:
		b.FileHeader = &fileWrapper{values}
		b.FileName = path.Base(values.Name())
	case []*multipart.FileHeader:
		if len(values) > 0 {
			file := values[0]
			b.FileHeader, b.FileName = file, file.Filename
		}
	case []byte:
		if err = json.Unmarshal(values, b); err == nil {
			var doCrop struct{ Crop bool }
			if err = json.Unmarshal(values, &doCrop); err == nil && doCrop.Crop {
				b.Crop = true
			}
		}
	case string:
		b.Scan([]byte(values))
	case []string:
		for _, str := range values {
			b.Scan(str)
		}
	default:
		err = errors.New("unsupported driver -> Scan pair for MediaLibrary")
	}
	return
}

// Value return struct's Value
func (b Base) Value() (driver.Value, error) {
	if b.Delete {
		return nil, nil
	}

	results, err := json.Marshal(b)
	return string(results), err
}

// URL return file's url with given style
func (b Base) URL(styles ...string) string {
	if b.Url != "" && len(styles) > 0 {
		ext := path.Ext(b.Url)
		return fmt.Sprintf("%v.%v%v", strings.TrimSuffix(b.Url, ext), styles[0], ext)
	}
	return b.Url
}

// String return file's url
func (b Base) String() string {
	return b.URL()
}

// GetFileName get file's name
func (b Base) GetFileName() string {
	return b.FileName
}

// GetFileHeader get file's header, this value only exists when saving files
func (b Base) GetFileHeader() FileHeader {
	return b.FileHeader
}

// GetURLTemplate get url template
func (b Base) GetURLTemplate(option *Option) (path string) {
	if path = option.Get("URL"); path == "" {
		path = "/system/{{class}}/{{primary_key}}/{{column}}/{{filename_with_hash}}"
	}
	return
}

func getFuncMap(scope *gorm.Scope, field *gorm.Field, filename string) template.FuncMap {
	hash := func() string { return strings.Replace(time.Now().Format("20060102150506.000000000"), ".", "", -1) }
	return template.FuncMap{
		"class":       func() string { return inflection.Plural(utils.ToParamString(scope.GetModelStruct().ModelType.Name())) },
		"primary_key": func() string { return fmt.Sprintf("%v", scope.PrimaryKeyValue()) },
		"column":      func() string { return strings.ToLower(field.Name) },
		"filename":    func() string { return filename },
		"basename":    func() string { return strings.TrimSuffix(path.Base(filename), path.Ext(filename)) },
		"hash":        hash,
		"filename_with_hash": func() string {
			return fmt.Sprintf("%v.%v%v", strings.TrimSuffix(filename, path.Ext(filename)), hash(), path.Ext(filename))
		},
		"extension": func() string { return strings.TrimPrefix(path.Ext(filename), ".") },
	}
}

// GetURL get default URL for a model based on its options
func (b Base) GetURL(option *Option, scope *gorm.Scope, field *gorm.Field, templater URLTemplater) string {
	if path := templater.GetURLTemplate(option); path != "" {
		tmpl := template.New("").Funcs(getFuncMap(scope, field, b.GetFileName()))
		if tmpl, err := tmpl.Parse(path); err == nil {
			var result = bytes.NewBufferString("")
			if err := tmpl.Execute(result, scope.Value); err == nil {
				return result.String()
			}
		}
	}
	return ""
}

// Cropped mark the image to be cropped
func (b *Base) Cropped(values ...bool) (result bool) {
	result = b.cropped
	for _, value := range values {
		b.cropped = value
	}
	return result
}

// NeedCrop return the file needs to be cropped or not
func (b *Base) NeedCrop() bool {
	return b.Crop
}

// GetCropOption get crop options
func (b *Base) GetCropOption(name string) *image.Rectangle {
	if cropOption := b.CropOptions[strings.Split(name, "@")[0]]; cropOption != nil {
		return &image.Rectangle{
			Min: image.Point{X: cropOption.X, Y: cropOption.Y},
			Max: image.Point{X: cropOption.X + cropOption.Width, Y: cropOption.Y + cropOption.Height},
		}
	}
	return nil
}

// Retrieve retrieve file content with url
func (b Base) Retrieve(url string) (*os.File, error) {
	return nil, errors.New("not implemented")
}

// GetSizes get configed sizes
func (b Base) GetSizes() map[string]Size {
	return map[string]Size{}
}

// IsImage return if it is an image
func (b Base) IsImage() bool {
	_, err := getImageFormat(b.URL())
	return err == nil
}

// ConfigureQorMetaBeforeInitialize configure this field for Qor Admin
func (Base) ConfigureQorMetaBeforeInitialize(meta resource.Metaor) {
	if meta, ok := meta.(*admin.Meta); ok {
		meta.Type = "file"

		if meta.GetFormattedValuer() == nil {
			meta.SetFormattedValuer(func(value interface{}, context *qor.Context) interface{} {
				return utils.Stringify(meta.GetValuer()(value, context))
			})
		}

		admin.RegisterViewPath("github.com/qor/media_library/views")
	}
}

func getImageFormat(url string) (*imaging.Format, error) {
	formats := map[string]imaging.Format{
		".jpg":  imaging.JPEG,
		".jpeg": imaging.JPEG,
		".png":  imaging.PNG,
		".tif":  imaging.TIFF,
		".tiff": imaging.TIFF,
		".bmp":  imaging.BMP,
		".gif":  imaging.GIF,
	}

	ext := strings.ToLower(filepath.Ext(url))
	if f, ok := formats[ext]; ok {
		return &f, nil
	}
	return nil, imaging.ErrUnsupportedFormat
}
