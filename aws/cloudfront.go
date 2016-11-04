package aws

import (
	"bytes"
	"io"
	"io/ioutil"
	"mime"
	"net/http"
	"os"
	"path"
	"strings"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/qor/media_library"
)

// required
var awsCloudFontDomain = os.Getenv("QOR_AWS_CLOUD_FRONT_DOMAIN")

type CloudFront struct {
	S3
}

// GetURLTemplate get url template
func (s CloudFront) GetURLTemplate(option *media_library.Option) (path string) {
	if path = option.Get("URL"); path == "" {
		path = "/{{class}}/{{primary_key}}/{{column}}/{{filename_with_hash}}"
	}

	return awsCloudFontDomain + path
}

// Store store reader's content with url
func (s CloudFront) Store(url string, option *media_library.Option, reader io.Reader) error {
	buffer, err := ioutil.ReadAll(reader)

	if err != nil {
		return err
	}

	fileBytes := bytes.NewReader(buffer)
	fileBytesLen := int64(fileBytes.Len())

	// Retrieve the file path from the file URL.
	filePath := strings.TrimPrefix(url, awsCloudFontDomain)

	fileType := mime.TypeByExtension(path.Ext(filePath))
	if fileType == "" {
		fileType = http.DetectContentType(buffer)
	}

	params := &s3.PutObjectInput{
		Bucket:        aws.String(getBucket(option)), // required
		Key:           aws.String(filePath),          // required
		ACL:           aws.String("private"),
		Body:          fileBytes,
		ContentLength: &fileBytesLen,
		ContentType:   aws.String(fileType),
		Metadata: map[string]*string{
			"Key": aws.String("MetadataValue"), //required
		},
	}
	_, err = s3client().PutObject(params)
	return err
}

// Retrieve retrieve file content with url
func (s CloudFront) Retrieve(url string) (file *os.File, err error) {
	response, err := http.Get("http:" + url)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	if file, err = ioutil.TempFile("/tmp", "s3"); err == nil {
		_, err := io.Copy(file, response.Body)
		return file, err
	}
	return nil, err
}
