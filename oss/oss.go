package oss

import (
	"io"
	"os"
	"path"
	"strings"

	"github.com/qor/media_library"
	"github.com/qor/oss"
	"github.com/qor/oss/filesystem"
)

var (
	// Storage the storage used to save medias
	Storage oss.StorageInterface = filesystem.New("public")
	// URLTemplate default URL template
	URLTemplate = "/system/{{class}}/{{primary_key}}/{{column}}/{{filename_with_hash}}"
)

// OSS common storage interface
type OSS struct {
	media_library.Base
}

// DefaultURLTemplateHandler used to generate URL and save into database
var DefaultURLTemplateHandler = func(option *media_library.Option) (url string) {
	if url = option.Get("URL"); url == "" {
		url = URLTemplate
	}

	url = path.Join(Storage.GetEndpoint(), url)
	if strings.HasPrefix(url, "/") {
		return url
	}

	for _, prefix := range []string{"https://", "http://"} {
		url = strings.TrimPrefix(url, prefix)
	}

	// convert `getqor.com/hello` => `//getqor.com/hello`
	return "//" + url
}

// GetURLTemplate URL's template
func (OSS) GetURLTemplate(option *media_library.Option) (url string) {
	return DefaultURLTemplateHandler(option)
}

// DefaultStoreHandler used to store reader with default Storage
var DefaultStoreHandler = func(path string, option *media_library.Option, reader io.Reader) error {
	_, err := Storage.Put(path, reader)
	return err
}

// Store save reader's content with path
func (OSS) Store(path string, option *media_library.Option, reader io.Reader) error {
	return DefaultStoreHandler(path, option, reader)
}

// DefaultRetrieveHandler used to retrieve file
var DefaultRetrieveHandler = func(path string) (*os.File, error) {
	return Storage.Get(path)
}

// Retrieve retrieve file content with url
func (OSS) Retrieve(path string) (*os.File, error) {
	return DefaultRetrieveHandler(path)
}
