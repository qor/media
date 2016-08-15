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
	File    FileSystem
	Options MediaLibraryOption `sql:"size:4294967295;"`
}

type MediaLibraryOption struct {
	Options     string                 `json:"-"`
	CropOptions map[string]*CropOption `json:",omitempty"`
	Sizes       map[string]*Size       `json:",omitempty"`
}

func (mediaLibraryOption *MediaLibraryOption) Scan(data interface{}) (err error) {
	switch values := data.(type) {
	case []byte:
		var newOption MediaLibraryOption
		if err = json.Unmarshal(values, &newOption); err == nil {
			for key, value := range newOption.CropOptions {
				mediaLibraryOption.CropOptions[key] = value
			}

			for key, value := range newOption.Sizes {
				mediaLibraryOption.Sizes[key] = value
			}
		}
	case string:
		err = mediaLibraryOption.Scan([]byte(values))
	case []string:
		for _, str := range values {
			if err = mediaLibraryOption.Scan(str); err != nil {
				return err
			}
		}
	}
	return nil
}

func (mediaLibraryOption MediaLibraryOption) Value() (driver.Value, error) {
	results, err := json.Marshal(mediaLibraryOption)
	return string(results), err
}

func (MediaLibrary) ConfigureQorResource(res resource.Resourcer) {
	if res, ok := res.(*admin.Resource); ok {
		res.UseTheme("grid")
		res.IndexAttrs("File")
	}
}

type MediaBox struct {
	Values string
	Files  []File
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
		}

		meta.Type = "media_box"
	}
}
