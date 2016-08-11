package media_library

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"path"
	"strings"

	"github.com/jinzhu/gorm"
)

type MediaLibrary struct {
	gorm.Model
	File FileSystem
}

type MediaBox struct {
	Values string
	Files  []File
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

func (mediaBox *MediaBox) Scan(data interface{}) (err error) {
	switch values := data.(type) {
	case []byte:
		mediaBox.Values = string(values)
		return json.Unmarshal(values, &mediaBox.Files)
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

func (mediaBox *MediaBox) Value() (driver.Value, error) {
	if len(mediaBox.Files) > 0 {
		return json.Marshal(mediaBox.Files)
	}
	return mediaBox.Values, nil
}
