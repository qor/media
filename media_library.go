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
	ScanCropOptions(MediaCropOption) error
	GetCropOption() MediaCropOption
}

type MediaLibrary struct {
	gorm.Model
	File MediaLibraryStorage `sql:"size:4294967295;" media_library:"url:/system/{{class}}/{{primary_key}}/{{column}}.{{extension}}"`
}

type MediaCropOption struct {
	CropOptions map[string]*CropOption `json:",omitempty"`
	Sizes       map[string]Size        `json:",omitempty"`
	Crop        bool
}

func (mediaLibrary *MediaLibrary) ScanCropOptions(cropOption MediaCropOption) error {
	cropOption.Crop = true
	if bytes, err := json.Marshal(cropOption); err == nil {
		return mediaLibrary.File.Scan(bytes)
	} else {
		return err
	}
}

func (mediaLibrary *MediaLibrary) GetCropOption() (mediaCropOption MediaCropOption) {
	mediaCropOption.CropOptions = mediaLibrary.File.CropOptions
	mediaCropOption.Sizes = mediaLibrary.File.GetSizes()
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
	return mediaLibraryStorage.Sizes
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

			if meta := config.RemoteDataResource.GetMeta("MediaCropOption"); meta == nil {
				config.RemoteDataResource.Meta(&admin.Meta{
					Name: "MediaCropOption",
					Setter: func(record interface{}, metaValue *resource.MetaValue, context *qor.Context) {
						if mediaLibrary, ok := record.(MediaLibraryInterface); ok {
							var cropOption MediaCropOption
							if err := json.Unmarshal([]byte(utils.ToString(metaValue.Value)), &cropOption); err == nil {
								mediaLibrary.ScanCropOptions(cropOption)
							}
						}
					},
					Valuer: func(record interface{}, context *qor.Context) interface{} {
						if mediaLibrary, ok := record.(MediaLibraryInterface); ok {
							if value, err := json.Marshal(mediaLibrary.GetCropOption()); err == nil {
								return string(value)
							}
						}
						return ""
					},
				})
			}

			config.RemoteDataResource.IndexAttrs(config.RemoteDataResource.IndexAttrs(), "-MediaCropOption")
			config.RemoteDataResource.NewAttrs(config.RemoteDataResource.NewAttrs(), "-MediaCropOption")
			config.RemoteDataResource.EditAttrs(config.RemoteDataResource.EditAttrs(), "-MediaCropOption")
			config.RemoteDataResource.ShowAttrs(config.RemoteDataResource.ShowAttrs(), "MediaCropOption")

			config.SelectManyConfig.RemoteDataResource = config.RemoteDataResource
			config.SelectManyConfig.ConfigureQorMeta(meta)
			config.RemoteDataResource = config.SelectManyConfig.RemoteDataResource
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

func (mediaBox MediaBox) Crop(res *admin.Resource, db *gorm.DB, cropOption MediaCropOption) (err error) {
	for _, file := range mediaBox.Files {
		context := &qor.Context{ResourceID: string(file.ID), DB: db}
		record := res.NewStruct()
		if err = res.CallFindOne(record, nil, context); err == nil {
			if mediaLibrary, ok := record.(MediaLibraryInterface); ok {
				if err = mediaLibrary.ScanCropOptions(cropOption); err == nil {
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
