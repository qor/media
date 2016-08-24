package media_library

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
	"path"
	"strings"

	"github.com/jinzhu/gorm"
	"github.com/qor/admin"
	"github.com/qor/qor"
	"github.com/qor/qor/resource"
)

type MediaLibrary struct {
	gorm.Model
	File MediaLibraryStorage `sql:"size:4294967295;"`
}

func (MediaLibrary) ConfigureQorResource(res resource.Resourcer) {
	if res, ok := res.(*admin.Resource); ok {
		res.UseTheme("grid")
		res.IndexAttrs("File")
	}
}

type MediaLibraryStorage struct {
	FileSystem
	Sizes map[string]Size `json:",omitempty"`
}

func (mediaLibraryStorage MediaLibraryStorage) GetSizes() map[string]Size {
	return mediaLibraryStorage.Sizes
}

func (mediaLibraryStorage *MediaLibraryStorage) Scan(data interface{}) (err error) {
	switch values := data.(type) {
	case []byte:
		cropOptions := mediaLibraryStorage.CropOptions
		sizeOptions := mediaLibraryStorage.Sizes

		if string(values) != "" {
			mediaLibraryStorage.Base.Scan(values)

			if err = json.Unmarshal(values, mediaLibraryStorage); err == nil {
				for key, value := range cropOptions {
					if _, ok := mediaLibraryStorage.CropOptions[key]; !ok {
						mediaLibraryStorage.CropOptions[key] = value
					}
				}

				for key, value := range sizeOptions {
					if _, ok := mediaLibraryStorage.Sizes[key]; !ok {
						mediaLibraryStorage.Sizes[key] = value
					}
				}
			}
		}
	case string:
		err = mediaLibraryStorage.Scan([]byte(values))
	case []string:
		for _, str := range values {
			if err = mediaLibraryStorage.Scan(str); err != nil {
				return err
			}
		}
	default:
		return mediaLibraryStorage.Base.Scan(data)
	}
	return nil
}

func (mediaLibraryStorage MediaLibraryStorage) Value() (driver.Value, error) {
	results, err := json.Marshal(mediaLibraryStorage)
	return string(results), err
}

func (mediaLibraryStorage MediaLibraryStorage) ConfigureQorMeta(metaor resource.Metaor) {
	if meta, ok := metaor.(*admin.Meta); ok {
		meta.SetFormattedValuer(func(record interface{}, context *qor.Context) interface{} {
			return meta.GetValuer()(record, context)
		})
	}
}

type MediaBox struct {
	Values string `json:"-"`
	Files  []File `json:",omitempty"`
}

func (mediaBox MediaBox) URL(styles ...string) string {
	for _, file := range mediaBox.Files {
		return file.URL(styles...)
	}
	return ""
}

func (mediaBox *MediaBox) Scan(data interface{}) (err error) {
	switch values := data.(type) {
	case []byte:
		if mediaBox.Values = string(values); mediaBox.Values != "" {
			return json.Unmarshal(values, &mediaBox.Files)
		}
	case string:
		return mediaBox.Scan([]byte(values))
	case []string:
		for _, str := range values {
			if err := mediaBox.Scan(str); err != nil {
				return err
			}
		}
	}
	return nil
}

func (mediaBox MediaBox) Value() (driver.Value, error) {
	if len(mediaBox.Files) > 0 {
		return json.Marshal(mediaBox.Files)
	}
	return mediaBox.Values, nil
}

func (mediaBox MediaBox) ConfigureQorMeta(metaor resource.Metaor) {
	if meta, ok := metaor.(*admin.Meta); ok {
		if meta.Config == nil {
			meta.Config = &MediaBoxConfig{}
		}

		if meta.FormattedValuer == nil {
			meta.FormattedValuer = func(record interface{}, context *qor.Context) interface{} {
				if mediaBox, ok := meta.GetValuer()(record, context).(*MediaBox); ok {
					return mediaBox.URL()
				}
				return ""
			}
			meta.SetFormattedValuer(meta.FormattedValuer)
		}

		if config, ok := meta.Config.(*MediaBoxConfig); ok {
			Admin := meta.GetBaseResource().(*admin.Resource).GetAdmin()
			if config.RemoteDataResource == nil {
				mediaLibraryResource := Admin.GetResource("MediaLibrary")
				if mediaLibraryResource == nil {
					mediaLibraryResource = Admin.NewResource(&MediaLibrary{})
				}
				config.RemoteDataResource = mediaLibraryResource
			}
			config.SelectManyConfig.RemoteDataResource = config.RemoteDataResource
			config.SelectManyConfig.ConfigureQorMeta(meta)
			config.RemoteDataResource = config.SelectManyConfig.RemoteDataResource
		}

		meta.Type = "media_box"
	}
}

type File struct {
	ID  string
	Url string
}

func (file File) URL(styles ...string) string {
	if file.Url != "" && len(styles) > 0 {
		ext := path.Ext(file.Url)
		return fmt.Sprintf("%v.%v%v", strings.TrimSuffix(file.Url, ext), styles[0], ext)
	}
	return file.Url
}

type MediaBoxConfig struct {
	RemoteDataResource *admin.Resource
	Sizes              map[string]Size
	Max                uint
	admin.SelectManyConfig
}

func (*MediaBoxConfig) ConfigureQorMeta(resource.Metaor) {
}

func (*MediaBoxConfig) GetTemplate(context *admin.Context, metaType string) ([]byte, error) {
	return nil, errors.New("not implemented")
}
