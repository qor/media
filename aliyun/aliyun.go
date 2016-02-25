package aliyun

import (
	"io"
	"io/ioutil"
	"net/http"
	"os"

	"strings"

	"github.com/qor/media_library"
	"github.com/qor/media_library/aliyun/config"
	"github.com/sunfmin/ali-oss"
)

// OSS aliyun OSS
type OSS struct {
	media_library.Base
}

var aliossClient *alioss.Client

func init() {
	aliossClient = alioss.NewClient(config.AliOSSAccessKey, config.AliOSSAccessSecret)
}

func getBucket(option *media_library.Option) string {
	if bucket := option.Get("bucket"); bucket != "" {
		return bucket
	}

	return config.AliOSSBucket
}

func getEndpoint(option *media_library.Option) string {
	if endpoint := option.Get("endpoint"); endpoint != "" {
		return endpoint
	}
	return getBucket(option) + "." + config.AliOSSRegion
}

// GetURLTemplate get url template
func (s OSS) GetURLTemplate(option *media_library.Option) (path string) {
	if path = option.Get("URL"); path == "" {
		path = "/{{class}}/{{primary_key}}/{{column}}/{{filename_with_hash}}"
	}

	path = "//" + getEndpoint(option) + path

	return
}

// Store store reader's content with url
func (s OSS) Store(url string, option *media_library.Option, reader io.Reader) (err error) {

	path := strings.Replace(url, "//"+getEndpoint(option), "", -1)

	bucket := alioss.NewBucket(config.AliOSSBucket, alioss.BucketRegion(config.AliOSSRegion), aliossClient)

	err = bucket.Put(path, reader, nil)

	if err != nil {
		return
	}

	return
}

// Retrieve retrieve file content with url
func (s OSS) Retrieve(url string) (file *os.File, err error) {
	if response, err := http.Get("http:" + url); err == nil {
		defer response.Body.Close()
		if file, err = ioutil.TempFile("/tmp", "OSS"); err == nil {
			_, err := io.Copy(file, response.Body)
			return file, err
		}
	}

	return nil, err
}
