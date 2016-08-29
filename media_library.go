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
	"github.com/qor/qor/utils"
)

type MediaLibraryInterface interface {
	ScanMediaOptions(MediaOption) error
	GetMediaOption() MediaOption
}

type MediaLibrary struct {
	gorm.Model
	File MediaLibraryStorage `sql:"size:4294967295;" media_library:"url:/system/{{class}}/{{primary_key}}/{{column}}.{{extension}}"`
}

type MediaOption struct {
	FileName    string                 `json:",omitempty"`
	URL         string                 `json:",omitempty"`
	OriginalURL string                 `json:",omitempty"`
	CropOptions map[string]*CropOption `json:",omitempty"`
	Sizes       map[string]Size        `json:",omitempty"`
}

func (mediaLibrary *MediaLibrary) ScanMediaOptions(mediaOption MediaOption) error {
	if bytes, err := json.Marshal(mediaOption); err == nil {
		mediaLibrary.File.Crop = true
		return mediaLibrary.File.Scan(bytes)
	} else {
		return err
	}
}

func (mediaLibrary *MediaLibrary) GetMediaOption() (mediaOption MediaOption) {
	mediaOption.FileName = mediaLibrary.File.FileName
	mediaOption.URL = mediaLibrary.File.URL()
	mediaOption.OriginalURL = mediaLibrary.File.URL("original")
	mediaOption.CropOptions = mediaLibrary.File.CropOptions
	mediaOption.Sizes = mediaLibrary.File.GetSizes()
	return
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
	var sizes = map[string]Size{
		"@qor_preview": Size{Width: 200, Height: 200},
	}

	for key, value := range mediaLibraryStorage.Sizes {
		sizes[key] = value
	}
	return sizes
}

func (mediaLibraryStorage *MediaLibraryStorage) Scan(data interface{}) (err error) {
	switch values := data.(type) {
	case []byte:
		if mediaLibraryStorage.Sizes == nil {
			mediaLibraryStorage.Sizes = map[string]Size{}
		}
		if mediaLibraryStorage.CropOptions == nil {
			mediaLibraryStorage.CropOptions = map[string]*CropOption{}
		}
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

				for key, value := range mediaLibraryStorage.CropOptions {
					if _, ok := mediaLibraryStorage.Sizes[key]; !ok {
						mediaLibraryStorage.Sizes[key] = Size{Width: value.Width, Height: value.Height}
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
	Values string `json:"-" gorm:"size:4294967295;"`
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

			if meta := config.RemoteDataResource.GetMeta("MediaOption"); meta == nil {
				config.RemoteDataResource.Meta(&admin.Meta{
					Name: "MediaOption",
					Type: "hidden",
					Setter: func(record interface{}, metaValue *resource.MetaValue, context *qor.Context) {
						if mediaLibrary, ok := record.(MediaLibraryInterface); ok {
							var mediaOption MediaOption
							if err := json.Unmarshal([]byte(utils.ToString(metaValue.Value)), &mediaOption); err == nil {
								mediaOption.FileName = ""
								mediaOption.URL = ""
								mediaOption.OriginalURL = ""
								mediaLibrary.ScanMediaOptions(mediaOption)
							}
						}
					},
					Valuer: func(record interface{}, context *qor.Context) interface{} {
						if mediaLibrary, ok := record.(MediaLibraryInterface); ok {
							if value, err := json.Marshal(mediaLibrary.GetMediaOption()); err == nil {
								return string(value)
							}
						}
						return ""
					},
				})
			}

			config.RemoteDataResource.UseTheme("grid")
			config.RemoteDataResource.IndexAttrs(config.RemoteDataResource.IndexAttrs(), "-MediaOption")
			config.RemoteDataResource.NewAttrs(config.RemoteDataResource.NewAttrs(), "-MediaOption")
			config.RemoteDataResource.EditAttrs(config.RemoteDataResource.EditAttrs(), "MediaOption")

			config.SelectManyConfig.RemoteDataResource = config.RemoteDataResource
			config.SelectManyConfig.ConfigureQorMeta(meta)
		}

		meta.Type = "media_box"
	}
}

type File struct {
	ID  json.Number
	Url string
}

func (file File) URL(styles ...string) string {
	if file.Url != "" && len(styles) > 0 {
		ext := path.Ext(file.Url)
		return fmt.Sprintf("%v.%v%v", strings.TrimSuffix(file.Url, ext), styles[0], ext)
	}
	return file.Url
}

func (mediaBox MediaBox) Crop(res *admin.Resource, db *gorm.DB, mediaOption MediaOption) (err error) {
	for _, file := range mediaBox.Files {
		context := &qor.Context{ResourceID: string(file.ID), DB: db}
		record := res.NewStruct()
		if err = res.CallFindOne(record, nil, context); err == nil {
			if mediaLibrary, ok := record.(MediaLibraryInterface); ok {
				if err = mediaLibrary.ScanMediaOptions(mediaOption); err == nil {
					err = res.CallSave(record, context)
				}
			} else {
				err = errors.New("invalid media library resource")
			}
		}
		if err != nil {
			return
		}
	}
	return
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
